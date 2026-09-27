// 24 節氣場景：程序化 SVG 圖案 + 粒子設定
// 座標系與卡片相同（1080 × 1920）；上方 y < 1100 為文字區，圖案以兩側與底部（y 1150–1700）為主
import { el, rng } from './svg'
import type { Palette } from './palette'

export type ParticleKind = 'rain' | 'snow' | 'petal' | 'maple' | 'leaf' | 'firefly' | 'spark' | 'dew' | 'dust'
export interface ParticleSpec { kind: ParticleKind; count: number }

export interface SceneResult {
  /** 月輪改填色（烈日 / 冬陽） */
  moonFill?: string
  /** 山脊積雪 */
  snowCaps?: boolean
  /** 偶發閃電 */
  flash?: boolean
  particles?: ParticleSpec[]
}

type Rand = () => number
type Draw = (g: SVGGElement, pal: Palette, r: Rand, defs: SVGDefsElement) => SceneResult

const between = (r: Rand, a: number, b: number) => a + (b - a) * r()

// ── 共用小元件 ──

/** 遞迴枝幹，回傳所有枝梢座標 */
function branch(g: SVGGElement, color: string, r: Rand, x: number, y: number, ang: number, len: number, w: number, depth: number, tips: [number, number][]) {
  const bend = between(r, -0.35, 0.35)
  const x2 = x + Math.cos(ang) * len, y2 = y + Math.sin(ang) * len
  const cx = x + Math.cos(ang + bend) * len * 0.5, cy = y + Math.sin(ang + bend) * len * 0.5
  g.append(el('path', { d: `M${x} ${y} Q${cx} ${cy} ${x2} ${y2}`, stroke: color, 'stroke-width': w, fill: 'none', 'stroke-linecap': 'round' }))
  if (depth === 0 || w < 1.5) { tips.push([x2, y2]); return }
  const n = depth > 2 ? 2 : 1 + Math.round(r())
  for (let k = 0; k < n; k++) branch(g, color, r, x2, y2, ang + between(r, -0.75, 0.75), len * between(r, 0.55, 0.8), w * 0.62, depth - 1, tips)
  if (r() < 0.6) tips.push([(x + x2) / 2, (y + y2) / 2])
}

/** 五瓣花 */
function blossom(x: number, y: number, size: number, color: string, center: string, rot = 0) {
  const g = el('g', { transform: `translate(${x} ${y}) rotate(${rot})` })
  for (let k = 0; k < 5; k++) g.append(el('ellipse', { cx: 0, cy: -size * 0.55, rx: size * 0.42, ry: size * 0.55, fill: color, transform: `rotate(${k * 72})` }))
  g.append(el('circle', { r: size * 0.22, fill: center }))
  return g
}

/** 麥 / 稻穗 */
function wheat(g: SVGGElement, r: Rand, color: string, ear: string, n: number, y0: number, hMin: number, hMax: number) {
  for (let k = 0; k < n; k++) {
    const x = between(r, -20, 1100), h = between(r, hMin, hMax), lean = between(r, -40, 40)
    const s = el('g', { class: 'sway', style: `animation-delay:${(-r() * 4).toFixed(2)}s` })
    const tx = x + lean, ty = y0 - h
    s.append(el('path', { d: `M${x} ${y0} Q${x + lean * 0.2} ${y0 - h * 0.6} ${tx} ${ty}`, stroke: color, 'stroke-width': 3, fill: 'none' }))
    for (let j = 0; j < 7; j++) {
      const ey = ty + j * 13
      s.append(
        el('ellipse', { cx: tx - 6, cy: ey, rx: 5, ry: 10, fill: ear, transform: `rotate(-25 ${tx - 6} ${ey})` }),
        el('ellipse', { cx: tx + 6, cy: ey, rx: 5, ry: 10, fill: ear, transform: `rotate(25 ${tx + 6} ${ey})` }),
      )
    }
    s.append(el('line', { x1: tx, y1: ty - 34, x2: tx, y2: ty + 70, stroke: ear, 'stroke-width': 1 }))
    g.append(s)
  }
}

