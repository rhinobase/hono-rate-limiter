import type { Context, Env, Input, Next } from "hono";
import type { StatusCode } from "hono/utils/http-status";
import type { Promisify } from "./promisify";
import type { Store } from "./store";

/**
 * Hono request handler that sends back a response when a client is
 * rate-limited.
 *
 * @param context {Context} - The Hono context object.
 * @param next {Next} - The Hono `next` function, can be called to skip responding.
 * @param optionsUsed {ConfigType} - The options used to set up the middleware.
 */
export type RateLimitExceededEventHandler<
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  E extends Env = any,
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  P extends string = any,
  I extends Input = NonNullable<unknown>,
> = (c: Context<E, P, I>, next: Next, optionsUsed: ConfigType<E, P, I>) => void;

/**
 * The configuration options for the rate limiter.
 */
export type ConfigType<
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  E extends Env = any,
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  P extends string = any,
  I extends Input = NonNullable<unknown>,
> = {
  /**
   * How long we should remember the requests.
   *
   * Defaults to `60000` ms (= 1 minute).
   */
  windowMs: number;

  /**
   * The maximum number of connections to allow during the `window` before
   * rate limiting the client.
   *
   * Can be the limit itself as a number or express middleware that parses
   * the request and then figures out the limit.
   *
   * Defaults to `5`.
   */
  limit: number | ((c: Context<E, P, I>) => Promisify<number>);

  /**
   * The response body to send back when a client is rate limited.
   *
   * Defaults to `'Too many requests, please try again later.'`
   */
  message: string | JSON | ((c: Context<E, P, I>) => Promisify<string | JSON>);

  /**
   * The HTTP status code to send back when a client is rate limited.
   *
   * Defaults to `HTTP 429 Too Many Requests` (RFC 6585).
   */
  statusCode: StatusCode;

  /**
   * Whether to enable support for the standardized rate limit headers (`RateLimit-*`).
   *
   * Defaults to `draft-6`.
   */
  standardHeaders: boolean | "draft-6" | "draft-7";

  /**
   * The name of the property on the request object to store the rate limit info.
   *
   * Defaults to `rateLimit`.
   */
  requestPropertyName: string;

  /**
   * If `true`, the library will (by default) skip all requests that have a 4XX
   * or 5XX status.
   *
   * Defaults to `false`.
   */
  skipFailedRequests: boolean;

  /**
   * If `true`, the library will (by default) skip all requests that have a
   * status code less than 400.
   *
   * Defaults to `false`.
   */
  skipSuccessfulRequests: boolean;

  /**
   * Method to generate custom identifiers for clients.
   *
   * By default, the client's IP address is used.
   */
  keyGenerator: (c: Context<E, P, I>) => Promisify<string>;

  /**
   * Hono request handler that sends back a response when a client is
   * rate-limited.
   *
   * By default, sends back the `statusCode` and `message` set via the options.
   */
  handler: RateLimitExceededEventHandler<E, P, I>;

  /**
   * Method (in the form of middleware) to determine whether or not this request
   * counts towards a client's quota.
   *
   * By default, skips no requests.
   */
  skip: (c: Context<E, P, I>) => Promisify<boolean>;

  /**
   * Method to determine whether or not the request counts as 'succesful'. Used
   * when either `skipSuccessfulRequests` or `skipFailedRequests` is set to true.
   *
   * By default, requests with a response status code less than 400 are considered
   * successful.
   */
  requestWasSuccessful: (c: Context<E, P, I>) => Promisify<boolean>;

  /**
   * The `Store` to use to store the hit count for each client.
   *
   * By default, the built-in `MemoryStore` will be used.
   */
  store: Store;
};
