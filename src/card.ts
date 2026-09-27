import { TERMS } from './data/terms'
import { displayNo, hm, split, termInfo, ABS_MAX, ABS_MIN } from './calendar'
import { mix, palette, SEASON_COLOR, type Palette } from './palette'
import type { Dict } from './i18n'
import { drawScene, type SceneResult } from './scenes'
import { el, rng, type Attrs } from './svg'

const BRUSH = "'Masa Brush', 'Wenkai Body', serif"
const BODY = "'Wenkai Body', 'Noto Serif TC', serif"
const SERIF = "'Wenkai Body', Georgia, serif"
const SEASON_ZH = { spring: '春', summer: '夏', autumn: '秋', winter: '冬' } as const
const SEASON_EN = { spring: 'SPRING', summer: 'SUMMER', autumn: 'AUTUMN', winter: 'WINTER' } as const

/** 直排文字：每字一個 <text>，(x, y) 為第一個字的中心 */
function vtext(s: string, x: number, y: number, size: number, attrs: Attrs = {}, gap = 1.08) {
  const g = el('g', { 'font-size': size, 'text-anchor': 'middle', 'dominant-baseline': 'central', ...attrs })
  ;[...s].forEach((c, k) => g.append(el('text', { x, y: y + k * size * gap }, c)))
  return g
}

const MOUNTAIN_TOP = 1200

/** 山峰積雪：脊線高於 threshold 的連續段落，往下加一條帶狀白帽（深度隨峰高變化） */
function snowCapPaths(pts: [number, number][], threshold: number, depth: number, opacity: number) {
  const out: SVGPathElement[] = []
  let run: [number, number][] = []
  const flush = () => {
    if (run.length > 2) {
      const top = run.map(([x, y]) => `${x} ${y.toFixed(1)}`).join(' L')
      const bottom = [...run].reverse().map(([x, y]) => `${x} ${(y + Math.max(4, Math.min(depth, (threshold - y) * 0.9))).toFixed(1)}`).join(' L')
      out.push(el('path', { d: `M${top} L${bottom} Z`, fill: '#ffffff', 'fill-opacity': opacity, filter: 'url(#soft)' }))
    }
    run = []
  }
  for (const p of pts) (p[1] < threshold ? run.push(p) : flush())
  flush()
  return out
}

// ── 刻度尺幾何：大圓只露出頂端一段弧 ──
export const DIAL = { cx: 540, cy: 3110, r: 1420, step: 8.5 } // step = 每個節氣的角度

export class CardView {
  private svg: SVGSVGElement
  private layers: Record<'bg' | 'mountains' | 'scene' | 'content' | 'dial', SVGGElement>
  private dialLabels!: SVGGElement
  private dialArc!: SVGGElement
  private pal!: Palette
  get ink() { return this.pal.ink }
  get contentLayer() { return this.layers.content }
  private abs = 0
  private sceneDefs!: SVGDefsElement

  constructor(svg: SVGSVGElement) {
    this.svg = svg
    svg.append(this.defs())
    this.sceneDefs = el('defs')
    svg.append(this.sceneDefs)
    this.layers = {
      bg: el('g'), mountains: el('g'), scene: el('g', { class: 'scene' }), content: el('g', { class: 'content' }), dial: el('g', { class: 'dial' }),
    }
    for (const g of Object.values(this.layers)) svg.append(g)
  }

  private defs() {
    return el('defs', {},
      // 宣紙纖維
      el('filter', { id: 'paper', x: 0, y: 0, width: '100%', height: '100%' },
        el('feTurbulence', { type: 'fractalNoise', baseFrequency: '0.9 0.05', numOctaves: 2, seed: 3, result: 'n' }),
        el('feColorMatrix', { in: 'n', type: 'matrix', values: '0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.07 0' }),
      ),
      // 筆刷邊緣：擾動位移
      el('filter', { id: 'rough', x: '-10%', y: '-10%', width: '120%', height: '120%' },
        el('feTurbulence', { type: 'fractalNoise', baseFrequency: '0.035 0.012', numOctaves: 3, seed: 7, result: 't' }),
        el('feDisplacementMap', { in: 'SourceGraphic', in2: 't', scale: 38, xChannelSelector: 'R', yChannelSelector: 'G' }),
      ),
      el('filter', { id: 'soft' }, el('feGaussianBlur', { stdDeviation: 1.2 })),
    )
  }

