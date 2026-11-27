const fs = require('fs');
const path = require('path');
const https = require('https');
const { execFileSync } = require('child_process');
const { pathToFileURL } = require('url');

const rootDir = path.resolve(__dirname, '..');
const dataDir = path.join(rootDir, 'data');
const videos = JSON.parse(fs.readFileSync(path.join(dataDir, 'yt_videos_clean.json'), 'utf8'));
const webGuides = JSON.parse(fs.readFileSync(path.join(dataDir, 'web_guides.json'), 'utf8'));
const todayTaipei = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei' }).format(new Date());

const outPdfPath = path.join(rootDir, 'miyazaki_youtube_blog_guide.pdf');
const tempHtmlPath = path.join(rootDir, '.tmp_pdf_export.html');

function esc(str) {
  return String(str || '').replace(/[&<>"']/g, s => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[s]));
}

function parseViews(viewStr) {
  const s = String(viewStr || '').replace(/,/g, '');
  const wan = s.match(/([\d.]+)\s*萬|([\d.]+)\s*万/);
  if (wan) return Math.round(parseFloat(wan[1] || wan[2]) * 10000);
  const k = s.match(/([\d.]+)\s*[Kk]/);
  if (k) return Math.round(parseFloat(k[1]) * 1000);
  const m = s.match(/([\d.]+)\s*[Mm]/);
  if (m) return Math.round(parseFloat(m[1]) * 1000000);
  const num = s.match(/\d+/);
  return num ? parseInt(num[0], 10) : 0;
}

function fetchImageBase64(url) {
  return new Promise((resolve) => {
    const req = https.get(url, {
      agent: false,
      family: 4,
      timeout: 8000,
      headers: { 'User-Agent': 'Mozilla/5.0', 'Connection': 'close' }
    }, (res) => {
      if (res.statusCode !== 200) {
        res.resume();
        return resolve(null);
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const buf = Buffer.concat(chunks);
        if (buf.length < 1500) return resolve(null);
        resolve(`data:image/jpeg;base64,${buf.toString('base64')}`);
      });
    });
    req.on('error', () => resolve(null));
    req.on('timeout', () => { req.destroy(); resolve(null); });
  });
}

async function batchFetchThumbs(videoIds, quality = 'mqdefault') {
  const unique = Array.from(new Set(videoIds.filter(Boolean)));
  const map = new Map();
  const CONCURRENCY = 8;
  let idx = 0;
  async function worker() {
    while (idx < unique.length) {
      const id = unique[idx++];
      let dataUri = await fetchImageBase64(`https://i.ytimg.com/vi/${id}/${quality}.jpg`);
      if (!dataUri && quality !== 'mqdefault') {
        dataUri = await fetchImageBase64(`https://i.ytimg.com/vi/${id}/mqdefault.jpg`);
      }
      if (dataUri) map.set(id, dataUri);
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, unique.length) }, () => worker()));
  return map;
}

