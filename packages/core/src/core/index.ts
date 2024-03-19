import type { Context, Env, Input, Next } from "hono";
import { createMiddleware } from "hono/factory";
import MemoryStore from "../memcache";
import type { ConfigType, RateLimitInfo } from "../types";
import {
  setDraft6Headers,
  setDraft7Headers,
  setRetryAfterHeader,
} from "./headers";
import { isValidStore } from "./validations";

/**
 *
 * Create an instance of IP rate-limiting middleware for Hono.
 *
 * @param config {ConfigType} - Options to configure the rate limiter.
 *
 * @returns - The middleware that rate-limits clients based on your configuration.
 *
 * @public
 */
export function rateLimiter<E extends Env, P extends string, I extends Input>(
  config?: Partial<ConfigType<E, P, I>>,
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
    requestWasSuccessful = (c: Context<E, P, I>) => c.res.status < 400,
    handler = async (
      c: Context<E, P, I>,
      _next: Next,
      options: ConfigType<E, P, I>,
    ) => {
      c.status(options.statusCode);

      const responseMessage =
        typeof options.message === "function"
          ? await options.message(c)
          : options.message;

      if (typeof responseMessage === "string") return c.text(responseMessage);
      return c.json(responseMessage);
    },
    store = new MemoryStore(),
  } = config ?? {};

  const options = {
    windowMs,
    limit,
    message,
    statusCode,
    standardHeaders,
    requestPropertyName,
    skipFailedRequests,
    skipSuccessfulRequests,
    keyGenerator,
    skip,
    requestWasSuccessful,
    handler,
    store,
  };

  // Checking if store is valid
  if (!isValidStore(store))
    throw new Error("The store is not correctly implmented!");

  // Call the `init` method on the store, if it exists
  if (typeof store.init === "function") store.init(options);

  return createMiddleware<E, P, I>(async (c, next) => {
    // First check if we should skip the request
    const isSkippable = await skip(c);

    if (isSkippable) {
      await next();
      return;
    }

    // Get a unique key for the client
    const key = await keyGenerator(c);

    // Increment the client's hit counter by one.
    const { totalHits, resetTime } = await store.increment(key);

    // Get the limit (max number of hits) for each client.
    const retrieveLimit = typeof limit === "function" ? limit(c) : limit;
    const _limit = await retrieveLimit;

    // Define the rate limit info for the client.
    const info: RateLimitInfo = {
      limit: _limit,
      used: totalHits,
      remaining: Math.max(_limit - totalHits, 0),
      resetTime,
    };

    // Set the rate limit information in the hono context
    // @ts-expect-error TODO: need to figure this out
    c.set(requestPropertyName, info);

    // Set the standardized `RateLimit-*` headers on the response object
    if (standardHeaders && !c.finalized) {
      if (standardHeaders === "draft-7") {
        setDraft7Headers(c, info, windowMs);
      } else {
        // For true and draft-6
        setDraft6Headers(c, info, windowMs);
      }
    }

    // If the client has exceeded their rate limit, set the Retry-After header
    // and call the `handler` function.
    if (totalHits > _limit) {
      if (standardHeaders) {
        setRetryAfterHeader(c, info, windowMs);
      }

      return handler(c, next, options);
    }

    // If we are to skip failed/successfull requests, decrement the
    // counter accordingly once we know the status code of the request
    let decremented = false;
    const decrementKey = async () => {
      if (!decremented) {
        await store.decrement(key);
        decremented = true;
      }
    };

    try {
      await next();

      if (skipFailedRequests || skipSuccessfulRequests) {
        const wasRequestSuccessful = await requestWasSuccessful(c);

        if (
          (skipFailedRequests && !wasRequestSuccessful) ||
          (skipSuccessfulRequests && wasRequestSuccessful)
        )
          await decrementKey();
      }
    } catch (error) {
      if (skipFailedRequests) await decrementKey();
    } finally {
      if (!c.finalized) await decrementKey();
    }
  });
}
