const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const dataDir = path.join(rootDir, 'data');
const outHtmlPath = path.join(rootDir, 'index.html');

// Load verified full-prefecture YouTube corpus
const videos = JSON.parse(fs.readFileSync(path.join(dataDir, 'yt_videos_clean.json'), 'utf8'));
// Load REAL road-network routes fetched from OSRM (2,158 road-hugging vertices)
const osrmRoutes = JSON.parse(fs.readFileSync(path.join(dataDir, 'osrm_routes.json'), 'utf8'));
// Load curated Miyazaki web guides (travel, shopping, souvenirs, food)
const webGuidesPath = path.join(dataDir, 'web_guides.json');
const webGuides = fs.existsSync(webGuidesPath)
  ? JSON.parse(fs.readFileSync(webGuidesPath, 'utf8'))
  : [];
const lastUpdated = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei' }).format(new Date());

const compactVideos = videos.map(v => ({
  id: v.id, t: v.title, c: v.channel, v: v.views, l: v.length, p: v.published, g: v.tags || []
}));

const topicDefs = [
  { key: 'shopping', label: '宮崎購物｜伴手禮・商場・機場・土產採買', color: '#9C7A3C' },
  { key: 'hyuga', label: '縣北沿海｜日向市（馬背・祈願之海・大御神社・美美津）', color: '#3B6E8C' },
  { key: 'karamen', label: '宮崎餐桌｜辛麵・烏龍麵・芒果甜點', color: '#A65D57' },
  { key: 'takachiho', label: '縣北山區｜高千穗峽・真名井瀑布', color: '#4A7C59' },
  { key: 'aoshima', label: '縣央海濱｜青島神社・鬼之洗衣板', color: '#487B8C' },
  { key: 'west_kirishima', label: '縣西霧島｜蝦野高原・關之尾瀑布・高千穗牧場', color: '#7B6D8D' },
  { key: 'nichinan', label: '縣南海岸｜日南海岸・堀切峠・道之驛', color: '#C66B3D' },
  { key: 'udo', label: '縣南海岸｜鵜戶神宮（海崖洞窟）', color: '#8F3D38' },
  { key: 'saito_aya', label: '縣央內陸｜西都原古墳群・綾照葉大吊橋', color: '#6E7F6B' },
  { key: 'beef', label: '宮崎餐桌｜頂級宮崎牛（燒肉・鐵板燒）', color: '#DC2626' },
  { key: 'nanban', label: '宮崎餐桌｜元祖南蠻炸雞（延岡・宮崎）', color: '#B5894C' },
  { key: 'moai', label: '縣南海岸｜日南太陽花園（摩艾石像）', color: '#9A8455' },
  { key: 'amanoiwato', label: '縣北山區｜天岩戶神社・天安河原', color: '#587A6E' },
  { key: 'obi', label: '縣南內陸｜飫肥城下町（九州小京都）', color: '#8C6248' },
  { key: 'hotel', label: '宿泊溫泉｜喜來登渡假村・溫泉旅館', color: '#5B6C7D' },
  { key: 'jidori', label: '宮崎餐桌｜炭火烤地頭雞（丸萬等）', color: '#8B5A3C' },
  { key: 'miyazakijingu', label: '縣央市區｜宮崎神宮・平和台公園', color: '#687A68' },
  { key: 'toi', label: '縣南最端｜都井岬（野生御崎馬）', color: '#7A6855' }
];

const topicStats = topicDefs.map(td => ({
  ...td,
  count: compactVideos.filter(v => v.g.includes(td.key)).length
})).sort((a, b) => b.count - a.count);

const REGIONS = [
  { id: 'north_coast', name: '縣北沿海（日向市・延岡市）', color: '#3B6E8C', poly: [[32.64, 131.50], [32.64, 131.78], [32.28, 131.74], [32.28, 131.50]] },
  { id: 'north_mountain', name: '縣北山區（高千穗町）', color: '#4A7C59', poly: [[32.80, 131.20], [32.80, 131.44], [32.64, 131.44], [32.64, 131.20]] },
  { id: 'central', name: '縣央（宮崎市・西都市・綾町）', color: '#6E7F6B', poly: [[32.18, 131.12], [32.18, 131.54], [31.79, 131.54], [31.79, 131.12]] },
  { id: 'south_coast', name: '縣南（日南市・串間市）', color: '#C66B3D', poly: [[31.79, 131.24], [31.79, 131.54], [31.32, 131.52], [31.32, 131.24]] },
  { id: 'west_kirishima', name: '縣西霧島（都城市・蝦野市・小林市）', color: '#7B6D8D', poly: [[32.04, 130.76], [32.04, 131.12], [31.68, 131.12], [31.68, 130.76]] }
];

// Build exact leg lookup from OSRM real road routing
const legByToId = {};
for (const d of [1, 2, 3, 4]) {
  for (const lg of osrmRoutes[d].legs) {
    legByToId[`${d}:${lg.to}`] = { km: lg.km, min: lg.min };
  }
}

const pois = [
  // DAY 1
  {
    id: 'd1-1', day: 1, seq: 1, region: 'central', area: '宮崎市', elev: 6,
    parkBadge: '租車據點', parkDetail: '機場旁各家租車營業所免費接駁，出發前確認 ETC 卡與車機 Mapcode 功能。',
    name: '宮崎九重葛機場（KMI 取車）', jp: '宮崎ブーゲンビリア空港',
    cat: 'transport', time: '09:30 - 10:15', stay: '45 分鐘',
    lat: 31.8728, lng: 131.4417, mapcode: '66 135 552*14', tag: 'drive',
    summary: '於宮崎機場領取租車，正式展開沿實際公路路網串聯五大分區的全宮崎縣 4 天 3 夜環縣自駕旅程。',
    tips: '建議加租 ETC 卡搭配東九州自動車道（E10）與宮崎自動車道，行車流暢省時。'
  },
  {
    id: 'd1-2', day: 1, seq: 2, region: 'central', area: '宮崎市', elev: 14,
    parkBadge: 'P 免費', parkDetail: '宮崎神宮西神苑免費停車場（約 150 位）＆ 平和台公園免費大型停車場（約 250 位）。',
    name: '宮崎神宮・平和台公園', jp: '宮崎神宮・平和台公園',
    cat: 'spot', time: '10:35 - 11:45', stay: '70 分鐘',
    lat: 31.9385, lng: 131.4235, mapcode: '66 341 537*22', tag: 'miyazakijingu',
    summary: '走訪祭祀神武天皇的素木檜木社殿「宮崎神宮」，順遊北側丘陵上的平和台公園和平之塔與森林埴輪園。',
    tips: '兩地相距僅 5 分鐘車程，均設寬敞免費停車場。'
  },
  {
    id: 'd1-3', day: 1, seq: 3, region: 'central', area: '西都市', elev: 68,
    parkBadge: 'P 免費', parkDetail: 'このはな館前大型免費停車場（約 500 位），春櫻與秋波斯菊花季建議中午前抵達。',
    name: '西都原古墳群（特別史蹟）', jp: '西都原古墳群',
    cat: 'spot', time: '12:20 - 13:30', stay: '70 分鐘',
    lat: 32.1136, lng: 131.3903, mapcode: '66 854 714*55', tag: 'saito_aya',
    summary: '縣央內陸代表景點！日本最大規模古墳群（311 座古墳）散布於廣闊台地，春賞櫻花油菜花、秋賞 300 萬株波斯菊花海。',
    tips: '可順遊免費參觀的宮崎縣立西都原考古博物館，建築本身極具極簡清水模美感。'
  },
  {
    id: 'd1-4', day: 1, seq: 4, region: 'north_coast', area: '日向市', elev: 8,
    parkBadge: 'P 免費(停外圍)', parkDetail: '歷史老街巷道狹窄，請停放外圍「美々津觀光免費停車場（約 30 位）」步行 3 分鐘逛老街。',
    name: '美美津歷史街區（日向市古港）', jp: '美々津重要伝統的建造物群保存地区',
    cat: 'spot', time: '14:15 - 15:10', stay: '55 分鐘',
    lat: 32.3374, lng: 131.6111, mapcode: '175 681 428*72', tag: 'hyuga',
    summary: '踏入日向市！傳說神武天皇東征出航古港，保留江戶至明治時代白牆京格子町家與石板路，靜謐如畫。',
    tips: '推薦順遊立磐神社與 3 分鐘外的「道之驛日向」採買平兵衛酢（へべす）。'
  },
  {
    id: 'd1-5', day: 1, seq: 5, region: 'north_coast', area: '日向市', elev: 20,
    parkBadge: 'P 免費', parkDetail: '大御神社鳥居旁專屬免費停車場（約 50 位），步行 2 分鐘即達本殿與龍宮洞口。',
    name: '大御神社（日向之伊勢・昇龍岩洞）', jp: '大御神社',
    cat: 'spot', time: '15:25 - 16:10', stay: '45 分鐘',
    lat: 32.4110, lng: 131.6494, mapcode: '175 894 553*11', tag: 'hyuga',
    summary: '建於太平洋柱狀節理岩盤上的千年海景古社！境內有日本最大規模細石（さざれ石）群，從後方龍宮岩洞回望天空可見巨龍剪影。',
    tips: '日向市必訪能量聖地（76 部 YouTube 影片聚焦日向・延岡），海風與海浪聲極為療癒。'
  },
  {
    id: 'd1-6', day: 1, seq: 6, region: 'north_coast', area: '日向市', elev: 48,
    parkBadge: 'P 免費(20位)', parkDetail: '展望台前免費停車場（約 20 位），進出細島岬道路略窄，請慢速會車。',
    name: '祈願之海（クルスの海）', jp: '願いが叶うクルスの海',
    cat: 'spot', time: '16:20 - 16:45', stay: '25 分鐘',
    lat: 32.4190, lng: 131.6778, mapcode: '175 925 274*42', tag: 'hyuga',
    summary: '日向岬細島半島奇觀！海浪侵蝕柱狀岩脈形成十字海峽，與旁側岩石拼出漢字「叶」（實現願望），展望台設有祈願鐘。',
    tips: '於 Esri 衛星影像或國土地理院航空寫真放大即可一眼辨識天然「叶」字海灣！'
  },
  {
    id: 'd1-7', day: 1, seq: 7, region: 'north_coast', area: '日向市', elev: 72,
    parkBadge: 'P 免費', parkDetail: '馬ヶ背茶屋免費停車場（約 60 位），停妥後沿平緩海濱步道步行 5 分鐘至斷崖玻璃台。',
    name: '馬背展望台（日本第一柱狀節理斷崖）', jp: '馬ヶ背',
    cat: 'spot', time: '16:50 - 17:35', stay: '45 分鐘',
    lat: 32.4254, lng: 131.6843, mapcode: '175 925 788*66', tag: 'hyuga',
    summary: '高達 70 公尺、縱深 200 公尺的垂直柱狀節理海蝕斷崖，站上玻璃懸空平台「スケルッチャ」直視太平洋驚濤拍岸。',
    tips: '可順路於「海の駅ほそしま」品嚐現撈日向灘吻仔魚與海鮮丼。'
  },
  {
    id: 'd1-8', day: 1, seq: 8, region: 'north_coast', area: '延岡市', elev: 251,
    parkBadge: 'P 山頂免費/市區收費', parkDetail: '愛宕山展望台設免費停車場；延岡市區吃「直ちゃん」無專屬車位，需停延岡站周邊收費 P（約 ¥200）或下榻飯店停車場。',
    name: '愛宕山展望台・延岡元祖美食夜宿', jp: '延岡市・愛宕山展望台',
    cat: 'stay', time: '18:15 - 21:00', stay: '晚餐＆宿延岡',
    lat: 32.5621, lng: 131.6697, mapcode: '204 285 415*08', tag: 'hyuga',
    summary: '北抵延岡市！登日本夜景遺產愛宕山眺望延岡灣，晚餐直奔「直ちゃん（元祖南蠻雞）」或「辛麺屋桝元本店」，宿延岡市區。',
    tips: '住延岡可讓 Day 02 清晨僅需 45 分鐘即可抵達高千穗峽搶早班划船與御塩井車位。'
  },

  // DAY 2
  {
    id: 'd2-1', day: 2, seq: 1, region: 'north_mountain', area: '高千穗町', elev: 315,
    parkBadge: 'P ¥500 / 免費備案', parkDetail: '最推薦 08:30 前搶「第1御塩井停車場（¥500/次・僅35位・走3分）」；滿位改停「第2あららぎ（免費・80位・下坡走8分）」。',
    name: '高千穗峽・真名井瀑布（峽谷划船）', jp: '高千穂峡・真名井の滝',
    cat: 'spot', time: '08:30 - 11:00', stay: '150 分鐘',
    lat: 32.7022, lng: 131.3010, mapcode: '333 762 254*45', tag: 'takachiho',
    summary: '深入縣北神話山區（65 部影片推薦）！火山柱狀節理溪谷划船仰望 17m 真名井瀑布，午餐於「千穂の家」品嚐元祖竹筒流水麵。',
    tips: '划船務必提前 2 週於官網搶票；從延岡走免費北方延岡道路（實際路網 51.8 km / 45 分）相當順暢。'
  },
  {
    id: 'd2-2', day: 2, seq: 2, region: 'north_mountain', area: '高千穗町', elev: 342,
    parkBadge: 'P 免費', parkDetail: '舊高千穗站前專屬免費停車場（約 40 位），滿位可停步行 3 分鐘的高千穗町營停車場。',
    name: '高千穗天照鐵道（105m 高空鐵橋）', jp: '高千穂あまてらす鉄道',
    cat: 'spot', time: '11:20 - 12:15', stay: '55 分鐘',
    lat: 32.7147, lng: 131.3069, mapcode: '333 823 237*74', tag: 'takachiho',
    summary: '搭乘廢線敞篷景觀小火車「Super Cart」，穿越隧道駛上距溪谷 105 公尺的高千穗鐵橋，飽覽深綠山谷全景。',
    tips: '現場購票領號碼牌；附近「高千穗神社」與「がまだせ市場」皆設免費停車場。'
  },
  {
    id: 'd2-3', day: 2, seq: 3, region: 'north_mountain', area: '高千穗町', elev: 385,
    parkBadge: 'P 免費', parkDetail: '天岩戶神社西本宮第 1・第 2 免費停車場（約 120 位），停妥後步行 10 分鐘至天安河原巨洞。',
    name: '天岩戶神社・天安河原', jp: '天岩戸神社・天安河原',
    cat: 'spot', time: '12:40 - 14:00', stay: '80 分鐘',
    lat: 32.7377, lng: 131.3532, mapcode: '333 886 673*33', tag: 'amanoiwato',
    summary: '太陽神天照大神神話發源地。隨西本宮導覽遙拜神聖洞窟，再沿清溪走進「天安河原」巨洞欣賞滿山祈願疊石。',
    tips: '時間充裕可加碼 15 分鐘外的國見之丘展望台（免費停車）遠眺阿蘇五岳。'
  },
  {
    id: 'd2-4', day: 2, seq: 4, region: 'central', area: '綾町', elev: 295,
    parkBadge: 'P 免費', parkDetail: '吊橋管理棟前免費大型停車場（約 150 位），山路彎道多請預留約 2 小時行車時間。',
    name: '綾照葉大吊橋（UNESCO 照葉林）', jp: '綾の照葉大吊橋',
    cat: 'spot', time: '16:00 - 16:50', stay: '50 分鐘',
    lat: 32.0298, lng: 131.1943, mapcode: '66 599 162*77', tag: 'saito_aya',
    summary: '南返縣央時深入聯合國教科文組織照葉林保護區，踏上長 250 公尺、高 142 公尺的壯麗吊橋俯瞰原始常綠森林。',
    tips: '附近「綾国際クラフトの城」設免費停車場，可採買天然原木餐具、草木染與綾玻璃工藝。'
  },
  {
    id: 'd2-5', day: 2, seq: 5, region: 'central', area: '宮崎市', elev: 9,
    parkBadge: 'P 飯店/市區收費', parkDetail: '橘通與西橘通名店均無專屬免費車位！最省心做法：直接停放住宿飯店停車場（約 ¥800–¥1,200/晚）後步行掃街。',
    name: '橘通市區美食夜宴＆購物', jp: '橘通り・ニシタチ',
    cat: 'stay', time: '18:00 - 21:30', stay: '晚餐＆宿宮崎',
    lat: 31.9156, lng: 131.4225, mapcode: '66 281 174*05', tag: 'beef',
    summary: '入住宮崎車站或橘通飯店，夜晚步行巡禮「ミヤチク APAS（宮崎牛）」、「丸萬燒鳥（地頭雞）」、「織田薪（釜揚烏龍）」與「フルーツ大野（芒果聖代）」。',
    tips: '若單純開車來用餐，可停山形屋周邊或橘通投幣式立體停車場（夜間上限約 ¥600–¥800）。'
  },

  // DAY 3
  {
    id: 'd3-1', day: 3, seq: 1, region: 'central', area: '宮崎市青島', elev: 4,
    parkBadge: 'P ¥500(需步行)', parkDetail: '青島禁止汽機車入島！請停放「青島參道南廣場公營停車場（¥500/次・約 180 位）」，步行 8–10 分鐘過彌生橋參拜。',
    name: '青島神社・鬼之洗衣板', jp: '青島神社・鬼の洗濯板',
    cat: 'spot', time: '08:15 - 09:45', stay: '90 分鐘',
    lat: 31.8045, lng: 131.4749, mapcode: '43 612 154*88', tag: 'aoshima',
    summary: '南下日南海岸首站（52 部影片推薦）！亞熱帶蒲葵林結緣小島與海蝕波狀岩「鬼之洗衣板」，參道商店可買青島煎餅與南國布丁。',
    tips: '建議查詢退潮時間，早晨光影清澈且停車位充裕；別錯過五色「產靈紙縒」結緣祈福。'
  },
  {
    id: 'd3-2', day: 3, seq: 2, region: 'south_coast', area: '宮崎市南端', elev: 58,
    parkBadge: 'P 免費', parkDetail: '道之驛 Phoenix 免費大型海景停車場（約 120 位），出入國道 220 號動線順暢。',
    name: '堀切峠・道之驛 Phoenix', jp: '堀切峠・道の駅フェニックス',
    cat: 'spot', time: '10:00 - 10:40', stay: '40 分鐘',
    lat: 31.7690, lng: 131.4784, mapcode: '43 493 472*05', tag: 'nichinan',
    summary: '沿國道 220 號椰林海景大道駛過堀切峠，於道之驛 Phoenix 觀景台俯瞰太平洋與波狀岩，必吃日向夏霜淇淋。',
    tips: '賣場販售豐富日向夏果凍、沙拉醬與在地農產。'
  },
  {
    id: 'd3-3', day: 3, seq: 3, region: 'south_coast', area: '日南市', elev: 85,
    parkBadge: 'P 免費', parkDetail: 'Sun Messe 日南園區入口免費大型停車場（約 220 位），園內坡度大建議租電動高爾夫球車。',
    name: '日南太陽花園（Sun Messe 摩艾石像）', jp: 'サンメッセ日南',
    cat: 'spot', time: '11:05 - 12:15', stay: '70 分鐘',
    lat: 31.6615, lng: 131.4588, mapcode: '367 752 455*08', tag: 'moai',
    summary: '全球唯一獲復活節島長老會正式授權復刻的 7 座巨型摩艾石像，面海矗立於太平洋草坡。',
    tips: '留意週三公休；紀念品店限定摩艾扭蛋超搶手。'
  },
  {
    id: 'd3-4', day: 3, seq: 4, region: 'south_coast', area: '日南市', elev: 22,
    parkBadge: 'P 免費(注意動線)', parkDetail: '沿新道指標直達「鵜戶神宮海濱觀光免費停車場（約 250 位）」，步行 10–12 分鐘至洞窟本殿；切勿誤駛舊道山頂停車場以免多走長坡！',
    name: '鵜戶神宮（海崖洞窟朱紅神宮）', jp: '鵜戸神宮',
    cat: 'spot', time: '12:35 - 13:50', stay: '75 分鐘',
    lat: 31.6503, lng: 131.4663, mapcode: '296 151 753*41', tag: 'udo',
    summary: '47 部影片力推的太平洋海蝕洞窟朱紅本殿！購買 5 顆「運玉」挑戰投進下方海龜岩凹槽祈求好運。',
    tips: '男左手、女右手投擲運玉；授與所的白色「撫兔土鈴」是人氣紀念品。'
  },
  {
    id: 'd3-5', day: 3, seq: 5, region: 'south_coast', area: '日南市', elev: 32,
    parkBadge: 'P 免費', parkDetail: '飫肥城觀光免費停車場（約 250 位，緊鄰大手門與售票處），停妥後全程步行漫遊最愜意。',
    name: '飫肥城下町（九州小京都・邊走邊吃）', jp: '飫肥城下町',
    cat: 'spot', time: '14:15 - 15:40', stay: '85 分鐘',
    lat: 31.6291, lng: 131.3503, mapcode: '296 082 553*24', tag: 'obi',
    summary: '保存武家屋敷、石垣與錦鯉水渠的歷史古鎮，必訪「おび天蔵」吃現炸飫肥天與布丁般綿密的飫肥厚蛋燒！',
    tips: '南下途中經「道の駅なんごう（免費停車）」可吃完熟芒果霜淇淋；町內推薦選購飫肥杉木作小物。'
  },
  {
    id: 'd3-6', day: 3, seq: 6, region: 'south_coast', area: '串間市', elev: 118,
    parkBadge: 'P 免費(入山¥400)', parkDetail: '燈塔與交流館皆免費停車，但通過駒止門入山需繳 ¥400/車野生馬保護協力金；道路上常有野生馬群，請龜速禮讓！',
    name: '都井岬（宮崎最南端・野生御崎馬）', jp: '都井岬',
    cat: 'spot', time: '16:30 - 17:40', stay: '70 分鐘',
    lat: 31.3675, lng: 131.3457, mapcode: '382 060 278*22', tag: 'toi',
    summary: '直抵宮崎縣最南端串間市！壯闊太平洋斷崖草原棲息百匹野生「御崎馬」，黃昏後經實際公路（69.5 km / 73 分）往西北赴都城市住宿。',
    tips: '都城市區飯店多附設免費或 ¥500 平面停車場，方便隔日一早出發探索霧島。'
  },

  // DAY 4
  {
    id: 'd4-1', day: 4, seq: 1, region: 'west_kirishima', area: '都城市', elev: 155,
    parkBadge: 'P 免費', parkDetail: '關之尾公園大型免費停車場（約 150 位），步行 4 分鐘即達瀑布吊橋與 Snow Peak 咖啡廳。',
    name: '關之尾瀑布・甌穴群（都城）', jp: '関之尾滝',
    cat: 'spot', time: '09:00 - 10:15', stay: '75 分鐘',
    lat: 31.7611, lng: 130.9872, mapcode: '119 428 242*44', tag: 'west_kirishima',
    summary: '日本瀑布百選與世界最大規模天然岩床甌穴群，旁有 Snow Peak 都城營地咖啡；順道可訪「霧島酒造工廠花園」與「道の駅都城 NiQLL（免費停車）」。',
    tips: '都城市為日本產量第一的燒酎與肉類之鄉，道之驛木造建築超好逛！'
  },
  {
    id: 'd4-2', day: 4, seq: 2, region: 'west_kirishima', area: '都城市', elev: 492,
    parkBadge: 'P 免費', parkDetail: '高千穗牧場正門免費超大型停車場（約 500 位），週末中午後車流較多。',
    name: '高千穗牧場（霧島連山牧場）', jp: '高千穂牧場',
    cat: 'spot', time: '10:45 - 11:55', stay: '70 分鐘',
    lat: 31.8427, lng: 130.8786, mapcode: '376 310 568*12', tag: 'west_kirishima',
    summary: '眺望高千穗峰雄姿的霧島山麓牧場，免費入園，必吃超濃郁鮮乳霜淇淋、優格與霧島山景烤肉。',
    tips: '海拔近 500 公尺空氣清冽，賣店自製乳酪與布丁人氣極高。'
  },
  {
    id: 'd4-3', day: 4, seq: 3, region: 'west_kirishima', area: '蝦野市', elev: 1200,
    parkBadge: 'P ¥500/次', parkDetail: 'えびの高原公共停車場（收費 ¥500/次・約 450 位），緊鄰生態博物館與不動池火山湖步道入口。',
    name: '蝦野高原（えびの高原・火山口湖）', jp: 'えびの高原',
    cat: 'spot', time: '12:25 - 13:45', stay: '80 分鐘',
    lat: 31.9422, lng: 130.8454, mapcode: '376 609 327*71', tag: 'west_kirishima',
    summary: '全行程最高海拔秘境（1,200m）！位於霧島錦江灣國立公園核心，漫步赤松林欣賞翡翠藍火山湖「不動池」與韓國岳火口奇景。',
    tips: '經蝦野 IC 上宮崎自動車道返回宮崎市（實際路網 83.4 km / 78 分），氣溫較低備薄外套。'
  },
  {
    id: 'd4-4', day: 4, seq: 4, region: 'central', area: '宮崎市', elev: 6,
    parkBadge: 'P 免費(4,300位)', parkDetail: 'AEON MALL 宮崎提供約 4,300 個免費停車位，是返還租車前整理戰利品與行李最輕鬆的據點！',
    name: '宮崎市區最終美食與伴手禮採買', jp: 'AEON MALL 宮崎・おぐら本店',
    cat: 'food', time: '15:05 - 17:15', stay: '130 分鐘',
    lat: 31.9228, lng: 131.4561, mapcode: '66 314 148*82', tag: 'nanban',
    summary: '返抵宮崎市於 AEON MALL 宮崎（含 MUJI 無印良品、藥妝免稅與超市）一次採買全縣伴手禮，或繞至市區補吃「おぐら本店」南蠻雞。',
    tips: '還車前別忘了在機場周邊自助加油站加滿 Regular 油箱並保留收據。'
  },
  {
    id: 'd4-5', day: 4, seq: 5, region: 'central', area: '宮崎市', elev: 5,
    parkBadge: '租車歸還', parkDetail: '駛回機場旁原租車營業所驗車還車，搭 3 分鐘免費接駁車直達宮崎機場航廈。',
    name: '宮崎九重葛機場（還車＆最後掃貨）', jp: '宮崎ブーゲンビリア空港',
    cat: 'transport', time: '17:35 - 19:00', stay: '還車登機',
    lat: 31.8742, lng: 131.4442, mapcode: '66 135 552*14', tag: 'drive',
    summary: '二樓伴手禮大街補齊起司饅頭、青島煎餅、日向夏果凍與椰蛋樹限定周邊，圓滿完成全宮崎縣 4 天 3 夜環縣旅圖！',
    tips: '燒酎與液體果凍布丁請置於託運行李；肉類地雞製品與鮮果僅限日本當地享用。'
  }
].map(p => {
  const lg = legByToId[`${p.day}:${p.id}`];
  return { ...p, legKm: lg ? lg.km : 0, legMin: lg ? lg.min : 0 };
});

