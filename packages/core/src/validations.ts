import type { Store } from "./types";

export const isValidStore = (value: Store): value is Store =>
  !!value?.increment;
