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
  // store: ... , // Redis, Memcached, etc. See below.
});

// Apply the rate limiting middleware to all requests.
app.use(limiter);
```

# Contributing

We would love to have more contributors involved!

To get started, please read our [Contributing Guide](https://github.com/rhinobase/hono-rate-limiter/blob/main/CONTRIBUTING.md).

# Credits

The `hono-rate-limiter` project is heavily inspired by [express-rate-limit](https://github.com/express-rate-limit/express-rate-limit)
