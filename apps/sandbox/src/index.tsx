import { RedisStore } from "@hono-rate-limiter/redis";
import { kv } from "@vercel/kv";
import { Hono } from "hono";
import {
  type Promisify,
  type RateLimitInfo,
  rateLimiter,
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
    windowMs: 60_000, // 1 min
    limit: 10,
    keyGenerator: (c) => c.req.header("cf-connecting-ip") ?? "",
    store: new RedisStore({
      client: kv,
    }),
    handler: (_, next) => next(),
  }),
  (c) => c.html(<Page info={c.get("rateLimit")} />),
);
