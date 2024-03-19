import { createHash } from "node:crypto";
import MockRedisClient from "ioredis-mock";
import DefaultExportRedisStore, { RedisStore, type RedisReply } from "../";
import type { ConfigType } from "../../types";

// The mock redis client to use.
const client = new MockRedisClient();

/**
 * A wrapper around the mock redis client to call the right function, as the
 * `ioredis-mock` library does not have a send-raw-command function.
 *
 * @param {string[]} ...args - The raw command to send.
 *
 * @return {RedisReply} The reply returned by Redis.
 */
const sendCommand = async (...args: string[]): Promise<RedisReply> => {
  // `SCRIPT LOAD`, called when the store is initialized. This loads the lua script
  // for incrementing a client's hit counter.
  if (args[0] === "SCRIPT") {
    // `ioredis-mock` doesn't have a `SCRIPT LOAD` function, so we have to compute
    // the SHA manually and `EVAL` the script to get it saved.
    const shasum = createHash("sha1");
    shasum.update(args[2]);
    const sha = shasum.digest("hex");

    const testArgs = args[2].includes("INCR")
      ? ["__test_incr", "0", "10"]
      : ["__test_get"];
    await client.eval(args[2], 1, ...testArgs);

    // Return the SHA to the store.
    return sha;
  }

  // `EVALSHA` executes the script that was loaded already with the given arguments
  if (args[0] === "EVALSHA") {
    // @ts-expect-error Wrong types :/
    return client.evalsha(...args.slice(1)) as number[];
  }

  // `DECR` decrements the count for a client.
  if (args[0] === "DECR") return client.decr(args[1]);
  // `DEL` resets the count for a client by deleting the key.
  if (args[0] === "DEL") return client.del(args[1]);

  // This should not happen
  return -99;
};

describe("redis store test", () => {
  // Mock timers so we can fast forward time instead of waiting for n seconds
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(async () => {
    vi.useRealTimers();
    await client.flushall();
  });

  it("supports custom prefixes", async () => {
    const store = new RedisStore({ sendCommand, prefix: "test-" });
    store.init({ windowMs: 10 } as ConfigType);

    const key = "store";

    await store.increment(key);

    // Ensure the hit count is 1, and the expiry is 10 milliseconds (value of
    // `windowMs`).
    expect(Number(await client.get("test-store"))).toEqual(1);
    expect(Number(await client.pttl("test-store"))).toEqual(10);
  });

  it("sets the value to 1 on first call to `increment`", async () => {
    const store = new RedisStore({ sendCommand });
    store.init({ windowMs: 10 } as ConfigType);

    const key = "test-store";

    const { totalHits } = await store.increment(key); // => 1

    // Ensure the hit count is 1, and the expiry is 10 milliseconds (value of
    // `windowMs`).
    expect(totalHits).toEqual(1);
    expect(Number(await client.get("rl:test-store"))).toEqual(1);
    expect(Number(await client.pttl("rl:test-store"))).toEqual(10);
  });

  it("increments the key for the store when `increment` is called", async () => {
    const store = new RedisStore({ sendCommand });
    store.init({ windowMs: 10 } as ConfigType);

    const key = "test-store";

    await store.increment(key); // => 1
    const { totalHits } = await store.increment(key); // => 2

    // Ensure the hit count is 2, and the expiry is 10 milliseconds (value of
    // `windowMs`).
    expect(totalHits).toEqual(2);
    expect(Number(await client.get("rl:test-store"))).toEqual(2);
    expect(Number(await client.pttl("rl:test-store"))).toEqual(10);
  });

  it("decrements the key for the store when `decrement` is called", async () => {
    const store = new RedisStore({ sendCommand });
    store.init({ windowMs: 10 } as ConfigType);

    const key = "test-store";

    await store.increment(key); // => 1
    await store.increment(key); // => 2
    await store.decrement(key); // => 1
    const { totalHits } = await store.increment(key); // => 2

    // Ensure the hit count is 2, and the expiry is 10 milliseconds (value of
    // `windowMs`).
    expect(totalHits).toEqual(2);
    expect(Number(await client.get("rl:test-store"))).toEqual(2);
    expect(Number(await client.pttl("rl:test-store"))).toEqual(10);
  });

  it("resets the count for a key in the store when `resetKey` is called", async () => {
    const store = new RedisStore({ sendCommand });
    store.init({ windowMs: 10 } as ConfigType);

    const key = "test-store";

    await store.increment(key); // => 1
    await store.increment(key); // => 2
    await store.resetKey(key); // => undefined

    const { totalHits } = await store.increment(key); // => 1

    // Ensure the hit count is 1, and the expiry is 10 milliseconds (value of
    // `windowMs`).
    expect(totalHits).toEqual(1);
    expect(Number(await client.get("rl:test-store"))).toEqual(1);
    expect(Number(await client.pttl("rl:test-store"))).toEqual(10);
  });

  it("fetches the count for a key in the store when `getKey` is called", async () => {
    const store = new RedisStore({ sendCommand });
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
    const store = new RedisStore({ sendCommand, resetExpiryOnChange: true });
    store.init({ windowMs: 60 } as ConfigType);

    const key = "test-store";

    await store.increment(key); // => 1

    // Ensure the hit count is 1, and the expiry is 60 milliseconds (value of
    // `windowMs`).
    expect(Number(await client.get("rl:test-store"))).toEqual(1);
    expect(Number(await client.pttl("rl:test-store"))).toEqual(60);

    await store.increment(key); // => 2

    // Ensure the hit count is 2, and the expiry is 60 milliseconds (value of
    // `windowMs`).
    expect(Number(await client.get("rl:test-store"))).toEqual(2);
    expect(Number(await client.pttl("rl:test-store"))).toEqual(60);
  });

  it("resets the count for all the keys in the store when the timeout is reached", async () => {
    const store = new RedisStore({ sendCommand });
    store.init({ windowMs: 50 } as ConfigType);

    const keyOne = "test-store-one";
    const keyTwo = "test-store-two";

    await store.increment(keyOne);
    await store.increment(keyTwo);

    vi.advanceTimersByTime(60);

    // Ensure that the keys have been deleted
    expect(await client.get("rl:test-store-one")).toEqual(null);
    expect(await client.get("rl:test-store-two")).toEqual(null);
  });

  it("default export works", async () => {
    const store = new DefaultExportRedisStore({ sendCommand });
    store.init({ windowMs: 10 } as ConfigType);

    const key = "test-store";

    const { totalHits } = await store.increment(key); // => 1

    // Ensure the hit count is 1, and the expiry is 10 milliseconds (value of
    // `windowMs`).
    expect(totalHits).toEqual(1);
    expect(Number(await client.get("rl:test-store"))).toEqual(1);
    expect(Number(await client.pttl("rl:test-store"))).toEqual(10);
  });
});