/** 燕 / 雁剪影：左右對稱，翅膀以 scaleY 拍動 */
const birdPath = (s: number) => `M0 0 Q${-s * 0.5} ${-s * 0.35} ${-s} ${-s * 0.1} Q${-s * 0.45} ${-s * 0.1} 0 ${s * 0.12} Q${s * 0.45} ${-s * 0.1} ${s} ${-s * 0.1} Q${s * 0.5} ${-s * 0.35} 0 0Z`

/** 燕：俯視剪影（展翅 + 剪刀尾），頭朝右 */
const swallowPath = (s: number) => [
  `M${0.9 * s} 0 Q${0.5 * s} ${-0.12 * s} ${0.1 * s} ${-0.1 * s}`,
  `L${-0.25 * s} ${-0.8 * s} Q${0.05 * s} ${-0.32 * s} ${-0.12 * s} ${-0.08 * s}`,
  `L${-1.0 * s} ${-0.34 * s} L${-0.55 * s} 0 L${-1.0 * s} ${0.34 * s}`,
  `L${-0.12 * s} ${0.08 * s} Q${0.05 * s} ${0.32 * s} ${-0.25 * s} ${0.8 * s}`,
  `L${0.1 * s} ${0.1 * s} Q${0.5 * s} ${0.12 * s} ${0.9 * s} 0Z`,
].join(' ')

/** 鳥群停留在畫面內：整群緩慢漂移，每隻各自拍翅（相位錯開） */
function flock(g: SVGGElement, color: string, pts: [number, number, number][], r: Rand, shape = birdPath) {
  const f = el('g', { class: 'glide' })
  for (const [x, y, s] of pts) {
    const bird = el('g', { transform: `translate(${x} ${y})` })
    bird.append(el('path', { d: shape(s), fill: color, class: 'flap', style: `animation-delay:${(-r() * 0.6).toFixed(2)}s` }))
    f.append(bird)
  }
  g.append(f)
}

/** 荷葉 */
function lotusLeaf(x: number, y: number, rx: number, ry: number, color: string, vein: string) {
  const g = el('g', {})
  g.append(el('ellipse', { cx: x, cy: y, rx, ry, fill: color }))
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2
    g.append(el('line', { x1: x, y1: y, x2: x + Math.cos(a) * rx * 0.92, y2: y + Math.sin(a) * ry * 0.92, stroke: vein, 'stroke-width': 1.5, 'stroke-opacity': 0.5 }))
  }
  return g
}

function lotusFlower(x: number, y: number, s: number, petal: string, tip: string) {
  const g = el('g', { transform: `translate(${x} ${y})` })
  for (const [a, sc] of [[-50, 0.8], [50, 0.8], [-25, 0.95], [25, 0.95], [0, 1]] as const) {
    g.append(el('path', { d: `M0 0 Q${-s * 0.35 * sc} ${-s * 0.5 * sc} 0 ${-s * sc} Q${s * 0.35 * sc} ${-s * 0.5 * sc} 0 0Z`, fill: petal, stroke: tip, 'stroke-width': 1.5, transform: `rotate(${a})` }))
  }
  return g
}

/** 菊：放射細瓣 */
function chrysanthemum(x: number, y: number, s: number, color: string, center: string) {
  const g = el('g', { transform: `translate(${x} ${y})` })
  for (let ring = 0; ring < 3; ring++) {
    const n = 22 - ring * 5, len = s * (1 - ring * 0.25)
    for (let k = 0; k < n; k++) {
      const a = (k / n) * 360 + ring * 7
      g.append(el('ellipse', { cx: 0, cy: -len * 0.5, rx: s * 0.07, ry: len * 0.5, fill: color, 'fill-opacity': 0.85 - ring * 0.1, transform: `rotate(${a})` }))
    }
  }
  g.append(el('circle', { r: s * 0.18, fill: center }))
  return g
}

/** 六角雪花 */
function snowflake(x: number, y: number, s: number, color: string) {
  const g = el('g', { transform: `translate(${x} ${y})`, stroke: color, 'stroke-width': 2.5, 'stroke-linecap': 'round', fill: 'none' })
  for (let k = 0; k < 6; k++) {
    const b = el('g', { transform: `rotate(${k * 60})` })
    b.append(el('line', { x1: 0, y1: 0, x2: 0, y2: -s }))
    for (const f of [0.45, 0.72]) b.append(el('path', { d: `M${-s * 0.2} ${-s * f - s * 0.15} L0 ${-s * f} L${s * 0.2} ${-s * f - s * 0.15}` }))
    g.append(b)
  }
  return g
}

