import type { Context } from "hono";
import type { Env, Input } from "hono/types";
import type { ConfigType, Promisify, Store } from "./types";

export const isValidStore = <
  E extends Env = Env,
  P extends string = string,
  I extends Input = Input,
>(
  value: Store<E, P, I>,
): value is Store<E, P, I> => !!value?.increment;

export function initStore<E extends Env, P extends string, I extends Input>(
  store: Store<E, P, I>,
  options: ConfigType<E, P, I>,
) {
  // Checking if store is valid
  if (!isValidStore(store)) {
    throw new Error("The store is not correctly implemented!");
  }

  // Call the `init` method on the store, if it exists
  if (typeof store.init === "function") {
    store.init(options);
  }
}

export async function getKeyAndIncrement<
  E extends Env,
  P extends string,
  I extends Input,
>(
  c: Context<E, P, I>,
  keyGenerator: (c: Context<E, P, I>) => Promisify<string>,
  store: Store<E, P, I>,
): Promise<{ key: string; totalHits: number; resetTime: Date | undefined }> {
  // Get a unique key for the client
  const key = await keyGenerator(c);

  // Increment the client's hit counter by one.
  const { totalHits, resetTime } = await store.increment(key);

  return { key, totalHits, resetTime };
}
