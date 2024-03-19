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
};

// Export them so we can use them in the `lib.ts` file.
export default scripts;
