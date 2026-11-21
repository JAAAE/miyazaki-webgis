const fs = require('fs');
const path = require('path');

const htmlPath = path.resolve(__dirname, '..', 'index.html');
const html = fs.readFileSync(htmlPath, 'utf8');

const scripts = html.match(/<script>([\s\S]*?)<\/script>/g);
if (!scripts || !scripts.length) {
  throw new Error('No inline <script> block found in index.html');
}
const code = scripts[scripts.length - 1].replace(/^<script>|<\/script>$/g, '');
new Function(code);

const data = new Function(
  'window',
  'localStorage',
  code.split('const map =')[0] + '; return {POIS,PARKING_SPOTS,FOOD_SPOTS,SHOP_SPOTS,SPECIALTIES,SOUVENIRS,DAY_ROUTES,YT_VIDEOS,WEB_GUIDES};'
)({}, { getItem: () => null, setItem: () => {} });

const badCoord = [...data.POIS, ...data.PARKING_SPOTS, ...data.FOOD_SPOTS, ...data.SHOP_SPOTS]
  .filter(x => x.lat < 31.3 || x.lat > 32.85 || x.lng < 130.7 || x.lng > 131.85);
const badSpec = data.SPECIALTIES.filter(sp => !data.SHOP_SPOTS.find(s => s.id === sp.shopId));
const badSv = data.SOUVENIRS.filter(sv => !(sv.targetKind === 'shop'
  ? data.SHOP_SPOTS.find(s => s.id === sv.targetId)
  : data.POIS.find(p => p.id === sv.targetId)));
const closeScripts = (html.match(/<\/script>/gi) || []).length;
const legacyTypoCount = (html.match(/座標/g) || []).length;

if (badCoord.length || badSpec.length || badSv.length || closeScripts !== 2 || legacyTypoCount > 0) {
  console.error('VALIDATION FAILED:', { badCoord: badCoord.length, badSpec: badSpec.length, badSv: badSv.length, closeScripts, legacyTypoCount });
  process.exit(1);
}

console.log('VALIDATION OK!', {
  yt: data.YT_VIDEOS.length,
  webGuides: data.WEB_GUIDES.length,
  pois: data.POIS.length,
  parking: data.PARKING_SPOTS.length,
  food: data.FOOD_SPOTS.length,
  shop: data.SHOP_SPOTS.length,
  closeScripts,
  legacyTypoCount
});
