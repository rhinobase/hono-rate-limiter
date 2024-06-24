import type { KVNamespace } from "@cloudflare/workers-types";

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

  /**
   * Whether to reset the expiry for a particular key whenever its hit count
   * changes.
   */
  readonly resetExpiryOnChange?: boolean;
};
