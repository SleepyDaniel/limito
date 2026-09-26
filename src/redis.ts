import { type BaseOptions, badCost, type Info, rate } from './options.ts'
import { SCRIPT, SHA } from './script.ts'
import type { Key } from './store.ts'

export type Send = (args: [string, ...string[]]) => Promise<unknown>

export interface RedisOptions extends BaseOptions {
  send: Send
  prefix?: string
}

export interface RedisLimiter {
  (key: Key, cost?: number): Promise<number>
  peek(key: Key, cost?: number): Promise<number>
  info(key: Key): Promise<Info>
  reset(key: Key): Promise<void>
}

export const limito = ({ send, prefix = 'limito:', ...opts }: RedisOptions): RedisLimiter => {
  const { limit, win, burst, step, lim } = rate(opts)
  const ns = `${prefix}${win}/${limit}/${burst}:`
  const s = String(step)
  const l = String(lim)

  const run = async (key: Key, cost: number, write: boolean) => {
    if (!(cost >= 0)) badCost(cost)
    const cmd: [string, ...string[]] = [
      'EVALSHA',
      SHA,
      '1',
      ns + key,
      s,
      l,
      String(cost),
      write ? '1' : '0',
    ]
    let res: unknown
    try {
      res = await send(cmd)
    } catch (e) {
      if (!String(e).includes('NOSCRIPT')) throw e
      cmd[0] = 'EVAL'
      cmd[1] = SCRIPT
      res = await send(cmd)
    }
    if (!Array.isArray(res)) throw new TypeError(`limito: unexpected reply from send: ${res}`)
    return res.map(Number) as [number, number, number]
  }

  const hit = async (key: Key, cost = 1) =>
    cost > burst ? Infinity : (await run(key, cost, true))[0]

  return Object.assign(hit, {
    peek: async (key: Key, cost = 1) =>
      cost > burst ? Infinity : (await run(key, cost, false))[0],
    info: async (key: Key): Promise<Info> => {
      const [, remaining, reset] = await run(key, 0, false)
      return { limit, remaining, reset, window: win }
    },
    reset: async (key: Key) => void (await send(['DEL', ns + key])),
  })
}
