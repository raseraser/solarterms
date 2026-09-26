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
  },
  en: {
    year: 'Year', month: 'Month', today: 'Today', play: 'Play', pause: 'Pause', locate: 'Use my location',
    foot: 'Times in UTC+8; dates match the Hong Kong Observatory for 1929–2100',
    monthName: (m: number) => ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m - 1],
    termAt: 'Begins', day: 'Day', night: 'Night', pentads: 'Pentads', daysToNext: (n: number, name: string) => `${n} days to ${name}`,
    current: 'Current term', lat: (v: string) => `Day length at ${v} N`, latSouth: (v: string) => `Day length at ${v} S`,
    locTaipei: ' (Taipei)', locMine: ' (your location)', locDenied: 'Location unavailable, using Taipei',
    lengthOfDay: 'Daylight', source: 'Source',
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
