// 晝夜太極的幾何（純函式，無 DOM）
// 極座標：太陽視黃經 λ 決定角度（春分左、夏至上、秋分右、冬至下），半徑 0–1
// 陽長半年（冬至→夏至，λ ∈ [270, 450)）：由圓心往外 f(λ) 為晝（白）
// 陰長半年（夏至→冬至，λ ∈ [90, 270)）：由圓心往外 1 − f(λ) 為夜（黑），其外為晝
import { dayLength, declinationFromLon } from './astro'

export type TaijiMode = 'norm' | 'raw'

/** f(λ)：norm = 晝長 min-max 正規化到 0–1；raw = 晝長 / 24h */
export function taijiF(lat: number, mode: TaijiMode) {
  const D = (lon: number) => dayLength(lat, declinationFromLon(lon))
  if (mode === 'raw') return (lon: number) => D(lon) / 24
  let mn = 24, mx = 0
  for (let l = 0; l < 360; l += 0.5) { const v = D(l); mn = Math.min(mn, v); mx = Math.max(mx, v) }
  const span = mx - mn
  return (lon: number) => (span < 1e-6 ? 0.5 : (D(lon) - mn) / span)
}

/** λ、r（0–1）→ 畫面座標 */
export const polar = (cx: number, cy: number, R: number) => (lon: number, r: number): [number, number] => {
  const a = (lon * Math.PI) / 180
  return [cx - Math.cos(a) * r * R, cy - Math.sin(a) * r * R]
}

const fmt = ([x, y]: [number, number]) => `${x.toFixed(2)} ${y.toFixed(2)}`

/** 晝（白）區域的 SVG path；底圓填夜色，再疊這條 path */
export function dayPath(lat: number, mode: TaijiMode, cx: number, cy: number, R: number, step = 1) {
  const f = taijiF(lat, mode)
  const P = polar(cx, cy, R)
  // 陽長半年：圓心 → 曲線 r = f
  const yang: string[] = [fmt([cx, cy])]
  for (let l = 270; l <= 450; l += step) yang.push(fmt(P(l % 360, f(l % 360))))
  // 陰長半年：外圓（λ 90→270）→ 曲線 r = 1 − f（λ 270→90）
  const yin: string[] = []
  for (let l = 90; l <= 270; l += step) yin.push(fmt(P(l, 1)))
  for (let l = 270; l >= 90; l -= step) yin.push(fmt(P(l, 1 - f(l))))
  return `M${yang.join(' L')} Z M${yin.join(' L')} Z`
}

/** 白色面積比例（數值積分，用於驗證陰陽平衡） */
export function dayAreaRatio(lat: number, mode: TaijiMode) {
  const f = taijiF(lat, mode)
  let area = 0
  const n = 3600
  for (let k = 0; k < n; k++) {
    const l = (k / n) * 360
    const yang = l >= 270 || l < 90
    const v = f(l)
    area += yang ? v * v : 1 - (1 - v) ** 2 // 扇形面積 ∝ r²
  }
  return area / n
}

/** 魚眼：春分、秋分方向 0.75R 處（該處晝夜各半，眼落在對側顏色的魚頭內） */
export const eyes = (cx: number, cy: number, R: number) => {
  const P = polar(cx, cy, R)
  return { white: P(0, 0.75), black: P(180, 0.75) }
}

/** 先天八卦：λ 與爻（由下而上，1 = 陽爻）；圓形排列時下爻在內圈 */
export const TRIGRAMS: { name: string; lon: number; lines: [number, number, number] }[] = [
  { name: '乾', lon: 90, lines: [1, 1, 1] },
  { name: '兌', lon: 45, lines: [1, 1, 0] },
  { name: '離', lon: 0, lines: [1, 0, 1] },
  { name: '震', lon: 315, lines: [1, 0, 0] },
  { name: '坤', lon: 270, lines: [0, 0, 0] },
  { name: '艮', lon: 225, lines: [0, 0, 1] },
  { name: '坎', lon: 180, lines: [0, 1, 0] },
  { name: '巽', lon: 135, lines: [0, 1, 1] },
]
