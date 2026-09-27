// 介面語言：讀 rswaver 共用 key `rswaver-lang`；zh-tw / zh-cn 用中文介面，其餘用英文
export type Lang = 'zh' | 'en'

const DICT = {
  zh: {
    year: '年', month: '月', today: '今天', play: '播放', pause: '暫停', locate: '使用我的位置',
    foot: '節氣時刻以 UTC+8 計；1929–2100 與香港天文台逐日一致',
    monthName: (m: number) => `${m} 月`,
    termAt: '交節', day: '晝', night: '夜', pentads: '物候', daysToNext: (n: number, name: string) => `距${name}還有 ${n} 天`,
    current: '目前節氣', lat: (v: string) => `晝長以北緯 ${v} 計算`, latSouth: (v: string) => `晝長以南緯 ${v} 計算`,
    locTaipei: '（台北）', locMine: '（你的位置）', locDenied: '無法取得位置，使用台北',
    lengthOfDay: '晝長', source: '出處',
    lang: 'zh' as Lang,
    more: '更多', pickDate: '選擇日期', dateLabel: (y: number, m: number) => `${y} · ${m} 月`,
    viewTaiji: '晝夜太極', viewCards: '節氣卡片',
    taijiTitle: /*brush*/ '冬至一陽生　夏至一陰生', taijiSub: '把一年的晝夜畫成圓 · 晝夜消長自成太極',
    taijiNorm: /*brush*/ '原來太極圖就藏在一年的晝夜裡',
    taijiRaw: /*brush*/ '只有在極圈晝夜才畫得出完整的太極',
    taijiEquator: '赤道附近晝夜幾乎等長，正規化放大了微小差異',
    taijiFoot: (lat: number, mode: string) => `以${lat >= 0 ? '北' : '南'}緯 ${Math.abs(lat).toFixed(1)}° 晝長繪製 · ${mode === 'norm' ? '正規化（最短 → 最長）' : '原始比例（24 小時）'}`,
    modeNorm: '正規化', modeRaw: '原始比例', latitude: '緯度',
    presetEquator: '赤道', presetTaipei: '台北', presetDengfeng: '登封', presetArctic: '北極圈', presetMine: '我的位置',
    explainNorm: '每個方向代表一個時刻，由圓心往外的白色長度 = 當天晝長（縮放到該地最短到最長）。任何緯度都會畫出一條穿過圓心的 S 曲線。',
    explainRaw: '白色長度 = 晝長 / 24 小時。中緯度的晝夜差不夠大，太極在夏至、冬至處接不起來；拉到極圈附近才完整。',
  },
  en: {
    year: 'Year', month: 'Month', today: 'Today', play: 'Play', pause: 'Pause', locate: 'Use my location',
    foot: 'Times in UTC+8; dates match the Hong Kong Observatory for 1929–2100',
    monthName: (m: number) => ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m - 1],
    termAt: 'Begins', day: 'Day', night: 'Night', pentads: 'Pentads', daysToNext: (n: number, name: string) => `${n} days to ${name}`,
    current: 'Current term', lat: (v: string) => `Day length at ${v} N`, latSouth: (v: string) => `Day length at ${v} S`,
    locTaipei: ' (Taipei)', locMine: ' (your location)', locDenied: 'Location unavailable, using Taipei',
    lengthOfDay: 'Daylight', source: 'Source',
    lang: 'en' as Lang,
    more: 'More', pickDate: 'Pick a date', dateLabel: (y: number, m: number) => `${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m - 1]} ${y}`,
    viewTaiji: 'Day-night Taiji', viewCards: 'Term cards',
    taijiTitle: 'Yang is born at the winter solstice, yin at the summer', taijiSub: 'A year of daylight drawn as a circle',
    taijiNorm: 'The taiji hides in a year of days and nights',
    taijiRaw: 'Only near the polar circle does it close into a full taiji',
    taijiEquator: 'Near the equator days barely change; normalizing magnifies tiny differences',
    taijiFoot: (lat: number, mode: string) => `Day length at ${Math.abs(lat).toFixed(1)}° ${lat >= 0 ? 'N' : 'S'} · ${mode === 'norm' ? 'normalized (shortest → longest)' : 'absolute (24 h)'}`,
    modeNorm: 'Normalized', modeRaw: 'Absolute', latitude: 'Latitude',
    presetEquator: 'Equator', presetTaipei: 'Taipei', presetDengfeng: 'Dengfeng', presetArctic: 'Arctic Circle', presetMine: 'My location',
    explainNorm: 'Each direction is a moment of the year; the white length from the center is that day’s daylight, scaled from the local shortest to longest. Every latitude draws an S-curve through the center.',
    explainRaw: 'White length = daylight / 24 h. At mid-latitudes the contrast is too small to close the taiji at the solstices; it only completes near the polar circle.',
  },
}

export type Dict = (typeof DICT)['zh']

export function detectLang(): Lang {
  let v: string | null = null
  try { v = localStorage.getItem('rswaver-lang') } catch { /* 無 storage */ }
  if (v) return v.startsWith('zh') ? 'zh' : 'en'
  return navigator.language.startsWith('zh') ? 'zh' : 'en'
}

export function saveLang(lang: Lang) {
  try { localStorage.setItem('rswaver-lang', lang === 'zh' ? 'zh-tw' : 'en') } catch { /* 無 storage */ }
}

export const t = (lang: Lang): Dict => DICT[lang] as Dict
