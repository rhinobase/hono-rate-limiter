import { serve } from "@hono/node-server";
import { kv } from "@vercel/kv";
import { Hono } from "hono";
import { type RateLimitInfo, rateLimiter } from "hono-rate-limiter";
import { logger } from "hono/logger";
import Page from "./Page";

// Init the app
const app = new Hono<{
  Variables: {
    rateLimit: RateLimitInfo;
  };
}>();

// Adding the rate limitter
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

// Routes
app.get("/", (c) => c.html(<Page info={c.get("rateLimit")} />));

// Serving the app
const port = Number(process.env.PORT) || 3000;
console.log(`Server is running on port ${port}`);

serve({
  fetch: app.fetch,
  port,
});
