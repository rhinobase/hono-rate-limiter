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
   * Expiration targets that are less than 60 seconds into the future are not supported. This is true for both expiration methods.
   *
   * see: https://developers.cloudflare.com/kv/api/write-key-value-pairs/#expiring-keys
   *
   */
  private static readonly KV_MIN_EXPIRATION_BUFFER = 60;

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
   * Method to increment a client's hit counter. If the current time is within an active window,
   * it increments the existing hit count. Otherwise, it starts a new window with a hit count of 1.
   *
   * @param key {string} - The identifier for a client
   *
   * @returns {ClientRateLimitInfo} - An object containing:
   *   - totalHits: The updated number of hits for the client
   *   - resetTime: The time when the current rate limit window expires
   */
  async increment(key: string): Promise<ClientRateLimitInfo> {
    const nowMS = Date.now();
    const record = await this.get(key);
    const defaultResetTime = new Date(nowMS + this.windowMs);

    const existingResetTimeMS =
      record?.resetTime && new Date(record.resetTime).getTime();
    const isActiveWindow = existingResetTimeMS && existingResetTimeMS > nowMS;

    const payload: ClientRateLimitInfo = {
      totalHits: isActiveWindow ? record.totalHits + 1 : 1,
      resetTime:
        isActiveWindow && existingResetTimeMS
          ? new Date(existingResetTimeMS)
          : defaultResetTime,
    };

    await this.updateRecord(key, payload);

    return payload;
  }

  /**
   * Method to decrement a client's hit counter. Only decrements if there is an active time window.
   * The hit counter will never go below 0.
   *
   * @param key {string} - The identifier for a client
   * @returns {Promise<void>} - Returns void after attempting to decrement the counter
   */
  async decrement(key: string): Promise<void> {
    const nowMS = Date.now();
    const record = await this.get(key);

    const existingResetTimeMS =
      record?.resetTime && new Date(record.resetTime).getTime();
    const isActiveWindow = existingResetTimeMS && existingResetTimeMS > nowMS;

    // Only decrement if in active window
    if (isActiveWindow && record) {
      const payload: ClientRateLimitInfo = {
        totalHits: Math.max(0, record.totalHits - 1), // Never go below 0
        resetTime: new Date(existingResetTimeMS),
      };

      await this.updateRecord(key, payload);
    }

    return;
  }

  /**
   * Method to reset a client's hit counter.
   *
   * @param key {string} - The identifier for a client
   */
  async resetKey(key: string): Promise<void> {
    await this.namespace.delete(this.prefixKey(key));
  }

  /**
   * Method to calculate expiration.
   *
   * @param resetTime {Date} - The reset time.
   *
   * @returns {number} - The expiration in seconds.
   *
   * Note: KV expiration is always set to 60s after resetTime or nowSeconds to meet Cloudflare's minimum requirement.
   * This doesn't affect rate limiting behavior which is controlled by resetTime.
   */
  private calculateExpiration(resetTime: Date): number {
    const resetTimeSeconds = Math.floor(resetTime.getTime() / 1000);
    const nowSeconds = Math.floor(Date.now() / 1000);
    return Math.max(
      resetTimeSeconds + WorkersKVStore.KV_MIN_EXPIRATION_BUFFER,
      nowSeconds + WorkersKVStore.KV_MIN_EXPIRATION_BUFFER,
    );
  }

  /**
   * Method to update a record.
   *
   * @param key {string} - The identifier for a client.
   * @param payload {ClientRateLimitInfo} - The payload to update.
   */
  private async updateRecord(
    key: string,
    payload: ClientRateLimitInfo,
  ): Promise<void> {
    await this.namespace.put(this.prefixKey(key), JSON.stringify(payload), {
      expiration: this.calculateExpiration(payload.resetTime as Date),
    });
  }
}
