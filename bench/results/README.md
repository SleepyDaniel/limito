# Benchmark results

## Throughput on Node 24.18.0

Apple M5 (arm64-darwin)

### hot key, allowed

| library | ops/s | avg | p99 |
| --- | ---: | ---: | ---: |
| limito | 52.3M ops/s | 19.1 ns | 22.2 ns |
| rate-limiter-flexible | 7.8M ops/s | 127.5 ns | 143.2 ns |
| express-rate-limit | 19.2M ops/s | 52.1 ns | 61.8 ns |
| limiter | 19.8M ops/s | 50.5 ns | 56.3 ns |

### hot key, blocked

| library | ops/s | avg | p99 |
| --- | ---: | ---: | ---: |
| limito | 47.4M ops/s | 21.1 ns | 24.3 ns |
| rate-limiter-flexible | 1.9M ops/s | 519.2 ns | 747.2 ns |
| express-rate-limit | 18.3M ops/s | 54.8 ns | 64.6 ns |
| limiter | 49.7M ops/s | 20.1 ns | 30.9 ns |

### 100k rotating keys

| library | ops/s | avg | p99 |
| --- | ---: | ---: | ---: |
| limito | 28.3M ops/s | 35.4 ns | 88.9 ns |
| rate-limiter-flexible | 4.6M ops/s | 218.0 ns | 376.3 ns |
| express-rate-limit | 12.2M ops/s | 82.0 ns | 156.6 ns |
| limiter | 15.2M ops/s | 65.6 ns | 118.2 ns |

## Throughput on Bun 1.4.2

Apple M5 (arm64-darwin)

### hot key, allowed

| library | ops/s | avg | p99 |
| --- | ---: | ---: | ---: |
| limito | 37.5M ops/s | 26.7 ns | 29.8 ns |
| rate-limiter-flexible | 10.1M ops/s | 98.9 ns | 141.6 ns |
| express-rate-limit | 29.3M ops/s | 34.1 ns | 38.1 ns |
| limiter | 18.0M ops/s | 55.6 ns | 60.5 ns |

### hot key, blocked

| library | ops/s | avg | p99 |
| --- | ---: | ---: | ---: |
| limito | 35.4M ops/s | 28.2 ns | 31.9 ns |
| rate-limiter-flexible | 4.8M ops/s | 208.8 ns | 269.2 ns |
| express-rate-limit | 27.4M ops/s | 36.5 ns | 41.0 ns |
| limiter | 34.6M ops/s | 28.9 ns | 31.5 ns |

### 100k rotating keys

| library | ops/s | avg | p99 |
| --- | ---: | ---: | ---: |
| limito | 34.1M ops/s | 29.3 ns | 33.4 ns |
| rate-limiter-flexible | 7.0M ops/s | 143.0 ns | 300.5 ns |
| express-rate-limit | 25.2M ops/s | 39.7 ns | 49.9 ns |
| limiter | 17.0M ops/s | 58.9 ns | 66.7 ns |

## Memory

Heap + ArrayBuffers per unique key on Node 24.18.0, not counting the key strings.

| library | 100k keys | 300k keys | 1M keys |
| --- | ---: | ---: | ---: |
| limito | 47.6 | 63.0 | 37.8 |
| rate-limiter-flexible | 421.5 | 433.2 | 413.5 |
| express-rate-limit | 172.8 | 185.0 | 165.4 |
| limiter | 278.2 | 289.4 | 269.5 |

## Bundle size

Bundled with rolldown, minified, annotation comments stripped (same as size-limit), Node built-ins external.

| library | min | gzip | brotli |
| --- | ---: | ---: | ---: |
| limito | 2.0 KB | 1.1 KB | 994 B |
| rate-limiter-flexible | 7.4 KB | 2.3 KB | 2.0 KB |
| express-rate-limit | 42.0 KB | 12.8 KB | 11.3 KB |
| limiter | 4.1 KB | 1.3 KB | 1.2 KB |

## Versions

| library | version |
| --- | --- |
| limito | 0.3.0 |
| rate-limiter-flexible | 11.2.1 |
| express-rate-limit | 8.7.0 |
| limiter | 4.1.0 |
