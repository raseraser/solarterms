# 二十四節氣 · solarterms.rswaver.com

互動式二十四節氣網頁：選擇年份與月份，看每個節氣的交節時刻、晝夜長短、三候與詩詞；
最後把一年的晝夜長短畫成一個圓，會自己長成太極圖。

- 節氣時刻：VSOP87 天文模型預先算好 1900–2100 年，時間以 UTC+8 為準；
  1929–2100 年跟香港天文台公告的節氣表逐日比對，全部一致
- 晝長：由太陽赤緯與所在緯度計算，含大氣折射；緯度取瀏覽器定位（只在瀏覽器內使用，不會上傳），失敗時用台北
- 24 組季節場景全部用程式畫（SVG + Canvas），深淺兩種主題，系統開「減少動態效果」時關閉動畫
- 字型：正風毛筆字體、霞鶩文楷 TC（皆為 SIL OFL 1.1，只取用到的字，見 `public/fonts/`）

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # 單元測試（天文計算、資料、太極幾何）
npm run build      # → dist/
npx wrangler deploy
```

參考：[@threeaus 的 24 節氣動畫](https://x.com/threeaus/status/2103518455404396927)
