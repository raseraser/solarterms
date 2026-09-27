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
import { initMobile } from './mobile'

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
  mobile?.update()
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
  mobile?.update()
}

function setView(v: 'cards' | 'taiji') {
  state.view = v
  svg.toggleAttribute('hidden', v !== 'cards')
  $('fx').hidden = v !== 'cards'
  taijiSvg.toggleAttribute('hidden', v !== 'taiji')
  $('taiji-controls').hidden = v !== 'taiji'
  renderStatic()
  render(v === 'taiji')
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
  const t0 = performance.now(), dur = 650
  const step = (now: number) => {
    const k = Math.min(1, (now - t0) / dur)
    const e = 1 - (1 - k) ** 3
    card.setDialPos(from + (to - from) * e)
    if (k < 1) anim = requestAnimationFrame(step)
  }
  anim = requestAnimationFrame(step)
}

let drag: { x: number; p0: number; scale: number; moved: boolean } | null = null
// 刻度尺以外：左右滑換節氣、點大字看詳細、點日期選年月（上下滑交給瀏覽器捲動：touch-action: pan-y）
let swipe: { x: number; y: number } | null = null
const toCard = (e: MouseEvent) => {
  const r = svg.getBoundingClientRect()
  return [((e.clientX - r.left) / r.width) * 1080, ((e.clientY - r.top) / r.height) * 1920]
}
svg.addEventListener('pointerdown', (e) => {
  const rect = svg.getBoundingClientRect()
  const [, y] = toCard(e)
  if (y < 1500) { swipe = { x: e.clientX, y: e.clientY }; return }
  cancelAnimationFrame(anim)
  drag = { x: e.clientX, p0: state.abs, scale: 1080 / rect.width, moved: false }
  svg.setPointerCapture(e.pointerId)
})
svg.addEventListener('pointercancel', () => { swipe = null; drag = null })
svg.addEventListener('pointerup', (e) => {
  if (!swipe) return
  const dx = e.clientX - swipe.x, dy = e.clientY - swipe.y
  swipe = null
  tapped = Math.abs(dx) < 10 && Math.abs(dy) < 10
  if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5) go(state.abs + (dx < 0 ? 1 : -1))
})
// 點擊在 click 才處理：若在 pointerup 就開面板，隨後同座標的 click 會落在剛出現的遮罩上把它關掉
let tapped = false
svg.addEventListener('click', (e) => {
  if (!tapped) return
  tapped = false
  const [x, y] = toCard(e)
  if (x > 820 && y < 240) mobile.openDate()
  else if (x > 420 && x < 660 && y > 420 && y < 1030) mobile.openDetail()
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
function togglePlay() {
  if (state.playing) {
    clearInterval(state.playing)
    state.playing = 0
  } else {
    state.playing = window.setInterval(() => (state.abs >= ABS_MAX ? togglePlay() : go(state.abs + 1)), 2500)
  }
  renderStatic()
}
$('play').onclick = togglePlay
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

const mobile = initMobile({ state, go, setView, togglePlay })

/** 第一次開啟：刻度尺左右晃一下，提示可以拖曳 / 滑動（只一次） */
function hintOnce() {
  const KEY = 'solarterms-hint'
  try { if (localStorage.getItem(KEY)) return; localStorage.setItem(KEY, '1') } catch { return }
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
  setTimeout(() => {
    const t0 = performance.now(), base = state.abs
    const step = (now: number) => {
      const k = (now - t0) / 1400
      if (k >= 1 || state.abs !== base) return card.setDialPos(state.abs)
      card.setDialPos(base + Math.sin(k * Math.PI * 4) * 0.35 * (1 - k))
      anim = requestAnimationFrame(step)
    }
    anim = requestAnimationFrame(step)
  }, 900)
}

renderStatic()
document.fonts.ready.then(() => render())
render()
locate()
hintOnce()
