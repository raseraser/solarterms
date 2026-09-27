// 太極頁：24 節氣環 + 由晝長畫出的太極 + 先天八卦
import { TERMS } from './data/terms'
import { termLon } from './astro'
import { SEASON_COLOR } from './palette'
import { el } from './svg'
import { dayPath, eyes, polar, TRIGRAMS, type TaijiMode } from './taiji-geom'
import type { Dict } from './i18n'

const CX = 540, CY = 950
const R_TAIJI = 285, R_TRI = 330, R_LABEL = 420, R_RING = 470
const BRUSH = "'Masa Brush', 'Wenkai Body', serif"
const BODY = "'Wenkai Body', serif"

interface Colors { paper: string; ink: string; faint: string; day: string; night: string; accent: string }
const COLORS: Record<'light' | 'dark', Colors> = {
  light: { paper: '#f1ece1', ink: '#2a2521', faint: '#8a7f72', day: '#fbf8f1', night: '#1d1a17', accent: '#c0392b' },
  dark: { paper: '#141210', ink: '#efe6d2', faint: '#8f8574', day: '#efe6d2', night: '#050404', accent: '#d8b66a' },
}

export interface TaijiOpts {
  lat: number
  mode: TaijiMode
  /** 目前節氣 index（0 = 小寒） */
  active: number
  theme: 'light' | 'dark'
  d: Dict
  animate: boolean
}

export class TaijiView {
  private raf = 0
  onPick: (i: number) => void = () => {}

  constructor(private svg: SVGSVGElement) {}

