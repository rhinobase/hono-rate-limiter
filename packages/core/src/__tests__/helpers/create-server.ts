import { type Env, Hono, type Input, type MiddlewareHandler } from "hono";
import { HTTPException } from "hono/http-exception";

export function createServer<
  // biome-ignore lint/suspicious/noExplicitAny: For testing
  E extends Env = any,
  // biome-ignore lint/suspicious/noExplicitAny: For testing
  P extends string = any,
  I extends Input = NonNullable<unknown>,
>({
  middleware,
}: {
  middleware: MiddlewareHandler<E, P, I> | MiddlewareHandler<E, P, I>[];
}) {
  const wares = Array.isArray(middleware) ? middleware : [middleware];

  // Init the app
  const app = new Hono()

    // Adding the middleware
    .use(...wares)

    // Register test routes
    .get("/", (c) => c.text("Hi there!"))
    .get("/error", (c) => c.text("Error!", { status: 400 }))
    .post("/crash", (c) => {
      throw new HTTPException(400, { message: "Oops!" });
    });

  // Return the application instance
  return app;
}
