import type { Env, Input } from "hono/types";
import type { Storage } from "unstorage";
import type { ClientRateLimitInfo, HonoConfigType, Store } from "../types.ts";

/**
 * A `Store` that stores the hit count for each client using Unstorage
 *
 * {@link https://unstorage.unjs.io/}
 */
export class UnstorageStore<
  E extends Env = Env,
  P extends string = string,
  I extends Input = Input
> implements Store<E, P, I>
{
  /**
   * The duration of time before which all hit counts are reset (in milliseconds).
   */
  windowMs!: number;

  /**
   * The text to prepend to the key in Unstorage.
   */
  prefix: string;

  /**
   * The unstorage storage instance.
   */
  storage: Storage;

  /**
   * @constructor for `UnstorageStore`.
   *
   * @param options {Options} - The configuration options for the store.
   */
  constructor(options: { storage: Storage; prefix?: string }) {
    this.storage = options.storage;
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
   * @param options {HonoConfigType} - The options used to setup the middleware.
   */
  init(options: HonoConfigType<E, P, I>) {
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
    const result = await this.storage
      .get(this.prefixKey(key))
      .then((value) =>
        value ? (JSON.parse(String(value)) as ClientRateLimitInfo) : undefined
      );

    return result;
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
    await this.storage.remove(this.prefixKey(key));
  }

  /**
   * Method to update a record.
   *
   * @param key {string} - The identifier for a client.
   * @param payload {ClientRateLimitInfo} - The payload to update.
   */
  private async updateRecord(
    key: string,
    payload: ClientRateLimitInfo
  ): Promise<void> {
    await this.storage.set(this.prefixKey(key), JSON.stringify(payload));
  }
}
