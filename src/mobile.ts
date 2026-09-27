// 手機直向：底部工具列、年月選單、「⋯」選單（把桌機右側面板的內容搬進來）
import { YEAR_MAX, YEAR_MIN, termLocal } from './astro'
import { currentAbs, split } from './calendar'
import { TERMS } from './data/terms'
import { t, type Lang } from './i18n'
import { Sheet } from './sheet'

export const MOBILE_MQ = '(max-width: 820px) and (orientation: portrait)'

export interface MobileApi {
  state: { abs: number; lang: Lang; playing: number; view: 'cards' | 'taiji' }
  go: (abs: number) => void
  setView: (v: 'cards' | 'taiji') => void
  togglePlay: () => void
}

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T

export function initMobile(api: MobileApi) {
  const mq = matchMedia(MOBILE_MQ)
  const dateSheet = new Sheet($('sheet-date'))
  const moreSheet = new Sheet($('sheet-more'))
  let sheetYear = split(api.state.abs).year

  // ── 面板內容在桌機面板 ↔ 「⋯」選單之間搬移（同一批 DOM，邏輯不重複） ──
  const movable = ['.head-actions', '#info', '#taiji-controls', '.loc', '.panel-foot'].map((sel) => {
    const node = document.querySelector<HTMLElement>(sel)!
    const anchor = document.createComment(sel)
    node.parentNode!.insertBefore(anchor, node)
    return { node, anchor }
  })
  const moreBody = $('sheet-more').querySelector('.sheet-body')!
  const place = () => {
    if (mq.matches) movable.forEach(({ node }) => moreBody.append(node))
    else {
      movable.forEach(({ node, anchor }) => anchor.parentNode!.insertBefore(node, anchor.nextSibling))
      dateSheet.close()
      moreSheet.close()
    }
  }
  mq.addEventListener('change', place)
  place()

  // ── 工具列 ──
  $('m-today').onclick = () => api.go(currentAbs(new Date()))
  $('m-date').onclick = () => openDate()
  $('m-play').onclick = () => api.togglePlay()
  $('m-view').onclick = () => api.setView(api.state.view === 'cards' ? 'taiji' : 'cards')
  $('m-more').onclick = () => moreSheet.open()

  // ── 年月選單 ──
  const yearIn = $<HTMLInputElement>('ds-year')
  yearIn.min = String(YEAR_MIN)
  yearIn.max = String(YEAR_MAX)
  const setYear = (y: number) => { sheetYear = Math.min(YEAR_MAX, Math.max(YEAR_MIN, Math.round(y) || sheetYear)); renderGrid() }
  for (const [id, dy] of [['ds-m10', -10], ['ds-m1', -1], ['ds-p1', 1], ['ds-p10', 10]] as const) $(id).onclick = () => setYear(sheetYear + dy)
  yearIn.onchange = () => setYear(Number(yearIn.value))
  $('ds-today').onclick = () => { api.go(currentAbs(new Date())); dateSheet.close() }
  $('ds-grid').addEventListener('click', (e) => {
    const b = (e.target as Element).closest<HTMLElement>('[data-i]')
    if (!b) return
    api.go(sheetYear * 24 + Number(b.dataset.i))
    dateSheet.close()
  })

  function openDate() {
    sheetYear = split(api.state.abs).year
    renderGrid()
    dateSheet.open()
    // 目前節氣捲到選單中段（9 月以後原本在畫面外）
    requestAnimationFrame(() => $('ds-grid').querySelector('.on')?.scrollIntoView({ block: 'center' }))
  }

  function renderGrid() {
    const d = t(api.state.lang)
    const { year, i: cur } = split(api.state.abs)
    yearIn.value = String(sheetYear)
    const rows: string[] = []
    for (let m = 1; m <= 12; m++) {
      const cells = [2 * (m - 1), 2 * m - 1].map((i) => {
        const lt = termLocal(sheetYear, i)
        const on = sheetYear === year && i === cur
        return `<button class="ds-term ${TERMS[i].season}${on ? ' on' : ''}" data-i="${i}" ${on ? 'aria-current="true"' : ''}>
          <b>${TERMS[i].name}</b><small>${lt.month}/${lt.day}</small></button>`
      })
      rows.push(`<div class="ds-row"><span class="ds-m">${d.monthName(m)}</span>${cells.join('')}</div>`)
    }
    $('ds-grid').innerHTML = rows.join('')
  }

  return {
    get active() { return mq.matches },
    /** 每次重繪後更新工具列文字 */
    update() {
      const d = t(api.state.lang)
      const { year, i } = split(api.state.abs)
      $('m-date-text').textContent = d.dateLabel(year, Math.floor(i / 2) + 1)
      $('m-today').textContent = d.today
      $('m-play').setAttribute('aria-label', api.state.playing ? d.pause : d.play)
      $('m-play').classList.toggle('on', !!api.state.playing)
      $('m-view').setAttribute('aria-label', api.state.view === 'cards' ? d.viewTaiji : d.viewCards)
      $('m-view').classList.toggle('on', api.state.view === 'taiji')
      $('m-more').setAttribute('aria-label', d.more)
      $('sheet-more').querySelector('.sheet-title')!.textContent = api.state.view === 'taiji' ? d.viewTaiji : d.more
      $('sheet-date').querySelector('.sheet-title')!.textContent = d.pickDate
      $('ds-today').textContent = d.today
      if (dateSheet.isOpen) renderGrid()
    },
    openDate() { if (mq.matches) openDate() },
    openDetail() { if (mq.matches) moreSheet.open() },
  }
}
