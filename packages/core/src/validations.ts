import type { Env, Input } from "hono/types";
import type { Store } from "./types";

export const isValidStore = <
  E extends Env = Env,
  P extends string = string,
  I extends Input = Input,
>(
  value: Store<E, P, I>,
): value is Store<E, P, I> => !!value?.increment;
