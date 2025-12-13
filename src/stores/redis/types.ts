export type RedisClient = {
  scriptLoad: (script: string) => Promise<string>;
  evalsha: <TArgs extends unknown[], TData = unknown>(
    sha1: string,
    keys: string[],
    args: TArgs,
  ) => Promise<TData>;
  decr: (key: string) => Promise<number>;
  del: (key: string) => Promise<number>;
};

/**
 * The type of data Redis might return to us.
 */
type Data = boolean | number | string;
export type RedisReply = Data | Data[];

/**
 * The configuration options for the store.
 */
export type Options = {
  /**
   * The Redis client
   */
  client: RedisClient;
  /**
   * The text to prepend to the key in Redis.
   */
  readonly prefix?: string;

  /**
   * Whether to reset the expiry for a particular key whenever its hit count
   * changes.
   */
  readonly resetExpiryOnChange?: boolean;
};
