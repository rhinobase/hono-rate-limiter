<h1 align="center"> <code>🔥hono-rate-limiter🔥</code> </h1>

<div align="center">

[![tests](https://img.shields.io/github/actions/workflow/status/rhinobase/hono-rate-limiter/test.yaml)](https://github.com/rhinobase/hono-rate-limiter/actions/workflows/test.yaml)
[![npm version](https://img.shields.io/npm/v/hono-rate-limiter.svg)](https://npmjs.org/package/hono-rate-limiter "View this project on NPM")
[![npm downloads](https://img.shields.io/npm/dm/hono-rate-limiter)](https://www.npmjs.com/package/hono-rate-limiter)
[![license](https://img.shields.io/npm/l/hono-rate-limiter)](LICENSE)

</div>

Rate limiting middleware for [Hono](https://hono.dev/). Use to
limit repeated requests to public APIs and/or endpoints such as password reset.

## Usage

```ts
import { rateLimiter } from "hono-rate-limiter";

const limiter = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes).
  standardHeaders: "draft-7", // draft-6: `RateLimit-*` headers; draft-7: combined `RateLimit` header
  // store: ... , // Redis, MemoryStore, etc. See below.
});

// Apply the rate limiting middleware to all requests.
app.use(limiter);
```

# Data Stores

Express-rate-limit supports external data stores to sychronize hit counts across multiple processes and servers.

By default, `MemoryStore` is used. This one does not synchronize it’s state across instances. It’s simple to deploy, and often sufficient for basic abuse prevention, but will be inconnsistent across reboots or in deployments with multiple process or servers.

Deployments requiring more consistently enforced rate limits should use an external store.

Here is a list of stores:

| Name        | Description                                                                                         |
| ----------- | --------------------------------------------------------------------------------------------------- |
| MemoryStore | (default) Simple in-memory option. Does not share state when app has multiple processes or servers. |
| RedisStore  | A [Redis](https://redis.io/)-backed store, more suitable for large or demanding deployments.        |

Take a look at this [guide](https://express-rate-limit.mintlify.app/guides/creating-a-store) if you wish to create your own store.

# Contributing

We would love to have more contributors involved!

To get started, please read our [Contributing Guide](https://github.com/rhinobase/hono-rate-limiter/blob/main/CONTRIBUTING.md).

# Credits

The `hono-rate-limiter` project is heavily inspired by [express-rate-limit](https://github.com/express-rate-limit/express-rate-limit)
