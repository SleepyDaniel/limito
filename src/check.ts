import { headers } from './headers.ts'
import type { Info } from './options.ts'
import type { Key } from './store.ts'

export interface AnyLimiter {
  (key: Key): number | Promise<number>
  info(key: Key): Info | Promise<Info>
}

export type KeyFn<T> = (x: T) => Key | undefined | Promise<Key | undefined>

export const check = async (
  rl: AnyLimiter,
  key: Key | undefined,
): Promise<Record<string, string> | undefined> => {
  if (key === undefined) throw new TypeError('limito: no key for this request, pass a key function')
  const wait = await rl(key)
  if (wait) return headers(await rl.info(key), wait)
}