  render(abs: number, lat: number, theme: 'light' | 'dark', d: Dict): SceneResult {
    this.abs = abs
    const info = termInfo(abs, lat)
    const term = TERMS[info.i]
    const pal = (this.pal = palette(info.i, theme))
    this.svg.style.setProperty('--paper', pal.paper)
    this.svg.querySelector('title')!.textContent = `${term.name} ${info.year}-${info.month}-${info.day}`

    this.renderBg(pal)
    this.layers.scene.replaceChildren()
    this.sceneDefs.replaceChildren()
    const scene = drawScene(term.scene, this.layers.scene, pal, 500 + info.i * 31, this.sceneDefs)
    if (scene.flash) this.layers.scene.append(el('rect', { class: 'flash', width: 1080, height: 1920, fill: '#ffffff' }))
    this.renderMountains(info.i, pal, !!scene.snowCaps)
    this.renderContent(info, pal, d, scene.moonFill)
    this.renderDialFrame(pal)
    this.setDialPos(abs)
    return scene
  }

  private renderBg(pal: Palette) {
    this.layers.bg.replaceChildren(
      el('rect', { width: 1080, height: 1920, fill: pal.paper }),
      el('rect', { width: 1080, height: 1920, filter: 'url(#paper)' }),
    )
  }

  private renderMountains(i: number, pal: Palette, snowCaps: boolean) {
    const g = this.layers.mountains
    g.replaceChildren()
    const rand = rng(1000 + i * 17)
    const layers = 4
    for (let k = 0; k < layers; k++) {
      const base = 1300 + k * 105
      const amp = 150 - k * 22
      const phases = [rand(), rand(), rand(), rand()].map((v) => v * Math.PI * 2)
      const freqs = [1.3 + rand(), 2.7 + rand() * 2, 5.5 + rand() * 3, 11 + rand() * 6]
      const hs: number[] = []
      for (let x = 0; x <= 1080; x += 10) {
        const u = x / 1080
        let h = 0
        freqs.forEach((f, j) => (h += Math.sin(u * f * Math.PI + phases[j]) / (j + 1) ** 1.2))
        hs.push(Math.max(0, h) ** 1.4) // 山峰尖、谷底平
      }
      // 峰頂不得高過拼音下緣（y = MOUNTAIN_TOP）：超過就整條等比壓低，不削平峰頂
      const scale = Math.min(amp, (base - MOUNTAIN_TOP) / Math.max(...hs))
      const pts: [number, number][] = hs.map((h, j) => [j * 10, base - h * scale])
      const dPath = `M0 1920 L0 ${base} ` + pts.map(([x, y]) => `L${x} ${y.toFixed(1)}`).join(' ') + ' L1080 1920 Z'
      const id = `mg${k}`
      const color = pal.mountain
      g.append(
        el('linearGradient', { id, x1: 0, y1: 0, x2: 0, y2: 1 },
          el('stop', { offset: 0, 'stop-color': color, 'stop-opacity': Math.min(1, (snowCaps ? 0.6 : 0.35) + k * 0.17) }),
          el('stop', { offset: 0.55, 'stop-color': color, 'stop-opacity': 0.12 + k * 0.1 }),
          el('stop', { offset: 1, 'stop-color': pal.paper, 'stop-opacity': 0 }),
        ),
        el('path', { d: dPath, fill: `url(#${id})` }),
      )
      if (snowCaps && k < 3) g.append(...snowCapPaths(pts, base - amp * 0.35, 34 - k * 6, 0.9 - k * 0.2))
    }
  }

