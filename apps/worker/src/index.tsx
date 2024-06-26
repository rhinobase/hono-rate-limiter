import {
  type RateLimitBinding,
  cloudflareRateLimiter,
} from "@hono-rate-limiter/cloudflare";
import { Hono } from "hono";
import { Page } from "./Page";

type AppType = {
  Variables: {
    rateLimit: boolean;
  };
  Bindings: {
    RATE_LIMITER: RateLimitBinding;
  };
};

const app = new Hono<AppType>().get(
  "/",
  (c, next) =>
    cloudflareRateLimiter<AppType>({
      rateLimitBinding: c.env.RATE_LIMITER,
      keyGenerator: (c) => c.req.header("cf-connecting-ip") ?? "",
      handler: (_, next) => next(),
    })(c, next),
  (c) => c.html(<Page isSuccessful={c.get("rateLimit")} />),
);

export default app;