/** 祥雲：螺旋 + 雲尾 */
function cloud(x: number, y: number, s: number, fill: string, line: string) {
  const g = el('g', { transform: `translate(${x} ${y})`, fill, stroke: line, 'stroke-width': 3 })
  for (const [cx, cy, rr] of [[0, 0, 1], [-1.1, 0.35, 0.72], [1.05, 0.3, 0.78]] as const) {
    g.append(el('circle', { cx: cx * s, cy: cy * s, r: rr * s }))
    g.append(el('path', { d: `M${cx * s} ${cy * s} m${rr * s * 0.55} 0 a${rr * s * 0.55} ${rr * s * 0.55} 0 1 0 ${-rr * s * 0.3} ${rr * s * 0.35} a${rr * s * 0.25} ${rr * s * 0.25} 0 1 1 ${rr * s * 0.05} ${-rr * s * 0.4}`, fill: 'none' }))
  }
  g.append(el('path', { d: `M${-1.8 * s} ${0.95 * s} L${1.9 * s} ${0.95 * s}`, fill: 'none' }))
  return g
}

/** 太陽盤漸層（放在月輪內） */
function sunGradient(defs: SVGDefsElement, id: string, inner: string, outer: string) {
  defs.append(el('radialGradient', { id }, el('stop', { offset: 0, 'stop-color': inner }), el('stop', { offset: 1, 'stop-color': outer })))
  return `url(#${id})`
}

function sunRays(g: SVGGElement, color: string, rIn: number, rOut: number, n: number) {
  const s = el('g', { class: 'spin', stroke: color, 'stroke-width': 2.5, 'stroke-opacity': 0.55 })
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2, len = k % 2 ? rOut : rOut * 0.88
    s.append(el('line', { x1: 540 + Math.cos(a) * rIn, y1: 720 + Math.sin(a) * rIn, x2: 540 + Math.cos(a) * len, y2: 720 + Math.sin(a) * len }))
  }
  g.append(s)
}

function ripples(g: SVGGElement, color: string, r: Rand, n: number) {
  for (let k = 0; k < n; k++) {
    g.append(el('ellipse', { class: 'ripple', cx: between(r, 80, 1000), cy: between(r, 1560, 1640), rx: 60, ry: 12, fill: 'none', stroke: color, 'stroke-width': 1.5, style: `animation-delay:${(-r() * 3).toFixed(2)}s` }))
  }
}

function willow(g: SVGGElement, color: string, leaf: string, r: Rand, x0: number, strands: number, maxLen: number) {
  g = g.appendChild(el('g', { opacity: 0.8 }))
  g.append(el('path', { d: `M${x0 - 60} -10 Q${x0 + 40} 60 ${x0 + 160} 40`, stroke: color, 'stroke-width': 7, fill: 'none' }))
  for (let k = 0; k < strands; k++) {
    const sx = x0 - 40 + k * (200 / strands), len = between(r, maxLen * 0.45, maxLen)
    const s = el('g', { class: 'hang', style: `animation-delay:${(-r() * 5).toFixed(2)}s` })
    s.append(el('path', { d: `M${sx} 30 Q${sx + 30} ${len * 0.5} ${sx + between(r, -20, 40)} ${len}`, stroke: color, 'stroke-width': 1.6, fill: 'none' }))
    for (let j = 1; j < 14; j++) {
      const t = j / 14, y = 30 + (len - 30) * t, x = sx + 30 * 4 * t * (1 - t)
      s.append(el('ellipse', { cx: x + (j % 2 ? 6 : -6), cy: y, rx: 3, ry: 9, fill: leaf, transform: `rotate(${j % 2 ? -30 : 30} ${x} ${y})` }))
    }
    g.append(s)
  }
}

