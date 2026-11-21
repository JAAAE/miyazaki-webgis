# 宮崎縣 4 天 3 夜實際路網 WebGIS

🌐 **線上瀏覽（GitHub Pages）**：[https://jaaae.github.io/miyazaki-webgis/](https://jaaae.github.io/miyazaki-webgis/)

單一 HTML 互動式旅遊 WebGIS 專案，整合全宮崎縣五大分區 4 天 3 夜環縣自駕行程、OSRM 實際公路路網、9 款專業底圖、18 處實測停車場攻略，並透過 **GitHub Actions 雲端排程**每日自動抓取最新宮崎旅遊、購物、伴手禮與美食 YouTube 影片與網頁情報（關機也會持續自動更新）。

## 雲端每日自動迭代（GitHub Actions）

- **排程設定**：`.github/workflows/daily-update.yml`（每天台灣時間早上 **09:00** 自動於 GitHub 雲端執行，不需開啟本機電腦）。
- **自動流程**：
  1. `scripts/fetch_yt.js` — 每日輪播抓取宮崎旅遊、購物、伴手禮、美食 YouTube 新影片並自動去重分類。
  2. `scripts/fetch_web_guides.js` — 每日自動彙整宮崎最新旅遊、購物與伴手禮網頁情報。
  3. `scripts/build_webgis.js` ＋ `scripts/validate_webgis.js` — 自動重建並驗證 `index.html`。
  4. 自動提交推送回 `main` 分支，觸發 GitHub Pages 即時發佈最新網頁。
- **手動立即執行**：隨時可在 GitHub 儲存庫的 **Actions ➔ Daily Miyazaki WebGIS Auto-Iteration ➔ Run workflow** 一鍵觸發。

## 目錄結構

```text
miyazaki-webgis/
├── .github/workflows/
│   └── daily-update.yml        # GitHub Actions 雲端每日排程
├── index.html                  # 建置完成的單一 HTML WebGIS（GitHub Pages 首頁）
├── package.json                # 建置與資料擷取指令
├── data/
│   ├── osrm_routes.json        # OSRM 實際道路路網軌跡（2,158 節點・總長 686 km）
│   ├── yt_videos_clean.json    # 實測宮崎旅遊・購物・伴手禮 YouTube 影片資料集（每日增量更新）
│   └── web_guides.json         # 宮崎旅遊・購物商圈・必買伴手禮網頁攻略情報（每日增量更新）
└── scripts/
    ├── build_webgis.js         # 讀取 data/ 並建置 index.html
    ├── validate_webgis.js      # 驗證 index.html 語法、坐標範圍與資料完整性
    ├── fetch_osrm_routes.js    # 向 OSRM 重新抓取 4 日實際道路軌跡
    ├── fetch_yt.js             # 增量擷取並自動去重分類宮崎 YouTube 影片資料
    └── fetch_web_guides.js     # 增量擷取宮崎旅遊、購物、伴手禮網頁情報
```

## 本地開發與測試（可選）

```bash
npm run build      # 重新建置 index.html
npm run validate   # 驗證產出 HTML
npm run daily      # 在本地完整跑一次每日迭代流程
```