// 16 Visual Spotlight Gallery Cards (Attractions, Souvenirs, Shopping & Gourmet)
const SPOTLIGHT_DEFS = [
  { label: '高千穗峽・真名井瀑布划船', region: '高千穗町', cat: '必訪絕景', note: '阿蘇火山柱狀節理峽谷與 17m 真名井瀑布，手搖船建議提前官網預約。', re: /(高千[穗穂]峽|高千穂峡|真名井)/i },
  { label: '天岩戶神社・天安河原', region: '高千穗町', cat: '神話秘境', note: '天照大神神話舞台，溪谷深處巨大洞窟內堆滿祈願石塔，靈氣十足。', re: /(天岩[戶戸]|天安河原)/i },
  { label: '青島神社・鬼之洗衣板', region: '宮崎市', cat: '南國海景', note: '亞熱帶蒲葵林環繞朱紅社殿與海蝕波狀岩，必收波浪御朱印與產靈紙縒。', re: /(青島|鬼[之の]洗衣|洗濯板)/i },
  { label: '日南太陽花園・摩艾石像', region: '日南市', cat: '海岸地標', note: '世界唯一獲復活節島官方授權復刻的 7 座摩艾石像，面朝蔚藍太平洋。', re: /(摩艾|莫埃|モアイ|サンメッセ)/i },
  { label: '鵜戶神宮・海崖洞窟與運玉', region: '日南市', cat: '開運神社', note: '建於海蝕洞窟內的朱紅本殿，投擲幸運運玉並收藏可愛兔子土鈴紀念品。', re: /(鵜[戶戸])/i },
  { label: '飫肥城下町・九州小京都', region: '日南市', cat: '歷史散策', note: '武家屋敷石牆老街搭配吃喝地圖，品嚐元祖飫肥天、厚燒玉子與飫肥杉工藝。', re: /(飫肥)/i },
  { label: '都井岬・野生御崎馬草原', region: '串間市', cat: '自然秘境', note: '宮崎最南端海崖草原，可近距離觀察日本天然紀念物野生御崎馬漫步。', re: /(都井岬)/i },
  { label: '日向市・馬背斷崖與祈願之海', region: '日向市', cat: '壯麗斷崖', note: '70m 高日本最大柱狀節理海崖與「叶」字造型奇岩，縣北沿海王牌絕景。', re: /(馬[ヶケ]?背|クルス|日向市|大御神社)/i },
  { label: '宮崎必買伴手禮・起司饅頭＆名產', region: '全宮崎縣', cat: '必買伴手禮', note: '酥香餅皮包裹濃郁奶油起司的宮崎靈魂甜點，加上牛蒡脆片、青島煎餅與燒酎。', re: /(チーズ饅頭|起司饅頭|お土産|伴手禮|必買|土産)/i },
  { label: '宮崎九重葛機場・登機前掃貨', region: '宮崎市', cat: '機場購物', note: 'ANA FESTA、日向屋與銘品藏一站補齊起司饅頭、Maximum 香料與戶村燒肉醬。', re: /(宮崎空港|宮崎機場)/i },
  { label: 'AMU PLAZA 宮崎・JR 車站商圈', region: '宮崎市', cat: '市區逛街', note: 'JR 宮崎站直結海館與山館，匯聚 MUJI、HANDS、在地超市與 Himuka 美食伴手禮。', re: /(AMU|アミュ|宮崎駅|宮崎車站)/i },
  { label: 'AEON MALL 宮崎・一站免稅商場', region: '宮崎市', cat: '大型購物', note: '全縣最大免稅購物中心與 AEON STYLE 大型超市，免費停車場方便自駕大採購。', re: /(AEON|イオン|ショッピング|購物|逛街)/i },
  { label: '頂級宮崎牛・燒肉＆鐵板燒饗宴', region: '宮崎・都城', cat: '必吃美食', note: '和牛奧運連霸王者！推薦橘通ミヤチク APAS 鐵板燒或都城在地和牛燒肉。', re: /(宮崎牛|ミヤチク|焼肉|燒肉|和牛)/i },
  { label: '元祖南蠻炸雞・塔塔醬始祖', region: '延岡・宮崎', cat: '必吃美食', note: '發源於宮崎縣！酸甜南蠻醋配濃郁手作塔塔醬，延岡直ちゃん與宮崎おぐら必訪。', re: /(南蠻|南蛮|おぐら|直ちゃん)/i },
  { label: '炭火烤地頭雞・黑亮炭香名店', region: '宮崎市', cat: '必吃美食', note: '猛火炭烤呈現煙燻黑亮色澤與彈性咬勁，搭配柚子胡椒與在地芋燒酎絕配。', re: /(地頭[雞鶏]|地雞|地鶏|丸[萬万]|炭火)/i },
  { label: '宮崎辛麵・完熟芒果＆日向夏甜點', region: '全宮崎縣', cat: '甜點小吃', note: '延岡發祥元祖辛麵、太陽之子頂級芒果聖代與清爽微酸的日向夏限定點心。', re: /(辛[麵麺]|マンゴー|芒果|日向夏|フルーツ大野)/i }
];

