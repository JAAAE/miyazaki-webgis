# 宮崎縣 4 天 3 夜實際路網 WebGIS

🌐 **線上瀏覽（GitHub Pages）**：[https://jaaae.github.io/miyazaki-webgis/](https://jaaae.github.io/miyazaki-webgis/)

單一 HTML 互動式旅遊 WebGIS 專案，整合全宮崎縣五大分區 4 天 3 夜環縣自駕行程、OSRM 實際公路路網、9 款專業底圖、18 處實測停車場攻略與 405 部宮崎旅遊 YouTube 影片資料庫。

## 目錄結構

```text
miyazaki-webgis/
├── index.html                  # 建置完成的單一 HTML WebGIS（GitHub Pages 首頁）
├── package.json                # 建置與資料擷取指令
├── data/
│   ├── osrm_routes.json        # OSRM 實際道路路網軌跡（2,158 節點・總長 686 km）
│   ├── yt_videos_clean.json    # 實測宮崎旅遊・購物・伴手禮 YouTube 影片資料集（每日增量更新）
│   └── web_guides.json         # 宮崎旅遊・購物商圈・必買伴手禮網頁攻略情報（每日增量更新）
└── scripts/
    ├── build_webgis.js         # 讀取 data/ 並建置 index.html
    ├── fetch_osrm_routes.js    # 向 OSRM 重新抓取 4 日實際道路軌跡
    └── fetch_yt.js             # 增量擷取並自動去重分類宮崎 YouTube 影片資料
```

## 快速使用

- **直接瀏覽**：以瀏覽器開啟 `index.html`，或透過 GitHub Pages 網址線上瀏覽。
- **修改後重新建置**（無需安裝任何第三方套件，僅需 Node.js）：
  ```bash
  npm run build
  ```
- **重新抓取 OSRM 路網**（修改 `scripts/fetch_osrm_routes.js` 停靠點後）：
  ```bash
  npm run fetch:routes
  npm run build
  ```
