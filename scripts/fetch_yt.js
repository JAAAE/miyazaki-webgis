const fs = require('fs');
const path = require('path');

const queries = [
  "宮崎 旅遊",
  "宮崎 自由行",
  "宮崎 4天3夜",
  "宮崎 景點",
  "宮崎 美食",
  "宮崎 自駕",
  "高千穗峽 旅遊",
  "青島神社 鬼之洗衣板",
  "日南海岸 鵜戶神宮 摩艾",
  "宮崎牛 南蠻雞 地雞",
  "宮崎 住宿 飯店",
  "飫肥城下町 宮崎",
  "天岩戶神社 天安河原",
  "宮崎 旅行 vlog",
  "宮崎 観光 おすすめ",
  "宮崎 旅行 3泊4日",
  "宮崎 グルメ ランチ",
  "高千穂峡 観光",
  "日南海岸 ドライブ",
  "都井岬 宮崎 観光",
  "宮崎神宮 平和台公園",
  "Miyazaki Japan travel vlog",
  "Miyazaki itinerary guide",
  "Takachiho Gorge Miyazaki travel",
  "Aoshima Nichinan Miyazaki"
];

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

async function fetchQuery(q) {
  const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
      'Accept-Language': 'zh-TW,zh;q=0.9,ja;q=0.8,en;q=0.7'
    }
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();
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
  const videos = new Map();
  for (const q of queries) {
    try {
      const renderers = await fetchQuery(q);
      let added = 0;
      for (const vr of renderers) {
        const id = vr.videoId;
        if (!id) continue;
        if (videos.has(id)) {
          const existing = videos.get(id);
          if (!existing.queries.includes(q)) existing.queries.push(q);
          continue;
        }
        videos.set(id, {
          id,
          title: getText(vr.title),
          channel: getText(vr.ownerText),
          views: getText(vr.viewCountText) || getText(vr.shortViewCountText),
          length: getText(vr.lengthText),
          published: getText(vr.publishedTimeText),
          queries: [q]
        });
        added++;
      }
      console.log(`[${q}] found=${renderers.length}, added=${added}, total=${videos.size}`);
      await new Promise(r => setTimeout(r, 250));
    } catch (err) {
      console.error(`[${q}] ERROR: ${err.message}`);
    }
  }
  const dataDir = path.resolve(__dirname, '..', 'data');
  fs.mkdirSync(dataDir, { recursive: true });
  const outPath = path.join(dataDir, 'yt_videos.json');
  const list = Array.from(videos.values());
  fs.writeFileSync(outPath, JSON.stringify(list, null, 2), 'utf8');
  console.log(`DONE! Saved ${list.length} unique videos to ${outPath}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
