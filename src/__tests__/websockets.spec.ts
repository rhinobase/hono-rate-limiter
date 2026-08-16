import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Store } from "../types";
import { webSocketLimiter } from "../websocket";
import { createWsServer, keyGenerator } from "./helpers";

describe("websockets middleware test", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  class MockStore implements Store {
    initWasCalled = false;
    incrementWasCalled = false;
    decrementWasCalled = false;
    resetKeyWasCalled = false;
    getWasCalled = false;
    resetAllWasCalled = false;

    counter = 0;

    init(): void {
      this.initWasCalled = true;
    }

    async get() {
      this.getWasCalled = true;

      return { totalHits: this.counter, resetTime: undefined };
    }

    async increment() {
      this.counter += 1;
      this.incrementWasCalled = true;

      return { totalHits: this.counter, resetTime: undefined };
    }

    async decrement() {
      this.counter -= 1;
      this.decrementWasCalled = true;
    }

    async resetKey() {
      this.resetKeyWasCalled = true;
    }

    async resetAll() {
      this.resetAllWasCalled = true;
    }
  }

  it("should not modify the options object passed", () => {
    const options = {};
    webSocketLimiter(options);
    expect(options).toStrictEqual({});
  });

  it("should call `init` even if no requests have come in", async () => {
    const store = new MockStore();
    webSocketLimiter({ keyGenerator, store });

    expect(store.initWasCalled).toEqual(true);
  });

  it("should integrate with the server", async () => {
    createWsServer({
      middleware: webSocketLimiter({ keyGenerator, limit: 2 }),
    });
  });

  // Helper that builds the `onMessage`/`onError` handlers the limiter wraps a
  // connection with, so the decrement behaviour can be exercised without a
  // real socket.
  async function buildEvents(
    config: Parameters<typeof webSocketLimiter>[0],
    userEvents: {
      onMessage?: (event: unknown, ws: unknown) => unknown;
      onError?: (event: unknown, ws: unknown) => unknown;
    } = {},
  ) {
    const middleware = webSocketLimiter(config);
    const factory = middleware(() => userEvents as never);
    return factory({ set: () => {} } as never);
  }

  const ws = {} as never;

  it("does not decrement on a successful message when `skipSuccessfulRequests` is false", async () => {
    const store = new MockStore();
    const events = await buildEvents(
      { keyGenerator, store, limit: 5 },
      { onMessage: () => {} },
    );

    await events.onMessage?.({} as never, ws);

    expect(store.counter).toEqual(1);
    expect(store.decrementWasCalled).toEqual(false);
  });

  it("decrements on a successful message when `skipSuccessfulRequests` is true", async () => {
    const store = new MockStore();
    const events = await buildEvents(
      { keyGenerator, store, limit: 5, skipSuccessfulRequests: true },
      { onMessage: () => {} },
    );

    await events.onMessage?.({} as never, ws);

    expect(store.decrementWasCalled).toEqual(true);
    expect(store.counter).toEqual(0);
  });

  it("does not decrement a failed message when `skipSuccessfulRequests` is true", async () => {
    const store = new MockStore();
    const events = await buildEvents(
      { keyGenerator, store, limit: 5, skipSuccessfulRequests: true },
      {
        onMessage: () => {
          throw new Error("boom");
        },
      },
    );

    await expect(events.onMessage?.({} as never, ws)).rejects.toThrow("boom");

    // The message failed, so a `skipSuccessfulRequests` limiter must keep the
    // hit counted.
    expect(store.decrementWasCalled).toEqual(false);
    expect(store.counter).toEqual(1);
  });

  it("decrements a failed message when `skipFailedRequests` is true", async () => {
    const store = new MockStore();
    const events = await buildEvents(
      { keyGenerator, store, limit: 5, skipFailedRequests: true },
      {
        onMessage: () => {
          throw new Error("boom");
        },
      },
    );

    await expect(events.onMessage?.({} as never, ws)).rejects.toThrow("boom");

    expect(store.decrementWasCalled).toEqual(true);
    expect(store.counter).toEqual(0);
  });

  it("does not decrement a successful message when `skipFailedRequests` is true", async () => {
    const store = new MockStore();
    const events = await buildEvents(
      { keyGenerator, store, limit: 5, skipFailedRequests: true },
      { onMessage: () => {} },
    );

    await events.onMessage?.({} as never, ws);

    expect(store.decrementWasCalled).toEqual(false);
    expect(store.counter).toEqual(1);
  });

  it("does not decrement when the client is over the limit", async () => {
    const store = new MockStore();
    // Push the counter over the limit before the message under test.
    store.counter = 5;
    const events = await buildEvents(
      {
        keyGenerator,
        store,
        limit: 5,
        skipSuccessfulRequests: true,
        handler: () => {},
      },
      { onMessage: () => {} },
    );

    await events.onMessage?.({} as never, ws);

    // The 6th hit is rejected (increment => 6 > 5). It never ran the handler,
    // so it must not be decremented back.
    expect(store.decrementWasCalled).toEqual(false);
    expect(store.counter).toEqual(6);
  });

  it("does not decrement again in `onError` after a failed message already did", async () => {
    const store = new MockStore();
    const events = await buildEvents(
      { keyGenerator, store, limit: 5, skipFailedRequests: true },
      {
        onMessage: () => {
          throw new Error("boom");
        },
      },
    );

    await expect(events.onMessage?.({} as never, ws)).rejects.toThrow("boom");
    // A transport error surfacing afterwards must not decrement a second time.
    await events.onError?.({} as never, ws);

    expect(store.counter).toEqual(0);
  });
});