// ── 24 場景 ──
const SCENES: Record<string, Draw> = {
  plum(g, pal, r) {
    const b = el('g', {})
    const tips: [number, number][] = []
    branch(b, pal.branch, r, 1110, 1720, -2.55, 190, 15, 4, tips)
    for (const [x, y] of tips) b.append(blossom(x, y, between(r, 14, 22), '#d64550', '#f6d27a', r() * 72))
    g.append(b)
    return { particles: [{ kind: 'snow', count: 40 }, { kind: 'petal', count: 6 }] }
  },
  lantern(g) {
    for (const [x, len, s] of [[140, 360, 1], [950, 250, 0.85]] as const) {
      const h = el('g', { class: 'hang', style: `animation-duration:${3 + s}s` })
      h.append(el('line', { x1: x, y1: 0, x2: x, y2: len, stroke: '#f6d27a', 'stroke-width': 2 }))
      h.append(el('rect', { x: x - 26 * s, y: len, width: 52 * s, height: 14 * s, fill: '#f6d27a' }))
      h.append(el('ellipse', { cx: x, cy: len + 85 * s, rx: 78 * s, ry: 72 * s, fill: '#e03a2f', stroke: '#f6d27a', 'stroke-width': 2 }))
      for (const k of [-0.5, 0, 0.5]) h.append(el('ellipse', { cx: x, cy: len + 85 * s, rx: 78 * s * Math.abs(k || 0.02) + 4, ry: 72 * s, fill: 'none', stroke: '#b3261e', 'stroke-width': 2 }))
      h.append(el('text', { x, y: len + 85 * s, 'font-size': 52 * s, 'font-family': "'Masa Brush', serif", 'text-anchor': 'middle', 'dominant-baseline': 'central', fill: '#f6d27a' }, /*brush*/ '福'))
      h.append(el('rect', { x: x - 26 * s, y: len + 150 * s, width: 52 * s, height: 14 * s, fill: '#f6d27a' }))
      for (let k = -3; k <= 3; k++) h.append(el('line', { x1: x + k * 5, y1: len + 164 * s, x2: x + k * 6, y2: len + 230 * s, stroke: '#f6d27a', 'stroke-width': 2 }))
      g.append(h)
    }
    return { particles: [{ kind: 'spark', count: 3 }] }
  },
  willow(g, pal, r) {
    willow(g, pal.branch, '#9cbf5a', r, 40, 9, 620)
    return { particles: [{ kind: 'dust', count: 25 }] }
  },
  rain(g, pal, r) {
    ripples(g, pal.faint, r, 9)
    return { particles: [{ kind: 'rain', count: 140 }] }
  },
  peach(g, pal, r) {
    const b = el('g', {})
    const tips: [number, number][] = []
    branch(b, pal.branch, r, -30, 1560, -0.45, 180, 12, 4, tips)
    for (const [x, y] of tips) b.append(blossom(x, y, between(r, 13, 19), '#f2a2b4', '#c2185b', r() * 72))
    g.append(b)
    return { flash: true, particles: [{ kind: 'petal', count: 22 }, { kind: 'rain', count: 30 }] }
  },
  swallow(g, pal, r) {
    // 月輪左上：三隻燕
    flock(g, pal.ink, [[250, 355, 40], [372, 400, 32], [150, 305, 26]], r, swallowPath)
    return { particles: [{ kind: 'petal', count: 12 }] }
  },
  kite(g, pal, r) {
    willow(g, pal.branch, '#7fb069', r, -40, 6, 520)
    const k = el('g', { class: 'bob' })
    const x = 170, y = 1250
    k.append(el('path', { d: `M${x} ${y - 70} L${x + 55} ${y} L${x} ${y + 90} L${x - 55} ${y} Z`, fill: '#e25b45', stroke: '#8e2119', 'stroke-width': 2 }))
    k.append(el('path', { d: `M${x} ${y - 70} L${x} ${y + 90} M${x - 55} ${y} L${x + 55} ${y}`, stroke: '#8e2119', 'stroke-width': 1.5 }))
    k.append(el('path', { d: `M${x} ${y + 90} q 20 60 -10 110 q -30 50 10 110`, stroke: '#e25b45', 'stroke-width': 3, fill: 'none' }))
    k.append(el('path', { d: `M${x + 20} ${y + 20} Q 500 1500 900 1700`, stroke: pal.faint, 'stroke-width': 1, fill: 'none' }))
    g.append(k)
    return { particles: [{ kind: 'rain', count: 45 }] }
  },
  tea(g, _pal, r, defs) {
    // 梯田茶園：沿山坡等高線的一條條茶行，上緣是細碎葉冠，下緣墨色較深；行與行之間露出田埂
    defs.append(el('linearGradient', { id: 'tea-row', x1: 0, y1: 0, x2: 0, y2: 1 },
      el('stop', { offset: 0, 'stop-color': '#8db36a' }), el('stop', { offset: 1, 'stop-color': '#3f6a30' })))
    const rows = 6
    for (let k = 0; k < rows; k++) {
      const y0 = 1400 + k * 55, bow = 60 - k * 6, thick = 26 + k * 5
      const ridge = (x: number) => y0 + bow * Math.sin((x / 1080) * Math.PI * 1.1 + 0.4) - bow * 0.5
      let top = ''
      for (let x = -20; x <= 1100; x += 9) {
        const y = ridge(x) - between(r, 0, 7) // 細碎葉冠
        top += `${top ? ' L' : 'M'}${x} ${y.toFixed(1)}`
      }
      let bottom = ''
      for (let x = 1100; x >= -20; x -= 30) bottom += ` L${x} ${(ridge(x) + thick).toFixed(1)}`
      g.append(el('path', { d: top + bottom + ' Z', fill: 'url(#tea-row)', 'fill-opacity': 0.55 + k * 0.08 }))
      // 葉冠亮點
      for (let j = 0; j < 26; j++) {
        const x = between(r, 0, 1080), y = ridge(x) + between(r, 2, thick * 0.5)
        g.append(el('path', { d: `M${x} ${y} q 5 -5 10 0 q -5 3 -10 0z`, fill: '#c3dd98', 'fill-opacity': 0.7 }))
      }
    }
    // 前景：一芽二葉
    const sprig = el('g', { transform: 'translate(930 1560) rotate(-12)', class: 'sway' })
    sprig.append(el('path', { d: 'M0 130 Q4 60 0 0', stroke: '#5b7f3a', 'stroke-width': 4, fill: 'none' }))
    const leaf = (x: number, y: number, rot: number, len: number) => {
      const lg = el('g', { transform: `translate(${x} ${y}) rotate(${rot})` })
      lg.append(el('path', { d: `M0 0 C ${len * 0.3} ${-len * 0.28} ${len * 0.75} ${-len * 0.22} ${len} 0 C ${len * 0.75} ${len * 0.2} ${len * 0.3} ${len * 0.24} 0 0Z`, fill: '#7fae4a' }))
      lg.append(el('path', { d: `M0 0 L${len * 0.95} 0`, stroke: '#4f7a30', 'stroke-width': 1.5 }))
      for (let v = 1; v < 5; v++) lg.append(el('path', { d: `M${len * v * 0.18} 0 l${len * 0.1} ${-len * 0.1} M${len * v * 0.18} 0 l${len * 0.1} ${len * 0.1}`, stroke: '#4f7a30', 'stroke-width': 1 }))
      return lg
    }
    sprig.append(leaf(2, 70, -150, 80), leaf(2, 40, -30, 70))
    sprig.append(el('path', { d: 'M0 0 C -9 -20 -6 -45 0 -60 C 6 -45 9 -20 0 0Z', fill: '#a9cf6e' })) // 芽
    g.append(sprig)
    return { particles: [{ kind: 'rain', count: 50 }] }
  },
  lotusLeaf(g, _pal, r) {
    g.append(lotusLeaf(170, 1560, 190, 60, '#6fa05a', '#2f5a28'), lotusLeaf(900, 1600, 170, 55, '#5f9450', '#2f5a28'), lotusLeaf(560, 1640, 120, 36, '#7cad62', '#2f5a28'))
    g.append(el('path', { d: 'M760 1600 Q770 1450 790 1380', stroke: '#4f7a38', 'stroke-width': 5, fill: 'none' }))
    g.append(el('path', { d: 'M790 1380 q -22 -40 0 -80 q 22 40 0 80z', fill: '#f2a2b4', stroke: '#c2185b', 'stroke-width': 1.5 }))
    ripples(g, '#4f7a38', r, 4)
    return { particles: [{ kind: 'dust', count: 20 }] }
  },
  greenWheat(g, _pal, r) {
    wheat(g, r, '#6f9a3f', '#9cc15a', 42, 1720, 180, 420)
    return { particles: [{ kind: 'dust', count: 20 }] }
  },
  goldWheat(g, _pal, r) {
    wheat(g, r, '#b8902e', '#e2b64a', 48, 1720, 200, 460)
    return { particles: [{ kind: 'rain', count: 35 }] }
  },
  sunRays(g, _pal, _r, defs) {
    sunRays(g, '#e0643a', 320, 420, 48)
    return { moonFill: sunGradient(defs, 'sun-summer', '#f7b267', '#e25b2f'), particles: [{ kind: 'dust', count: 30 }] }
  },
  lotusFlower(g, _pal, r) {
    g.append(lotusLeaf(200, 1600, 170, 52, '#6fa05a', '#2f5a28'), lotusLeaf(880, 1580, 190, 58, '#5f9450', '#2f5a28'))
    for (const [x, y, s] of [[330, 1420, 120], [780, 1380, 140], [600, 1500, 90]] as const) {
      g.append(el('path', { d: `M${x} ${y} Q${x + 10} ${y + 120} ${x - 5} 1700`, stroke: '#4f7a38', 'stroke-width': 5, fill: 'none' }))
      g.append(lotusFlower(x, y, s, '#f7c6d0', '#d65a7a'))
    }
    ripples(g, '#4f7a38', r, 4)
    return { particles: [{ kind: 'dust', count: 15 }] }
  },
  firefly(g, _pal, r, defs) {
    for (let k = 0; k < 60; k++) {
      const x = between(r, -10, 1090), h = between(r, 60, 200)
      g.append(el('path', { d: `M${x} 1720 Q${x + between(r, -30, 30)} ${1720 - h * 0.6} ${x + between(r, -50, 50)} ${1720 - h}`, stroke: '#5b6f3a', 'stroke-width': 2, fill: 'none', 'stroke-opacity': 0.7 }))
    }
    return { moonFill: sunGradient(defs, 'sun-heat', '#f39a5c', '#c8412a'), particles: [{ kind: 'firefly', count: 40 }] }
  },
  wutong(g) {
    // 大梧桐葉，貼在節氣大字右上
    const leaf = el('g', { transform: 'translate(700 480) rotate(25)', class: 'sway' })
    leaf.append(el('path', { d: 'M0 0 C -70 -30 -90 -110 -40 -140 C -40 -190 20 -200 30 -150 C 80 -190 130 -150 95 -100 C 140 -70 110 -10 50 -10 Z', fill: '#e0a93a', 'fill-opacity': 0.9 }))
    leaf.append(el('path', { d: 'M0 0 L 30 -150 M 12 -60 L -40 -140 M 18 -70 L 95 -100', stroke: '#a8741c', 'stroke-width': 2, fill: 'none' }))
    leaf.append(el('line', { x1: 0, y1: 0, x2: -18, y2: 40, stroke: '#a8741c', 'stroke-width': 3 }))
    g.append(leaf)
    return { particles: [{ kind: 'leaf', count: 14 }] }
  },
  cloud(g, pal) {
    for (const [x, y, s, d] of [[150, 1300, 60, 22], [880, 1450, 48, 28], [260, 360, 42, 34]] as const) {
      const c = el('g', { class: 'drift', style: `animation-duration:${d}s` })
      c.append(cloud(x, y, s, pal.paper, pal.faint))
      g.append(c)
    }
    return { particles: [{ kind: 'dust', count: 15 }] }
  },
  reed(g, pal, r) {
    for (let k = 0; k < 34; k++) {
      const x = between(r, -20, 1100), h = between(r, 300, 620), lean = between(r, -60, 60)
      const s = el('g', { class: 'sway', style: `animation-delay:${(-r() * 4).toFixed(2)}s` })
      s.append(el('path', { d: `M${x} 1720 Q${x + lean * 0.3} ${1720 - h * 0.5} ${x + lean} ${1720 - h}`, stroke: pal.faint, 'stroke-width': 2.5, fill: 'none' }))
      s.append(el('path', { d: `M${x + lean} ${1720 - h} q ${lean * 0.3 + 18} 40 ${lean * 0.2 + 30} 110`, stroke: '#d9cdb4', 'stroke-width': 9, 'stroke-linecap': 'round', fill: 'none', 'stroke-opacity': 0.85 }))
      g.append(s)
    }
    return { particles: [{ kind: 'dew', count: 30 }] }
  },
  geese(g, pal, r) {
    const pts: [number, number, number][] = []
    for (let k = 0; k < 7; k++) {
      const side = k % 2 ? 1 : -1, n = Math.ceil(k / 2)
      pts.push([820 - n * 50, 372 + n * 18 * side, 22]) // 雁首在右，往右飛
    }
    flock(g, pal.ink, pts, r)
    return { particles: [{ kind: 'leaf', count: 8 }] }
  },
  chrysanthemum(g) {
    for (const [x, y, s, c] of [[180, 1560, 130, '#f0c64a'], [920, 1520, 150, '#f2b233'], [560, 1680, 110, '#fbe7b0'], [60, 1340, 80, '#f4d77b'], [1030, 1300, 90, '#f0c64a']] as const) {
      g.append(el('path', { d: `M${x} ${y} L${x + 10} 1760`, stroke: '#4f7a38', 'stroke-width': 5 }))
      g.append(chrysanthemum(x, y, s, c, '#b87a1e'))
    }
    return { particles: [{ kind: 'dust', count: 15 }] }
  },
  maple(g, pal, r) {
    const b = el('g', {})
    const tips: [number, number][] = []
    branch(b, pal.branch, r, -40, 1480, -0.3, 190, 13, 3, tips)
    for (const [x, y] of tips) b.append(el('path', { d: mapleLeaf(between(r, 20, 30)), fill: r() < 0.5 ? '#d9442f' : '#e8752f', transform: `translate(${x} ${y}) rotate(${between(r, 0, 360)})` }))
    g.append(b)
    return { particles: [{ kind: 'maple', count: 22 }] }
  },
  frost(g, pal, r) {
    for (const [x, y, a] of [[0, 0, 0.6], [1080, 0, 2.5], [0, 1920, -0.6], [1080, 1920, -2.5]] as const) {
      const tips: [number, number][] = []
      const f = el('g', { opacity: 0.75 })
      branch(f, pal.ink === '#efe6d2' ? '#dfe8f0' : '#8fa6bd', r, x, y, a, 150, 4, 4, tips)
      g.append(f)
    }
    return { snowCaps: true, particles: [{ kind: 'snow', count: 30 }] }
  },
  lightSnow(g, _pal, r) {
    for (let k = 0; k < 6; k++) g.append(el('g', { class: 'spin-slow', style: `animation-delay:${(-r() * 20).toFixed(1)}s` }, snowflake(between(r, 60, 1020), between(r, 1180, 1500), between(r, 18, 34), '#ffffff')))
    return { snowCaps: true, particles: [{ kind: 'snow', count: 70 }] }
  },
  heavySnow(g, pal) {
    g.append(el('rect', { x: 0, y: 0, width: 1080, height: 1920, fill: '#ffffff', 'fill-opacity': pal.ink === '#efe6d2' ? 0.03 : 0.12 }))
    return { snowCaps: true, particles: [{ kind: 'snow', count: 200 }] }
  },
  lowSun(g, _pal, _r, defs) {
    sunRays(g, '#c8412a', 310, 380, 36)
    return { moonFill: sunGradient(defs, 'sun-winter', '#f08a5d', '#c8412a'), snowCaps: true, particles: [{ kind: 'snow', count: 25 }] }
  },
}

function mapleLeaf(s: number) {
  const pts: string[] = []
  for (let k = 0; k < 10; k++) {
    const a = -Math.PI / 2 + (k / 10) * Math.PI * 2
    const rr = k % 2 ? s * 0.45 : s * (k === 0 ? 1 : 0.85)
    pts.push(`${(Math.cos(a) * rr).toFixed(1)} ${(Math.sin(a) * rr).toFixed(1)}`)
  }
  return `M${pts.join(' L')} Z M0 0 L0 ${s * 0.9}`
}

export const SCENE_KEYS = Object.keys(SCENES)

export function drawScene(key: string, g: SVGGElement, pal: Palette, seed: number, defs: SVGDefsElement): SceneResult {
  const draw = SCENES[key]
  if (!draw) throw new Error(`unknown scene ${key}`)
  return draw(g, pal, rng(seed), defs)
}