  private renderContent(info: ReturnType<typeof termInfo>, pal: Palette, d: Dict, moonFill?: string) {
    const term = TERMS[info.i]
    const g = this.layers.content
    g.replaceChildren()
    g.setAttribute('fill', pal.ink)

    // 左上：序號 / 季節
    g.append(
      el('text', { x: 64, y: 168, 'font-size': 112, 'font-family': SERIF, 'font-weight': 700 }, String(displayNo(info.i)).padStart(2, '0')),
      el('text', { x: 196, y: 168, 'font-size': 34, 'font-family': SERIF, fill: pal.faint }, '/ 24'),
      el('text', { x: 68, y: 222, 'font-size': 26, 'font-family': SERIF, 'letter-spacing': 5, fill: pal.faint }, `${SEASON_ZH[term.season]} · ${SEASON_EN[term.season]}`),
    )
    // 右上：日期
    g.append(
      el('text', { x: 1016, y: 160, 'font-size': 64, 'font-family': SERIF, 'text-anchor': 'end', 'font-weight': 700 },
        `${String(info.month).padStart(2, '0')}.${String(info.day).padStart(2, '0')}`),
      el('line', { x1: 850, x2: 1016, y1: 184, y2: 184, stroke: pal.faint, 'stroke-width': 1.5 }),
      el('text', { x: 1016, y: 216, 'font-size': 24, 'font-family': BODY, 'text-anchor': 'end', fill: pal.faint },
        `${info.year} · ${String(info.hour).padStart(2, '0')}:${String(info.minute).padStart(2, '0')} ${d.termAt}`),
    )
    g.append(this.orbit(info.lon, pal))
    g.append(this.dayBar(info.day_h, pal, d))

    // 月輪 + 筆刷底 + 大字
    g.append(el('circle', { cx: 540, cy: 720, r: 300, fill: moonFill ?? pal.paper, 'fill-opacity': moonFill ? 0.9 : 0.55, stroke: pal.faint, 'stroke-width': 2, 'stroke-opacity': 0.6 }))
    g.append(el('rect', { x: 452, y: 420, width: 176, height: 600, rx: 18, fill: pal.mountain, 'fill-opacity': 0.6, filter: 'url(#rough)' }))
    g.append(vtext(term.name, 540, 575, 280, { 'font-family': BRUSH }, 1.02))
    // 季節印章
    g.append(this.seal(SEASON_ZH[term.season], 672, 948, 62, pal.accent))

    // 左：物候（三候）
    g.append(this.seal(d.pentads, 150, 470, 30, pal.accent, true))
    term.pentads.forEach((p, k) => g.append(vtext(p, 150 + (k - 1) * -48, 560, 34, { 'font-family': BODY, fill: k === 0 ? pal.ink : pal.faint })))
    // 右：詩句（右起直排）+ 作者
    const [l1, l2] = term.poem.lines
    g.append(vtext(l1, 960, 480, 42, { 'font-family': BODY }))
    g.append(vtext(l2, 900, 480, 42, { 'font-family': BODY }))
    g.append(vtext(term.poem.author.replace(' ', ''), 845, 480 + Math.max(l1.length, l2.length) * 45 - 20, 22, { 'font-family': BODY, fill: pal.accent }))

    // 拼音 / 英文
    g.append(el('text', { x: 540, y: 1124, 'font-size': 50, 'font-family': SERIF, 'text-anchor': 'middle', 'letter-spacing': 14 }, term.pinyin.toUpperCase()))
    const en = term.en.toUpperCase()
    const w = en.length * 15 + 40
    g.append(
      el('text', { x: 540, y: 1172, 'font-size': 21, 'font-family': SERIF, 'text-anchor': 'middle', 'letter-spacing': 6, fill: pal.faint }, en),
      el('line', { x1: 540 - w / 2 - 70, x2: 540 - w / 2, y1: 1165, y2: 1165, stroke: pal.faint }),
      el('line', { x1: 540 + w / 2, x2: 540 + w / 2 + 70, y1: 1165, y2: 1165, stroke: pal.faint }),
    )
  }

  /** 公轉示意：太陽居中，地球在日心黃經 = 太陽視黃經 + 180° */
  private orbit(lon: number, pal: Palette) {
    const cx = 540, cy = 128, rx = 190, ry = 58
    const g = el('g', { 'font-family': BODY, 'font-size': 17, fill: pal.faint, 'text-anchor': 'middle' })
    g.append(el('ellipse', { cx, cy, rx, ry, fill: 'none', stroke: pal.faint, 'stroke-width': 1.5 }))
    // 地球在各節氣的位置：春分下、夏至右、秋分上、冬至左
    const pos = (l: number) => [cx + Math.sin((l * Math.PI) / 180) * rx, cy + Math.cos((l * Math.PI) / 180) * ry]
    for (const [l, name] of [[0, '春分'], [90, '夏至'], [180, '秋分'], [270, '冬至']] as const) {
      const [x, y] = pos(l)
      const [lx, ly] = [cx + (x - cx) * 1.22, cy + (y - cy) * 1.45 + 6]
      g.append(el('circle', { cx: x, cy: y, r: 3, fill: pal.faint }), el('text', { x: lx, y: ly }, name))
    }
    // 太陽
    const sun = el('g', {})
    for (let k = 0; k < 12; k++) {
      const a = (k * Math.PI) / 6
      sun.append(el('line', { x1: cx + Math.cos(a) * 30, y1: cy + Math.sin(a) * 30, x2: cx + Math.cos(a) * 40, y2: cy + Math.sin(a) * 40, stroke: '#e6a23c', 'stroke-width': 3, 'stroke-linecap': 'round' }))
    }
    sun.append(el('circle', { cx, cy, r: 24, fill: '#f1b845' }))
    g.append(sun)
    const [ex, ey] = pos(lon)
    g.append(el('circle', { cx: ex, cy: ey, r: 13, fill: '#3f6fa8', stroke: pal.paper, 'stroke-width': 3 }))
    return g
  }

