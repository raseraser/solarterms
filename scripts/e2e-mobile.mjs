// 手機端到端：node scripts/e2e-mobile.mjs <url> <outDir>
// 觸控用 CDP Input.dispatchTouchEvent（真的觸控事件，經過 touch-action 判定）
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const [, , url = 'http://localhost:5199/', out = 'e2e-out'] = process.argv
mkdirSync(out, { recursive: true })
const browser = await chromium.launch({ channel: 'chrome' })
const fails = []
const errors = []
const check = (cond, msg) => { if (!cond) fails.push(msg); console.log(cond ? '  ok ' : '  FAIL', msg) }

async function open(viewport, theme = 'light') {
  const ctx = await browser.newContext({ viewport, isMobile: viewport.width < 900 && viewport.height > viewport.width, hasTouch: true, deviceScaleFactor: 2 })
  const p = await ctx.newPage()
  await p.addInitScript((t) => { localStorage.setItem('theme', t); localStorage.setItem('rswaver-lang', 'zh-tw'); localStorage.setItem('solarterms-hint', '1') }, theme)
  p.on('pageerror', (e) => errors.push(e.message))
  p.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  await p.goto(url, { waitUntil: 'networkidle' })
  await p.evaluate(() => document.fonts.ready)
  await p.waitForTimeout(400)
  return p
}
const title = (p) => p.$eval('#card title', (e) => e.textContent)
const rect = (p, sel) => p.$eval(sel, (e) => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, b: r.bottom, r: r.right } })
const visible = (p, sel) => p.$eval(sel, (e) => { const s = getComputedStyle(e); return s.display !== 'none' && s.visibility !== 'hidden' && !e.closest('[hidden]') })

async function swipe(p, x0, y0, x1, y1) {
  const cdp = await p.context().newCDPSession(p)
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x0, y: y0 }] })
  for (let k = 1; k <= 8; k++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x0 + ((x1 - x0) * k) / 8, y: y0 + ((y1 - y0) * k) / 8 }] })
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
}
/** 卡片座標（1080×1920）→ 畫面座標 */
const at = async (p, cx, cy) => { const r = await rect(p, '#card'); return [r.x + (cx / 1080) * r.w, r.y + (cy / 1920) * r.h] }

