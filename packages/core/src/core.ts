import type { Env, Input, MiddlewareHandler } from "hono";
import { createMiddleware } from "hono/factory";
import {
  setDraft6Headers,
  setDraft7Headers,
  setRetryAfterHeader,
} from "./headers";
import MemoryStore from "./store";
import type { ConfigType, GeneralConfigType, RateLimitInfo } from "./types";
import { getKeyAndIncrement, initStore } from "./utils";

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
>(config: GeneralConfigType<ConfigType<E, P, I>>): MiddlewareHandler<E, P, I> {
  const {
    windowMs = 60_000,
    limit = 5,
    message = "Too many requests, please try again later.",
    statusCode = 429,
    standardHeaders = "draft-6",
    requestPropertyName = "rateLimit",
    requestStorePropertyName = "rateLimitStore",
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
    store = new MemoryStore<E, P, I>(),
  } = config;

  const options = {
    windowMs,
    limit,
    message,
    statusCode,
    standardHeaders,
    requestPropertyName,
    requestStorePropertyName,
    skipFailedRequests,
    skipSuccessfulRequests,
    keyGenerator,
    skip,
    requestWasSuccessful,
    handler,
    store,
  };

  initStore(store, options);

  return createMiddleware<E, P, I>(async (c, next) => {
    // First check if we should skip the request
    const isSkippable = await skip(c);

    if (isSkippable) {
      await next();
      return;
    }

    const { key, totalHits, resetTime } = await getKeyAndIncrement(
      c,
      keyGenerator,
      store,
    );

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
    // Set the data store in the hono context
    // @ts-expect-error TODO: need to figure this out
    c.set(requestStorePropertyName, {
      getKey: store.get?.bind(store),
      resetKey: store.resetKey.bind(store),
    });

    // Set the standardized `RateLimit-*` headers on the response object
    if (standardHeaders && !c.finalized) {
      if (standardHeaders === "draft-7") {
        setDraft7Headers(c, info, windowMs);
      } else {
        // For true and draft-6
        setDraft6Headers(c, info, windowMs);
      }
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

    const shouldSkipRequest = async () => {
      if (skipFailedRequests || skipSuccessfulRequests) {
        const wasRequestSuccessful = await requestWasSuccessful(c);

        if (
          (skipFailedRequests && !wasRequestSuccessful) ||
          (skipSuccessfulRequests && wasRequestSuccessful)
        )
          await decrementKey();
      }
    };

    // If the client has exceeded their rate limit, set the Retry-After header
    // and call the `handler` function.
    if (totalHits > _limit) {
      if (standardHeaders) {
        setRetryAfterHeader(c, info, windowMs);
      }

      await shouldSkipRequest();
      return handler(c, next, options);
    }

    try {
      await next();
      await shouldSkipRequest();
    } catch (error) {
      if (skipFailedRequests) await decrementKey();
    } finally {
      if (!c.finalized) await decrementKey();
    }
  });
}
