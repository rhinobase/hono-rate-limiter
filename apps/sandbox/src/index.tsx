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
    // store: new RedisStore({
    //   sendCommand: (...args: string[]) => kv.eval(...args),
    // }),
    handler: (_, next) => next(),
  }),
  (c) => {
    return c.html(<Page info={c.get("rateLimit")} />);
  },
);
