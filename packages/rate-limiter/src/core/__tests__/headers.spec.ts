import { createAdaptorServer } from "@hono/node-server";
import type { Context } from "hono";
import { agent as request } from "supertest";
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
    const app = createAdaptorServer(
      createServer(
        rateLimiter({
          windowMs: 60 * 1000,
          limit: 5,
          standardHeaders: true,
        }),
      ),
    );

    await request(app)
      .get("/")
      .expect("ratelimit-policy", "5;w=60")
      .expect("ratelimit-limit", "5")
      .expect("ratelimit-remaining", "4")
      .expect("ratelimit-reset", "60")
      .expect(200, "Hi there!");
  });

  it("should send policy and combined ratelimit headers for the standard draft 7", async () => {
    const app = createAdaptorServer(
      createServer(
        rateLimiter({
          windowMs: 60 * 1000,
          limit: 5,
          standardHeaders: "draft-7",
        }),
      ),
    );

    await request(app)
      .get("/")
      .expect("ratelimit-policy", "5;w=60")
      .expect("ratelimit", "limit=5, remaining=4, reset=60")
      .expect(200, "Hi there!");
  });

  it("should return the `retry-after` header once IP has reached the max", async () => {
    const app = createAdaptorServer(
      createServer(
        rateLimiter({
          windowMs: 60 * 1000,
          limit: 1,
        }),
      ),
    );

    await request(app).get("/").expect(200);
    await request(app).get("/").expect(429).expect("retry-after", "60");
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
