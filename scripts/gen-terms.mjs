// 預算 1900–2100 年 24 節氣交節時刻（VSOP87 完整模型 + 章動 + 光行差 + ΔT）
// 輸出 src/data/terms.json：{ from, to, minutes: number[] }，每年 24 筆（小寒…冬至），單位 = Unix epoch 分鐘（UTC）
import { writeFileSync } from 'node:fs'
import { planetposition, solar, deltat } from 'astronomia'
import vsop87Bearth from 'astronomia/data/vsop87Bearth'

const earth = new planetposition.Planet(vsop87Bearth)
const D2R = Math.PI / 180
const FROM = 1900
const TO = 2100

// 太陽視黃經 = lonDeg 的 JDE；初值由平均角速度推估，再以 (27.1) 式疊代
function termJDE(year, lonDeg) {
  // 春分（0°）約在 3/20；平均每度 365.2422/360 天
  const jdMarch = 2451623.8 + 365.2422 * (year - 2000)
  const d = lonDeg > 270 ? lonDeg - 360 : lonDeg // 小寒 285→-75 在年初；冬至 270 在年底
  let jde = jdMarch + d * 365.2422 / 360
  for (let i = 0; i < 50; i++) {
    const a = solar.apparentVSOP87(earth, jde).lon
    let diff = lonDeg * D2R - a
    diff = Math.atan2(Math.sin(diff), Math.cos(diff))
    const c = 58.13 * diff
    jde += c
    if (Math.abs(c) < 1e-7) return jde
  }
  throw new Error(`no converge ${year} ${lonDeg}`)
}

// 曆法順序：小寒 285°, 大寒 300°, 立春 315° … 大雪 255°, 冬至 270°
const LONS = Array.from({ length: 24 }, (_, i) => (285 + 15 * i) % 360)

const minutes = []
for (let y = FROM; y <= TO; y++) {
  for (const lon of LONS) {
    const jde = termJDE(y, lon)
    const dyear = y + (jde - (2451544.5 + 365.2425 * (y - 2000))) / 365.2425
    const jdUT = jde - deltat.deltaT(dyear) / 86400
    minutes.push(Math.round((jdUT - 2440587.5) * 1440))
  }
}
writeFileSync(new URL('../src/data/terms.json', import.meta.url), JSON.stringify({ from: FROM, to: TO, minutes }))
console.log('wrote', minutes.length, 'terms')
