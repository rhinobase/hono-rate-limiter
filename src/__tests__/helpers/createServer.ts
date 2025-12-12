import { createAdaptorServer } from "@hono/node-server";
import { createNodeWebSocket } from "@hono/node-ws";
import {
  type Context,
  type Env,
  Hono,
  type Input,
  type MiddlewareHandler,
} from "hono";
import { HTTPException } from "hono/http-exception";
import type { WSEvents } from "hono/ws";

export function createServer<
  E extends Env = Env,
  P extends string = string,
  I extends Input = Input,
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
    .post("/crash", () => {
      throw new HTTPException(400, { message: "Oops!" });
    });

  // Return the application instance
  return app;
}

export function createWsServer<
  E extends Env = Env,
  P extends string = string,
  I extends Input = Input,
>({
  middleware,
}: {
  middleware: (
    createEvents: (c: Context<E, P, I>) => WSEvents | Promise<WSEvents>,
  ) => (c: Context<E, P, I>) => Promise<WSEvents>;
}) {
  // Init the app
  const app = new Hono();

  const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app });

  // Apply the rate limiting middleware to ws requests.
  app.get(
    "/",
    upgradeWebSocket(
      middleware(() => {
        return {
          onOpen: () => {
            console.log("Connection opened");
          },
          onMessage(_, ws) {
            ws.send("Hi there!");
          },
          onClose: () => {
            console.log("Connection closed");
          },
        };
      }),
    ),
  );

  // Return the application instance
  const server = createAdaptorServer(app);
  injectWebSocket(server);

  return server;
}
