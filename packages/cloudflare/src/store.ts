import type {
  ClientRateLimitInfo,
  ConfigType as RateLimitConfiguration,
  Store,
} from "hono-rate-limiter";
import type { Options } from "./types";

export class WorkersKVStore<KVNamespace> implements Store {
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
   * @constructor for `RedisStore`.
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
  init(options: RateLimitConfiguration) {
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
    // @ts-ignore
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
    const keyWithPrefix = this.prefixKey(key);
    // @ts-ignore
    let payload = await this.namespace.get<Required<ClientRateLimitInfo>>(
      keyWithPrefix,
      "json",
    );

    if (payload) payload.totalHits += 1;
    else {
      payload = {
        totalHits: 1,
        resetTime: new Date(),
      };
      payload.resetTime.setTime(this.windowMs);
    }

    // @ts-ignore
    await this.namespace.put(keyWithPrefix, JSON.stringify(payload), {
      expiration: Math.floor(payload.resetTime.getTime() / 1000),
    });

    return payload;
  }

  /**
   * Method to decrement a client's hit counter.
   *
   * @param key {string} - The identifier for a client
   */
  async decrement(key: string): Promise<void> {
    const keyWithPrefix = this.prefixKey(key);

    // @ts-ignore
    const payload = await this.namespace.get<Required<ClientRateLimitInfo>>(
      keyWithPrefix,
      "json",
    );

    if (!payload) return;

    payload.totalHits -= 1;

    // @ts-ignore
    await this.namespace.put(keyWithPrefix, JSON.stringify(payload), {
      expiration: Math.floor(payload.resetTime.getTime() / 1000),
    });
  }

  /**
   * Method to reset a client's hit counter.
   *
   * @param key {string} - The identifier for a client
   */
  async resetKey(key: string): Promise<void> {
    // @ts-ignore
    await this.namespace.delete(this.prefixKey(key));
  }
}
