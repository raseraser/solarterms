import { describe, expect, it } from 'vitest'
import { YEAR_MAX, YEAR_MIN, termLocal, termTime } from '../src/astro'
import { currentAbs, displayNo, hm, monthAbs, split } from '../src/calendar'

describe('calendar', () => {
  it('每月恰含第 2(m-1)、2m-1 個節氣（1900–2100 全部年份）', () => {
    const bad: string[] = []
    for (let y = YEAR_MIN; y <= YEAR_MAX; y++)
      for (let i = 0; i < 24; i++) if (termLocal(y, i).month !== Math.floor(i / 2) + 1) bad.push(`${y}#${i}`)
    expect(bad).toEqual([])
  })
  it('monthAbs → 該月第一個節氣', () => {
    expect(split(monthAbs(2026, 9))).toEqual({ year: 2026, i: 16 }) // 白露
  })
  it('currentAbs：2026-09-26 在秋分；交節前一分鐘仍在白露', () => {
    expect(split(currentAbs(new Date('2026-09-26T12:00:00+08:00')))).toEqual({ year: 2026, i: 17 })
    const t = termTime(2026, 17).getTime()
    expect(split(currentAbs(new Date(t - 60e3))).i).toBe(16)
    expect(split(currentAbs(new Date(t))).i).toBe(17)
  })
  it('currentAbs：年初小寒前屬前一年冬至', () => {
    expect(split(currentAbs(new Date('2026-01-02T00:00:00+08:00')))).toEqual({ year: 2025, i: 23 })
  })
  it('影片序號：立春 01、大寒 24', () => {
    expect([displayNo(2), displayNo(1), displayNo(0)]).toEqual([1, 24, 23])
  })
  it('hm 進位', () => {
    expect(hm(11.9999)).toBe('12:00')
  })
})
