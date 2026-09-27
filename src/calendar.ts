import { YEAR_MAX, YEAR_MIN, declinationFromLon, dayLength, termLocal, termLon, termTime } from './astro'

// 節氣以「絕對序號」表示：abs = year * 24 + i（i = 0 小寒 … 23 冬至），跨年連續
export const ABS_MIN = YEAR_MIN * 24
export const ABS_MAX = YEAR_MAX * 24 + 23

export const split = (abs: number) => ({ year: Math.floor(abs / 24), i: ((abs % 24) + 24) % 24 })
export const clampAbs = (abs: number) => Math.min(ABS_MAX, Math.max(ABS_MIN, abs))

/** now 所在的節氣（交節時刻 ≤ now 的最後一個） */
export function currentAbs(now: Date): number {
  const ms = now.getTime()
  const y = new Date(ms + 8 * 3600e3).getUTCFullYear()
  for (let abs = clampAbs(y * 24 + 23); abs >= ABS_MIN; abs--) {
    const { year, i } = split(abs)
    if (termTime(year, i).getTime() <= ms) return abs
  }
  return ABS_MIN
}

/** 某年某月（1–12）的第一個節氣：每月恰含第 2(m-1)、2m-1 兩個節氣 */
export const monthAbs = (year: number, month: number) => clampAbs(year * 24 + 2 * (month - 1))

/** 影片的序號：立春 = 01 … 大寒 = 24 */
export const displayNo = (i: number) => ((i + 22) % 24) + 1

export interface TermInfo {
  year: number
  i: number
  month: number
  day: number
  hour: number
  minute: number
  /** 晝長（小時） */
  day_h: number
  /** 太陽視黃經（度） */
  lon: number
}

export function termInfo(abs: number, lat: number): TermInfo {
  const { year, i } = split(abs)
  const lon = termLon(i)
  return { year, i, ...termLocal(year, i), day_h: dayLength(lat, declinationFromLon(lon)), lon }
}

export const hm = (h: number) => {
  let hh = Math.floor(h), mm = Math.round((h - hh) * 60)
  if (mm === 60) { hh++; mm = 0 }
  return `${hh}:${String(mm).padStart(2, '0')}`
}

/** now 到下個節氣的天數（無條件進位），超出範圍回 null */
export function daysToNext(abs: number, now: Date): number | null {
  const next = abs + 1
  if (next > ABS_MAX) return null
  const { year, i } = split(next)
  return Math.ceil((termTime(year, i).getTime() - now.getTime()) / 86400e3)
}

/** now 在節氣序列上的連續位置：currentAbs + 已過比例（例：秋分後 27% → 秋分 abs + 0.27） */
export function todayPos(now: Date): number {
  const abs = currentAbs(now)
  if (abs >= ABS_MAX) return abs
  const a = split(abs), b = split(abs + 1)
  const t0 = termTime(a.year, a.i).getTime(), t1 = termTime(b.year, b.i).getTime()
  return abs + (now.getTime() - t0) / (t1 - t0)
}
