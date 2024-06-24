import type { Store } from "../types";
import { webSocketLimiter } from "../websocket";
import { keyGenerator } from "./helpers";

// TODO: Write tests
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
});
