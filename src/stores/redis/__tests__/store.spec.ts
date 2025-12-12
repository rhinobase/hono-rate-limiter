import { Redis } from "@upstash/redis";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ConfigType } from "../../../types";
import { RedisStore } from "../store";

const client = new Redis({
  // biome-ignore lint/complexity/useLiteralKeys: Clashing with another linter
  url: process.env["UPSTASH_REDIS_REST_URL"] ?? "http://localhost:8080",
  // biome-ignore lint/complexity/useLiteralKeys: Clashing with another linter
  token: process.env["UPSTASH_REDIS_REST_TOKEN"] ?? "example_token",
});

describe.skip("redis store test", () => {
  afterEach(async () => {
    await client.flushall();
  });

  it("supports custom prefixes", async () => {
    const store = new RedisStore({ client, prefix: "test-" });
    store.init({ windowMs: 10 } as ConfigType);

    const key = "store";

    await store.increment(key);

    // Ensure the hit count is 1, and the expiry is 10 milliseconds (value of
    // `windowMs`).
    expect(Number(await client.get("test-store"))).toEqual(1);
    expect(Number(await client.pttl("test-store"))).lessThan(10);
  });

  it("sets the value to 1 on first call to `increment`", async () => {
    const store = new RedisStore({ client });
    store.init({ windowMs: 10 } as ConfigType);

    const key = "test-store";

    const { totalHits } = await store.increment(key); // => 1

    // Ensure the hit count is 1, and the expiry is 10 milliseconds (value of
    // `windowMs`).
    expect(totalHits).toEqual(1);
    expect(Number(await client.get("hrl:test-store"))).toEqual(1);
    expect(Number(await client.pttl("hrl:test-store"))).lessThan(10);
  });

  it("increments the key for the store when `increment` is called", async () => {
    const store = new RedisStore({ client });
    store.init({ windowMs: 10 } as ConfigType);

    const key = "test-store";

    await store.increment(key); // => 1
    const { totalHits } = await store.increment(key); // => 2

    // Ensure the hit count is 2, and the expiry is 10 milliseconds (value of
    // `windowMs`).
    expect(totalHits).toEqual(2);
    expect(Number(await client.get("hrl:test-store"))).toEqual(2);
    expect(Number(await client.pttl("hrl:test-store"))).lessThan(10);
  });

  it("decrements the key for the store when `decrement` is called", async () => {
    const store = new RedisStore({ client });
    store.init({ windowMs: 10 } as ConfigType);

    const key = "test-store";

    await store.increment(key); // => 1
    await store.increment(key); // => 2
    await store.decrement(key); // => 1
    const { totalHits } = await store.increment(key); // => 2

    // Ensure the hit count is 2, and the expiry is 10 milliseconds (value of
    // `windowMs`).
    expect(totalHits).toEqual(2);
    expect(Number(await client.get("hrl:test-store"))).toEqual(2);
    expect(Number(await client.pttl("hrl:test-store"))).lessThan(10);
  });

  it("resets the count for a key in the store when `resetKey` is called", async () => {
    const store = new RedisStore({ client });
    store.init({ windowMs: 10 } as ConfigType);

    const key = "test-store";

    await store.increment(key); // => 1
    await store.increment(key); // => 2
    await store.resetKey(key); // => undefined

    const { totalHits } = await store.increment(key); // => 1

    // Ensure the hit count is 1, and the expiry is 10 milliseconds (value of
    // `windowMs`).
    expect(totalHits).toEqual(1);
    expect(Number(await client.get("hrl:test-store"))).toEqual(1);
    expect(Number(await client.pttl("hrl:test-store"))).lessThan(10);
  });

  it("fetches the count for a key in the store when `getKey` is called", async () => {
    const store = new RedisStore({ client });
    store.init({ windowMs: 10 } as ConfigType);

    const key = "test-store";

    await store.increment(key); // => 1
    await store.increment(key); // => 2
    const info = await store.get(key);

    // Ensure the hit count is 1, and that `resetTime` is a date.
    expect(info).toMatchObject({
      totalHits: 2,
      resetTime: expect.any(Date),
    });
  });

  it("resets expiry time on change if `resetExpiryOnChange` is set to `true`", async () => {
    const store = new RedisStore({
      client,
      resetExpiryOnChange: true,
    });
    store.init({ windowMs: 2000 } as ConfigType);

    const key = "test-store";

    await store.increment(key); // => 1

    // Ensure the hit count is 1, and the expiry is 2000 milliseconds (value of
    // `windowMs`).
    expect(Number(await client.get("hrl:test-store"))).toEqual(1);
    expect(Number(await client.pttl("hrl:test-store"))).lessThan(2000);

    await store.increment(key); // => 2

    // Ensure the hit count is 2, and the expiry is 2000 milliseconds (value of
    // `windowMs`).
    expect(Number(await client.get("hrl:test-store"))).toEqual(2);
    expect(Number(await client.pttl("hrl:test-store"))).lessThan(2000);
  });

  it("resets the count for all the keys in the store when the timeout is reached", async () => {
    const store = new RedisStore({ client });
    store.init({ windowMs: 20 } as ConfigType);

    const keyOne = "test-store-one";
    const keyTwo = "test-store-two";

    await store.increment(keyOne);
    await store.increment(keyTwo);

    let isReady = false;
    await vi.waitUntil(
      () => {
        if (!isReady) {
          isReady = true;
          return false;
        }

        return true;
      },
      {
        interval: 30,
      },
    );

    // Ensure that the keys have been deleted
    expect(await client.get("hrl:test-store-one")).toEqual(null);
    expect(await client.get("hrl:test-store-two")).toEqual(null);
  });
});