// DEDICATED PARKING GIS LAYER (18 verified key parking lots across all 5 regions)
const PARKING_SPOTS = [
  { id: 'p-1', area: '宮崎市', target: '宮崎神宮', name: '宮崎神宮 西神苑停車場', fee: '免費', paid: false, cap: '約 150 位', walk: '步行 2 分鐘', lat: 31.9361, lng: 131.4230, note: '入口寬敞好停，鄰近西神苑廁所與參道。' },
  { id: 'p-2', area: '西都市', target: '西都原古墳群', name: '西都原 このはな館停車場', fee: '免費', paid: false, cap: '約 500 位', walk: '步行 1 分鐘', lat: 32.1132, lng: 131.3910, note: '花季期間上午 10 點後車流增，建議早到。' },
  { id: 'p-3', area: '日向市', target: '美美津歷史街區', name: '美々津觀光停車場（外圍）', fee: '免費', paid: false, cap: '約 30 位', walk: '步行 3 分鐘', lat: 32.3385, lng: 131.6104, note: '古港町家巷弄狹窄禁止大車進入，務必停外圍。' },
  { id: 'p-4', area: '日向市', target: '大御神社', name: '大御神社 參拜者停車場', fee: '免費', paid: false, cap: '約 50 位', walk: '步行 2 分鐘', lat: 32.4114, lng: 131.6485, note: '緊鄰鳥居入口，海風強開車門請留意。' },
  { id: 'p-5', area: '日向市', target: '祈願之海', name: 'クルスの海 展望台停車場', fee: '免費', paid: false, cap: '約 20 位', walk: '步行 1 分鐘', lat: 32.4193, lng: 131.6768, note: '車位較少但周轉快，細島岬道路略窄留意會車。' },
  { id: 'p-6', area: '日向市', target: '馬背展望台', name: '馬ヶ背茶屋 停車場', fee: '免費', paid: false, cap: '約 60 位', walk: '步行 5 分鐘', lat: 32.4265, lng: 131.6858, note: '停妥後沿步道步行至 70m 斷崖與玻璃觀景台。' },
  { id: 'p-7', area: '延岡市', target: '直ちゃん・延岡美食', name: '延岡站前周邊收費停車場', fee: '約 ¥100–¥200/hr', paid: true, cap: '多處投幣 P', walk: '步行 3–5 分鐘', lat: 32.5882, lng: 131.6716, note: '名店「直ちゃん」無專屬停車場，請利用站前投幣式停車場。' },
  { id: 'p-8', area: '高千穗町', target: '高千穗峽（首選）', name: '高千穗峽 第1御塩井停車場', fee: '¥500 / 次', paid: true, cap: '僅約 35 位', walk: '步行 3 分鐘至划船處', lat: 32.7016, lng: 131.3004, note: '距真名井瀑布與划船處最近！極易客滿，旺季建議 08:30 前抵達。' },
  { id: 'p-9', area: '高千穗町', target: '高千穗峽（免費備案）', name: '高千穗峽 第2あららぎ停車場', fee: '免費', paid: false, cap: '約 80 位', walk: '下坡步行 8 分鐘', lat: 32.7056, lng: 131.2974, note: '第1停車場滿位時的最佳免費備案！回程為上坡略耗體力。' },
  { id: 'p-10', area: '高千穗町', target: '天岩戶神社・天安河原', name: '天岩戶神社 西本宮停車場', fee: '免費', paid: false, cap: '約 120 位', walk: '步行 2 分至神社 / 10 分至河原', lat: 32.7340, lng: 131.3502, note: '第 1 與第 2 停車場皆免費，並設有乾淨公廁與賣店。' },
  { id: 'p-11', area: '綾町', target: '綾照葉大吊橋', name: '照葉大吊橋 管理棟停車場', fee: '免費', paid: false, cap: '約 150 位', walk: '步行 2 分鐘', lat: 32.0294, lng: 131.1950, note: '上山道路彎曲，注意對向來車與山區落葉。' },
  { id: 'p-12', area: '宮崎市', target: '橘通美食（APAS/おぐら/丸萬）', name: '橘通周邊立體・投幣停車場', fee: '¥200/hr（夜間上限 ¥700）', paid: true, cap: '大型立體 P', walk: '步行 2–5 分鐘', lat: 31.9154, lng: 131.4242, note: '宮崎市中心美食老店多無免費車位；建議入住市區飯店停車後步行掃街。' },
  { id: 'p-13', area: '宮崎市青島', target: '青島神社', name: '青島參道南廣場 公營停車場', fee: '¥500 / 次', paid: true, cap: '約 180 位', walk: '步行 8–10 分鐘過橋', lat: 31.7998, lng: 131.4687, note: '青島島上禁行一般車輛，此為距青島參道最近之公營大型停車場。' },
  { id: 'p-14', area: '日南市', target: '日南太陽花園', name: 'サンメッセ日南 園區停車場', fee: '免費', paid: false, cap: '約 220 位', walk: '入口直達', lat: 31.6606, lng: 131.4581, note: '停車免費，但從停車場上摩艾廣場為長斜坡，長輩推薦租電動球車。' },
  { id: 'p-15', area: '日南市', target: '鵜戶神宮', name: '鵜戶神宮 海濱觀光停車場', fee: '免費', paid: false, cap: '約 250 位', walk: '海濱步行 10–12 分鐘', lat: 31.6478, lng: 131.4673, note: '務必依國道新隧道指標開至此海濱停車場，避免誤入山頂舊道多爬階梯！' },
  { id: 'p-16', area: '日南市飫肥', target: '飫肥城下町', name: '飫肥城 觀光免費停車場', fee: '免費', paid: false, cap: '約 250 位', walk: '步行 1 分至大手門', lat: 31.6275, lng: 131.3522, note: '緊鄰邊走邊吃地圖售票處與おび天蔵，非常方便。' },
  { id: 'p-17', area: '串間市', target: '都井岬', name: '都井岬燈塔・交流館停車場', fee: '停車免費（入山 ¥400）', paid: true, cap: '約 100 位', walk: '步行 2 分鐘', lat: 31.3672, lng: 131.3448, note: '通過駒止門繳交 ¥400 保護金即可自由停靠草原與燈塔各免費車位。' },
  { id: 'p-18', area: '蝦野市', target: '蝦野高原・不動池', name: 'えびの高原 公共停車場', fee: '¥500 / 次', paid: true, cap: '約 450 位', walk: '直結火山湖步道', lat: 31.9456, lng: 130.8431, note: '電子收費閘門可付現金，旁有生態博物館與廁所補給。' }
];

const FOOD_SPOTS = [
  { id: 'f-1', area: '延岡市', region: 'north_coast', tag: 'nanban', name: 'お食事の店 直ちゃん', sub: '元祖「無塔塔醬」南蠻炸雞發祥老舖', dish: 'チキン南蛮定食（約 ¥1,100）', hours: '11:00-13:45 / 17:00-19:45（週二休）', lat: 32.5891, lng: 131.6706, mapcode: '204 375 335*42', park: '無專屬車位，停延岡站前收費 P 走 3 分', desc: '昭和 30 年代誕生於延岡的南蠻雞始祖！薄脆蛋衣包裹嫩雞胸肉淋上清爽甘醋，越吃越順口。' },
  { id: 'f-2', area: '延岡市', region: 'north_coast', tag: 'karamen', name: '辛麺屋 桝元 本店', sub: '宮崎辛麵發祥總本店', dish: '元祖辛麵・蒟蒻麵（0辛～25辛，約 ¥950）', hours: '11:00-22:00', lat: 32.5803, lng: 131.6679, mapcode: '204 345 147*11', park: '附設少量店鋪車位／周邊收費 P', desc: '發源於延岡市的宮崎靈魂麵食！大蒜、蛋花、韭菜辛香高湯搭 Q 彈低卡蒟蒻麵。' },
  { id: 'f-3', area: '日向市', region: 'north_coast', tag: 'hyuga', name: '海の駅 ほそしま（細島港）', sub: '日向灘現撈海鮮 × 平兵衛酢名物', dish: '生吻仔魚海鮮丼・平兵衛酢炸雞（約 ¥1,500）', hours: '11:00-15:00（物產館 9:30-17:30）', lat: 32.4274, lng: 131.6634, mapcode: '175 954 114*55', park: '漁港旁大型免費停車場（約 80 位）', desc: '日向市細島漁港直營海鮮食堂！鮮撈漁獲擠上日向市特產平兵衛酢柑橘汁提鮮。' },
  { id: 'f-4', area: '高千穗町', region: 'north_mountain', tag: 'takachiho', name: '千穂の家 元祖流しそうめん', sub: '高千穗峽元祖竹筒流水麵', dish: '元祖流水麵（¥700）・鹽烤香魚・高千穗牛', hours: '10:00-16:30', lat: 32.7016, lng: 131.3013, mapcode: '333 762 254*45', park: '停高千穗峽御塩井（¥500）步行 2 分', desc: '緊鄰真名井瀑布的流水麵發源名店！清冽阿蘇湧水沿青竹滑下冰涼素麵，趣味十足。' },
  { id: 'f-5', area: '宮崎市', region: 'central', tag: 'beef', name: '橘通り ミヤチク APAS', sub: 'A5 頂級宮崎牛（農協直營）', dish: '宮崎牛鐵板燒午晚間套餐・燒肉（¥3,500～）', hours: '11:00-15:00 / 17:00-22:00', lat: 31.9156, lng: 131.4225, mapcode: '66 281 174*05', park: '周邊收費停車場（建議停飯店步行）', desc: '連奪日本和牛奧運冠軍的宮崎牛代表餐廳，午間套餐性價比極高，務必事先線上訂位。' },
  { id: 'f-6', area: '宮崎市', region: 'central', tag: 'nanban', name: '味のおぐら 本店', sub: '元祖「塔塔醬」南蠻炸雞名店', dish: 'おぐらのチキン南蛮（約 ¥1,300）', hours: '11:00-15:00 / 17:00-20:30（週二休）', lat: 31.9159, lng: 131.4236, mapcode: '66 281 178*77', park: '無免費車位，停橘通／山形屋周邊收費 P', desc: '塔塔醬南蠻炸雞發源地！金黃酥軟雞胸淋滿濃郁手工塔塔醬與甘醋。' },
  { id: 'f-7', area: '宮崎市', region: 'central', tag: 'jidori', name: '丸万焼鳥 本店', sub: '炭火燻烤宮崎地頭雞元祖老店', dish: '炭火烤雞腿 もも焼き（約 ¥1,400）', hours: '17:00-22:30（週日休）', lat: 31.9144, lng: 131.4217, mapcode: '66 281 021*47', park: '西橘通徒步區，請停飯店或周邊投幣 P', desc: '創業逾半世紀！大火炭煙燻出獨特焦黑炭香與彈牙肉質，附雞清湯與脆小黃瓜。' },
  { id: 'f-8', area: '宮崎市', region: 'central', tag: 'karamen', name: '釜揚げうどん 織田薪 本店', sub: '宮崎夜生活靈魂宵夜・釜揚烏龍麵', dish: '釜揚烏龍麵（並 ¥700）・稻荷壽司', hours: '19:00-23:30（週日休）', lat: 31.9148, lng: 131.4215, mapcode: '66 281 051*14', park: '西橘通徒步區，建議停飯店步行', desc: '宮崎人酒後必訪 50 年老舖！熱騰騰細滑手打烏龍麵沾柴魚柚子皮溫熱湯汁。' },
  { id: 'f-9', area: '宮崎市', region: 'central', tag: 'karamen', name: '一平寿し（元祖レタス巻）', sub: '宮崎發源元祖「萵苣鮮蝦捲」', dish: '元祖萵苣捲（約 ¥1,100）・散壽司', hours: '11:00-21:00（週三休）', lat: 31.9078, lng: 131.4269, mapcode: '66 252 448*63', park: '店鋪旁附設免費專屬停車場（約 25 位）', desc: '昭和 41 年發明的宮崎經典壽司！脆甜萵苣、大尾鮮蝦與特調美乃滋捲入海苔醋飯。' },
  { id: 'f-10', area: '宮崎市', region: 'central', tag: 'karamen', name: 'フルーツ大野', sub: '老舖果物直營・完熟芒果聖代', dish: '宮崎完熟芒果聖代・季節聖代（¥1,200～）', hours: '11:00-22:00（不定休）', lat: 31.9121, lng: 131.4211, mapcode: '66 251 741*11', park: '無免費車位，周邊多投幣停車場', desc: '人氣第一水果聖代店！4–8 月可大啖太陽之子完熟芒果，秋冬亦有多款鮮果聖代。' },
  { id: 'f-11', area: '日南市飫肥', region: 'south_coast', tag: 'obi', name: '郷土料理 おび天蔵', sub: '飫肥城下町名物「飫肥天＆厚蛋燒」', dish: '現炸飫肥天・飫肥天定食（約 ¥1,100）', hours: '11:00-15:00', lat: 31.6268, lng: 131.3520, mapcode: '296 082 371*22', park: '停飫肥城免費觀光停車場步行 2 分', desc: '江戶古倉庫裡的日南鄉土名店！魚漿混入豆腐與黑糖酥炸的飫肥天外酥內軟甘甜。' },
  { id: 'f-12', area: '都城市', region: 'west_kirishima', tag: 'west_kirishima', name: '霧島ファクトリーガーデン', sub: '黑霧島燒酎酒廠直營餐廳＆啤酒館', dish: '霧島和牛漢堡排・限定精釀啤酒・試飲', hours: '11:00-21:00（物產館 9:00-21:00）', lat: 31.7423, lng: 131.0607, mapcode: '119 376 742*88', park: '園區附設大型免費停車場（約 200 位）', desc: '黑霧島燒酎釀造工廠園區！紅磚建築結合餐廳、麵包坊與限定燒酎物產館（駕駛切勿飲酒）。' }
];

const SHOP_SPOTS = [
  { id: 's-1', area: '宮崎市', region: 'central', tag: 'karamen', name: 'みやざき物産館 KONNE', sub: '宮崎縣廳旁官方最強全縣特產總匯', items: '起司饅頭全品牌・戶村燒肉醬・日向夏・平兵衛酢・宮崎犬・傳統工藝', hours: '09:00-18:00', lat: 31.9107, lng: 131.4246, mapcode: '66 251 784*22', park: '縣廳外來免費停車（限時）或周邊收費 P', desc: '一站買齊全宮崎 26 市町村精選特產與紀念品的首選！' },
  { id: 's-2', area: '宮崎市', region: 'central', tag: 'drive', name: 'AMU PLAZA 宮崎・ひむかきらめき市場', sub: 'JR 宮崎站共構時尚商場與伴手禮市集', items: '日系服飾雜貨・青島煎餅・南國布丁・日向夏和菓子・地酒專賣', hours: '10:00-20:00', lat: 31.9149, lng: 131.4315, mapcode: '66 282 140*55', park: '共構立體停車場（消費滿額折抵停車費）', desc: '宮崎站前最新地標商場與車站直結特產市集，採買最便利。' },
  { id: 's-3', area: '宮崎市', region: 'central', tag: 'karamen', name: '宮崎山形屋（百貨地下銘菓街）', sub: '創業百年在地老牌百貨公司', items: '風月堂起司饅頭・日高大福・高品質宮崎茶・佐土原人形', hours: '10:00-19:00', lat: 31.9161, lng: 131.4237, mapcode: '66 281 208*62', park: '山形屋特約立體停車場（購物折抵）', desc: '地下一樓食品館匯集講究的銘菓禮盒，適合送長輩高質感手信。' },
  { id: 's-4', area: '宮崎市', region: 'central', tag: 'karamen', name: 'AEON MALL 宮崎', sub: '南九州最大規模大型購物中心', items: 'MUJI 無印良品・Uniqlo・藥妝免稅・大型超市特產・伴手禮專櫃', hours: '10:00-21:00', lat: 31.9228, lng: 131.4561, mapcode: '66 314 148*82', park: '約 4,300 位完全免費停車場', desc: '超過 250 間專櫃與超大型 AEON 超市，停車免費無壓力！' },
  { id: 's-5', area: '宮崎市', region: 'central', tag: 'drive', name: '宮崎九重葛機場 2F 伴手禮大街', sub: '登機前最後採買（椰蛋樹聯名＆限定商品）', items: '椰蛋樹寶可夢聯名・機場限定日向夏果凍・南國布丁・青島煎餅・燒酎', hours: '06:30-20:30', lat: 31.8734, lng: 131.4426, mapcode: '66 135 552*14', park: '還車後搭接駁車免停車費（航廈前 30 分免費）', desc: '二樓日向屋集結全縣人氣點心與椰蛋樹限定周邊，登機前輕鬆補貨。' },
  { id: 's-6', area: '日向市', region: 'north_coast', tag: 'hyuga', name: '道の駅 日向（物產館）', sub: '日向市特產「平兵衛酢」＆ 貝殼工藝直賣所', items: '平兵衛酢原汁・柚子醋・日向蛤殼工藝・祈願之海叶字鑰匙圈', hours: '09:00-18:00', lat: 32.3430, lng: 131.6231, mapcode: '175 682 652*33', park: '大型海景免費停車場（約 100 位）', desc: '美美津北側海濱道之驛，採買日向市獨有夢幻柑橘平兵衛酢必停。' },
  { id: 's-7', area: '日南市', region: 'south_coast', tag: 'nichinan', name: '道の駅 なんごう（南鄉）', sub: '完熟宮崎芒果＆亞熱帶水果產地站', items: '完熟芒果霜淇淋・日向夏鮮果果醬・日南檸檬點心・太平洋露台', hours: '08:30-18:00', lat: 31.5031, lng: 131.3792, mapcode: '296 485 112*41', park: '海岬免費停車場（約 70 位）', desc: '飫肥前往都井岬海線必停，盛夏必嚐產地新鮮芒果霜淇淋。' },
  { id: 's-8', area: '都城市', region: 'west_kirishima', tag: 'west_kirishima', name: '道の駅 都城 NiQLL（ニクル）', sub: '日本第一燒酎＆肉品之鄉・美學木造商場', items: '都城限定霧島燒酎・黑陶酒壺黒ぢょか・都城大弓小物・宮崎牛醬料', hours: '09:00-19:00', lat: 31.7690, lng: 131.0943, mapcode: '119 467 612*74', park: '超寬敞免費平面停車場（約 220 位）', desc: '2023 年全新落成的無印感大跨距木造建築道之驛，縣西必逛地標。' },
  { id: 's-9', area: '綾町', region: 'central', tag: 'saito_aya', name: '綾国際クラフトの城（綾手工藝城）', sub: '照葉林天然木工・草木染織・綾燒工藝館', items: '天然原木餐具碗筷・草木染手帕・綾燒陶器・竹細工・手工玻璃', hours: '09:00-17:00', lat: 32.0041, lng: 131.2486, mapcode: '66 544 128*11', park: '綾城免費大型停車場（約 150 位）', desc: '匯集綾町職人以照葉林疏伐木與天然染劑製作的沉靜無印感器皿。' },
  { id: 's-10', area: '高千穗町', region: 'north_mountain', tag: 'takachiho', name: '高千穂がまだせ市場（鬼八の蔵）', sub: '高千穗最大物產與神話紀念品市集', items: '夜神樂木雕面具飾品・高千穗釜炒茶・神話文創小物・高千穗牛餐廳', hours: '09:00-18:00', lat: 32.7077, lng: 131.3056, mapcode: '333 793 114*52', park: '免費平面停車場（約 70 位）', desc: '高千穗市區中心物產館，神話紀念品與稀有釜炒綠茶一次買齊。' }
];

const SPECIALTIES = [
  { id: 'sp-1', name: '起司饅頭（チーズ饅頭）', area: '宮崎全縣', carry: '可攜帶回台', shopId: 's-1', shopName: '宮崎物產館 KONNE / 山形屋', desc: '宮崎國民伴手禮！鬆軟酥香外皮包覆微鹹濃郁奶油乳酪內餡（推薦：わらべ、風月堂、お菓子の日高）。' },
  { id: 'sp-2', name: '平兵衛酢（へべす）果汁與果醋', area: '日向市特產', carry: '液體請託運', shopId: 's-6', shopName: '道の駅 日向 / 物產館 KONNE', desc: '日向市夢幻柑橘！皮薄無籽多汁酸味圓潤，推薦購入 100% 原汁或柚子醋（ポン酢）。' },
  { id: 'sp-3', name: '日向夏（ひゅうがなつ）點心＆沙拉醬', area: '宮崎市・日南', carry: '果醬/點心可託運', shopId: 's-5', shopName: '宮崎機場 2F / 道之驛 Phoenix', desc: '宮崎原產清爽柑橘，必買日向夏果凍、羊羹、法蘭酥與人氣超高的日向夏沙拉醬。' },
  { id: 'sp-4', name: '戶村本店 燒肉醬（戸村の焼肉のたれ）', area: '日南市發源', carry: '瓶裝請託運', shopId: 's-4', shopName: 'AEON MALL 超市 / 物產館 KONNE', desc: '宮崎縣民冰箱必備萬用醬！大量蘋果香蕉大蒜熬製且不含肉類成分，可安心託運回台。' },
  { id: 'sp-5', name: '青島煎餅（青島せんべい）', area: '宮崎市青島', carry: '可攜帶回台', shopId: 's-2', shopName: 'AMU PLAZA / 宮崎機場 2F', desc: '以鬼之洗衣板波紋為靈感的薄脆法蘭酥煎餅，復古南國包裝送禮體面。' },
  { id: 'sp-6', name: '完熟芒果「太陽之子」甜點・南國布丁', area: '宮崎・日南南鄉', carry: '乾果/餅乾可回台', shopId: 's-7', shopName: '道の駅 なんごう / 宮崎機場', desc: '4–8 月為鮮果盛產期（鮮果不得入境台灣）；伴手禮推薦芒果乾、年輪蛋糕與南國布丁。' },
  { id: 'sp-7', name: '黑霧島・赤霧島 芋燒酎（限定瓶）', area: '都城市特產', carry: '酒類請託運（限額內）', shopId: 's-8', shopName: '道の駅都城 NiQLL / 霧島酒造', desc: '日本燒酎銷量冠軍！黑霧島、茜霧島、虎斑霧島等在地限定款香氣圓潤。' },
  { id: 'sp-8', name: '宮崎辛麵 桝元即食包（無肉純湯款）', area: '延岡市發源', carry: '確認無肉塊可回台', shopId: 's-4', shopName: 'AEON MALL / 物產館 KONNE', desc: '把延岡蒜香辣湯與 Q 彈蒟蒻麵帶回家！選購時確認成分無含肉塊即可攜回。' },
  { id: 'sp-9', name: '宮崎地頭雞炭火燒（真空常溫包）', area: '宮崎全縣', carry: '⚠ 僅限日本當地享用', shopId: 's-1', shopName: '飯店宵夜限定（勿帶回台灣）', desc: '超涮嘴柚子胡椒炭火烤雞！依台灣檢疫規定禽畜肉品禁止攜帶入境，請於日本飯店享用。' },
  { id: 'sp-10', name: '高千穗釜炒綠茶・宮崎茶禮盒', area: '高千穗・宮崎', carry: '可攜帶回台', shopId: 's-10', shopName: '高千穂がまだせ市場 / 山形屋', desc: '九州稀有鐵鍋釜炒茶工藝，茶湯金黃帶山谷清香，無印感茶罐送禮極佳。' }
];

const SOUVENIRS = [
  { id: 'sv-1', name: '宮崎限定「椰蛋樹（ナッシー）」寶可夢聯名周邊', area: '宮崎全縣', cat: '人氣聯名', price: '¥500～¥3,500', targetKind: 'shop', targetId: 's-5', targetLabel: '宮崎機場 2F / 物產館 KONNE', desc: '宮崎官方觀光大使限定玩偶、徽章、托特包與聯名鐵盒，各市町還有專屬寶可夢人孔蓋。' },
  { id: 'sv-2', name: '青島神社「產靈紙縒」・貝殼繪馬＆限定御朱印帳', area: '宮崎市青島', cat: '神社御守', price: '¥300～¥2,000', targetKind: 'poi', targetId: 'd3-1', targetLabel: '青島神社 授與所', desc: '五色結緣產靈紙縒、天然貝殼製繪馬、透明蕾絲御守與南國波浪刺繡御朱印帳。' },
  { id: 'sv-3', name: '鵜戶神宮「兔子土鈴（うさぎ土鈴）」＆ 運玉吊飾', area: '日南市', cat: '神社御守', price: '¥500～¥1,200', targetKind: 'poi', targetId: 'd3-4', targetLabel: '鵜戶神宮 授與所', desc: '兔子是鵜戶神宮神使！素雅白色撫兔土鈴、開運兔子御守與神紋運玉吊飾。' },
  { id: 'sv-4', name: '高千穗「夜神樂面具擺飾」・神樂鈴＆夫婦杉御守', area: '高千穗町', cat: '神話工藝', price: '¥800～¥4,500', targetKind: 'shop', targetId: 's-10', targetLabel: '高千穗神社 / がまだせ市場', desc: '迷你木雕陶器神樂面具、避邪神樂鈴與祈求圓滿的夫婦杉御守。' },
  { id: 'sv-5', name: '日南太陽花園「官方授權摩艾石像」公仔與文創', area: '日南市', cat: '限定公仔', price: '¥400～¥2,800', targetKind: 'poi', targetId: 'd3-3', targetLabel: '日南太陽花園 紀念品店', desc: '全球唯一復活節島授權園區！推薦迷你彩色摩艾扭蛋、熔岩桌上擺飾與鑰匙圈。' },
  { id: 'sv-6', name: '宮崎縣吉祥物「宮崎犬（みやざき犬）」周邊雜貨', area: '宮崎市', cat: '在地萌物', price: '¥550～¥2,200', targetKind: 'shop', targetId: 's-1', targetLabel: '物產館 KONNE / 宮崎機場', desc: '戴日向夏、鳳凰木與地雞頭套的三隻舞王吉祥物絨毛吊飾與刺繡毛巾。' },
  { id: 'sv-7', name: '平和台・西都原「古代埴輪（はにわ）」素陶公仔', area: '宮崎・西都', cat: '文創陶藝', price: '¥600～¥2,500', targetKind: 'poi', targetId: 'd1-3', targetLabel: '西都原考古博物館 / 平和台', desc: '古墳時代呆萌陶俑擺飾！溫潤素燒赤陶質感，極具簡約日系家飾美感。' },
  { id: 'sv-8', name: '日向市「日向蛤殼工藝」＆ 祈願之海「叶」字鑰匙圈', area: '日向市', cat: '海濱紀念', price: '¥500～¥3,000', targetKind: 'shop', targetId: 's-6', targetLabel: '道の駅 日向 / 祈願之海周邊', desc: '日本第一高級圍棋白子「日向蛤碁石」產地！天然貝殼飾品與祈願之海叶字御守。' },
  { id: 'sv-9', name: '綾町照葉林「天然原木餐具・草木染織・綾玻璃」', area: '綾町', cat: '簡約工藝', price: '¥1,200～¥6,000', targetKind: 'shop', targetId: 's-9', targetLabel: '綾国際クラフトの城 / KONNE', desc: '疏伐木手工原木餐具、柔和草木染手帕與黑木國昭系綾玻璃杯。' },
  { id: 'sv-10', name: '飫肥杉（おびすぎ）香氛木片・手作筷與木質明信片', area: '日南市飫肥', cat: '木作小物', price: '¥450～¥2,200', targetKind: 'poi', targetId: 'd3-5', targetLabel: '飫肥城下町 / 物產館 KONNE', desc: '富含天然杉木香的日南名木，製成杯墊、除臭香氛塊、手作筷與木質明信片。' },
  { id: 'sv-11', name: '傳統鄉土玩具「佐土原人形」＆ 宮崎繪馬工藝', area: '宮崎市', cat: '傳統工藝', price: '¥1,000～¥3,500', targetKind: 'shop', targetId: 's-1', targetLabel: '物產館 KONNE / 宮崎山形屋', desc: '傳承 400 年縣指定傳統工藝，古樸泥塑手繪歌舞伎與十二生肖土偶。' },
  { id: 'sv-12', name: '都城燒酎黑陶壺（黒ぢょか）＆ 都城大弓開運小物', area: '都城市', cat: '酒器民藝', price: '¥1,200～¥5,500', targetKind: 'shop', targetId: 's-8', targetLabel: '道の駅都城 NiQLL / 霧島酒造', desc: '溫酒專用黑陶壺「黒ぢょか」、手作陶杯與日本九成產地都城大弓破魔小物。' }
];

