<h1 align="center"> <code>🔥hono-rate-limiter🔥</code> </h1>

<div align="center">

[![tests](https://img.shields.io/github/actions/workflow/status/rhinobase/hono-rate-limiter/test.yaml)](https://github.com/rhinobase/hono-rate-limiter/actions/workflows/test.yaml)
[![npm version](https://img.shields.io/npm/v/hono-rate-limiter.svg)](https://npmjs.org/package/hono-rate-limiter "View this project on NPM")
[![npm downloads](https://img.shields.io/npm/dm/hono-rate-limiter)](https://www.npmjs.com/package/hono-rate-limiter)
[![license](https://img.shields.io/npm/l/hono-rate-limiter)](LICENSE)

</div>

Rate limiting middleware for [Hono](https://hono.dev/). Use to
limit repeated requests to public APIs and/or endpoints such as password reset.

> [!WARNING]  
> The `keyGenerator` function is currently under construction and needs to be defined for `hono-rate-limiter` to work properly in your environment. Please ensure that you define the `keyGenerator` function according to the documentation before using the library.

## Usage

```ts
import { rateLimiter } from "hono-rate-limiter";

const limiter = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes).
  standardHeaders: "draft-6", // draft-6: `RateLimit-*` headers; draft-7: combined `RateLimit` header
  keyGenerator: () => "<unique_key>", // Method to generate custom identifiers for clients.
  // store: ... , // Redis, MemoryStore, etc. See below.
});

// Apply the rate limiting middleware to all requests.
app.use(limiter);
```

# Data Stores

Express-rate-limit supports external data stores to synchronize hit counts across multiple processes and servers.

By default, `MemoryStore` is used. This one does not synchronize its state across instances. It’s simple to deploy, and often sufficient for basic abuse prevention, but will be inconnsistent across reboots or in deployments with multiple process or servers.

Deployments requiring more consistently enforced rate limits should use an external store.

Here is a list of stores:

| Name                                                                                 | Description                                                                                                                                                                                        |
| ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| MemoryStore                                                                          | (default) Simple in-memory option. Does not share state when the app has multiple processes or servers.                                                                                            |
| [`rate-limit-redis`](https://npm.im/rate-limit-redis)                                | A [Redis](https://redis.io/)-backed store, more suitable for large or demanding deployments.                                                                                                       |
| [`rate-limit-postresql`](https://www.npm.im/@acpr/rate-limit-postgresql)             | A [PostgreSQL](https://www.postgresql.org/)-backed store.                                                                                                                                          |
| [`rate-limit-memecached`](https://npmjs.org/package/rate-limit-memcached)            | A [Memcached](https://memcached.org/)-backed store.                                                                                                                                                |
| [`cluster-memory-store`](https://npm.im/@express-rate-limit/cluster-memory-store)    | A memory-store wrapper that shares state across all processes on a single server via the [node:cluster](https://nodejs.org/api/cluster.html) module. Does not share state across multiple servers. |
| [`precise-memory-rate-limit`](https://www.npm.im/precise-memory-rate-limit)          | A memory store similar to the built-in one, except that it stores a distinct timestamp for each key.                                                                                               |
| [`typeorm-rate-limit-store`](https://www.npmjs.com/package/typeorm-rate-limit-store) | Supports a variety of databases via [TypeORM](https://typeorm.io/): MySQL, MariaDB, CockroachDB, SQLite, Microsoft SQL Server, Oracle, SAP Hana, and more.                                         |
| [`@rlimit/storage`](<(https://www.npmjs.com/package/@rlimit/storage)>)               | A distributed rlimit store, ideal for multi-regional deployments.                                                                                                                                  |

Take a look at this [guide](https://express-rate-limit.mintlify.app/guides/creating-a-store) if you wish to create your own store.

# Contributing

We would love to have more contributors involved!

To get started, please read our [Contributing Guide](https://github.com/rhinobase/hono-rate-limiter/blob/main/CONTRIBUTING.md).

# Credits

The `hono-rate-limiter` project is heavily inspired by [express-rate-limit](https://github.com/express-rate-limit/express-rate-limit)
