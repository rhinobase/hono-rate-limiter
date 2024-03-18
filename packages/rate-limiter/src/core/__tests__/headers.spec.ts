import { Hono } from "hono";
import { testClient } from "hono/testing";
import { rateLimiter } from "..";

const app = new Hono()
  .use(rateLimiter({ windowMs: 2_000, limit: 1 }))
  .get("/", (c) => c.json({ hello: "world" }));

const client = testClient(app);

describe("headers test", () => {
  it("should send correct `x-ratelimit-limit`, `x-ratelimit-remaining`, and `x-ratelimit-reset` headers", async () => {
    const res = await client.index.$get();

    expect(await res.json()).toEqual({ hello: "world" });
  });

  it("limit", async () => {
    const res = await client.index.$get();

    expect(await res.json()).toEqual({ hello: "world" });
  });
});
