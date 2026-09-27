// 端到端檢查：node scripts/e2e.mjs <url> <outDir>
// 1. 互動斷言（下一個 / 月份 / 年份 / 鍵盤 / 拖曳 / 主題 / 語言），任何 console error 視為失敗
// 2. 逐張截 24 節氣卡片 → <outDir>/cards-{light,dark}.png（contact sheet）
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const [, , url = 'http://localhost:5199/', out = 'e2e-out'] = process.argv
mkdirSync(out, { recursive: true })
const browser = await chromium.launch({ channel: 'chrome' })
const errors = []
const fails = []
const check = (cond, msg) => { if (!cond) fails.push(msg); console.log(cond ? '  ok ' : '  FAIL', msg) }

async function open(theme, viewport = { width: 1400, height: 1000 }) {
  const ctx = await browser.newContext({ viewport, permissions: [], geolocation: undefined })
  const p = await ctx.newPage()
  await p.addInitScript((t) => { localStorage.setItem('theme', t); localStorage.setItem('rswaver-lang', 'zh-tw') }, theme)
  p.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  p.on('pageerror', (e) => errors.push(e.message))
  await p.goto(url, { waitUntil: 'networkidle' })
  await p.evaluate(() => document.fonts.ready)
  await p.waitForTimeout(300)
  return p
}
const title = (p) => p.$eval('#card title', (e) => e.textContent)

// ── 互動 ──
{
  const p = await open('light')
  console.log('interactions')
  const t0 = await title(p)
  check(/^秋分 2026-9-23/.test(t0), `初始 = 今天的節氣（2026-09-26 → 秋分）: ${t0}`)
  await p.click('#next'); await p.waitForTimeout(500)
  check((await title(p)).startsWith('寒露 2026-10-8'), `下一個 → 寒露 2026-10-8: ${await title(p)}`)
  await p.selectOption('#month', '3'); await p.waitForTimeout(500)
  check((await title(p)).startsWith('驚蟄 2026-3-5'), `月份 3 → 驚蟄 2026-3-5: ${await title(p)}`)
  await p.fill('#year', '1999'); await p.dispatchEvent('#year', 'change'); await p.waitForTimeout(500)
  check((await title(p)).startsWith('驚蟄 1999-3-6'), `年份 1999 → 驚蟄 1999-3-6: ${await title(p)}`)
  await p.evaluate(() => document.activeElement.blur()) // 輸入框內的方向鍵刻意不換節氣
  await p.keyboard.press('ArrowLeft'); await p.waitForTimeout(500)
  check((await title(p)).startsWith('雨水 1999-2-19'), `← → 雨水 1999-2-19: ${await title(p)}`)
  // 跨年：1999 小寒往前 → 1998 冬至
  await p.selectOption('#month', '1'); await p.waitForTimeout(300)
  await p.click('#prev'); await p.waitForTimeout(500)
  check((await title(p)).startsWith('冬至 1998-12-22'), `跨年 ← → 冬至 1998-12-22: ${await title(p)}`)
  // 拖曳刻度尺往左兩格 → 往後兩個節氣
  const box = await p.$eval('#card', (e) => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height } })
  const y = box.y + box.h * (1780 / 1920)
  const unit = (1420 * 8.5 * Math.PI / 180) * (box.w / 1080)
  await p.mouse.move(box.x + box.w * 0.7, y); await p.mouse.down()
  await p.mouse.move(box.x + box.w * 0.7 - unit * 2, y, { steps: 10 }); await p.mouse.up(); await p.waitForTimeout(600)
  check((await title(p)).startsWith('小寒 1999-1-6') || (await title(p)).startsWith('大寒'), `拖曳兩格 → 1999 大寒: ${await title(p)}`)
  await p.click('#today'); await p.waitForTimeout(500)
  check((await title(p)).startsWith('秋分 2026'), `今天 → 秋分 2026: ${await title(p)}`)
  await p.click('#theme'); await p.waitForTimeout(200)
  check((await p.evaluate(() => [document.documentElement.dataset.theme, localStorage.getItem('theme')])).join() === 'dark,dark', '主題切換寫入 localStorage theme=dark')
  await p.click('#lang'); await p.waitForTimeout(200)
  check((await p.textContent('#today')) === 'Today' && (await p.evaluate(() => localStorage.getItem('rswaver-lang'))) === 'en', '語言切換 → en，寫入 rswaver-lang')
  await p.screenshot({ path: `${out}/en-dark.png` })
  await p.context().close()
}