for (const [name, vp] of [['iphone', { width: 390, height: 664 }], ['android', { width: 412, height: 780 }]]) {
  console.log(name)
  const p = await open(vp)
  // 版面：卡片 + 工具列剛好一個畫面
  const card = await rect(p, '#card'), bar = await rect(p, '.mbar')
  check(card.b <= bar.y + 1 && Math.abs(bar.b - vp.height) < 1, `卡片底 ${card.b.toFixed(0)} ≤ 工具列頂 ${bar.y.toFixed(0)}，工具列貼齊底部`)
  check(card.y >= -1 && card.w <= vp.width + 1, `卡片完整在畫面內（${card.w.toFixed(0)}×${card.h.toFixed(0)}）`)
  check(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.documentElement.scrollHeight <= innerHeight + 1), '無捲動（直、橫）')
  check(!(await visible(p, '.panel')), '右側面板不顯示')
  await p.screenshot({ path: `${out}/${name}.png` })

  // 年月選單
  await p.tap('#m-date'); await p.waitForTimeout(350)
  check(await visible(p, '#sheet-date'), '點工具列年月 → 選單打開')
  check((await p.$$('#ds-grid .ds-term')).length === 24, '選單列出 24 個節氣')
  await p.screenshot({ path: `${out}/${name}-date.png` })
  await p.tap('#ds-p1'); await p.waitForTimeout(100)
  check((await p.inputValue('#ds-year')) === '2027', '年份 +1 → 2027')
  await p.tap('#ds-grid [data-i="4"]'); await p.waitForTimeout(700)
  check((await title(p)).startsWith('驚蟄 2027-3-6'), `點「驚蟄」→ ${await title(p)}`)
  check(!(await visible(p, '#sheet-date')), '選完自動關閉')
  check((await p.textContent('#m-date-text')).includes('2027'), `工具列顯示 ${await p.textContent('#m-date-text')}`)

  // 觸控滑動
  const [sx, sy] = await at(p, 800, 900), [ex] = await at(p, 250, 900)
  await swipe(p, sx, sy, ex, sy + 10); await p.waitForTimeout(700)
  check((await title(p)).startsWith('春分 2027'), `往左滑 → 下一個: ${await title(p)}`)
  await swipe(p, ex, sy, sx, sy); await p.waitForTimeout(700)
  check((await title(p)).startsWith('驚蟄 2027'), `往右滑 → 上一個: ${await title(p)}`)
  const t0 = await title(p)
  await swipe(p, sx, sy, sx + 10, sy - 200); await p.waitForTimeout(500)
  check((await title(p)) === t0, '上下滑不換節氣')

  // 點大字 → 詳細
  const [nx, ny] = await at(p, 540, 720)
  await p.touchscreen.tap(nx, ny); await p.waitForTimeout(350)
  check(await visible(p, '#sheet-more') && (await p.textContent('#sheet-more #info')).includes('驚蟄'), '點大字 → 詳細資料（含節氣名）')
  await p.screenshot({ path: `${out}/${name}-more.png` })
  await p.touchscreen.tap(vp.width / 2, 20); await p.waitForTimeout(350) // 點背景關閉
  check(!(await visible(p, '#sheet-more')), '點背景關閉')

  // 點卡片日期 → 年月選單
  const [dx, dy] = await at(p, 960, 150)
  await p.touchscreen.tap(dx, dy); await p.waitForTimeout(350)
  check(await visible(p, '#sheet-date'), '點卡片右上日期 → 年月選單')
  await p.keyboard.press('Escape'); await p.waitForTimeout(350)

  // 今天 / 太極
  await p.tap('#m-today'); await p.waitForTimeout(700)
  check((await title(p)).startsWith('秋分 2026'), `工具列「今天」→ ${await title(p)}`)
  await p.tap('#m-view'); await p.waitForTimeout(3500)
  check(await visible(p, '#taiji') && !(await visible(p, '#card')), '☯ → 太極頁')
  const tj = await rect(p, '#taiji')
  check(tj.b <= bar.y + 1, '太極頁也在工具列之上')
  await p.screenshot({ path: `${out}/${name}-taiji.png` })
  await p.tap('#m-more'); await p.waitForTimeout(350)
  check(await visible(p, '#sheet-more #taiji-controls'), '太極頁的「⋯」含模式 / 緯度控制')
  await p.tap('#sheet-more #mode-raw'); await p.waitForTimeout(300)
  check((await p.textContent('#taiji')).includes('原始比例'), '在選單裡切原始比例 → 太極更新')
  await p.screenshot({ path: `${out}/${name}-taiji-more.png` })
  await p.context().close()
}

// 深色主題直向
{
  const p = await open({ width: 390, height: 664 }, 'dark')
  await p.tap('#m-date'); await p.waitForTimeout(350)
  await p.screenshot({ path: `${out}/iphone-dark-date.png` })
  await p.context().close()
}

// 橫向：左右並排、工具列隱藏
{
  console.log('landscape')
  const p = await open({ width: 844, height: 390 })
  check(!(await visible(p, '.mbar')), '橫向不顯示工具列')
  const c = await rect(p, '#card'), pn = await rect(p, '.panel')
  check(c.r <= pn.x && c.b <= 391 && (await visible(p, '.panel #info')), `卡片與面板並排（卡片右 ${c.r.toFixed(0)} ≤ 面板左 ${pn.x.toFixed(0)}）`)
  await p.screenshot({ path: `${out}/landscape.png` })
  await p.context().close()
}

// 桌機回歸：面板內容在面板裡
{
  console.log('desktop')
  const p = await open({ width: 1400, height: 1000 })
  check(!(await visible(p, '.mbar')) && (await visible(p, '.panel #info')) && (await visible(p, '.panel .head-actions')), '桌機：無工具列、面板內容在面板')
  await p.context().close()
}

await browser.close()
check(errors.length === 0, `無 console error ${errors.length ? JSON.stringify(errors) : ''}`)
console.log(fails.length ? `\n${fails.length} FAILED` : '\nALL PASS')
process.exit(fails.length ? 1 : 0)
