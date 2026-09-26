// 24 節氣內容資料（曆法順序：0 = 小寒 … 23 = 冬至，與 astro.ts 的 index 一致）
// 三候：《逸周書·時訓解》／《月令七十二候集解》
// 詩句：每句皆經查證，來源 URL 記於 source；作者存疑者 author 標「傳」

export type Season = 'spring' | 'summer' | 'autumn' | 'winter'

export interface SolarTerm {
  name: string
  pinyin: string
  en: string
  season: Season
  /** 三候（初候、次候、末候） */
  pentads: [string, string, string]
  poem: { lines: [string, string]; author: string; title: string; source: string }
  /** P2 場景元素 key */
  scene: string
}

const WS = 'https://zh.wikisource.org/wiki/'

export const TERMS: SolarTerm[] = [
  {
    name: '小寒', pinyin: 'xiǎo hán', en: 'Minor Cold', season: 'winter',
    pentads: ['雁北鄉', '鵲始巢', '雉始雊'],
    poem: { lines: ['牆角數枝梅', '凌寒獨自開'], author: '王安石', title: '梅花', source: WS + '梅花_(王安石)' },
    scene: 'plum',
  },
  {
    name: '大寒', pinyin: 'dà hán', en: 'Major Cold', season: 'winter',
    pentads: ['雞始乳', '征鳥厲疾', '水澤腹堅'],
    poem: { lines: ['爆竹聲中一歲除', '春風送暖入屠蘇'], author: '王安石', title: '元日', source: WS + '元日_(王安石)' },
    scene: 'lantern',
  },
  {
    name: '立春', pinyin: 'lì chūn', en: 'Start of Spring', season: 'spring',
    pentads: ['東風解凍', '蟄蟲始振', '魚陟負冰'],
    poem: { lines: ['律回歲晚冰霜少', '春到人間草木知'], author: '張栻', title: '立春偶成', source: WS + '立春偶成' },
    scene: 'willow',
  },
  {
    name: '雨水', pinyin: 'yǔ shuǐ', en: 'Rain Water', season: 'spring',
    pentads: ['獺祭魚', '候雁北', '草木萌動'],
    poem: { lines: ['好雨知時節', '當春乃發生'], author: '杜甫', title: '春夜喜雨', source: WS + '春夜喜雨' },
    scene: 'rain',
  },
  {
    name: '驚蟄', pinyin: 'jīng zhé', en: 'Awakening of Insects', season: 'spring',
    pentads: ['桃始華', '倉庚鳴', '鷹化為鳩'],
    poem: { lines: ['微雨眾卉新', '一雷驚蟄始'], author: '韋應物', title: '觀田家', source: WS + '全唐詩/卷192' },
    scene: 'peach',
  },
  {
    name: '春分', pinyin: 'chūn fēn', en: 'Spring Equinox', season: 'spring',
    pentads: ['玄鳥至', '雷乃發聲', '始電'],
    poem: { lines: ['仲春初四日', '春色正中分'], author: '徐鉉', title: '春分日', source: WS + '全唐詩/卷751' },
    scene: 'swallow',
  },
  {
    name: '清明', pinyin: 'qīng míng', en: 'Pure Brightness', season: 'spring',
    pentads: ['桐始華', '田鼠化為鴽', '虹始見'],
    poem: { lines: ['清明時節雨紛紛', '路上行人欲斷魂'], author: '傳 杜牧', title: '清明', source: WS + '千家詩/卷三' },
    scene: 'kite',
  },
  {
    name: '穀雨', pinyin: 'gǔ yǔ', en: 'Grain Rain', season: 'spring',
    pentads: ['萍始生', '鳴鳩拂其羽', '戴勝降于桑'],
    poem: { lines: ['二月山家穀雨天', '半坡芳茗露華鮮'], author: '陸希聲', title: '陽羨雜詠·茗坡', source: WS + '全唐詩/卷689' },
    scene: 'tea',
  },
  {
    name: '立夏', pinyin: 'lì xià', en: 'Start of Summer', season: 'summer',
    pentads: ['螻蟈鳴', '蚯蚓出', '王瓜生'],
    poem: { lines: ['綠樹陰濃夏日長', '樓臺倒影入池塘'], author: '高駢', title: '山亭夏日', source: WS + '山亭夏日' },
    scene: 'lotusLeaf',
  },
  {
    name: '小滿', pinyin: 'xiǎo mǎn', en: 'Grain Buds', season: 'summer',
    pentads: ['苦菜秀', '靡草死', '麥秋至'],
    poem: { lines: ['夜來南風起', '小麥覆隴黃'], author: '白居易', title: '觀刈麥', source: WS + '觀刈麥' },
    scene: 'greenWheat',
  },
  {
    name: '芒種', pinyin: 'máng zhòng', en: 'Grain in Ear', season: 'summer',
    pentads: ['螳螂生', '鵙始鳴', '反舌無聲'],
    poem: { lines: ['時雨及芒種', '四野皆插秧'], author: '陸游', title: '時雨', source: 'http://yn.people.com.cn/BIG5/n2/2025/0414/c372453-41195153.html' },
    scene: 'goldWheat',
  },
  {
    name: '夏至', pinyin: 'xià zhì', en: 'Summer Solstice', season: 'summer',
    pentads: ['鹿角解', '蜩始鳴', '半夏生'],
    poem: { lines: ['晝晷已云極', '宵漏自此長'], author: '韋應物', title: '夏至避暑北池', source: WS + '夏至避暑北池' },
    scene: 'sunRays',
  },
  {
    name: '小暑', pinyin: 'xiǎo shǔ', en: 'Minor Heat', season: 'summer',
    pentads: ['溫風至', '蟋蟀居壁', '鷹始摯'],
    poem: { lines: ['荷風送香氣', '竹露滴清響'], author: '孟浩然', title: '夏日南亭懷辛大', source: WS + '夏日南亭懷辛大' },
    scene: 'lotusFlower',
  },
  {
    name: '大暑', pinyin: 'dà shǔ', en: 'Major Heat', season: 'summer',
    pentads: ['腐草為螢', '土潤溽暑', '大雨時行'],
    poem: { lines: ['永日不可暮', '炎蒸毒我腸'], author: '杜甫', title: '夏夜歎', source: WS + '全唐詩/卷217' },
    scene: 'firefly',
  },
  {
    name: '立秋', pinyin: 'lì qiū', en: 'Start of Autumn', season: 'autumn',
    pentads: ['涼風至', '白露降', '寒蟬鳴'],
    poem: { lines: ['乳鴉啼散玉屏空', '一枕新涼一扇風'], author: '劉翰', title: '立秋', source: WS + '千家詩/卷三' },
    scene: 'wutong',
  },
  {
    name: '處暑', pinyin: 'chǔ shǔ', en: 'End of Heat', season: 'autumn',
    pentads: ['鷹乃祭鳥', '天地始肅', '禾乃登'],
    poem: { lines: ['離離暑雲散', '裊裊涼風起'], author: '白居易', title: '早秋曲江感懷', source: WS + '早秋曲江感懷' },
    scene: 'cloud',
  },
  {
    name: '白露', pinyin: 'bái lù', en: 'White Dew', season: 'autumn',
    pentads: ['鴻雁來', '玄鳥歸', '群鳥養羞'],
    poem: { lines: ['蒹葭蒼蒼', '白露為霜'], author: '詩經', title: '秦風·蒹葭', source: WS + '詩經/蒹葭' },
    scene: 'reed',
  },
  {
    name: '秋分', pinyin: 'qiū fēn', en: 'Autumn Equinox', season: 'autumn',
    pentads: ['雷始收聲', '蟄蟲坯戶', '水始涸'],
    poem: { lines: ['自古逢秋悲寂寥', '我言秋日勝春朝'], author: '劉禹錫', title: '秋詞', source: WS + '秋詞_(劉禹錫)' },
    scene: 'geese',
  },
  {
    name: '寒露', pinyin: 'hán lù', en: 'Cold Dew', season: 'autumn',
    pentads: ['鴻雁來賓', '雀入大水為蛤', '菊有黃華'],
    poem: { lines: ['裊裊涼風動', '淒淒寒露零'], author: '白居易', title: '池上', source: WS + '池上_(白居易)' },
    scene: 'chrysanthemum',
  },
  {
    name: '霜降', pinyin: 'shuāng jiàng', en: "Frost's Descent", season: 'autumn',
    pentads: ['豺乃祭獸', '草木黃落', '蟄蟲咸俯'],
    poem: { lines: ['停車坐愛楓林晚', '霜葉紅於二月花'], author: '杜牧', title: '山行', source: WS + '山行_(杜牧)' },
    scene: 'maple',
  },
  {
    name: '立冬', pinyin: 'lì dōng', en: 'Start of Winter', season: 'winter',
    pentads: ['水始冰', '地始凍', '雉入大水為蜃'],
    poem: { lines: ['方過授衣月', '又遇始裘天'], author: '陸游', title: '立冬日作', source: WS + '劎南詩槀_(四庫全書本)/卷38' },
    scene: 'frost',
  },
  {
    name: '小雪', pinyin: 'xiǎo xuě', en: 'Minor Snow', season: 'winter',
    pentads: ['虹藏不見', '天氣上升地氣下降', '閉塞而成冬'],
    poem: { lines: ['晚來天欲雪', '能飲一杯無'], author: '白居易', title: '問劉十九', source: WS + '問劉十九' },
    scene: 'lightSnow',
  },
  {
    name: '大雪', pinyin: 'dà xuě', en: 'Major Snow', season: 'winter',
    pentads: ['鶡鴠不鳴', '虎始交', '荔挺出'],
    poem: { lines: ['千山鳥飛絕', '萬徑人蹤滅'], author: '柳宗元', title: '江雪', source: WS + '江雪' },
    scene: 'heavySnow',
  },
  {
    name: '冬至', pinyin: 'dōng zhì', en: 'Winter Solstice', season: 'winter',
    pentads: ['蚯蚓結', '麋角解', '水泉動'],
    poem: { lines: ['天時人事日相催', '冬至陽生春又來'], author: '杜甫', title: '小至', source: WS + '小至' },
    scene: 'lowSun',
  },
]