// ── 24 張卡片 contact sheet ──
for (const theme of ['light', 'dark']) {
  const p = await open(theme)
  await p.fill('#year', '2026'); await p.dispatchEvent('#year', 'change')
  await p.selectOption('#month', '1'); await p.waitForTimeout(300)
  const shots = []
  for (let k = 0; k < 24; k++) {
    await p.waitForTimeout(k === 0 ? 1500 : 1300) // 等墨暈轉場結束、粒子鋪開
    shots.push((await (await p.$('#card')).screenshot()).toString('base64'))
    await p.click('#next')
  }
  const sheet = await browser.newPage({ viewport: { width: 1800, height: 800 } })
  await sheet.setContent(`<body style="margin:0;background:#888;display:grid;grid-template-columns:repeat(8,1fr);gap:4px">${shots.map((b) => `<img style="width:100%" src="data:image/png;base64,${b}">`).join('')}</body>`)
  await sheet.waitForTimeout(300)
  await sheet.screenshot({ path: `${out}/cards-${theme}.png`, fullPage: true })
  await sheet.close()
  await p.context().close()
}

// ── 墨暈轉場連續畫面 ──
{
  const p = await open('light')
  await p.waitForTimeout(1500)
  const frames = []
  await p.click('#next')
  for (const ms of [60, 200, 350, 500, 700, 1100]) {
    await p.waitForTimeout(ms - (frames.length ? [60, 200, 350, 500, 700, 1100][frames.length - 1] : 0))
    frames.push((await (await p.$('.stage')).screenshot()).toString('base64'))
  }
  check(await p.$('.ink-overlay') === null, '轉場結束後疊層已移除')
  const sheet = await browser.newPage({ viewport: { width: 1800, height: 700 } })
  await sheet.setContent(`<body style="margin:0;display:grid;grid-template-columns:repeat(6,1fr);gap:4px">${frames.map((b) => `<img style="width:100%" src="data:image/png;base64,${b}">`).join('')}</body>`)
  await sheet.screenshot({ path: `${out}/transition.png`, fullPage: true })
  await sheet.close()
  await p.context().close()
}

// ── 減少動態效果 ──
{
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 1000 }, reducedMotion: 'reduce' })
  const p = await ctx.newPage()
  p.on('pageerror', (e) => errors.push(e.message))
  await p.goto(url, { waitUntil: 'networkidle' })
  await p.click('#next')
  await p.waitForTimeout(50)
  check(await p.$('.ink-overlay') === null, 'reduced-motion：無轉場疊層')
  check(await p.$eval('#fx', (c) => getComputedStyle(c).display) === 'none', 'reduced-motion：粒子層隱藏')
  // 只算動畫（CSSAnimation / WAAPI）；按鈕 hover 的顏色 CSSTransition 不屬動態效果
  const anims = await p.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running' && a.constructor.name !== 'CSSTransition').length)
  check(anims === 0, `reduced-motion：無執行中動畫（${anims}）`)
  await ctx.close()
}

// ── 手機寬度 ──
{
  const p = await open('light', { width: 390, height: 844 })
  const overflow = await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
  check(!overflow, '手機 390px 無橫向捲動')
  await p.screenshot({ path: `${out}/mobile.png`, fullPage: true })
  await p.context().close()
}

await browser.close()
check(errors.length === 0, `無 console error ${errors.length ? JSON.stringify(errors) : ''}`)
console.log(fails.length ? `\n${fails.length} FAILED` : '\nALL PASS')
process.exit(fails.length ? 1 : 0)
