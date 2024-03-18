import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { type RateLimitInfo, rateLimiter } from "hono-rate-limiter";

// Init the app
const app = new Hono<{
  Variables: {
    rateLimit: RateLimitInfo;
  };
}>();

// Adding the rate limitter
app.use(
  rateLimiter({
    windowMs: 10_000,
    limit: 2,
  }),
);

// Routes
app.get("/", (c) => c.json(c.get("rateLimit")));

// Serving the app
serve(app);
