import { handle } from "@hono/node-server/vercel";
import { Hono } from "hono";
import { logger } from "hono/logger";
import Page from "./Page";

const app = new Hono();

app.use(logger());

app.get("/", (c) => {
  return c.html(
    <Page info={{ limit: 5, used: 1, remaining: 4, resetTime: new Date() }} />,
  );
});

export default handle(app);
