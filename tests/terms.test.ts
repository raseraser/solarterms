import { describe, expect, it } from 'vitest'
import { TERMS } from '../src/data/terms'
import { termLon } from '../src/astro'

describe('節氣資料', () => {
  it('24 筆，index 與黃經對應（春分 0°、夏至 90°、秋分 180°、冬至 270°）', () => {
    expect(TERMS).toHaveLength(24)
    const at = (lon: number) => TERMS[[...Array(24).keys()].find((i) => termLon(i) === lon)!].name
    expect([at(0), at(90), at(180), at(270), at(315)]).toEqual(['春分', '夏至', '秋分', '冬至', '立春'])
  })
  it('每句詩都有作者、篇名與 http(s) 來源', () => {
    for (const t of TERMS) {
      expect(t.poem.author && t.poem.title, t.name).toBeTruthy()
      expect(t.poem.source, t.name).toMatch(/^https?:\/\//)
    }
  })
  it('季節與序號一致（立春～穀雨為春、立夏～大暑為夏…）', () => {
    const expected = [
      ...Array(2).fill('winter'), ...Array(6).fill('spring'), ...Array(6).fill('summer'),
      ...Array(6).fill('autumn'), ...Array(4).fill('winter'),
    ]
    expect(TERMS.map((t) => t.season)).toEqual(expected)
  })
})
