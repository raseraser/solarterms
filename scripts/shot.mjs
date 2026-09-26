// 用 Playwright 把頁面截成 PNG：node scripts/shot.mjs <file|url> <out.png> [width] [height]
// 環境變數：THEME=light|dark 預設主題；LANG_UI=zh-tw|en 介面語言
import { chromium } from 'playwright'
import { pathToFileURL } from 'node:url'
const [, , target, out, w = 1150, h = 900] = process.argv
const url = /^https?:/.test(target) ? target : pathToFileURL(target).href
const b = await chromium.launch({ channel: 'chrome' })
const p = await b.newPage({ viewport: { width: +w, height: +h } })
if (process.env.THEME || process.env.LANG_UI) {
  await p.addInitScript(([t, l]) => { if (t) localStorage.setItem('theme', t); if (l) localStorage.setItem('rswaver-lang', l) }, [process.env.THEME, process.env.LANG_UI])
}
p.on('console', (m) => console.log('console:', m.text()))
p.on('pageerror', (e) => console.log('ERR', e.message))
await p.goto(url)
await p.waitForTimeout(800)
await p.screenshot({ path: out, fullPage: true })
await b.close()
