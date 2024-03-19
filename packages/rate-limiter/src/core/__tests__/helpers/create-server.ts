import { type Env, Hono, type Input, type MiddlewareHandler } from "hono";
import { HTTPException } from "hono/http-exception";

export function createServer<E extends Env, P extends string, I extends Input>(
  middleware: MiddlewareHandler<E, P, I>,
) {
  // Init the app
  const app = new Hono()

    // Adding the middleware
    .use(middleware)

    // Register test routes
    .get("/", (c) => c.text("Hi there!"))
    .get("/error", (c) => c.text("Error!", { status: 400 }))
    .post("/crash", (c) => {
      throw new HTTPException(400, { message: "Oops!" });
    });

  // Return the application instance
  return app;
}