const YT_GROUPS = [
  { key: 'shopping', title: '01｜宮崎購物・伴手禮・商場・機場土產', color: '#9C7A3C', match: ['shopping'] },
  { key: 'takachiho', title: '02｜縣北山區：高千穗峽・天岩戶神社・天安河原', color: '#4A7C59', match: ['takachiho', 'amanoiwato'] },
  { key: 'aoshima_nichinan', title: '03｜縣南海岸：青島神社・日南海岸・鵜戶神宮・摩艾・飫肥・都井岬', color: '#C66B3D', match: ['aoshima', 'nichinan', 'udo', 'moai', 'obi', 'toi'] },
  { key: 'hyuga', title: '04｜縣北沿海：日向市（馬背・祈願之海・大御神社・美美津）・延岡', color: '#3B6E8C', match: ['hyuga'] },
  { key: 'west_central', title: '05｜縣西霧島與縣央內陸：都城・蝦野高原・西都原・綾町・宮崎神宮', color: '#7B6D8D', match: ['west_kirishima', 'saito_aya', 'miyazakijingu'] },
  { key: 'gourmet', title: '06｜宮崎必吃餐桌：宮崎牛・元祖南蠻雞・炭火地頭雞・辛麵・芒果甜點', color: '#A64B3C', match: ['beef', 'nanban', 'jidori', 'karamen'] },
  { key: 'hotel', title: '07｜宿泊與度假村：喜來登海洋渡假村・溫泉旅館', color: '#5B6C7D', match: ['hotel'] },
  { key: 'general', title: '08｜全宮崎自由行總覽・自駕攻略・4天3夜行程 Vlog', color: '#0F172A', match: [] }
];

const TAG_LABELS = {
  shopping: '購物伴手禮', takachiho: '高千穗', amanoiwato: '天岩戶', aoshima: '青島',
  nichinan: '日南海岸', udo: '鵜戶神宮', moai: '摩艾', obi: '飫肥城', toi: '都井岬',
  hyuga: '日向延岡', saito_aya: '西都原綾町', west_kirishima: '都城霧島', miyazakijingu: '宮崎神宮',
  beef: '宮崎牛', nanban: '南蠻雞', jidori: '地頭雞', karamen: '美食甜點', hotel: '宿泊溫泉', drive: '自駕攻略'
};

const WEB_CATS = [
  { key: 'souvenir', title: 'A｜伴手禮・土產必買情報', color: '#2563EB' },
  { key: 'shopping', title: 'B｜購物商圈・商場免稅指南', color: '#9C7A3C' },
  { key: 'travel', title: 'C｜旅遊景點・官方觀光攻略', color: '#3B6E8C' },
  { key: 'food', title: 'D｜在地美食・邊走邊吃情報', color: '#A64B3C' }
];

