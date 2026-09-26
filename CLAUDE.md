# 24 節氣互動網頁（solarterms.rswaver.com）

參考影片：https://x.com/threeaus/status/2103518455404396927（Opus 5.5 做的 24 節氣動畫）

## 定案
- 繁體；緯度 = 瀏覽器定位，失敗 fallback 台北 25.0°；插畫全程序化（SVG + Canvas）
- Vite + TypeScript（無框架）+ vitest；build → `dist/`，部署為獨立 Cloudflare Worker `solarterms`
- 部署與 rswaver 家族規範見 `/e/claude-code/rswaver-portal/`（SERVICES.md → DEPLOY.md、CLAUDE.md §2 §4）
  - 必須淺色 + 深色（夜墨）主題，讀 `localStorage['theme']`；語言讀 `localStorage['rswaver-lang']`（zh-tw / en，其餘 fallback en）
  - 字型自架子集（不用 Google Fonts CDN，無第三方請求）

- 太極：結尾用「正規化晝長」S 曲線（C）；另有「緯度探索」切換原始比例（B），見 `docs/p0/taiji.png`
- 字型：節氣大字 = 正風毛筆 Bold（max32002/masafont，OFL）；內文 = 霞鶩文楷 TC（OFL）；皆由 `scripts/subset-fonts.py` 產子集 woff2

## Source of truth
- 節氣交節時刻：`scripts/gen-terms.mjs`（astronomia VSOP87）→ 產出 `src/data/terms.json`，勿手改 JSON
- 節氣內容（名稱、三候、詩句 + 來源）：`src/data/terms.ts`；詩句新增 / 修改必須附可查證 source URL，作者存疑標「傳」
- 驗證資料：`tests/fixtures/hko-terms.json`（香港天文台 1901–2100，由 `scripts/fetch-hko.py` 抓取）

## 已知差異
- 1929 年前 6 筆節氣日期與 HKO 不同（舊曆時間基準），列於 `tests/astro.test.ts` KNOWN_PRE1929；1929–2100 必須逐日一致

## 指令
- `npm test` / `npm run dev` / `npm run build`
- 截圖驗證：`node scripts/shot.mjs <file|url> <out.png> [w] [h]`（用系統 Chrome）
