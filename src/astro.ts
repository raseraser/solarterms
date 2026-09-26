import terms from './data/terms.json'

export const YEAR_MIN = terms.from
export const YEAR_MAX = terms.to
const TZ_OFFSET_MIN = 8 * 60 // 節氣日期以 UTC+8 認定

/** 第 i 個節氣（0 = 小寒 … 23 = 冬至）在 year 的交節時刻 */
export function termTime(year: number, i: number): Date {
  if (year < YEAR_MIN || year > YEAR_MAX) throw new RangeError(`year ${year} out of ${YEAR_MIN}–${YEAR_MAX}`)
  return new Date(terms.minutes[(year - YEAR_MIN) * 24 + i] * 60000)
}

/** 交節時刻換成 UTC+8 的 { month, day, hour, minute } */
export function termLocal(year: number, i: number) {
  const d = new Date(termTime(year, i).getTime() + TZ_OFFSET_MIN * 60000)
  return { month: d.getUTCMonth() + 1, day: d.getUTCDate(), hour: d.getUTCHours(), minute: d.getUTCMinutes() }
}

/** 太陽視黃經（度）→ 赤緯（度），黃赤交角取 23.44° */
export function declinationFromLon(lonDeg: number): number {
  const r = Math.PI / 180
  return Math.asin(Math.sin(23.44 * r) * Math.sin(lonDeg * r)) / r
}

/** 晝長（小時）：日出日落以太陽上緣 + 大氣折射（-0.833°）為準；極晝 24、極夜 0 */
export function dayLength(latDeg: number, declDeg: number): number {
  const r = Math.PI / 180
  const cosH = (Math.sin(-0.833 * r) - Math.sin(latDeg * r) * Math.sin(declDeg * r)) /
    (Math.cos(latDeg * r) * Math.cos(declDeg * r))
  if (cosH <= -1) return 24
  if (cosH >= 1) return 0
  return (2 * Math.acos(cosH)) / r / 15
}

/** 第 i 個節氣的太陽視黃經（度） */
export const termLon = (i: number) => (285 + 15 * i) % 360
