import './style.css'
import { CardView } from './card'
import { ABS_MAX, ABS_MIN, clampAbs, currentAbs, daysToNext, hm, monthAbs, split, termInfo } from './calendar'
import { YEAR_MAX, YEAR_MIN } from './astro'
import { TERMS } from './data/terms'
import { detectLang, saveLang, t, type Lang } from './i18n'
import { Particles } from './particles'
import { inkSplatter, inkTransition } from './transition'
import { TaijiView } from './taiji'
import type { TaijiMode } from './taiji-geom'

const TAIPEI = 25.03
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T

const state = {
  abs: currentAbs(new Date()),
  lat: TAIPEI,
  locMine: false,
  locDenied: false,
  latCustom: false,
  lang: detectLang() as Lang,
  playing: 0 as number, // setInterval id
  view: 'cards' as 'cards' | 'taiji',
  mode: 'norm' as TaijiMode,
}

const theme = () => (document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light')
const svg = $<HTMLElement>('card') as unknown as SVGSVGElement
const card = new CardView(svg)
const fx = new Particles($<HTMLCanvasElement>('fx'), svg)
const taijiSvg = $<HTMLElement>('taiji') as unknown as SVGSVGElement
const taiji = new TaijiView(taijiSvg)
taiji.onPick = (i) => { setView('cards'); go(split(state.abs).year * 24 + i) }

// ── 控制項 ──
const yearIn = $<HTMLInputElement>('year')
const monthSel = $<HTMLSelectElement>('month')
yearIn.min = String(YEAR_MIN)
yearIn.max = String(YEAR_MAX)

function renderStatic() {
  const d = t(state.lang)
  document.documentElement.lang = state.lang === 'zh' ? 'zh-Hant-TW' : 'en'
  document.querySelectorAll<HTMLElement>('[data-i18n]').forEach((e) => {
    const v = d[e.dataset.i18n as keyof typeof d]
    if (typeof v === 'string') e.textContent = v
  })
  monthSel.replaceChildren(...Array.from({ length: 12 }, (_, k) => new Option(d.monthName(k + 1), String(k + 1))))
  $('lang').textContent = state.lang === 'zh' ? 'EN' : '中'
  $('play').textContent = state.playing ? d.pause : d.play
  $('view').textContent = state.view === 'cards' ? d.viewTaiji : d.viewCards
  $('explain').textContent = state.mode === 'norm' ? d.explainNorm : d.explainRaw
  $('mode-norm').classList.toggle('on', state.mode === 'norm')
  $('mode-raw').classList.toggle('on', state.mode === 'raw')
}

function render(animateTaiji = false) {
  const d = t(state.lang)
  const scene = card.render(state.abs, state.lat, theme(), d)
  fx.set(state.view === 'cards' ? scene.particles ?? [] : [], card.ink)
  if (state.view === 'taiji') taiji.render({ lat: state.lat, mode: state.mode, active: split(state.abs).i, theme: theme(), d, animate: animateTaiji })
  latIn.value = String(state.lat)
  $('lat-out').textContent = `${Math.abs(state.lat).toFixed(1)}° ${state.lat >= 0 ? 'N' : 'S'}`
  const info = termInfo(state.abs, state.lat)
  const term = TERMS[info.i]
  yearIn.value = String(info.year)
  monthSel.value = String(Math.floor(info.i / 2) + 1)
  const now = new Date()
  const isCurrent = currentAbs(now) === state.abs
  const next = daysToNext(state.abs, now)
  const nextName = state.abs < ABS_MAX ? TERMS[split(state.abs + 1).i].name : ''
  const pad = (n: number) => String(n).padStart(2, '0')
  $('info').innerHTML = `
    <div class="info-name"><span class="brush">${term.name}</span><span class="info-en">${term.pinyin} · ${term.en}</span></div>
    ${isCurrent ? `<div class="badge">${d.current}${next !== null ? ' · ' + d.daysToNext(next, nextName) : ''}</div>` : ''}
    <dl>
      <dt>${d.termAt}</dt><dd>${info.year}-${pad(info.month)}-${pad(info.day)} ${pad(info.hour)}:${pad(info.minute)} (UTC+8)</dd>
      <dt>${d.lengthOfDay}</dt><dd>${hm(info.day_h)} / ${hm(24 - info.day_h)}</dd>
      <dt>${d.pentads}</dt><dd>${term.pentads.join('、')}</dd>
      <dt>${d.source}</dt><dd><a href="${term.poem.source}" target="_blank" rel="noopener">${term.poem.author}〈${term.poem.title}〉</a></dd>
    </dl>`
  const latStr = `${Math.abs(state.lat).toFixed(1)}°`
  $('loc-text').textContent =
    (state.lat >= 0 ? d.lat(latStr) : d.latSouth(latStr)) +
    (state.locMine ? d.locMine : state.locDenied || state.latCustom ? '' : d.locTaipei) +
    (state.locDenied ? ` · ${d.locDenied}` : '')
  $('locate').hidden = state.locMine
}

function setView(v: 'cards' | 'taiji') {
  state.view = v
  svg.toggleAttribute('hidden', v !== 'cards')
  $('fx').hidden = v !== 'cards'
  taijiSvg.toggleAttribute('hidden', v !== 'taiji')
  $('taiji-controls').hidden = v !== 'taiji'
  renderStatic()
  render(v === 'taiji')
  // 手機：面板在下方，切換後捲回圖面，否則使用者看不到剛打開的畫面
  if (matchMedia('(max-width: 820px)').matches) {
    document.querySelector('.stage')!.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
  }
}

function go(abs: number) {
  const target = clampAbs(abs)
  if (target === state.abs) return card.setDialPos(target)
  animateDial(state.abs, target)
  changeTo(target)
}

/** 換節氣：墨暈轉場 → 重繪 → 濺墨 */
function changeTo(target: number) {
  if (state.view === 'taiji') { state.abs = target; return render() }
  inkTransition(svg, card.ink)
  state.abs = target
  render()
  inkSplatter(card.contentLayer, card.ink)
}

// ── 刻度尺動畫 / 拖曳 ──
let anim = 0
function animateDial(from: number, to: number) {
  cancelAnimationFrame(anim)
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const t0 = performance.now(), dur = 420
  const step = (now: number) => {
    const k = Math.min(1, (now - t0) / dur)
    const e = 1 - (1 - k) ** 3
    card.setDialPos(from + (to - from) * e)
    if (k < 1) anim = requestAnimationFrame(step)
  }
  anim = requestAnimationFrame(step)
}

let drag: { x: number; p0: number; scale: number; moved: boolean } | null = null
svg.addEventListener('pointerdown', (e) => {
  const rect = svg.getBoundingClientRect()
  const y = ((e.clientY - rect.top) / rect.height) * 1920
  if (y < 1500) return // 只在刻度尺區域拖曳
  cancelAnimationFrame(anim)
  drag = { x: e.clientX, p0: state.abs, scale: 1080 / rect.width, moved: false }
  svg.setPointerCapture(e.pointerId)
})
svg.addEventListener('pointermove', (e) => {
  if (!drag) return
  const dx = (e.clientX - drag.x) * drag.scale
  if (Math.abs(dx) > 4) drag.moved = true
  const p = Math.min(ABS_MAX, Math.max(ABS_MIN, drag.p0 - dx / CardView.unitsPerTerm))
  card.setDialPos(p)
})
svg.addEventListener('pointerup', (e) => {
  if (!drag) return
  const dx = (e.clientX - drag.x) * drag.scale
  const p = drag.p0 - dx / CardView.unitsPerTerm
  const moved = drag.moved
  drag = null
  if (moved) {
    const target = clampAbs(Math.round(p))
    animateDial(p, target)
    if (target !== state.abs) changeTo(target)
  } else {
    // 點擊：點左半往前、右半往後
    const rect = svg.getBoundingClientRect()
    go(state.abs + (e.clientX - rect.left < rect.width / 2 ? -1 : 1))
  }
})

// ── 按鈕 / 鍵盤 ──
$('prev').onclick = () => go(state.abs - 1)
$('next').onclick = () => go(state.abs + 1)
$('today').onclick = () => go(currentAbs(new Date()))
yearIn.onchange = () => {
  const y = Math.min(YEAR_MAX, Math.max(YEAR_MIN, Math.round(Number(yearIn.value)) || YEAR_MIN))
  go(y * 24 + split(state.abs).i)
}
monthSel.onchange = () => go(monthAbs(split(state.abs).year, Number(monthSel.value)))
document.addEventListener('keydown', (e) => {
  if ((e.target as HTMLElement).matches('input, select')) return
  if (e.key === 'ArrowLeft') go(state.abs - 1)
  if (e.key === 'ArrowRight') go(state.abs + 1)
})
$('play').onclick = () => {
  if (state.playing) {
    clearInterval(state.playing)
    state.playing = 0
  } else {
    state.playing = window.setInterval(() => (state.abs >= ABS_MAX ? $('play').click() : go(state.abs + 1)), 2500)
  }
  renderStatic()
}
$('theme').onclick = () => {
  const n = theme() === 'dark' ? 'light' : 'dark'
  document.documentElement.setAttribute('data-theme', n)
  try { localStorage.setItem('theme', n) } catch { /* 無 storage */ }
  render()
}
$('lang').onclick = () => {
  state.lang = state.lang === 'zh' ? 'en' : 'zh'
  saveLang(state.lang)
  renderStatic()
  render()
}

// ── 太極控制 ──
const latIn = $<HTMLInputElement>('lat')
$('view').onclick = () => setView(state.view === 'cards' ? 'taiji' : 'cards')
$('mode-norm').onclick = () => { state.mode = 'norm'; renderStatic(); render(true) }
$('mode-raw').onclick = () => { state.mode = 'raw'; renderStatic(); render(true) }
latIn.oninput = () => { state.lat = Number(latIn.value); state.locMine = false; state.locDenied = false; state.latCustom = true; render() }
document.querySelectorAll<HTMLButtonElement>('.presets [data-lat]').forEach((b) => {
  b.onclick = () => { state.lat = Number(b.dataset.lat); state.locMine = false; state.latCustom = true; render(true) }
})
$('preset-mine').onclick = () => locate()

// ── 定位：只取緯度，不上傳 ──
function locate() {
  if (!('geolocation' in navigator)) return
  navigator.geolocation.getCurrentPosition(
    (pos) => { state.lat = pos.coords.latitude; state.locMine = true; state.locDenied = false; state.latCustom = false; render() },
    () => { state.locDenied = true; render() },
    { maximumAge: 86400e3, timeout: 10000 },
  )
}
$('locate').onclick = locate

renderStatic()
document.fonts.ready.then(() => render())
render()
locate()
