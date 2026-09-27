export const SCRIPT = `local t = redis.call('TIME')
local now = (t[1] - 1700000000) * 1000 + t[2] / 1000
local step, lim, cost = tonumber(ARGV[1]), tonumber(ARGV[2]), tonumber(ARGV[3])
local used = (tonumber(redis.call('GET', KEYS[1])) or now) - now
if used < 0 then used = 0 end
local new = used + cost * step
local wait = new - lim
if ARGV[4] == '2' or (wait <= 0 and ARGV[4] == '1') then
  redis.call('SET', KEYS[1], string.format('%.17g', now + new), 'PX', math.max(math.ceil(new), 1))
  used = new
end
return {wait > 0 and math.ceil(wait) or 0, math.max(math.floor((lim - used) / step), 0), math.ceil(used)}`

export const SHA = 'a40955f243eb7a5cca2eda02fa5e6464dbfe6fb2'
