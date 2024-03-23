import { Hono } from "hono";
// import { type RateLimitInfo, rateLimiter } from "hono-rate-limiter";
import { logger } from "hono/logger";
// import Page from "./Page";

// Init the app
export const app = new Hono();

// Adding the rate limitter
app.use(
  logger(),
  // rateLimiter({
  //   windowMs: 10_000,
  //   limit: 10,
  //   // store: new RedisStore({
  //   //   sendCommand: (...args: string[]) => kv.eval(...args),
  //   // }),
  //   handler: (_, next) => next(),
  // }),
);

// Routes
app.all("*", (c) => c.text("hello"));
