# <div align="center"> `@hono-rate-limiter/redis` </div>

<div align="center">

[![tests](https://img.shields.io/github/actions/workflow/status/rhinobase/hono-rate-limiter/test.yaml)](https://github.com/rhinobase/hono-rate-limiter/actions/workflows/test.yaml)
[![npm version](https://img.shields.io/npm/v/@hono-rate-limiter/redis.svg)](https://npmjs.org/package/@hono-rate-limiter/redis "View this project on NPM")
[![npm downloads](https://img.shields.io/npm/dm/@hono-rate-limiter/redis)](https://www.npmjs.com/package/@hono-rate-limiter/redis)
[![license](https://img.shields.io/npm/l/@hono-rate-limiter/redis)](LICENSE)

</div>

<br>

<div align="center">

A [`redis`](https://github.com/redis/redis) store for the
[`hono-rate-limiter`](https://github.com/rhinobase/hono-rate-limiter)
middleware.

</div>

## Installation

```sh
# Using npm/yarn/pnpm
npm add @hono-rate-limiter/redis
```

## Usage

### Examples

To use it with a [`@vercel/kv`](https://github.com/redis/node-redis) client:

```ts
import { RedisStore } from "@hono-rate-limiter/redis";
import { kv } from "@vercel/kv";
import { rateLimiter } from "hono-rate-limiter";

const limiter = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes).
  standardHeaders: "draft-6", // draft-6: `RateLimit-*` headers; draft-7: combined `RateLimit` header
  keyGenerator: (c) => c.req.header("cf-connecting-ip") ?? "", // Method to generate custom identifiers for clients.
  store: new RedisStore({ client: kv }), // Redis, MemoryStore, etc. See below.
});

// Apply the rate limiting middleware to all requests.
app.use(limiter);
```

### Configuration

#### `client`

The function used to send commands to Redis. The function signature is as
follows:

```ts
export type RedisClient = {
  scriptLoad: (script: string) => Promise<string>;
  evalsha: <TArgs extends unknown[], TData = unknown>(sha1: string, keys: string[], args: TArgs) => Promise<TData>;
  decr: (key: string) => Promise<number>;
  del: (key: string) => Promise<number>;
};
```

#### Examples

[`@vercel/kv`](https://github.com/@vercel/kv)

```ts
import { kv } from "@vercel/kv";

const store = new RedisStore({ client: kv });
```

[`@upstash/redis`](https://github.com/@upstash/redis)

```ts
import { Redis } from "@upstash/redis"

const redis = new Redis({
url: <UPSTASH_REDIS_REST_URL>,
token: <UPSTASH_REDIS_REST_TOKEN>,
})

const store = new RedisStore({ client: redis })
```

#### `prefix`

The text to prepend to the key in Redis.

Defaults to `hrl`.

#### `resetExpiryOnChange`

Whether to reset the expiry for a particular key whenever its hit count changes.

Defaults to `false`.

## Contributing

We would love to have more contributors involved!

To get started, please read our [Contributing Guide](https://github.com/rhinobase/hono-rate-limiter/blob/main/CONTRIBUTING.md).

## Credits

The `@hono-rate-limiter/redis` project is heavily inspired by [rate-limit-redis](https://github.com/express-rate-limit/rate-limit-redis)
