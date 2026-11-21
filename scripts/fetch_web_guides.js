const fs = require('fs');
const path = require('path');
const https = require('https');

const rootDir = path.resolve(__dirname, '..');
const dataDir = path.join(rootDir, 'data');
const guidesPath = path.join(dataDir, 'web_guides.json');
const todayTaipei = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei' }).format(new Date());

// Public Google News RSS queries covering Miyazaki travel, shopping, souvenirs & food
const RSS_QUERIES = [
  { q: '宮崎 伴手禮 OR 必買 OR 紀念品', hl: 'zh-TW', gl: 'TW', ceid: 'TW:zh-Hant', defaultCat: 'souvenir' },
  { q: '宮崎 旅遊 OR 景點 OR 自由行', hl: 'zh-TW', gl: 'TW', ceid: 'TW:zh-Hant', defaultCat: 'travel' },
  { q: '宮崎 購物 OR 逛街 OR AEON OR AMU', hl: 'zh-TW', gl: 'TW', ceid: 'TW:zh-Hant', defaultCat: 'shopping' },
  { q: '宮崎 美食 OR 宮崎牛 OR 南蠻雞 OR 辛麵', hl: 'zh-TW', gl: 'TW', ceid: 'TW:zh-Hant', defaultCat: 'food' },
  { q: '高千穗峽 OR 青島神社 OR 日南海岸 旅遊', hl: 'zh-TW', gl: 'TW', ceid: 'TW:zh-Hant', defaultCat: 'travel' },
  { q: '宮崎 お土産 おすすめ OR 新商品', hl: 'ja', gl: 'JP', ceid: 'JP:ja', defaultCat: 'souvenir' },
  { q: '宮崎 観光 グルメ ショッピング', hl: 'ja', gl: 'JP', ceid: 'JP:ja', defaultCat: 'shopping' }
];

// Filter out Studio Ghibli / Hayao Miyazaki / politics / crime / sports noise
const EXCLUDE_RE = /(宮[崎﨑]駿|宮崎駿|ジブリ|ghibli|千と千尋|トトロ|宮崎あおい|宮崎美子|宮崎謙介|逮捕|容疑|事件|事故|殺害|詐欺|地震速報|訃報|死去|選挙|市長選|知事選|議会|裁判|判決|火災|行方不明|プロ野球|キャンプ中継|サッカー|Jリーグ|競馬|競輪|ボートレース)/i;

// Must clearly relate to Miyazaki prefecture tourism, food, shopping, or souvenirs
const MUST_MIYAZAKI_RE = /(宮崎|高千[穗穂]|青島神社|日南|鵜[戶戸]神宮|飫肥|都井岬|日向市|延岡|都城|西都原|綾町|えびの|蝦野)/i;
const MUST_TOPIC_RE = /(旅遊|旅行|觀光|観光|景點|自由行|行程|自駕|必買|伴手禮|紀念品|土產|お土産|土産|特産|名産|購物|逛街|商場|免稅|ショッピング|美食|グルメ|甜點|スイーツ|起司饅頭|チーズ饅頭|芒果|マンゴー|日向夏|燒酎|焼酎|宮崎牛|南蠻雞|チキン南蛮|地雞|地鶏|辛麵|辛麺|飯店|溫泉|温泉|祭典|花海|神社|峽谷|海岸|機場|空港|駅)/i;

function httpsGetText(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      agent: false,
      family: 4,
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; MiyazakiWebGIS-Bot/1.0)',
        'Connection': 'close'
      }
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        return httpsGetText(res.headers.location).then(resolve, reject);
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    });
    req.on('error', reject);
    req.on('timeout', () => req.destroy(new Error('Timeout')));
  });
}

