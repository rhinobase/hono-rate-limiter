# Changelog
## 0.5.4

### Bug Fixes 🐛

- (websocket) Only skip counting on the real message outcome by @MathurAditya724 in [#69](https://github.com/rhinobase/hono-rate-limiter/pull/69)
- Guard RedisStore.decrement against going below zero by @MathurAditya724 in [#67](https://github.com/rhinobase/hono-rate-limiter/pull/67)
- Handle SCRIPT LOAD rejection in RedisStore constructor by @jcross in [#65](https://github.com/rhinobase/hono-rate-limiter/pull/65)

### Documentation 📚

- Warn that UnstorageStore is not concurrency-safe by @MathurAditya724 in [#68](https://github.com/rhinobase/hono-rate-limiter/pull/68)
- Fix 'succesful' typo in JSDoc in [#63](https://github.com/rhinobase/hono-rate-limiter/pull/63)

### Internal Changes 🔧

- Add craft release system by @MathurAditya724 in [#66](https://github.com/rhinobase/hono-rate-limiter/pull/66)

