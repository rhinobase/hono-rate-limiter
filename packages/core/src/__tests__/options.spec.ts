import { rateLimiter } from "../core";
import type { ClientRateLimitInfo, ConfigType, Store } from "../types";

describe("options test", () => {
  it("should not allow the use of an invalid store", async () => {
    class InvalidStore {
      invalid = true;
    }

    expect(() => {
      rateLimiter({
        // @ts-expect-error Check if the library can detect invalid stores without TSC's help
        store: new InvalidStore(),
      });
    }).toThrowError(/store/);
  });

  it("should not call `init` if it is not a function", async () => {
    class InvalidStore implements Store {
      options!: ConfigType;

      // @ts-expect-error Check if the library can detect invalid stores without TSC's help
      init = "not-a-function";

      async increment(): Promise<ClientRateLimitInfo> {
        return { totalHits: 1, resetTime: undefined };
      }

      async decrement(): Promise<void> {
        return undefined;
      }

      async resetKey(): Promise<void> {
        return undefined;
      }
    }

    expect(() => {
      rateLimiter({
        // @ts-expect-error Check if the library can detect invalid stores without TSC's help
        store: new InvalidStore(),
      });
    }).not.toThrowError(/store/);
  });
});
