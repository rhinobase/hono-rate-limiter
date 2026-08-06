import { afterEach, describe, expect, it, vi } from "vitest";
import { RedisStore } from "../store";
import type { RedisClient } from "../types";

/**
 * A client whose SCRIPT LOAD always fails, which is what an unreachable or
 * unhealthy Redis looks like at construction time.
 */
const failingClient = (error: Error): RedisClient => ({
  scriptLoad: vi.fn().mockRejectedValue(error),
  evalsha: vi.fn(),
  decr: vi.fn(),
  del: vi.fn(),
});

describe("redis store constructor test", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("does not leave an unhandled rejection when SCRIPT LOAD fails", async () => {
    const rejections: unknown[] = [];
    const onUnhandled = (reason: unknown) => rejections.push(reason);
    process.on("unhandledRejection", onUnhandled);

    try {
      // The constructor starts both script loads without awaiting them, and
      // `get()` is optional on the Store interface, so `getScriptSha` may never
      // be awaited by anything.
      new RedisStore({ client: failingClient(new Error("redis is down")) });

      // Give the microtask queue and one macrotask turn a chance to surface an
      // unhandled rejection.
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(rejections).toEqual([]);
    } finally {
      process.off("unhandledRejection", onUnhandled);
    }
  });

  it("still reports the original error to whoever awaits the promise", async () => {
    const error = new Error("redis is down");
    const store = new RedisStore({ client: failingClient(error) });

    // Marking the rejection as handled must not consume it. A caller awaiting
    // the promise has to see the same failure.
    await expect(store.incrementScriptSha).rejects.toThrow("redis is down");
    await expect(store.getScriptSha).rejects.toThrow("redis is down");
  });
});
