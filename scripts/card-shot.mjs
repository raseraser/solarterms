// 截指定節氣卡片（含粒子）：node scripts/card-shot.mjs <url> <out.png> <theme> <月> [節=0|中=1] ...
// 可一次多張：參數後面接多組 "<月>:<0|1>"，輸出並排成一張
import { chromium } from 'playwright'
const [, , url, out, theme, ...specs] = process.argv
const b = await chromium.launch({ channel: 'chrome' })
const p = await b.newPage({ viewport: { width: 1400, height: 1000 } })
await p.addInitScript((t) => localStorage.setItem('theme', t), theme)
await p.goto(url, { waitUntil: 'networkidle' })
const shots = []
for (const s of specs) {
  const [m, second] = s.split(':').map(Number)
  await p.selectOption('#month', String(m))
  if (second) await p.click('#next')
  await p.waitForTimeout(1600)
  shots.push((await (await p.$('#card')).screenshot()).toString('base64'))
}
const sheet = await b.newPage({ viewport: { width: 620 * shots.length, height: 1100 } })
await sheet.setContent(`<body style="margin:0;display:flex;gap:4px">${shots.map((x) => `<img style="width:616px" src="data:image/png;base64,${x}">`).join('')}</body>`)
await sheet.screenshot({ path: out, fullPage: true })
await b.close()
