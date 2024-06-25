import type { KVNamespace } from "@cloudflare/workers-types";
import type { Context, Env, Input, Next } from "hono";
import type { Promisify } from "hono-rate-limiter";
import type { StatusCode } from "hono/utils/http-status";

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

export type RateLimitBinding = {
  limit: (options: { key: string }) => Promise<{ success: boolean }>;
};

/**
 * The configuration options for the rate limiter.
 */
export interface ConfigType<
  E extends Env = Env,
  P extends string = string,
  I extends Input = Input,
> {
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
   * Method to generate custom identifiers for clients.
   */
  rateLimitBinding: RateLimitBinding;

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
}

/**
 * The configuration options for the store.
 */
export type Options = {
  /**
   * The KV namespace to use.
   */
  namespace: KVNamespace;

  /**
   * The text to prepend to the key in Redis.
   */
  readonly prefix?: string;
};
