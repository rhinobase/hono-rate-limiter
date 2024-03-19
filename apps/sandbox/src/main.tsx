import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { type RateLimitInfo, rateLimiter } from "hono-rate-limiter";
import Page from "./Page";

// Init the app
const app = new Hono<{
  Variables: {
    rateLimit: RateLimitInfo;
  };
}>();

// Adding the rate limitter
app.use(
  rateLimiter({
    windowMs: 1_000,
    limit: 2,
  }),
);

// Routes
app.get("/", (c) => c.html(<Page />));

// Serving the app
serve(app);
