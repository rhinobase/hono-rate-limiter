import type { Context } from "hono";
import type { Env, Input, Next } from "hono/types";
import type { StatusCode } from "hono/utils/http-status";
import type { Storage } from "unstorage";

/**
 * Promisify<T> is a utility type that represents a value of type T or a Promise<T>.
 * This type is useful for converting synchronous functions to asynchronous functions.
 * @example
 *   type getResult = Promisify<number>;  // getResult can be number or Promise<number>
 *   type getUser = Promisify<User>;      // getUser can be User or Promise<User>
 */
export type Promisify<T> = T | Promise<T>;

/**
 * Hono request handler that sends back a response when a client is
 * rate-limited.
 *
 * @param context {Context} - The Hono context object.
 * @param next {Next} - The Hono `next` function, can be called to skip responding.
 * @param optionsUsed {ConfigType} - The options used to set up the middleware.
 */
export type RateLimitExceededEventHandler<
  E extends Env = Env,
  P extends string = string,
  I extends Input = Input,
> = (c: Context<E, P, I>, next: Next, optionsUsed: ConfigType<E, P, I>) => void;

/**
 * The configuration options for the rate limiter.
 */
export type ConfigType<
  E extends Env = Env,
  P extends string = string,
  I extends Input = Input,
> = {
  /**
   * The response body to send back when a client is rate limited.
   *
   * Defaults to `'Too many requests, please try again later.'`
   */
  message:
  | string
  | Record<string, unknown>
  | ((c: Context<E, P, I>) => Promisify<string | Record<string, unknown>>);

  /**
   * The HTTP status code to send back when a client is rate limited.
   *
   * Defaults to `HTTP 429 Too Many Requests` (RFC 6585).
   */
  statusCode: StatusCode;

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
   * The `Storage` to use to store the hit count for each client.
   *
   * By default, the `MemoryStorage` will be used.
   */
  storage: Storage;

  limiter: RateLimitAlgorithm<E, P, I>;
}

export type RateLimitAlgorithm<E extends Env = Env, P extends string = string, I extends Input = Input> = (c: Context<E, P, I>) => Promisify<void>;