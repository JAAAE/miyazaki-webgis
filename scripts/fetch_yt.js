const fs = require('fs');
const path = require('path');
const https = require('https');

const rootDir = path.resolve(__dirname, '..');
const dataDir = path.join(rootDir, 'data');
const cleanPath = path.join(dataDir, 'yt_videos_clean.json');

// Comprehensive Miyazaki travel, shopping, souvenir, food & regional queries
const queries = [
  // Shopping & Souvenirs (core expansion focus)
  "宮崎 伴手禮 必買",
  "宮崎 購物 逛街",
  "宮崎 紀念品 土產",
  "宮崎 機場 伴手禮",
  "宮崎 AEON MALL 購物",
  "宮崎車站 AMU PLAZA 逛街",
  "宮崎 起司饅頭 甜點 伴手禮",
  "宮崎 お土産 おすすめ",
  "宮崎 お土産 ランキング",
  "宮崎 ショッピング モール",
  "宮崎空港 お土産 グルメ",
  "高千穂 お土産 グルメ",
  "日南 飫肥 食べ歩き お土産",
  "宮崎 焼酎 霧島 工場",
  "Miyazaki shopping souvenirs Japan",
  "Miyazaki food tour street food",
  // Fresh travel & regional updates
  "宮崎 旅遊 2025",
  "宮崎 旅遊 2026",
  "宮崎 自由行 攻略",
  "宮崎 4天3夜 行程",
  "宮崎 自駕 旅遊",
  "宮崎 美食 推薦",
  "高千穗峽 划船 攻略",
  "青島神社 日南海岸 旅遊",
  "日向市 馬背 祈願之海 旅遊",
  "延岡 辛麵 南蠻雞 旅遊",
  "都城 蝦野高原 霧島 宮崎",
  "宮崎 観光 2025 おすすめ",
  "宮崎 旅行 3泊4日 vlog",
  "Miyazaki Japan travel vlog"
];

// Exclude unrelated Hayao Miyazaki / Ghibli / anime / Soulsborne noise
const EXCLUDE_RE = /(宮[崎﨑]駿|宮崎駿|ジブリ|ghibli|千と千尋|トトロ|ハウル|もののけ|ナウシカ|紅の豚|ラピュタ|魔女の宅急便|君たちはどう生きるか|elden\s*ring|dark\s*souls|bloodborne|sekiro|fromsoftware|hidetaka\s*miyazaki|armored\s*core|宮崎あおい|宮崎美子|宮崎謙介|宮崎哲弥|宮崎由加|宮崎勤)/i;

// Must contain at least one Miyazaki prefecture / attraction keyword
const INCLUDE_RE = /(宮崎|miyazaki|高千[穗穂]|takachiho|青島|aoshima|日南|nichinan|鵜[戶戸]|udo|飫肥|obi|都井岬|日向|hyuga|延岡|nobeoka|都城|miyakonojo|西都原|綾町|えびの|蝦野|霧島|天岩[戶戸]|天安河原|堀切峠|南蠻雞|チキン南蛮|辛麺|辛麵|チーズ饅頭|起司饅頭|地頭鶏|地頭雞|霧島酒造|シェラトン|シーガイア|鬼の洗濯板|鬼之洗衣板|モアイ|摩艾)/i;

const TAG_RULES = [
  { key: 'shopping', re: /(伴手禮|紀念品|必買|土產|購物|逛街|商場|藥妝|免稅|特產|名產|物産|お土産|土産|ショッピング|買い物|イオン|aeon|アミュ|amu|山形屋|ドンキ|唐吉訶德|チーズ饅頭|起司饅頭|こんね|konne|焼酎|燒酎|souvenir|shopping|gift|mall)/i },
  { key: 'takachiho', re: /(高千[穗穂]|takachiho|真名井|あまてらす|天照鐵道|夜神樂|夜神楽)/i },
  { key: 'amanoiwato', re: /(天岩[戶戸]|天安河原|amanoiwato)/i },
  { key: 'aoshima', re: /(青島|aoshima|鬼之洗衣板|鬼の洗濯板)/i },
  { key: 'nichinan', re: /(日南|nichinan|堀切峠|フェニックス|phoenix)/i },
  { key: 'udo', re: /(鵜[戶戸]|udo\s*jingu|運玉)/i },
  { key: 'moai', re: /(摩艾|莫埃|サンメッセ|sun\s*messe|moai)/i },
  { key: 'obi', re: /(飫肥|obi|おび天)/i },
  { key: 'toi', re: /(都井岬|御崎馬|toi\s*cape)/i },
  { key: 'hyuga', re: /(日向|hyuga|馬[ヶケ]背|馬背|クルスの海|祈願之海|大御神社|美[々美]津|愛宕山|延岡|nobeoka)/i },
  { key: 'saito_aya', re: /(西都原|綾照葉|綾町|大吊橋|saitobaru|aya)/i },
  { key: 'west_kirishima', re: /(都城|miyakonojo|關之尾|関之尾|高千[穗穂]牧場|蝦野|えびの|霧島|kirishima|ebino)/i },
  { key: 'miyazakijingu', re: /(宮崎神宮|平和台|はにわ|埴輪)/i },
  { key: 'beef', re: /(宮崎牛|ミヤチク|apas|燒肉|焼肉|和牛|牛排|steak|wagyu)/i },
  { key: 'nanban', re: /(南蠻雞|南蛮|おぐら|直ちゃん|炸雞)/i },
  { key: 'jidori', re: /(地雞|地鶏|地頭[雞鶏]|丸萬|丸万|炭火燒|炭火焼|ぐんけい)/i },
  { key: 'karamen', re: /(辛麵|辛麺|枡元|烏龍麵|うどん|芒果|マンゴー|水果|フルーツ大野|甜點|スイーツ|美食|グルメ|ランチ|ramen|udon|mango|food)/i },
  { key: 'hotel', re: /(住宿|飯店|酒店|旅館|溫泉|温泉|喜來登|シェラトン|シーガイア|seagaia|hotel|resort)/i },
  { key: 'drive', re: /(自駕|租車|ドライブ|レンタカー|road\s*trip|4天3夜|3泊4日|行程|攻略|自由行|itinerary)/i }
];

