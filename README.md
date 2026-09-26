<p align="center">
    <img src="./.github/assets/banner.png" alt="limito banner">
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/limito"><img alt="npm" src="https://shieldcn.dev/npm/limito.svg" /></a>
  <a href="https://github.com/SleepyDaniel/limito"><img alt="stars" src="https://shieldcn.dev/github/SleepyDaniel/limito/stars.svg" /></a>
  <a href="https://www.npmjs.com/package/limito"><img alt="downloads" src="https://shieldcn.dev/npm/dm/limito.svg" /></a>
  <a href="https://github.com/SleepyDaniel/limito/releases"><img alt="release" src="https://shieldcn.dev/github/SleepyDaniel/limito/release.svg" /></a>
</p>

<h1 align="center">limito</h1>

Rate limiter for JavaScript. It's under 1 KB, has zero dependencies and works on Node, Bun, Deno, Cloudflare Workers and in the browser.

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./bench/results/ops-node.dark.svg">
  <img alt="Throughput on Node 24" src="./bench/results/ops-node.svg">
</picture>

## Why limito

- **Fast:** 2-3x faster than limiter and express-rate-limit, around 7x faster than rate-limiter-flexible. See the [benchmarks](./bench/results/README.md).
- **Tiny:** 814 bytes minified and brotlied.
- **Light on memory:** ~30 bytes per key, 5 to 13 times less than the others.
- **Nothing for the GC:** checking a known key doesn't allocate, you just get a number back.
- **No timers:** nothing runs in the background, old keys are cleaned up when new ones come in.
- **GCRA:** smooth limits with burst support and no spikes at window edges.
- **Standard headers:** `headers()` builds `RateLimit`, `RateLimit-Policy` and `Retry-After` for you.

## Install

```sh
bun add limito
```

```sh
npm i limito
```

## Usage

```ts
import { limito } from 'limito'

const rl = limito({ limit: 100, window: '1m' })

const wait = rl('user:42')
if (wait) console.log(`try again in ${wait}ms`)
```

`rl(key)` returns `0` if the request is allowed, otherwise how many ms until it would be.

### Hono

```ts
import { Hono } from 'hono'
import { headers, limito } from 'limito'

const app = new Hono()
const rl = limito({ limit: 100, window: '1m' })

app.use(async (c, next) => {
  const ip = c.req.header('x-forwarded-for') ?? 'anon'
  const wait = rl(ip)
  if (wait) return c.text('Too many requests', 429, headers(rl.info(ip), wait))
  await next()
})
```

### Express

```ts
import express from 'express'
import { headers, limito } from 'limito'

const app = express()
const rl = limito({ limit: 100, window: '1m' })

app.use((req, res, next) => {
  const ip = req.ip ?? 'anon'
  const wait = rl(ip)
  if (!wait) return next()
  res.set(headers(rl.info(ip), wait)).status(429).send('Too many requests')
})
```

### Burst and cost

```ts
const rl = limito({ limit: 10, window: '1s', burst: 1 })

rl('user:42')
rl('upload:42', 5)
```

`burst` is how many requests can go through back to back. It defaults to `limit`. With `burst: 1` requests get spaced out evenly, one every 100ms in the example above. `cost` makes one call count as several.

## API

### `limito(options)`

| option | type | default | |
| --- | --- | --- | --- |
| `limit` | `number` | | requests per window |
| `window` | `number \| '500ms' \| '10s' \| '1m' \| '1h' \| '1d'` | | numbers are ms |
| `burst` | `number` | `limit` | requests allowed back to back |
| `max` | `number` | `1_000_000` | max keys kept, oldest get dropped past this |

Keys can be strings or numbers.

| method | returns | |
| --- | --- | --- |
| `rl(key, cost = 1)` | `number` | `0` if allowed, else ms to wait. `Infinity` if `cost` is bigger than `burst` |
| `rl.peek(key, cost = 1)` | `number` | same as `rl()` but doesn't count the request |
| `rl.info(key)` | `{ limit, remaining, reset, window }` | `reset` is ms until the key is fully refilled |
| `rl.reset(key)` | `void` | forget one key |
| `rl.clear()` | `void` | forget all keys |
| `rl.size` | `number` | keys currently tracked |

### `headers(info, wait?)`

Turns `rl.info()` into headers from [draft-ietf-httpapi-ratelimit-headers](https://datatracker.ietf.org/doc/draft-ietf-httpapi-ratelimit-headers/). `Retry-After` is only added when you pass `wait`.

```ts
headers(rl.info(ip), wait)
// { 'ratelimit-policy': '"default";q=100;w=60', ratelimit: '"default";r=0;t=60', 'retry-after': '1' }
```

## How it works

Instead of counting requests, GCRA (generic cell rate algorithm) stores one timestamp per key: the time when that key will have its full allowance back. Every request moves it forward by `window / limit`. If that pushes it more than `burst` steps past now, the request is rejected and the difference is how long to wait.

Keys go in a `Map` that points to a slot in a `Float64Array`. The slot numbers are small ints, which V8 doesn't box, and the timestamps live in the typed array, so updating a key doesn't allocate. When the array fills up, or once per burst window, limito rebuilds it: expired keys are dropped, the array grows or shrinks, and if there are more than `max` keys the oldest ones go.

## Benchmarks

Run on an Apple M5 with Node 24.18 and Bun 1.4.2. All the tables are in [bench/results](./bench/results/README.md).

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./bench/results/memory.dark.svg">
  <img alt="Memory per key" src="./bench/results/memory.svg">
</picture>

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./bench/results/size.dark.svg">
  <img alt="Bundle size" src="./bench/results/size.svg">
</picture>

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./bench/results/ops-bun.dark.svg">
  <img alt="Throughput on Bun" src="./bench/results/ops-bun.svg">
</picture>

All libraries use their in-memory store with the same limit and window. rate-limiter-flexible and express-rate-limit return promises, so that cost is included. rate-limiter-flexible is bundled from `lib/RateLimiterMemory.js`, its smallest import. limiter doesn't support keys, so it's a `Map` of `RateLimiter`s.

To run them yourself:

```sh
bun run bench
```

## Star History

<a href="https://star-history.com/#SleepyDaniel/limito&Date">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=SleepyDaniel/limito&type=Date&theme=dark" />
    <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/svg?repos=SleepyDaniel/limito&type=Date" />
    <img alt="Star History Chart" src="https://api.star-history.com/svg?repos=SleepyDaniel/limito&type=Date" />
  </picture>
</a>

## License

MIT © 2026 SleepyDaniel
