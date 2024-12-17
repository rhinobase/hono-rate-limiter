import type {
  ClientRateLimitInfo,
  ConfigType as RateLimitConfiguration,
  Store,
} from "hono-rate-limiter";
import type { Env, Input } from "hono/types";
import type { Options } from "../types";

export class WorkersKVStore<
  E extends Env = Env,
  P extends string = string,
  I extends Input = Input,
> implements Store<E, P, I>
{
  /**
   * The text to prepend to the key in Redis.
   */
  prefix: string;

  /**
   * The KV namespace to use.
   */
  namespace: KVNamespace;

  /**
   * The number of milliseconds to remember that user's requests.
   */
  windowMs!: number;

  /**
   * @constructor for `WorkersKVStore`.
   *
   * @param options {Options} - The configuration options for the store.
   */
  constructor(options: Options<KVNamespace>) {
    this.namespace = options.namespace;
    this.prefix = options.prefix ?? "hrl:";
  }

  /**
   * Method to prefix the keys with the given text.
   *
   * @param key {string} - The key.
   *
   * @returns {string} - The text + the key.
   */
  prefixKey(key: string): string {
    return `${this.prefix}${key}`;
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
    const result = await this.namespace.get<ClientRateLimitInfo>(
      this.prefixKey(key),
      "json",
    );

    if (result) return result;

    return undefined;
  }

  /**
   * Method to increment a client's hit counter.
   *
   * @param key {string} - The identifier for a client
   *
   * @returns {ClientRateLimitInfo} - The number of hits and reset time for that client
   */
  async increment(key: string): Promise<ClientRateLimitInfo> {
    let payload = {
      totalHits: 1,
      resetTime: new Date(Date.now() + this.windowMs),
    };

    const record = await this.get(key);

    if (record) {
      payload = {
        totalHits: record.totalHits + 1,
        resetTime: record.resetTime
          ? new Date(record.resetTime)
          : payload.resetTime,
      };
    }

    await this.namespace.put(this.prefixKey(key), JSON.stringify(payload), {
      expiration: Math.floor(payload.resetTime.getTime() / 1000) + 60, // meets Cloudflare's 60-second minimum requirement
    });

    return payload;
  }

  /**
   * Method to decrement a client's hit counter.
   *
   * @param key {string} - The identifier for a client
   */
  async decrement(key: string): Promise<void> {
    const payload = await this.get(key);

    if (!payload || !payload.resetTime) return;

    payload.totalHits -= 1;

    await this.namespace.put(this.prefixKey(key), JSON.stringify(payload), {
      expiration: Math.floor(payload.resetTime.getTime() / 1000) + 60, // meets Cloudflare's 60-second minimum requirement
    });
  }

  /**
   * Method to reset a client's hit counter.
   *
   * @param key {string} - The identifier for a client
   */
  async resetKey(key: string): Promise<void> {
    await this.namespace.delete(this.prefixKey(key));
  }
}
