import type { Season } from './data/terms'

export interface Palette {
  paper: string
  mountain: string
  ink: string
  /** 強調色：刻度尺當前節氣、印章 */
  accent: string
  /** 淡墨：次要文字、線條 */
  faint: string
  /** 枝幹 / 莖（場景用） */
  branch: string
}

// 淺色（宣紙）：[紙色, 山色, 字色]，依影片各節氣主色調
const LIGHT: [string, string, string][] = [
  ['#efe8e6', '#cdbfc0', '#2a2224'], // 小寒
  ['#b8342a', '#8e2119', '#fbeee0'], // 大寒（年節紅）
  ['#eef0e2', '#b9c9a0', '#23301f'], // 立春
  ['#e3ebe9', '#9fb7b5', '#1f2d2c'], // 雨水
  ['#ebe6f0', '#b7a9cc', '#2a2233'], // 驚蟄
  ['#f5e6e6', '#e2b3b3', '#2e1f1f'], // 春分
  ['#e3efe7', '#9cc5ae', '#1c2e24'], // 清明
  ['#e9eee0', '#a9bf94', '#243020'], // 穀雨
  ['#e6efe4', '#9dc39a', '#1b2e1d'], // 立夏
  ['#eef0dc', '#b6c98d', '#283018'], // 小滿
  ['#f3ecd6', '#d7c28a', '#2e2714'], // 芒種
  ['#f6ddc8', '#e7a37c', '#3a1f12'], // 夏至
  ['#f4e7d9', '#e3b893', '#362316'], // 小暑
  ['#f3d3bd', '#e0936b', '#3a1a0e'], // 大暑
  ['#f1ead7', '#cdbb8e', '#2e2716'], // 立秋
  ['#e4e9ee', '#a9b8c6', '#1f2a35'], // 處暑
  ['#e2ece9', '#a3c0b8', '#1c2d29'], // 白露
  ['#f1e6cf', '#d4b27a', '#33260f'], // 秋分
  ['#f0e8d4', '#c9b17a', '#2f2612'], // 寒露
  ['#f1e2dc', '#d3a595', '#331f19'], // 霜降
  ['#e7ebef', '#b3bfcb', '#1e2833'], // 立冬
  ['#e9edf2', '#bcc7d3', '#1e2833'], // 小雪
  ['#edeef1', '#c3c8d1', '#22262e'], // 大雪
  ['#f1e4dc', '#d6b1a1', '#33211a'], // 冬至
]

export const SEASON_COLOR: Record<Season, string> = {
  spring: '#7fae4a',
  summer: '#e0643a',
  autumn: '#c98f2c',
  winter: '#6f89a8',
}

const hex = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16))
const toHex = (rgb: number[]) => '#' + rgb.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')
/** a→b 線性混色，t = b 的比例 */
export const mix = (a: string, b: string, t: number) => {
  const A = hex(a), B = hex(b)
  return toHex(A.map((v, i) => v + (B[i] - v) * t))
}

const NIGHT_INK = '#141210'
const MOON_WHITE = '#efe6d2'
const PALE_GOLD = '#d8b66a'

export function palette(i: number, theme: 'light' | 'dark'): Palette {
  const [paper, mountain, ink] = LIGHT[i]
  if (theme === 'light') {
    return { paper, mountain, ink, accent: i === 1 ? '#f6d27a' : '#c0392b', faint: mix(ink, paper, 0.45), branch: i === 1 ? '#5a1510' : '#3d2b1f' }
  }
  // 夜墨：深墨紙帶一點節氣色相，山為低明度季節色，字為月白，強調淡金
  const tint = i === 1 ? '#8e2119' : mountain
  const p = mix(NIGHT_INK, tint, 0.1)
  return { paper: p, mountain: mix(NIGHT_INK, mountain, 0.38), ink: MOON_WHITE, accent: PALE_GOLD, faint: mix(MOON_WHITE, p, 0.5), branch: '#9c8b74' }
}
