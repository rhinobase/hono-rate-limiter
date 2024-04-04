import type { Context, Env, Input } from "hono";
import { HTTPException } from "hono/http-exception";

export function defaultKeyGenerator<
  E extends Env = Env,
  P extends string = string,
  I extends Input = Input,
>(c: Context<E, P, I>) {
  const ip = c.req.header("CF-Connecting-IP");

  if (ip == null) {
    throw new HTTPException(400, { message: "Could not determine client IP" });
  }

  return ip;
}
