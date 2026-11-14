import { MarsLandingSite } from '../types';

export const PRESET_MARS_SITES: MarsLandingSite[] = [
  {
    id: 'jezero_crater',
    name: 'Jezero Crater',
    region: 'Isidis Planitia Rim',
    lat: 18.38,
    lon: 77.58,
    solarMultiplier: 1.06,
    iceDepositBonus: 8,
    avgTempC: -56,
    dustRisk: 'Moderate',
    terrainTintHex: '#944027',
    description: 'Ancient river delta basin rich in clay minerals and steady equatorial solar exposure.',
  },
  {
    id: 'arcadia_planitia',
    name: 'Arcadia Planitia',
    region: 'Northern Lowlands',
    lat: 46.7,
    lon: -172.0,
    solarMultiplier: 0.92,
    iceDepositBonus: 24,
    avgTempC: -68,
    dustRisk: 'Low',
    terrainTintHex: '#8d4834',
    description: 'Smooth volcanic plain holding vast shallow sheets of buried water ice ideal for ISRU.',
  },
  {
    id: 'valles_marineris',
    name: 'Valles Marineris',
    region: 'Coprates Chasma',
    lat: -13.9,
    lon: -59.2,
    solarMultiplier: 1.08,
    iceDepositBonus: 6,
    avgTempC: -49,
    dustRisk: 'High',
    terrainTintHex: '#7e331f',
    description: 'Deep equatorial canyon with higher surface air pressure and strong midday thermal warmth.',
  },
  {
    id: 'olympus_rupes',
    name: 'Olympus Rupes',
    region: 'Tharsis Volcanic Province',
    lat: 18.65,
    lon: -133.8,
    solarMultiplier: 1.12,
    iceDepositBonus: 4,
    avgTempC: -61,
    dustRisk: 'Low',
    terrainTintHex: '#823b2c',
    description: 'High-altitude basaltic flank rising above regional dust haze with peak solar yield.',
  },
  {
    id: 'hellas_basin',
    name: 'Hellas Planitia',
    region: 'Southern Highlands',
    lat: -42.4,
    lon: 70.5,
    solarMultiplier: 0.94,
    iceDepositBonus: 16,
    avgTempC: -64,
    dustRisk: 'High',
    terrainTintHex: '#9c4b2e',
    description: 'Giant impact basin offering natural atmospheric depth and glacial ice aprons.',
  },
  {
    id: 'gale_crater',
    name: 'Gale Crater',
    region: 'Aeolis Mons Foothills',
    lat: -5.4,
    lon: 137.8,
    solarMultiplier: 1.05,
    iceDepositBonus: 10,
    avgTempC: -53,
    dustRisk: 'Moderate',
    terrainTintHex: '#8f4428',
    description: 'Layered sedimentary basin with sheltered crater walls and proven hydrated sulfates.',
  },
];

export const DEFAULT_MARS_SITE: MarsLandingSite = PRESET_MARS_SITES[0];

export function formatMarsCoordinates(lat: number, lon: number): string {
  const latStr = `${Math.abs(lat).toFixed(1)}°${lat >= 0 ? 'N' : 'S'}`;
  const lonStr = `${Math.abs(lon).toFixed(1)}°${lon >= 0 ? 'E' : 'W'}`;
  return `${latStr} · ${lonStr}`;
}

export function deriveLandingSiteFromLatLon(lat: number, lon: number): MarsLandingSite {
  // Check if click is close to any named preset landmark (within ~9 degrees great-circle)
  for (const site of PRESET_MARS_SITES) {
    const dLat = lat - site.lat;
    let dLon = Math.abs(lon - site.lon);
    if (dLon > 180) dLon = 360 - dLon;
    if (Math.hypot(dLat, dLon) < 9.5) {
      return site;
    }
  }

  const absLat = Math.abs(lat);
  const clampedLat = Math.max(-88, Math.min(88, Math.round(lat * 10) / 10));
  const clampedLon = Math.max(-180, Math.min(180, Math.round(lon * 10) / 10));

  let name = 'Elysium Planitia';
  let region = 'Equatorial Plains';
  let terrainTintHex = '#8d3b24';

  if (absLat > 65) {
    name = clampedLat > 0 ? 'Planum Boreum' : 'Planum Australe';
    region = clampedLat > 0 ? 'North Polar Cap Margin' : 'South Polar Ice Rim';
    terrainTintHex = '#9e5d4c';
  } else if (clampedLat > 25 && clampedLon < -40) {
    name = 'Acidalia Planitia';
    region = 'Northern Basalt Basin';
    terrainTintHex = '#743627';
  } else if (clampedLat > 20 && clampedLon >= -40 && clampedLon < 85) {
    name = 'Utopia Planitia';
    region = 'Northern Lowlands';
    terrainTintHex = '#8d432a';
  } else if (clampedLat > 0 && clampedLon >= 85) {
    name = 'Amazonis Mensa';
    region = 'Volcanic Floodplain';
    terrainTintHex = '#9b4a2c';
  } else if (clampedLat <= 0 && clampedLon < -30) {
    name = 'Tharsis Highlands';
    region = 'Southern Shield Ridge';
    terrainTintHex = '#7e3220';
  } else if (clampedLat <= 0 && clampedLon >= -30 && clampedLon < 70) {
    name = 'Noachis Terra';
    region = 'Ancient Cratered Highlands';
    terrainTintHex = '#863b25';
  } else {
    name = 'Terra Sabaea';
    region = 'Eastern Highland Plateau';
    terrainTintHex = '#924229';
  }

  // Physics-derived environmental parameters from Martian latitude
  const solarMultiplier = Math.round(Math.max(0.68, 1.1 - (absLat / 90) * 0.42) * 100) / 100;
  const iceDepositBonus = Math.round(4 + Math.pow(absLat / 90, 1.35) * 30);
  const avgTempC = Math.round(-49 - (absLat / 90) * 44);
  const dustRisk: MarsLandingSite['dustRisk'] =
    absLat < 30 ? 'Moderate' : absLat < 55 ? 'Low' : 'High';

  const description =
    absLat > 50
      ? 'High-latitude site rich in subsurface water ice with reduced winter solar angles.'
      : absLat < 22
      ? 'Sun-rich equatorial plateau suited for continuous photovoltaic and thermal efficiency.'
      : 'Balanced mid-latitude regolith offering accessible ground ice and moderate solar gain.';

  return {
    id: `custom_${clampedLat.toFixed(1)}_${clampedLon.toFixed(1)}`,
    name,
    region,
    lat: clampedLat,
    lon: clampedLon,
    solarMultiplier,
    iceDepositBonus,
    avgTempC,
    dustRisk,
    terrainTintHex,
    description,
  };
}
