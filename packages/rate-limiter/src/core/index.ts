import type { Context, Env, Input } from "hono";
import { createMiddleware } from "hono/factory";
import MemoryStore from "../memcache";
import type { ConfigType, RateLimitInfo } from "../types";
import {
  setDraft6Headers,
  setDraft7Headers,
  setRetryAfterHeader,
} from "./headers";

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
    handler = () => undefined,
  } = config ?? {};

  const options: ConfigType<E, P, I> = {
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
  };

  const store = config?.store ?? new MemoryStore();

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
    c.set(requestPropertyName, info);

    // Set the standardized `RateLimit-*` headers on the response object
    if (standardHeaders && !c.finalized) {
      if (standardHeaders === "draft-6") {
        setDraft6Headers(c, info, windowMs);
      } else if (standardHeaders === "draft-7") {
        setDraft7Headers(c, info, windowMs);
      }
    }

    // If we are to skip failed/successfull requests, decrement the
    // counter accordingly once we know the status code of the request
    if (skipFailedRequests || skipSuccessfulRequests) {
      let decremented = false;
      const decrementKey = async () => {
        if (!decremented) {
          await store.decrement(key);
          decremented = true;
        }
      };

      if (skipFailedRequests) {
        response.on("finish", async () => {
          if (!(await requestWasSuccessful(c))) await decrementKey();
        });
        response.on("close", async () => {
          if (!response.writableEnded) await decrementKey();
        });
        response.on("error", async () => {
          await decrementKey();
        });
      }

      if (skipSuccessfulRequests) {
        response.on("finish", async () => {
          if (await requestWasSuccessful(c)) await decrementKey();
        });
      }
    }

    // If the client has exceeded their rate limit, set the Retry-After header
    // and call the `handler` function.
    if (totalHits > _limit) {
      if (standardHeaders) {
        setRetryAfterHeader(c, info, windowMs);
      }

      handler(c, next, options);
      return;
    }

    await next();
  });
}