  render(o: TaijiOpts) {
    cancelAnimationFrame(this.raf)
    const c = COLORS[o.theme]
    const svg = this.svg
    svg.replaceChildren()
    svg.append(el('title', {}, o.d.taijiTitle))
    const clipSector = el('path', { d: '' })
    svg.append(el('defs', {}, el('clipPath', { id: 'tj-reveal' }, clipSector)))
    svg.append(el('rect', { width: 1080, height: 1920, fill: c.paper }))
    svg.append(el('rect', { width: 1080, height: 1920, filter: 'url(#paper)' }))

    // 標題
    const zh = o.d.lang === 'zh'
    svg.append(
      el('text', { x: 540, y: 240, 'text-anchor': 'middle', 'font-family': zh ? BRUSH : BODY, 'font-size': zh ? 76 : 44, fill: c.ink, 'letter-spacing': zh ? 6 : 1 }, o.d.taijiTitle),
      el('text', { x: 540, y: 305, 'text-anchor': 'middle', 'font-family': BODY, 'font-size': 28, fill: c.faint, 'letter-spacing': 4 }, o.d.taijiSub),
    )

    // 節氣環：季節色弧 + 刻度 + 名稱（可點）
    const P = polar(CX, CY, 1)
    const ring = el('g', { 'font-family': BODY, 'font-size': 26, 'text-anchor': 'middle', 'dominant-baseline': 'central' })
    for (let i = 0; i < 24; i++) {
      const lon = termLon(i)
      const [ax, ay] = P(lon - 7.5, R_RING), [bx, by] = P(lon + 7.5, R_RING)
      // λ 增加在畫面上是順時針（sweep = 1）
      ring.append(el('path', { d: `M${ax} ${ay} A${R_RING} ${R_RING} 0 0 1 ${bx} ${by}`, fill: 'none', stroke: SEASON_COLOR[TERMS[i].season], 'stroke-width': 8 }))
      for (let k = 0; k < 3; k++) {
        const [t1x, t1y] = P(lon - 7.5 + k * 5, R_RING - 6), [t2x, t2y] = P(lon - 7.5 + k * 5, R_RING - (k === 0 ? 26 : 14))
        ring.append(el('line', { x1: t1x, y1: t1y, x2: t2x, y2: t2y, stroke: c.faint, 'stroke-width': k === 0 ? 2 : 1 }))
      }
      const [lx, ly] = P(lon, R_LABEL)
      const rot = ((lon + 270) % 360) // 文字沿切線、字頭朝外
      const active = i === o.active
      const lab = el('g', { class: 'tj-term', transform: `rotate(${rot > 90 && rot < 270 ? rot - 180 : rot} ${lx} ${ly})`, 'data-i': i, style: 'cursor:pointer' })
      if (active) lab.append(el('rect', { x: lx - 42, y: ly - 22, width: 84, height: 44, rx: 8, fill: 'none', stroke: c.accent, 'stroke-width': 1.5 }))
      lab.append(el('text', { x: lx, y: ly, fill: active ? c.accent : SEASON_COLOR[TERMS[i].season], 'font-weight': active ? 700 : 400 }, TERMS[i].name))
      ring.append(lab)
    }
    ring.addEventListener('click', (e) => {
      const t = (e.target as Element).closest('.tj-term')
      if (t) this.onPick(Number(t.getAttribute('data-i')))
    })
    svg.append(ring)

    // 太極本體（逐步畫出）
    const body = el('g', { 'clip-path': 'url(#tj-reveal)' })
    body.append(el('circle', { cx: CX, cy: CY, r: R_TAIJI, fill: c.night }))
    body.append(el('path', { d: dayPath(o.lat, o.mode, CX, CY, R_TAIJI), fill: c.day, 'fill-rule': 'nonzero' }))
    svg.append(body)
    svg.append(el('circle', { cx: CX, cy: CY, r: R_TAIJI, fill: 'none', stroke: c.faint, 'stroke-width': 2 }))

    // 魚眼 + 八卦：畫完後淡入
    const late = el('g', { class: 'tj-late', opacity: o.animate ? 0 : 1 })
    const ey = eyes(CX, CY, R_TAIJI)
    late.append(el('circle', { cx: ey.white[0], cy: ey.white[1], r: R_TAIJI * 0.085, fill: c.day }))
    late.append(el('circle', { cx: ey.black[0], cy: ey.black[1], r: R_TAIJI * 0.085, fill: c.night }))
    for (const t of TRIGRAMS) late.append(this.trigram(t, c))
    svg.append(late)

    // 目前節氣指針：圓心 → 環
    const [px, py] = P(termLon(o.active), R_TAIJI + 4), [qx, qy] = P(termLon(o.active), R_RING - 30)
    svg.append(el('line', { x1: px, y1: py, x2: qx, y2: qy, stroke: c.accent, 'stroke-width': 2, 'stroke-dasharray': '4 6' }))

    // 文字說明
    // 書法句（有 /*brush*/ 標記、字型子集含這些字）才用書法字；赤道說明用內文字
    const equator = o.mode === 'norm' && Math.abs(o.lat) < 5
    const insight = equator ? o.d.taijiEquator : o.mode === 'norm' ? o.d.taijiNorm : o.d.taijiRaw
    const brush = zh && !equator
    const size = Math.min(brush ? 52 : 36, 960 / ([...insight].length * (zh ? 1 : 0.5)))
    svg.append(
      el('text', { x: 540, y: 1570, 'text-anchor': 'middle', 'font-family': brush ? BRUSH : BODY, 'font-size': size, fill: c.ink }, insight),
      el('text', { x: 540, y: 1638, 'text-anchor': 'middle', 'font-family': BODY, 'font-size': 24, fill: c.faint }, o.d.taijiFoot(o.lat, o.mode)),
    )
    // 圖例
    const lg = el('g', { 'font-family': BODY, 'font-size': 24, fill: c.faint, 'dominant-baseline': 'central' })
    lg.append(
      el('rect', { x: 390, y: 1700, width: 30, height: 30, fill: c.day, stroke: c.faint }), el('text', { x: 430, y: 1716 }, o.d.day),
      el('rect', { x: 560, y: 1700, width: 30, height: 30, fill: c.night, stroke: c.faint }), el('text', { x: 600, y: 1716 }, o.d.night),
    )
    svg.append(lg)

    // 逐步畫出：由冬至起、依時間順序（畫面順時針）掃過一圈
    const sector = (deg: number) => {
      if (deg >= 360) return `M0 0 H1080 V1920 H0 Z`
      const pts = [`${CX} ${CY}`]
      for (let a = 0; a <= deg; a += 2) { const [x, y] = P(270 + a, R_TAIJI + 20); pts.push(`${x.toFixed(1)} ${y.toFixed(1)}`) }
      return `M${pts.join(' L')} Z`
    }
    if (!o.animate || matchMedia('(prefers-reduced-motion: reduce)').matches) {
      clipSector.setAttribute('d', sector(360))
      late.setAttribute('opacity', '1')
      return
    }
    const t0 = performance.now(), dur = 2600
    const tick = (now: number) => {
      const k = Math.min(1, (now - t0) / dur)
      clipSector.setAttribute('d', sector(360 * (1 - (1 - k) ** 2)))
      if (k < 1) this.raf = requestAnimationFrame(tick)
      else late.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 900, fill: 'forwards' })
    }
    this.raf = requestAnimationFrame(tick)
  }

  /** 卦：三爻垂直於半徑，下爻在內 */
  private trigram(t: (typeof TRIGRAMS)[number], c: Colors) {
    const P = polar(CX, CY, 1)
    const [x, y] = P(t.lon, R_TRI)
    const rot = (t.lon + 270) % 360 // 使爻線沿切線方向
    const g = el('g', { transform: `translate(${x} ${y}) rotate(${rot})` })
    const w = 44, h = 6, gap = 10
    t.lines.forEach((yang, k) => {
      const yy = 12 - k * gap // 下爻（k=0）靠圓心：旋轉後 +y 指向圓心
      if (yang) g.append(el('rect', { x: -w / 2, y: yy, width: w, height: h, fill: c.ink }))
      else g.append(el('rect', { x: -w / 2, y: yy, width: w * 0.42, height: h, fill: c.ink }), el('rect', { x: w * 0.08, y: yy, width: w * 0.42, height: h, fill: c.ink }))
    })
    const [nx, ny] = P(t.lon, R_TRI + 38) // 卦名不隨卦旋轉，保持正立
    return el('g', {}, g, el('text', { x: nx, y: ny, 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-family': BODY, 'font-size': 22, fill: c.accent }, t.name))
  }
}
