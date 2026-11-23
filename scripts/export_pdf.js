const fs = require('fs');
const path = require('path');
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

// Primary category assignment so each of the 656+ unique videos appears cleanly once without bloating the PDF
const YT_GROUPS = [
  { key: 'shopping', title: '01｜宮崎購物・伴手禮・商場・機場土產', color: '#9C7A3C', match: ['shopping'] },
  { key: 'takachiho', title: '02｜縣北山區：高千穗峽・天岩戶神社・天安河原', color: '#4A7C59', match: ['takachiho', 'amanoiwato'] },
  { key: 'aoshima_nichinan', title: '03｜縣南海岸：青島神社・日南海岸・鵜戶神宮・摩艾・飫肥・都井岬', color: '#C66B3D', match: ['aoshima', 'nichinan', 'udo', 'moai', 'obi', 'toi'] },
  { key: 'hyuga', title: '04｜縣北沿海：日向市（馬背・祈願之海・大御神社・美美津）・延岡', color: '#3B6E8C', match: ['hyuga'] },
  { key: 'west_central', title: '05｜縣西霧島與縣央內陸：都城・蝦野高原・西都原・綾町・宮崎神宮', color: '#7B6D8D', match: ['west_kirishima', 'saito_aya', 'miyazakijingu'] },
  { key: 'gourmet', title: '06｜宮崎必吃餐桌：宮崎牛・元祖南蠻雞・炭火地頭雞・辛麵・芒果甜點', color: '#A64B3C', match: ['beef', 'nanban', 'jidori', 'karamen'] },
  { key: 'hotel', title: '07｜宿泊與度假村：喜來登海洋渡假村・溫泉旅館', color: '#5B6C7D', match: ['hotel'] },
  { key: 'general', title: '08｜全宮崎自由行總覽・自駕攻略・4天3夜行程 Vlog', color: '#2E2B27', match: [] }
];

const TAG_LABELS = {
  shopping: '購物伴手禮', takachiho: '高千穗', amanoiwato: '天岩戶', aoshima: '青島',
  nichinan: '日南海岸', udo: '鵜戶神宮', moai: '摩艾', obi: '飫肥城', toi: '都井岬',
  hyuga: '日向延岡', saito_aya: '西都原綾町', west_kirishima: '都城霧島', miyazakijingu: '宮崎神宮',
  beef: '宮崎牛', nanban: '南蠻雞', jidori: '地頭雞', karamen: '美食甜點', hotel: '宿泊溫泉', drive: '自駕攻略'
};

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

const WEB_CATS = [
  { key: 'souvenir', title: 'A｜伴手禮・土產必買情報', color: '#7F0019' },
  { key: 'shopping', title: 'B｜購物商圈・商場免稅指南', color: '#9C7A3C' },
  { key: 'travel', title: 'C｜旅遊景點・官方觀光攻略', color: '#3B6E8C' },
  { key: 'food', title: 'D｜在地美食・邊走邊吃情報', color: '#A64B3C' }
];

const groupedWeb = WEB_CATS.map(c => ({
  ...c,
  items: webGuides.filter(g => g.category === c.key)
}));
const otherWeb = webGuides.filter(g => !WEB_CATS.some(c => c.key === g.category));
if (otherWeb.length) groupedWeb.push({ key: 'other', title: 'E｜其他綜合情報', color: '#59544C', items: otherWeb });

const maxYtGrp = Math.max(...groupedVideos.map(g => g.items.length), 1);

