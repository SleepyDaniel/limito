# Benchmark results

## Throughput on Node 24.18.0

Apple M5 (arm64-darwin)

### hot key, allowed

| library | ops/s | avg | p99 |
| --- | ---: | ---: | ---: |
| limito | 53.6M ops/s | 18.7 ns | 21.4 ns |
| rate-limiter-flexible | 7.9M ops/s | 127.3 ns | 139.0 ns |
| express-rate-limit | 17.5M ops/s | 57.3 ns | 66.5 ns |
| limiter | 19.5M ops/s | 51.3 ns | 55.7 ns |

### hot key, blocked

| library | ops/s | avg | p99 |
| --- | ---: | ---: | ---: |
| limito | 48.4M ops/s | 20.7 ns | 37.8 ns |
| rate-limiter-flexible | 1.9M ops/s | 521.8 ns | 804.0 ns |
| express-rate-limit | 17.9M ops/s | 55.7 ns | 64.0 ns |
| limiter | 50.5M ops/s | 19.8 ns | 22.4 ns |

### 100k rotating keys

| library | ops/s | avg | p99 |
| --- | ---: | ---: | ---: |
| limito | 30.6M ops/s | 32.6 ns | 45.8 ns |
| rate-limiter-flexible | 4.5M ops/s | 221.7 ns | 368.4 ns |
| express-rate-limit | 11.9M ops/s | 83.8 ns | 156.4 ns |
| limiter | 15.7M ops/s | 63.7 ns | 117.4 ns |

## Throughput on Bun 1.4.2

Apple M5 (arm64-darwin)

### hot key, allowed

| library | ops/s | avg | p99 |
| --- | ---: | ---: | ---: |
| limito | 37.7M ops/s | 26.6 ns | 34.7 ns |
| rate-limiter-flexible | 10.1M ops/s | 99.1 ns | 144.4 ns |
| express-rate-limit | 27.4M ops/s | 36.5 ns | 41.0 ns |
| limiter | 17.9M ops/s | 55.8 ns | 62.0 ns |

### hot key, blocked

| library | ops/s | avg | p99 |
| --- | ---: | ---: | ---: |
| limito | 35.4M ops/s | 28.3 ns | 31.6 ns |
| rate-limiter-flexible | 4.8M ops/s | 209.8 ns | 267.4 ns |
| express-rate-limit | 27.4M ops/s | 36.5 ns | 41.2 ns |
| limiter | 34.5M ops/s | 28.9 ns | 32.6 ns |

### 100k rotating keys

| library | ops/s | avg | p99 |
| --- | ---: | ---: | ---: |
| limito | 35.0M ops/s | 28.6 ns | 33.7 ns |
| rate-limiter-flexible | 7.1M ops/s | 140.9 ns | 214.9 ns |
| express-rate-limit | 21.6M ops/s | 46.3 ns | 59.2 ns |
| limiter | 19.3M ops/s | 51.8 ns | 72.1 ns |

## Memory

Heap + ArrayBuffers after 1,000,000 unique keys on Node 24.18.0.

| library | bytes / key |
| --- | ---: |
| limito | 29.9 |
| rate-limiter-flexible | 405.3 |
| express-rate-limit | 157.4 |
| limiter | 261.5 |

## Bundle size

Bundled with rolldown, minified, Node built-ins external.

| library | min | gzip | brotli |
| --- | ---: | ---: | ---: |
| limito | 1.6 KB | 897 B | 814 B |
| rate-limiter-flexible | 7.6 KB | 2.3 KB | 2.1 KB |
| express-rate-limit | 42.4 KB | 12.8 KB | 11.4 KB |
| limiter | 4.2 KB | 1.3 KB | 1.2 KB |

## Versions

| library | version |
| --- | --- |
| limito | 0.0.0 |
| rate-limiter-flexible | 11.2.1 |
| express-rate-limit | 8.7.0 |
| limiter | 4.1.0 |