function computeTags(title, queriesList = []) {
  const hay = `${title} ${(queriesList || []).join(' ')}`;
  const tags = [];
  for (const rule of TAG_RULES) {
    if (rule.re.test(hay)) tags.push(rule.key);
  }
  return tags;
}

function extractVideoRenderers(obj, results = []) {
  if (!obj || typeof obj !== 'object') return results;
  if (Array.isArray(obj)) {
    for (const item of obj) extractVideoRenderers(item, results);
    return results;
  }
  if (obj.videoRenderer) {
    results.push(obj.videoRenderer);
    return results;
  }
  for (const key of Object.keys(obj)) {
    extractVideoRenderers(obj[key], results);
  }
  return results;
}

function getText(node) {
  if (!node) return '';
  if (typeof node === 'string') return node;
  if (node.simpleText) return node.simpleText;
  if (Array.isArray(node.runs)) return node.runs.map(r => r.text || '').join('');
  return '';
}

function httpsGetText(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      agent: false,
      family: 4,
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        'Accept-Language': 'zh-TW,zh;q=0.9,ja;q=0.8,en;q=0.7',
        'Connection': 'close'
      }
    }, (res) => {
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

async function fetchQuery(q) {
  const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;
  let html;
  try {
    html = await httpsGetText(url);
  } catch (err) {
    await new Promise(r => setTimeout(r, 1500));
    html = await httpsGetText(url);
  }
  const marker = 'var ytInitialData = ';
  const start = html.indexOf(marker);
  if (start === -1) return [];
  const jsonStart = start + marker.length;
  const end = html.indexOf(';</script>', jsonStart);
  if (end === -1) return [];
  const data = JSON.parse(html.slice(jsonStart, end));
  return extractVideoRenderers(data);
}

async function main() {
  fs.mkdirSync(dataDir, { recursive: true });
  const existingList = fs.existsSync(cleanPath)
    ? JSON.parse(fs.readFileSync(cleanPath, 'utf8'))
    : [];

  const videos = new Map();
  for (const v of existingList) {
    if (!v.id) continue;
    const mergedTags = Array.from(new Set([...(v.tags || []), ...computeTags(v.title || '', v.queries || [])]));
    videos.set(v.id, { ...v, queries: v.queries || [], tags: mergedTags });
  }
  const initialCount = videos.size;
  let newlyAdded = 0;

  // Rotate 10 queries per daily run (or use --all for all queries) to avoid YouTube socket rate limits
  const runAll = process.argv.includes('--all');
  const daySeed = Math.floor(Date.now() / 86400000);
  const batchSize = 10;
  const startIdx = (daySeed * batchSize) % queries.length;
  const activeQueries = runAll
    ? queries
    : Array.from({ length: batchSize }, (_, i) => queries[(startIdx + i) % queries.length]);

  for (const q of activeQueries) {
    try {
      const renderers = await fetchQuery(q);
      let addedThisQuery = 0;
      for (const vr of renderers) {
        const id = vr.videoId;
        const title = getText(vr.title);
        if (!id || !title) continue;
        if (EXCLUDE_RE.test(title)) continue;
        if (!INCLUDE_RE.test(title)) continue;

        if (videos.has(id)) {
          const ex = videos.get(id);
          if (!ex.queries.includes(q)) ex.queries.push(q);
          ex.tags = Array.from(new Set([...(ex.tags || []), ...computeTags(ex.title, ex.queries)]));
          continue;
        }

        const tags = computeTags(title, [q]);
        videos.set(id, {
          id,
          title,
          channel: getText(vr.ownerText),
          views: getText(vr.viewCountText) || getText(vr.shortViewCountText),
          length: getText(vr.lengthText),
          published: getText(vr.publishedTimeText),
          queries: [q],
          tags
        });
        addedThisQuery++;
        newlyAdded++;
      }
      console.log(`[${q}] found=${renderers.length}, +new=${addedThisQuery}, total=${videos.size}`);
      await new Promise(r => setTimeout(r, 900));
    } catch (err) {
      console.error(`[${q}] ERROR: ${err.message}`);
    }
  }

  const finalList = Array.from(videos.values());
  fs.writeFileSync(cleanPath, JSON.stringify(finalList, null, 2), 'utf8');
  console.log(`DONE! Existing=${initialCount}, Added=${newlyAdded}, Total=${finalList.length} -> ${cleanPath}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
