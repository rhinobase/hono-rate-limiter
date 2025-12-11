import type { Env, Input, MiddlewareHandler } from "hono/types";
import type { ConfigType } from "./types";
import { createStorage } from "unstorage";

/**
 *
 * Create an instance of rate-limiting middleware for Hono.
 *
 * @param config {ConfigType} - Options to configure the rate limiter.
 *
 * @returns - The middleware that rate-limits clients based on your configuration.
 *
 * @public
 */
export function rateLimiter<
  E extends Env = Env,
  P extends string = string,
  I extends Input = Input,
>(config: ConfigType<E, P, I>): MiddlewareHandler<E, P, I> {
  const {
    message = "Too many requests, please try again later.",
    statusCode = 429,
    skipFailedRequests = false,
    skipSuccessfulRequests = false,
    keyGenerator,
    skip = () => false,
    requestWasSuccessful = (c) => c.res.status < 400,
    handler = async (c, _, options) => {
      c.status(options.statusCode);

      const responseMessage =
        typeof options.message === "function"
          ? await options.message(c)
          : options.message;

      if (typeof responseMessage === "string") return c.text(responseMessage);
      return c.json(responseMessage);
    },
    storage = createStorage(),
    limiter
  } = config;

  return async (c, next) => {
    // First check if we should skip the request
    const isSkippable = await skip(c);

    if (isSkippable) {
      await next();
      return;
    }

    // Get a unique key for the client
    const key = await keyGenerator(c);


    await next();
  }
}