  private dayBar(dayH: number, pal: Palette, d: Dict) {
    const x0 = 400, x1 = 680, y = 282
    const split = x0 + ((x1 - x0) * dayH) / 24
    return el('g', { 'font-family': BODY, 'font-size': 26 },
      el('text', { x: x0 - 16, y: y + 9, 'text-anchor': 'end' }, `${d.day} ${hm(dayH)}`),
      el('line', { x1: x0, x2: split, y1: y, y2: y, stroke: '#e3b04b', 'stroke-width': 10, 'stroke-linecap': 'round' }),
      el('line', { x1: split, x2: x1, y1: y, y2: y, stroke: pal.ink, 'stroke-opacity': 0.75, 'stroke-width': 10, 'stroke-linecap': 'round' }),
      el('path', { d: `M${split - 7} ${y - 16} L${split + 7} ${y - 16} L${split} ${y - 7} Z`, fill: '#e3b04b' }),
      el('text', { x: x1 + 16, y: y + 9 }, `${hm(24 - dayH)} ${d.night}`),
    )
  }

  private seal(text: string, x: number, y: number, size: number, color: string, vertical = false) {
    const n = [...text].length
    const w = vertical ? size * 1.3 : size * 1.25 * Math.ceil(n / 2)
    const h = vertical ? size * 1.12 * n + size * 0.3 : size * 1.25 * Math.min(n, 2)
    const g = el('g', {})
    g.append(el('rect', { x: x - w / 2, y: y - size * 0.62, width: w, height: h, rx: 6, fill: 'none', stroke: color, 'stroke-width': 3, filter: 'url(#soft)' }))
    g.append(vtext(text, x, y, size * (vertical ? 1 : 0.9), { 'font-family': BRUSH, fill: color }, 1.12))
    return g
  }

  // ── 刻度尺 ──
  private renderDialFrame(pal: Palette) {
    const g = this.layers.dial
    g.replaceChildren()
    const { cx, cy, r } = DIAL
    g.append(el('circle', { cx, cy, r: r + 40, fill: pal.paper, 'fill-opacity': 0.55 }))
    this.dialArc = el('g', {})
    this.dialLabels = el('g', { 'font-family': BODY, 'font-size': 34, 'text-anchor': 'middle', 'dominant-baseline': 'central' })
    g.append(this.dialArc, el('circle', { cx, cy, r: r - 115, fill: 'none', stroke: pal.faint, 'stroke-opacity': 0.4 }), this.dialLabels)
    // 指針
    g.append(el('path', { d: `M${cx - 13} ${cy - r - 34} L${cx + 13} ${cy - r - 34} L${cx} ${cy - r - 14} Z`, fill: pal.accent }))
  }

  /** p = 目前刻度位置（絕對序號，可為小數，拖曳 / 動畫時使用） */
  setDialPos(p: number) {
    const { cx, cy, r, step } = DIAL
    const pal = this.pal
    const polar = (deg: number, rad: number) => [cx + Math.sin((deg * Math.PI) / 180) * rad, cy - Math.cos((deg * Math.PI) / 180) * rad]
    this.dialArc.replaceChildren()
    this.dialLabels.replaceChildren()
    const base = Math.round(p)
    for (let n = base - 4; n <= base + 4; n++) {
      if (n < ABS_MIN || n > ABS_MAX) continue
      const { i } = split(n)
      const a = (n - p) * step
      // 季節色外弧
      const [ax, ay] = polar(a - step / 2, r)
      const [bx, by] = polar(a + step / 2, r)
      this.dialArc.append(el('path', { d: `M${ax} ${ay} A${r} ${r} 0 0 1 ${bx} ${by}`, fill: 'none', stroke: SEASON_COLOR[TERMS[i].season], 'stroke-width': 9 }))
      // 刻度
      for (let k = 0; k < 5; k++) {
        const ta = a - step / 2 + (k * step) / 5
        const [t1x, t1y] = polar(ta, r - 8)
        const [t2x, t2y] = polar(ta, r - (k === 0 ? 34 : 18))
        this.dialArc.append(el('line', { x1: t1x, y1: t1y, x2: t2x, y2: t2y, stroke: pal.faint, 'stroke-width': k === 0 ? 2 : 1 }))
      }
      // 名稱
      const [lx, ly] = polar(a, r - 78)
      const active = n === this.abs && Math.abs(n - p) < 0.5
      const lab = el('g', { transform: `rotate(${a} ${lx} ${ly})` })
      if (active) lab.append(el('rect', { x: lx - 50, y: ly - 26, width: 100, height: 52, rx: 10, fill: mix(pal.paper, pal.accent, 0.14), stroke: pal.accent, 'stroke-width': 1.5 }))
      lab.append(el('text', { x: lx, y: ly, fill: active ? pal.accent : pal.ink, 'font-weight': active ? 700 : 400 }, TERMS[i].name))
      this.dialLabels.append(lab)
    }
  }

  /** 拖曳換算：每個節氣在畫面上約多少 viewBox 單位 */
  static get unitsPerTerm() {
    return (DIAL.r * DIAL.step * Math.PI) / 180
  }
}
