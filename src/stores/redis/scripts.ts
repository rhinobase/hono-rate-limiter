// The lua scripts for the increment and get operations.

/**
 * The lua scripts, used to make consecutive queries on the same key and avoid
 * race conditions by doing all the work on the redis server.
 */
const scripts = {
  increment: `
      local totalHits = redis.call("INCR", KEYS[1])
      local timeToExpire = redis.call("PTTL", KEYS[1])
      if timeToExpire <= 0 or ARGV[1] == "1"
      then
        redis.call("PEXPIRE", KEYS[1], tonumber(ARGV[2]))
        timeToExpire = tonumber(ARGV[2])
      end

      return { totalHits, timeToExpire }
		`
    // Ensure that code changes that affect whitespace do not affect
    // the script contents.
    .replaceAll(/^\s+/gm, "")
    .trim(),
  get: `
      local totalHits = redis.call("GET", KEYS[1])
      local timeToExpire = redis.call("PTTL", KEYS[1])

      return { totalHits, timeToExpire }
		`
    .replaceAll(/^\s+/gm, "")
    .trim(),
  // Mirrors the `MemoryStore` behaviour: never go below zero, and never
  // disturb the expiry. A raw DECR on a missing key (e.g. the window expired
  // while a slow handler ran) would create it at -1 with no TTL, and that
  // negative value would leak into the next window, letting a client exceed
  // the configured limit. Reading the value first and only decrementing when
  // it is a positive number avoids that. A nil GET means the window already
  // ended, so the correct action is to do nothing.
  decrement: `
      local current = tonumber(redis.call("GET", KEYS[1]))
      if current and current > 0 then
        redis.call("DECR", KEYS[1])
      end
		`
    .replaceAll(/^\s+/gm, "")
    .trim(),
};

// Export them so we can use them in the `lib.ts` file.
export default scripts;