const html = `<!DOCTYPE html>
<html lang="zh-Hant">
<head>
  <meta charset="UTF-8" />
  <title>宮崎縣旅遊・購物・伴手禮 YouTube ＆ 網頁攻略大全</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 14mm 12mm 15mm 12mm;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: "Noto Sans CJK TC", "Noto Sans TC", "Microsoft JhengHei", "Noto Sans CJK JP", "Yu Gothic", "Hiragino Kaku Gothic ProN", sans-serif;
      color: #2E2B27;
      background: #FFFFFF;
      font-size: 9.2pt;
      line-height: 1.45;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    a { color: #2E2B27; text-decoration: none; }
    a:hover { text-decoration: underline; }

    /* Cover Page */
    .cover {
      border: 1px solid #D8D1C5;
      background: #F7F5F0;
      padding: 26px 28px;
      border-top: 5px solid #7F0019;
      margin-bottom: 18px;
    }
    .kicker {
      font-size: 8.5pt;
      font-weight: 700;
      letter-spacing: 0.14em;
      color: #7F0019;
      text-transform: uppercase;
    }
    .cover-title {
      font-size: 21pt;
      font-weight: 800;
      color: #2E2B27;
      margin-top: 6px;
      letter-spacing: 0.03em;
    }
    .cover-sub {
      font-size: 10pt;
      color: #59544C;
      margin-top: 6px;
      line-height: 1.6;
    }
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      margin-top: 16px;
    }
    .kpi {
      background: #FFFFFF;
      border: 1px solid #D8D1C5;
      padding: 10px 8px;
      text-align: center;
    }
    .kpi-val {
      font-size: 15pt;
      font-weight: 800;
      color: #7F0019;
      font-variant-numeric: tabular-nums;
    }
    .kpi-lbl {
      font-size: 8pt;
      color: #59544C;
      margin-top: 2px;
    }
    .webgis-bar {
      margin-top: 14px;
      padding: 8px 12px;
      background: #EFECE6;
      border-left: 3px solid #7F0019;
      font-size: 8.6pt;
      color: #2E2B27;
    }
    .webgis-bar a { color: #7F0019; font-weight: 700; text-decoration: underline; }

    /* Distribution Chart & TOC */
    .box {
      border: 1px solid #D8D1C5;
      padding: 14px 16px;
      margin-bottom: 14px;
      break-inside: avoid;
    }
    .box-title {
      font-size: 10.5pt;
      font-weight: 700;
      color: #2E2B27;
      padding-bottom: 6px;
      margin-bottom: 10px;
      border-bottom: 1px solid #D8D1C5;
      display: flex;
      justify-content: space-between;
    }
    .bar-row { margin-bottom: 6px; }
    .bar-head { display: flex; justify-content: space-between; font-size: 8.4pt; margin-bottom: 2px; }
    .bar-track { height: 6px; background: #EFECE6; overflow: hidden; }
    .bar-fill { height: 100%; }

    .toc-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px 16px;
      font-size: 8.5pt;
    }
    .toc-item {
      display: flex;
      justify-content: space-between;
      border-bottom: 1px dotted #D8D1C5;
      padding: 3px 0;
    }
    .toc-cnt { font-weight: 700; color: #7F0019; white-space: nowrap; }

    /* Section Dividers */
    .part-header {
      page-break-before: always;
      background: #2E2B27;
      color: #F7F5F0;
      padding: 12px 16px;
      border-left: 5px solid #7F0019;
      margin-bottom: 12px;
    }
    .part-kicker { font-size: 7.8pt; letter-spacing: 0.14em; color: #D8D1C5; text-transform: uppercase; }
    .part-title { font-size: 14.5pt; font-weight: 800; margin-top: 2px; }
    .part-desc { font-size: 8.5pt; color: #E6E0D6; margin-top: 3px; }

    .cat-head {
      background: #F7F5F0;
      border: 1px solid #D8D1C5;
      border-left: 4px solid #7F0019;
      padding: 6px 10px;
      margin: 12px 0 7px;
      font-size: 10pt;
      font-weight: 700;
      display: flex;
      justify-content: space-between;
      align-items: center;
      break-after: avoid;
      page-break-after: avoid;
    }
    .cat-cnt { font-size: 8.2pt; color: #59544C; font-weight: 600; }

    /* Blog / Web Guide Cards */
    .web-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 7px;
    }
    .web-card {
      border: 1px solid #D8D1C5;
      padding: 8px 10px;
      background: #FFFFFF;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .web-title {
      font-size: 8.8pt;
      font-weight: 700;
      color: #2E2B27;
      line-height: 1.35;
      display: block;
    }
    .web-meta {
      margin-top: 4px;
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      font-size: 7.4pt;
    }
    .chip {
      background: #EFECE6;
      border: 1px solid #D8D1C5;
      padding: 1px 5px;
      color: #59544C;
    }
    .chip-red {
      background: #F9EFF1;
      border: 1px solid #DFB8BF;
      color: #7F0019;
      font-weight: 700;
    }
    .web-summary {
      font-size: 7.9pt;
      color: #59544C;
      margin-top: 4px;
      line-height: 1.42;
    }
    .web-url {
      font-size: 7pt;
      color: #7F0019;
      margin-top: 4px;
      word-break: break-all;
      display: block;
    }

    /* YouTube Directory Table */
    table.yt-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 8px;
      font-size: 8pt;
    }
    table.yt-table thead th {
      background: #EFECE6;
      color: #2E2B27;
      font-weight: 700;
      text-align: left;
      padding: 5px 6px;
      border: 1px solid #D8D1C5;
      font-size: 7.6pt;
    }
    table.yt-table tbody tr {
      break-inside: avoid;
      page-break-inside: avoid;
    }
    table.yt-table tbody tr:nth-child(even) {
      background: #FAF8F4;
    }
    table.yt-table td {
      border: 1px solid #E4DED4;
      padding: 4.5px 6px;
      vertical-align: top;
    }
    .col-idx { width: 28px; text-align: center; color: #857E73; font-variant-numeric: tabular-nums; font-weight: 700; }
    .col-ch { width: 112px; color: #59544C; font-size: 7.5pt; }
    .col-stat { width: 88px; color: #59544C; font-size: 7.4pt; font-variant-numeric: tabular-nums; }
    .yt-link {
      font-weight: 700;
      color: #2E2B27;
      line-height: 1.35;
      display: block;
    }
    .yt-link-sub {
      font-size: 6.9pt;
      color: #7F0019;
      margin-top: 1px;
      display: inline-block;
    }
    .yt-tags {
      margin-top: 2px;
      display: flex;
      flex-wrap: wrap;
      gap: 3px;
    }
    .mini-tag {
      font-size: 6.8pt;
      background: #EFECE6;
      color: #59544C;
      padding: 0 4px;
      border: 1px solid #D8D1C5;
    }
    .footer-note {
      margin-top: 16px;
      padding-top: 8px;
      border-top: 1px solid #D8D1C5;
      font-size: 7.8pt;
      color: #857E73;
      text-align: center;
    }
  </style>
</head>
<body>

  <!-- COVER PAGE -->
  <div class="cover">
    <div class="kicker">MIYAZAKI TRAVEL DIGITAL ARCHIVE · MUJI EDITION</div>
    <div class="cover-title">宮崎縣旅遊・購物・伴手禮 影音＆網頁情報全覽</div>
    <div class="cover-sub">
      完整彙整宮崎縣 4 天 3 夜旅遊 WebGIS 資料庫，收錄全縣五大分區（宮崎市・高千穗・日向延岡・日南海岸・都城霧島）實測 YouTube 旅遊購物影片與精選網頁／部落格攻略，PDF 內所有標題皆為<strong>可直接點擊開啟的原始連結</strong>。
    </div>
    <div class="kpi-grid">
      <div class="kpi"><div class="kpi-val">${videos.length} 部</div><div class="kpi-lbl">YouTube 實測影音</div></div>
      <div class="kpi"><div class="kpi-val">${webGuides.length} 篇</div><div class="kpi-lbl">網頁攻略與部落格</div></div>
      <div class="kpi"><div class="kpi-val">8 大區</div><div class="kpi-lbl">影音主題精準分類</div></div>
      <div class="kpi"><div class="kpi-val">${todayTaipei}</div><div class="kpi-lbl">資料彙整日期</div></div>
    </div>
    <div class="webgis-bar">
      互動衛星地圖版（WebGIS）：<a href="https://jaaae.github.io/miyazaki-webgis/">https://jaaae.github.io/miyazaki-webgis/</a>
      ｜ GitHub 原始專案：<a href="https://github.com/JAAAE/miyazaki-webgis">https://github.com/JAAAE/miyazaki-webgis</a>
    </div>
  </div>

  <!-- TOPIC DISTRIBUTION -->
  <div class="box">
    <div class="box-title">
      <span>YouTube 影音主題分布統計（共 ${videos.length} 部・去重單一主分類）</span>
      <span style="font-size:8pt;color:#857E73;font-weight:500">依宮崎地理分區與旅遊主題</span>
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
    <div class="box-title"><span>手冊目錄總覽</span><span style="font-size:8pt;color:#857E73;font-weight:500">Part I 網頁攻略 ＋ Part II YouTube 影音</span></div>
    <div class="toc-grid">
      ${groupedWeb.map(g => `<div class="toc-item"><span>Part I · ${esc(g.title)}</span><span class="toc-cnt">${g.items.length} 篇</span></div>`).join('')}
      ${groupedVideos.map(g => `<div class="toc-item"><span>Part II · ${esc(g.title)}</span><span class="toc-cnt">${g.items.length} 部</span></div>`).join('')}
    </div>
  </div>

  <!-- PART I: WEB GUIDES & BLOGS -->
  <div class="part-header">
    <div class="part-kicker">PART I · WEB GUIDES &amp; TRAVEL BLOGS</div>
    <div class="part-title">宮崎旅遊・購物商圈・必買伴手禮 網頁攻略彙整（共 ${webGuides.length} 篇）</div>
    <div class="part-desc">收錄官方觀光機構、物產館、商場官網、部落格與最新宮崎旅遊／購物情報，點擊標題或網址即可前往原文。</div>
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
          <a class="web-url" href="${esc(g.url)}">${esc(g.url.length > 78 ? g.url.slice(0, 78) + '…' : g.url)}</a>
        </div>
      `).join('')}
    </div>
  `).join('')}

  <!-- PART II: YOUTUBE VIDEOS -->
  <div class="part-header">
    <div class="part-kicker">PART II · CURATED YOUTUBE VIDEO DIRECTORY</div>
    <div class="part-title">宮崎縣 YouTube 實測影音總目錄（共 ${videos.length} 部）</div>
    <div class="part-desc">依購物伴手禮、高千穗、日南海岸、日向延岡、霧島都城、必吃美食、住宿與全縣自駕分區整理；點擊影片標題即可直接於 YouTube 播放。</div>
  </div>

  ${groupedVideos.map(grp => `
    <div class="cat-head" style="border-left-color:${grp.color}">
      <span>${esc(grp.title)}</span>
      <span class="cat-cnt">共 ${grp.items.length} 部</span>
    </div>
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
        ${grp.items.map((v, idx) => {
          const ytUrl = `https://www.youtube.com/watch?v=${v.id}`;
          const tagsHtml = (v.tags || []).slice(0, 5).map(t => `<span class="mini-tag">${esc(TAG_LABELS[t] || t)}</span>`).join('');
          const viewsShort = String(v.views || '').replace(/^觀看次數：/, '');
          return `
            <tr>
              <td class="col-idx">${idx + 1}</td>
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
  `).join('')}

  <div class="footer-note">
    宮崎縣 4 天 3 夜旅遊 WebGIS 自動彙整手冊 · 產出日期 ${todayTaipei} · 收錄 ${videos.length} 部 YouTube 影片與 ${webGuides.length} 篇網頁情報 · https://jaaae.github.io/miyazaki-webgis/
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
console.log(`SUCCESS! Generated PDF: ${outPdfPath}`);
console.log(`Size: ${sizeKB} KB | YouTube: ${videos.length} | Web Guides: ${webGuides.length}`);
