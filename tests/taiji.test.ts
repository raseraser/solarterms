import { describe, expect, it } from 'vitest'
import { dayAreaRatio, dayPath, taijiF, TRIGRAMS } from '../src/taiji-geom'

describe('晝夜太極幾何', () => {
  it.each([0.5, 25, 34.4, 50, 66.6, -33.9])('正規化：夏至 f=1、冬至 f=0，界線在二至接合（緯度 %s）', (lat) => {
    const f = taijiF(lat, 'norm')
    // 北半球夏至晝最長；南半球相反
    const [hi, lo] = lat >= 0 ? [90, 270] : [270, 90]
    expect(f(hi)).toBeCloseTo(1, 6)
    expect(f(lo)).toBeCloseTo(0, 6)
  })
  // 陰長半年與陽長半年以 f(180°−λ) = f(λ) 配對，晝面積比例恰為「正規化晝長的全年平均」；
  // 晝長曲線若是純正弦則為 0.5，折射與極晝截頂使其偏離
  it.each([0.5, 25, 34.4, 66.6])('晝面積比例 = 正規化晝長全年平均（緯度 %s）', (lat) => {
    const f = taijiF(lat, 'norm')
    let mean = 0
    for (let k = 0; k < 3600; k++) mean += f((k / 3600) * 360) / 3600
    expect(dayAreaRatio(lat, 'norm')).toBeCloseTo(mean, 3)
  })
  it.each([25, 34.4, 50])('中緯度陰陽近乎各半（緯度 %s，誤差 < 0.5%%）', (lat) => {
    expect(Math.abs(dayAreaRatio(lat, 'norm') - 0.5)).toBeLessThan(0.005)
  })
  it('原始比例：中緯度夏至處不接合（f < 1），極圈內接合', () => {
    expect(taijiF(25, 'raw')(90)).toBeLessThan(0.6)
    expect(taijiF(70, 'raw')(90)).toBeCloseTo(1, 6)
    expect(taijiF(70, 'raw')(270)).toBeCloseTo(0, 6)
  })
  it('path 為兩個封閉子路徑、無 NaN', () => {
    const d = dayPath(25, 'norm', 540, 880, 290)
    expect(d.match(/M/g)).toHaveLength(2)
    expect(d).not.toMatch(/NaN/)
  })
  it('先天八卦：乾上坤下、離左坎右，各卦爻不重複', () => {
    const at = (lon: number) => TRIGRAMS.find((t) => t.lon === lon)!.name
    expect([at(90), at(270), at(0), at(180)]).toEqual(['乾', '坤', '離', '坎'])
    expect(new Set(TRIGRAMS.map((t) => t.lines.join(''))).size).toBe(8)
  })
})
