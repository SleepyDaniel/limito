# Benchmark results

## Throughput on Node 24.18.0

Apple M5 (arm64-darwin)

### hot key, allowed

| library | ops/s | avg | p99 |
| --- | ---: | ---: | ---: |
| limito | 51.9M ops/s | 19.3 ns | 22.2 ns |
| rate-limiter-flexible | 7.6M ops/s | 131.4 ns | 149.3 ns |
| express-rate-limit | 18.3M ops/s | 54.7 ns | 63.8 ns |
| limiter | 19.3M ops/s | 51.8 ns | 80.4 ns |

### hot key, blocked

| library | ops/s | avg | p99 |
| --- | ---: | ---: | ---: |
| limito | 46.0M ops/s | 21.7 ns | 25.4 ns |
| rate-limiter-flexible | 1.9M ops/s | 525.8 ns | 638.3 ns |
| express-rate-limit | 17.4M ops/s | 57.5 ns | 67.1 ns |
| limiter | 50.0M ops/s | 20.0 ns | 22.7 ns |

### 100k rotating keys

| library | ops/s | avg | p99 |
| --- | ---: | ---: | ---: |
| limito | 28.7M ops/s | 34.9 ns | 52.7 ns |
| rate-limiter-flexible | 4.6M ops/s | 215.7 ns | 376.2 ns |
| express-rate-limit | 11.3M ops/s | 88.2 ns | 207.1 ns |
| limiter | 14.7M ops/s | 68.2 ns | 187.2 ns |

## Throughput on Bun 1.4.2

Apple M5 (arm64-darwin)

### hot key, allowed

| library | ops/s | avg | p99 |
| --- | ---: | ---: | ---: |
| limito | 36.8M ops/s | 27.2 ns | 30.9 ns |
| rate-limiter-flexible | 10.1M ops/s | 99.5 ns | 151.0 ns |
| express-rate-limit | 27.1M ops/s | 36.9 ns | 40.9 ns |
| limiter | 17.7M ops/s | 56.5 ns | 61.5 ns |

### hot key, blocked

| library | ops/s | avg | p99 |
| --- | ---: | ---: | ---: |
| limito | 34.9M ops/s | 28.7 ns | 33.0 ns |
| rate-limiter-flexible | 4.7M ops/s | 212.3 ns | 270.7 ns |
| express-rate-limit | 27.3M ops/s | 36.6 ns | 41.2 ns |
| limiter | 34.4M ops/s | 29.1 ns | 32.2 ns |

### 100k rotating keys

| library | ops/s | avg | p99 |
| --- | ---: | ---: | ---: |
| limito | 34.5M ops/s | 29.0 ns | 33.6 ns |
| rate-limiter-flexible | 7.2M ops/s | 138.3 ns | 220.7 ns |
| express-rate-limit | 21.3M ops/s | 47.0 ns | 58.2 ns |
| limiter | 16.7M ops/s | 59.9 ns | 67.5 ns |

## Memory

Heap + ArrayBuffers per unique key on Node 24.18.0, not counting the key strings.

| library | 100k keys | 300k keys | 1M keys |
| --- | ---: | ---: | ---: |
| limito | 47.6 | 63.0 | 37.8 |
| rate-limiter-flexible | 421.6 | 433.2 | 413.4 |
| express-rate-limit | 172.8 | 185.0 | 165.4 |
| limiter | 278.2 | 289.4 | 269.5 |

## Bundle size

Bundled with rolldown, minified, Node built-ins external.

| library | min | gzip | brotli |
| --- | ---: | ---: | ---: |
| limito | 2.0 KB | 1016 B | 943 B |
| rate-limiter-flexible | 7.6 KB | 2.3 KB | 2.1 KB |
| express-rate-limit | 42.4 KB | 12.8 KB | 11.4 KB |
| limiter | 4.2 KB | 1.3 KB | 1.2 KB |

## Versions

| library | version |
| --- | --- |
| limito | 0.1.0 |
| rate-limiter-flexible | 11.2.1 |
| express-rate-limit | 8.7.0 |
| limiter | 4.1.0 |
