<h1 align="center"> <code>🔥hono-rate-limiter🔥</code> </h1>

<div align="center">

[![tests](https://img.shields.io/github/actions/workflow/status/rhinobase/hono-rate-limiter/test.yml)](https://github.com/rhinobase/hono-rate-limiter/actions/workflows/test.yml)
[![npm version](https://img.shields.io/npm/v/hono-rate-limiter.svg)](https://npmjs.org/package/hono-rate-limiter "View this project on NPM")
[![npm downloads](https://img.shields.io/npm/dm/hono-rate-limiter)](https://www.npmjs.com/package/hono-rate-limiter)
[![JSR](https://jsr.io/badges/@hono-rate-limiter/hono-rate-limiter)](https://jsr.io/@hono-rate-limiter/hono-rate-limiter)
[![Bundle Size](https://img.shields.io/bundlephobia/min/hono-rate-limiter)](https://bundlephobia.com/result?p=hono-rate-limiter)
[![Bundle Size](https://img.shields.io/bundlephobia/minzip/hono-rate-limiter)](https://bundlephobia.com/result?p=hono-rate-limiter)
[![license](https://img.shields.io/npm/l/hono-rate-limiter)](LICENSE)

</div>

Rate limiting middleware for [Hono](https://hono.dev/). Use to
limit repeated requests to public APIs and/or endpoints such as password reset.

> [!NOTE]  
> The `keyGenerator` function needs to be defined for `hono-rate-limiter` to work properly in your environment. Please ensure that you define the `keyGenerator` function according to the documentation before using the library.

## Installation

```sh
# Using npm/yarn/pnpm/bun
npm add hono-rate-limiter
```

## Usage

### Rest APIs

```ts
import { rateLimiter } from "hono-rate-limiter";

// Apply the rate limiting middleware to all requests.
app.use(
  rateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes).
    standardHeaders: "draft-6", // draft-6: `RateLimit-*` headers; draft-7: combined `RateLimit` header
    keyGenerator: (c) => "<unique_key>", // Method to generate custom identifiers for clients.
    // store: ... , // Redis, MemoryStore, etc. See below.
  })
);
```

### WebSocket APIs

```ts
import { webSocketLimiter } from "hono-rate-limiter";
import { upgradeWebSocket } from "hono/cloudflare-workers";
import { RedisStore } from "@hono-rate-limiter/redis";
import { Redis } from "@upstash/redis/cloudflare";

const limiter = webSocketLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes).
  keyGenerator: (c) => "<unique_key>", // Method to generate custom identifiers for clients.
  store: new RedisStore({ client }), // Define your DataStore. See below.
});

// Apply the rate limiting middleware to ws requests.
app.get(
  "/",
  upgradeWebSocket(
    limiter((c) => {
      return {
        onOpen: () => {
          console.log("Connection opened");
        },
        async onMessage(event, ws) {
          console.log(`Message from client: ${event.data}`);
          ws.send("Hello from server!");
        },
        onClose: () => {
          console.log("Connection closed");
        },
      };
    })
  )
);
```

## Data Stores

`hono-rate-limiter` supports external data stores to synchronize hit counts across multiple processes and servers.

By default, `MemoryStore` is used. This one does not synchronize its state across instances. It’s simple to deploy, and often sufficient for basic abuse prevention, but will be inconsistent across reboots or in deployments with multiple process or servers.

Deployments requiring more consistently enforced rate limits should use an external store.

Here is a list of stores:

| Name                                                                               | Description                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| MemoryStore                                                                        | (default) Simple in-memory option. Does not share state when the app has multiple processes or servers.                                                                                                                                                                                                                                                                                                                                                 |
| [@hono-rate-limiter/redis](https://www.npm.im/@hono-rate-limiter/redis)            | A [Redis](https://redis.io/)-backed store, used with [`@vercel/kv`](https://www.npmjs.com/package/@vercel/kv) and [`@upstash/redis`](https://www.npmjs.com/package/@upstash/redis) . [![npm downloads](https://img.shields.io/npm/dm/@hono-rate-limiter/redis)](https://www.npmjs.com/package/@hono-rate-limiter/redis)                                                                                                                                 |
| [@hono-rate-limiter/cloudflare](https://www.npm.im/@hono-rate-limiter/cloudflare)  | A [Cloudflare](https://www.cloudflare.com/)-backed store, used with [Durable Object](https://developers.cloudflare.com/durable-objects/), [WorkersKV](https://developers.cloudflare.com/kv/) and [Workers Rate Limiting](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/) API. [![npm downloads](https://img.shields.io/npm/dm/@hono-rate-limiter/cloudflare)](https://www.npmjs.com/package/@hono-rate-limiter/cloudflare) |
| [rate-limit-redis](https://npm.im/rate-limit-redis)                                | A [Redis](https://redis.io/)-backed store, more suitable for large or demanding deployments.                                                                                                                                                                                                                                                                                                                                                            |
| [rate-limit-postgresql](https://www.npm.im/@acpr/rate-limit-postgresql)            | A [PostgreSQL](https://www.postgresql.org/)-backed store.                                                                                                                                                                                                                                                                                                                                                                                               |
| [rate-limit-memcached](https://npmjs.org/package/rate-limit-memcached)             | A [Memcached](https://memcached.org/)-backed store.                                                                                                                                                                                                                                                                                                                                                                                                     |
| [cluster-memory-store](https://npm.im/@express-rate-limit/cluster-memory-store)    | A memory-store wrapper that shares state across all processes on a single server via the [node:cluster](https://nodejs.org/api/cluster.html) module. Does not share state across multiple servers.                                                                                                                                                                                                                                                      |
| [precise-memory-rate-limit](https://www.npm.im/precise-memory-rate-limit)          | A memory store similar to the built-in one, except that it stores a distinct timestamp for each key.                                                                                                                                                                                                                                                                                                                                                    |
| [typeorm-rate-limit-store](https://www.npmjs.com/package/typeorm-rate-limit-store) | Supports a variety of databases via [TypeORM](https://typeorm.io/): MySQL, MariaDB, CockroachDB, SQLite, Microsoft SQL Server, Oracle, SAP Hana, and more.                                                                                                                                                                                                                                                                                              |
| [@rlimit/storage](https://www.npmjs.com/package/@rlimit/storage)                   | A distributed rlimit store, ideal for multi-regional deployments.                                                                                                                                                                                                                                                                                                                                                                                       |

Take a look at this [guide](https://express-rate-limit.mintlify.app/guides/creating-a-store) if you wish to create your own store.

## Notes

- The `keyGenerator` function determines what to limit a request on, it should represent a unique characteristic of a user or class of user that you wish to rate limit. Good choices include API keys in `Authorization` headers, URL paths or routes, specific query parameters used by your application, and/or user IDs.
- It is not recommended to use IP addresses (since these can be shared by many users in many valid cases) or locations (the same), as you may find yourself unintentionally rate limiting a wider group of users than you intended.

## Examples

- [hono-rate-limiter.vercel.app](https://hono-rate-limiter.vercel.app) - Uses Vercel KV and deployed on Vercel
- [hono-rate-limiter.rhinobase.workers.dev](https://hono-rate-limiter.rhinobase.workers.dev) - Built using Cloudflare Workers

## Troubleshooting

If the suggestions here don't work, please try posting questions on [GitHub Discussions](https://github.com/rhinobase/hono-rate-limiter/discussions) or in the #help channel of [Hono Discord](https://discord.gg/xUtamz2vxH).

### Typescript Type Issue

When working with packages that are not officially supported by `hono-rate-limiter`, you might encounter type-related issues. These can be easily resolved by referring to the discussions in [#22](https://github.com/rhinobase/hono-rate-limiter/issues/22), [#10](https://github.com/rhinobase/hono-rate-limiter/issues/10). Example -

```ts
rateLimiter({
  // ...
  store: new RedisStore({
    sendCommand: (...args: string[]) => redisClient.sendCommand(args),
  }) as unknown as Store,
});
```

### Using `hono-rate-limiter` with Cloudflare Workers or Pages

If you're trying to use `hono-rate-limiter` in a Cloudflare environment (such as Workers or Pages), you may encounter the following error:

```bash
Uncaught Error: Disallowed operation called within global scope. Asynchronous I/O (ex: fetch() or connect()), setting a timeout, and generating random values are not allowed within global scope. To fix this error, perform this operation within a handler. https://developers.cloudflare.com/workers/runtime-apis/handlers/
```

This happens because the default memory store used by `hono-rate-limiter` cannot run in the Cloudflare environment due to its restrictions on global asynchronous operations.

#### Solution

To resolve this issue, you need to use a compatible store for Cloudflare. You can use the [`@hono-rate-limiter/cloudflare`](https://www.npmjs.com/package/@hono-rate-limiter/cloudflare) package, which is specifically designed to work with Cloudflare's infrastructure.

## Contributing

We would love to have more contributors involved!

To get started, please read our [Contributing Guide](https://github.com/rhinobase/hono-rate-limiter/blob/main/CONTRIBUTING.md).

## Credits

The `hono-rate-limiter` project is heavily inspired by [express-rate-limit](https://github.com/express-rate-limit/express-rate-limit)
