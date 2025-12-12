// import { platform } from 'node:process'
import { createAdaptorServer } from "@hono/node-server";
import type { Context } from "hono";
import { agent as request } from "supertest";
import { rateLimiter } from "../rateLimiter";
import type { ClientRateLimitInfo, RateLimitInfo, Store } from "../types";
import { createServer, keyGenerator } from "./helpers";
import { describe, it, beforeEach, afterEach, expect, vi } from "vitest";

describe("middleware test", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  class MockStore implements Store {
    initWasCalled = false;
    incrementWasCalled = false;
    decrementWasCalled = false;
    resetKeyWasCalled = false;
    getWasCalled = false;
    resetAllWasCalled = false;

    counter = 0;

    init(): void {
      this.initWasCalled = true;
    }

    async get() {
      this.getWasCalled = true;

      return { totalHits: this.counter, resetTime: undefined };
    }

    async increment() {
      this.counter += 1;
      this.incrementWasCalled = true;

      return { totalHits: this.counter, resetTime: undefined };
    }

    async decrement() {
      this.counter -= 1;
      this.decrementWasCalled = true;
    }

    async resetKey() {
      this.resetKeyWasCalled = true;
    }

    async resetAll() {
      this.resetAllWasCalled = true;
    }
  }

  it("should not modify the options object passed", () => {
    const options = {};
    rateLimiter(options);
    expect(options).toStrictEqual({});
  });

  it("should call `init` even if no requests have come in", async () => {
    const store = new MockStore();
    rateLimiter({ keyGenerator, store });

    expect(store.initWasCalled).toEqual(true);
  });

  it("should let the first request through", async () => {
    const app = createAdaptorServer(
      createServer({ middleware: rateLimiter({ keyGenerator, limit: 1 }) })
    );

    await request(app).get("/").expect(200).expect("Hi there!");
  });

  it("should refuse additional connections once IP has reached the max", async () => {
    const app = createAdaptorServer(
      createServer({
        middleware: rateLimiter({ keyGenerator, limit: 2 }),
      })
    );

    await request(app).get("/").expect(200);
    await request(app).get("/").expect(200);
    await request(app).get("/").expect(429);
  });

  it("should (eventually) accept new connections from a blocked IP", async () => {
    const app = createAdaptorServer(
      createServer({
        middleware: rateLimiter({ keyGenerator, limit: 2, windowMs: 50 }),
      })
    );

    await request(app).get("/").expect(200);
    await request(app).get("/").expect(200);
    await request(app).get("/").expect(429);
    vi.advanceTimersByTime(60);
    await request(app).get("/").expect(200);
  });

  it("should work repeatedly", async () => {
    const app = createAdaptorServer(
      createServer({
        middleware: rateLimiter({ keyGenerator, limit: 2, windowMs: 50 }),
      })
    );

    await request(app).get("/").expect(200);
    await request(app).get("/").expect(200);
    await request(app).get("/").expect(429);
    vi.advanceTimersByTime(60);
    await request(app).get("/").expect(200);
    await request(app).get("/").expect(200);
    await request(app).get("/").expect(429);
    vi.advanceTimersByTime(60);
    await request(app).get("/").expect(200);
  });

  it("should block all requests if max is set to 0", async () => {
    const app = createAdaptorServer(
      createServer({ middleware: rateLimiter({ keyGenerator, limit: 0 }) })
    );

    await request(app).get("/").expect(429);
  });

  it("should show the provided message instead of the default message when max connections are reached", async () => {
    const message = "Enhance your calm";
    const app = createAdaptorServer(
      createServer({
        middleware: rateLimiter({
          keyGenerator,
          windowMs: 1000,
          limit: 2,
          message,
        }),
      })
    );

    await request(app).get("/").expect(200);
    await request(app).get("/").expect(200);
    await request(app).get("/").expect(429).expect(message);
  });

  it("should allow the error status code to be customized", async () => {
    const statusCode = 420;
    const app = createAdaptorServer(
      createServer({
        middleware: rateLimiter({
          keyGenerator,
          limit: 1,
          // @ts-expect-error Checking if we can use custom status code
          statusCode,
        }),
      })
    );
    await request(app).get("/").expect(200);
    await request(app).get("/").expect(statusCode);
  });

  it("should allow responding with a JSON message", async () => {
    const message = {
      error: {
        code: "too-many-requests",
        message: "Too many requests were attempted in a short span of time.",
      },
    };
    const app = createAdaptorServer(
      createServer({
        middleware: rateLimiter({ keyGenerator, message, limit: 1 }),
      })
    );

    await request(app).get("/").expect(200, "Hi there!");
    await request(app).get("/").expect(429, message);
  });

  it("should allow message to be a function", async () => {
    const app = createAdaptorServer(
      createServer({
        middleware: rateLimiter({
          keyGenerator,
          message: () => "Too many requests.",
          limit: 1,
        }),
      })
    );

    await request(app).get("/").expect(200, "Hi there!");
    await request(app).get("/").expect(429, "Too many requests.");
  });

  it("should allow message to be a function that returns a promise", async () => {
    const app = createAdaptorServer(
      createServer({
        middleware: rateLimiter({
          keyGenerator,
          message: async () => "Too many requests.",
          limit: 1,
        }),
      })
    );

    await request(app).get("/").expect(200, "Hi there!");
    await request(app).get("/").expect(429, "Too many requests.");
  });

  it("should use a custom handler when specified", async () => {
    const app = createAdaptorServer(
      createServer({
        middleware: rateLimiter({
          keyGenerator,
          limit: 1,
          handler(c) {
            // @ts-expect-error Checking if we can use custom handler
            c.status(420);
            return c.text("Enhance your calm");
          },
        }),
      })
    );

    await request(app).get("/").expect(200);
    await request(app).get("/").expect(420, "Enhance your calm");
  });

  it("should allow custom key generators", async () => {
    const app = createAdaptorServer(
      createServer({
        middleware: rateLimiter({
          limit: 2,
          keyGenerator: (c) => c.req.query("key") ?? "",
        }),
      })
    );

    await request(app).get("/").query({ key: 1 }).expect(200);
    await request(app).get("/").query({ key: 1 }).expect(200);

    await request(app).get("/").query({ key: 2 }).expect(200);

    await request(app).get("/").query({ key: 1 }).expect(429);

    await request(app).get("/").query({ key: 2 }).expect(200);
    await request(app).get("/").query({ key: 2 }).expect(429);
  });

  it("should allow custom skip function", async () => {
    const app = createAdaptorServer(
      createServer({
        middleware: rateLimiter({ keyGenerator, limit: 2, skip: () => true }),
      })
    );

    await request(app).get("/").query({ key: 1 }).expect(200);
    await request(app).get("/").query({ key: 1 }).expect(200);

    await request(app).get("/").query({ key: 1 }).expect(200);
  });

  it("should allow custom skip function that returns a promise", async () => {
    const limiter = rateLimiter({
      keyGenerator,
      limit: 2,
      skip: async () => true,
    });

    const app = createAdaptorServer(createServer({ middleware: limiter }));
    await request(app).get("/").query({ key: 1 }).expect(200);
    await request(app).get("/").query({ key: 1 }).expect(200);

    await request(app).get("/").query({ key: 1 }).expect(200);
  });

  it("should allow max to be a function", async () => {
    const app = createAdaptorServer(
      createServer({
        middleware: rateLimiter({ keyGenerator, limit: () => 2 }),
      })
    );

    await request(app).get("/").expect(200);
    await request(app).get("/").expect(200);
    await request(app).get("/").expect(429);
  });

  it("should allow max to be a function that returns a promise", async () => {
    const app = createAdaptorServer(
      createServer({
        middleware: rateLimiter({ keyGenerator, limit: async () => 2 }),
      })
    );

    await request(app).get("/").expect(200);
    await request(app).get("/").expect(200);
    await request(app).get("/").expect(429);
  });

  it("should calculate the remaining hits", async () => {
    const app = createAdaptorServer(
      createServer({
        middleware: rateLimiter({ keyGenerator, limit: async () => 2 }),
      })
    );

    await request(app)
      .get("/")
      .expect(200)
      .expect("ratelimit-limit", "2")
      .expect("ratelimit-remaining", "1")
      .expect((response) => {
        if ("retry-after" in response.headers) {
          throw new Error(
            `Expected no retry-after header, got ${
              response.headers["retry-after"] as string
            }`
          );
        }
      })
      .expect(200, "Hi there!");
  });

  it.each([["modern", new MockStore()]])(
    "should call `increment` on the store (%s store)",
    async (_name, store) => {
      const app = createAdaptorServer(
        createServer({
          middleware: rateLimiter({ keyGenerator, store }),
        })
      );
      await request(app).get("/");

      expect(store.incrementWasCalled).toEqual(true);
    }
  );

  it.each([["modern", new MockStore()]])(
    "should call `resetKey` on the store (%s store)",
    async (_name, store) => {
      const app = createAdaptorServer(
        createServer({
          middleware: [
            rateLimiter({ keyGenerator, store }),
            async (c, next) => {
              await c.get("rateLimitStore").resetKey("key");
              await next();
            },
          ],
        })
      );

      await request(app).get("/").expect(200);

      expect(store.resetKeyWasCalled).toEqual(true);
    }
  );

  it.each([["modern", new MockStore()]])(
    "should call `get` on the store (%s store)",
    async (_name, store) => {
      let response: ClientRateLimitInfo | undefined;
      const app = createAdaptorServer(
        createServer({
          middleware: [
            rateLimiter({ keyGenerator, store }),
            async (c, next) => {
              response = await c.get("rateLimitStore").getKey("key");
              await next();
            },
          ],
        })
      );

      await request(app).get("/").expect(200);

      expect(store.getWasCalled).toEqual(true);
      expect(typeof response?.totalHits).toBe("number");
    }
  );

  it.each([["modern", new MockStore()]])(
    "should decrement hits when requests succeed and `skipSuccessfulRequests` is set to true (%s store)",
    async (_name, store) => {
      const app = createAdaptorServer(
        createServer({
          middleware: rateLimiter({
            keyGenerator,
            skipSuccessfulRequests: true,
            store,
          }),
        })
      );

      await request(app).get("/").expect(200);

      expect(store.decrementWasCalled).toEqual(true);
    }
  );

  it.each([["modern", new MockStore()]])(
    "should not decrement hits when requests fail and `skipSuccessfulRequests` is set to true (%s store)",
    async (_name, store) => {
      const app = createAdaptorServer(
        createServer({
          middleware: rateLimiter({
            keyGenerator,
            skipSuccessfulRequests: true,
            store,
          }),
        })
      );

      await request(app).get("/error").expect(400);

      expect(store.decrementWasCalled).toEqual(false);
    }
  );

  it.each([["modern", new MockStore()]])(
    "should decrement hits when requests succeed, `skipSuccessfulRequests` is set to true and a custom `requestWasSuccessful` method used (%s store)",
    async (_name, store) => {
      const app = createAdaptorServer(
        createServer({
          middleware: rateLimiter({
            keyGenerator,
            skipSuccessfulRequests: true,
            requestWasSuccessful: (c) => c.res.status === 200,
            store,
          }),
        })
      );

      await request(app).get("/").expect(200);
      expect(store.decrementWasCalled).toEqual(true);
    }
  );

  it.each([["modern", new MockStore()]])(
    "should not decrement hits when requests fail, `skipSuccessfulRequests` is set to true and a custom `requestWasSuccessful` method used (%s store)",
    async (_name, store) => {
      const app = createAdaptorServer(
        createServer({
          middleware: rateLimiter({
            keyGenerator,
            skipSuccessfulRequests: true,
            requestWasSuccessful(c) {
              return c.res.status === 200;
            },
            store,
          }),
        })
      );

      await request(app).get("/error").expect(400);

      expect(store.decrementWasCalled).toEqual(false);
    }
  );

  it.each([["modern", new MockStore()]])(
    "should decrement hits when requests succeed, `skipSuccessfulRequests` is set to true and a custom `requestWasSuccessful` method used (%s store)",
    async (_name, store) => {
      const app = createAdaptorServer(
        createServer({
          middleware: rateLimiter({
            keyGenerator,
            skipSuccessfulRequests: true,
            requestWasSuccessful: (c) => c.req.query("success") === "1",
            store,
          }),
        })
      );

      await request(app).get("/?success=1");

      expect(store.decrementWasCalled).toEqual(true);
    }
  );

  it.each([["modern", new MockStore()]])(
    "should not decrement hits when requests fail, `skipSuccessfulRequests` is set to true and a custom `requestWasSuccessful` method used (%s store)",
    async (_name, store) => {
      const app = createAdaptorServer(
        createServer({
          middleware: rateLimiter({
            keyGenerator,
            skipSuccessfulRequests: true,
            requestWasSuccessful: (c) => c.req.query("success") === "1",
            store,
          }),
        })
      );

      await request(app).get("/?success=0");

      expect(store.decrementWasCalled).toEqual(false);
    }
  );

  it.each([["modern", new MockStore()]])(
    "should decrement hits when requests fail and `skipFailedRequests` is set to true (%s store)",
    async (_name, store) => {
      const app = createAdaptorServer(
        createServer({
          middleware: rateLimiter({
            keyGenerator,
            skipFailedRequests: true,
            store,
          }),
        })
      );

      await request(app).get("/error").expect(400);

      expect(store.decrementWasCalled).toEqual(true);
    }
  );

  it.each([["modern", new MockStore()]])(
    "should not decrement hits when requests succeed and `skipFailedRequests` is set to true (%s store)",
    async (_name, store) => {
      const app = createAdaptorServer(
        createServer({
          middleware: rateLimiter({
            keyGenerator,
            skipFailedRequests: true,
            store,
          }),
        })
      );

      await request(app).get("/").expect(200);

      expect(store.decrementWasCalled).toEqual(false);
    }
  );

  it.each([["modern", new MockStore()]])(
    "should decrement hits when requests fail, `skipFailedRequests` is set to true and a custom `requestWasSuccessful` method used that returns a promise (%s store)",
    async (_name, store) => {
      const app = createAdaptorServer(
        createServer({
          middleware: rateLimiter({
            keyGenerator,
            skipFailedRequests: true,
            requestWasSuccessful: async () => false,
            store,
          }),
        })
      );

      await request(app).get("/").expect(200);
      expect(store.decrementWasCalled).toEqual(true);
    }
  );

  // FIXME: This test times out  _sometimes_ on MacOS and Windows, so it is disabled for now
  /*
  ;(platform === 'darwin' ? it.skip : it).each([
    ['modern', new MockStore()],
  ])(
    'should decrement hits when response closes and `skipFailedRequests` is set to true (%s store)',
    async (_name, store) => {
      vi.useRealTimers()
      vi.setTimeout(60_000)

      const app = createAdaptorServer(createServer(
        rateLimiter({
          skipFailedRequests: true,
          store,
        }),
      )

      let _resolve: () => void
      const connectionClosed = new Promise<void>((resolve) => {
        _resolve = resolve
      })

      app.get('/hang-server', (_request, response) => {
        response.on('close', _resolve)
      })

      const hangRequest = request(app).get('/hang-server').timeout(10)

      await expect(hangRequest).rejects.toThrow()
      await connectionClosed

      expect(store.decrementWasCalled).toEqual(true)
    },
  )
  */

  it.each([["modern", new MockStore()]])(
    "should decrement hits when response emits an error and `skipFailedRequests` is set to true (%s store)",
    async (_name, store) => {
      const app = createAdaptorServer(
        createServer({
          middleware: rateLimiter({
            keyGenerator,
            skipFailedRequests: true,
            store,
          }),
        })
      );

      await request(app).get("/crash");

      expect(store.decrementWasCalled).toEqual(true);
    }
  );

  it.each([["modern", new MockStore()]])(
    "should decrement hits when rate limit is reached and `skipFailedRequests` is set to true (%s store)",
    async (_name, store) => {
      const app = createAdaptorServer(
        createServer({
          middleware: rateLimiter({
            keyGenerator,
            limit: 2,
            store,
            skipFailedRequests: true,
          }),
        })
      );

      await request(app).get("/").expect(200);
      await request(app).get("/").expect(200);
      await request(app).get("/").expect(429);

      expect(store.decrementWasCalled).toEqual(true);
    }
  );

  it.each([["modern", new MockStore()]])(
    "should forward errors in the handler using `next()` (%s store)",
    async (_name, store) => {
      let errorCaught = false;

      const app = createAdaptorServer(
        createServer({
          middleware: rateLimiter({
            keyGenerator,
            limit: 1,
            store,
            handler() {
              const exception = new Error("420: Enhance your calm");
              throw exception;
            },
          }),
        }).onError((error, c) => {
          errorCaught = true;
          return c.text(error.message, 500);
        })
      );

      await request(app).get("/").expect(200);
      await request(app).get("/").expect(500);

      expect(errorCaught).toEqual(true);
    }
  );

  it.each([["modern", new MockStore()]])(
    "should forward errors in `skip()` using `next()` (%s store)",
    async (_name, store) => {
      let errorCaught = false;

      const app = createAdaptorServer(
        createServer({
          middleware: rateLimiter({
            keyGenerator,
            limit: 1,
            store,
            skip() {
              const exception = new Error("420: Enhance your calm");
              throw exception;
            },
          }),
        }).onError((error, c) => {
          errorCaught = true;
          return c.text(error.message, 500);
        })
      );

      await request(app).get("/").expect(500);

      expect(errorCaught).toEqual(true);
    }
  );

  it("should pass the number of hits and the limit to the next request handler in the `request.rateLimiter` property", async () => {
    let savedRequestObject: RateLimitInfo | undefined;

    const app = createAdaptorServer(
      createServer<{ Variables: { rateLimit: RateLimitInfo } }>({
        middleware: [
          rateLimiter({ keyGenerator }),
          async (c, next) => {
            savedRequestObject = c.get("rateLimit");
            await next();
          },
        ],
      })
    );

    await request(app).get("/").expect(200);
    expect(savedRequestObject).toMatchObject({
      limit: 5,
      used: 1,
      remaining: 4,
      resetTime: expect.any(Date),
    });

    savedRequestObject = undefined;
    await request(app).get("/").expect(200);
    expect(savedRequestObject).toMatchObject({
      limit: 5,
      used: 2,
      remaining: 3,
      resetTime: expect.any(Date),
    });
  });

  it("should pass the number of hits and the limit to the next request handler with a custom property", async () => {
    let savedRequestObject: RateLimitInfo | undefined;

    const app = createAdaptorServer(
      createServer<{ Variables: { rateLimitInfo: RateLimitInfo } }>({
        middleware: [
          rateLimiter({ keyGenerator, requestPropertyName: "rateLimitInfo" }),
          async (c, next) => {
            savedRequestObject = c.get("rateLimitInfo");
            await next();
          },
        ],
      })
    );

    await request(app).get("/").expect(200);
    expect(savedRequestObject).toMatchObject({
      limit: 5,
      used: 1,
      remaining: 4,
      resetTime: expect.any(Date),
    });

    savedRequestObject = undefined;
    await request(app).get("/").expect(200);
    expect(savedRequestObject).toMatchObject({
      limit: 5,
      used: 2,
      remaining: 3,
      resetTime: expect.any(Date),
    });
  });

  it("should handle two rate-limiters with different `requestPropertyNames` operating independently", async () => {
    let savedRequestObject:
      | Context<{
          Variables: {
            rateLimitKey?: RateLimitInfo;
            rateLimitGlobal?: RateLimitInfo;
          };
        }>["get"]
      | undefined;

    const app = createAdaptorServer(
      createServer<{
        Variables: {
          rateLimitKey?: RateLimitInfo;
          rateLimitGlobal?: RateLimitInfo;
        };
      }>({
        middleware: [
          // Test
          async (c, next) => {
            savedRequestObject = c.get;
            await next();
          },
          // Key Limiter
          rateLimiter({
            limit: 2,
            requestPropertyName: "rateLimitKey",
            keyGenerator: (c) => c.req.query("key") ?? "",
            handler(c) {
              // @ts-expect-error Checking if we can use custom status code
              c.status(420);
              return c.text("Enhance your calm");
            },
          }),
          // Global Limiter
          rateLimiter({
            limit: 5,
            requestPropertyName: "rateLimitGlobal",
            keyGenerator: () => "global",
            handler(c) {
              c.status(429);
              return c.text("Too many requests");
            },
          }),
        ],
      })
    );

    await request(app).get("/").query({ key: 1 }).expect(200);
    expect(savedRequestObject).toBeTruthy();
    // @ts-expect-error Checking if the default `requestPropertyName` is not getting asigned
    expect(savedRequestObject("rateLimiter")).toBeUndefined();

    expect(savedRequestObject?.("rateLimitKey")).toBeTruthy();
    expect(savedRequestObject?.("rateLimitKey")?.limit).toEqual(2);
    expect(savedRequestObject?.("rateLimitKey")?.remaining).toEqual(1);

    expect(savedRequestObject?.("rateLimitGlobal")).toBeTruthy();
    expect(savedRequestObject?.("rateLimitGlobal")?.limit).toEqual(5);
    expect(savedRequestObject?.("rateLimitGlobal")?.remaining).toEqual(4);

    savedRequestObject = undefined;
    await request(app).get("/").query({ key: 2 }).expect(200);
    // @ts-expect-error This value should exist
    expect(savedRequestObject("rateLimitKey").remaining).toEqual(1);
    // @ts-expect-error This value should exist
    expect(savedRequestObject("rateLimitGlobal").remaining).toEqual(3);

    savedRequestObject = undefined;
    await request(app).get("/").query({ key: 1 }).expect(200);
    // @ts-expect-error This value should exist
    expect(savedRequestObject("rateLimitKey").remaining).toEqual(0);
    // @ts-expect-error This value should exist
    expect(savedRequestObject("rateLimitGlobal").remaining).toEqual(2);

    savedRequestObject = undefined;
    await request(app).get("/").query({ key: 2 }).expect(200);
    // @ts-expect-error This value should exist
    expect(savedRequestObject("rateLimitKey").remaining).toEqual(0);
    // @ts-expect-error This value should exist
    expect(savedRequestObject("rateLimitGlobal").remaining).toEqual(1);

    savedRequestObject = undefined;
    await request(app)
      .get("/")
      .query({ key: 1 })
      .expect(420, "Enhance your calm");

    console.log(savedRequestObject);
    // @ts-expect-error This value should exist
    expect(savedRequestObject("rateLimitKey").remaining).toEqual(0);

    savedRequestObject = undefined;
    await request(app).get("/").query({ key: 3 }).expect(200);
    await request(app)
      .get("/")
      .query({ key: 3 })
      .expect(429, "Too many requests");
    // @ts-expect-error This value should exist
    expect(savedRequestObject("rateLimitKey").remaining).toEqual(0);
    // @ts-expect-error This value should exist
    expect(savedRequestObject("rateLimitGlobal").remaining).toEqual(0);
  });
});
