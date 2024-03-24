import type { Context, Env, Input } from "hono";
import { getRuntimeKey } from "hono/adapter";

export function defaultKeyGenerator<
  E extends Env,
  P extends string,
  I extends Input,
>(c: Context<E, P, I>) {
  const runtime = getRuntimeKey();

  let key: string | null = null;

  switch (runtime) {
    case "workerd":
      key = c.req.raw.headers.get("CF-Connecting-IP");
      break;
    case "fastly":
      key = c.req.raw.headers.get("Fastly-Client-IP");
      break;
    case "other":
      key = c.req.raw.headers.get("x-real-ip");
      break;
    default:
      break;
  }

  return key ?? "";
}
