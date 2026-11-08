import * as THREE from 'three';

// Procedural Earth Texture (Continents, Oceans, Swirling Clouds)
export function createEarthTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  // Deep Blue Oceans
  const oceanGrad = ctx.createLinearGradient(0, 0, 0, 256);
  oceanGrad.addColorStop(0, '#0c2340');
  oceanGrad.addColorStop(0.5, '#0284c7');
  oceanGrad.addColorStop(1, '#0c2340');
  ctx.fillStyle = oceanGrad;
  ctx.fillRect(0, 0, 512, 256);

  // Continental Landmasses (Green/Brown)
  ctx.fillStyle = '#16a34a'; // Vibrant biosphere
  const continents = [
    // North America & Greenland
    { x: 90, y: 70, r: 35 },
    { x: 130, y: 55, r: 25 },
    { x: 105, y: 95, r: 20 },
    // South America
    { x: 145, y: 160, r: 32 },
    { x: 155, y: 195, r: 24 },
    // Eurasia
    { x: 280, y: 65, r: 48 },
    { x: 330, y: 75, r: 40 },
    { x: 380, y: 85, r: 38 },
    { x: 250, y: 80, r: 28 },
    // Africa
    { x: 260, y: 135, r: 36 },
    { x: 275, y: 175, r: 26 },
    // Australia
    { x: 410, y: 180, r: 25 },
    // Antarctica
    { x: 256, y: 245, r: 28 },
  ];

  for (const c of continents) {
    ctx.beginPath();
    ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
    ctx.fill();

    // Desert/Arid patches
    ctx.fillStyle = '#b45309';
    ctx.beginPath();
    ctx.arc(c.x + 8, c.y - 4, c.r * 0.45, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#16a34a';
  }

  // Polar ice caps (North & South)
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, 512, 16);
  ctx.fillRect(0, 240, 512, 16);

  // Swirling Atmospheric Cloud Bands
  ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
  for (let i = 0; i < 28; i++) {
    const cy = 30 + Math.random() * 196;
    const cx = Math.random() * 512;
    const w = 40 + Math.random() * 80;
    const h = 10 + Math.random() * 20;

    ctx.beginPath();
    ctx.ellipse(cx, cy, w, h, (Math.random() - 0.5) * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// Procedural Mars Globe Texture (Rust Red, Basalt Maria, Ice Cap)
export function createMarsGlobeTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  // Base Martian Iron Rust Red
  const marsGrad = ctx.createLinearGradient(0, 0, 0, 256);
  marsGrad.addColorStop(0, '#991b1b');
  marsGrad.addColorStop(0.5, '#ea580c');
  marsGrad.addColorStop(1, '#7f1d1d');
  ctx.fillStyle = marsGrad;
  ctx.fillRect(0, 0, 512, 256);

  // Dark Basalt Lowlands (Syrtis Major, Acidalia Planitia, Sinus Meridiani)
  ctx.fillStyle = 'rgba(67, 20, 7, 0.65)';
  const maria = [
    { x: 120, y: 110, rx: 45, ry: 25 },
    { x: 260, y: 130, rx: 55, ry: 35 },
    { x: 380, y: 100, rx: 60, ry: 30 },
    { x: 310, y: 170, rx: 35, ry: 20 },
    { x: 80, y: 160, rx: 40, ry: 22 },
  ];
  for (const m of maria) {
    ctx.beginPath();
    ctx.ellipse(m.x, m.y, m.rx, m.ry, 0.2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Craters & Highland Texture
  for (let i = 0; i < 40; i++) {
    const cx = Math.random() * 512;
    const cy = 30 + Math.random() * 196;
    const cr = Math.random() * 8 + 3;

    ctx.strokeStyle = 'rgba(254, 215, 170, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, cr, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = 'rgba(67, 20, 7, 0.4)';
    ctx.beginPath();
    ctx.arc(cx, cy, cr * 0.7, 0, Math.PI * 2);
    ctx.fill();
  }

  // Brilliant North & South Polar Carbon Dioxide / Water Ice Caps
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(256, 12, 65, 12, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.ellipse(256, 244, 55, 10, 0, 0, Math.PI * 2);
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// Procedural Moon Texture (Grey Regolith & Basalt Craters)
export function createMoonTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#94a3b8';
  ctx.fillRect(0, 0, 256, 128);

  ctx.fillStyle = '#475569';
  // Lunar Mare
  ctx.beginPath();
  ctx.arc(80, 50, 24, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(140, 65, 28, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(180, 45, 18, 0, Math.PI * 2);
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// Procedural Sun Radiant Flare Texture
export function createSunFlareTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  const cx = 128;
  const cy = 128;

  const grad = ctx.createRadialGradient(cx, cy, 4, cx, cy, 128);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.15, '#fef08a');
  grad.addColorStop(0.35, '#f59e0b');
  grad.addColorStop(0.65, '#ea580c');
  grad.addColorStop(1, 'rgba(124, 45, 18, 0)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);

  // Solar coronal ray spikes
  ctx.strokeStyle = 'rgba(254, 240, 138, 0.25)';
  ctx.lineWidth = 2;
  for (let r = 0; r < 8; r++) {
    const angle = (r * Math.PI) / 4;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(angle) * 110, cy + Math.sin(angle) * 110);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// Procedural Particle Texture for Ion Engine Plume Stream
export function createParticleTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.3, '#38bdf8');
  grad.addColorStop(0.7, '#0284c7');
  grad.addColorStop(1, 'rgba(2, 132, 199, 0)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// Realistic descriptive building actions for each pod type
export const POD_CONSTRUCTION_ACTIONS: Record<string, string> = {
  living_pod: 'Welding structural Kevlar bulkhead & pressurizing crew berthing quarters...',
  oxygen_pod: 'Aligning Solid Oxide Electrolysis (SOXE) catalytic stack & vacuum seals...',
  water_pod: 'Calibrating Vapor Compression Distillation loop & catalytic greywater filters...',
  airlock_pod: 'Pressurizing dual-chamber egress lock & electrostatic dust repelling seals...',
  emergency_shelter_pod: 'Sintering 2-meter regolith overpack shielding & borated water-wall sandwich...',
  power_generation_pod: 'Coupling low-enriched U-235 sodium heat pipes & closed Stirling generator...',
  nuclear_power_pod: 'Installing FSP nuclear fission reactor core & automated beryllium safety rods...',
  solar_power_pod: 'Deploying dual ultra-flex photovoltaic solar wings & sun-tracking gimbals...',
  greenhouse_pod: 'Germinating aeroponic microgreen bio-beds & calibrating LED spectrum ballast...',
  rover_garage_pod: 'Anchoring maintenance hydraulic ramps & calibrating Ingenuity helipad...',
  comm_pod: 'Aligning 3.5m Ka-band high-gain antenna & 1550nm DSOC laser transceiver...',
  medical_pod: 'Sterilizing autonomous trauma suite, surgery robotic arm & telemetry bio-monitors...',
  waste_mgmt_pod: 'Initializing pyrolytic bio-waste reactor & methane gas recovery...',
  storage_pod: 'Securing high-density Cargo Transfer Bag (CTB) modular racks...',
  battery_storage_pod: 'Charging lithium-sulfur energy storage cells & power distribution bus...',
  research_lab_pod: 'Calibrating mass spectrometer, gas chromatograph & cleanroom air filtration...',
  geology_lab_pod: 'Installing drill core analyzers, rock crushers & X-ray diffraction scanner...',
  observatory_pod: 'Mounting 1.2m optical reflector telescope & atmospheric seeing sensors...',
};

export function getPodActionText(podId: string, podName: string): string {
  if (POD_CONSTRUCTION_ACTIONS[podId]) {
    return POD_CONSTRUCTION_ACTIONS[podId];
  }
  return `Welding structural anchors and calibrating telemetry for ${podName}...`;
}