// Embed REAL OSRM Road-Network Polylines & Real Driving Totals
const dayRoutes = {
  1: { name: 'Day 01｜縣央宮崎・西都原 ➔ 縣北沿海（日向市・延岡）', color: '#2563EB', distKm: osrmRoutes[1].distKm, driveMin: osrmRoutes[1].driveMin, coords: osrmRoutes[1].coords },
  2: { name: 'Day 02｜延岡 ➔ 高千穗神話山區 ➔ 綾町大吊橋 ➔ 宮崎市區', color: '#059669', distKm: osrmRoutes[2].distKm, driveMin: osrmRoutes[2].driveMin, coords: osrmRoutes[2].coords },
  3: { name: 'Day 03｜青島 ➔ 日南海岸・鵜戶・飫肥 ➔ 都井岬 ➔ 宿都城', color: '#D97706', distKm: osrmRoutes[3].distKm, driveMin: osrmRoutes[3].driveMin, coords: osrmRoutes[3].coords },
  4: { name: 'Day 04｜縣西霧島（關之尾・牧場・蝦野高原）➔ 宮崎機場', color: '#7C3AED', distKm: osrmRoutes[4].distKm, driveMin: osrmRoutes[4].driveMin, coords: osrmRoutes[4].coords }
};
const totalRoadKm = dayRoutes[1].distKm + dayRoutes[2].distKm + dayRoutes[3].distKm + dayRoutes[4].distKm;
const totalRoadPts = dayRoutes[1].coords.length + dayRoutes[2].coords.length + dayRoutes[3].coords.length + dayRoutes[4].coords.length;
const day3ToStayLeg = legByToId['3:d3-stay'];