function decodeXml(str) {
  return String(str || '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseRssItems(xml) {
  const items = [];
  const itemRe = /<item>([\s\S]*?)<\/item>/gi;
  let m;
  while ((m = itemRe.exec(xml)) !== null) {
    const block = m[1];
    const titleMatch = block.match(/<title>([\s\S]*?)<\/title>/i);
    const linkMatch = block.match(/<link>([\s\S]*?)<\/link>/i);
    const pubMatch = block.match(/<pubDate>([\s\S]*?)<\/pubDate>/i);
    const srcMatch = block.match(/<source[^>]*>([\s\S]*?)<\/source>/i);

    let title = decodeXml(titleMatch ? titleMatch[1] : '');
    const source = decodeXml(srcMatch ? srcMatch[1] : '旅遊網頁情報');
    // Remove trailing " - SourceName" from Google News titles
    if (source && title.endsWith(` - ${source}`)) {
      title = title.slice(0, -(` - ${source}`).length).trim();
    }
    const url = decodeXml(linkMatch ? linkMatch[1] : '');
    const pubDateRaw = decodeXml(pubMatch ? pubMatch[1] : '');
    let pubDate = todayTaipei;
    if (pubDateRaw) {
      const parsed = new Date(pubDateRaw);
      if (!Number.isNaN(parsed.getTime())) {
        pubDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei' }).format(parsed);
      }
    }
    if (title && url) items.push({ title, url, source, pubDate });
  }
  return items;
}

function detectCategory(title, defaultCat) {
  if (/(伴手禮|必買|紀念品|土產|お土産|土産|チーズ饅頭|起司饅頭|焼酎|燒酎|特産|名産)/i.test(title)) return 'souvenir';
  if (/(購物|逛街|商場|免稅|AEON|イオン|AMU|アミュ|唐吉訶德|山形屋|ショッピング|物産館)/i.test(title)) return 'shopping';
  if (/(美食|グルメ|宮崎牛|南蠻雞|チキン南蛮|地雞|地鶏|辛麵|辛麺|芒果|マンゴー|甜點|スイーツ|拉麵|餐廳)/i.test(title)) return 'food';
  if (/(景點|神社|峽谷|高千[穗穂]|青島|日南|鵜[戶戸]|飫肥|都井岬|自由行|旅遊|旅行|観光|飯店|溫泉)/i.test(title)) return 'travel';
  return defaultCat || 'travel';
}

function detectRegion(title) {
  if (/(高千[穗穂]|天岩[戶戸]|天安河原)/i.test(title)) return '高千穗町';
  if (/(日南|鵜[戶戸]|飫肥|都井岬|串間)/i.test(title)) return '日南・串間';
  if (/(日向|馬背|延岡|美美津)/i.test(title)) return '日向・延岡';
  if (/(都城|蝦野|えびの|霧島|小林)/i.test(title)) return '都城・蝦野';
  if (/(青島|宮崎市|橘通|AEON|AMU|アミュ|宮崎空港|宮崎機場|西都原|綾町)/i.test(title)) return '宮崎市・縣央';
  return '全宮崎縣';
}

function normalizeKey(title) {
  return title.toLowerCase().replace(/[\s\-_|｜【】「」『』()（）\[\].,。、!?！？]/g, '').slice(0, 32);
}

async function main() {
  fs.mkdirSync(dataDir, { recursive: true });
  const existing = fs.existsSync(guidesPath)
    ? JSON.parse(fs.readFileSync(guidesPath, 'utf8'))
    : [];

  const seenUrls = new Set(existing.map(g => g.url));
  const seenTitles = new Set(existing.map(g => normalizeKey(g.title)));
  let nextNum = existing.reduce((max, g) => {
    const m = String(g.id || '').match(/^wg-(\d+)$/);
    return m ? Math.max(max, Number(m[1])) : max;
  }, 0) + 1;

  const MAX_NEW_PER_RUN = 6;
  let added = 0;

  for (const cfg of RSS_QUERIES) {
    if (added >= MAX_NEW_PER_RUN) break;
    const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(cfg.q)}&hl=${cfg.hl}&gl=${cfg.gl}&ceid=${encodeURIComponent(cfg.ceid)}`;
    try {
      const xml = await httpsGetText(rssUrl);
      const items = parseRssItems(xml);
      let addedHere = 0;
      for (const item of items) {
        if (added >= MAX_NEW_PER_RUN || addedHere >= 2) break;
        if (EXCLUDE_RE.test(item.title)) continue;
        if (!MUST_MIYAZAKI_RE.test(item.title)) continue;
        if (!MUST_TOPIC_RE.test(item.title)) continue;

        const norm = normalizeKey(item.title);
        if (seenUrls.has(item.url) || seenTitles.has(norm)) continue;

        const category = detectCategory(item.title, cfg.defaultCat);
        const region = detectRegion(item.title);
        existing.push({
          id: `wg-${String(nextNum++).padStart(2, '0')}`,
          title: item.title,
          category,
          region,
          summary: `每日自動彙整自「${item.source}」之宮崎${category === 'souvenir' ? '伴手禮與土產' : category === 'shopping' ? '購物商圈' : category === 'food' ? '在地美食' : '旅遊景點'}最新網頁情報（刊載日 ${item.pubDate}）。`,
          highlights: `${item.source}｜自動彙整最新情報`,
          source: item.source,
          url: item.url,
          addedDate: todayTaipei
        });
        seenUrls.add(item.url);
        seenTitles.add(norm);
        added++;
        addedHere++;
      }
      console.log(`[RSS: ${cfg.q}] parsed=${items.length}, +new=${addedHere}`);
      await new Promise(r => setTimeout(r, 600));
    } catch (err) {
      console.error(`[RSS: ${cfg.q}] ERROR: ${err.message}`);
    }
  }

  // Keep curated guides + cap total web guides at 120 to keep single-file HTML fast
  const trimmed = existing.length > 120
    ? [...existing.slice(0, 10), ...existing.slice(-(120 - 10))]
    : existing;

  fs.writeFileSync(guidesPath, JSON.stringify(trimmed, null, 2), 'utf8');
  console.log(`DONE! Added=${added}, TotalWebGuides=${trimmed.length} -> ${guidesPath}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
