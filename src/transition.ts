// 墨暈轉場：舊卡片被一團暈開的墨吃出洞，洞內露出新卡片；新大字周圍濺墨
import { el } from './svg'

const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches
let current: { overlay: SVGSVGElement; raf: number } | null = null

/** 在重繪前呼叫：把目前卡片複製成疊層，播放墨暈並自行移除 */
export function inkTransition(card: SVGSVGElement, ink: string, duration = 950) {
  finish()
  if (reduced()) return
  const overlay = card.cloneNode(true) as SVGSVGElement
  overlay.removeAttribute('id')
  overlay.classList.add('ink-overlay')
  overlay.setAttribute('aria-hidden', 'true')
  const r = card.getBoundingClientRect(), pr = card.parentElement!.getBoundingClientRect()
  Object.assign(overlay.style, {
    position: 'absolute',
    left: `${r.left - pr.left}px`,
    top: `${r.top - pr.top}px`,
    width: `${r.width}px`,
    height: `${r.height}px`,
    pointerEvents: 'none',
  })
  // 疊層內 id 改名：否則 url(#mg0) 會解析到「新」卡片的同名漸層，舊畫面在轉場中被換色
  const ids = new Map<string, string>()
  overlay.querySelectorAll('[id]').forEach((n) => { ids.set(n.id, `o-${n.id}`); n.id = `o-${n.id}` })
  overlay.querySelectorAll('*').forEach((n) => {
    for (const at of ['fill', 'stroke', 'filter', 'mask', 'clip-path']) {
      const v = n.getAttribute(at)
      const m = v && /^url\(#(.+)\)$/.exec(v)
      if (m && ids.has(m[1])) n.setAttribute(at, `url(#${ids.get(m[1])})`)
    }
  })
  const body = el('g', { mask: 'url(#ink-mask)' })
  body.append(...[...overlay.childNodes].filter((n) => n.nodeName !== 'title' && n.nodeName !== 'defs'))
  const cx = 540 + (Math.random() - 0.5) * 120, cy = 720 + (Math.random() - 0.5) * 120
  const hole = el('circle', { cx, cy, r: 0, fill: '#000', filter: 'url(#ink-edge)' })
  const blot = el('circle', { cx, cy, r: 0, fill: ink, filter: 'url(#ink-edge)' })
  overlay.append(
    el('defs', {},
      el('filter', { id: 'ink-edge', x: '-50%', y: '-50%', width: '200%', height: '200%' },
        el('feTurbulence', { type: 'fractalNoise', baseFrequency: 0.012, numOctaves: 3, seed: Math.floor(Math.random() * 99) }),
        el('feDisplacementMap', { in: 'SourceGraphic', scale: 110, xChannelSelector: 'R', yChannelSelector: 'G' }),
      ),
      el('mask', { id: 'ink-mask', maskUnits: 'userSpaceOnUse', x: 0, y: 0, width: 1080, height: 1920 },
        el('rect', { width: 1080, height: 1920, fill: '#fff' }),
        hole,
      ),
    ),
    body,
  )
  body.append(blot) // 墨團在舊卡上、被洞切開 → 形成暈開的墨環
  card.parentElement!.append(overlay)

  const t0 = performance.now()
  const maxR = 1500
  const tick = (now: number) => {
    const k = Math.min(1, (now - t0) / duration)
    // 前 25%：墨團長大；之後洞從中心追上墨團，墨環越來越薄
    const blotR = 60 + maxR * easeIn(k) + 140 * Math.min(1, k * 4)
    const holeR = k < 0.2 ? 0 : maxR * easeIn((k - 0.2) / 0.8) * 1.05
    blot.setAttribute('r', String(blotR))
    blot.setAttribute('opacity', String(1 - k * 0.6))
    hole.setAttribute('r', String(holeR))
    if (k < 1) current!.raf = requestAnimationFrame(tick)
    else finish()
  }
  current = { overlay, raf: requestAnimationFrame(tick) }
}

function finish() {
  if (!current) return
  cancelAnimationFrame(current.raf)
  current.overlay.remove()
  current = null
}

const easeIn = (k: number) => k * k * (1.4 - 0.4 * k)

/** 新大字周圍濺墨：墨點由字心飛出後淡去 */
export function inkSplatter(layer: SVGGElement, ink: string) {
  if (reduced()) return
  const g = el('g', { 'pointer-events': 'none' })
  layer.append(g)
  for (let k = 0; k < 18; k++) {
    const a = Math.random() * Math.PI * 2
    const dist = 160 + Math.random() * 220
    const r = 3 + Math.random() * 9
    const dot = el('circle', { cx: 540, cy: 720 + (Math.random() - 0.5) * 360, r, fill: ink })
    g.append(dot)
    dot.animate(
      [
        { transform: 'translate(0,0)', opacity: 0.95 },
        { transform: `translate(${Math.cos(a) * dist}px, ${Math.sin(a) * dist * 0.8}px)`, opacity: 0.9, offset: 0.35 },
        { transform: `translate(${Math.cos(a) * dist * 1.05}px, ${Math.sin(a) * dist * 0.8 + 12}px)`, opacity: 0 },
      ],
      { duration: 1400 + Math.random() * 600, easing: 'cubic-bezier(.2,.8,.3,1)', fill: 'forwards' },
    )
  }
  setTimeout(() => g.remove(), 2200)
}
