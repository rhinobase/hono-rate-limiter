import type { Context, Env, Input, Next } from "hono";
import type { StatusCode } from "hono/utils/http-status";
import type { WSContext } from "hono/ws";

/**
 * Data returned from the `Store` when a client's hit counter is incremented.
 *
 * @property totalHits {number} - The number of hits for that client so far.
 * @property resetTime {Date | undefined} - The time when the counter resets.
 */
export type ClientRateLimitInfo = {
  totalHits: number;
  resetTime?: Date;
};

/**
 * Promisify<T> is a utility type that represents a value of type T or a Promise<T>.
 * This type is useful for converting synchronous functions to asynchronous functions.
 * @example
 *   type getResult = Promisify<number>;  // getResult can be number or Promise<number>
 *   type getUser = Promisify<User>;      // getUser can be User or Promise<User>
 */
export type Promisify<T> = T | Promise<T>;

/**
 * The rate limit related information for each client included in the
 * Hono context object.
 */
export type RateLimitInfo = {
  limit: number;
  used: number;
  remaining: number;
  resetTime: Date | undefined;
};

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
export interface ConfigType<
  E extends Env = Env,
  P extends string = string,
  I extends Input = Input,
> {
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
   * Whether to enable support for the standardized rate limit headers (`RateLimit-*`).
   *
   * Defaults to `draft-6`.
   */
  standardHeaders: boolean | "draft-6" | "draft-7";

  /**
   * The name of the property on the context object to store the rate limit info.
   *
   * Defaults to `rateLimit`.
   */
  requestPropertyName: string;

  /**
   * The name of the property on the context object to store the Data Store instance.
   *
   * Defaults to `rateLimitStore`.
   */
  requestStorePropertyName: string;

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
   * The `Store` to use to store the hit count for each client.
   *
   * By default, the built-in `MemoryStore` will be used.
   */
  store: Store<E, P, I>;
}

export type WSStatusCode =
  | 1000
  | 1001
  | 1002
  | 1003
  | 1004
  | 1005
  | 1006
  | 1007
  | 1008
  | 1009
  | 1010;

/**
 * Hono request handler that sends back a response when a client is
 * rate-limited.
 *
 * @param context {Context} - The Hono context object.
 * @param event {unknown} - The WebSocket event that triggered the rate limit.
 * @param ws {WSContext} - The Honos WebSocket context object.
 * @param optionsUsed {ConfigType} - The options used to set up the middleware.
 */
export type WSRateLimitExceededEventHandler<
  E extends Env = Env,
  P extends string = string,
  I extends Input = Input,
> = (
  c: Context<E, P, I>,
  event: unknown,
  ws: WSContext,
  optionsUsed: WSConfigType<E, P, I>,
) => void;

/**
 * The configuration options for the rate limiter.
 */
export interface WSConfigType<
  E extends Env = Env,
  P extends string = string,
  I extends Input = Input,
> extends Omit<
    ConfigType<E, P, I>,
    | "statusCode"
    | "standardHeaders"
    | "requestWasSuccessful"
    | "handler"
    | "skip"
  > {
  /**
   * The response body to send back when a client is rate limited.
   *
   * Defaults to `'Too many requests, please try again later.'`
   */
  message: string;

  /**
   * The ws status code to send back when a client is rate limited.
   *
   * Defaults to `HTTP 1008 Terminating The Connection` (RFC 6455).
   */
  statusCode: WSStatusCode;

  /**
   * Hono ws request handler that sends back a response when a client is
   * rate-limited.
   *
   * By default, sends back the `statusCode` and `message` set via the options.
   */
  handler: WSRateLimitExceededEventHandler<E, P, I>;

  /**
   * Method (in the form of middleware) to determine whether or not this ws request
   * counts towards a client's quota.
   *
   * By default, skips no requests.
   */
  skip: (
    c: Context<E, P, I>,
    event: unknown,
    ws: WSContext,
  ) => Promisify<boolean>;
}

export type IncrementResponse = ClientRateLimitInfo;

/**
 * An interface that all hit counter stores must implement.
 */
export type Store<
  E extends Env = Env,
  P extends string = string,
  I extends Input = Input,
> = {
  /**
   * Method that initializes the store, and has access to the options passed to
   * the middleware too.
   *
   * @param options {ConfigType} - The options used to setup the middleware.
   */
  init?: (options: ConfigType<E, P, I>) => void;

  /**
   * Method to fetch a client's hit count and reset time.
   *
   * @param key {string} - The identifier for a client.
   *
   * @returns {ClientRateLimitInfo} - The number of hits and reset time for that client.
   */
  get?: (key: string) => Promisify<ClientRateLimitInfo | undefined>;

  /**
   * Method to increment a client's hit counter.
   *
   * @param key {string} - The identifier for a client.
   *
   * @returns {IncrementResponse | undefined} - The number of hits and reset time for that client.
   */
  increment: (key: string) => Promisify<IncrementResponse>;

  /**
   * Method to decrement a client's hit counter.
   *
   * @param key {string} - The identifier for a client.
   */
  decrement: (key: string) => Promisify<void>;

  /**
   * Method to reset a client's hit counter.
   *
   * @param key {string} - The identifier for a client.
   */
  resetKey: (key: string) => Promisify<void>;

  /**
   * Method to reset everyone's hit counter.
   */
  resetAll?: () => Promisify<void>;

  /**
   * Method to shutdown the store, stop timers, and release all resources.
   */
  shutdown?: () => Promisify<void>;

  /**
   * Flag to indicate that keys incremented in one instance of this store can
   * not affect other instances. Typically false if a database is used, true for
   * MemoryStore.
   *
   * Used to help detect double-counting misconfigurations.
   */
  localKeys?: boolean;

  /**
   * Optional value that the store prepends to keys
   *
   * Used by the double-count check to avoid false-positives when a key is counted twice, but with different prefixes
   */
  prefix?: string;
};

export type GeneralConfigType<T extends { keyGenerator: unknown }> = Pick<
  T,
  "keyGenerator"
> &
  Partial<Omit<T, "keyGenerator">>;