const html = `<!DOCTYPE html>
<html lang="zh-Hant">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
  <title>宮崎縣 4 天 3 夜旅遊 WebGIS｜9款底圖 × 停車攻略 × ${compactVideos.length}部 YT</title>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" crossorigin="" />
  <style>
    :root {
      --paper: #FFFFFF;
      --paper-glass: rgba(255, 255, 255, 0.96);
      --linen: #F8FAFC;
      --kraft: #F1F5F9;
      --hairline: #E2E8F0;
      --hairline-soft: rgba(148, 163, 184, 0.25);
      --ink: #0F172A;
      --ink-soft: #475569;
      --ink-muted: #64748B;
      --muji-red: #0F172A;
      --muji-red-soft: rgba(37, 99, 235, 0.07);
      --muji-red-border: rgba(37, 99, 235, 0.24);
      --accent: #2563EB;
      --food-c: #DC2626;
      --shop-c: #B45309;
      --park-c: #334155;
      --d1: #2563EB;
      --d2: #059669;
      --d3: #D97706;
      --d4: #7C3AED;
      --radius: 10px;
      --shadow: 0 10px 30px rgba(15, 23, 42, 0.09);
      --shadow-sm: 0 2px 10px rgba(15, 23, 42, 0.07);
      --sb-w: 400px;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      height: 100%; height: 100dvh; width: 100%; overflow: hidden;
      font-family: "Inter", -apple-system, BlinkMacSystemFont, "Noto Sans TC", "PingFang TC", "Microsoft JhengHei", sans-serif;
      background: #F1F5F9; color: var(--ink);
      -webkit-font-smoothing: antialiased; letter-spacing: 0.01em;
      overscroll-behavior: none;
    }

    #map { position: absolute; inset: 0; width: 100%; height: 100%; z-index: 1; background: #2C3338; contain: strict; }
    .leaflet-map-pane { will-change: transform; }
    body.map-dragging .leaflet-marker-pane,
    body.map-dragging .leaflet-overlay-pane { pointer-events: none !important; }

    /* ---- TOP TOOLBAR ---- */
    .top-bar {
      position: absolute; top: 16px; left: 474px; right: 60px; z-index: 900;
      display: flex; align-items: center; justify-content: space-between; gap: 8px;
      pointer-events: none; transition: left 0.28s ease;
    }
    body.sidebar-collapsed .top-bar { left: 62px; }

    .gis-toolbar {
      display: flex; flex-wrap: wrap; align-items: center; gap: 2px;
      background: var(--paper-glass); contain: layout style;
      border: 1px solid var(--hairline); border-radius: var(--radius);
      padding: 4px; box-shadow: var(--shadow-sm); pointer-events: auto;
    }

    .tool-btn {
      display: inline-flex; align-items: center; gap: 4px;
      background: transparent; color: var(--ink-soft);
      border: 1px solid transparent; border-radius: 7px;
      padding: 5px 9px; font-size: 11.2px; font-weight: 500;
      cursor: pointer; transition: all 0.15s ease; white-space: nowrap; font-family: inherit;
    }
    .tool-btn:hover { background: var(--kraft); color: var(--ink); }
    .tool-btn.active { background: var(--ink); color: #FFFFFF; border-color: var(--ink); }
    .tool-btn.active-food { background: var(--food-c); color: #FFFFFF; border-color: var(--food-c); }
    .tool-btn.active-shop { background: var(--shop-c); color: #FFFFFF; border-color: var(--shop-c); }
    .tool-btn.active-park { background: var(--park-c); color: #FFFFFF; border-color: var(--park-c); }
    .tool-sep { width: 1px; height: 16px; background: var(--hairline); margin: 0 3px; }

    .basemap-quick {
      background: var(--linen); color: var(--ink); border: 1px solid var(--hairline);
      border-radius: 7px; padding: 4px 8px; font-size: 11px; font-weight: 600;
      font-family: inherit; outline: none; cursor: pointer;
    }
    .basemap-quick:focus { border-color: var(--accent); }

    /* ---- CARTOGRAPHIC NORTH ARROW ---- */
    .north-arrow {
      position: absolute; top: 94px; right: 16px; z-index: 900;
      width: 34px; height: 38px; border-radius: var(--radius);
      background: var(--paper-glass); contain: layout style;
      border: 1px solid var(--hairline); box-shadow: var(--shadow-sm);
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      pointer-events: none; user-select: none;
    }
    .north-arrow span { font-size: 9px; font-weight: 800; color: var(--muji-red); line-height: 1; margin-bottom: 1px; }

    /* ---- LEFT MUJI SIDEBAR ---- */
    .sidebar {
      position: absolute; top: 16px; left: 16px; bottom: 16px; width: var(--sb-w);
      z-index: 1000; display: flex; flex-direction: column;
      background: var(--paper-glass); contain: layout style;
      border: 1px solid var(--hairline); border-radius: var(--radius);
      box-shadow: var(--shadow); overflow: hidden;
      transition: transform 0.28s cubic-bezier(.4,0,.2,1);
    }
    body.sidebar-collapsed .sidebar { transform: translateX(-432px); }

    .sidebar-toggle {
      position: absolute; top: 16px; left: 430px; z-index: 1001;
      width: 36px; height: 36px; border-radius: var(--radius);
      background: var(--paper-glass); contain: layout style;
      border: 1px solid var(--hairline); color: var(--ink);
      cursor: pointer; display: flex; align-items: center; justify-content: center;
      font-size: 15px; box-shadow: var(--shadow-sm); transition: left 0.28s ease, background 0.16s;
    }
    .sidebar-toggle:hover { background: var(--linen); }
    body.sidebar-collapsed .sidebar-toggle { left: 16px; }

    .sb-header { padding: 14px 16px 12px; background: var(--paper); border-bottom: 1px solid var(--hairline); }
    .sb-top-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
    .sb-kicker { font-size: 9.2px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: var(--accent); }
    .print-mini-btn {
      background: var(--linen); border: 1px solid var(--hairline); color: var(--ink-soft);
      font-size: 10px; font-weight: 600; padding: 4px 9px; border-radius: 6px;
      cursor: pointer; font-family: inherit; transition: all 0.15s;
    }
    .print-mini-btn:hover { background: var(--ink); color: var(--paper); border-color: var(--ink); }

    .sb-title { font-size: 17px; font-weight: 700; letter-spacing: -0.01em; color: var(--ink); margin-top: 3px; }
    .sb-sub { font-size: 11px; color: var(--ink-soft); margin-top: 3px; line-height: 1.5; }

    .omni-wrap { position: relative; margin-top: 9px; }
    .omni-input {
      width: 100%; background: var(--linen); color: var(--ink);
      border: 1px solid var(--hairline); border-radius: 8px;
      padding: 8px 28px 8px 11px; font-size: 11.6px; outline: none; font-family: inherit;
      transition: background 0.15s, border-color 0.15s;
    }
    .omni-input:focus { background: #FFFFFF; border-color: var(--accent); }
    .omni-clear {
      position: absolute; right: 7px; top: 50%; transform: translateY(-50%);
      border: none; background: transparent; color: var(--ink-muted); cursor: pointer;
      font-size: 13px; display: none; padding: 2px 4px;
    }
    .omni-results {
      position: absolute; top: calc(100% + 4px); left: 0; right: 0; z-index: 1200;
      background: #FFFFFF; border: 1px solid var(--hairline); border-radius: 3px;
      box-shadow: var(--shadow); max-height: 250px; overflow-y: auto; display: none;
    }
    .omni-results.show { display: block; }
    .omni-item {
      padding: 8px 10px; border-bottom: 1px solid rgba(216,209,197,0.45);
      cursor: pointer; display: flex; justify-content: space-between; align-items: center; gap: 8px;
    }
    .omni-item:last-child { border-bottom: none; }
    .omni-item:hover { background: var(--linen); }
    .omni-name { font-size: 11.8px; font-weight: 600; color: var(--ink); }
    .omni-meta { font-size: 10px; color: var(--ink-muted); margin-top: 1px; }
    .omni-badge { font-size: 9.5px; font-weight: 700; padding: 2px 6px; border-radius: 2px; color: #fff; flex-shrink: 0; }

    .kpi-strip {
      display: grid; grid-template-columns: repeat(4, 1fr);
      margin-top: 9px; border: 1px solid var(--hairline); border-radius: 8px;
      background: var(--linen); overflow: hidden;
    }
    .kpi-box { padding: 6px 4px; text-align: center; border-right: 1px solid var(--hairline); }
    .kpi-box:last-child { border-right: none; }
    .kpi-val { font-size: 12.6px; font-weight: 700; color: var(--ink); font-variant-numeric: tabular-nums; }
    .kpi-lbl { font-size: 9.2px; color: var(--ink-muted); margin-top: 1px; }

    .progress-row { margin-top: 8px; display: flex; align-items: center; gap: 8px; font-size: 10.2px; color: var(--ink-muted); }
    .progress-track { flex: 1; height: 4px; background: var(--kraft); border-radius: 99px; overflow: hidden; }
    .progress-fill { height: 100%; background: var(--accent); width: 0%; transition: width 0.25s ease; }

    .sb-tabs { display: grid; grid-template-columns: repeat(4, 1fr); border-bottom: 1px solid var(--hairline); background: var(--linen); }
    .sb-tab {
      padding: 10px 4px; font-size: 11.4px; font-weight: 600; color: var(--ink-muted);
      background: transparent; border: none; border-bottom: 2px solid transparent;
      cursor: pointer; transition: all 0.16s; font-family: inherit;
    }
    .sb-tab:hover { color: var(--ink); }
    .sb-tab.active { color: var(--ink); border-bottom-color: var(--accent); background: var(--paper); }

    .sb-body {
      flex: 1; overflow-y: auto; padding: 12px 14px 20px; background: var(--paper);
      scrollbar-width: thin; scrollbar-color: #C7BFB2 transparent;
    }
    .sb-body::-webkit-scrollbar { width: 5px; }
    .sb-body::-webkit-scrollbar-thumb { background: #C7BFB2; border-radius: 3px; }

    .tab-pane { display: none; }
    .tab-pane.active { display: block; }

    .region-strip { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 8px; }
    .region-chip {
      font-size: 10px; font-weight: 600; padding: 4px 7px; border-radius: 2px;
      background: #FFFFFF; border: 1px solid var(--hairline); color: var(--ink-soft);
      cursor: pointer; transition: all 0.15s; font-family: inherit;
    }
    .region-chip:hover { border-color: var(--ink); color: var(--ink); }

    .day-pills { display: grid; grid-template-columns: repeat(5, 1fr); gap: 4px; margin-bottom: 10px; }
    .day-pill {
      padding: 6px 4px; border-radius: 3px; font-size: 11px; font-weight: 600;
      cursor: pointer; background: var(--linen); color: var(--ink-soft);
      border: 1px solid var(--hairline); transition: all 0.15s; text-align: center; font-family: inherit;
    }
    .day-pill:hover { background: var(--kraft); color: var(--ink); }
    .day-pill.active[data-day="all"] { background: var(--ink); color: var(--paper); border-color: var(--ink); }
    .day-pill.active[data-day="1"] { background: var(--d1); color: #fff; border-color: var(--d1); }
    .day-pill.active[data-day="2"] { background: var(--d2); color: #fff; border-color: var(--d2); }
    .day-pill.active[data-day="3"] { background: var(--d3); color: #fff; border-color: var(--d3); }
    .day-pill.active[data-day="4"] { background: var(--d4); color: #fff; border-color: var(--d4); }

    .sub-pills { display: grid; grid-template-columns: repeat(2, 1fr); gap: 5px; margin-bottom: 10px; }
    .sub-pill {
      padding: 7px 4px; border-radius: 3px; font-size: 11px; font-weight: 600;
      cursor: pointer; background: var(--linen); color: var(--ink-soft);
      border: 1px solid var(--hairline); transition: all 0.15s; text-align: center; font-family: inherit;
    }
    .sub-pill:hover { background: var(--kraft); color: var(--ink); }
    .sub-pill.active[data-sub="food"] { background: var(--food-c); color: #fff; border-color: var(--food-c); }
    .sub-pill.active[data-sub="shop"] { background: var(--shop-c); color: #fff; border-color: var(--shop-c); }
    .sub-pill.active[data-sub="spec"] { background: var(--ink); color: var(--paper); border-color: var(--ink); }
    .sub-pill.active[data-sub="souvenir"] { background: var(--muji-red); color: var(--paper); border-color: var(--muji-red); }
    .sub-pill.active[data-sub="parking"] { background: var(--park-c); color: #fff; border-color: var(--park-c); }

    .day-banner {
      background: var(--linen); border: 1px solid var(--hairline);
      border-left: 3px solid var(--ink); border-radius: 3px;
      padding: 9px 11px; margin: 13px 0 8px;
      display: flex; justify-content: space-between; align-items: center; gap: 8px;
    }
    .day-banner:first-child { margin-top: 0; }
    .day-banner-title { font-size: 11.8px; font-weight: 700; color: var(--ink); line-height: 1.4; }
    .day-banner-meta { font-size: 10.2px; color: var(--ink-muted); margin-top: 2px; }
    .fit-btn {
      background: var(--paper); border: 1px solid var(--hairline);
      color: var(--ink-soft); border-radius: 3px; padding: 4px 8px; font-size: 10.4px;
      cursor: pointer; white-space: nowrap; font-weight: 600; font-family: inherit; transition: all 0.15s;
    }
    .fit-btn:hover { border-color: var(--ink); color: var(--ink); }

    .leg-conn {
      display: flex; align-items: center; gap: 7px; padding: 1px 0 6px 22px;
      font-size: 10px; color: var(--ink-muted); font-variant-numeric: tabular-nums;
    }
    .leg-line { width: 1px; height: 12px; background: #C2B9AA; }

    /* Cards */
    .poi-card {
      background: #FFFFFF; border: 1px solid var(--hairline);
      border-radius: 8px; padding: 11px 12px; margin-bottom: 7px;
      cursor: pointer; transition: border-color 0.15s ease, background 0.15s ease, box-shadow 0.15s ease;
    }
    .poi-card:hover { background: #F8FAFC; border-color: #CBD5E1; }
    .poi-card.selected { border-color: var(--accent); background: #FFFFFF; box-shadow: inset 3px 0 0 var(--accent); }
    .poi-card.checked { background: #F8FAFC; opacity: 0.85; }
    .poi-card.checked .poi-name { color: var(--ink-muted); text-decoration: line-through; }

    .poi-top { display: flex; align-items: flex-start; gap: 9px; }
    .poi-num {
      min-width: 24px; height: 24px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 10.5px; font-weight: 700; color: #FFFFFF; flex-shrink: 0;
      margin-top: 1px; font-variant-numeric: tabular-nums;
    }
    .poi-num.sq { border-radius: 3px; font-size: 10.5px; }
    .poi-head-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 6px; }
    .poi-name { font-size: 12.6px; font-weight: 700; line-height: 1.35; color: var(--ink); }
    .chk-btn {
      flex-shrink: 0; width: 18px; height: 18px; border-radius: 2px;
      border: 1px solid #BDB4A6; background: #FFFFFF; color: transparent;
      display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 800;
      cursor: pointer; transition: all 0.14s; margin-top: 1px;
    }
    .chk-btn:hover { border-color: var(--muji-red); }
    .chk-btn.done { background: var(--muji-red); border-color: var(--muji-red); color: #FFFFFF; }

    .poi-sub { font-size: 10.6px; color: var(--ink-muted); margin-top: 2px; }
    .poi-meta { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 5px; font-size: 9.8px; color: var(--ink-muted); }
    .tag-chip { background: var(--linen); border: 1px solid var(--hairline); border-radius: 2px; padding: 1px 5px; font-size: 9.6px; color: var(--ink-soft); }
    .area-chip { background: #FFFFFF; border: 1px solid #C5BDB0; border-radius: 2px; padding: 1px 5px; font-size: 9.6px; font-weight: 600; color: var(--ink); }
    .yt-chip { background: var(--muji-red-soft); border: 1px solid var(--muji-red-border); color: var(--muji-red); border-radius: 2px; padding: 1px 5px; font-size: 9.6px; font-weight: 600; }
    .park-chip { background: rgba(51, 84, 109, 0.10); border: 1px solid rgba(51, 84, 109, 0.30); color: var(--park-c); border-radius: 2px; padding: 1px 5px; font-size: 9.6px; font-weight: 600; }
    .warn-chip { background: rgba(166, 75, 60, 0.12); border: 1px solid rgba(166, 75, 60, 0.35); color: #8F3226; border-radius: 2px; padding: 1px 5px; font-size: 9.6px; font-weight: 600; }
    .ok-chip { background: rgba(74, 124, 89, 0.10); border: 1px solid rgba(74, 124, 89, 0.32); color: #3A6447; border-radius: 2px; padding: 1px 5px; font-size: 9.6px; font-weight: 600; }
    .poi-desc { font-size: 11.2px; color: var(--ink-soft); margin-top: 6px; line-height: 1.54; }
    .spec-footer {
      margin-top: 7px; padding-top: 6px; border-top: 1px solid rgba(216, 209, 197, 0.55);
      display: flex; justify-content: space-between; align-items: center; font-size: 10.2px; color: var(--ink-muted);
    }
    .spec-go { color: var(--muji-red); font-weight: 600; }

    .customs-note {
      background: var(--linen); border: 1px solid var(--hairline);
      border-left: 3px solid var(--muji-red); border-radius: 3px;
      padding: 8px 10px; margin-bottom: 10px; font-size: 10.7px; line-height: 1.55; color: var(--ink-soft);
    }

    /* GIS Layers, Basemap Gallery & Buffer */
    .section-box {
      background: #FFFFFF; border: 1px solid var(--hairline);
      border-radius: var(--radius); padding: 12px 13px; margin-bottom: 11px;
    }
    .section-title {
      font-size: 11.8px; font-weight: 700; margin-bottom: 9px; padding-bottom: 6px;
      border-bottom: 1px solid var(--hairline);
      display: flex; align-items: center; justify-content: space-between;
      color: var(--ink); letter-spacing: 0.04em;
    }
    .bm-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 5px; margin-bottom: 8px; }
    .bm-card {
      padding: 7px 8px; border-radius: 3px; border: 1px solid var(--hairline);
      background: var(--paper); cursor: pointer; text-align: left; font-family: inherit;
      transition: all 0.14s;
    }
    .bm-card:hover { border-color: var(--ink); }
    .bm-card.active { border-color: var(--muji-red); background: var(--muji-red-soft); box-shadow: inset 2px 0 0 var(--muji-red); }
    .bm-name { font-size: 11px; font-weight: 700; color: var(--ink); display: block; }
    .bm-sub { font-size: 9.5px; color: var(--ink-muted); display: block; margin-top: 1px; }

    .layer-row {
      display: flex; align-items: center; justify-content: space-between;
      padding: 5px 0; border-bottom: 1px solid rgba(216, 209, 197, 0.45);
      font-size: 11.4px; color: var(--ink-soft);
    }
    .layer-row:last-child { border-bottom: none; padding-bottom: 0; }
    .layer-label { display: flex; align-items: center; gap: 8px; cursor: pointer; }
    .layer-label input { accent-color: var(--muji-red); cursor: pointer; }
    .swatch { width: 10px; height: 10px; border-radius: 50%; display: inline-block; flex-shrink: 0; }
    .swatch.sq { border-radius: 2px; }

    .slider-row {
      display: flex; align-items: center; justify-content: space-between; gap: 10px;
      padding-top: 8px; margin-top: 6px; border-top: 1px solid rgba(216,209,197,0.45);
      font-size: 10.8px; color: var(--ink-muted);
    }
    .slider-row input[type="range"] { flex: 1; accent-color: var(--muji-red); cursor: pointer; }

    .buffer-controls { display: flex; gap: 5px; margin-bottom: 8px; }
    .buf-btn {
      flex: 1; padding: 5px 4px; font-size: 10.8px; font-weight: 600;
      background: var(--linen); border: 1px solid var(--hairline); color: var(--ink-soft);
      border-radius: 3px; cursor: pointer; font-family: inherit;
    }
    .buf-btn.active { background: var(--ink); color: var(--paper); border-color: var(--ink); }
    .buf-list { max-height: 175px; overflow-y: auto; font-size: 11px; }
    .buf-item {
      display: flex; justify-content: space-between; align-items: center; gap: 6px;
      padding: 5px 4px; border-bottom: 1px solid rgba(216,209,197,0.4); cursor: pointer;
    }
    .buf-item:hover { background: var(--linen); }
    .buf-dist { font-weight: 700; color: var(--muji-red); font-variant-numeric: tabular-nums; white-space: nowrap; }

    .bar-row { margin-bottom: 8px; cursor: pointer; }
    .bar-row:last-child { margin-bottom: 0; }
    .bar-row:hover .bar-label { color: var(--muji-red); }
    .bar-head { display: flex; justify-content: space-between; font-size: 10.6px; margin-bottom: 3px; gap: 8px; }
    .bar-label { font-weight: 500; color: var(--ink); transition: color 0.15s; }
    .bar-val { color: var(--ink-muted); font-weight: 600; white-space: nowrap; font-variant-numeric: tabular-nums; }
    .bar-track { height: 5px; background: var(--linen); border-radius: 2px; overflow: hidden; }
    .bar-fill { height: 100%; border-radius: 2px; transition: width 0.35s ease; }

    .export-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 7px; }
    .export-btn {
      background: var(--linen); border: 1px solid var(--hairline);
      color: var(--ink); border-radius: 3px; padding: 8px; font-size: 11.4px;
      font-weight: 600; cursor: pointer; transition: all 0.16s; font-family: inherit;
    }
    .export-btn:hover { background: var(--ink); color: var(--paper); border-color: var(--ink); }

    /* YouTube Tab */
    .yt-search-wrap { display: flex; flex-direction: column; gap: 7px; margin-bottom: 9px; }
    .yt-input, .yt-select {
      width: 100%; background: #FFFFFF; color: var(--ink);
      border: 1px solid var(--hairline); border-radius: 3px; padding: 7px 10px;
      font-size: 11.6px; outline: none; font-family: inherit;
    }
    .yt-input:focus, .yt-select:focus { border-color: var(--muji-red); }
    .yt-count-bar { font-size: 10.6px; color: var(--ink-muted); margin-bottom: 9px; padding-bottom: 6px; border-bottom: 1px solid var(--hairline); display: flex; justify-content: space-between; }
    .yt-item {
      display: flex; gap: 9px; text-decoration: none; color: inherit;
      background: #FFFFFF; border: 1px solid var(--hairline);
      border-radius: 8px; padding: 8px; margin-bottom: 7px; transition: border-color 0.15s, background 0.15s;
    }
    .yt-item:hover { border-color: var(--accent); background: #F8FAFC; }
    .yt-thumb { width: 90px; height: 51px; border-radius: 2px; object-fit: cover; background: var(--linen); flex-shrink: 0; border: 1px solid var(--hairline-soft); }
    .yt-info { min-width: 0; flex: 1; }
    .yt-title { font-size: 11.4px; font-weight: 600; line-height: 1.38; color: var(--ink); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    .yt-sub { font-size: 10px; color: var(--ink-muted); margin-top: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

    .modal-close { border: none; background: transparent; color: var(--ink-muted); cursor: pointer; font-size: 14px; font-weight: 700; padding: 0 4px; }
    .modal-close:hover { color: var(--muji-red); }

    /* Legend */
    .map-legend {
      position: absolute; bottom: 52px; left: 430px; z-index: 890;
      background: var(--paper-glass); contain: layout style;
      border: 1px solid var(--hairline); border-radius: var(--radius);
      padding: 8px 11px; font-size: 10.2px; color: var(--ink-soft);
      box-shadow: var(--shadow-sm); transition: left 0.28s ease, bottom 0.2s ease; max-width: 265px;
    }
    body.sidebar-collapsed .map-legend { left: 16px; }
    .leg-title { font-weight: 700; color: var(--ink); font-size: 10.4px; margin-bottom: 5px; display: flex; justify-content: space-between; align-items: center; gap: 12px; cursor: pointer; }
    .leg-body { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 10px; }
    .map-legend.min .leg-body { display: none; }
    .leg-row { display: flex; align-items: center; gap: 5px; white-space: nowrap; }

    /* Status Bar & Measure Banner */
    .status-bar {
      position: absolute; bottom: 16px; right: 16px; z-index: 900;
      display: flex; align-items: center; gap: 11px;
      background: var(--paper-glass); contain: layout style;
      border: 1px solid var(--hairline); border-radius: var(--radius);
      padding: 6px 12px; font-size: 10.6px; color: var(--ink-muted);
      box-shadow: var(--shadow-sm); font-variant-numeric: tabular-nums;
    }
    .status-bar strong { color: var(--ink); font-weight: 600; }

    .measure-banner {
      position: absolute; top: 64px; left: 50%; transform: translateX(-50%);
      z-index: 950; background: var(--ink); color: var(--paper);
      padding: 7px 14px; border-radius: var(--radius); font-size: 11.6px; font-weight: 500;
      box-shadow: var(--shadow); display: none; align-items: center; gap: 10px;
      border: 1px solid rgba(247, 245, 240, 0.2);
    }
    .measure-banner.show { display: flex; }
    .measure-mode-btn { background: rgba(247,245,240,0.14); border: 1px solid rgba(247,245,240,0.28); color: #FFFFFF; padding: 2px 8px; border-radius: 2px; font-size: 10.4px; cursor: pointer; font-family: inherit; }
    .measure-mode-btn.active { background: var(--muji-red); border-color: var(--muji-red); }
    .measure-clear { background: var(--muji-red); border: none; color: #fff; padding: 3px 9px; border-radius: 2px; font-size: 10.6px; cursor: pointer; font-weight: 600; font-family: inherit; }

    .toast {
      position: fixed; bottom: 56px; left: 50%; transform: translateX(-50%) translateY(12px);
      z-index: 2000; background: var(--ink); color: var(--paper);
      padding: 8px 16px; border-radius: 3px; font-size: 12px; font-weight: 500;
      box-shadow: var(--shadow); opacity: 0; pointer-events: none; transition: all 0.22s ease;
    }
    .toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }

    /* MUJI Map Pins */
    .custom-pin {
      width: 28px; height: 28px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      border: 2.5px solid #FFFFFF; box-shadow: 0 2px 8px rgba(15, 23, 42, 0.35); transition: transform 0.16s ease;
    }
    .custom-pin:hover { transform: scale(1.16); }
    .custom-pin span { font-size: 10px; font-weight: 700; color: #FFFFFF; letter-spacing: -0.02em; font-variant-numeric: tabular-nums; }

    .food-pin, .shop-pin, .park-pin {
      width: 25px; height: 25px; border-radius: 6px; border: 2px solid #FFFFFF;
      display: flex; align-items: center; justify-content: center;
      color: #FFFFFF; font-size: 11px; font-weight: 700;
      box-shadow: 0 2px 8px rgba(15, 23, 42, 0.35); transition: transform 0.16s;
    }
    .food-pin { background: var(--food-c); }
    .shop-pin { background: var(--shop-c); }
    .park-pin { background: var(--park-c); font-family: Arial, sans-serif; font-weight: 800; font-size: 11.5px; }
    .food-pin:hover, .shop-pin:hover, .park-pin:hover { transform: scale(1.18); }

    .region-tag {
      background: rgba(255, 255, 255, 0.92); color: var(--ink);
      border: 1px solid var(--hairline); border-radius: 6px;
      padding: 2px 8px; font-size: 10px; font-weight: 700; white-space: nowrap; box-shadow: var(--shadow-sm);
    }

    /* MUJI Leaflet Popup */
    .leaflet-popup-content-wrapper { background: var(--paper) !important; color: var(--ink) !important; border: 1px solid var(--hairline) !important; border-radius: var(--radius) !important; box-shadow: var(--shadow) !important; }
    .leaflet-popup-tip { background: var(--paper) !important; }
    .leaflet-popup-close-button { color: var(--ink-muted) !important; padding: 8px 8px 0 0 !important; }
    .leaflet-popup-close-button:hover { color: var(--muji-red) !important; }
    .leaflet-popup-content { margin: 13px 14px !important; width: min(334px, calc(100vw - 56px)) !important; max-height: 62dvh; overflow-y: auto; font-family: inherit; }

    .pop-head { display: flex; justify-content: space-between; align-items: center; gap: 6px; margin-bottom: 7px; }
    .pop-day { font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 2px; color: #FFFFFF; }
    .pop-title { font-size: 15px; font-weight: 700; color: var(--ink); line-height: 1.35; }
    .pop-jp { font-size: 10.8px; color: var(--ink-muted); margin: 2px 0 8px; }
    .pop-grid {
      display: grid; grid-template-columns: 1fr 1fr; gap: 7px;
      background: var(--linen); border: 1px solid var(--hairline);
      border-radius: 3px; padding: 8px 10px; font-size: 10.6px; margin-bottom: 8px;
    }
    .pop-grid.full { grid-template-columns: 1fr; }
    .pop-grid div span { display: block; color: var(--ink-muted); font-size: 9.6px; margin-bottom: 1px; }
    .pop-grid div strong { color: var(--ink); font-weight: 600; font-variant-numeric: tabular-nums; }
    .copyable { cursor: pointer; border-bottom: 1px dashed #9E9589; }
    .copyable:hover { color: var(--muji-red) !important; border-bottom-color: var(--muji-red); }
    .pop-desc { font-size: 11.6px; line-height: 1.56; color: var(--ink-soft); margin-bottom: 7px; }
    .pop-park {
      font-size: 10.8px; line-height: 1.5; color: #274156;
      background: rgba(51, 84, 109, 0.08); border-left: 2.5px solid var(--park-c);
      padding: 6px 9px; border-radius: 0 2px 2px 0; margin-bottom: 7px;
    }
    .pop-tip {
      font-size: 10.8px; line-height: 1.5; color: var(--ink-soft);
      background: var(--linen); border-left: 2.5px solid var(--muji-red);
      padding: 6px 9px; border-radius: 0 2px 2px 0; margin-bottom: 8px;
    }
    .pop-yt-title { font-size: 10.6px; font-weight: 700; color: var(--ink); margin-bottom: 5px; }
    .pop-yt-list { display: flex; flex-direction: column; gap: 4px; max-height: 108px; overflow-y: auto; }
    .pop-yt-link {
      display: block; text-decoration: none; font-size: 10.6px; color: var(--ink);
      background: #FFFFFF; border: 1px solid var(--hairline);
      border-radius: 3px; padding: 5px 8px; line-height: 1.38; transition: border-color 0.14s;
    }
    .pop-yt-link:hover { border-color: var(--muji-red); color: var(--muji-red); }
    .pop-actions { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 5px; margin-top: 9px; }
    .pop-nav-btn {
      text-align: center; text-decoration: none; font-size: 10.6px; font-weight: 600;
      padding: 6px 5px; border-radius: 3px; background: var(--ink); color: var(--paper);
      font-family: inherit; border: 1px solid var(--ink); cursor: pointer; transition: opacity 0.15s;
    }
    .pop-nav-btn.sec { background: var(--paper); border: 1px solid var(--hairline); color: var(--ink); }
    .pop-nav-btn.sec:hover { border-color: var(--ink); }
    .pop-nav-btn:hover { opacity: 0.9; }

    .leaflet-control-zoom { border: 1px solid var(--hairline) !important; border-radius: var(--radius) !important; overflow: hidden; box-shadow: var(--shadow-sm) !important; margin-top: 16px !important; margin-right: 16px !important; }
    .leaflet-control-zoom a { background: var(--paper-glass) !important; color: var(--ink) !important; border-color: var(--hairline) !important; width: 34px !important; height: 34px !important; line-height: 34px !important; }
    .leaflet-control-zoom a:hover { background: var(--linen) !important; }
    .leaflet-control-scale { margin-left: 430px !important; margin-bottom: 16px !important; transition: margin-left 0.28s ease; }
    body.sidebar-collapsed .leaflet-control-scale { margin-left: 16px !important; }
    .leaflet-control-scale-line { background: var(--paper-glass) !important; color: var(--ink) !important; border-color: var(--ink) !important; font-weight: 600; font-size: 10.4px; }
    .leaflet-control-attribution { background: rgba(255, 255, 255, 0.88) !important; color: var(--ink-muted) !important; font-size: 9.6px !important; }
    .leaflet-control-attribution a { color: var(--ink-soft) !important; }
    .leaflet-tooltip { background: var(--paper) !important; color: var(--ink) !important; border: 1px solid var(--hairline) !important; border-radius: 3px !important; box-shadow: var(--shadow-sm) !important; font-size: 11px; padding: 4px 8px; }

    /* ---- SENIOR WEBGIS WIDGETS: SWIPE, GPS, MINIMAP, CONTEXT MENU, MODAL ---- */
    .right-ctrl-stack {
      position: absolute; top: 140px; right: 16px; z-index: 900;
      display: flex; flex-direction: column; gap: 6px;
    }
    .map-fab {
      width: 34px; height: 34px; border-radius: var(--radius);
      background: var(--paper-glass); contain: layout style;
      border: 1px solid var(--hairline); color: var(--ink);
      cursor: pointer; display: flex; align-items: center; justify-content: center;
      font-size: 13.5px; font-weight: 700; box-shadow: var(--shadow-sm);
      transition: all 0.16s ease; font-family: inherit;
    }
    .map-fab:hover { background: var(--linen); border-color: var(--ink); }
    .map-fab.active { background: var(--muji-red); color: #FFFFFF; border-color: var(--muji-red); }

    /* Split-Screen Basemap Swipe Compare */
    .swipe-divider {
      position: fixed; top: 0; bottom: 0; left: 55%; width: 3px; z-index: 880;
      background: #FFFFFF; box-shadow: 0 0 12px rgba(0, 0, 0, 0.55);
      cursor: ew-resize; display: none; touch-action: none;
    }
    .swipe-divider.show { display: block; }
    .swipe-handle {
      position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
      width: 36px; height: 36px; border-radius: 50%;
      background: var(--paper); border: 2px solid var(--muji-red);
      color: var(--muji-red); display: flex; align-items: center; justify-content: center;
      font-size: 13px; font-weight: 800; box-shadow: var(--shadow); user-select: none;
    }
    .swipe-banner {
      position: absolute; top: 64px; left: 50%; transform: translateX(-50%);
      z-index: 940; background: var(--paper-glass); contain: layout style;
      border: 1px solid var(--muji-red-border); border-radius: var(--radius);
      padding: 6px 12px; display: none; align-items: center; gap: 8px;
      font-size: 11px; color: var(--ink); box-shadow: var(--shadow);
    }
    .swipe-banner.show { display: flex; }
    .swipe-tag { font-weight: 700; color: var(--muji-red); }
    .swipe-select {
      background: #fff; border: 1px solid var(--hairline); border-radius: 3px;
      padding: 3px 6px; font-size: 10.8px; font-family: inherit; color: var(--ink); outline: none;
    }

    /* GIS Right-Click Context Menu */
    .ctx-menu {
      position: fixed; z-index: 1900; min-width: 210px;
      background: var(--paper); border: 1px solid var(--hairline);
      border-radius: var(--radius); box-shadow: var(--shadow);
      padding: 5px 0; display: none; font-size: 11.4px;
    }
    .ctx-menu.show { display: block; }
    .ctx-coord {
      padding: 5px 12px 6px; font-size: 10px; color: var(--ink-muted);
      border-bottom: 1px solid var(--hairline); font-variant-numeric: tabular-nums;
      display: flex; justify-content: space-between; align-items: center;
    }
    .ctx-item {
      width: 100%; text-align: left; background: transparent; border: none;
      padding: 7px 12px; font-size: 11.3px; color: var(--ink); cursor: pointer;
      display: flex; align-items: center; gap: 8px; font-family: inherit;
    }
    .ctx-item:hover { background: var(--linen); color: var(--muji-red); }

    /* Custom User Pin, GPS Pulse & Elevation Beacon */
    .user-pin {
      width: 26px; height: 26px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg);
      background: var(--muji-red); border: 2px solid #FFFFFF;
      box-shadow: 0 3px 9px rgba(0, 0, 0, 0.45);
      display: flex; align-items: center; justify-content: center;
    }
    .user-pin span { transform: rotate(45deg); color: #fff; font-size: 11px; font-weight: 800; }
    .gps-dot {
      width: 14px; height: 14px; border-radius: 50%; background: #2563EB;
      border: 2.5px solid #FFFFFF; box-shadow: 0 0 0 6px rgba(37, 99, 235, 0.28);
      animation: gpsPulse 1.8s infinite;
    }
    @keyframes gpsPulse {
      0% { box-shadow: 0 0 0 0 rgba(37, 99, 235, 0.45); }
      70% { box-shadow: 0 0 0 14px rgba(37, 99, 235, 0); }
      100% { box-shadow: 0 0 0 0 rgba(37, 99, 235, 0); }
    }

    /* Pagination Load-More Button */
    .load-more-btn {
      width: 100%; margin-top: 6px; padding: 8px; border-radius: 3px;
      background: var(--linen); border: 1px solid var(--hairline);
      color: var(--ink); font-size: 11.2px; font-weight: 600;
      cursor: pointer; font-family: inherit; transition: all 0.15s;
    }
    .load-more-btn:hover { background: var(--ink); color: var(--paper); border-color: var(--ink); }

    /* Shortcut Help Modal */
    .help-backdrop {
      position: fixed; inset: 0; z-index: 2100; background: rgba(46, 43, 39, 0.48);
      display: none; align-items: center; justify-content: center; padding: 16px;
    }
    .help-backdrop.show { display: flex; }
    .help-card {
      width: 100%; max-width: 440px; background: var(--paper); border: 1px solid var(--hairline);
      border-radius: var(--radius); box-shadow: var(--shadow); padding: 16px 18px;
    }
    .help-head { display: flex; justify-content: space-between; align-items: center; padding-bottom: 8px; border-bottom: 1px solid var(--hairline); margin-bottom: 10px; }
    .help-title { font-size: 14px; font-weight: 700; color: var(--ink); }
    .help-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 7px 12px; font-size: 11.2px; color: var(--ink-soft); }
    .kbd {
      display: inline-block; min-width: 20px; text-align: center; padding: 1px 5px;
      background: var(--linen); border: 1px solid var(--hairline); border-radius: 2px;
      font-size: 10px; font-weight: 700; color: var(--ink); margin-right: 5px;
    }
    .sb-head-actions { display: flex; align-items: center; gap: 5px; }

    /* Mobile Sheet Handle & Floating Expand Pill (hidden on desktop) */
    .sheet-handle {
      display: none; align-items: center; justify-content: center; gap: 8px;
      padding: 8px 12px 6px; background: var(--paper); cursor: grab;
      touch-action: none; user-select: none; border-bottom: 1px solid rgba(216,209,197,0.45);
    }
    .sheet-pill-bar { width: 38px; height: 4px; border-radius: 99px; background: #BDB4A6; }
    .sheet-handle-hint { font-size: 9.8px; color: var(--ink-muted); font-weight: 600; }

    .mobile-sheet-fab {
      display: none; position: fixed; left: 50%; transform: translateX(-50%);
      bottom: calc(46px + env(safe-area-inset-bottom, 0px)); z-index: 980;
      background: var(--ink); color: var(--paper); border: 1px solid rgba(247,245,240,0.22);
      border-radius: 99px; padding: 9px 18px; font-size: 12px; font-weight: 700;
      box-shadow: var(--shadow); cursor: pointer; font-family: inherit; white-space: nowrap;
      align-items: center; gap: 7px;
    }
    .mobile-sheet-fab:active { transform: translateX(-50%) scale(0.97); }

    /* Print Handbook */
    #printSheet { display: none; }
    @media print {
      html, body { overflow: visible !important; height: auto !important; background: #fff !important; }
      #map, .sidebar, .sidebar-toggle, .mobile-sheet-fab, .top-bar, .north-arrow, .right-ctrl-stack, .swipe-divider, .swipe-banner, .ctx-menu, .help-backdrop, .map-legend, .status-bar, .measure-banner, .toast { display: none !important; }
      #printSheet { display: block !important; padding: 20px; color: #0F172A; font-size: 11px; line-height: 1.5; }
      .pr-header { border-bottom: 2px solid #0F172A; padding-bottom: 10px; margin-bottom: 14px; }
      .pr-title { font-size: 19px; font-weight: 700; }
      .pr-sub { font-size: 10.5px; color: #475569; margin-top: 3px; }
      .pr-h2 { font-size: 13.5px; font-weight: 700; color: #0F172A; margin: 14px 0 7px; border-bottom: 1px solid #E2E8F0; padding-bottom: 3px; page-break-after: avoid; }
      .pr-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; font-size: 10px; }
      .pr-table th, .pr-table td { border: 1px solid #E2E8F0; padding: 4px 6px; text-align: left; vertical-align: top; }
      .pr-table th { background: #F8FAFC; font-weight: 700; }
      .pr-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 7px; }
      .pr-card { border: 1px solid #E2E8F0; padding: 6px 8px; break-inside: avoid; }
    }

    /* ---- RWD BREAKPOINT 1: LAPTOP (<= 1366px) ---- */
    @media (max-width: 1366px) {
      .gis-toolbar { flex-wrap: nowrap; overflow-x: auto; max-width: 100%; scrollbar-width: none; -webkit-overflow-scrolling: touch; }
      .gis-toolbar::-webkit-scrollbar { display: none; }
    }

    /* ---- RWD BREAKPOINT 2: TABLET (821px - 1080px) ---- */
    @media (min-width: 821px) and (max-width: 1080px) {
      :root { --sb-w: 342px; }
      .sidebar-toggle { left: 366px; }
      .top-bar { left: 410px; }
      .map-legend { left: 366px; }
      .leaflet-control-scale { margin-left: 366px !important; }
      body.sidebar-collapsed .sidebar { transform: translateX(-368px); }
    }

    /* ---- RWD BREAKPOINT 3: MOBILE SMARTPHONE (<= 820px) ---- */
    @media (max-width: 820px) {
      .sheet-handle { display: flex; }
      .sidebar {
        top: auto; left: 0; right: 0; bottom: 0; width: 100%; max-width: none;
        height: 52dvh; border-radius: 14px 14px 0 0; border-left: none; border-right: none; border-bottom: none;
        padding-bottom: env(safe-area-inset-bottom, 0px);
        transition: height 0.26s cubic-bezier(.4,0,.2,1), transform 0.28s cubic-bezier(.4,0,.2,1);
      }
      body.sheet-full .sidebar { height: 86dvh; }
      body.sidebar-collapsed .sidebar { transform: translateY(105%); }
      body.sidebar-collapsed .mobile-sheet-fab { display: inline-flex; }

      .sb-header { padding: 8px 14px 8px; }
      .sb-kicker, .sb-sub { display: none; }
      .sb-title { font-size: 15.5px; margin-top: 0; }
      .kpi-strip { margin-top: 6px; }
      .kpi-box { padding: 4px 2px; }
      .kpi-val { font-size: 11.4px; }
      .kpi-lbl { font-size: 8.6px; }
      .omni-wrap { margin-top: 6px; }
      .omni-input { padding: 8px 28px 8px 10px; font-size: 13px; }
      .progress-row { margin-top: 6px; font-size: 9.8px; }
      .sb-tab { padding: 10px 4px; font-size: 11.8px; }
      .sb-body { padding: 10px 12px 24px; -webkit-overflow-scrolling: touch; }

      .sidebar-toggle {
        top: calc(10px + env(safe-area-inset-top, 0px)); left: 10px !important;
        width: 38px; height: 38px; font-size: 16px;
      }
      .top-bar {
        left: 54px !important; top: calc(10px + env(safe-area-inset-top, 0px));
        right: 10px; bottom: auto; justify-content: flex-start;
      }
      .gis-toolbar { padding: 3px; gap: 3px; }
      .tool-btn { padding: 6px 9px; font-size: 11.4px; min-height: 30px; }
      .basemap-quick { padding: 5px 7px; font-size: 11.2px; max-width: 145px; }

      .map-legend, .north-arrow { display: none; }
      .leaflet-control-zoom { margin-top: calc(56px + env(safe-area-inset-top, 0px)) !important; margin-right: 10px !important; }
      .leaflet-control-zoom a { width: 36px !important; height: 36px !important; line-height: 36px !important; }
      .right-ctrl-stack { top: calc(138px + env(safe-area-inset-top, 0px)); right: 10px; gap: 7px; }
      .map-fab { width: 36px; height: 36px; font-size: 15px; }

      .swipe-banner, .measure-banner {
        top: calc(56px + env(safe-area-inset-top, 0px));
        left: 10px; right: 56px; transform: none;
        flex-wrap: wrap; gap: 6px; padding: 7px 10px; font-size: 10.6px;
      }
      .swipe-select { max-width: 145px; font-size: 10.6px; }

      .leaflet-control-scale { margin-left: 10px !important; margin-bottom: calc(44px + env(safe-area-inset-bottom, 0px)) !important; }
      .status-bar {
        left: 8px; right: 8px; bottom: calc(8px + env(safe-area-inset-bottom, 0px));
        font-size: 9.8px; gap: 6px; padding: 5px 10px; justify-content: space-between;
      }
      .status-bar > span:nth-child(2),
      .status-bar > span:last-child { display: none; }

      .ctx-item { padding: 10px 14px; font-size: 12.6px; }
      .help-grid { grid-template-columns: 1fr; }
      .pop-actions { grid-template-columns: 1fr 1fr; }
      .pop-actions > :first-child { grid-column: 1 / -1; }
      .toast { bottom: calc(96px + env(safe-area-inset-bottom, 0px)); max-width: calc(100vw - 32px); text-align: center; }
    }

    /* ---- RWD BREAKPOINT 4: COMPACT PHONES (<= 400px) & LANDSCAPE ---- */
    @media (max-width: 400px) {
      .sb-title { font-size: 14.5px; }
      .day-pills { gap: 3px; }
      .day-pill { font-size: 10.2px; padding: 6px 2px; }
      .pop-grid { grid-template-columns: 1fr; gap: 5px; }
      .bm-grid { grid-template-columns: 1fr; }
    }
    @media (max-width: 820px) and (max-height: 500px) {
      .sidebar { height: 74dvh; }
      body.sheet-full .sidebar { height: 92dvh; }
      .kpi-strip { display: none; }
    }
  </style>
</head>
<body>
  <div id="map"></div>

  <button class="sidebar-toggle" id="sidebarToggle" title="收合 / 展開側欄（快捷鍵 B）">☰</button>

  <div class="top-bar">
    <div class="gis-toolbar">
      <button class="tool-btn" id="btnFitAll" title="縮放至全宮崎縣範圍（快捷鍵 0）">全縣視角</button>
      <span class="tool-sep"></span>
      <select class="basemap-quick" id="basemapQuick" title="快速切換 9 款專業 GIS 底圖">
        <option value="esri_sat" selected>底圖：Esri 高解析衛星</option>
        <option value="esri_clarity">底圖：Esri Clarity 清晰衛星</option>
        <option value="gsi_photo">底圖：日本國土地理院 航空寫真</option>
        <option value="gsi_pale">底圖：國土地理院 淡色極簡圖</option>
        <option value="gsi_std">底圖：國土地理院 標準地形圖</option>
        <option value="esri_topo">底圖：Esri 地形等高線</option>
        <option value="esri_relief">底圖：Esri 地形暈渲</option>
        <option value="osm">底圖：OpenStreetMap 路網</option>
        <option value="carto_light">底圖：CartoDB 極簡白底</option>
      </select>
      <span class="tool-sep"></span>
      <button class="tool-btn active-park" id="btnParkLayer" title="開關 18 處全縣關鍵停車場圖層">P・停車</button>
      <button class="tool-btn active-food" id="btnFoodLayer" title="開關 12 間必吃美食圖層">食・美食</button>
      <button class="tool-btn active-shop" id="btnShopLayer" title="開關 10 處購物特產圖層">買・購物</button>
      <span class="tool-sep"></span>
      <button class="tool-btn active" id="btnHybrid" title="疊加 Esri 衛星地名與道路標註">衛星標註</button>
      <button class="tool-btn active" id="btnRegions" title="顯示五大地理分區圖層">五大分區</button>
      <button class="tool-btn" id="btnSwipe" title="開啟雙底圖捲簾對比模式（快捷鍵 S）">捲簾對比</button>
      <button class="tool-btn" id="btnMeasure" title="距離與面積量測工具（快捷鍵 M）">空間量測</button>
      <button class="tool-btn" id="btnTour" title="依序飛覽全縣 4 天 3 夜景點">航線導覽</button>
    </div>
  </div>

  <!-- Split-Screen Swipe Compare Controls -->
  <div class="swipe-divider" id="swipeDivider" title="左右拖曳對比雙底圖">
    <div class="swipe-handle">⇄</div>
  </div>
  <div class="swipe-banner" id="swipeBanner">
    <span class="swipe-tag">捲簾對比</span>
    <span>左側：<strong id="swipeLeftLabel">Esri 衛星</strong></span>
    <span>｜右側：</span>
    <select class="swipe-select" id="swipeRightSelect">
      <option value="gsi_pale" selected>國土地理院 淡色極簡圖</option>
      <option value="gsi_std">國土地理院 標準地形圖</option>
      <option value="gsi_photo">國土地理院 航空寫真</option>
      <option value="osm">OpenStreetMap 路網</option>
      <option value="esri_topo">Esri 地形等高線</option>
      <option value="esri_relief">Esri 地形暈渲</option>
      <option value="carto_light">CartoDB 極簡白底</option>
      <option value="esri_sat">Esri 高解析衛星</option>
    </select>
    <button class="measure-clear" id="btnSwipeClose">結束對比</button>
  </div>

  <!-- Cartographic North Arrow & Right Floating Stack -->
  <div class="north-arrow" title="正北方向（WGS84）">
    <span>N</span>
    <svg width="14" height="18" viewBox="0 0 14 18" fill="none">
      <path d="M7 1L12 16L7 12.6L2 16L7 1Z" fill="#0F172A"/>
      <path d="M7 1L12 16L7 12.6V1Z" fill="#2563EB"/>
    </svg>
  </div>
  <div class="right-ctrl-stack">
    <button class="map-fab" id="btnLocate" title="GPS 定位我的位置與最近景點（快捷鍵 L）">◎</button>
    <button class="map-fab" id="btnHelp" title="鍵盤快捷鍵與 GIS 操作說明（快捷鍵 ?）">?</button>
  </div>

  <!-- GIS Right-Click Context Menu -->
  <div class="ctx-menu" id="ctxMenu">
    <div class="ctx-coord"><span id="ctxCoordText">32.0000, 131.3000</span><span>WGS84</span></div>
    <button class="ctx-item" id="ctxCopyCoord">📋 複製此點 WGS84 坐標</button>
    <button class="ctx-item" id="ctxBuffer">⭕ 以此點做 15 km 環域搜尋</button>
    <button class="ctx-item" id="ctxMeasure">📏 從此點開始空間量測</button>
    <button class="ctx-item" id="ctxAddPin">📌 釘選「我的自訂標記」</button>
    <button class="ctx-item" id="ctxStreetView">🧭 開啟 Google Maps 街景</button>
  </div>

  <!-- Keyboard Shortcuts & Tips Modal -->
  <div class="help-backdrop" id="helpModal">
    <div class="help-card">
      <div class="help-head">
        <span class="help-title">WebGIS 快捷鍵與進階操作說明</span>
        <button class="modal-close" id="btnHelpClose">×</button>
      </div>
      <div class="help-grid">
        <div><span class="kbd">0</span>全縣總覽視角</div>
        <div><span class="kbd">1-4</span>切換 Day 1–4</div>
        <div><span class="kbd">S</span>雙底圖捲簾對比</div>
        <div><span class="kbd">M</span>距離／面積量測</div>
        <div><span class="kbd">P</span>開關 18 處停車場</div>
        <div><span class="kbd">L</span>GPS 定位我的位置</div>
        <div><span class="kbd">B</span>收合／展開側欄</div>
        <div><span class="kbd">?</span>開啟本說明視窗</div>
        <div><span class="kbd">Esc</span>關閉工具／彈窗</div>
      </div>
      <div style="margin-top:11px;padding-top:9px;border-top:1px solid var(--hairline);font-size:10.8px;color:var(--ink-soft);line-height:1.6">
        <strong>專業操作技巧：</strong>在地圖任意處<strong>點擊右鍵</strong>，可直接複製 WGS84 坐標、執行 15 km 周邊停車/美食環域搜尋、開啟 Google 街景，或釘選屬於自己的私人景點標記（離線儲存於瀏覽器並支援 GPX/GeoJSON 匯出）。
      </div>
    </div>
  </div>

  <!-- Collapsible Cartographic Legend -->
  <div class="map-legend" id="mapLegend">
    <div class="leg-title" id="legToggle"><span>GIS 圖例（實際公路路網）</span><span id="legCaret">−</span></div>
    <div class="leg-body">
      <div class="leg-row"><span class="swatch" style="background:var(--d1)"></span>Day 01 日向延岡</div>
      <div class="leg-row"><span class="swatch" style="background:var(--d2)"></span>Day 02 高千穗綾町</div>
      <div class="leg-row"><span class="swatch" style="background:var(--d3)"></span>Day 03 日南都井岬</div>
      <div class="leg-row"><span class="swatch" style="background:var(--d4)"></span>Day 04 霧島蝦野</div>
      <div class="leg-row"><span class="swatch sq" style="background:var(--park-c)"></span>P・停車場 (${PARKING_SPOTS.length})</div>
      <div class="leg-row"><span class="swatch sq" style="background:var(--food-c)"></span>食・必吃美食</div>
      <div class="leg-row"><span class="swatch sq" style="background:var(--shop-c)"></span>買・購物工藝</div>
    </div>
  </div>

  <!-- Measure Banner -->
  <div class="measure-banner" id="measureBanner">
    <button class="measure-mode-btn active" id="modeDist">距離 (km)</button>
    <button class="measure-mode-btn" id="modeArea">面積 (km²)</button>
    <span id="measureText">請於地圖依序點擊量測直線距離</span>
    <button class="measure-clear" id="btnMeasureClear">清除重測</button>
  </div>

  <!-- Left MUJI Sidebar / Mobile Bottom Sheet -->
  <aside class="sidebar" id="sidebar">
    <div class="sheet-handle" id="sheetHandle" title="上下拖曳或點擊切換面板高度">
      <span class="sheet-pill-bar"></span>
      <span class="sheet-handle-hint" id="sheetHandleHint">點擊全展開 · 下滑收合</span>
    </div>
    <div class="sb-header">
      <div class="sb-top-row">
        <div class="sb-kicker">ALL-MIYAZAKI REAL-ROAD WEBGIS</div>
        <div class="sb-head-actions">
          <button class="print-mini-btn" id="btnShareView" title="複製目前視角、底圖與天數之專屬分享網址">分享視角</button>
          <button class="print-mini-btn" id="btnPrint" title="列印 / 匯出旅途手冊 PDF">列印手冊</button>
        </div>
      </div>
      <div class="sb-title">全宮崎縣 四天三夜旅圖</div>
      <div class="sb-sub">OSRM 實際公路路網（${totalRoadKm} km）× 9 款底圖 × ${PARKING_SPOTS.length} 處停車 × ${compactVideos.length} 部 YT × ${webGuides.length} 篇網頁攻略（更新 ${lastUpdated}）。</div>

      <div class="omni-wrap">
        <input type="text" class="omni-input" id="omniInput" placeholder="全域搜尋：景點、停車場、餐廳、商場、市町或 Mapcode..." autocomplete="off" />
        <button class="omni-clear" id="omniClear">×</button>
        <div class="omni-results" id="omniResults"></div>
      </div>

      <div class="kpi-strip">
        <div class="kpi-box"><div class="kpi-val">${totalRoadKm} km</div><div class="kpi-lbl">實際路網總長</div></div>
        <div class="kpi-box"><div class="kpi-val">${PARKING_SPOTS.length} 處</div><div class="kpi-lbl">實測停車場</div></div>
        <div class="kpi-box"><div class="kpi-val">${webGuides.length} 篇</div><div class="kpi-lbl">網頁攻略情報</div></div>
        <div class="kpi-box"><div class="kpi-val">${compactVideos.length}</div><div class="kpi-lbl">實測 YT 影片</div></div>
      </div>

      <div class="progress-row">
        <span id="progText">旅途清單進度：0 / ${pois.length + FOOD_SPOTS.length + SPECIALTIES.length + SOUVENIRS.length}</span>
        <div class="progress-track"><div class="progress-fill" id="progFill"></div></div>
      </div>
    </div>

    <div class="sb-tabs">
      <button class="sb-tab active" data-tab="itinerary">環縣行程</button>
      <button class="sb-tab" data-tab="gourmet">美食停車</button>
      <button class="sb-tab" data-tab="gis">底圖分析</button>
      <button class="sb-tab" data-tab="videos">影音情報</button>
    </div>

    <div class="sb-body">
      <!-- TAB 1: ITINERARY -->
      <div class="tab-pane active" id="tab-itinerary">
        <div class="region-strip">
          <button class="region-chip" onclick="zoomRegion('north_coast')">日向・延岡</button>
          <button class="region-chip" onclick="zoomRegion('north_mountain')">高千穗</button>
          <button class="region-chip" onclick="zoomRegion('central')">宮崎・西都・綾町</button>
          <button class="region-chip" onclick="zoomRegion('south_coast')">日南・串間</button>
          <button class="region-chip" onclick="zoomRegion('west_kirishima')">都城・蝦野霧島</button>
        </div>
        <div class="day-pills" id="dayPills">
          <button class="day-pill active" data-day="all">全縣</button>
          <button class="day-pill" data-day="1">Day 1</button>
          <button class="day-pill" data-day="2">Day 2</button>
          <button class="day-pill" data-day="3">Day 3</button>
          <button class="day-pill" data-day="4">Day 4</button>
        </div>
        <div id="itineraryList"></div>
      </div>

      <!-- TAB 2: FOOD, PARKING, SHOPPING, SPECIALTIES & SOUVENIRS -->
      <div class="tab-pane" id="tab-gourmet">
        <div class="sub-pills" id="gourmetPills">
          <button class="sub-pill active" data-sub="parking">🅿 停車攻略 (${PARKING_SPOTS.length})</button>
          <button class="sub-pill" data-sub="food">必吃美食 (${FOOD_SPOTS.length})</button>
          <button class="sub-pill" data-sub="shop">購物據點 (${SHOP_SPOTS.length})</button>
          <button class="sub-pill" data-sub="spec">特產伴手禮 (${SPECIALTIES.length})</button>
          <button class="sub-pill" data-sub="souvenir" style="grid-column:1 / -1">必買紀念品 (${SOUVENIRS.length})</button>
        </div>
        <div id="gourmetList"></div>
      </div>

      <!-- TAB 3: BASEMAP GALLERY & SPATIAL ANALYSIS -->
      <div class="tab-pane" id="tab-gis">
        <div class="section-box">
          <div class="section-title"><span>專業底圖切換（共 9 款）</span></div>
          <div class="bm-grid" id="bmGallery">
            <button class="bm-card active" data-bm="esri_sat"><span class="bm-name">Esri 衛星影像</span><span class="bm-sub">World Imagery（預設）</span></button>
            <button class="bm-card" data-bm="esri_clarity"><span class="bm-name">Esri Clarity 衛星</span><span class="bm-sub">高清晰無雲衛星</span></button>
            <button class="bm-card" data-bm="gsi_photo"><span class="bm-name">國土地理院 航照</span><span class="bm-sub">日本官方無縫航空寫真</span></button>
            <button class="bm-card" data-bm="gsi_pale"><span class="bm-name">國土地理院 淡色</span><span class="bm-sub">極簡淺色官方地形</span></button>
            <button class="bm-card" data-bm="gsi_std"><span class="bm-name">國土地理院 標準</span><span class="bm-sub">詳細日文路名與等高線</span></button>
            <button class="bm-card" data-bm="esri_topo"><span class="bm-name">Esri 地形圖</span><span class="bm-sub">World Topo Map</span></button>
            <button class="bm-card" data-bm="esri_relief"><span class="bm-name">Esri 地形暈渲</span><span class="bm-sub">山脈立體陰影地形</span></button>
            <button class="bm-card" data-bm="osm"><span class="bm-name">OpenStreetMap</span><span class="bm-sub">全球詳細街道與停車場</span></button>
            <button class="bm-card" data-bm="carto_light" style="grid-column:1 / -1"><span class="bm-name">CartoDB Positron 極簡白底</span><span class="bm-sub">出版級極簡淺灰底圖，最適合專注檢視路線與資料</span></button>
          </div>
          <div class="layer-row"><label class="layer-label"><input type="checkbox" id="chkHybrid" checked /> Esri 地名與道路疊加層（衛星專用）</label></div>
          <div class="layer-row"><label class="layer-label"><input type="checkbox" id="chkPark" checked /> <span class="swatch sq" style="background:var(--park-c)"></span> 停車場專層（${PARKING_SPOTS.length} 處實測車位）</label></div>
          <div class="layer-row"><label class="layer-label"><input type="checkbox" id="chkFood" checked /> <span class="swatch sq" style="background:var(--food-c)"></span> 必吃美食專層（${FOOD_SPOTS.length} 店）</label></div>
          <div class="layer-row"><label class="layer-label"><input type="checkbox" id="chkShop" checked /> <span class="swatch sq" style="background:var(--shop-c)"></span> 購物與工藝專層（${SHOP_SPOTS.length} 處）</label></div>
          <div class="layer-row"><label class="layer-label"><input type="checkbox" id="chkRegions" checked /> 五大地理分區範圍（Polygon）</label></div>
          <div class="layer-row"><label class="layer-label"><input type="checkbox" id="chkRoutes" checked /> OSRM 實際公路路網（Polyline）</label></div>
          <div class="layer-row"><label class="layer-label"><input type="checkbox" id="chkHeat" checked /> YouTube 聲量比例圓（Heat Ring）</label></div>
          <div class="layer-row"><label class="layer-label"><input type="checkbox" id="chkUserPins" checked /> <span class="swatch" style="background:var(--muji-red)"></span> 我的自訂標記（右鍵地圖釘選，<span id="userPinCount">0</span> 處）</label></div>
          <div class="slider-row">
            <span>疊加透明度</span>
            <input type="range" id="overlayOpacity" min="0" max="100" value="65" />
            <span id="opacityVal">65%</span>
          </div>
        </div>

        <div class="section-box">
          <div class="section-title">
            <span>環域周邊搜尋（Spatial Buffer）</span>
            <button class="fit-btn" id="btnClearBuffer" style="display:none">清除環域</button>
          </div>
          <div class="buffer-controls" id="bufRadiusPills">
            <button class="buf-btn" data-km="5">半徑 5 km</button>
            <button class="buf-btn active" data-km="15">半徑 15 km</button>
            <button class="buf-btn" data-km="30">半徑 30 km</button>
          </div>
          <div class="buf-list" id="bufferResults">
            <div style="color:var(--ink-muted);line-height:1.5">點選地圖任一景點彈窗內的「<strong>周邊搜尋</strong>」，即會繪製球面環域並依距離列出周邊<strong>停車場、美食與購物</strong>。</div>
          </div>
        </div>

        <div class="section-box">
          <div class="section-title"><span>依天數開關實際路網圖層</span></div>
          <div class="layer-row"><label class="layer-label"><input type="checkbox" class="day-chk" data-day="1" checked /> <span class="swatch" style="background:var(--d1)"></span> Day 01 宮崎・西都・日向・延岡（${dayRoutes[1].distKm} km）</label></div>
          <div class="layer-row"><label class="layer-label"><input type="checkbox" class="day-chk" data-day="2" checked /> <span class="swatch" style="background:var(--d2)"></span> Day 02 高千穗・綾町・宮崎市（${dayRoutes[2].distKm} km）</label></div>
          <div class="layer-row"><label class="layer-label"><input type="checkbox" class="day-chk" data-day="3" checked /> <span class="swatch" style="background:var(--d3)"></span> Day 03 青島・日南・都井岬・都城（${dayRoutes[3].distKm} km）</label></div>
          <div class="layer-row"><label class="layer-label"><input type="checkbox" class="day-chk" data-day="4" checked /> <span class="swatch" style="background:var(--d4)"></span> Day 04 關之尾・牧場・蝦野・機場（${dayRoutes[4].distKm} km）</label></div>
        </div>

        <div class="section-box">
          <div class="section-title">
            <span>${compactVideos.length} 部影片聲量排行</span>
            <span style="font-size:10px;color:var(--ink-muted);font-weight:500">點選篩選</span>
          </div>
          <div id="statsBars"></div>
        </div>

        <div class="section-box">
          <div class="section-title"><span>匯出實際路網 GIS 資料與手冊</span></div>
          <div class="export-grid">
            <button class="export-btn" id="btnExportGeoJSON">下載 GeoJSON</button>
            <button class="export-btn" id="btnExportGPX">下載 GPX 路網</button>
            <button class="export-btn" id="btnPrint2">列印行程手冊</button>
            <a class="export-btn" href="miyazaki_youtube_blog_guide.pdf" target="_blank" rel="noopener" style="text-align:center;text-decoration:none">下載影音攻略 PDF</a>
            <button class="export-btn" id="btnResetChecks" style="grid-column:1 / -1">重設勾選清單</button>
          </div>
        </div>
      </div>

      <!-- TAB 4: YOUTUBE VIDEO CORPUS & WEB GUIDES -->
      <div class="tab-pane" id="tab-videos">
        <div class="sub-pills" id="intelPills" style="margin-bottom:8px">
          <button class="sub-pill active" data-intel="yt">YouTube 影片 (${compactVideos.length})</button>
          <button class="sub-pill" data-intel="web">網頁攻略＆伴手禮 (${webGuides.length})</button>
        </div>
        <a class="load-more-btn" href="miyazaki_youtube_blog_guide.pdf" target="_blank" rel="noopener" style="display:block;text-align:center;text-decoration:none;margin:0 0 9px;background:var(--muji-red-soft);border-color:var(--muji-red-border);color:var(--muji-red)">📄 開啟 / 下載完整 YouTube ＆ 網頁攻略 PDF 手冊</a>
        <div id="intelYtPane">
          <div class="yt-search-wrap">
            <input type="text" class="yt-input" id="ytSearch" placeholder="搜尋標題或頻道（例：伴手禮、購物、日向、高千穗）" />
            <select class="yt-select" id="ytTagFilter">
              <option value="all">全部全縣主題（共 ${compactVideos.length} 部實測 YouTube 影片）</option>
            </select>
          </div>
          <div class="yt-count-bar">
            <span id="ytCountText">顯示 ${compactVideos.length} 部影片</span>
            <span>點擊開啟 YouTube</span>
          </div>
          <div id="ytList"></div>
        </div>
        <div id="intelWebPane" style="display:none">
          <div class="yt-search-wrap">
            <input type="text" class="yt-input" id="webSearch" placeholder="搜尋網頁攻略（例：伴手禮、AEON、起司饅頭、高千穗）" />
            <select class="yt-select" id="webCatFilter">
              <option value="all">全部情報類別（共 ${webGuides.length} 篇）</option>
              <option value="souvenir">伴手禮・土產必買</option>
              <option value="shopping">購物商圈・商場免稅</option>
              <option value="travel">旅遊景點・官方指南</option>
              <option value="food">在地美食・邊走邊吃</option>
            </select>
            <select class="yt-select" id="webSortFilter">
              <option value="newest">排序：最新雲端更新優先</option>
              <option value="curated">排序：官方精選指南優先</option>
            </select>
          </div>
          <div class="yt-count-bar">
            <span id="webCountText">顯示 ${webGuides.length} 篇情報</span>
            <span>更新：${lastUpdated}</span>
          </div>
          <div id="webList"></div>
        </div>
      </div>
    </div>
  </aside>

  <button class="mobile-sheet-fab" id="mobileSheetFab">▲ 行程・停車・美食・影音</button>

  <div class="status-bar">
    <span>更新 <strong>${lastUpdated}</strong></span>
    <span>路網 <strong>OSRM 實際道路</strong></span>
    <span>坐標 <strong id="coordReadout">32.0500°N, 131.3200°E</strong></span>
    <span>Zoom <strong id="zoomReadout">9</strong></span>
    <span style="color:#9E9589;cursor:pointer" onclick="toggleHelpModal(true)" title="檢視完整快捷鍵說明">快捷鍵 <strong>S · M · P · L · ?</strong></span>
  </div>

  <div class="toast" id="toast"></div>
  <div id="printSheet"></div>

  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" crossorigin=""></script>
  <script>
    const POIS = ${JSON.stringify(pois)};
    const PARKING_SPOTS = ${JSON.stringify(PARKING_SPOTS)};
    const FOOD_SPOTS = ${JSON.stringify(FOOD_SPOTS)};
    const SHOP_SPOTS = ${JSON.stringify(SHOP_SPOTS)};
    const SPECIALTIES = ${JSON.stringify(SPECIALTIES)};
    const SOUVENIRS = ${JSON.stringify(SOUVENIRS)};
    const DAY_ROUTES = ${JSON.stringify(dayRoutes)};
    const DAY3_STAY_LEG = ${JSON.stringify(day3ToStayLeg)};
    const REGIONS = ${JSON.stringify(REGIONS)};
    const TOPIC_STATS = ${JSON.stringify(topicStats)};
    const YT_VIDEOS = ${JSON.stringify(compactVideos)};
    const WEB_GUIDES = ${JSON.stringify(webGuides)};

    const DAY_COLORS = { 1: '#2563EB', 2: '#059669', 3: '#D97706', 4: '#7C3AED' };
    const CAT_LABELS = { spot: '景點', food: '餐桌', stay: '宿泊', transport: '交通' };

    const VIDEOS_BY_TAG = {};
    YT_VIDEOS.forEach(v => (v.g || []).forEach(tag => {
      if (!VIDEOS_BY_TAG[tag]) VIDEOS_BY_TAG[tag] = [];
      VIDEOS_BY_TAG[tag].push(v);
    }));

    const STORE_KEY = 'miyazaki_webgis_checked_v1';
    let checkedSet = new Set();
    try {
      const saved = JSON.parse(localStorage.getItem(STORE_KEY) || '[]');
      if (Array.isArray(saved)) checkedSet = new Set(saved);
    } catch (e) {}

    function saveChecks() {
      try { localStorage.setItem(STORE_KEY, JSON.stringify([...checkedSet])); } catch (e) {}
      updateProgress();
    }
    function updateProgress() {
      const total = POIS.length + FOOD_SPOTS.length + SPECIALTIES.length + SOUVENIRS.length;
      document.getElementById('progText').textContent = \`旅途清單進度：\${checkedSet.size} / \${total}\`;
      document.getElementById('progFill').style.width = Math.round((checkedSet.size / total) * 100) + '%';
    }
    window.toggleCheck = function(ev, id) {
      ev.stopPropagation();
      if (checkedSet.has(id)) checkedSet.delete(id); else checkedSet.add(id);
      saveChecks();
      const card = document.getElementById('card-' + id);
      const btn = document.getElementById('chk-' + id);
      if (card) card.classList.toggle('checked', checkedSet.has(id));
      if (btn) btn.classList.toggle('done', checkedSet.has(id));
    };

    let toastTimer = null;
    function showToast(msg) {
      const el = document.getElementById('toast');
      el.textContent = msg; el.classList.add('show');
      if (toastTimer) clearTimeout(toastTimer);
      toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
    }
    window.copyText = function(text, label) {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => showToast(\`已複製 \${label}：\${text}\`));
      } else showToast(\`\${label}：\${text}\`);
    };

    // =========================================================================
    // INITIALIZE MAP WITH 9 PROFESSIONAL BASEMAPS (60fps GPU-Composited Pan)
    // =========================================================================
    const map = L.map('map', {
      center: [32.05, 131.30], zoom: 9, zoomControl: false, maxZoom: 18,
      preferCanvas: false, inertiaDeceleration: 2800, wheelDebounceTime: 40
    });
    L.control.zoom({ position: 'topright' }).addTo(map);
    L.control.scale({ position: 'bottomleft', imperial: false, metric: true }).addTo(map);

    const TILE_PERF_OPTS = { updateWhenIdle: true, updateWhenZooming: false, keepBuffer: 2 };
    const BASEMAP_META = {
      esri_sat: { name: 'Esri 高解析衛星', isSat: true, url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', opts: { attribution: 'Tiles &copy; Esri &mdash; Esri, Maxar, Earthstar Geographics, IGN', maxZoom: 18 } },
      esri_clarity: { name: 'Esri Clarity 衛星', isSat: true, url: 'https://clarity.maptiles.arcgis.com/arcgis/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', opts: { attribution: 'Tiles &copy; Esri Imagery Clarity', maxZoom: 18 } },
      gsi_photo: { name: '國土地理院 航空寫真', isSat: true, url: 'https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/{z}/{x}/{y}.jpg', opts: { attribution: '地理院タイル（国土地理院・シームレス空中写真）', maxZoom: 18 } },
      gsi_pale: { name: '國土地理院 淡色極簡圖', isSat: false, url: 'https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png', opts: { attribution: '地理院タイル（国土地理院・淡色地図）', maxZoom: 18 } },
      gsi_std: { name: '國土地理院 標準地形圖', isSat: false, url: 'https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png', opts: { attribution: '地理院タイル（国土地理院・標準地図）', maxZoom: 18 } },
      esri_topo: { name: 'Esri 地形等高線', isSat: false, url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', opts: { attribution: 'Tiles &copy; Esri World Topo', maxZoom: 18 } },
      esri_relief: { name: 'Esri 地形暈渲', isSat: false, url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Shaded_Relief/MapServer/tile/{z}/{y}/{x}', opts: { attribution: 'Tiles &copy; Esri Shaded Relief', maxZoom: 13 } },
      osm: { name: 'OpenStreetMap 路網', isSat: false, url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', opts: { attribution: '&copy; OpenStreetMap contributors', maxZoom: 19 } },
      carto_light: { name: 'CartoDB 極簡白底', isSat: false, url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', opts: { attribution: '&copy; OpenStreetMap &copy; CARTO', subdomains: 'abcd', maxZoom: 19 } }
    };
    const basemaps = {};
    Object.keys(BASEMAP_META).forEach(k => {
      basemaps[k] = { isSat: BASEMAP_META[k].isSat, name: BASEMAP_META[k].name, layer: L.tileLayer(BASEMAP_META[k].url, { ...TILE_PERF_OPTS, ...BASEMAP_META[k].opts }) };
    });
    let activeBasemap = 'esri_sat';
    basemaps.esri_sat.layer.addTo(map);

    // Dedicated pane for Split-Screen Swipe Compare (sits above primary tilePane, below overlays)
    map.createPane('swipePane');
    map.getPane('swipePane').style.zIndex = 240;
    map.getPane('swipePane').style.pointerEvents = 'none';

    const esriLabels = L.tileLayer('https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', { ...TILE_PERF_OPTS, maxZoom: 18, opacity: 0.9 });
    const esriRoads = L.tileLayer('https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}', { ...TILE_PERF_OPTS, maxZoom: 18, opacity: 0.5 });
    const hybridGroup = L.layerGroup([esriRoads, esriLabels]).addTo(map);

    const regionGroup = L.layerGroup().addTo(map);
    const dayMarkerGroups = { 1: L.layerGroup().addTo(map), 2: L.layerGroup().addTo(map), 3: L.layerGroup().addTo(map), 4: L.layerGroup().addTo(map) };
    const dayRouteGroups = { 1: L.layerGroup().addTo(map), 2: L.layerGroup().addTo(map), 3: L.layerGroup().addTo(map), 4: L.layerGroup().addTo(map) };
    const parkGroup = L.layerGroup().addTo(map);
    const foodGroup = L.layerGroup().addTo(map);
    const shopGroup = L.layerGroup().addTo(map);
    const heatGroup = L.layerGroup().addTo(map);
    const bufferGroup = L.layerGroup().addTo(map);
    const measureGroup = L.layerGroup().addTo(map);
    const userPinGroup = L.layerGroup().addTo(map);
    const gpsGroup = L.layerGroup().addTo(map);

    const markersById = {};
    const regionPolys = [];
    const heatCircles = [];

    function esc(str) {
      return String(str || '').replace(/[&<>"']/g, s => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[s]));
    }

    function switchBasemap(key) {
      if (!basemaps[key] || key === activeBasemap) return;
      map.removeLayer(basemaps[activeBasemap].layer);
      activeBasemap = key;
      basemaps[key].layer.addTo(map);
      basemaps[key].layer.bringToBack();
      document.getElementById('basemapQuick').value = key;
      document.querySelectorAll('.bm-card').forEach(c => c.classList.toggle('active', c.dataset.bm === key));
      document.getElementById('swipeLeftLabel').textContent = basemaps[key].name;
      // Auto-toggle satellite hybrid labels cleanly when switching between satellite and vector street maps
      setHybrid(basemaps[key].isSat);
      scheduleHashSync();
    }

    document.getElementById('basemapQuick').addEventListener('change', e => switchBasemap(e.target.value));
    document.getElementById('bmGallery').addEventListener('click', e => {
      const card = e.target.closest('.bm-card');
      if (card) switchBasemap(card.dataset.bm);
    });

    // 5 Geographic Regions Overlay
    REGIONS.forEach(reg => {
      const poly = L.polygon(reg.poly, {
        color: '#FFFFFF', weight: 1.4, dashArray: '5, 5', opacity: 0.65,
        fillColor: reg.color, fillOpacity: 0.09, interactive: false
      }).addTo(regionGroup);
      regionPolys.push(poly);
      L.marker([reg.poly[0][0] - 0.025, reg.poly[0][1] + 0.015], {
        interactive: false,
        icon: L.divIcon({ className: 'region-tag-wrap', html: \`<div class="region-tag" style="border-left:3px solid \${reg.color}">\${esc(reg.name)}</div>\`, iconSize: [0, 0] })
      }).addTo(regionGroup);
    });

    // Draw REAL OSRM Road-Network Polylines (smoothFactor simplified for 60fps pan)
    Object.keys(DAY_ROUTES).forEach(d => {
      const r = DAY_ROUTES[d];
      const dayPois = POIS.filter(p => p.day === Number(d));
      const minE = Math.min(...dayPois.map(p => p.elev)), maxE = Math.max(...dayPois.map(p => p.elev));
      L.polyline(r.coords, { color: '#FFFFFF', weight: 6, opacity: 0.85, lineJoin: 'round', smoothFactor: 2.5, interactive: false }).addTo(dayRouteGroups[d]);
      const line = L.polyline(r.coords, {
        color: r.color, weight: 3.6, opacity: 0.96, lineJoin: 'round', smoothFactor: 2.5,
        dashArray: d === '4' ? '7, 6' : null
      }).bindTooltip(\`<strong>\${r.name}</strong><br>OSRM 實際路網：\${r.distKm} km（約 \${Math.floor(r.driveMin/60)}h \${r.driveMin%60}m）<br>海拔範圍：\${minE} m ～ \${maxE} m（點擊縮放至本日）\`);
      line.on('mouseover', () => { if (!isMapDragging) line.setStyle({ weight: 5.5, opacity: 1 }); });
      line.on('mouseout', () => line.setStyle({ weight: 3.6, opacity: 0.96 }));
      line.on('click', () => { if (!measuring) fitDay(Number(d)); });
      line.addTo(dayRouteGroups[d]);
    });

    function buildVideoBlock(tag) {
      const rel = VIDEOS_BY_TAG[tag] || [];
      const sample = rel.slice(0, 4);
      const links = sample.map(v =>
        \`<a class="pop-yt-link" href="https://www.youtube.com/watch?v=\${v.id}" target="_blank" rel="noopener">▸ \${esc(v.t)} <span style="color:#857E73">（\${esc(v.c)}\${v.l ? ' · ' + esc(v.l) : ''}）</span></a>\`
      ).join('');
      return { count: rel.length, html: \`<div class="pop-yt-title">相關實測 YouTube 影片（精選 \${sample.length} / \${rel.length} 部）</div><div class="pop-yt-list">\${links}</div>\` };
    }

    // Itinerary POI Markers
    POIS.forEach(p => {
      const color = DAY_COLORS[p.day];
      const vb = buildVideoBlock(p.tag);
      if (p.cat !== 'transport') {
        const c = L.circle([p.lat, p.lng], {
          radius: Math.max(1400, Math.min(8200, vb.count * 105)),
          color: '#FFFFFF', weight: 1.1, opacity: 0.65, fillColor: color, fillOpacity: 0.18, interactive: false
        }).addTo(heatGroup);
        heatCircles.push(c);
      }
      const icon = L.divIcon({
        className: 'custom-pin-wrap',
        html: \`<div class="custom-pin" style="background:\${color};"><span>\${p.day}-\${p.seq}</span></div>\`,
        iconSize: [28, 28], iconAnchor: [14, 14], popupAnchor: [0, -16]
      });
      const gmapsUrl = \`https://www.google.com/maps/search/?api=1&query=\${p.lat},\${p.lng}\`;
      const popupHtml = \`
        <div>
          <div class="pop-head">
            <span class="pop-day" style="background:\${color}">DAY 0\${p.day} · 0\${p.seq} · \${esc(p.area)}</span>
            <span class="park-chip">\${esc(p.parkBadge)}</span>
          </div>
          <div class="pop-title">\${esc(p.name)}</div>
          <div class="pop-jp">\${esc(p.jp)} · 海拔 \${p.elev}m · YT \${vb.count}部</div>
          <div class="pop-grid">
            <div><span>建議時段</span><strong>\${esc(p.time)}</strong></div>
            <div><span>停留時間</span><strong>\${esc(p.stay)}</strong></div>
            <div><span>自駕 Mapcode（點擊複製）</span><strong class="copyable" onclick="copyText('\${esc(p.mapcode)}','Mapcode')">\${esc(p.mapcode)}</strong></div>
            <div><span>WGS84（點擊複製）</span><strong class="copyable" onclick="copyText('\${p.lat.toFixed(4)},\${p.lng.toFixed(4)}','坐標')">\${p.lat.toFixed(4)}, \${p.lng.toFixed(4)}</strong></div>
          </div>
          <div class="pop-park"><strong>🅿 停車規劃：</strong>\${esc(p.parkDetail)}</div>
          <div class="pop-desc">\${esc(p.summary)}</div>
          <div class="pop-tip">旅途備註：\${esc(p.tips)}</div>
          \${vb.html}
          <div class="pop-actions">
            <a class="pop-nav-btn" href="\${gmapsUrl}" target="_blank" rel="noopener">Google 導航</a>
            <button class="pop-nav-btn sec" onclick="runBufferAnalysis(\${p.lat}, \${p.lng}, '\${esc(p.name)}')">周邊停車/美食</button>
            <button class="pop-nav-btn sec" onclick="openVideoTabWithTag('\${p.tag}')">看 \${vb.count} 部YT</button>
          </div>
        </div>
      \`;
      const marker = L.marker([p.lat, p.lng], { icon }).bindPopup(popupHtml, { maxWidth: 360 });
      marker.on('click', () => highlightCard(p.id));
      marker.addTo(dayMarkerGroups[p.day]);
      markersById[p.id] = marker;
    });

    // Dedicated Parking GIS Markers (P)
    PARKING_SPOTS.forEach(pk => {
      const icon = L.divIcon({ className: 'park-pin-wrap', html: '<div class="park-pin">P</div>', iconSize: [25, 25], iconAnchor: [12, 12], popupAnchor: [0, -14] });
      const gmapsUrl = \`https://www.google.com/maps/search/?api=1&query=\${pk.lat},\${pk.lng}\`;
      const popupHtml = \`
        <div>
          <div class="pop-head">
            <span class="pop-day" style="background:var(--park-c)">🅿 停車場 · \${esc(pk.area)}</span>
            <span class="\${pk.paid ? 'warn-chip' : 'ok-chip'}">\${esc(pk.fee)}</span>
          </div>
          <div class="pop-title">\${esc(pk.name)}</div>
          <div class="pop-jp">對應景點：\${esc(pk.target)}</div>
          <div class="pop-grid">
            <div><span>停車容量</span><strong>\${esc(pk.cap)}</strong></div>
            <div><span>步行距離</span><strong>\${esc(pk.walk)}</strong></div>
            <div><span>收費標準</span><strong>\${esc(pk.fee)}</strong></div>
            <div><span>WGS84（點擊複製）</span><strong class="copyable" onclick="copyText('\${pk.lat.toFixed(4)},\${pk.lng.toFixed(4)}','停車場坐標')">\${pk.lat.toFixed(4)}, \${pk.lng.toFixed(4)}</strong></div>
          </div>
          <div class="pop-park">\${esc(pk.note)}</div>
          <div class="pop-actions">
            <a class="pop-nav-btn" href="\${gmapsUrl}" target="_blank" rel="noopener">直達停車場導航</a>
            <button class="pop-nav-btn sec" onclick="runBufferAnalysis(\${pk.lat}, \${pk.lng}, '\${esc(pk.name)}')">周邊搜尋</button>
            <button class="pop-nav-btn sec" onclick="switchTab('gourmet'); renderGourmet('parking');">全部停車場</button>
          </div>
        </div>
      \`;
      const marker = L.marker([pk.lat, pk.lng], { icon, zIndexOffset: 240 }).bindPopup(popupHtml, { maxWidth: 350 });
      marker.on('click', () => highlightCard(pk.id));
      marker.addTo(parkGroup);
      markersById[pk.id] = marker;
    });

    // Food Markers
    FOOD_SPOTS.forEach(f => {
      const vb = buildVideoBlock(f.tag);
      const icon = L.divIcon({ className: 'food-pin-wrap', html: '<div class="food-pin">食</div>', iconSize: [25, 25], iconAnchor: [12, 12], popupAnchor: [0, -14] });
      const gmapsUrl = \`https://www.google.com/maps/search/?api=1&query=\${f.lat},\${f.lng}\`;
      const popupHtml = \`
        <div>
          <div class="pop-head">
            <span class="pop-day" style="background:var(--food-c)">必吃美食 · \${esc(f.area)}</span>
            <span class="yt-chip">YT 相關 \${vb.count} 部</span>
          </div>
          <div class="pop-title">\${esc(f.name)}</div>
          <div class="pop-jp">\${esc(f.sub)}</div>
          <div class="pop-grid full">
            <div><span>推薦必點與預算</span><strong>\${esc(f.dish)}</strong></div>
            <div><span>營業時間參考</span><strong>\${esc(f.hours)}</strong></div>
          </div>
          <div class="pop-park"><strong>🅿 停車提示：</strong>\${esc(f.park)}</div>
          <div class="pop-grid">
            <div><span>Mapcode（點擊複製）</span><strong class="copyable" onclick="copyText('\${esc(f.mapcode)}','Mapcode')">\${esc(f.mapcode)}</strong></div>
            <div><span>WGS84（點擊複製）</span><strong class="copyable" onclick="copyText('\${f.lat.toFixed(4)},\${f.lng.toFixed(4)}','坐標')">\${f.lat.toFixed(4)}, \${f.lng.toFixed(4)}</strong></div>
          </div>
          <div class="pop-desc">\${esc(f.desc)}</div>
          \${vb.html}
          <div class="pop-actions">
            <a class="pop-nav-btn" href="\${gmapsUrl}" target="_blank" rel="noopener">Google 導航</a>
            <button class="pop-nav-btn sec" onclick="runBufferAnalysis(\${f.lat}, \${f.lng}, '\${esc(f.name)}')">找周邊停車</button>
            <button class="pop-nav-btn sec" onclick="openVideoTabWithTag('\${f.tag}')">相關影片</button>
          </div>
        </div>
      \`;
      const marker = L.marker([f.lat, f.lng], { icon, zIndexOffset: 200 }).bindPopup(popupHtml, { maxWidth: 360 });
      marker.on('click', () => highlightCard(f.id));
      marker.addTo(foodGroup);
      markersById[f.id] = marker;
    });

    // Shopping & Craft Markers
    SHOP_SPOTS.forEach(s => {
      const icon = L.divIcon({ className: 'shop-pin-wrap', html: '<div class="shop-pin">買</div>', iconSize: [25, 25], iconAnchor: [12, 12], popupAnchor: [0, -14] });
      const gmapsUrl = \`https://www.google.com/maps/search/?api=1&query=\${s.lat},\${s.lng}\`;
      const popupHtml = \`
        <div>
          <div class="pop-head">
            <span class="pop-day" style="background:var(--shop-c)">購物工藝 · \${esc(s.area)}</span>
            <span class="yt-chip">全縣推薦據點</span>
          </div>
          <div class="pop-title">\${esc(s.name)}</div>
          <div class="pop-jp">\${esc(s.sub)}</div>
          <div class="pop-grid full">
            <div><span>必買特產與焦點商品</span><strong>\${esc(s.items)}</strong></div>
          </div>
          <div class="pop-park"><strong>🅿 停車資訊：</strong>\${esc(s.park)}</div>
          <div class="pop-grid">
            <div><span>營業時間</span><strong>\${esc(s.hours)}</strong></div>
            <div><span>Mapcode（點擊複製）</span><strong class="copyable" onclick="copyText('\${esc(s.mapcode)}','Mapcode')">\${esc(s.mapcode)}</strong></div>
          </div>
          <div class="pop-desc">\${esc(s.desc)}</div>
          <div class="pop-actions">
            <a class="pop-nav-btn" href="\${gmapsUrl}" target="_blank" rel="noopener">Google 導航</a>
            <button class="pop-nav-btn sec" onclick="runBufferAnalysis(\${s.lat}, \${s.lng}, '\${esc(s.name)}')">周邊搜尋</button>
            <button class="pop-nav-btn sec" onclick="switchTab('gourmet'); renderGourmet('souvenir');">看紀念品</button>
          </div>
        </div>
      \`;
      const marker = L.marker([s.lat, s.lng], { icon, zIndexOffset: 180 }).bindPopup(popupHtml, { maxWidth: 360 });
      marker.on('click', () => highlightCard(s.id));
      marker.addTo(shopGroup);
      markersById[s.id] = marker;
    });

    // =========================================================================
    // SPATIAL BUFFER ANALYSIS (Includes Parking, Food, Shop, POIs)
    // =========================================================================
    let currentBufferCenter = null, bufferRadiusKm = 15;

    function haversineKm(lat1, lng1, lat2, lng2) {
      const R = 6371, dLat = (lat2 - lat1) * Math.PI / 180, dLng = (lng2 - lng1) * Math.PI / 180;
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    window.runBufferAnalysis = function(lat, lng, title) {
      currentBufferCenter = { lat, lng, title };
      switchTab('gis');
      if (isMobileViewport()) setMobileSheetState('half');
      drawBuffer();
    };

    function drawBuffer() {
      bufferGroup.clearLayers();
      const box = document.getElementById('bufferResults');
      const clearBtn = document.getElementById('btnClearBuffer');
      if (!currentBufferCenter) {
        clearBtn.style.display = 'none';
        box.innerHTML = '<div style="color:var(--ink-muted);line-height:1.5">點選地圖任一景點彈窗內的「<strong>周邊搜尋</strong>」，即會繪製球面環域並依距離列出周邊<strong>停車場、美食與購物</strong>。</div>';
        return;
      }
      clearBtn.style.display = 'inline-block';
      const { lat, lng, title } = currentBufferCenter;
      const circle = L.circle([lat, lng], {
        radius: bufferRadiusKm * 1000, color: '#2563EB', weight: 2, dashArray: '6, 5', fillColor: '#2563EB', fillOpacity: 0.10
      }).addTo(bufferGroup);
      map.fitBounds(circle.getBounds(), getMapPadding());

      const allItems = [
        ...PARKING_SPOTS.map(pk => ({ id: pk.id, kind: 'park', label: 'P', color: '#33546D', name: pk.name + '（' + pk.fee + '）', lat: pk.lat, lng: pk.lng })),
        ...FOOD_SPOTS.map(f => ({ id: f.id, kind: 'food', label: '食', color: '#A64B3C', name: f.name, lat: f.lat, lng: f.lng })),
        ...SHOP_SPOTS.map(s => ({ id: s.id, kind: 'shop', label: '買', color: '#9C7A3C', name: s.name, lat: s.lat, lng: s.lng })),
        ...POIS.map(p => ({ id: p.id, kind: 'poi', label: 'D' + p.day, color: DAY_COLORS[p.day], name: p.name, lat: p.lat, lng: p.lng }))
      ].map(item => ({ ...item, dist: haversineKm(lat, lng, item.lat, item.lng) }))
       .filter(item => item.dist <= bufferRadiusKm && item.dist > 0.02)
       .sort((a, b) => a.dist - b.dist);

      if (!allItems.length) {
        box.innerHTML = \`<div style="color:var(--ink-muted)">以 <strong>\${esc(title)}</strong> 為中心 \${bufferRadiusKm} km 內無其他登錄據點，建議切換至 30 km。</div>\`;
        return;
      }
      box.innerHTML = \`<div style="font-size:10.4px;color:var(--ink-muted);margin-bottom:5px">中心：<strong>\${esc(title)}</strong>（\${bufferRadiusKm} km 內共 \${allItems.length} 處）</div>\` +
        allItems.map(it => \`
          <div class="buf-item" onclick="ensureLayerAndFocus('\${it.kind}','\${it.id}',\${it.lat},\${it.lng},15)">
            <span style="display:flex;align-items:center;gap:6px;min-width:0">
              <span class="omni-badge" style="background:\${it.color}">\${it.label}</span>
              <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">\${esc(it.name)}</span>
            </span>
            <span class="buf-dist">\${it.dist.toFixed(1)} km</span>
          </div>
        \`).join('');
    }

    document.getElementById('bufRadiusPills').addEventListener('click', e => {
      const btn = e.target.closest('.buf-btn');
      if (!btn) return;
      document.querySelectorAll('.buf-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      bufferRadiusKm = Number(btn.dataset.km);
      if (currentBufferCenter) drawBuffer();
    });
    document.getElementById('btnClearBuffer').addEventListener('click', () => { currentBufferCenter = null; drawBuffer(); });

    // =========================================================================
    // GLOBAL OMNIBOX SEARCH (64 GIS Features: POIs + Parking + Food + Shop)
    // =========================================================================
    const SEARCH_INDEX = [
      ...POIS.map(p => ({ id: p.id, kind: 'poi', badge: 'D' + p.day + '-' + p.seq, color: DAY_COLORS[p.day], name: p.name, meta: \`\${p.area} · \${p.parkBadge} · \${p.mapcode}\`, hay: \`\${p.name} \${p.jp} \${p.area} \${p.mapcode} \${p.parkDetail}\`.toLowerCase(), lat: p.lat, lng: p.lng })),
      ...PARKING_SPOTS.map(pk => ({ id: pk.id, kind: 'park', badge: '停車', color: '#33546D', name: pk.name, meta: \`\${pk.area} · \${pk.fee} · \${pk.cap}\`, hay: \`\${pk.name} \${pk.target} \${pk.area} \${pk.fee} \${pk.note} 停車 駐車場\`.toLowerCase(), lat: pk.lat, lng: pk.lng })),
      ...FOOD_SPOTS.map(f => ({ id: f.id, kind: 'food', badge: '必吃', color: '#A64B3C', name: f.name, meta: \`\${f.area} · \${f.sub}\`, hay: \`\${f.name} \${f.sub} \${f.dish} \${f.area} \${f.mapcode}\`.toLowerCase(), lat: f.lat, lng: f.lng })),
      ...SHOP_SPOTS.map(s => ({ id: s.id, kind: 'shop', badge: '購物', color: '#9C7A3C', name: s.name, meta: \`\${s.area} · \${s.sub}\`, hay: \`\${s.name} \${s.sub} \${s.items} \${s.area} \${s.mapcode}\`.toLowerCase(), lat: s.lat, lng: s.lng }))
    ];

    const omniInput = document.getElementById('omniInput');
    const omniResults = document.getElementById('omniResults');
    const omniClear = document.getElementById('omniClear');

    omniInput.addEventListener('input', () => {
      const q = omniInput.value.trim().toLowerCase();
      omniClear.style.display = q ? 'block' : 'none';
      if (!q) { omniResults.classList.remove('show'); return; }
      const hits = SEARCH_INDEX.filter(x => x.hay.includes(q)).slice(0, 14);
      omniResults.innerHTML = hits.length
        ? hits.map(h => \`<div class="omni-item" onclick="selectOmni('\${h.kind}','\${h.id}',\${h.lat},\${h.lng})"><div style="min-width:0"><div class="omni-name">\${esc(h.name)}</div><div class="omni-meta">\${esc(h.meta)}</div></div><span class="omni-badge" style="background:\${h.color}">\${h.badge}</span></div>\`).join('')
        : '<div style="padding:10px;font-size:11.4px;color:var(--ink-muted)">查無符合的空間據點</div>';
      omniResults.classList.add('show');
    });
    omniClear.addEventListener('click', () => { omniInput.value = ''; omniClear.style.display = 'none'; omniResults.classList.remove('show'); });
    window.selectOmni = function(kind, id, lat, lng) { omniResults.classList.remove('show'); ensureLayerAndFocus(kind, id, lat, lng, 16); };
    document.addEventListener('click', e => { if (!e.target.closest('.omni-wrap')) omniResults.classList.remove('show'); });

    // =========================================================================
    // RENDER ITINERARY (With Real OSRM Leg Km/Min & Parking Badges)
    // =========================================================================
    function renderItinerary(dayFilter = 'all') {
      const container = document.getElementById('itineraryList');
      const days = dayFilter === 'all' ? [1, 2, 3, 4] : [Number(dayFilter)];
      let html = '';
      days.forEach(d => {
        const route = DAY_ROUTES[d];
        const dayPois = POIS.filter(p => p.day === d);
        html += \`
          <div class="day-banner" style="border-left-color:\${route.color}">
            <div>
              <div class="day-banner-title">\${esc(route.name)}</div>
              <div class="day-banner-meta">OSRM 實際路網 \${route.distKm} km · 約 \${Math.floor(route.driveMin/60)}h \${route.driveMin%60}m · 共 \${dayPois.length} 站</div>
            </div>
            <button class="fit-btn" onclick="fitDay(\${d})">定位</button>
          </div>
        \`;
        dayPois.forEach((p, idx) => {
          if (p.legKm > 0) {
            const label = idx === 0 ? '由前晚住宿出發・實際路網' : '實際路網自駕';
            html += \`<div class="leg-conn"><span class="leg-line"></span><span>\${label} \${p.legKm} km · 約 \${p.legMin} 分</span></div>\`;
          }
          const color = DAY_COLORS[p.day];
          const vidCount = (VIDEOS_BY_TAG[p.tag] || []).length;
          const isDone = checkedSet.has(p.id);
          html += \`
            <div class="poi-card \${isDone ? 'checked' : ''}" id="card-\${p.id}" onclick="focusAny('\${p.id}', \${p.lat}, \${p.lng}, 14)">
              <div class="poi-top">
                <div class="poi-num" style="background:\${color}">\${p.seq}</div>
                <div style="flex:1;min-width:0">
                  <div class="poi-head-row">
                    <div class="poi-name">\${esc(p.name)}</div>
                    <button class="chk-btn \${isDone ? 'done' : ''}" id="chk-\${p.id}" onclick="toggleCheck(event,'\${p.id}')" title="標記已造訪">✓</button>
                  </div>
                  <div class="poi-meta">
                    <span class="area-chip">\${esc(p.area)}</span>
                    <span class="tag-chip">\${esc(p.time)}</span>
                    <span class="park-chip">\${esc(p.parkBadge)}</span>
                    <span class="yt-chip">YT \${vidCount}部</span>
                  </div>
                </div>
              </div>
              <div class="poi-desc">\${esc(p.summary)}</div>
            </div>
          \`;
        });
        if (d === 3 && DAY3_STAY_LEG) {
          html += \`<div class="leg-conn"><span class="leg-line"></span><span>往西北赴都城市區飯店夜宿・實際路網 \${DAY3_STAY_LEG.km} km · 約 \${DAY3_STAY_LEG.min} 分</span></div>\`;
        }
      });
      container.innerHTML = html;
    }

    // =========================================================================
    // RENDER PARKING, FOOD, SHOPPING, SPECIALTIES & SOUVENIRS
    // =========================================================================
    window.renderGourmet = function(sub = 'parking') {
      document.querySelectorAll('.sub-pill').forEach(b => b.classList.toggle('active', b.dataset.sub === sub));
      const el = document.getElementById('gourmetList');

      if (sub === 'parking') {
        const summary = '<div class="customs-note"><strong>全宮崎 4 天停車費預估（共約 ¥2,900–¥4,200）：</strong>青島南廣場 ¥500 ＋ 高千穗御塩井 ¥500（停第2あららぎ免費）＋ 蝦野高原 ¥500 ＋ 延岡/宮崎/都城夜間停車約 ¥1,400–¥2,700；其餘 85% 景點與道之驛皆為<strong>大型免費停車</strong>！（都井岬入山保護協力金 ¥400/車另計）</div>';
        el.innerHTML = summary + PARKING_SPOTS.map((pk, i) => \`
          <div class="poi-card" id="card-\${pk.id}" onclick="ensureLayerAndFocus('park', '\${pk.id}', \${pk.lat}, \${pk.lng}, 16)">
            <div class="poi-top">
              <div class="poi-num sq" style="background:var(--park-c)">P</div>
              <div style="flex:1;min-width:0">
                <div class="poi-name">\${String(i + 1).padStart(2, '0')}. \${esc(pk.name)}</div>
                <div class="poi-sub">對應：\${esc(pk.target)}</div>
                <div class="poi-meta">
                  <span class="area-chip">\${esc(pk.area)}</span>
                  <span class="\${pk.paid ? 'warn-chip' : 'ok-chip'}">\${esc(pk.fee)}</span>
                  <span class="tag-chip">\${esc(pk.cap)}</span>
                  <span class="tag-chip">\${esc(pk.walk)}</span>
                </div>
              </div>
            </div>
            <div class="poi-desc">\${esc(pk.note)}</div>
          </div>
        \`).join('');
      } else if (sub === 'food') {
        el.innerHTML = FOOD_SPOTS.map((f, i) => {
          const isDone = checkedSet.has(f.id);
          return \`
            <div class="poi-card \${isDone ? 'checked' : ''}" id="card-\${f.id}" onclick="ensureLayerAndFocus('food', '\${f.id}', \${f.lat}, \${f.lng}, 16)">
              <div class="poi-top">
                <div class="poi-num sq" style="background:var(--food-c)">食</div>
                <div style="flex:1;min-width:0">
                  <div class="poi-head-row">
                    <div class="poi-name">\${String(i + 1).padStart(2, '0')}. \${esc(f.name)}</div>
                    <button class="chk-btn \${isDone ? 'done' : ''}" id="chk-\${f.id}" onclick="toggleCheck(event,'\${f.id}')" title="標記已品嚐">✓</button>
                  </div>
                  <div class="poi-sub">\${esc(f.sub)}</div>
                  <div class="poi-meta">
                    <span class="area-chip">\${esc(f.area)}</span>
                    <span class="tag-chip">\${esc(f.dish)}</span>
                    <span class="park-chip">🅿 \${esc(f.park)}</span>
                  </div>
                </div>
              </div>
              <div class="poi-desc">\${esc(f.desc)}</div>
            </div>
          \`;
        }).join('');
      } else if (sub === 'shop') {
        el.innerHTML = SHOP_SPOTS.map((s, i) => \`
          <div class="poi-card" id="card-\${s.id}" onclick="ensureLayerAndFocus('shop', '\${s.id}', \${s.lat}, \${s.lng}, 15)">
            <div class="poi-top">
              <div class="poi-num sq" style="background:var(--shop-c)">買</div>
              <div style="flex:1;min-width:0">
                <div class="poi-name">\${String(i + 1).padStart(2, '0')}. \${esc(s.name)}</div>
                <div class="poi-sub">\${esc(s.sub)}</div>
                <div class="poi-meta">
                  <span class="area-chip">\${esc(s.area)}</span>
                  <span class="tag-chip">\${esc(s.hours)}</span>
                  <span class="park-chip">🅿 \${esc(s.park)}</span>
                </div>
              </div>
            </div>
            <div class="poi-desc"><strong>精選商品：</strong>\${esc(s.items)}<br>\${esc(s.desc)}</div>
          </div>
        \`).join('');
      } else if (sub === 'spec') {
        const note = '<div class="customs-note"><strong>返台檢疫與託運備忘：</strong>起司饅頭、青島煎餅、茶葉與無肉塊辛麵可攜帶回台；燒肉醬、平兵衛酢、燒酎與果凍布丁須放<strong>託運行李</strong>；<strong>炭火地雞肉品與生鮮芒果</strong>禁止攜帶入境台灣。</div>';
        el.innerHTML = note + SPECIALTIES.map((sp, i) => {
          const isWarn = sp.carry.includes('⚠');
          const isDone = checkedSet.has(sp.id);
          const shop = SHOP_SPOTS.find(x => x.id === sp.shopId);
          return \`
            <div class="poi-card \${isDone ? 'checked' : ''}" id="card-\${sp.id}" onclick="ensureLayerAndFocus('shop', '\${sp.shopId}', \${shop.lat}, \${shop.lng}, 15)">
              <div class="poi-top">
                <div class="poi-num sq" style="background:var(--ink)">\${String(i + 1).padStart(2, '0')}</div>
                <div style="flex:1;min-width:0">
                  <div class="poi-head-row">
                    <div class="poi-name">\${esc(sp.name)}</div>
                    <button class="chk-btn \${isDone ? 'done' : ''}" id="chk-\${sp.id}" onclick="toggleCheck(event,'\${sp.id}')" title="標記已採買">✓</button>
                  </div>
                  <div class="poi-meta">
                    <span class="area-chip">\${esc(sp.area)}</span>
                    <span class="\${isWarn ? 'warn-chip' : 'ok-chip'}">\${esc(sp.carry)}</span>
                  </div>
                </div>
              </div>
              <div class="poi-desc">\${esc(sp.desc)}</div>
              <div class="spec-footer"><span>推薦購入：\${esc(sp.shopName)}</span><span class="spec-go">定位採買處 →</span></div>
            </div>
          \`;
        }).join('');
      } else {
        const note = '<div class="customs-note"><strong>紀念品選購指南：</strong>收錄宮崎限定椰蛋樹寶可夢聯名、神話神社限定御守與御朱印、傳統民藝與簡約手作工藝，點擊卡片即精準定位購買處。</div>';
        el.innerHTML = note + SOUVENIRS.map((sv, i) => {
          const isDone = checkedSet.has(sv.id);
          const targetObj = sv.targetKind === 'shop' ? SHOP_SPOTS.find(x => x.id === sv.targetId) : POIS.find(x => x.id === sv.targetId);
          const clickFn = sv.targetKind === 'shop'
            ? \`ensureLayerAndFocus('shop', '\${sv.targetId}', \${targetObj.lat}, \${targetObj.lng}, 15)\`
            : \`focusAny('\${sv.targetId}', \${targetObj.lat}, \${targetObj.lng}, 15)\`;
          return \`
            <div class="poi-card \${isDone ? 'checked' : ''}" id="card-\${sv.id}" onclick="\${clickFn}">
              <div class="poi-top">
                <div class="poi-num sq" style="background:var(--muji-red)">念</div>
                <div style="flex:1;min-width:0">
                  <div class="poi-head-row">
                    <div class="poi-name">\${String(i + 1).padStart(2, '0')}. \${esc(sv.name)}</div>
                    <button class="chk-btn \${isDone ? 'done' : ''}" id="chk-\${sv.id}" onclick="toggleCheck(event,'\${sv.id}')" title="標記已收藏">✓</button>
                  </div>
                  <div class="poi-meta">
                    <span class="area-chip">\${esc(sv.area)}</span>
                    <span class="tag-chip">\${esc(sv.cat)}</span>
                    <span class="tag-chip">\${esc(sv.price)}</span>
                  </div>
                </div>
              </div>
              <div class="poi-desc">\${esc(sv.desc)}</div>
              <div class="spec-footer"><span>購買地點：\${esc(sv.targetLabel)}</span><span class="spec-go">定位地點 →</span></div>
            </div>
          \`;
        }).join('');
      }
    };

    document.getElementById('gourmetPills').addEventListener('click', e => {
      const btn = e.target.closest('.sub-pill');
      if (btn) renderGourmet(btn.dataset.sub);
    });

    function highlightCard(id) {
      document.querySelectorAll('.poi-card.selected').forEach(el => el.classList.remove('selected'));
      const el = document.getElementById('card-' + id);
      if (el) { el.classList.add('selected'); el.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }
    }

    function isMobileViewport() { return window.innerWidth <= 820; }

    function setMobileSheetState(state) {
      const hint = document.getElementById('sheetHandleHint');
      if (state === 'collapsed') {
        document.body.classList.add('sidebar-collapsed');
        document.body.classList.remove('sheet-full');
      } else if (state === 'full') {
        document.body.classList.remove('sidebar-collapsed');
        document.body.classList.add('sheet-full');
        if (hint) hint.textContent = '點擊半開 · 下滑收合地圖';
      } else {
        document.body.classList.remove('sidebar-collapsed', 'sheet-full');
        if (hint) hint.textContent = '點擊全展開 · 下滑收合';
      }
      setTimeout(() => map.invalidateSize(), 280);
    }

    function getMapPadding() {
      const w = window.innerWidth;
      const collapsed = document.body.classList.contains('sidebar-collapsed');
      if (w <= 820) {
        const bottomPad = collapsed ? 70 : Math.round(window.innerHeight * 0.54);
        return { paddingTopLeft: [16, 66], paddingBottomRight: [50, bottomPad] };
      }
      const sbOffset = w <= 1080 ? 378 : 448;
      return { paddingTopLeft: [collapsed ? 50 : sbOffset, 72], paddingBottomRight: [55, 65] };
    }

    window.zoomRegion = function(regionId) {
      if (isMobileViewport()) setMobileSheetState('collapsed');
      const r = REGIONS.find(x => x.id === regionId);
      if (r) map.fitBounds(L.latLngBounds(r.poly), getMapPadding());
    };
    window.focusAny = function(id, lat, lng, zoom) {
      highlightCard(id);
      if (isMobileViewport()) setMobileSheetState('collapsed');
      map.flyTo([lat, lng], zoom || 15, { duration: 0.95 });
      setTimeout(() => { if (markersById[id]) markersById[id].openPopup(); }, 580);
    };
    window.ensureLayerAndFocus = function(kind, id, lat, lng, zoom) {
      if (kind === 'park' && !document.getElementById('chkPark').checked) setParkLayer(true);
      if (kind === 'food' && !document.getElementById('chkFood').checked) setFoodLayer(true);
      if (kind === 'shop' && !document.getElementById('chkShop').checked) setShopLayer(true);
      focusAny(id, lat, lng, zoom);
    };
    window.fitDay = function(d) { map.fitBounds(L.latLngBounds(DAY_ROUTES[d].coords), getMapPadding()); };
    function fitAllBounds() { map.fitBounds(L.latLngBounds(POIS.map(p => [p.lat, p.lng])), getMapPadding()); }

    function selectDayFilter(d) {
      document.querySelectorAll('.day-pill').forEach(b => b.classList.toggle('active', b.dataset.day === String(d)));
      renderItinerary(String(d));
      [1, 2, 3, 4].forEach(num => {
        const show = String(d) === 'all' || Number(d) === num;
        const chk = document.querySelector(\`.day-chk[data-day="\${num}"]\`);
        if (chk) chk.checked = show;
        toggleDayLayer(num, show);
      });
      if (String(d) === 'all') fitAllBounds(); else fitDay(Number(d));
    }
    document.getElementById('dayPills').addEventListener('click', e => { const btn = e.target.closest('.day-pill'); if (btn) selectDayFilter(btn.dataset.day); });

    function toggleDayLayer(dayNum, visible) {
      const showRoutes = document.getElementById('chkRoutes').checked;
      if (visible) {
        if (!map.hasLayer(dayMarkerGroups[dayNum])) map.addLayer(dayMarkerGroups[dayNum]);
        if (showRoutes && !map.hasLayer(dayRouteGroups[dayNum])) map.addLayer(dayRouteGroups[dayNum]);
      } else {
        if (map.hasLayer(dayMarkerGroups[dayNum])) map.removeLayer(dayMarkerGroups[dayNum]);
        if (map.hasLayer(dayRouteGroups[dayNum])) map.removeLayer(dayRouteGroups[dayNum]);
      }
    }

    function renderStatsBars() {
      const maxCount = Math.max(...TOPIC_STATS.map(s => s.count), 1);
      document.getElementById('statsBars').innerHTML = TOPIC_STATS.map(s => \`
        <div class="bar-row" onclick="openVideoTabWithTag('\${s.key}')">
          <div class="bar-head"><span class="bar-label">\${esc(s.label)}</span><span class="bar-val">\${s.count} 部</span></div>
          <div class="bar-track"><div class="bar-fill" style="width:\${Math.round((s.count / maxCount) * 100)}%; background:\${s.color}"></div></div>
        </div>
      \`).join('');
      const sel = document.getElementById('ytTagFilter');
      TOPIC_STATS.forEach(s => { const opt = document.createElement('option'); opt.value = s.key; opt.textContent = \`\${s.label}（\${s.count} 部）\`; sel.appendChild(opt); });
    }

    function debounce(fn, ms) {
      let t = null;
      return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
    }

    const YT_PAGE_SIZE = 36;
    let ytVisibleCount = YT_PAGE_SIZE;
    function renderVideoList(resetPage = true) {
      if (resetPage) ytVisibleCount = YT_PAGE_SIZE;
      const q = (document.getElementById('ytSearch').value || '').trim().toLowerCase();
      const tag = document.getElementById('ytTagFilter').value;
      const filtered = YT_VIDEOS.filter(v => (tag === 'all' || (v.g || []).includes(tag)) && (!q || v.t.toLowerCase().includes(q) || v.c.toLowerCase().includes(q)));
      const slice = filtered.slice(0, ytVisibleCount);
      document.getElementById('ytCountText').textContent = \`顯示 \${slice.length} / \${filtered.length} 部（全庫 \${YT_VIDEOS.length} 部）\`;
      const itemsHtml = slice.map((v, idx) => \`
        <a class="yt-item" href="https://www.youtube.com/watch?v=\${v.id}" target="_blank" rel="noopener">
          <img class="yt-thumb" loading="lazy" src="https://i.ytimg.com/vi/\${v.id}/mqdefault.jpg" alt="" />
          <div class="yt-info">
            <div class="yt-title">\${String(idx + 1).padStart(3, '0')}. \${esc(v.t)}</div>
            <div class="yt-sub">\${esc(v.c)}\${v.v ? ' · ' + esc(v.v) : ''}\${v.l ? ' · ' + esc(v.l) : ''}</div>
            <div class="yt-sub" style="color:#9E9589">\${esc(v.p)}</div>
          </div>
        </a>
      \`).join('');
      const moreBtn = filtered.length > slice.length
        ? \`<button class="load-more-btn" onclick="loadMoreVideos()">載入更多影片（尚餘 \${filtered.length - slice.length} 部）</button>\`
        : '';
      document.getElementById('ytList').innerHTML = itemsHtml + moreBtn;
    }
    window.loadMoreVideos = function() { ytVisibleCount += YT_PAGE_SIZE; renderVideoList(false); };

    window.openVideoTabWithTag = function(tag) {
      switchTab('videos');
      switchIntelSub('yt');
      if (isMobileViewport()) setMobileSheetState('half');
      const sel = document.getElementById('ytTagFilter');
      sel.value = [...sel.options].some(o => o.value === tag) ? tag : 'all';
      document.getElementById('ytSearch').value = '';
      renderVideoList(true);
    };
    document.getElementById('ytSearch').addEventListener('input', debounce(() => renderVideoList(true), 140));
    document.getElementById('ytTagFilter').addEventListener('change', () => renderVideoList(true));

    const WEB_CAT_LABELS = { souvenir: '伴手禮・土產', shopping: '購物商圈', travel: '旅遊景點', food: '在地美食' };
    const WEB_PAGE_SIZE = 24;
    let webVisibleCount = WEB_PAGE_SIZE;
    function switchIntelSub(mode) {
      document.querySelectorAll('#intelPills .sub-pill').forEach(b => b.classList.toggle('active', b.dataset.intel === mode));
      document.getElementById('intelYtPane').style.display = mode === 'yt' ? 'block' : 'none';
      document.getElementById('intelWebPane').style.display = mode === 'web' ? 'block' : 'none';
    }
    document.getElementById('intelPills').addEventListener('click', e => {
      const btn = e.target.closest('.sub-pill');
      if (btn) switchIntelSub(btn.dataset.intel);
    });
    function renderWebGuides(resetPage = true) {
      if (resetPage) webVisibleCount = WEB_PAGE_SIZE;
      const q = (document.getElementById('webSearch').value || '').trim().toLowerCase();
      const cat = document.getElementById('webCatFilter').value;
      const sortMode = document.getElementById('webSortFilter').value;
      let filtered = WEB_GUIDES.filter(g => (cat === 'all' || g.category === cat) && (!q || (g.title + ' ' + g.summary + ' ' + g.highlights + ' ' + g.region + ' ' + g.source).toLowerCase().includes(q)));
      if (sortMode === 'newest') filtered = [...filtered].reverse();
      const slice = filtered.slice(0, webVisibleCount);
      document.getElementById('webCountText').textContent = \`顯示 \${slice.length} / \${filtered.length} 篇（全庫 \${WEB_GUIDES.length} 篇）\`;
      const itemsHtml = slice.map((g, idx) => \`
        <a class="poi-card" href="\${esc(g.url)}" target="_blank" rel="noopener" style="display:block;text-decoration:none;color:inherit">
          <div class="poi-top">
            <div class="poi-num sq" style="background:var(--muji-red)">\${String(idx + 1).padStart(2, '0')}</div>
            <div style="flex:1;min-width:0">
              <div class="poi-name">\${esc(g.title)}</div>
              <div class="poi-meta">
                <span class="area-chip">\${esc(g.region)}</span>
                <span class="tag-chip">\${esc(WEB_CAT_LABELS[g.category] || g.category)}</span>
                <span class="tag-chip">\${esc(g.addedDate || '')}</span>
              </div>
            </div>
          </div>
          <div class="poi-desc">\${esc(g.summary)}</div>
          <div class="spec-footer"><span>\${esc(g.highlights || g.source)}</span><span class="spec-go">前往網頁 →</span></div>
        </a>
      \`).join('');
      const moreBtn = filtered.length > slice.length
        ? \`<button class="load-more-btn" onclick="loadMoreWebGuides()">載入更多網頁情報（尚餘 \${filtered.length - slice.length} 篇）</button>\`
        : '';
      document.getElementById('webList').innerHTML = itemsHtml + moreBtn;
    }
    window.loadMoreWebGuides = function() { webVisibleCount += WEB_PAGE_SIZE; renderWebGuides(false); };
    document.getElementById('webSearch').addEventListener('input', debounce(() => renderWebGuides(true), 140));
    document.getElementById('webCatFilter').addEventListener('change', () => renderWebGuides(true));
    document.getElementById('webSortFilter').addEventListener('change', () => renderWebGuides(true));

    window.switchTab = function(tabName) {
      document.querySelectorAll('.sb-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tabName));
      document.querySelectorAll('.tab-pane').forEach(p => p.classList.toggle('active', p.id === 'tab-' + tabName));
    };
    document.querySelectorAll('.sb-tab').forEach(btn => btn.addEventListener('click', () => switchTab(btn.dataset.tab)));
    document.getElementById('sidebarToggle').addEventListener('click', () => {
      if (isMobileViewport()) {
        const isCollapsed = document.body.classList.contains('sidebar-collapsed');
        setMobileSheetState(isCollapsed ? 'half' : 'collapsed');
      } else {
        document.body.classList.toggle('sidebar-collapsed');
        setTimeout(() => map.invalidateSize(), 300);
      }
    });
    document.getElementById('mobileSheetFab').addEventListener('click', () => setMobileSheetState('half'));

    // Touch drag-to-resize & tap-to-cycle on Mobile Bottom Sheet handle
    (function initMobileSheetGestures() {
      const handle = document.getElementById('sheetHandle');
      if (!handle) return;
      let startY = null, moved = false;
      handle.addEventListener('touchstart', e => {
        if (!e.touches.length) return;
        startY = e.touches[0].clientY;
        moved = false;
      }, { passive: true });
      handle.addEventListener('touchmove', e => {
        if (startY === null || !e.touches.length) return;
        if (Math.abs(e.touches[0].clientY - startY) > 16) moved = true;
      }, { passive: true });
      handle.addEventListener('touchend', e => {
        if (startY === null) return;
        const endY = e.changedTouches && e.changedTouches.length ? e.changedTouches[0].clientY : startY;
        const dy = endY - startY;
        startY = null;
        if (!moved) {
          const isFull = document.body.classList.contains('sheet-full');
          setMobileSheetState(isFull ? 'half' : 'full');
          return;
        }
        const isFull = document.body.classList.contains('sheet-full');
        if (dy < -36) setMobileSheetState('full');
        else if (dy > 42) setMobileSheetState(isFull ? 'half' : 'collapsed');
      });
      handle.addEventListener('click', () => {
        if (moved) return;
        const isFull = document.body.classList.contains('sheet-full');
        setMobileSheetState(isFull ? 'half' : 'full');
      });
      window.addEventListener('resize', debounce(() => {
        if (!isMobileViewport()) document.body.classList.remove('sheet-full');
        map.invalidateSize();
      }, 180));
    })();

    document.getElementById('overlayOpacity').addEventListener('input', e => {
      const pct = Number(e.target.value);
      document.getElementById('opacityVal').textContent = pct + '%';
      const f = pct / 100;
      regionPolys.forEach(p => p.setStyle({ fillOpacity: 0.14 * f, opacity: Math.min(1, f + 0.15) }));
      heatCircles.forEach(c => c.setStyle({ fillOpacity: 0.28 * f, opacity: Math.min(1, f + 0.1) }));
    });

    function setHybrid(on) { document.getElementById('chkHybrid').checked = on; document.getElementById('btnHybrid').classList.toggle('active', on); if (on) hybridGroup.addTo(map); else map.removeLayer(hybridGroup); }
    function setRegions(on) { document.getElementById('chkRegions').checked = on; document.getElementById('btnRegions').classList.toggle('active', on); if (on) regionGroup.addTo(map); else map.removeLayer(regionGroup); }
    function setParkLayer(on) { document.getElementById('chkPark').checked = on; document.getElementById('btnParkLayer').classList.toggle('active-park', on); if (on) parkGroup.addTo(map); else map.removeLayer(parkGroup); }
    function setFoodLayer(on) { document.getElementById('chkFood').checked = on; document.getElementById('btnFoodLayer').classList.toggle('active-food', on); if (on) foodGroup.addTo(map); else map.removeLayer(foodGroup); }
    function setShopLayer(on) { document.getElementById('chkShop').checked = on; document.getElementById('btnShopLayer').classList.toggle('active-shop', on); if (on) shopGroup.addTo(map); else map.removeLayer(shopGroup); }

    document.getElementById('chkHybrid').addEventListener('change', e => setHybrid(e.target.checked));
    document.getElementById('btnHybrid').addEventListener('click', () => setHybrid(!document.getElementById('chkHybrid').checked));
    document.getElementById('chkRegions').addEventListener('change', e => setRegions(e.target.checked));
    document.getElementById('btnRegions').addEventListener('click', () => setRegions(!document.getElementById('chkRegions').checked));
    document.getElementById('chkPark').addEventListener('change', e => setParkLayer(e.target.checked));
    document.getElementById('btnParkLayer').addEventListener('click', () => setParkLayer(!document.getElementById('chkPark').checked));
    document.getElementById('chkFood').addEventListener('change', e => setFoodLayer(e.target.checked));
    document.getElementById('btnFoodLayer').addEventListener('click', () => setFoodLayer(!document.getElementById('chkFood').checked));
    document.getElementById('chkShop').addEventListener('change', e => setShopLayer(e.target.checked));
    document.getElementById('btnShopLayer').addEventListener('click', () => setShopLayer(!document.getElementById('chkShop').checked));
    document.getElementById('chkHeat').addEventListener('change', e => { if (e.target.checked) heatGroup.addTo(map); else map.removeLayer(heatGroup); });
    document.getElementById('chkRoutes').addEventListener('change', e => {
      const show = e.target.checked;
      [1, 2, 3, 4].forEach(d => {
        const dayChecked = document.querySelector(\`.day-chk[data-day="\${d}"]\`).checked;
        if (show && dayChecked) dayRouteGroups[d].addTo(map); else map.removeLayer(dayRouteGroups[d]);
      });
    });
    document.querySelectorAll('.day-chk').forEach(chk => chk.addEventListener('change', e => toggleDayLayer(Number(e.target.dataset.day), e.target.checked)));
    document.getElementById('btnFitAll').addEventListener('click', fitAllBounds);

    document.getElementById('legToggle').addEventListener('click', () => {
      const lg = document.getElementById('mapLegend');
      lg.classList.toggle('min');
      document.getElementById('legCaret').textContent = lg.classList.contains('min') ? '+' : '−';
    });

    // Spatial Measurement (Distance + Polygon Area)
    let measuring = false, measureMode = 'dist', measurePoints = [], measureShape = null;
    function calcPolygonAreaKm2(latlngs) {
      if (latlngs.length < 3) return 0;
      const R = 6371008.8; let area = 0;
      for (let i = 0; i < latlngs.length; i++) {
        const p1 = latlngs[i], p2 = latlngs[(i + 1) % latlngs.length];
        area += ((p2.lng - p1.lng) * Math.PI / 180) * (2 + Math.sin(p1.lat * Math.PI / 180) + Math.sin(p2.lat * Math.PI / 180));
      }
      return Math.abs(area * R * R / 2) / 1e6;
    }
    function clearMeasure() {
      measurePoints = []; measureGroup.clearLayers(); measureShape = null;
      document.getElementById('measureText').textContent = measureMode === 'dist' ? '請於地圖依序點擊量測直線距離' : '請點擊 3 點以上繪製多邊形量測面積';
    }
    function setMeasureActive(on) {
      measuring = on;
      if (measuring && isMobileViewport()) setMobileSheetState('collapsed');
      document.getElementById('btnMeasure').classList.toggle('active', measuring);
      document.getElementById('measureBanner').classList.toggle('show', measuring);
      map.getContainer().style.cursor = measuring ? 'crosshair' : '';
      if (!measuring) clearMeasure();
    }
    document.getElementById('btnMeasure').addEventListener('click', () => setMeasureActive(!measuring));
    document.getElementById('btnMeasureClear').addEventListener('click', clearMeasure);
    document.getElementById('modeDist').addEventListener('click', () => { measureMode = 'dist'; document.getElementById('modeDist').classList.add('active'); document.getElementById('modeArea').classList.remove('active'); clearMeasure(); });
    document.getElementById('modeArea').addEventListener('click', () => { measureMode = 'area'; document.getElementById('modeArea').classList.add('active'); document.getElementById('modeDist').classList.remove('active'); clearMeasure(); });

    map.on('click', e => {
      if (!measuring) return;
      measurePoints.push(e.latlng);
      L.circleMarker(e.latlng, { radius: 5, color: '#FFFFFF', fillColor: '#2563EB', fillOpacity: 1, weight: 2 }).addTo(measureGroup);
      if (measureShape) measureGroup.removeLayer(measureShape);
      if (measureMode === 'dist' && measurePoints.length > 1) {
        measureShape = L.polyline(measurePoints, { color: '#2563EB', weight: 3, dashArray: '6, 5' }).addTo(measureGroup);
        let totalM = 0; for (let i = 1; i < measurePoints.length; i++) totalM += measurePoints[i - 1].distanceTo(measurePoints[i]);
        document.getElementById('measureText').textContent = \`已選 \${measurePoints.length} 點 · 累計距離：\${totalM >= 1000 ? (totalM / 1000).toFixed(2) + ' km' : Math.round(totalM) + ' m'}\`;
      } else if (measureMode === 'area' && measurePoints.length >= 3) {
        measureShape = L.polygon(measurePoints, { color: '#2563EB', weight: 2.5, fillColor: '#2563EB', fillOpacity: 0.18 }).addTo(measureGroup);
        const km2 = calcPolygonAreaKm2(measurePoints);
        document.getElementById('measureText').textContent = \`已選 \${measurePoints.length} 頂點 · 多邊形面積：\${km2 >= 1 ? km2.toFixed(2) + ' km²' : (km2 * 100).toFixed(1) + ' 公頃'}\`;
      }
    });

    // Fly-Through Tour
    let tourTimer = null, tourIndex = 0;
    function stopTour() { if (tourTimer) clearTimeout(tourTimer); tourTimer = null; document.getElementById('btnTour').classList.remove('active'); document.getElementById('btnTour').textContent = '航線導覽'; }
    function stepTour() {
      if (tourIndex >= POIS.length) { stopTour(); fitAllBounds(); return; }
      const p = POIS[tourIndex]; focusAny(p.id, p.lat, p.lng, 14); tourIndex++;
      tourTimer = setTimeout(stepTour, 4200);
    }
    document.getElementById('btnTour').addEventListener('click', () => {
      if (tourTimer) stopTour();
      else { tourIndex = 0; document.getElementById('btnTour').classList.add('active'); document.getElementById('btnTour').textContent = '停止導覽'; stepTour(); }
    });

    // Print Handbook (Now includes Parking Strategy & Real Road Distances!)
    function buildAndPrintHandbook() {
      const sheet = document.getElementById('printSheet');
      let dayHtml = '';
      [1, 2, 3, 4].forEach(d => {
        const r = DAY_ROUTES[d];
        const rows = POIS.filter(p => p.day === d).map(p => \`
          <tr>
            <td>\${p.seq}</td><td>\${esc(p.time)}</td><td><strong>\${esc(p.name)}</strong><br><span style="color:#857E73">\${esc(p.area)} · 海拔 \${p.elev}m</span></td>
            <td style="white-space:nowrap">\${esc(p.mapcode)}</td><td><strong>\${esc(p.parkBadge)}</strong><br>\${esc(p.parkDetail)}</td>
          </tr>\`).join('');
        dayHtml += \`<div class="pr-h2">\${esc(r.name)}（OSRM 實際路網 \${r.distKm} km・約 \${Math.floor(r.driveMin/60)}h \${r.driveMin%60}m）</div>
          <table class="pr-table"><thead><tr><th>站</th><th>時段</th><th>據點</th><th>Mapcode</th><th>停車規劃</th></tr></thead><tbody>\${rows}</tbody></table>\`;
      });
      const foodHtml = FOOD_SPOTS.map(f => \`<div class="pr-card"><strong>\${esc(f.name)}</strong>（\${esc(f.area)}）<br>必點：\${esc(f.dish)}<br>停車：\${esc(f.park)}｜Mapcode：\${esc(f.mapcode)}</div>\`).join('');
      const buyHtml = [...SPECIALTIES.map(s => \`<div class="pr-card">☐ <strong>\${esc(s.name)}</strong>（\${esc(s.carry)}）— \${esc(s.shopName)}</div>\`),
                       ...SOUVENIRS.map(s => \`<div class="pr-card">☐ <strong>\${esc(s.name)}</strong>（\${esc(s.price)}）— \${esc(s.targetLabel)}</div>\`)].join('');
      sheet.innerHTML = \`
        <div class="pr-header">
          <div class="pr-title">全宮崎縣 四天三夜實際路網旅途手冊（含停車攻略）</div>
          <div class="pr-sub">實測彙整 ${compactVideos.length} 部 YouTube 影片｜OSRM 實際公路總長 ${totalRoadKm} km｜4日停車預算約 ¥2,900–¥4,200</div>
        </div>
        \${dayHtml}
        <div class="pr-h2">全宮崎必吃美食清單（${FOOD_SPOTS.length} 間名店）</div><div class="pr-grid">\${foodHtml}</div>
        <div class="pr-h2">必買特產伴手禮與紀念品採買清單（${SPECIALTIES.length + SOUVENIRS.length} 項）</div><div class="pr-grid">\${buyHtml}</div>
      \`;
      window.print();
    }

    document.getElementById('btnPrint').addEventListener('click', buildAndPrintHandbook);
    document.getElementById('btnPrint2').addEventListener('click', buildAndPrintHandbook);
    document.getElementById('btnResetChecks').addEventListener('click', () => {
      checkedSet.clear(); saveChecks();
      renderItinerary(document.querySelector('.day-pill.active').dataset.day);
      renderGourmet(document.querySelector('.sub-pill.active').dataset.sub);
      showToast('已重設所有旅途勾選清單');
    });

    function downloadText(filename, content, mime) {
      const blob = new Blob([content], { type: mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = filename;
      document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    }

    document.getElementById('btnExportGeoJSON').addEventListener('click', () => {
      const features = [
        ...POIS.map(p => ({ type: 'Feature', properties: { layer: 'itinerary', id: p.id, day: p.day, seq: p.seq, area: p.area, elevation_m: p.elev, parking: p.parkBadge, name: p.name, mapcode: p.mapcode }, geometry: { type: 'Point', coordinates: [p.lng, p.lat] } })),
        ...PARKING_SPOTS.map(pk => ({ type: 'Feature', properties: { layer: 'parking', id: pk.id, area: pk.area, name: pk.name, fee: pk.fee, capacity: pk.cap, walk: pk.walk }, geometry: { type: 'Point', coordinates: [pk.lng, pk.lat] } })),
        ...FOOD_SPOTS.map(f => ({ type: 'Feature', properties: { layer: 'food', id: f.id, area: f.area, name: f.name, dish: f.dish, mapcode: f.mapcode }, geometry: { type: 'Point', coordinates: [f.lng, f.lat] } })),
        ...SHOP_SPOTS.map(s => ({ type: 'Feature', properties: { layer: 'shopping', id: s.id, area: s.area, name: s.name, items: s.items, mapcode: s.mapcode }, geometry: { type: 'Point', coordinates: [s.lng, s.lat] } })),
        ...userPins.map(u => ({ type: 'Feature', properties: { layer: 'user_pin', id: u.id, name: u.name }, geometry: { type: 'Point', coordinates: [u.lng, u.lat] } })),
        ...Object.keys(DAY_ROUTES).map(d => ({ type: 'Feature', properties: { layer: 'real_road_route', day: Number(d), name: DAY_ROUTES[d].name, distance_km: DAY_ROUTES[d].distKm, drive_min: DAY_ROUTES[d].driveMin }, geometry: { type: 'LineString', coordinates: DAY_ROUTES[d].coords.map(c => [c[1], c[0]]) } }))
      ];
      downloadText('miyazaki_realroad_parking_webgis.geojson', JSON.stringify({ type: 'FeatureCollection', features }, null, 2), 'application/geo+json');
      showToast('已匯出實際路網、停車場與自訂標記 GeoJSON');
    });

    document.getElementById('btnExportGPX').addEventListener('click', () => {
      const wpts = [
        ...POIS.map(p => \`  <wpt lat="\${p.lat}" lon="\${p.lng}"><ele>\${p.elev}</ele><name>\${esc('D' + p.day + '-' + p.seq + ' ' + p.name)}</name><desc>\${esc(p.parkBadge + ' | Mapcode: ' + p.mapcode)}</desc></wpt>\`),
        ...PARKING_SPOTS.map(pk => \`  <wpt lat="\${pk.lat}" lon="\${pk.lng}"><name>\${esc('[P] ' + pk.name)}</name><desc>\${esc(pk.fee + ' | ' + pk.cap + ' | ' + pk.walk)}</desc></wpt>\`),
        ...FOOD_SPOTS.map(f => \`  <wpt lat="\${f.lat}" lon="\${f.lng}"><name>\${esc('[食] ' + f.name)}</name><desc>\${esc(f.area + ' | ' + f.dish)}</desc></wpt>\`),
        ...SHOP_SPOTS.map(s => \`  <wpt lat="\${s.lat}" lon="\${s.lng}"><name>\${esc('[買] ' + s.name)}</name><desc>\${esc(s.area + ' | ' + s.items)}</desc></wpt>\`),
        ...userPins.map(u => \`  <wpt lat="\${u.lat}" lon="\${u.lng}"><name>\${esc('[自訂] ' + u.name)}</name></wpt>\`)
      ].join('\\n');
      const trks = Object.keys(DAY_ROUTES).map(d => \`  <trk><name>\${esc(DAY_ROUTES[d].name)}</name><trkseg>\\n\${DAY_ROUTES[d].coords.map(c => \`      <trkpt lat="\${c[0]}" lon="\${c[1]}"></trkpt>\`).join('\\n')}\\n    </trkseg></trk>\`).join('\\n');
      downloadText('miyazaki_realroad_itinerary.gpx', \`<?xml version="1.0" encoding="UTF-8"?>\\n<gpx version="1.1" creator="Miyazaki Real-Road MUJI WebGIS">\\n\${wpts}\\n\${trks}\\n</gpx>\`, 'application/gpx+xml');
      showToast('已匯出實際路網 GPX（含高程、停車場與自訂標記）');
    });

    // =========================================================================
    // SENIOR WEBGIS MODULE 1: SPLIT-SCREEN BASEMAP SWIPE COMPARE
    // =========================================================================
    let swipeActive = false, swipeRatio = 0.56, swipeRightLayer = null, swipeDragging = false;
    const swipeDivider = document.getElementById('swipeDivider');
    const swipeBanner = document.getElementById('swipeBanner');
    const swipeRightSelect = document.getElementById('swipeRightSelect');

    function updateSwipeClip() {
      if (!swipeActive || !swipeRightLayer) return;
      const container = swipeRightLayer.getContainer();
      if (!container) return;
      const sz = map.getSize();
      const splitX = Math.round(sz.x * swipeRatio);
      swipeDivider.style.left = splitX + 'px';
      const nw = map.containerPointToLayerPoint([splitX, 0]);
      const se = map.containerPointToLayerPoint([sz.x, sz.y]);
      container.style.clip = \`rect(\${nw.y}px, \${se.x}px, \${se.y}px, \${nw.x}px)\`;
    }

    function mountSwipeLayer(key) {
      if (swipeRightLayer) { map.removeLayer(swipeRightLayer); swipeRightLayer = null; }
      const meta = BASEMAP_META[key] || BASEMAP_META.gsi_pale;
      swipeRightLayer = L.tileLayer(meta.url, { ...TILE_PERF_OPTS, ...meta.opts, pane: 'swipePane' }).addTo(map);
      updateSwipeClip();
    }

    function setSwipeActive(on) {
      swipeActive = on;
      document.getElementById('btnSwipe').classList.toggle('active', on);
      swipeDivider.classList.toggle('show', on);
      swipeBanner.classList.toggle('show', on);
      document.getElementById('swipeLeftLabel').textContent = basemaps[activeBasemap].name;
      if (on) {
        if (measuring) setMeasureActive(false);
        if (isMobileViewport()) setMobileSheetState('collapsed');
        mountSwipeLayer(swipeRightSelect.value);
        showToast('已開啟捲簾對比：左右拖曳紅白把手比較雙底圖');
      } else if (swipeRightLayer) {
        map.removeLayer(swipeRightLayer);
        swipeRightLayer = null;
      }
    }
    document.getElementById('btnSwipe').addEventListener('click', () => setSwipeActive(!swipeActive));
    document.getElementById('btnSwipeClose').addEventListener('click', () => setSwipeActive(false));
    swipeRightSelect.addEventListener('change', () => { if (swipeActive) mountSwipeLayer(swipeRightSelect.value); });

    swipeDivider.addEventListener('pointerdown', e => {
      swipeDragging = true;
      swipeDivider.setPointerCapture(e.pointerId);
      e.preventDefault();
    });
    window.addEventListener('pointermove', e => {
      if (!swipeDragging || !swipeActive) return;
      const rect = map.getContainer().getBoundingClientRect();
      swipeRatio = Math.max(0.08, Math.min(0.92, (e.clientX - rect.left) / rect.width));
      updateSwipeClip();
    });
    window.addEventListener('pointerup', () => { swipeDragging = false; });
    map.on('move zoom resize', updateSwipeClip);

    // =========================================================================
    // SENIOR WEBGIS MODULE 2: GPS GEOLOCATION + NEAREST POI / PARKING
    // =========================================================================
    function locateUser() {
      if (!navigator.geolocation) { showToast('此瀏覽器不支援 GPS 定位'); return; }
      const btn = document.getElementById('btnLocate');
      btn.classList.add('active');
      showToast('正在取得 GPS 定位...');
      navigator.geolocation.getCurrentPosition(pos => {
        const { latitude: lat, longitude: lng, accuracy } = pos.coords;
        gpsGroup.clearLayers();
        L.circle([lat, lng], { radius: Math.min(accuracy || 80, 1500), color: '#2563EB', weight: 1.2, fillColor: '#2563EB', fillOpacity: 0.14 }).addTo(gpsGroup);
        const nearestPoi = POIS.map(p => ({ p, d: haversineKm(lat, lng, p.lat, p.lng) })).sort((a, b) => a.d - b.d)[0];
        const nearestPark = PARKING_SPOTS.map(pk => ({ pk, d: haversineKm(lat, lng, pk.lat, pk.lng) })).sort((a, b) => a.d - b.d)[0];
        L.marker([lat, lng], {
          zIndexOffset: 950,
          icon: L.divIcon({ className: 'gps-dot-wrap', html: '<div class="gps-dot"></div>', iconSize: [14, 14], iconAnchor: [7, 7] })
        }).bindPopup(\`
          <div>
            <div class="pop-head"><span class="pop-day" style="background:#2563EB">GPS 我的位置</span><span class="tag-chip">精度 ±\${Math.round(accuracy || 0)} m</span></div>
            <div class="pop-grid">
              <div><span>WGS84 坐標</span><strong>\${lat.toFixed(4)}, \${lng.toFixed(4)}</strong></div>
              <div><span>最近行程站</span><strong>\${esc(nearestPoi.p.name)}（\${nearestPoi.d.toFixed(1)} km）</strong></div>
            </div>
            <div class="pop-park">最近登錄停車場：<strong>\${esc(nearestPark.pk.name)}</strong>（\${nearestPark.d.toFixed(1)} km）</div>
            <div class="pop-actions">
              <button class="pop-nav-btn" onclick="runBufferAnalysis(\${lat},\${lng},'我的位置')">搜尋周邊</button>
              <button class="pop-nav-btn sec" onclick="fitAllBounds()">回到宮崎</button>
              <button class="pop-nav-btn sec" onclick="gpsGroup.clearLayers();document.getElementById('btnLocate').classList.remove('active')">清除定位</button>
            </div>
          </div>
        \`, { maxWidth: 330 }).addTo(gpsGroup).openPopup();
        map.flyTo([lat, lng], Math.max(map.getZoom(), 13), { duration: 0.9 });
        showToast(\`已定位！距最近宮崎景點 \${nearestPoi.d.toFixed(1)} km\`);
      }, () => {
        btn.classList.remove('active');
        showToast('無法取得定位（請確認瀏覽器定位權限）');
      }, { enableHighAccuracy: true, timeout: 9000 });
    }
    document.getElementById('btnLocate').addEventListener('click', locateUser);

    // =========================================================================
    // SENIOR WEBGIS MODULE 3: RIGHT-CLICK CONTEXT MENU & PERSISTENT USER PINS
    // =========================================================================
    const USER_PIN_KEY = 'miyazaki_webgis_userpins_v1';
    let userPins = [];
    try {
      const savedPins = JSON.parse(localStorage.getItem(USER_PIN_KEY) || '[]');
      if (Array.isArray(savedPins)) userPins = savedPins;
    } catch (e) {}

    function saveUserPins() {
      try { localStorage.setItem(USER_PIN_KEY, JSON.stringify(userPins)); } catch (e) {}
      document.getElementById('userPinCount').textContent = userPins.length;
    }
    function renderUserPins() {
      userPinGroup.clearLayers();
      userPins.forEach(u => {
        const icon = L.divIcon({ className: 'user-pin-wrap', html: '<div class="user-pin"><span>★</span></div>', iconSize: [26, 26], iconAnchor: [13, 26], popupAnchor: [0, -24] });
        const gmapsUrl = \`https://www.google.com/maps/search/?api=1&query=\${u.lat},\${u.lng}\`;
        L.marker([u.lat, u.lng], { icon, zIndexOffset: 300 }).bindPopup(\`
          <div>
            <div class="pop-head"><span class="pop-day" style="background:var(--muji-red)">★ 我的自訂標記</span></div>
            <div class="pop-title">\${esc(u.name)}</div>
            <div class="pop-grid">
              <div><span>WGS84 坐標（點擊複製）</span><strong class="copyable" onclick="copyText('\${u.lat.toFixed(5)},\${u.lng.toFixed(5)}','自訂坐標')">\${u.lat.toFixed(5)}, \${u.lng.toFixed(5)}</strong></div>
              <div><span>儲存方式</span><strong>本機離線保存</strong></div>
            </div>
            <div class="pop-actions">
              <a class="pop-nav-btn" href="\${gmapsUrl}" target="_blank" rel="noopener">Google 導航</a>
              <button class="pop-nav-btn sec" onclick="runBufferAnalysis(\${u.lat},\${u.lng},'\${esc(u.name)}')">周邊搜尋</button>
              <button class="pop-nav-btn sec" onclick="deleteUserPin('\${u.id}')">刪除標記</button>
            </div>
          </div>
        \`, { maxWidth: 320 }).addTo(userPinGroup);
      });
      document.getElementById('userPinCount').textContent = userPins.length;
    }
    window.deleteUserPin = function(id) {
      userPins = userPins.filter(u => u.id !== id);
      saveUserPins(); renderUserPins(); map.closePopup();
      showToast('已刪除自訂標記');
    };
    document.getElementById('chkUserPins').addEventListener('change', e => {
      if (e.target.checked) userPinGroup.addTo(map); else map.removeLayer(userPinGroup);
    });

    const ctxMenu = document.getElementById('ctxMenu');
    let ctxLatLng = null;
    function hideCtxMenu() { ctxMenu.classList.remove('show'); }
    map.on('contextmenu', e => {
      ctxLatLng = e.latlng;
      document.getElementById('ctxCoordText').textContent = \`\${e.latlng.lat.toFixed(5)}, \${e.latlng.lng.toFixed(5)}\`;
      const x = Math.max(10, Math.min(e.originalEvent.clientX, window.innerWidth - 225));
      const y = Math.max(10, Math.min(e.originalEvent.clientY, window.innerHeight - 230));
      ctxMenu.style.left = x + 'px';
      ctxMenu.style.top = y + 'px';
      ctxMenu.classList.add('show');
    });
    map.on('click movestart zoomstart', hideCtxMenu);
    document.addEventListener('click', e => { if (!e.target.closest('.ctx-menu')) hideCtxMenu(); });

    document.getElementById('ctxCopyCoord').addEventListener('click', () => {
      if (ctxLatLng) copyText(\`\${ctxLatLng.lat.toFixed(5)}, \${ctxLatLng.lng.toFixed(5)}\`, 'WGS84 坐標');
      hideCtxMenu();
    });
    document.getElementById('ctxBuffer').addEventListener('click', () => {
      if (ctxLatLng) runBufferAnalysis(ctxLatLng.lat, ctxLatLng.lng, \`指定坐標 (\${ctxLatLng.lat.toFixed(3)}, \${ctxLatLng.lng.toFixed(3)})\`);
      hideCtxMenu();
    });
    document.getElementById('ctxMeasure').addEventListener('click', () => {
      if (ctxLatLng) {
        if (!measuring) setMeasureActive(true);
        map.fire('click', { latlng: ctxLatLng });
      }
      hideCtxMenu();
    });
    document.getElementById('ctxAddPin').addEventListener('click', () => {
      hideCtxMenu();
      if (!ctxLatLng) return;
      const name = prompt('請輸入自訂標記名稱（例：飯店、口袋咖啡廳、秘境停車點）：', '我的宮崎口袋名單');
      if (!name || !name.trim()) return;
      userPins.push({ id: 'up-' + Date.now(), name: name.trim(), lat: ctxLatLng.lat, lng: ctxLatLng.lng });
      saveUserPins(); renderUserPins();
      showToast(\`已釘選「\${name.trim()}」（支援匯出 GPX/GeoJSON）\`);
    });
    document.getElementById('ctxStreetView').addEventListener('click', () => {
      if (ctxLatLng) window.open(\`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=\${ctxLatLng.lat},\${ctxLatLng.lng}\`, '_blank', 'noopener');
      hideCtxMenu();
    });

    // =========================================================================
    // SENIOR WEBGIS MODULE 5: URL HASH DEEP-LINKING & SHARE VIEW
    // =========================================================================
    let hashSyncTimer = null;
    function scheduleHashSync() {
      if (hashSyncTimer) clearTimeout(hashSyncTimer);
      hashSyncTimer = setTimeout(() => {
        const c = map.getCenter();
        const activeDay = (document.querySelector('.day-pill.active') || {}).dataset?.day || 'all';
        const hash = \`#z=\${map.getZoom()}&lat=\${c.lat.toFixed(4)}&lng=\${c.lng.toFixed(4)}&bm=\${activeBasemap}&day=\${activeDay}\`;
        try { history.replaceState(null, '', hash); } catch (e) {}
      }, 240);
    }
    map.on('moveend zoomend', scheduleHashSync);

    function applyUrlHashIfPresent() {
      if (!location.hash || location.hash.length < 4) return false;
      const params = new URLSearchParams(location.hash.slice(1));
      const lat = parseFloat(params.get('lat')), lng = parseFloat(params.get('lng')), z = parseInt(params.get('z'), 10);
      const bm = params.get('bm'), day = params.get('day');
      if (bm && basemaps[bm]) switchBasemap(bm);
      if (day && ['all', '1', '2', '3', '4'].includes(day) && day !== 'all') {
        document.querySelectorAll('.day-pill').forEach(b => b.classList.toggle('active', b.dataset.day === day));
        renderItinerary(day);
        [1, 2, 3, 4].forEach(num => {
          const show = Number(day) === num;
          const chk = document.querySelector(\`.day-chk[data-day="\${num}"]\`);
          if (chk) chk.checked = show;
          toggleDayLayer(num, show);
        });
      }
      if (!Number.isNaN(lat) && !Number.isNaN(lng) && !Number.isNaN(z)) {
        map.setView([lat, lng], Math.max(6, Math.min(18, z)), { animate: false });
        return true;
      }
      return false;
    }

    document.getElementById('btnShareView').addEventListener('click', () => {
      scheduleHashSync();
      setTimeout(() => {
        const c = map.getCenter();
        const activeDay = (document.querySelector('.day-pill.active') || {}).dataset?.day || 'all';
        const shareUrl = \`\${location.origin}\${location.pathname}#z=\${map.getZoom()}&lat=\${c.lat.toFixed(4)}&lng=\${c.lng.toFixed(4)}&bm=\${activeBasemap}&day=\${activeDay}\`;
        copyText(shareUrl, '目前視角分享網址');
      }, 30);
    });

    // =========================================================================
    // SENIOR WEBGIS MODULE 6: SHORTCUT HELP MODAL & KEYBOARD CONTROLS
    // =========================================================================
    window.toggleHelpModal = function(force) {
      const m = document.getElementById('helpModal');
      const show = typeof force === 'boolean' ? force : !m.classList.contains('show');
      m.classList.toggle('show', show);
    };
    document.getElementById('btnHelp').addEventListener('click', () => toggleHelpModal());
    document.getElementById('btnHelpClose').addEventListener('click', () => toggleHelpModal(false));
    document.getElementById('helpModal').addEventListener('click', e => { if (e.target.id === 'helpModal') toggleHelpModal(false); });

    document.addEventListener('keydown', e => {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
      if (e.key === '0') selectDayFilter('all');
      else if (['1', '2', '3', '4'].includes(e.key)) { switchTab('itinerary'); selectDayFilter(e.key); }
      else if (e.key.toLowerCase() === 's') setSwipeActive(!swipeActive);
      else if (e.key.toLowerCase() === 'm') setMeasureActive(!measuring);
      else if (e.key.toLowerCase() === 'p') setParkLayer(!document.getElementById('chkPark').checked);
      else if (e.key.toLowerCase() === 'l') locateUser();
      else if (e.key.toLowerCase() === 'b') { document.body.classList.toggle('sidebar-collapsed'); setTimeout(() => map.invalidateSize(), 300); }
      else if (e.key === '?') toggleHelpModal();
      else if (e.key === 'Escape') {
        if (measuring) setMeasureActive(false);
        if (swipeActive) setSwipeActive(false);
        if (tourTimer) stopTour();
        hideCtxMenu();
        toggleHelpModal(false);
        map.closePopup();
      }
    });

    // 60fps Drag Fast-Path & rAF-Throttled Coordinate Readout
    let isMapDragging = false, coordRaf = 0, lastLatLng = null;
    const coordEl = document.getElementById('coordReadout');
    const zoomEl = document.getElementById('zoomReadout');
    map.on('dragstart', () => { isMapDragging = true; document.body.classList.add('map-dragging'); });
    map.on('dragend', () => { isMapDragging = false; document.body.classList.remove('map-dragging'); });
    map.on('mousemove', e => {
      if (isMapDragging) return;
      lastLatLng = e.latlng;
      if (coordRaf) return;
      coordRaf = requestAnimationFrame(() => {
        coordRaf = 0;
        if (lastLatLng) coordEl.textContent = \`\${lastLatLng.lat.toFixed(4)}°N, \${lastLatLng.lng.toFixed(4)}°E\`;
      });
    });
    map.on('zoomend', () => { zoomEl.textContent = map.getZoom(); });

    renderItinerary('all');
    renderGourmet('parking');
    renderStatsBars();
    renderVideoList(true);
    renderWebGuides(true);
    renderUserPins();
    updateProgress();
    if (!applyUrlHashIfPresent()) fitAllBounds();
  </script>
</body>
</html>
`;

fs.writeFileSync(outHtmlPath, html, 'utf8');
const sizeKB = (fs.statSync(outHtmlPath).size / 1024).toFixed(1);
console.log(`SUCCESS! Generated Real-Road + 9-Basemap + Parking MUJI WebGIS HTML: ${outHtmlPath}`);
console.log(`Size: ${sizeKB} KB | Road Vertices: ${totalRoadPts} (${totalRoadKm} km) | Parking: ${PARKING_SPOTS.length} | YT: ${compactVideos.length} | WebGuides: ${webGuides.length} | Updated: ${lastUpdated}`);
