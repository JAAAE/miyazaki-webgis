const fs = require('fs');
const path = require('path');
const https = require('https');

// Exact ordered stops for each day matching our All-Miyazaki 4D3N Grand Loop
const dayWaypoints = {
  1: [
    { id: 'd1-1', lat: 31.8728, lng: 131.4417 }, // Miyazaki Airport
    { id: 'd1-2', lat: 31.9385, lng: 131.4235 }, // Miyazaki Jingu
    { id: 'd1-3', lat: 32.1136, lng: 131.3903 }, // Saitobaru
    { id: 'd1-4', lat: 32.3374, lng: 131.6111 }, // Mimitsu
    { id: 'd1-5', lat: 32.4110, lng: 131.6494 }, // Omi Shrine
    { id: 'd1-6', lat: 32.4190, lng: 131.6778 }, // Cruz Sea
    { id: 'd1-7', lat: 32.4254, lng: 131.6843 }, // Umagase
    { id: 'd1-8', lat: 32.5621, lng: 131.6697 }  // Mt Atago / Nobeoka
  ],
  2: [
    { id: 'd1-8', lat: 32.5621, lng: 131.6697 }, // Depart Nobeoka
    { id: 'd2-1', lat: 32.7022, lng: 131.3010 }, // Takachiho Gorge
    { id: 'd2-2', lat: 32.7147, lng: 131.3069 }, // Amaterasu Railway
    { id: 'd2-3', lat: 32.7344, lng: 131.3506 }, // Amanoiwato Shrine parking (road-accessible)
    { id: 'd2-4', lat: 32.0298, lng: 131.1943 }, // Aya Suspension Bridge
    { id: 'd2-5', lat: 31.9156, lng: 131.4225 }  // Tachibana-dori Miyazaki
  ],
  3: [
    { id: 'd2-5', lat: 31.9156, lng: 131.4225 }, // Depart Miyazaki City
    { id: 'd3-1', lat: 31.8008, lng: 131.4692 }, // Aoshima Parking (road-accessible before bridge)
    { id: 'd3-2', lat: 31.7690, lng: 131.4784 }, // Michi-no-Eki Phoenix
    { id: 'd3-3', lat: 31.6615, lng: 131.4588 }, // Sun Messe Nichinan
    { id: 'd3-4', lat: 31.6512, lng: 131.4628 }, // Udo Jingu Parking (road-accessible)
    { id: 'd3-5', lat: 31.6291, lng: 131.3503 }, // Obi Castle Town
    { id: 'd3-6', lat: 31.3675, lng: 131.3457 }, // Cape Toi
    { id: 'd3-stay', lat: 31.7250, lng: 131.0616 } // Overnight Miyakonojo City center
  ],
  4: [
    { id: 'd3-stay', lat: 31.7250, lng: 131.0616 }, // Depart Miyakonojo
    { id: 'd4-1', lat: 31.7611, lng: 130.9872 }, // Sekinoo Falls
    { id: 'd4-2', lat: 31.8427, lng: 130.8786 }, // Takachiho Farm
    { id: 'd4-3', lat: 31.9422, lng: 130.8454 }, // Ebino Plateau
    { id: 'd4-4', lat: 31.9228, lng: 131.4561 }, // AEON MALL Miyazaki
    { id: 'd4-5', lat: 31.8742, lng: 131.4442 }  // Miyazaki Airport
  ]
};

function httpsGetJson(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      agent: false,
      family: 4,
      timeout: 20000,
      headers: { 'User-Agent': 'Miyazaki-WebGIS-Builder/1.0', 'Connection': 'close' }
    }, (res) => {
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
        catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => req.destroy(new Error('Timeout')));
  });
}

// Douglas-Peucker simplification (tolerance in degrees; ~0.00025 deg ≈ 25m preserves road curves!)
function sqSegDist(p, p1, p2) {
  let x = p1[0], y = p1[1], dx = p2[0] - x, dy = p2[1] - y;
  if (dx !== 0 || dy !== 0) {
    const t = ((p[0] - x) * dx + (p[1] - y) * dy) / (dx * dx + dy * dy);
    if (t > 1) { x = p2[0]; y = p2[1]; }
    else if (t > 0) { x += dx * t; y += dy * t; }
  }
  dx = p[0] - x; dy = p[1] - y;
  return dx * dx + dy * dy;
}

function simplifyDP(pts, tol) {
  if (pts.length <= 2) return pts;
  const sqTol = tol * tol;
  const keep = new Uint8Array(pts.length);
  keep[0] = 1; keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [first, last] = stack.pop();
    let maxDist = 0, idx = 0;
    for (let i = first + 1; i < last; i++) {
      const d = sqSegDist(pts[i], pts[first], pts[last]);
      if (d > maxDist) { idx = i; maxDist = d; }
    }
    if (maxDist > sqTol) {
      keep[idx] = 1;
      stack.push([first, idx], [idx, last]);
    }
  }
  const out = [];
  for (let i = 0; i < pts.length; i++) {
    if (keep[i]) out.push([Number(pts[i][0].toFixed(5)), Number(pts[i][1].toFixed(5))]);
  }
  return out;
}

async function main() {
  const result = {};
  for (const day of [1, 2, 3, 4]) {
    const wps = dayWaypoints[day];
    const coordStr = wps.map(w => `${w.lng},${w.lat}`).join(';');
    const url = `https://router.project-osrm.org/route/v1/driving/${coordStr}?overview=full&geometries=geojson`;
    console.log(`Fetching Day ${day} real road route from OSRM...`);
    const data = await httpsGetJson(url);
    if (data.code !== 'Ok' || !data.routes || !data.routes.length) {
      throw new Error(`OSRM failed for Day ${day}: ${data.code}`);
    }
    const route = data.routes[0];
    // GeoJSON is [lng, lat] -> Leaflet [lat, lng]
    const fullLatLng = route.geometry.coordinates.map(c => [c[1], c[0]]);
    const simplified = simplifyDP(fullLatLng, 0.00022);
    const legs = route.legs.map((leg, i) => ({
      from: wps[i].id,
      to: wps[i + 1].id,
      km: Number((leg.distance / 1000).toFixed(1)),
      min: Math.round(leg.duration / 60)
    }));
    result[day] = {
      distKm: Math.round(route.distance / 1000),
      driveMin: Math.round(route.duration / 60),
      rawPoints: fullLatLng.length,
      points: simplified.length,
      legs,
      coords: simplified
    };
    console.log(`Day ${day}: ${result[day].distKm} km, ${result[day].driveMin} min, raw=${fullLatLng.length} -> simplified=${simplified.length} pts`);
    await new Promise(r => setTimeout(r, 600));
  }
  const dataDir = path.resolve(__dirname, '..', 'data');
  fs.mkdirSync(dataDir, { recursive: true });
  const outPath = path.join(dataDir, 'osrm_routes.json');
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2), 'utf8');
  console.log(`Saved real road network routes to ${outPath}`);
}

main().catch(err => {
  console.error('OSRM ERROR:', err.message);
  process.exit(1);
});
