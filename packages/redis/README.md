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

To use it with a [`node-redis`](https://github.com/redis/node-redis) client:

```ts
import { rateLimit } from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import { createClient } from "redis";

// Create a `node-redis` client
const client = createClient({
  // ... (see https://github.com/redis/node-redis/blob/master/docs/client-configuration.md)
});
// Then connect to the Redis server
await client.connect();

// Create and use the rate limiter
const limiter = rateLimit({
  // Rate limiter configuration
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers

  // Redis store configuration
  store: new RedisStore({
    sendCommand: (...args: string[]) => client.sendCommand(args),
  }),
});
app.use(limiter);
```

To use it with a [`ioredis`](https://github.com/luin/ioredis) client:

```ts
import { rateLimit } from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import RedisClient from "ioredis";

// Create a `ioredis` client
const client = new RedisClient();
// ... (see https://github.com/luin/ioredis#connect-to-redis)

// Create and use the rate limiter
const limiter = rateLimit({
  // Rate limiter configuration
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers

  // Redis store configuration
  store: new RedisStore({
    sendCommand: (command: string, ...args: string[]) => client.send_command(command, ...args),
  }),
});
app.use(limiter);
```

### Configuration

#### `sendCommand`

The function used to send commands to Redis. The function signature is as
follows:

```ts
(...args: string[]) => Promise<number> | number;
```

The raw command sending function varies from library to library; some are given
below:

| Library                                                            | Function                                                                              |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| [`node-redis`](https://github.com/redis/node-redis)                | `async (...args: string[]) => client.sendCommand(args)`                               |
| [`ioredis`](https://github.com/luin/ioredis)                       | `async (command: string, ...args: string[]) => client.send_command(command, ...args)` |
| [`handy-redis`](https://github.com/mmkal/handy-redis)              | `async (...args: string[]) => client.nodeRedis.sendCommand(args)`                     |
| [`tedis`](https://github.com/silkjs/tedis)                         | `async (...args: string[]) => client.command(...args)`                                |
| [`redis-fast-driver`](https://github.com/h0x91b/redis-fast-driver) | `async (...args: string[]) => client.rawCallAsync(args)`                              |
| [`yoredis`](https://github.com/djanowski/yoredis)                  | `async (...args: string[]) => (await client.callMany([args]))[0]`                     |
| [`noderis`](https://github.com/wallneradam/noderis)                | `async (...args: string[]) => client.callRedis(...args)`                              |

#### `prefix`

The text to prepend to the key in Redis.

Defaults to `rl:`.

#### `resetExpiryOnChange`

Whether to reset the expiry for a particular key whenever its hit count changes.

Defaults to `false`.
