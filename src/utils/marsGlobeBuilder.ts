import * as THREE from 'three';

/**
 * Deterministic 3D spherical value noise & Mars geological feature heightfield.
 * Computes seamless 2048x1024 equirectangular albedo, tangent-space normal map,
 * roughness map, and true 3D vertex displacement for authentic orbital Mars views.
 */

function fract(x: number): number {
  return x - Math.floor(x);
}

function hash3(ix: number, iy: number, iz: number): number {
  const n = Math.sin(ix * 127.1 + iy * 311.7 + iz * 74.7) * 43758.5453123;
  return fract(n);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function smooth(t: number): number {
  return t * t * (3 - 2 * t);
}

function noise3D(x: number, y: number, z: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const iz = Math.floor(z);

  const fx = smooth(x - ix);
  const fy = smooth(y - iy);
  const fz = smooth(z - iz);

  const n000 = hash3(ix, iy, iz);
  const n100 = hash3(ix + 1, iy, iz);
  const n010 = hash3(ix, iy + 1, iz);
  const n110 = hash3(ix + 1, iy + 1, iz);
  const n001 = hash3(ix, iy, iz + 1);
  const n101 = hash3(ix + 1, iy, iz + 1);
  const n011 = hash3(ix, iy + 1, iz + 1);
  const n111 = hash3(ix + 1, iy + 1, iz + 1);

  const nx00 = lerp(n000, n100, fx);
  const nx10 = lerp(n010, n110, fx);
  const nx01 = lerp(n001, n101, fx);
  const nx11 = lerp(n011, n111, fx);

  const nxy0 = lerp(nx00, nx10, fy);
  const nxy1 = lerp(nx01, nx11, fy);

  return lerp(nxy0, nxy1, fz);
}

function fbm3D(x: number, y: number, z: number, octaves = 5): number {
  let value = 0;
  let amp = 0.5;
  let freq = 1.0;
  for (let i = 0; i < octaves; i++) {
    value += amp * noise3D(x * freq, y * freq, z * freq);
    freq *= 2.04;
    amp *= 0.5;
  }
  return value;
}

function angularDistDeg(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const cosD =
    Math.sin(phi1) * Math.sin(phi2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.cos(dLon);
  return (Math.acos(Math.max(-1, Math.min(1, cosD))) * 180) / Math.PI;
}

interface MarsCrater {
  nx: number;
  ny: number;
  nz: number;
  angRad: number;
  depth: number;
}

// Deterministic multi-scale impact craters distributed on unit sphere
const MARS_CRATERS: MarsCrater[] = (() => {
  const list: MarsCrater[] = [];
  for (let i = 0; i < 165; i++) {
    const u = fract(Math.sin(i * 19.31 + 0.7) * 43758.5453);
    const v = fract(Math.sin(i * 73.17 + 1.9) * 29431.1327);
    const theta = u * Math.PI * 2;
    const phi = Math.acos(2 * v - 1);
    const rScale = fract(Math.sin(i * 41.93) * 19283.71);
    const isMajor = i < 22;
    const angRad = isMajor ? 0.045 + rScale * 0.065 : 0.012 + rScale * 0.028;
    list.push({
      nx: Math.sin(phi) * Math.cos(theta),
      ny: Math.cos(phi),
      nz: Math.sin(phi) * Math.sin(theta),
      angRad,
      depth: isMajor ? 0.14 + rScale * 0.1 : 0.06 + rScale * 0.06,
    });
  }
  return list;
})();

/**
 * Evaluates normalized Mars elevation in [-1.0, +1.0] and geological masks
 * for a given unit-sphere direction (nx, ny, nz) and latitude/longitude.
 */
export function sampleMarsGeology(
  nx: number,
  ny: number,
  nz: number,
  latDeg: number,
  lonDeg: number
): {
  elevation: number;
  darkBasalt: number;
  dustSheet: number;
  iceCover: number;
  canyonMask: number;
} {
  // Base continental fBM (hemispheric dichotomy: lower northern plains vs cratered southern highlands)
  const dichotomy = latDeg > 18 ? -0.22 * Math.min(1, (latDeg - 18) / 35) : 0.12 * Math.min(1, (18 - latDeg) / 40);
  const macroNoise = fbm3D(nx * 2.4 + 3.1, ny * 2.4 - 1.7, nz * 2.4 + 0.8, 5) - 0.5;
  const mesoNoise = fbm3D(nx * 7.5 - 2.3, ny * 7.5 + 4.2, nz * 7.5 - 1.1, 4) - 0.5;
  const microDetail = fbm3D(nx * 22.0, ny * 22.0, nz * 22.0, 3) - 0.5;

  let elevation = dichotomy + macroNoise * 0.52 + mesoNoise * 0.22 + microDetail * 0.09;

  // Tharsis bulge + Olympus Mons (18.65N, -133.8E) + Tharsis Montes triad
  const tharsisDist = angularDistDeg(latDeg, lonDeg, 4, -108);
  if (tharsisDist < 48) {
    elevation += 0.34 * Math.pow(1 - tharsisDist / 48, 1.6);
  }

  const volcanoes = [
    { lat: 18.65, lon: -133.8, rad: 9.5, height: 0.72, caldera: 1.8 }, // Olympus Mons
    { lat: 11.8, lon: -104.1, rad: 6.0, height: 0.48, caldera: 1.1 }, // Ascraeus Mons
    { lat: 1.5, lon: -112.9, rad: 5.5, height: 0.42, caldera: 1.0 },  // Pavonis Mons
    { lat: -8.3, lon: -120.1, rad: 6.2, height: 0.46, caldera: 1.3 }, // Arsia Mons
    { lat: 25.0, lon: 147.2, rad: 6.5, height: 0.38, caldera: 1.0 },  // Elysium Mons
  ];
  for (const v of volcanoes) {
    const d = angularDistDeg(latDeg, lonDeg, v.lat, v.lon);
    if (d < v.rad) {
      const slope = Math.pow(1 - d / v.rad, 1.45);
      elevation += v.height * slope;
      if (d < v.caldera) {
        elevation -= 0.14 * (1 - d / v.caldera);
      }
    }
  }

  // Hellas Planitia (-42.4S, 70.5E) & Argyre Planitia (-49.7S, -44.0E) impact basins
  const hellasD = angularDistDeg(latDeg, lonDeg, -42.4, 70.5);
  if (hellasD < 26) {
    const k = 1 - hellasD / 26;
    elevation -= 0.58 * Math.pow(k, 1.3);
    if (hellasD > 19) elevation += 0.1 * Math.sin(((hellasD - 19) / 7) * Math.PI);
  }
  const argyreD = angularDistDeg(latDeg, lonDeg, -49.7, -44.0);
  if (argyreD < 15) {
    elevation -= 0.36 * Math.pow(1 - argyreD / 15, 1.4);
  }

  // Valles Marineris giant rift canyon (-13.9S, -92W to -40W)
  let canyonMask = 0;
  if (lonDeg > -98 && lonDeg < -34 && latDeg > -24 && latDeg < 2) {
    const t = (lonDeg - -96) / 60;
    const centerLat = -6.5 - Math.sin(t * Math.PI * 0.85) * 8.2 + (mesoNoise * 2.4);
    const width = 3.2 + Math.sin(t * Math.PI) * 3.0;
    const dLat = Math.abs(latDeg - centerLat);
    if (dLat < width) {
      const wall = Math.pow(1 - dLat / width, 1.4);
      const endFade = Math.sin(Math.max(0, Math.min(1, t)) * Math.PI);
      canyonMask = wall * endFade;
      elevation -= 0.62 * canyonMask;
    }
  }

  // Impact crater rims & bowls
  for (let i = 0; i < MARS_CRATERS.length; i++) {
    const c = MARS_CRATERS[i];
    const dot = nx * c.nx + ny * c.ny + nz * c.nz;
    if (dot < 0.985) continue;
    const ang = Math.acos(Math.min(1, dot));
    if (ang < c.angRad * 1.35) {
      const r = ang / c.angRad;
      if (r < 0.82) {
        elevation -= c.depth * (1 - (r / 0.82) * (r / 0.82));
      } else {
        const rimT = (r - 0.82) / 0.53;
        elevation += c.depth * 0.32 * Math.sin(rimT * Math.PI);
      }
    }
  }

  // Dark basaltic sand sheets (Syrtis Major, Acidalia, Margaritifer, Mare Erythraeum)
  let darkBasalt = 0;
  const basaltRegions = [
    { lat: 10, lon: 68, rad: 22, str: 0.9 },   // Syrtis Major
    { lat: 46, lon: -24, rad: 28, str: 0.72 }, // Acidalia Planitia
    { lat: -22, lon: -36, rad: 30, str: 0.65 },// Mare Erythraeum
    { lat: -15, lon: 15, rad: 24, str: 0.55 }, // Sabaeus / Meridiani
    { lat: -24, lon: 135, rad: 24, str: 0.52 },// Mare Tyrrhenum / Cimmerium
  ];
  for (const r of basaltRegions) {
    const d = angularDistDeg(latDeg, lonDeg, r.lat, r.lon);
    if (d < r.rad) {
      const w = (1 - d / r.rad) * (0.7 + macroNoise * 0.6);
      darkBasalt = Math.max(darkBasalt, Math.min(1, w * r.str));
    }
  }
  darkBasalt = Math.max(0, Math.min(1, darkBasalt + (mesoNoise < -0.14 ? 0.22 : 0)));

  // Bright iron-oxide dust plains (Tharsis, Arabia Terra, Hellas, Elysium)
  let dustSheet = Math.max(0, Math.min(1, 0.45 + macroNoise * 0.65 - darkBasalt * 0.5));
  if (hellasD < 22) dustSheet = Math.min(1, dustSheet + 0.35);

  // Polar CO2 & Water Ice Caps with spiral Chasma Boreale troughs
  const absLat = Math.abs(latDeg);
  const spiral = Math.sin((lonDeg * Math.PI) / 180 * 3 + (90 - absLat) * 0.9) * 2.2;
  const capLimit = latDeg > 0 ? 79.5 : 81.5;
  const iceNoise = mesoNoise * 3.8 + spiral;
  let iceCover = 0;
  if (absLat + iceNoise > capLimit) {
    iceCover = Math.min(1, (absLat + iceNoise - capLimit) / 4.5);
  }

  return { elevation, darkBasalt, dustSheet, iceCover, canyonMask };
}

export interface MarsGlobeMaps {
  albedo: THREE.CanvasTexture;
  normal: THREE.CanvasTexture;
  roughness: THREE.CanvasTexture;
  geometry: THREE.BufferGeometry;
}

let cachedMarsGlobe: MarsGlobeMaps | null = null;

/**
 * Generates high-resolution 1024x512 (clean & fast, crisp with anisotropy)
 * NASA-inspired Mars albedo, tangent normal map, roughness map, and 3D displaced sphere.
 */
export function getOrCreateMarsGlobeAssets(maxAnisotropy = 4): MarsGlobeMaps {
  if (cachedMarsGlobe) return cachedMarsGlobe;

  const w = 1024;
  const h = 512;

  const albedoCanvas = document.createElement('canvas');
  albedoCanvas.width = w;
  albedoCanvas.height = h;
  const aCtx = albedoCanvas.getContext('2d')!;
  const aImg = aCtx.createImageData(w, h);

  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = w;
  roughCanvas.height = h;
  const rCtx = roughCanvas.getContext('2d')!;
  const rImg = rCtx.createImageData(w, h);

  const normalCanvas = document.createElement('canvas');
  normalCanvas.width = w;
  normalCanvas.height = h;
  const nCtx = normalCanvas.getContext('2d')!;
  const nImg = nCtx.createImageData(w, h);

  const elevGrid = new Float32Array(w * h);

  for (let py = 0; py < h; py++) {
    const v = py / (h - 1);
    const phi = v * Math.PI;
    const latDeg = 90 - v * 180;
    const sinPhi = Math.sin(phi);
    const cosPhi = Math.cos(phi);

    for (let px = 0; px < w; px++) {
      const u = px / (w - 1);
      const theta = u * Math.PI * 2;
      const lonDeg = u * 360 - 180;

      // Match Three.js SphereGeometry coordinate convention
      const nx = -sinPhi * Math.cos(theta);
      const ny = cosPhi;
      const nz = sinPhi * Math.sin(theta);

      const g = sampleMarsGeology(nx, ny, nz, latDeg, lonDeg);
      const idx = py * w + px;
      elevGrid[idx] = g.elevation;

      // Base oxidized regolith palette (Viking / MRO natural color calibration)
      let r = 178 + g.dustSheet * 34 - g.darkBasalt * 86 + g.elevation * 22;
      let gr = 86 + g.dustSheet * 32 - g.darkBasalt * 44 + g.elevation * 14;
      let b = 52 + g.dustSheet * 20 - g.darkBasalt * 22 + g.elevation * 9;

      // Valles Marineris deep shadowed chasma walls
      if (g.canyonMask > 0.05) {
        r -= g.canyonMask * 44;
        gr -= g.canyonMask * 28;
        b -= g.canyonMask * 16;
      }

      // Frosty polar CO2/H2O ice blend
      if (g.iceCover > 0) {
        r = lerp(r, 236, g.iceCover);
        gr = lerp(gr, 230, g.iceCover);
        b = lerp(b, 226, g.iceCover);
      }

      const p4 = idx * 4;
      aImg.data[p4] = Math.max(0, Math.min(255, Math.round(r)));
      aImg.data[p4 + 1] = Math.max(0, Math.min(255, Math.round(gr)));
      aImg.data[p4 + 2] = Math.max(0, Math.min(255, Math.round(b)));
      aImg.data[p4 + 3] = 255;

      // Roughness: polar ice is noticeably smoother (0.48) than matte regolith (0.88-0.96)
      const roughVal = Math.round(lerp(228 - g.darkBasalt * 18, 118, g.iceCover));
      rImg.data[p4] = roughVal;
      rImg.data[p4 + 1] = roughVal;
      rImg.data[p4 + 2] = roughVal;
      rImg.data[p4 + 3] = 255;
    }
  }

  // Sobel Tangent-Space Normal Map from the exact heightfield
  const strength = 5.4;
  for (let py = 0; py < h; py++) {
    const yPrev = Math.max(0, py - 1);
    const yNext = Math.min(h - 1, py + 1);
    for (let px = 0; px < w; px++) {
      const xPrev = (px - 1 + w) % w;
      const xNext = (px + 1) % w;

      const dX = (elevGrid[py * w + xNext] - elevGrid[py * w + xPrev]) * strength;
      const dY = (elevGrid[yNext * w + px] - elevGrid[yPrev * w + px]) * strength;

      const invLen = 1 / Math.sqrt(dX * dX + dY * dY + 1);
      const p4 = (py * w + px) * 4;
      nImg.data[p4] = Math.round((-dX * invLen * 0.5 + 0.5) * 255);
      nImg.data[p4 + 1] = Math.round((-dY * invLen * 0.5 + 0.5) * 255);
      nImg.data[p4 + 2] = Math.round((invLen * 0.5 + 0.5) * 255);
      nImg.data[p4 + 3] = 255;
    }
  }

  aCtx.putImageData(aImg, 0, 0);
  rCtx.putImageData(rImg, 0, 0);
  nCtx.putImageData(nImg, 0, 0);

  const albedo = new THREE.CanvasTexture(albedoCanvas);
  albedo.colorSpace = THREE.SRGBColorSpace;
  albedo.anisotropy = maxAnisotropy;
  albedo.wrapS = THREE.RepeatWrapping;
  albedo.wrapT = THREE.ClampToEdgeWrapping;

  const normal = new THREE.CanvasTexture(normalCanvas);
  normal.anisotropy = maxAnisotropy;
  normal.wrapS = THREE.RepeatWrapping;
  normal.wrapT = THREE.ClampToEdgeWrapping;

  const roughness = new THREE.CanvasTexture(roughCanvas);
  roughness.anisotropy = maxAnisotropy;
  roughness.wrapS = THREE.RepeatWrapping;
  roughness.wrapT = THREE.ClampToEdgeWrapping;

  // True 3D vertex-displaced SphereGeometry (so Olympus Mons, Tharsis, Hellas, & Valles Marineris have real 3D relief)
  const geometry = new THREE.SphereGeometry(2.0, 112, 84);
  const posAttr = geometry.attributes.position;
  const uvAttr = geometry.attributes.uv;
  const vPos = new THREE.Vector3();

  for (let i = 0; i < posAttr.count; i++) {
    vPos.fromBufferAttribute(posAttr, i);
    const u = THREE.MathUtils.clamp(uvAttr.getX(i), 0, 1);
    const v = 1 - THREE.MathUtils.clamp(uvAttr.getY(i), 0, 1);
    const px = Math.min(w - 1, Math.round(u * (w - 1)));
    const py = Math.min(h - 1, Math.round(v * (h - 1)));
    const elev = elevGrid[py * w + px];
    const disp = 2.0 + elev * 0.042;
    vPos.normalize().multiplyScalar(disp);
    posAttr.setXYZ(i, vPos.x, vPos.y, vPos.z);
  }
  geometry.computeVertexNormals();
  geometry.computeTangents();

  cachedMarsGlobe = { albedo, normal, roughness, geometry };
  return cachedMarsGlobe;
}
