import { type BaseOptions, type Info, type Key, rate, waitFor } from './options.ts'
import { SCRIPT, SHA } from './script.ts'

export type Send = (args: [string, ...string[]]) => Promise<unknown>

export interface RedisOptions extends BaseOptions {
  send: Send
  prefix?: string
}

export interface RedisLimiter {
  (key: Key, cost?: number): Promise<number>
  peek(key: Key, cost?: number): Promise<number>
  wait(key: Key, cost?: number): Promise<void>
  info(key: Key): Promise<Info>
  reset(key: Key): Promise<void>
}

export const limito = ({ send, prefix = 'limito:', ...opts }: RedisOptions): RedisLimiter => {
  const { limit, win, burst, step, lim } = rate(opts)
  const ns = `${prefix}${win}/${limit}/${burst}:`
  const s = String(step)
  const l = String(lim)

  const run = async (key: Key, cost: number, mode: string) => {
    if (!(cost >= 0)) throw new RangeError(`limito: bad cost ${cost}`)
    if (typeof key !== 'string' && typeof key !== 'number') {
      throw new TypeError('limito: key must be a string or number')
    }
    const cmd: [string, ...string[]] = ['EVALSHA', SHA, '1', ns + key, s, l, String(cost), mode]
    let res: unknown
    try {
      res = await send(cmd)
    } catch (e) {
      if (!String(e).includes('NOSCRIPT')) throw e
      cmd[0] = 'EVAL'
      cmd[1] = SCRIPT
      res = await send(cmd)
    }
    if (!Array.isArray(res)) throw new TypeError(`limito: bad reply from send: ${res}`)
    return res.map(Number) as [number, number, number]
  }

  const take = async (key: Key, cost: number, mode: string) =>
    cost > burst ? Infinity : (await run(key, cost, mode))[0]

  return Object.assign((key: Key, cost = 1) => take(key, cost, '1'), {
    peek: (key: Key, cost = 1) => take(key, cost, '0'),
    wait: async (key: Key, cost = 1) => waitFor(take(key, cost, '2')),
    info: async (key: Key): Promise<Info> => {
      const [, remaining, reset] = await run(key, 0, '0')
      return { limit, remaining, reset, window: win }
    },
    reset: async (key: Key) => void (await send(['DEL', ns + key])),
  })
}
