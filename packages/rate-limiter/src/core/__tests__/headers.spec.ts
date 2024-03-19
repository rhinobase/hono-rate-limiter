import type { Context } from "hono";
import { testClient } from "hono/testing";
import { rateLimiter } from "..";
import type { RateLimitInfo } from "../../types";
import {
  setDraft6Headers,
  setDraft7Headers,
  setRetryAfterHeader,
} from "../headers";
import { createServer } from "./helpers";

describe("headers test", () => {
  it("should send correct `ratelimit-*` headers for the standard headers draft 6", async () => {
    const app = createServer(
      rateLimiter({
        windowMs: 60 * 1000,
        limit: 5,
        standardHeaders: true,
      }),
    );

    const res = await app.request("/");

    expect(res.headers.get("ratelimit-policy")).toBe("5;w=60");
    expect(res.headers.get("ratelimit-limit")).toBe("5");
    expect(res.headers.get("ratelimit-remaining")).toBe("4");
    expect(res.headers.get("ratelimit-reset")).toBe("60");
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("Hi there!");
  });

  it("should send policy and combined ratelimit headers for the standard draft 7", async () => {
    const app = createServer(
      rateLimiter({
        windowMs: 60 * 1000,
        limit: 5,
        standardHeaders: "draft-7",
      }),
    );

    const res = await testClient(app).index.$get();

    expect(res.headers.get("ratelimit-policy")).toBe("5;w=60");
    expect(res.headers.get("ratelimit")).toBe("limit=5, remaining=4, reset=60");
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("Hi there!");
  });

  it("should return the `retry-after` header once IP has reached the max", async () => {
    const app = createServer(
      rateLimiter({
        windowMs: 60 * 1000,
        limit: 1,
      }),
    );

    const request = testClient(app).index.$get;

    expect((await request()).status).toBe(200);

    const res = await request();
    expect(res.status).toBe(429);
    expect(res.headers.get("retry-after")).toBe("60");
  });

  it("should not attempt to set headers if request.headersSent is true", () => {
    const context: Context = {
      finalized: true,
      header: vi.fn(),
      // biome-ignore lint/suspicious/noExplicitAny: For testing
    } as any;
    const info: RateLimitInfo = {
      limit: 5,
      used: 1,
      remaining: 4,
      resetTime: new Date(),
    };
    const windowMs = 60 * 1000;

    setDraft6Headers(context, info, windowMs);
    setDraft7Headers(context, info, windowMs);
    setRetryAfterHeader(context, info, windowMs);

    expect(context.header).not.toBeCalled();
  });
});
