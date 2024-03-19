import type { ClientRateLimitInfo } from "./clientRateLimitInfo";
import type { ConfigType } from "./config";

export type IncrementResponse = ClientRateLimitInfo;

/**
 * An interface that all hit counter stores must implement.
 */
export type Store = {
  /**
   * Method that initializes the store, and has access to the options passed to
   * the middleware too.
   *
   * @param options {ConfigType} - The options used to setup the middleware.
   */
  init?: (options: ConfigType) => void;

  /**
   * Method to fetch a client's hit count and reset time.
   *
   * @param key {string} - The identifier for a client.
   *
   * @returns {ClientRateLimitInfo} - The number of hits and reset time for that client.
   */
  get?: (
    key: string,
  ) =>
    | Promise<ClientRateLimitInfo | undefined>
    | ClientRateLimitInfo
    | undefined;

  /**
   * Method to increment a client's hit counter.
   *
   * @param key {string} - The identifier for a client.
   *
   * @returns {IncrementResponse | undefined} - The number of hits and reset time for that client.
   */
  increment: (key: string) => Promise<IncrementResponse> | IncrementResponse;

  /**
   * Method to decrement a client's hit counter.
   *
   * @param key {string} - The identifier for a client.
   */
  decrement: (key: string) => Promise<void> | void;

  /**
   * Method to reset a client's hit counter.
   *
   * @param key {string} - The identifier for a client.
   */
  resetKey: (key: string) => Promise<void> | void;

  /**
   * Method to reset everyone's hit counter.
   */
  resetAll?: () => Promise<void> | void;

  /**
   * Method to shutdown the store, stop timers, and release all resources.
   */
  shutdown?: () => Promise<void> | void;

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
