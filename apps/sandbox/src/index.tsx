import { RedisStore } from "@hono-rate-limiter/redis";
import { kv } from "@vercel/kv";
import { Hono } from "hono";
import {
  rateLimiter,
  type Promisify,
  type RateLimitInfo,
} from "hono-rate-limiter";
import { Page } from "./Page";

export const app = new Hono<{
  Variables: {
    rateLimit: RateLimitInfo;
    rateLimitStore: {
      get?: (key: string) => Promisify<RateLimitInfo | undefined>;
      resetKey: (key: string) => Promisify<void>;
    };
  };
}>();

app.get(
  "/",
  rateLimiter({
    windowMs: 60_000, // 1 minute
    limit: 10, // Limit each IP to 10 requests per `window` (here, per 1 minute).
    keyGenerator: (c) => c.req.header("x-forwarded-for") ?? "", // Method to generate custom identifiers for clients.
    store: new RedisStore({
      client: kv,
    }),
    handler: (_, next) => next(),
  }),
  (c) => c.html(<Page info={c.get("rateLimit")} />)
);
