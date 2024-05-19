import type { Context, Env, Input } from "hono";
import type { WSContext, WSEvents } from "hono/ws";
import MemoryStore from "./store";
import type { RateLimitInfo, WSConfigType } from "./types";
import { isValidStore } from "./validations";

/**
 *
 * Create an instance of ws based rate-limiting middleware for Hono.
 *
 * @param config {WSConfigType} - Options to configure the rate limiter.
 *
 * @returns - The middleware that rate-limits clients based on your configuration.
 *
 * @public
 */
export function webSocketLimiter<
  E extends Env = Env,
  P extends string = string,
  I extends Input = Input,
>(
  config: Pick<WSConfigType<E, P, I>, "keyGenerator"> &
    Partial<Omit<WSConfigType<E, P, I>, "keyGenerator">>,
) {
  const {
    windowMs = 60_000,
    limit = 5,
    message = "Too many requests, please try again later.",
    statusCode = 1008,
    requestPropertyName = "rateLimit",
    requestStorePropertyName = "rateLimitStore",
    skipFailedRequests = false,
    skipSuccessfulRequests = false,
    keyGenerator,
    skip = () => false,
    handler = async (
      _: unknown,
      ws: WSContext,
      options: WSConfigType<E, P, I>,
    ) => ws.close(options.statusCode, options.message),
    store = new MemoryStore<E, P, I>(),
  } = config ?? {};

  const options = {
    windowMs,
    limit,
    message,
    statusCode,
    requestPropertyName,
    requestStorePropertyName,
    skipFailedRequests,
    skipSuccessfulRequests,
    keyGenerator,
    skip,
    handler,
    store,
  };

  // Checking if store is valid
  if (!isValidStore(store))
    throw new Error("The store is not correctly implemented!");

  // Call the `init` method on the store, if it exists
  // biome-ignore lint/suspicious/noExplicitAny: Need this for backward compatiblity
  if (typeof store.init === "function") store.init(options as any);

  return (
    createEvents: (c: Context<E, P, I>) => WSEvents | Promise<WSEvents>,
  ) => {
    return async (c: Context<E, P, I>): Promise<WSEvents> => {
      const events = await createEvents(c);

      return {
        ...events,
        onMessage: async (event, ws) => {
          // First check if we should skip the request
          const isSkippable = await skip(event, ws);

          if (isSkippable) {
            await events.onMessage?.(event, ws);
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
            if (skipSuccessfulRequests) await decrementKey();
          };

          // If the client has exceeded their rate limit call the `handler` function.
          if (totalHits > _limit) {
            await shouldSkipRequest();
            return handler(event, ws, options);
          }

          try {
            await events.onMessage?.(event, ws);
            await shouldSkipRequest();
          } catch (error) {
            if (skipFailedRequests) await decrementKey();
          } finally {
            if (!c.finalized) await decrementKey();
          }
        },
        onError: async (event, ws) => {
          if (skipFailedRequests) {
            // Get a unique key for the client
            const key = await keyGenerator(c);

            // decrement the counter
            await store.decrement(key);
          }

          events.onError?.(event, ws);
        },
      };
    };
  };
}
