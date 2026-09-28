import { headers } from './headers.ts'
import type { Info, Key } from './options.ts'

export interface AnyLimiter {
  (key: Key): number | Promise<number>
  info(key: Key): Info | Promise<Info>
}

export type KeyFn<T> = (x: T) => Key | undefined | Promise<Key | undefined>

export const check = async (
  rl: AnyLimiter,
  k: ReturnType<KeyFn<unknown>>,
): Promise<Record<string, string> | undefined> => {
  const key = typeof k === 'object' ? await k : k
  if (key === undefined) throw new TypeError('limito: no key for this request, pass a key function')
  let wait = rl(key)
  if (typeof wait !== 'number') wait = await wait
  if (wait) return headers(await rl.info(key), wait)
}
