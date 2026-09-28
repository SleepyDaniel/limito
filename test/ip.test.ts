import { expect, it } from 'vitest'
import { ipKey } from '../src/index.ts'

it('keeps IPv4 and undefined as they are', () => {
  expect(ipKey('1.2.3.4')).toBe('1.2.3.4')
  expect(ipKey(undefined)).toBeUndefined()
})

it('groups IPv6 by /64', () => {
  expect(ipKey('2001:db8::1')).toBe('2001:db8:0:0::/64')
  expect(ipKey('2001:DB8:0:0:ffff:ffff:ffff:ffff')).toBe('2001:db8:0:0::/64')
  expect(ipKey('2001:db8:0:1::1')).toBe('2001:db8:0:1::/64')
  expect(ipKey('fe80::1%eth0')).toBe('fe80:0:0:0::/64')
  expect(ipKey('::1')).toBe('0:0:0:0::/64')
  expect(ipKey('1:2:3:4:5:6:7:8')).toBe('1:2:3:4::/64')
  expect(ipKey('64:ff9b::1.2.3.4')).toBe('64:ff9b:0:0::/64')
})

it('turns IPv4-mapped addresses back into IPv4', () => {
  expect(ipKey('::ffff:1.2.3.4')).toBe('1.2.3.4')
  expect(ipKey('::FFFF:9.9.9.9')).toBe('9.9.9.9')
  expect(ipKey('::ffff:102:304')).toBe('1.2.3.4')
  expect(ipKey('0:0:0:0:0:ffff:1.2.3.4')).toBe('1.2.3.4')
})

it('leaves malformed addresses alone', () => {
  for (const bad of [
    '1:2:3:4:5:6:7:8:9',
    '1::2::3',
    '1:2:3:4:5:6:7:8::9',
    'zz::1',
    '12345::1',
    '1:::2',
    '1:2:3:4:5:6:7:8::',
    '::1:2:3:4:5:6:7:8',
    '::ffff:999.1.1.1',
    '::ffff:1.300.3.4',
    '1:2:3:4:5:6:7:',
    ':1::2',
  ])
    expect(ipKey(bad)).toBe(bad)
})
