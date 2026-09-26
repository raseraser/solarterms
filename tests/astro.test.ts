import { describe, expect, it } from 'vitest'
import hko from './fixtures/hko-terms.json'
import { dayLength, declinationFromLon, termLocal, termLon } from '../src/astro'

const fmt = (h: number) => `${Math.floor(h)}:${String(Math.round((h % 1) * 60)).padStart(2, '0')}`

// 1929 年前舊曆書的時間基準與現行 UTC+8 不同（單一時區假設無法全部解釋），列為已知差異；其餘必須逐日一致
const KNOWN_PRE1929 = ['1912#21', '1913#17', '1917#22', '1923#3', '1927#16', '1928#11']

describe('節氣日期 vs 香港天文台 1901–2100', () => {
  it('4800 筆逐日一致（除已知 1929 年前差異）', () => {
    const mismatch: string[] = []
    for (const [y, days] of Object.entries(hko as Record<string, string[]>)) {
      days.forEach((md, i) => {
        const t = termLocal(Number(y), i)
        if (`${t.month}-${t.day}` !== md) mismatch.push(`${y}#${i}`)
      })
    }
    expect(mismatch).toEqual(KNOWN_PRE1929)
  })
})

describe('晝長 vs 影片數字（北緯 34.4°）', () => {
  const lat = 34.4
  // 影片卡片上的「晝 hh:mm」。二分二至赤緯變化平緩須完全一致；
  // 其餘節氣影片以「當天」計、我們以交節瞬間計，赤緯差約 0.2° → 容許 ±3 分鐘
  const exact: [number, string][] = [
    [11, '14:27'], // 夏至
    [23, '9:51'], // 冬至
    [5, '12:08'], // 春分
  ]
  it.each(exact)('節氣 #%i 晝長 %s', (i, expected) => {
    expect(fmt(dayLength(lat, declinationFromLon(termLon(i))))).toBe(expected)
  })
  const approx: [number, number][] = [
    [8, 13 + 43 / 60], // 立夏
    [9, 14 + 5 / 60], // 小滿
    [13, 14 + 4 / 60], // 大暑
    [14, 13 + 41 / 60], // 立秋
    [19, 11 + 4 / 60], // 霜降
  ]
  it.each(approx)('節氣 #%i 晝長 ±3 分', (i, expected) => {
    expect(Math.abs(dayLength(lat, declinationFromLon(termLon(i))) - expected) * 60).toBeLessThanOrEqual(3)
  })
})
