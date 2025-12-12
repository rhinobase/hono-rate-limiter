import type { Env, Input } from "hono/types";
import type { HonoConfigType, Store } from "./types";

export const isValidStore = <
  E extends Env = Env,
  P extends string = string,
  I extends Input = Input,
>(
  value: Store<E, P, I>,
): value is Store<E, P, I> => !!value?.increment;

export function initStore<E extends Env, P extends string, I extends Input>(
  store: Store<E, P, I>,
  options: HonoConfigType<E, P, I>,
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
