import type { Context, Env, Input } from "hono";
import { createMiddleware } from "hono/factory";

export type RateLimiterConfigType<
  E extends Env,
  P extends string,
  I extends Input,
> = {
  windowMs?: number;
  limit?: number | ((c: Context<E, P, I>) => number);
  message?: string | JSON | ((c: Context<E, P, I>) => string | JSON);
  statusCode?: number;
  standardHeaders?: boolean | "draft-6" | "draft-7";
  requestPropertyName?: string;
  skipFailedRequests?: boolean;
  skipSuccessfulRequests?: boolean;
  keyGenerator?: (c: Context<E, P, I>) => string;
  skip?: (c: Context<E, P, I>) => boolean;
  requestWasSuccessful?: (c: Context<E, P, I>) => boolean;
};

export function rateLimiter<E extends Env, P extends string, I extends Input>(
  config?: RateLimiterConfigType<E, P, I>,
) {
  const {
    windowMs = 60_000,
    limit = 5,
    message = "Too many requests, please try again later.",
    statusCode = 429,
    standardHeaders = "draft-6",
    requestPropertyName = "rateLimit",
    skipFailedRequests = false,
    skipSuccessfulRequests = false,
    keyGenerator = () => "",
    skip = () => false,
  } = config ?? {};

  return createMiddleware<E, P, I>(async (c, next) => {
    await next();
  });
}
