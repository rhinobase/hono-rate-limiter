import type {
  ClientRateLimitInfo,
  IncrementResponse,
  ConfigType as RateLimitConfiguration,
  Store,
} from "hono-rate-limiter";

export class CloudflareStore implements Store {
  /**
   * The text to prepend to the key in Redis.
   */
  prefix: string;

  /**
   * The number of milliseconds to remember that user's requests.
   */
  windowMs!: number;

  /**
   * @constructor for `RedisStore`.
   *
   * @param options {Options} - The configuration options for the store.
   */
  constructor(options: Options) {
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
    const results = await this.client.evalsha<never[], RedisReply>(
      await this.getScriptSha,
      [this.prefixKey(key)],
      [],
    );

    return parseScriptResponse(results);
  }

  /**
   * Method to increment a client's hit counter.
   *
   * @param key {string} - The identifier for a client
   *
   * @returns {IncrementResponse} - The number of hits and reset time for that client
   */
  async increment(key: string): Promise<IncrementResponse> {
    const results = await this.retryableIncrement(key);
    return parseScriptResponse(results);
  }

  /**
   * Method to decrement a client's hit counter.
   *
   * @param key {string} - The identifier for a client
   */
  async decrement(key: string): Promise<void> {
    await this.client.decr(this.prefixKey(key));
  }

  /**
   * Method to reset a client's hit counter.
   *
   * @param key {string} - The identifier for a client
   */
  async resetKey(key: string): Promise<void> {
    await this.client.del(this.prefixKey(key));
  }
}
