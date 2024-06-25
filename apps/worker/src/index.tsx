import { Hono } from "hono";
import { Page } from "./Page";

type RateLimitBinding = unknown;

const app = new Hono<{
  Variables: {
    rateLimit: boolean;
  };
  Bindings: {
    RATE_LIMITER: RateLimitBinding;
  };
}>();

app.get(
  "/",
  async (c, next) => await next(),
  (c) => c.html(<Page isSuccessful={c.get("rateLimit")} />),
);

export default app;
