import type { Env, Input, MiddlewareHandler } from "hono";
import type { HandlerResponse } from "hono/types";
import {
  setDraft6Headers,
  setDraft7Headers,
  setRetryAfterHeader,
} from "./headers";
import { MemoryStore } from "./stores/memory";
import type {
  CloudflareConfigProps,
  ConfigProps,
  HonoConfigProps,
  RateLimitInfo,
} from "./types";
import { initStore } from "./utils";

/**
 *
 * Create an instance of rate-limiting middleware for Hono.
 *
 * @param config {ConfigProps} - Options to configure the rate limiter.
 *
 * @returns - The middleware that rate-limits clients based on your configuration.
 *
 * @public
 */
export function rateLimiter<
  E extends Env = Env,
  P extends string = string,
  I extends Input = Input,
  R extends HandlerResponse<any> = Response
>(config: ConfigProps<E, P, I>): MiddlewareHandler<E, P, I, R> {
  if ("binding" in config) {
    return cloudflareRateLimiter(config);
  }

  return honoRateLimiter(config);
}

function honoRateLimiter<
  E extends Env = Env,
  P extends string = string,
  I extends Input = Input,
  R extends HandlerResponse<any> = Response
>(config: HonoConfigProps<E, P, I>): MiddlewareHandler<E, P, I, R> {
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

  return async (c, next) => {
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
      throw error;
    }
  };
}

function cloudflareRateLimiter<
  E extends Env = Env,
  P extends string = string,
  I extends Input = Input,
  R extends HandlerResponse<any> = Response
>(config: CloudflareConfigProps<E, P, I>): MiddlewareHandler<E, P, I, R> {
  const {
    message = "Too many requests, please try again later.",
    statusCode = 429,
    requestPropertyName = "rateLimit",
    binding: bindingProp,
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
    let rateLimitBinding = bindingProp;
    if (typeof rateLimitBinding === "function") {
      rateLimitBinding = rateLimitBinding(c);
    }

    const options = {
      message,
      statusCode,
      requestPropertyName,
      binding: rateLimitBinding,
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
