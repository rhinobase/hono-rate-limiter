import { Hono } from "hono";
import { type RateLimitInfo, rateLimiter } from "hono-rate-limiter";
import { logger } from "hono/logger";
import { Page } from "./Page";

export const app = new Hono<{
  Variables: {
    rateLimit: RateLimitInfo;
  };
}>();

app.use(
  logger(),
  rateLimiter({
    windowMs: 10_000,
    limit: 10,
    // store: new RedisStore({
    //   sendCommand: (...args: string[]) => kv.eval(...args),
    // }),
    handler: (_, next) => next(),
  }),
);

app.get("/", (c) => {
  return c.html(<Page info={c.get("rateLimit")} />);
});