async function main() {
  // Rank videos by parsed view count for picking best representative screenshots
  const rankedVideos = [...videos].sort((a, b) => parseViews(b.views) - parseViews(a.views));

  // Pick 1 unique high-view video for each of the 16 Visual Spotlight cards
  const usedSpotlightIds = new Set();
  const spotlights = SPOTLIGHT_DEFS.map(def => {
    let pick = rankedVideos.find(v => !usedSpotlightIds.has(v.id) && def.re.test(v.title));
    if (!pick) pick = rankedVideos.find(v => !usedSpotlightIds.has(v.id) && def.re.test((v.queries || []).join(' ')));
    if (!pick) pick = rankedVideos.find(v => !usedSpotlightIds.has(v.id));
    if (pick) usedSpotlightIds.add(pick.id);
    return { ...def, video: pick || null };
  });

  // Group all videos into 8 clean non-overlapping primary sections
  const groupedVideos = YT_GROUPS.map(g => ({ ...g, items: [] }));
  for (const v of videos) {
    const tags = v.tags || [];
    let placed = false;
    for (const grp of groupedVideos) {
      if (grp.match.length && grp.match.some(m => tags.includes(m))) {
        grp.items.push(v);
        placed = true;
        break;
      }
    }
    if (!placed) groupedVideos[groupedVideos.length - 1].items.push(v);
  }

  // Within each YouTube section, sort by view count desc and pick Top 6 as illustrated visual cards
  const FEATURED_PER_GROUP = 6;
  const thumbIdsToFetch = [...spotlights.map(s => s.video && s.video.id).filter(Boolean)];
  groupedVideos.forEach(grp => {
    grp.items.sort((a, b) => parseViews(b.views) - parseViews(a.views));
    grp.featured = grp.items.slice(0, FEATURED_PER_GROUP);
    grp.rest = grp.items.slice(FEATURED_PER_GROUP);
    grp.featured.forEach(v => thumbIdsToFetch.push(v.id));
  });

  console.log(`Fetching ${new Set(thumbIdsToFetch).size} real YouTube screenshots for illustrated PDF...`);
  const thumbMap = await batchFetchThumbs(thumbIdsToFetch, 'mqdefault');
  console.log(`Embedded ${thumbMap.size} crisp screenshots as offline base64 images.`);

  const groupedWeb = WEB_CATS.map(c => ({
    ...c,
    items: webGuides.filter(g => g.category === c.key)
  }));
  const otherWeb = webGuides.filter(g => !WEB_CATS.some(c => c.key === g.category));
  if (otherWeb.length) groupedWeb.push({ key: 'other', title: 'E｜其他綜合情報', color: '#475569', items: otherWeb });

  const maxYtGrp = Math.max(...groupedVideos.map(g => g.items.length), 1);

  const html = `<!DOCTYPE html>
<html lang="zh-Hant">
<head>
  <meta charset="UTF-8" />
  <title>宮崎縣旅遊・購物・伴手禮 YouTube ＆ 網頁攻略圖文大全</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 13mm 12mm 14mm 12mm;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: "Noto Sans CJK TC", "Noto Sans TC", "Microsoft JhengHei", "Noto Sans CJK JP", "Yu Gothic", "Hiragino Kaku Gothic ProN", sans-serif;
      color: #0F172A;
      background: #FFFFFF;
      font-size: 9pt;
      line-height: 1.45;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    a { color: #0F172A; text-decoration: none; }
    a:hover { text-decoration: underline; }

    /* Cover Page */
    .cover {
      border: 1px solid #E2E8F0;
      background: #F8FAFC;
      padding: 22px 24px;
      border-top: 5px solid #2563EB;
      margin-bottom: 14px;
    }
    .kicker {
      font-size: 8.2pt;
      font-weight: 700;
      letter-spacing: 0.14em;
      color: #2563EB;
      text-transform: uppercase;
    }
    .cover-title {
      font-size: 20pt;
      font-weight: 800;
      color: #0F172A;
      margin-top: 5px;
      letter-spacing: 0.03em;
    }
    .cover-sub {
      font-size: 9.4pt;
      color: #475569;
      margin-top: 6px;
      line-height: 1.58;
    }
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      margin-top: 14px;
    }
    .kpi {
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      padding: 9px 6px;
      text-align: center;
    }
    .kpi-val {
      font-size: 14.5pt;
      font-weight: 800;
      color: #2563EB;
      font-variant-numeric: tabular-nums;
    }
    .kpi-lbl { font-size: 7.8pt; color: #475569; margin-top: 2px; }
    .webgis-bar {
      margin-top: 12px;
      padding: 7px 11px;
      background: #F1F5F9;
      border-left: 3px solid #2563EB;
      font-size: 8.3pt;
      color: #0F172A;
    }
    .webgis-bar a { color: #2563EB; font-weight: 700; text-decoration: underline; }

    .box {
      border: 1px solid #E2E8F0;
      padding: 12px 14px;
      margin-bottom: 12px;
      break-inside: avoid;
    }
    .box-title {
      font-size: 10pt;
      font-weight: 700;
      color: #0F172A;
      padding-bottom: 5px;
      margin-bottom: 8px;
      border-bottom: 1px solid #E2E8F0;
      display: flex;
      justify-content: space-between;
    }
    .bar-row { margin-bottom: 5px; }
    .bar-head { display: flex; justify-content: space-between; font-size: 8.2pt; margin-bottom: 2px; }
    .bar-track { height: 5.5px; background: #F1F5F9; overflow: hidden; }
    .bar-fill { height: 100%; }

    .toc-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 4px 14px;
      font-size: 8.2pt;
    }
    .toc-item {
      display: flex;
      justify-content: space-between;
      border-bottom: 1px dotted #E2E8F0;
      padding: 2.5px 0;
    }
    .toc-cnt { font-weight: 700; color: #2563EB; white-space: nowrap; }

    /* Section Dividers */
    .part-header {
      page-break-before: always;
      background: #0F172A;
      color: #F8FAFC;
      padding: 11px 15px;
      border-left: 5px solid #2563EB;
      margin-bottom: 11px;
    }
    .part-kicker { font-size: 7.5pt; letter-spacing: 0.14em; color: #E2E8F0; text-transform: uppercase; }
    .part-title { font-size: 14pt; font-weight: 800; margin-top: 2px; }
    .part-desc { font-size: 8.2pt; color: #E6E0D6; margin-top: 2px; }

    /* Visual Spotlight 16-Photo Magazine Gallery */
    .spot-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 9px;
    }
    .spot-card {
      border: 1px solid #E2E8F0;
      background: #F8FAFC;
      overflow: hidden;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .spot-img-wrap {
      position: relative;
      width: 100%;
      height: 106px;
      background: #E6E0D6;
      overflow: hidden;
    }
    .spot-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    .spot-placeholder {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #857E73;
      font-size: 8.5pt;
      font-weight: 700;
    }
    .spot-badge {
      position: absolute;
      top: 6px;
      left: 6px;
      background: rgba(46, 43, 39, 0.88);
      color: #F8FAFC;
      font-size: 7pt;
      font-weight: 700;
      padding: 2px 6px;
    }
    .spot-cat {
      position: absolute;
      top: 6px;
      right: 6px;
      background: #2563EB;
      color: #F8FAFC;
      font-size: 7pt;
      font-weight: 700;
      padding: 2px 6px;
    }
    .spot-body { padding: 7px 9px 8px; }
    .spot-title { font-size: 9.2pt; font-weight: 800; color: #0F172A; }
    .spot-note { font-size: 7.7pt; color: #475569; margin-top: 3px; line-height: 1.42; }
    .spot-vid {
      display: block;
      margin-top: 4px;
      padding-top: 4px;
      border-top: 1px solid #E4DED4;
      font-size: 7.2pt;
      color: #2563EB;
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .cat-head {
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-left: 4px solid #2563EB;
      padding: 6px 10px;
      margin: 12px 0 7px;
      font-size: 9.8pt;
      font-weight: 700;
      display: flex;
      justify-content: space-between;
      align-items: center;
      break-after: avoid;
      page-break-after: avoid;
    }
    .cat-cnt { font-size: 8pt; color: #475569; font-weight: 600; }

    /* Blog / Web Guide Cards */
    .web-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 7px;
    }
    .web-card {
      border: 1px solid #E2E8F0;
      padding: 7px 9px;
      background: #FFFFFF;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .web-title { font-size: 8.6pt; font-weight: 700; color: #0F172A; line-height: 1.35; display: block; }
    .web-meta { margin-top: 3px; display: flex; flex-wrap: wrap; gap: 4px; font-size: 7.2pt; }
    .chip { background: #F1F5F9; border: 1px solid #E2E8F0; padding: 1px 5px; color: #475569; }
    .chip-red { background: #EFF6FF; border: 1px solid #DFB8BF; color: #2563EB; font-weight: 700; }
    .web-summary { font-size: 7.8pt; color: #475569; margin-top: 3px; line-height: 1.4; }
    .web-url { font-size: 6.9pt; color: #2563EB; margin-top: 3px; word-break: break-all; display: block; }

    /* Featured Illustrated YouTube Cards per Section */
    .yt-feat-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 7px;
      margin-bottom: 8px;
    }
    .yt-feat-card {
      display: flex;
      gap: 7px;
      border: 1px solid #E2E8F0;
      background: #F8FAFC;
      padding: 6px;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .yt-feat-thumb {
      width: 96px;
      height: 54px;
      object-fit: cover;
      flex-shrink: 0;
      border: 1px solid #E2E8F0;
      background: #E6E0D6;
    }
    .yt-feat-info { min-width: 0; flex: 1; }
    .yt-feat-title {
      font-size: 7.9pt;
      font-weight: 700;
      color: #0F172A;
      line-height: 1.32;
      display: block;
    }
    .yt-feat-meta { font-size: 7pt; color: #475569; margin-top: 2px; }
    .yt-feat-url { font-size: 6.8pt; color: #2563EB; font-weight: 600; margin-top: 1px; display: inline-block; }

    /* YouTube Directory Table */
    table.yt-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 8px;
      font-size: 7.9pt;
    }
    table.yt-table thead th {
      background: #F1F5F9;
      color: #0F172A;
      font-weight: 700;
      text-align: left;
      padding: 4.5px 6px;
      border: 1px solid #E2E8F0;
      font-size: 7.5pt;
    }
    table.yt-table tbody tr { break-inside: avoid; page-break-inside: avoid; }
    table.yt-table tbody tr:nth-child(even) { background: #F8FAFC; }
    table.yt-table td { border: 1px solid #E4DED4; padding: 4px 6px; vertical-align: top; }
    .col-idx { width: 28px; text-align: center; color: #857E73; font-variant-numeric: tabular-nums; font-weight: 700; }
    .col-ch { width: 112px; color: #475569; font-size: 7.4pt; }
    .col-stat { width: 88px; color: #475569; font-size: 7.3pt; font-variant-numeric: tabular-nums; }
    .yt-link { font-weight: 700; color: #0F172A; line-height: 1.33; display: block; }
    .yt-link-sub { font-size: 6.8pt; color: #2563EB; margin-top: 1px; display: inline-block; }
    .yt-tags { margin-top: 2px; display: flex; flex-wrap: wrap; gap: 3px; }
    .mini-tag { font-size: 6.7pt; background: #F1F5F9; color: #475569; padding: 0 4px; border: 1px solid #E2E8F0; }

    .footer-note {
      margin-top: 14px;
      padding-top: 8px;
      border-top: 1px solid #E2E8F0;
      font-size: 7.6pt;
      color: #857E73;
      text-align: center;
    }
  </style>
</head>
<body>

  <!-- COVER PAGE -->
  <div class="cover">
    <div class="kicker">MIYAZAKI TRAVEL ILLUSTRATED ARCHIVE</div>
    <div class="cover-title">宮崎縣旅遊・購物・伴手禮 圖文影音全覽手冊</div>
    <div class="cover-sub">
      整合宮崎縣 4 天 3 夜旅遊 WebGIS 每日雲端更新資料庫，收錄<strong>全縣五大分區實景・伴手禮・美食截圖圖鑑</strong>、精選網頁／部落格攻略，以及完整實測 YouTube 影片總目錄；PDF 內所有卡片與標題皆支援<strong>點擊直達原網頁與影片</strong>。
    </div>
    <div class="kpi-grid">
      <div class="kpi"><div class="kpi-val">${videos.length} 部</div><div class="kpi-lbl">YouTube 實測影音</div></div>
      <div class="kpi"><div class="kpi-val">${webGuides.length} 篇</div><div class="kpi-lbl">網頁攻略與部落格</div></div>
      <div class="kpi"><div class="kpi-val">${thumbMap.size} 張</div><div class="kpi-lbl">景點／伴手禮實拍截圖</div></div>
      <div class="kpi"><div class="kpi-val">${todayTaipei}</div><div class="kpi-lbl">雲端最新更新日</div></div>
    </div>
    <div class="webgis-bar">
      互動衛星地圖版（WebGIS）：<a href="https://jaaae.github.io/miyazaki-webgis/">https://jaaae.github.io/miyazaki-webgis/</a>
      ｜ GitHub 專案：<a href="https://github.com/JAAAE/miyazaki-webgis">https://github.com/JAAAE/miyazaki-webgis</a>
    </div>
  </div>

  <!-- TOPIC DISTRIBUTION -->
  <div class="box">
    <div class="box-title">
      <span>YouTube 影音主題分布統計（共 ${videos.length} 部）</span>
      <span style="font-size:7.8pt;color:#857E73;font-weight:500">每日雲端自動擴充去重</span>
    </div>
    ${groupedVideos.map(g => `
      <div class="bar-row">
        <div class="bar-head"><span>${esc(g.title)}</span><strong>${g.items.length} 部</strong></div>
        <div class="bar-track"><div class="bar-fill" style="width:${Math.max(2, Math.round((g.items.length / maxYtGrp) * 100))}%;background:${g.color}"></div></div>
      </div>
    `).join('')}
  </div>

  <!-- TABLE OF CONTENTS -->
  <div class="box">
    <div class="box-title"><span>手冊章節目錄</span><span style="font-size:7.8pt;color:#857E73;font-weight:500">Part I 圖文畫廊 · Part II 網頁攻略 · Part III 影音目錄</span></div>
    <div class="toc-grid">
      <div class="toc-item"><span>Part I · 必訪景點・伴手禮・購物・美食 16 大實拍圖鑑</span><span class="toc-cnt">16 張大圖</span></div>
      ${groupedWeb.map(g => `<div class="toc-item"><span>Part II · ${esc(g.title)}</span><span class="toc-cnt">${g.items.length} 篇</span></div>`).join('')}
      ${groupedVideos.map(g => `<div class="toc-item"><span>Part III · ${esc(g.title)}</span><span class="toc-cnt">${g.items.length} 部</span></div>`).join('')}
    </div>
  </div>

  <!-- PART I: 16 VISUAL SPOTLIGHT GALLERY -->
  <div class="part-header">
    <div class="part-kicker">PART I · VISUAL SPOTLIGHT GALLERY</div>
    <div class="part-title">宮崎必訪絕景・必買伴手禮・購物商圈・必吃美食 實拍圖鑑（16 選）</div>
    <div class="part-desc">精選宮崎最具代表性的 8 大核心風景名勝、4 大伴手禮與購物據點、4 大必吃靈魂美食實拍畫面；點擊下方影片標題即可直達實測影像。</div>
  </div>

  <div class="spot-grid">
    ${spotlights.map((sp, i) => {
      const vid = sp.video;
      const imgData = vid ? thumbMap.get(vid.id) : null;
      const ytUrl = vid ? `https://www.youtube.com/watch?v=${vid.id}` : 'https://jaaae.github.io/miyazaki-webgis/';
      return `
        <div class="spot-card">
          <a href="${ytUrl}" style="display:block">
            <div class="spot-img-wrap">
              ${imgData ? `<img class="spot-img" src="${imgData}" alt="" />` : `<div class="spot-placeholder">${esc(sp.label)}</div>`}
              <span class="spot-badge">${String(i + 1).padStart(2, '0')} · ${esc(sp.region)}</span>
              <span class="spot-cat">${esc(sp.cat)}</span>
            </div>
          </a>
          <div class="spot-body">
            <div class="spot-title">${esc(sp.label)}</div>
            <div class="spot-note">${esc(sp.note)}</div>
            ${vid ? `<a class="spot-vid" href="${ytUrl}">▶ 參考實測：${esc(vid.title)}</a>` : ''}
          </div>
        </div>
      `;
    }).join('')}
  </div>

  <!-- PART II: WEB GUIDES & BLOGS -->
  <div class="part-header">
    <div class="part-kicker">PART II · WEB GUIDES &amp; TRAVEL BLOGS</div>
    <div class="part-title">宮崎旅遊・購物商圈・必買伴手禮 網頁攻略彙整（共 ${webGuides.length} 篇）</div>
    <div class="part-desc">收錄官方觀光機構、物產館、商場官網、部落格與每日最新宮崎旅遊／購物情報，點擊標題或網址即可前往原文。</div>
  </div>

  ${groupedWeb.map(grp => `
    <div class="cat-head" style="border-left-color:${grp.color}">
      <span>${esc(grp.title)}</span>
      <span class="cat-cnt">共 ${grp.items.length} 篇</span>
    </div>
    <div class="web-grid">
      ${grp.items.map((g, idx) => `
        <div class="web-card">
          <a class="web-title" href="${esc(g.url)}">${String(idx + 1).padStart(2, '0')}. ${esc(g.title)}</a>
          <div class="web-meta">
            <span class="chip-red">${esc(g.region || '全宮崎縣')}</span>
            <span class="chip">${esc(g.source || '網頁情報')}</span>
            <span class="chip">${esc(g.addedDate || todayTaipei)}</span>
          </div>
          <div class="web-summary">${esc(g.summary || '')}</div>
          <a class="web-url" href="${esc(g.url)}">${esc(g.url.length > 76 ? g.url.slice(0, 76) + '…' : g.url)}</a>
        </div>
      `).join('')}
    </div>
  `).join('')}

  <!-- PART III: ILLUSTRATED YOUTUBE DIRECTORY -->
  <div class="part-header">
    <div class="part-kicker">PART III · ILLUSTRATED YOUTUBE VIDEO DIRECTORY</div>
    <div class="part-title">宮崎縣 YouTube 實測影音圖文總目錄（共 ${videos.length} 部）</div>
    <div class="part-desc">各分區置頂呈現<strong>人氣 Top 6 實景截圖精選卡</strong>，下方緊接該分區完整可點擊影片清單（依觀看熱度排序）。</div>
  </div>

  ${groupedVideos.map(grp => `
    <div class="cat-head" style="border-left-color:${grp.color}">
      <span>${esc(grp.title)}</span>
      <span class="cat-cnt">人氣圖文 Top ${grp.featured.length} ＋ 全部共 ${grp.items.length} 部</span>
    </div>

    <div class="yt-feat-grid">
      ${grp.featured.map((v, idx) => {
        const ytUrl = `https://www.youtube.com/watch?v=${v.id}`;
        const imgData = thumbMap.get(v.id);
        const viewsShort = String(v.views || '').replace(/^觀看次數：/, '');
        return `
          <div class="yt-feat-card">
            <a href="${ytUrl}" style="display:block;flex-shrink:0">
              ${imgData ? `<img class="yt-feat-thumb" src="${imgData}" alt="" />` : `<div class="yt-feat-thumb" style="display:flex;align-items:center;justify-content:center;font-size:7pt;color:#857E73">YT #${idx + 1}</div>`}
            </a>
            <div class="yt-feat-info">
              <a class="yt-feat-title" href="${ytUrl}">${idx + 1}. ${esc(v.title)}</a>
              <div class="yt-feat-meta">${esc(v.channel || '—')}${viewsShort ? ' · ' + esc(viewsShort) : ''}${v.length ? ' · ' + esc(v.length) : ''}</div>
              <a class="yt-feat-url" href="${ytUrl}">▶ youtu.be/${esc(v.id)}</a>
            </div>
          </div>
        `;
      }).join('')}
    </div>

    ${grp.rest.length ? `
      <table class="yt-table">
        <thead>
          <tr>
            <th class="col-idx">#</th>
            <th>影片標題（點擊直連 YouTube）與主題標籤</th>
            <th class="col-ch">頻道名稱</th>
            <th class="col-stat">觀看 / 片長</th>
          </tr>
        </thead>
        <tbody>
          ${grp.rest.map((v, i) => {
            const rank = grp.featured.length + i + 1;
            const ytUrl = `https://www.youtube.com/watch?v=${v.id}`;
            const tagsHtml = (v.tags || []).slice(0, 5).map(t => `<span class="mini-tag">${esc(TAG_LABELS[t] || t)}</span>`).join('');
            const viewsShort = String(v.views || '').replace(/^觀看次數：/, '');
            return `
              <tr>
                <td class="col-idx">${rank}</td>
                <td>
                  <a class="yt-link" href="${ytUrl}">${esc(v.title)}</a>
                  <div class="yt-tags">
                    ${tagsHtml}
                    <a class="yt-link-sub" href="${ytUrl}">youtu.be/${esc(v.id)}</a>
                  </div>
                </td>
                <td class="col-ch">${esc(v.channel || '—')}</td>
                <td class="col-stat">${esc(viewsShort || '—')}${v.length ? '<br>' + esc(v.length) : ''}${v.published ? '<br><span style="color:#857E73">' + esc(v.published) + '</span>' : ''}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    ` : ''}
  `).join('')}

  <div class="footer-note">
    宮崎縣 4 天 3 夜旅遊 WebGIS 每日雲端自動圖文手冊 · 產出日期 ${todayTaipei} · 收錄 ${videos.length} 部 YouTube 影片、${webGuides.length} 篇網頁攻略與 ${thumbMap.size} 張精選實景截圖 · https://jaaae.github.io/miyazaki-webgis/
  </div>

</body>
</html>`;

  fs.writeFileSync(tempHtmlPath, html, 'utf8');

  const browserCandidates = [
    process.env.CHROME_PATH,
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
  ].filter(Boolean);
  const browserBin = browserCandidates.find(p => fs.existsSync(p));
  if (!browserBin) {
    throw new Error('Could not find Chrome/Chromium/Edge executable to render PDF.');
  }

  const fileUrl = pathToFileURL(tempHtmlPath).href;
  const userDataDir = path.join(rootDir, '.tmp_chrome_pdf_profile');
  try {
    execFileSync(browserBin, [
      '--headless=new',
      '--disable-gpu',
      '--no-sandbox',
      '--disable-dev-shm-usage',
      `--user-data-dir=${userDataDir}`,
      '--no-pdf-header-footer',
      `--print-to-pdf=${outPdfPath}`,
      fileUrl
    ], { stdio: 'pipe', timeout: 120000 });
  } finally {
    fs.rmSync(tempHtmlPath, { force: true });
    fs.rmSync(userDataDir, { recursive: true, force: true });
  }

  if (!fs.existsSync(outPdfPath)) {
    throw new Error('PDF file was not created.');
  }
  const sizeKB = (fs.statSync(outPdfPath).size / 1024).toFixed(1);
  console.log(`SUCCESS! Generated Illustrated PDF: ${outPdfPath}`);
  console.log(`Size: ${sizeKB} KB | Embedded Photos: ${thumbMap.size} | YouTube: ${videos.length} | Web Guides: ${webGuides.length}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
