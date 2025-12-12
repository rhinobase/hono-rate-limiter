import type {
  ClientRateLimitInfo,
  ConfigType as RateLimitConfiguration,
  Store,
} from "../../types";
import type { Env, Input } from "hono/types";
import type { Options } from "../types";
import type { DurableObjectRateLimiter } from "./DurableObjectClass";

export class DurableObjectStore<
  E extends Env = Env,
  P extends string = string,
  I extends Input = Input
> implements Store<E, P, I>
{
  /**
   * The text to prepend to the key in Redis.
   */
  prefix: string;

  /**
   * The Durable Object namespace to use.
   */
  namespace: DurableObjectNamespace<DurableObjectRateLimiter>;

  /**
   * The number of milliseconds to remember that user's requests.
   */
  windowMs!: number;

  /**
   * @constructor for `DurableObjectStore`.
   *
   * @param options {Options} - The configuration options for the store.
   */
  constructor(
    options: Options<DurableObjectNamespace<DurableObjectRateLimiter>>
  ) {
    this.namespace = options.namespace;
    this.prefix = options.prefix ?? "hrl:";
  }

  /**
   * Method to prefix the keys with the given text and return a `DurableObjectId`.
   *
   * @param key {string} - The key.
   *
   * @returns {DurableObjectId} - The text + the key.
   */
  prefixKey(key: string): DurableObjectId {
    return this.namespace.idFromName(`${this.prefix}${key}`);
  }

  /**
   * Method that actually initializes the store.
   *
   * @param options {RateLimitConfiguration} - The options used to setup the middleware.
   */
  init(options: RateLimitConfiguration<E, P, I>) {
    this.windowMs = options.windowMs;
  }

  /**
   * Method to fetch a client's hit count and reset time.
   *
   * @param key {string} - The identifier for a client.
   *
   * @returns {ClientRateLimitInfo | undefined} - The number of hits and reset time for that client.
   */
  async get(key: string): Promise<ClientRateLimitInfo | undefined> {
    return this.namespace.get(this.prefixKey(key)).value();
  }

  /**
   * Method to increment a client's hit counter.
   *
   * @param key {string} - The identifier for a client
   *
   * @returns {ClientRateLimitInfo} - The number of hits and reset time for that client
   */
  async increment(key: string): Promise<ClientRateLimitInfo> {
    return this.namespace.get(this.prefixKey(key)).update(1, this.windowMs);
  }

  /**
   * Method to decrement a client's hit counter.
   *
   * @param key {string} - The identifier for a client
   */
  async decrement(key: string): Promise<void> {
    await this.namespace.get(this.prefixKey(key)).update(-1, this.windowMs);
  }

  /**
   * Method to reset a client's hit counter.
   *
   * @param key {string} - The identifier for a client
   */
  async resetKey(key: string): Promise<void> {
    await this.namespace.get(this.prefixKey(key)).reset();
  }
}
