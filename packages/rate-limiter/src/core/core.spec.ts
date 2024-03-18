import { Hono } from "hono";
import { testClient } from "hono/testing";
import { rateLimiter } from ".";

describe("core", () => {
  it("basic", async () => {
    const app = new Hono()
      .use(rateLimiter())
      .get("/", (c) => c.json({ hello: "world" }));

    const res = await testClient(app).index.$get();

    expect(await res.json()).toEqual({ hello: "world" });
  });
});
