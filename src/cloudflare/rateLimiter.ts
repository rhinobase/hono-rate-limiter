import type { Env, Input, MiddlewareHandler } from "hono";
import type { ConfigType } from "./types";

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
  I extends Input = Input
>(
  config: Pick<ConfigType<E, P, I>, "rateLimitBinding" | "keyGenerator"> &
    Partial<Omit<ConfigType<E, P, I>, "rateLimitBinding" | "keyGenerator">>
): MiddlewareHandler<E, P, I> {
  const {
    message = "Too many requests, please try again later.",
    statusCode = 429,
    requestPropertyName = "rateLimit",
    rateLimitBinding: rateLimitBindingProp,
    keyGenerator,
    skip = () => false,
    handler = async (c, _, options) => {
      c.status(options.statusCode);

      const responseMessage =
        typeof options.message === "function"
          ? await options.message(c)
          : options.message;

      if (typeof responseMessage === "string") return c.text(responseMessage);
      return c.json(responseMessage);
    },
  } = config;

  return async (c, next) => {
    let rateLimitBinding = rateLimitBindingProp;
    if (typeof rateLimitBinding === "function") {
      rateLimitBinding = rateLimitBinding(c);
    }

    const options = {
      message,
      statusCode,
      requestPropertyName,
      rateLimitBinding,
      keyGenerator,
      skip,
      handler,
    };

    // First check if we should skip the request
    const isSkippable = await skip(c);

    if (isSkippable) {
      await next();
      return;
    }

    // Get a unique key for the client
    const key = await keyGenerator(c);

    // Getting the response
    const { success } = await rateLimitBinding.limit({ key: key });

    // Set the rate limit information in the hono context
    // @ts-expect-error TODO: need to figure this out
    c.set(requestPropertyName, success);

    // If the client has exceeded their rate limit, set the Retry-After header
    // and call the `handler` function.
    if (!success) {
      return handler(c, next, options);
    }

    await next();
  };
}
