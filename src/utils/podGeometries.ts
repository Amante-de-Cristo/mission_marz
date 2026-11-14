import * as THREE from 'three';
import { PodDefinition } from '../types';

// Shared materials and procedural textures cache
const sharedMaterials = new Map<string, THREE.Material>();
const sharedTextures = new Map<string, THREE.Texture>();

function getOrCreateMaterial<T extends THREE.Material>(key: string, creator: () => T): T {
  if (!sharedMaterials.has(key)) {
    sharedMaterials.set(key, creator());
  }
  return sharedMaterials.get(key) as T;
}

function getOrCreateTexture<T extends THREE.Texture>(key: string, creator: () => T): T {
  if (!sharedTextures.has(key)) {
    sharedTextures.set(key, creator());
  }
  return sharedTextures.get(key) as T;
}

// ==========================================
// PROCEDURAL PBR TEXTURES
// ==========================================

export function createMarsRegolithTexture(maxAnisotropy = 4): THREE.CanvasTexture {
  return getOrCreateTexture('mars_regolith_v3', () => {
    const size = 1024;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#8b3e26';
    ctx.fillRect(0, 0, size, size);

    // Subtle mineral oxidation patches
    for (let i = 0; i < 42; i++) {
      const px = Math.random() * size;
      const py = Math.random() * size;
      const rad = 60 + Math.random() * 140;
      const g = ctx.createRadialGradient(px, py, 8, px, py, rad);
      g.addColorStop(0, i % 2 === 0 ? 'rgba(176, 92, 58, 0.22)' : 'rgba(68, 25, 16, 0.2)');
      g.addColorStop(1, 'rgba(139, 62, 38, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(px - rad, py - rad, rad * 2, rad * 2);
    }

    // Aeolian wind-blown ripples
    for (let y = 10; y < size; y += 22) {
      ctx.strokeStyle = 'rgba(54, 21, 13, 0.14)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(size * 0.28, y + 7, size * 0.68, y - 7, size, y);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(210, 126, 84, 0.09)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, y + 4);
      ctx.bezierCurveTo(size * 0.28, y + 11, size * 0.68, y - 3, size, y + 4);
      ctx.stroke();
    }

    // Basalt gravel, ochre sand grains, and fine dust speckles
    for (let i = 0; i < 16000; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const r = Math.random() * 2.4 + 0.4;
      const tone = Math.random();
      if (tone < 0.25) {
        ctx.fillStyle = 'rgba(58, 23, 16, 0.42)';
      } else if (tone < 0.66) {
        ctx.fillStyle = 'rgba(154, 70, 42, 0.36)';
      } else {
        ctx.fillStyle = 'rgba(212, 124, 86, 0.24)';
      }
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(22, 22);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = maxAnisotropy;
    return texture;
  });
}

export function createMarsBumpTexture(maxAnisotropy = 4): THREE.CanvasTexture {
  return getOrCreateTexture('mars_bump_v3', () => {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, size, size);

    for (let y = 10; y < size; y += 16) {
      ctx.strokeStyle = 'rgba(155, 155, 155, 0.28)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(140, y + 5, 360, y - 5, size, y);
      ctx.stroke();
    }

    for (let i = 0; i < 6500; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const r = Math.random() * 2.6 + 0.5;
      const v = Math.floor(Math.random() * 120 + 70);
      ctx.fillStyle = `rgb(${v},${v},${v})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(22, 22);
    texture.anisotropy = maxAnisotropy;
    return texture;
  });
}

function createHullPanelTexture(): THREE.CanvasTexture {
  return getOrCreateTexture('hull_panel_albedo_v3', () => {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#e7ecf2';
    ctx.fillRect(0, 0, size, size);

    // Subtle tonal panel variation
    ctx.fillStyle = '#dde4ee';
    ctx.fillRect(0, 0, 256, 256);
    ctx.fillRect(256, 256, 256, 256);

    // Subtle Martian lower-edge dust weathering gradient
    const dustGrad = ctx.createLinearGradient(0, size * 0.72, 0, size);
    dustGrad.addColorStop(0, 'rgba(156, 88, 60, 0)');
    dustGrad.addColorStop(1, 'rgba(156, 88, 60, 0.14)');
    ctx.fillStyle = dustGrad;
    ctx.fillRect(0, size * 0.72, size, size * 0.28);

    // Precision aerospace panel seams
    ctx.strokeStyle = '#bac6d6';
    ctx.lineWidth = 2.5;
    for (let x = 0; x <= size; x += 128) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, size);
      ctx.stroke();
    }
    for (let y = 0; y <= size; y += 128) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(size, y);
      ctx.stroke();
    }

    // Access hatch outlines & rivets
    ctx.strokeStyle = '#9aa8ba';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(148, 148, 88, 88);
    ctx.strokeRect(404, 20, 88, 88);

    ctx.fillStyle = '#8b99ac';
    for (let x = 10; x < size; x += 128) {
      for (let y = 10; y < size; y += 128) {
        ctx.fillRect(x, y, 3, 3);
        ctx.fillRect(x + 106, y, 3, 3);
        ctx.fillRect(x, y + 106, 3, 3);
        ctx.fillRect(x + 106, y + 106, 3, 3);
      }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(2, 2);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  });
}

function createHullBumpTexture(): THREE.CanvasTexture {
  return getOrCreateTexture('hull_panel_bump_v3', () => {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#c8c8c8';
    ctx.fillRect(0, 0, size, size);

    ctx.strokeStyle = '#383838';
    ctx.lineWidth = 3;
    for (let i = 0; i <= size; i += 128) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, size);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(size, i);
      ctx.stroke();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(2, 2);
    return tex;
  });
}

function createHexThermalTexture(): THREE.CanvasTexture {
  return getOrCreateTexture('hex_thermal_bump', () => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#999999';
    ctx.fillRect(0, 0, 256, 256);

    ctx.strokeStyle = '#404040';
    ctx.lineWidth = 2;
    const r = 16;
    const dx = r * 1.5;
    const dy = r * Math.sqrt(3);
    for (let row = -1; row < 12; row++) {
      for (let col = -1; col < 14; col++) {
        const cx = col * dx;
        const cy = row * dy + (col % 2 === 0 ? 0 : dy / 2);
        ctx.beginPath();
        for (let k = 0; k < 6; k++) {
          const a = (k * Math.PI) / 3;
          const vx = cx + Math.cos(a) * r;
          const vy = cy + Math.sin(a) * r;
          if (k === 0) ctx.moveTo(vx, vy);
          else ctx.lineTo(vx, vy);
        }
        ctx.closePath();
        ctx.stroke();
      }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(2, 2);
    return tex;
  });
}

function createKaptonBumpTexture(): THREE.CanvasTexture {
  return getOrCreateTexture('kapton_crinkle_bump', () => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, 256, 256);

    for (let i = 0; i < 180; i++) {
      const x1 = Math.random() * 256;
      const y1 = Math.random() * 256;
      const x2 = x1 + (Math.random() - 0.5) * 44;
      const y2 = y1 + (Math.random() - 0.5) * 44;
      const v = Math.random() > 0.5 ? 210 : 50;
      ctx.strokeStyle = `rgba(${v},${v},${v},0.45)`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(2, 2);
    return tex;
  });
}

function createCautionStripeTexture(): THREE.CanvasTexture {
  return getOrCreateTexture('caution_stripe', () => {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(0, 0, 128, 128);
    ctx.fillStyle = '#18181b';
    for (let i = -128; i < 256; i += 32) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + 16, 0);
      ctx.lineTo(i + 144, 128);
      ctx.lineTo(i + 128, 128);
      ctx.closePath();
      ctx.fill();
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(4, 1);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  });
}

function createSolarCellTexture(): THREE.CanvasTexture {
  return getOrCreateTexture('solar_cell_albedo_v3', () => {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#09152c';
    ctx.fillRect(0, 0, size, size);

    ctx.fillStyle = '#112a57';
    for (let x = 6; x < size; x += 64) {
      for (let y = 6; y < size; y += 64) {
        ctx.fillRect(x, y, 52, 52);
        // Fine horizontal silver wafer busbars
        ctx.fillStyle = 'rgba(186, 206, 230, 0.26)';
        ctx.fillRect(x, y + 17, 52, 1.5);
        ctx.fillRect(x, y + 35, 52, 1.5);
        ctx.fillStyle = '#112a57';
      }
    }

    ctx.strokeStyle = '#7b8fa8';
    ctx.lineWidth = 1.5;
    for (let x = 0; x <= size; x += 64) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, size);
      ctx.stroke();
    }
    for (let y = 0; y <= size; y += 64) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(size, y);
      ctx.stroke();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(3, 1);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  });
}

function createRadiatorFinTexture(): THREE.CanvasTexture {
  return getOrCreateTexture('radiator_fins', () => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, 256, 256);
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2;
    for (let x = 16; x < 256; x += 16) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 256);
      ctx.stroke();
    }
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 3;
    for (let y = 64; y < 256; y += 64) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(256, y);
      ctx.stroke();
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  });
}

function createContactShadowTexture(): THREE.CanvasTexture {
  return getOrCreateTexture('contact_shadow', () => {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    const grad = ctx.createRadialGradient(64, 64, 14, 64, 64, 62);
    grad.addColorStop(0, 'rgba(10, 4, 2, 0.56)');
    grad.addColorStop(0.65, 'rgba(10, 4, 2, 0.24)');
    grad.addColorStop(1, 'rgba(10, 4, 2, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  });
}

// ==========================================
// MATERIAL PALETTE
// ==========================================

interface PodMaterialSet {
  hullWhite: THREE.Material;
  hullThermalHex: THREE.Material;
  hullSlate: THREE.Material;
  hullDark: THREE.Material;
  titanium: THREE.Material;
  accent: THREE.Material;
  goldFoil: THREE.Material;
  solar: THREE.Material;
  glass: THREE.Material;
  foliage: THREE.Material;
  interiorGlow: THREE.Material;
  cyanGlow: THREE.Material;
  amberGlow: THREE.Material;
  copper: THREE.Material;
  regolithShield: THREE.Material;
  caution: THREE.Material;
  radiatorWhite: THREE.Material;
}

function getPodMaterials(
  accentHex: string,
  isGhost: boolean,
  isValidPlacement: boolean
): PodMaterialSet {
  if (isGhost) {
    const gColor = isValidPlacement ? 0x34d399 : 0xf43f5e;
    const gMat = new THREE.MeshStandardMaterial({
      color: gColor,
      transparent: true,
      opacity: 0.55,
      roughness: 0.35,
      metalness: 0.15,
      emissive: isValidPlacement ? 0x065f46 : 0x881337,
      emissiveIntensity: 0.35,
    });
    return {
      hullWhite: gMat,
      hullThermalHex: gMat,
      hullSlate: gMat,
      hullDark: gMat,
      titanium: gMat,
      accent: gMat,
      goldFoil: gMat,
      solar: gMat,
      glass: gMat,
      foliage: gMat,
      interiorGlow: gMat,
      cyanGlow: gMat,
      amberGlow: gMat,
      copper: gMat,
      regolithShield: gMat,
      caution: gMat,
      radiatorWhite: gMat,
    };
  }

  const hullTex = createHullPanelTexture();
  const hullBump = createHullBumpTexture();
  const hexBump = createHexThermalTexture();
  const kaptonBump = createKaptonBumpTexture();
  const solarTex = createSolarCellTexture();

  return {
    hullWhite: getOrCreateMaterial('mat_hull_white_v2', () =>
      new THREE.MeshStandardMaterial({
        color: 0xeef2f7,
        map: hullTex,
        bumpMap: hullBump,
        bumpScale: 0.025,
        metalness: 0.2,
        roughness: 0.44,
      })
    ),
    hullThermalHex: getOrCreateMaterial('mat_hull_hex', () =>
      new THREE.MeshStandardMaterial({
        color: 0xdbe3ee,
        bumpMap: hexBump,
        bumpScale: 0.04,
        metalness: 0.14,
        roughness: 0.62,
      })
    ),
    hullSlate: getOrCreateMaterial('mat_hull_slate_v2', () =>
      new THREE.MeshStandardMaterial({
        color: 0x475569,
        bumpMap: hullBump,
        bumpScale: 0.02,
        metalness: 0.62,
        roughness: 0.36,
      })
    ),
    hullDark: getOrCreateMaterial('mat_hull_dark_v2', () =>
      new THREE.MeshStandardMaterial({
        color: 0x1b212b,
        metalness: 0.8,
        roughness: 0.3,
      })
    ),
    titanium: getOrCreateMaterial('mat_titanium_v2', () =>
      new THREE.MeshPhysicalMaterial({
        color: 0x9aa8ba,
        metalness: 0.9,
        roughness: 0.22,
        anisotropy: 0.65,
      })
    ),
    accent: getOrCreateMaterial(`mat_accent_v2_${accentHex}`, () =>
      new THREE.MeshStandardMaterial({
        color: accentHex,
        metalness: 0.32,
        roughness: 0.34,
      })
    ),
    goldFoil: getOrCreateMaterial('mat_gold_foil_v2', () =>
      new THREE.MeshPhysicalMaterial({
        color: 0xd99b26,
        bumpMap: kaptonBump,
        bumpScale: 0.035,
        metalness: 0.94,
        roughness: 0.22,
        clearcoat: 0.45,
      })
    ),
    solar: getOrCreateMaterial('mat_solar_panel_v2', () =>
      new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        map: solarTex,
        metalness: 0.68,
        roughness: 0.12,
        clearcoat: 0.9,
        clearcoatRoughness: 0.08,
      })
    ),
    glass: getOrCreateMaterial('mat_glass_cupola_v3', () =>
      new THREE.MeshPhysicalMaterial({
        color: 0xa8c5da,
        metalness: 0.08,
        roughness: 0.06,
        transparent: true,
        opacity: 0.44,
        clearcoat: 1.0,
        clearcoatRoughness: 0.04,
        ior: 1.5,
        reflectivity: 0.9,
        depthWrite: false,
      })
    ),
    foliage: getOrCreateMaterial('mat_foliage_v2', () =>
      new THREE.MeshStandardMaterial({
        color: 0x16a34a,
        metalness: 0.04,
        roughness: 0.78,
      })
    ),
    interiorGlow: getOrCreateMaterial('mat_interior_warm_v3', () =>
      new THREE.MeshStandardMaterial({
        color: 0xf6e6c2,
        emissive: 0xe6c382,
        emissiveIntensity: 0.24,
        roughness: 0.45,
      })
    ),
    cyanGlow: getOrCreateMaterial('mat_cyan_uv_glow_v3', () =>
      new THREE.MeshStandardMaterial({
        color: 0x9ecae0,
        emissive: 0x387c9e,
        emissiveIntensity: 0.28,
        roughness: 0.3,
      })
    ),
    amberGlow: getOrCreateMaterial('mat_amber_furnace_glow_v3', () =>
      new THREE.MeshStandardMaterial({
        color: 0xe89b5a,
        emissive: 0xc2541d,
        emissiveIntensity: 0.35,
        roughness: 0.35,
      })
    ),
    copper: getOrCreateMaterial('mat_copper_v2', () =>
      new THREE.MeshStandardMaterial({
        color: 0xc86f3c,
        metalness: 0.88,
        roughness: 0.22,
      })
    ),
    regolithShield: getOrCreateMaterial('mat_regolith_shield_v2', () =>
      new THREE.MeshStandardMaterial({
        color: 0x6f3523,
        bumpMap: createMarsBumpTexture(),
        bumpScale: 0.14,
        metalness: 0.05,
        roughness: 0.92,
      })
    ),
    caution: getOrCreateMaterial('mat_caution_stripe', () =>
      new THREE.MeshStandardMaterial({
        map: createCautionStripeTexture(),
        roughness: 0.45,
        metalness: 0.2,
      })
    ),
    radiatorWhite: getOrCreateMaterial('mat_radiator_white', () =>
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: createRadiatorFinTexture(),
        roughness: 0.35,
        metalness: 0.18,
      })
    ),
  };
}

// ==========================================
// SHARED SUB-ASSEMBLIES & FOUNDATIONS
// ==========================================

type BaseStyle = 'octagonal' | 'circular' | 'skid' | 'low_plinth';

function addFoundationPlatform(
  group: THREE.Group,
  mats: PodMaterialSet,
  isGhost: boolean,
  style: BaseStyle = 'octagonal'
) {
  if (!isGhost) {
    const shadowMat = getOrCreateMaterial('mat_contact_shadow', () =>
      new THREE.MeshBasicMaterial({
        map: createContactShadowTexture(),
        transparent: true,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      })
    );
    const shadowDisc = new THREE.Mesh(new THREE.PlaneGeometry(5.9, 5.9), shadowMat);
    shadowDisc.rotation.x = -Math.PI / 2;
    shadowDisc.position.y = 0.025;
    group.add(shadowDisc);
  }

  if (style === 'low_plinth') {
    const slab = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.38, 4.2), mats.hullDark);
    slab.position.y = 0.19;
    slab.castShadow = !isGhost;
    slab.receiveShadow = !isGhost;
    group.add(slab);

    const trim = new THREE.Mesh(new THREE.BoxGeometry(4.52, 0.1, 4.32), mats.hullSlate);
    trim.position.y = 0.42;
    group.add(trim);
    return;
  }

  if (style === 'skid') {
    // Heavy industrial tubular skid beams + corner jack pads
    for (const sx of [-1.75, 1.75]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.34, 4.1), mats.hullDark);
      rail.position.set(sx, 0.25, 0);
      rail.castShadow = !isGhost;
      group.add(rail);

      const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.1, 3.8), mats.caution);
      stripe.position.set(sx, 0.25, 0);
      group.add(stripe);
    }
    for (const sz of [-1.45, 0, 1.45]) {
      const cross = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.24, 0.3), mats.hullSlate);
      cross.position.set(0, 0.36, sz);
      group.add(cross);
    }
    const steelDeck = new THREE.Mesh(new THREE.BoxGeometry(3.85, 0.18, 3.85), mats.hullDark);
    steelDeck.position.y = 0.62;
    steelDeck.castShadow = !isGhost;
    steelDeck.receiveShadow = !isGhost;
    group.add(steelDeck);
    return;
  }

  // Hydraulic leveling footpads + piston sleeves + A-frame struts for octagonal / circular platforms
  const padGeo = new THREE.CylinderGeometry(0.44, 0.6, 0.16, 12);
  const boltGeo = new THREE.CylinderGeometry(0.32, 0.34, 0.06, 8);
  const strutGeo = new THREE.CylinderGeometry(0.085, 0.11, 0.9, 10);
  const sleeveGeo = new THREE.CylinderGeometry(0.145, 0.145, 0.44, 10);
  const collarGeo = new THREE.CylinderGeometry(0.17, 0.17, 0.12, 10);
  const legCoords = [
    [-1.74, -1.74],
    [1.74, -1.74],
    [-1.74, 1.74],
    [1.74, 1.74],
  ];

  for (const [lx, lz] of legCoords) {
    const pad = new THREE.Mesh(padGeo, mats.hullDark);
    pad.position.set(lx, 0.08, lz);
    pad.castShadow = !isGhost;
    pad.receiveShadow = !isGhost;
    group.add(pad);

    const boltPlate = new THREE.Mesh(boltGeo, mats.titanium);
    boltPlate.position.set(lx, 0.17, lz);
    group.add(boltPlate);

    const strut = new THREE.Mesh(strutGeo, mats.titanium);
    strut.position.set(lx * 0.84, 0.52, lz * 0.84);
    strut.rotation.z = lx > 0 ? -0.26 : 0.26;
    strut.rotation.x = lz > 0 ? 0.26 : -0.26;
    strut.castShadow = !isGhost;
    group.add(strut);

    const sleeve = new THREE.Mesh(sleeveGeo, mats.hullSlate);
    sleeve.position.set(lx * 0.88, 0.38, lz * 0.88);
    sleeve.rotation.z = lx > 0 ? -0.26 : 0.26;
    sleeve.rotation.x = lz > 0 ? 0.26 : -0.26;
    group.add(sleeve);

    const collar = new THREE.Mesh(collarGeo, mats.accent);
    collar.position.set(lx * 0.94, 0.22, lz * 0.94);
    group.add(collar);
  }

  const sides = style === 'octagonal' ? 8 : 24;
  const deckGeo = new THREE.CylinderGeometry(2.15, 2.3, 0.36, sides);
  const deck = new THREE.Mesh(deckGeo, mats.hullDark);
  deck.position.y = 0.86;
  deck.castShadow = !isGhost;
  deck.receiveShadow = !isGhost;
  group.add(deck);

  const rimGeo = new THREE.CylinderGeometry(2.24, 2.24, 0.1, sides);
  const rim = new THREE.Mesh(rimGeo, mats.hullSlate);
  rim.position.y = 1.04;
  group.add(rim);

  // Grounded sintered-regolith anchor berm, under-deck utility junction & umbilical copper busways
  if (!isGhost) {
    const berm = new THREE.Mesh(new THREE.CylinderGeometry(2.42, 2.72, 0.14, sides), mats.regolithShield);
    berm.position.y = 0.07;
    berm.receiveShadow = true;
    group.add(berm);
  }
  const jbox = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.44, 0.44), mats.hullSlate);
  jbox.position.set(0, 0.5, 1.56);
  group.add(jbox);

  for (const bx of [-0.18, 0.18]) {
    const bus = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, 1.35, 8), mats.copper);
    bus.rotation.x = Math.PI / 2;
    bus.position.set(bx, 0.62, 0.85);
    group.add(bus);
  }

  // Front grated maintenance step plate
  const stepPlate = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.08, 0.38), mats.titanium);
  stepPlate.position.set(0, 0.42, 2.18);
  group.add(stepPlate);
}

function addAirlockPorts(group: THREE.Group, mats: PodMaterialSet, yHeight = 1.38) {
  const portGeo = new THREE.CylinderGeometry(0.46, 0.48, 0.44, 16);
  const flangeGeo = new THREE.TorusGeometry(0.46, 0.055, 8, 20);
  const gasketGeo = new THREE.TorusGeometry(0.41, 0.03, 6, 16);
  const hatchGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.08, 16);
  const railGeo = new THREE.BoxGeometry(0.52, 0.035, 0.035);

  const dirs = [
    { x: 0, z: 2.08, ry: 0 },
    { x: 0, z: -2.08, ry: Math.PI },
    { x: 2.08, z: 0, ry: Math.PI / 2 },
    { x: -2.08, z: 0, ry: -Math.PI / 2 },
  ];

  for (const d of dirs) {
    const portGroup = new THREE.Group();
    portGroup.position.set(d.x, yHeight, d.z);
    portGroup.rotation.y = d.ry;

    const port = new THREE.Mesh(portGeo, mats.hullSlate);
    port.rotation.x = Math.PI / 2;
    portGroup.add(port);

    const flange = new THREE.Mesh(flangeGeo, mats.hullDark);
    flange.position.z = 0.22;
    portGroup.add(flange);

    const gasket = new THREE.Mesh(gasketGeo, mats.titanium);
    gasket.position.z = 0.24;
    portGroup.add(gasket);

    const accentRing = new THREE.Mesh(new THREE.TorusGeometry(0.39, 0.02, 6, 16), mats.accent);
    accentRing.position.z = 0.25;
    portGroup.add(accentRing);

    const hatch = new THREE.Mesh(hatchGeo, mats.titanium);
    hatch.rotation.x = Math.PI / 2;
    hatch.position.z = 0.18;
    portGroup.add(hatch);

    // Overhead EVA handrail
    const rail = new THREE.Mesh(railGeo, mats.caution);
    rail.position.set(0, 0.56, 0.14);
    portGroup.add(rail);

    group.add(portGroup);
  }
}

function addExternalPipe(
  group: THREE.Group,
  points: THREE.Vector3[],
  radius: number,
  mat: THREE.Material
) {
  const curve = new THREE.CatmullRomCurve3(points);
  const geo = new THREE.TubeGeometry(curve, 16, radius, 8, false);
  const mesh = new THREE.Mesh(geo, mat);
  group.add(mesh);
}

function addRecessedWindows(
  group: THREE.Group,
  count: number,
  radius: number,
  y: number,
  mats: PodMaterialSet,
  w = 0.48,
  h = 0.32
) {
  const frameGeo = new THREE.BoxGeometry(w + 0.08, h + 0.08, 0.08);
  const paneGeo = new THREE.BoxGeometry(w, h, 0.09);
  for (let i = 0; i < count; i++) {
    const angle = (i * Math.PI * 2) / count + Math.PI / count;
    const winGroup = new THREE.Group();
    winGroup.position.set(Math.sin(angle) * radius, y, Math.cos(angle) * radius);
    winGroup.rotation.y = angle;

    const frame = new THREE.Mesh(frameGeo, mats.hullDark);
    const pane = new THREE.Mesh(paneGeo, mats.interiorGlow);
    pane.position.z = 0.01;
    const glassOverlay = new THREE.Mesh(paneGeo, mats.glass);
    glassOverlay.position.z = 0.025;

    winGroup.add(frame, pane, glassOverlay);
    group.add(winGroup);
  }
}

function registerAnimatedPart(
  group: THREE.Group,
  key: 'dishes' | 'spinners' | 'fans' | 'solarTrackers',
  obj: THREE.Object3D
) {
  if (!group.userData[key]) group.userData[key] = [];
  (group.userData[key] as THREE.Object3D[]).push(obj);
}

export interface GantryMotionSpec {
  obj: THREE.Object3D;
  axis: 'x' | 'y' | 'z' | 'rx' | 'ry' | 'rz';
  base: number;
  amp: number;
  speed: number;
}

function registerGantryPart(
  group: THREE.Group,
  obj: THREE.Object3D,
  axis: GantryMotionSpec['axis'],
  base: number,
  amp: number,
  speed: number
) {
  if (!group.userData.gantries) group.userData.gantries = [];
  (group.userData.gantries as GantryMotionSpec[]).push({ obj, axis, base, amp, speed });
}

function addExternalManifold(
  group: THREE.Group,
  mats: PodMaterialSet,
  x: number,
  y: number,
  z: number,
  rotY = 0
) {
  const mGroup = new THREE.Group();
  mGroup.position.set(x, y, z);
  mGroup.rotation.y = rotY;

  const block = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.34, 0.22), mats.hullDark);
  mGroup.add(block);

  for (const vx of [-0.11, 0.11]) {
    const valve = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.08, 10), mats.copper);
    valve.rotation.x = Math.PI / 2;
    valve.position.set(vx, 0.04, 0.13);
    mGroup.add(valve);

    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.45, 8), mats.titanium);
    pipe.position.set(vx, -0.22, 0.03);
    mGroup.add(pipe);
  }

  const gauge = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.05, 12), mats.cyanGlow);
  gauge.rotation.x = Math.PI / 2;
  gauge.position.set(0, 0.1, 0.12);
  mGroup.add(gauge);

  group.add(mGroup);
}

function addRooftopStrobe(group: THREE.Group, mats: PodMaterialSet, x: number, y: number, z: number) {
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, 0.42, 8), mats.titanium);
  mast.position.set(x, y + 0.21, z);
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 8), mats.accent);
  beacon.position.set(x, y + 0.44, z);
  group.add(mast, beacon);
}

// ==========================================
// 1. HABITATS & COMMUNITY (10 DISTINCT DESIGNS)
// ==========================================

function buildLivingTransHab(group: THREE.Group, mats: PodMaterialSet, isGhost: boolean) {
  // Inflatable Kevlar TransHab cylindrical-toroidal silhouette
  const pts = [
    new THREE.Vector2(1.88, 1.06),
    new THREE.Vector2(2.02, 1.55),
    new THREE.Vector2(2.02, 2.25),
    new THREE.Vector2(1.75, 2.75),
    new THREE.Vector2(1.1, 3.05),
    new THREE.Vector2(0.0, 3.12),
  ];
  const hull = new THREE.Mesh(new THREE.LatheGeometry(pts, 28), mats.hullThermalHex);
  hull.castShadow = !isGhost;
  hull.receiveShadow = !isGhost;
  group.add(hull);

  // Horizontal Kevlar restraint straps
  for (const ry of [1.45, 2.35]) {
    const strap = new THREE.Mesh(new THREE.TorusGeometry(2.03, 0.045, 8, 28), mats.hullDark);
    strap.rotation.x = Math.PI / 2;
    strap.position.y = ry;
    group.add(strap);
  }

  // Mission accent band + vertical structural ribs
  const band = new THREE.Mesh(new THREE.CylinderGeometry(2.04, 2.04, 0.14, 28), mats.accent);
  band.position.y = 1.88;
  group.add(band);

  for (let i = 0; i < 6; i++) {
    const angle = (i * Math.PI) / 3;
    const rib = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.55, 0.12), mats.hullSlate);
    rib.position.set(Math.sin(angle) * 2.0, 1.9, Math.cos(angle) * 2.0);
    rib.rotation.y = angle;
    group.add(rib);
  }

  addRecessedWindows(group, 6, 1.99, 2.08, mats, 0.52, 0.34);

  // Rooftop observation cupola & Kapton collar
  const cupolaBase = new THREE.Mesh(new THREE.CylinderGeometry(0.82, 0.92, 0.25, 16), mats.goldFoil);
  cupolaBase.position.y = 3.08;
  group.add(cupolaBase);

  const cupolaGlass = new THREE.Mesh(
    new THREE.SphereGeometry(0.76, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.5),
    mats.glass
  );
  cupolaGlass.position.y = 3.18;
  cupolaGlass.renderOrder = 2;
  group.add(cupolaGlass);

  // Cupola structural window mullions
  for (let m = 0; m < 4; m++) {
    const mullion = new THREE.Mesh(new THREE.TorusGeometry(0.77, 0.025, 6, 16, Math.PI), mats.titanium);
    mullion.rotation.y = (m * Math.PI) / 4;
    mullion.position.y = 3.18;
    group.add(mullion);
  }

  // External ECLSS condenser + oxygen buffer bottles + harness straps + telemetry whip + manifold
  for (const bz of [-0.85, 0.85]) {
    const tank = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.65, 6, 10), mats.titanium);
    tank.position.set(1.75, 1.75, bz);
    group.add(tank);

    const strap = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.022, 6, 12), mats.accent);
    strap.rotation.x = Math.PI / 2;
    strap.position.set(1.75, 1.75, bz);
    group.add(strap);
  }
  const hvac = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.34, 0.62), mats.hullSlate);
  hvac.position.set(-0.9, 2.88, -0.7);
  group.add(hvac);

  const whipMast = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.024, 0.95, 6), mats.titanium);
  whipMast.position.set(-1.1, 3.38, 0.72);
  group.add(whipMast);

  // Rotating rooftop meteorological beacon scanner
  const beaconSpin = new THREE.Group();
  beaconSpin.position.set(0.9, 3.39, 0.7);
  const beaconArm = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.05, 0.06), mats.cyanGlow);
  beaconSpin.add(beaconArm);
  registerAnimatedPart(group, 'spinners', beaconSpin);
  group.add(beaconSpin);

  addExternalManifold(group, mats, -1.85, 1.75, 0, -Math.PI / 2);
  addRooftopStrobe(group, mats, 0.9, 2.95, 0.7);
}

function buildAtriumDome(group: THREE.Group, mats: PodMaterialSet, isGhost: boolean) {
  // Low stone-white perimeter wall
  const baseWall = new THREE.Mesh(new THREE.CylinderGeometry(2.05, 2.12, 0.72, 16), mats.hullWhite);
  baseWall.position.y = 1.42;
  baseWall.castShadow = !isGhost;
  group.add(baseWall);

  const accent = new THREE.Mesh(new THREE.CylinderGeometry(2.09, 2.09, 0.12, 16), mats.accent);
  accent.position.y = 1.65;
  group.add(accent);

  // Interior amphitheater terrace + central greenery planters
  const tier1 = new THREE.Mesh(new THREE.CylinderGeometry(1.55, 1.65, 0.24, 16), mats.hullSlate);
  tier1.position.y = 1.38;
  group.add(tier1);

  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3;
    const bush = new THREE.Mesh(new THREE.DodecahedronGeometry(0.28, 1), mats.foliage);
    bush.position.set(Math.cos(a) * 1.15, 1.72, Math.sin(a) * 1.15);
    group.add(bush);
  }

  const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.3, 1.35, 12), mats.interiorGlow);
  spire.position.y = 2.05;
  group.add(spire);

  // Kinetic solar-shade apex louver ring rotating gently
  const louverCrown = new THREE.Group();
  louverCrown.position.y = 3.74;
  for (let i = 0; i < 6; i++) {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.04, 0.14), mats.titanium);
    fin.rotation.y = (i * Math.PI) / 3;
    fin.position.set(Math.cos((i * Math.PI) / 3) * 0.45, 0, Math.sin((i * Math.PI) / 3) * 0.45);
    louverCrown.add(fin);
  }
  registerAnimatedPart(group, 'spinners', louverCrown);
  group.add(louverCrown);

  // Tall geodesic arch ribs + expansive glass canopy
  for (let i = 0; i < 10; i++) {
    const angle = (i * Math.PI) / 5;
    const ribGroup = new THREE.Group();
    ribGroup.rotation.y = angle;
    const rib = new THREE.Mesh(new THREE.TorusGeometry(2.04, 0.045, 6, 20, Math.PI / 2), mats.titanium);
    rib.position.y = 1.78;
    ribGroup.add(rib);
    group.add(ribGroup);
  }
  const latRing = new THREE.Mesh(new THREE.TorusGeometry(1.44, 0.04, 6, 24), mats.titanium);
  latRing.rotation.x = Math.PI / 2;
  latRing.position.y = 3.22;
  group.add(latRing);

  const domeGlass = new THREE.Mesh(
    new THREE.SphereGeometry(2.02, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.5),
    mats.glass
  );
  domeGlass.position.y = 1.78;
  domeGlass.renderOrder = 2;
  group.add(domeGlass);
}

function buildGalleyHall(group: THREE.Group, mats: PodMaterialSet, isGhost: boolean) {
  // Horizontal elongated rectangular dining hall with beveled roof & exterior patio canopy
  const body = new THREE.Mesh(new THREE.BoxGeometry(3.65, 1.38, 2.75), mats.hullWhite);
  body.position.y = 1.75;
  body.castShadow = !isGhost;
  group.add(body);

  const roof = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.35, 2.4), mats.hullSlate);
  roof.position.y = 2.6;
  group.add(roof);

  // Warm panoramic mess-hall windows on both flanks
  for (const sz of [-1.4, 1.4]) {
    const frame = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.62, 0.08), mats.hullDark);
    frame.position.set(0, 1.85, sz);
    const glow = new THREE.Mesh(new THREE.BoxGeometry(2.65, 0.48, 0.1), mats.interiorGlow);
    glow.position.set(0, 1.85, sz);
    group.add(frame, glow);
  }

  // Twin rooftop induction galley steam condensers with spinning turbine exhausts
  for (const sx of [-1.0, 1.0]) {
    const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.3, 0.72, 12), mats.titanium);
    stack.position.set(sx, 3.05, 0.45);
    group.add(stack);

    const hoodFan = new THREE.Group();
    hoodFan.position.set(sx, 3.43, 0.45);
    for (let b = 0; b < 3; b++) {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.025, 0.07), mats.accent);
      blade.rotation.y = (b * Math.PI) / 3;
      hoodFan.add(blade);
    }
    registerAnimatedPart(group, 'fans', hoodFan);
    group.add(hoodFan);
  }
  const hotTank = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 1.35, 6, 12), mats.accent);
  hotTank.rotation.z = Math.PI / 2;
  hotTank.position.set(0, 3.02, -0.55);
  group.add(hotTank);
}

function buildRecHall(group: THREE.Group, mats: PodMaterialSet, isGhost: boolean) {
  // Hexagonal dual-deck lounge pavilion
  const hexHull = new THREE.Mesh(new THREE.CylinderGeometry(1.95, 2.05, 1.45, 6), mats.hullWhite);
  hexHull.position.y = 1.78;
  hexHull.castShadow = !isGhost;
  group.add(hexHull);

  // Stepped geometric skylight crown
  const crown = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.85, 0.7, 6), mats.hullSlate);
  crown.position.y = 2.85;
  group.add(crown);

  const skyGlass = new THREE.Mesh(new THREE.CylinderGeometry(1.02, 1.02, 0.14, 6), mats.glass);
  skyGlass.position.y = 3.24;
  group.add(skyGlass);

  // Kinetic rooftop holographic crown ring
  const holoRing = new THREE.Group();
  holoRing.position.y = 3.42;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.65, 0.04, 8, 18), mats.cyanGlow);
  ring.rotation.x = Math.PI / 2;
  holoRing.add(ring);
  const spire = new THREE.Mesh(new THREE.OctahedronGeometry(0.22, 0), mats.accent);
  holoRing.add(spire);
  registerAnimatedPart(group, 'spinners', holoRing);
  group.add(holoRing);

  // Exterior acoustic baffle fins + glowing corner pilasters
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3;
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.5, 0.24), mats.accent);
    fin.position.set(Math.sin(a) * 1.98, 1.78, Math.cos(a) * 1.98);
    fin.rotation.y = a;
    group.add(fin);
  }
  addRecessedWindows(group, 6, 1.78, 1.85, mats, 0.7, 0.45);
}

function buildCinemaDome(group: THREE.Group, mats: PodMaterialSet, isGhost: boolean) {
  // Dark acoustic base drum + large smooth projection hemisphere
  const base = new THREE.Mesh(new THREE.CylinderGeometry(1.98, 2.05, 0.72, 24), mats.hullDark);
  base.position.y = 1.42;
  base.castShadow = !isGhost;
  group.add(base);

  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(1.95, 28, 16, 0, Math.PI * 2, 0, Math.PI * 0.5),
    mats.hullSlate
  );
  dome.position.y = 1.76;
  dome.castShadow = !isGhost;
  group.add(dome);

  // Glowing planetarium meridian strips
  for (let i = 0; i < 4; i++) {
    const arch = new THREE.Mesh(new THREE.TorusGeometry(1.97, 0.04, 6, 28, Math.PI), mats.accent);
    arch.rotation.y = (i * Math.PI) / 4;
    arch.position.y = 1.76;
    group.add(arch);
  }

  // Rotating projection laser cooling turret on apex
  const projector = new THREE.Group();
  projector.position.y = 3.74;
  const housing = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.52, 0.35, 16), mats.titanium);
  const optic = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.28, 12), mats.cyanGlow);
  optic.rotation.x = Math.PI / 2;
  optic.position.set(0, 0.14, 0.26);
  projector.add(housing, optic);
  registerAnimatedPart(group, 'dishes', projector);
  group.add(projector);
}

function buildClassroomStudio(group: THREE.Group, mats: PodMaterialSet, isGhost: boolean) {
  // Split-level angled studio block with rotating Earth-uplink dish
  const mainBay = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.3, 3.0), mats.hullWhite);
  mainBay.position.y = 1.7;
  mainBay.castShadow = !isGhost;
  group.add(mainBay);

  const mezzanine = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.85, 2.5), mats.hullSlate);
  mezzanine.position.set(-0.5, 2.75, 0);
  mezzanine.castShadow = !isGhost;
  group.add(mezzanine);

  const glowStrip = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.6, 2.2), mats.interiorGlow);
  glowStrip.position.set(0.56, 2.75, 0);
  group.add(glowStrip);

  // Directional Earth-lecture uplink dish mounted on rotating azimuth pedestal
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 0.65, 10), mats.titanium);
  mast.position.set(1.05, 2.68, -0.5);
  group.add(mast);

  const dishGroup = new THREE.Group();
  dishGroup.position.set(1.05, 3.15, -0.5);
  const miniDish = new THREE.Mesh(new THREE.SphereGeometry(0.52, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.4), mats.accent);
  miniDish.rotation.x = Math.PI * 0.72;
  const feed = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.45, 8), mats.goldFoil);
  feed.position.set(0, 0.22, 0.25);
  feed.rotation.x = Math.PI * 0.3;
  dishGroup.add(miniDish, feed);
  registerAnimatedPart(group, 'dishes', dishGroup);
  group.add(dishGroup);
}

function buildLibraryVault(group: THREE.Group, mats: PodMaterialSet, isGhost: boolean) {
  // Vaulted ribbed cylinder + twin vertical optical data-crystal towers + rotating central spire
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(1.75, 1.85, 1.55, 12), mats.hullWhite);
  drum.position.y = 1.82;
  drum.castShadow = !isGhost;
  group.add(drum);

  addRecessedWindows(group, 12, 1.78, 1.88, mats, 0.18, 0.75);

  // Twin gold-shielded holographic archive towers
  for (const tx of [-0.72, 0.72]) {
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.46, 1.15, 8), mats.goldFoil);
    tower.position.set(tx, 3.1, 0);
    tower.castShadow = !isGhost;
    group.add(tower);

    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.35, 8), mats.accent);
    cap.position.set(tx, 3.85, 0);
    group.add(cap);
  }

  // Spinning optical data-crystal prism between towers
  const crystal = new THREE.Group();
  crystal.position.set(0, 3.25, 0);
  const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.32, 0), mats.cyanGlow);
  gem.scale.set(0.8, 1.45, 0.8);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.03, 6, 16), mats.titanium);
  crystal.add(gem, ring);
  registerAnimatedPart(group, 'spinners', crystal);
  group.add(crystal);
}

function buildWellnessSanctuary(group: THREE.Group, mats: PodMaterialSet, isGhost: boolean) {
  // Organic scalloped circular sanctuary with warm breathing circadian skylight rings
  const hull = new THREE.Mesh(new THREE.CylinderGeometry(1.85, 1.98, 1.25, 24), mats.hullThermalHex);
  hull.position.y = 1.68;
  hull.castShadow = !isGhost;
  group.add(hull);

  // Layered lotus-petal circadian louver rings (top ring gently breathes vertically)
  for (let r = 0; r < 3; r++) {
    const radius = 1.65 - r * 0.42;
    const tierGroup = new THREE.Group();
    tierGroup.position.y = 2.4 + r * 0.28;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.12, 8, 24), mats.hullWhite);
    ring.rotation.x = Math.PI / 2;
    tierGroup.add(ring);

    const glowRing = new THREE.Mesh(new THREE.TorusGeometry(radius - 0.12, 0.05, 8, 24), mats.interiorGlow);
    glowRing.rotation.x = Math.PI / 2;
    glowRing.position.y = -0.02;
    tierGroup.add(glowRing);

    if (r === 2) {
      registerGantryPart(group, tierGroup, 'y', 2.96, 0.14, 1.4);
    }
    group.add(tierGroup);
  }

  // Side zen greenery alcoves
  for (const side of [-1, 1]) {
    const planter = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.5, 0.35, 12), mats.hullSlate);
    planter.position.set(side * 1.4, 2.4, 0);
    const bush = new THREE.Mesh(new THREE.DodecahedronGeometry(0.32, 1), mats.foliage);
    bush.position.set(side * 1.4, 2.68, 0);
    group.add(planter, bush);
  }
}

function buildFitnessGym(group: THREE.Group, mats: PodMaterialSet, isGhost: boolean) {
  // Ruggedized shock-isolated centrifuge/exercise dome + visible spinning ARED flywheel
  const frame = new THREE.Mesh(new THREE.BoxGeometry(3.45, 1.45, 2.85), mats.hullSlate);
  frame.position.y = 1.78;
  frame.castShadow = !isGhost;
  group.add(frame);

  // Clerestory bright exercise band
  const band = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.36, 2.9), mats.interiorGlow);
  band.position.y = 2.15;
  group.add(band);

  // 4 Corner external nitrogen vibration-isolation shock cylinders
  for (const [cx, cz] of [[-1.55, -1.35], [1.55, -1.35], [-1.55, 1.35], [1.55, 1.35]]) {
    const shock = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 1.7, 10), mats.accent);
    shock.position.set(cx, 1.9, cz);
    group.add(shock);
  }

  // Rooftop spinning ARED inertia flywheel housing
  const flywheelHousing = new THREE.Mesh(new THREE.CylinderGeometry(0.78, 0.84, 0.28, 18, 1, true), mats.hullDark);
  flywheelHousing.position.y = 2.66;
  group.add(flywheelHousing);

  const rotor = new THREE.Group();
  rotor.position.y = 2.74;
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.22, 12), mats.titanium);
  const bar = new THREE.Mesh(new THREE.BoxGeometry(1.36, 0.08, 0.18), mats.accent);
  const cross = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.08, 1.36), mats.titanium);
  rotor.add(hub, bar, cross);
  registerAnimatedPart(group, 'spinners', rotor);
  group.add(rotor);
}

function buildFoodProcessing(group: THREE.Group, mats: PodMaterialSet, isGhost: boolean) {
  // Stainless industrial block with twin conical grain silos, freeze-dry cylinder & spinning condenser fan
  const base = new THREE.Mesh(new THREE.BoxGeometry(3.3, 1.25, 2.9), mats.hullWhite);
  base.position.y = 1.68;
  base.castShadow = !isGhost;
  group.add(base);

  // Twin vertical conical grain hoppers
  for (const hx of [-0.95, 0.15]) {
    const cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 1.1, 14), mats.titanium);
    cyl.position.set(hx, 2.85, -0.45);
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.5, 0.45, 14), mats.accent);
    cone.position.set(hx, 3.6, -0.45);
    group.add(cyl, cone);
  }

  // Horizontal vacuum lyophilization (freeze-dryer) chamber
  const chamber = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 2.15, 16), mats.hullDark);
  chamber.rotation.z = Math.PI / 2;
  chamber.position.set(0.2, 2.75, 0.65);
  chamber.castShadow = !isGhost;
  group.add(chamber);

  // Rooftop cryo condenser fan
  const fanHousing = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.34, 0.26, 12), mats.hullSlate);
  fanHousing.position.set(1.05, 2.45, -0.55);
  group.add(fanHousing);
  const fanGroup = new THREE.Group();
  fanGroup.position.set(1.05, 2.6, -0.55);
  for (let b = 0; b < 3; b++) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.03, 0.08), mats.cyanGlow);
    blade.rotation.y = (b * Math.PI) / 3;
    fanGroup.add(blade);
  }
  registerAnimatedPart(group, 'fans', fanGroup);
  group.add(fanGroup);

  addExternalPipe(
    group,
    [new THREE.Vector3(-0.95, 3.2, -0.45), new THREE.Vector3(-0.3, 3.35, 0.15), new THREE.Vector3(0.2, 3.25, 0.65)],
    0.06,
    mats.copper
  );
}

// ==========================================
// 2. FOOD & AGRICULTURE (4 DISTINCT DESIGNS)
// ==========================================

function buildGreenhouseTunnel(group: THREE.Group, mats: PodMaterialSet, isGhost: boolean) {
  // Vaulted polycarbonate Quonset-arch tunnel greenhouse
  const baseWall = new THREE.Mesh(new THREE.BoxGeometry(3.75, 0.75, 3.55), mats.hullWhite);
  baseWall.position.y = 1.44;
  baseWall.castShadow = !isGhost;
  group.add(baseWall);

  // Two long multi-tier crop rows inside
  for (const bx of [-0.85, 0.85]) {
    const bed = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.28, 2.9), mats.hullSlate);
    bed.position.set(bx, 1.75, 0);
    group.add(bed);
    for (let z = -1.1; z <= 1.1; z += 0.55) {
      const crop = new THREE.Mesh(new THREE.DodecahedronGeometry(0.24, 1), mats.foliage);
      crop.position.set(bx, 2.02, z);
      group.add(crop);
    }
  }

  // 5 Parallel arched ribs + curved translucent tunnel roof
  for (let i = -2; i <= 2; i++) {
    const arch = new THREE.Mesh(new THREE.TorusGeometry(1.78, 0.055, 6, 20, Math.PI), mats.titanium);
    arch.position.set(0, 1.82, i * 0.82);
    group.add(arch);
  }

  const vault = new THREE.Mesh(
    new THREE.CylinderGeometry(1.76, 1.76, 3.45, 18, 1, false, 0, Math.PI),
    mats.glass
  );
  vault.rotation.z = Math.PI / 2;
  vault.rotation.y = Math.PI / 2;
  vault.position.y = 1.82;
  vault.renderOrder = 2;
  group.add(vault);

  // Overhead grow-light rails + drip header + exterior climate chiller with live spinning exhaust fan
  for (const lx of [-0.85, 0.85]) {
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.08, 3.0), mats.accent);
    lamp.position.set(lx, 3.12, 0);
    group.add(lamp);

    const dripPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 2.9, 8), mats.cyanGlow);
    dripPipe.rotation.x = Math.PI / 2;
    dripPipe.position.set(lx, 2.48, 0);
    group.add(dripPipe);
  }
  const chiller = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.68, 1.45), mats.hullDark);
  chiller.position.set(-1.92, 1.48, 0);
  group.add(chiller);

  const fanShroud = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.14, 12, 1, true), mats.hullSlate);
  fanShroud.position.set(-1.92, 1.88, 0);
  group.add(fanShroud);

  const chillerFan = new THREE.Group();
  chillerFan.position.set(-1.92, 1.88, 0);
  for (let b = 0; b < 3; b++) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.02, 0.07), mats.accent);
    blade.rotation.y = (b * Math.PI) / 3;
    chillerFan.add(blade);
  }
  registerAnimatedPart(group, 'fans', chillerFan);
  group.add(chillerFan);

  for (const nz of [-0.65, 0.65]) {
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.95, 10), mats.cyanGlow);
    tank.position.set(1.94, 1.58, nz);
    group.add(tank);
  }
  addExternalPipe(
    group,
    [new THREE.Vector3(1.94, 1.9, -0.65), new THREE.Vector3(1.82, 2.4, 0), new THREE.Vector3(1.94, 1.9, 0.65)],
    0.045,
    mats.titanium
  );
}

function buildHydroponicsSpire(group: THREE.Group, mats: PodMaterialSet, isGhost: boolean) {
  // Vertical octagonal hydroponic tower with 3 stacked illuminated crop rings
  const base = new THREE.Mesh(new THREE.CylinderGeometry(1.85, 1.98, 0.65, 8), mats.hullWhite);
  base.position.y = 1.38;
  base.castShadow = !isGhost;
  group.add(base);

  for (let tier = 0; tier < 3; tier++) {
    const ty = 1.8 + tier * 0.62;
    const tr = 1.48 - tier * 0.24;
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(tr, tr, 0.14, 16), mats.hullSlate);
    ring.position.y = ty;
    group.add(ring);

    const plants = 8 - tier * 2;
    for (let c = 0; c < plants; c++) {
      const a = (c * Math.PI * 2) / plants + tier * 0.3;
      const leaf = new THREE.Mesh(new THREE.DodecahedronGeometry(0.18, 1), mats.foliage);
      leaf.position.set(Math.cos(a) * (tr * 0.72), ty + 0.16, Math.sin(a) * (tr * 0.72));
      group.add(leaf);
    }
  }

  // Translucent octagonal glass enclosure
  const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(1.38, 1.72, 1.9, 8), mats.glass);
  sleeve.position.y = 2.65;
  sleeve.renderOrder = 2;
  group.add(sleeve);

  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 1.42, 0.35, 8), mats.titanium);
  cap.position.y = 3.72;
  group.add(cap);

  // Rotating internal UV/LED grow-light carousel ring
  const lightCarousel = new THREE.Group();
  lightCarousel.position.y = 2.65;
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2;
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.55, 0.14), mats.accent);
    bar.position.set(Math.cos(a) * 1.18, 0, Math.sin(a) * 1.18);
    lightCarousel.add(bar);
  }
  registerAnimatedPart(group, 'spinners', lightCarousel);
  group.add(lightCarousel);

  // Exterior recirculating blue nutrient reservoir
  const nutPump = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 1.65, 12), mats.cyanGlow);
  nutPump.position.set(1.75, 2.25, 0);
  group.add(nutPump);
}

function buildAeroponicsTowers(group: THREE.Group, mats: PodMaterialSet, isGhost: boolean) {
  // Central piezoelectric misting compressor + 3 vertical glass growth cylinders
  const deck = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 2.0, 0.6, 12), mats.hullDark);
  deck.position.y = 1.35;
  deck.castShadow = !isGhost;
  group.add(deck);

  const core = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.52, 2.2, 12), mats.titanium);
  core.position.y = 2.55;
  group.add(core);

  // Rotating central misting manifold rotor
  const mistRotor = new THREE.Group();
  mistRotor.position.y = 3.78;
  const rotorHub = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 0.22, 12), mats.accent);
  mistRotor.add(rotorHub);
  for (let r = 0; r < 3; r++) {
    const a = (r * Math.PI * 2) / 3;
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 1.1), mats.cyanGlow);
    arm.position.set(Math.cos(a) * 0.55, 0, Math.sin(a) * 0.55);
    arm.rotation.y = -a + Math.PI / 2;
    mistRotor.add(arm);
  }
  registerAnimatedPart(group, 'spinners', mistRotor);
  group.add(mistRotor);

  for (let i = 0; i < 3; i++) {
    const a = (i * Math.PI * 2) / 3;
    const cx = Math.cos(a) * 1.12;
    const cz = Math.sin(a) * 1.12;

    const glassCol = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 2.0, 16), mats.glass);
    glassCol.position.set(cx, 2.65, cz);
    glassCol.renderOrder = 2;
    group.add(glassCol);

    const podCap = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.58, 0.16, 16), mats.accent);
    podCap.position.set(cx, 3.68, cz);
    group.add(podCap);

    // Internal vertical root misting stalk + greenery
    for (let h = 0; h < 3; h++) {
      const bush = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 8), mats.foliage);
      bush.position.set(cx, 1.95 + h * 0.55, cz);
      group.add(bush);
    }

    addExternalPipe(
      group,
      [new THREE.Vector3(0, 3.4, 0), new THREE.Vector3(cx * 0.7, 3.65, cz * 0.7), new THREE.Vector3(cx, 3.7, cz)],
      0.045,
      mats.cyanGlow
    );
  }
}

function buildPlantResearchLab(group: THREE.Group, mats: PodMaterialSet, isGhost: boolean) {
  // Asymmetric split: cleanroom CRISPR lab wing + small glass test dome
  const labWing = new THREE.Mesh(new THREE.BoxGeometry(2.1, 1.55, 3.1), mats.hullWhite);
  labWing.position.set(-0.85, 1.82, 0);
  labWing.castShadow = !isGhost;
  group.add(labWing);

  const domeBase = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.15, 0.65, 14), mats.hullSlate);
  domeBase.position.set(0.95, 1.38, 0);
  group.add(domeBase);

  const testDome = new THREE.Mesh(
    new THREE.SphereGeometry(1.02, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.5),
    mats.glass
  );
  testDome.position.set(0.95, 1.7, 0);
  testDome.renderOrder = 2;
  group.add(testDome);

  const specimen = new THREE.Mesh(new THREE.DodecahedronGeometry(0.35, 1), mats.foliage);
  specimen.position.set(0.95, 1.95, 0);
  registerAnimatedPart(group, 'spinners', specimen);
  group.add(specimen);

  // Rail track + sliding UV spectrometer scanner
  const rail = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.1, 2.3), mats.titanium);
  rail.position.set(-0.85, 2.64, 0);
  group.add(rail);

  const uvRig = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.35, 0.45, 12), mats.accent);
  uvRig.position.set(-0.85, 2.86, 0);
  registerGantryPart(group, uvRig, 'z', 0, 0.78, 1.25);
  group.add(uvRig);
}

// ==========================================
// 3. ENERGY & ELECTRICITY (6 DISTINCT DESIGNS)
// ==========================================

function buildKilopowerNuclear(group: THREE.Group, mats: PodMaterialSet, isGhost: boolean) {
  // Iconic Kilopower U-235 core with flared umbrella radiator shroud
  const shieldBase = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.55, 1.15, 16), mats.hullDark);
  shieldBase.position.y = 1.62;
  shieldBase.castShadow = !isGhost;
  group.add(shieldBase);

  const goldCore = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.85, 1.25, 16), mats.goldFoil);
  goldCore.position.y = 2.7;
  group.add(goldCore);

  // Flared umbrella radiator cone
  const umbrella = new THREE.Mesh(new THREE.CylinderGeometry(1.95, 0.68, 1.15, 18, 1, true), mats.titanium);
  umbrella.position.y = 3.55;
  umbrella.castShadow = !isGhost;
  group.add(umbrella);

  const rim = new THREE.Mesh(new THREE.TorusGeometry(1.95, 0.055, 8, 24), mats.accent);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 4.12;
  group.add(rim);

  // Tungsten shadow-shield collar + 8 radial heat-pipe radiator fins beneath umbrella
  const shadowCollar = new THREE.Mesh(new THREE.CylinderGeometry(1.12, 1.18, 0.24, 16), mats.hullSlate);
  shadowCollar.position.y = 2.22;
  group.add(shadowCollar);

  for (let i = 0; i < 8; i++) {
    const finGroup = new THREE.Group();
    finGroup.rotation.y = (i * Math.PI) / 4;
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.95, 0.82), mats.radiatorWhite);
    fin.position.set(0, 3.45, 1.05);
    fin.rotation.x = -0.38;
    finGroup.add(fin);
    group.add(finGroup);
  }

  // Twin reciprocating Stirling piston power heads + 4 NaK liquid-metal coolant loops
  for (const sx of [-1.15, 1.15]) {
    const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.65, 10), mats.hullSlate);
    sleeve.position.set(sx, 1.92, 0);
    sleeve.rotation.z = sx > 0 ? -0.35 : 0.35;
    group.add(sleeve);

    const stirling = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.24, 0.85, 10), mats.copper);
    stirling.position.set(sx, 2.18, 0);
    stirling.rotation.z = sx > 0 ? -0.35 : 0.35;
    registerGantryPart(group, stirling, 'y', 2.18, 0.12, 6.2);
    group.add(stirling);
  }
  for (let c = 0; c < 4; c++) {
    const a = (c * Math.PI) / 2 + Math.PI / 4;
    addExternalPipe(
      group,
      [
        new THREE.Vector3(Math.cos(a) * 0.78, 2.35, Math.sin(a) * 0.78),
        new THREE.Vector3(Math.cos(a) * 1.15, 3.05, Math.sin(a) * 1.15),
        new THREE.Vector3(Math.cos(a) * 1.45, 3.75, Math.sin(a) * 1.45),
      ],
      0.04,
      mats.copper
    );
  }
  const radBand = new THREE.Mesh(new THREE.CylinderGeometry(1.42, 1.46, 0.14, 16), mats.caution);
  radBand.position.y = 1.42;
  group.add(radBand);

  const powerCab = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.68, 0.55), mats.hullDark);
  powerCab.position.set(0, 1.42, 1.55);
  group.add(powerCab);
  addRooftopStrobe(group, mats, 0, 4.12, 0);
}

function buildSMRNuclear(group: THREE.Group, mats: PodMaterialSet, isGhost: boolean) {
  // Heavy 250 kW Brayton SMR containment with 6 radial radiator fins + twin turbine domes
  const pts = [
    new THREE.Vector2(1.48, 1.06),
    new THREE.Vector2(1.48, 1.7),
    new THREE.Vector2(1.22, 1.95),
    new THREE.Vector2(1.22, 3.15),
    new THREE.Vector2(0.85, 3.55),
    new THREE.Vector2(0.0, 3.62),
  ];
  const vessel = new THREE.Mesh(new THREE.LatheGeometry(pts, 20), mats.hullDark);
  vessel.castShadow = !isGhost;
  group.add(vessel);

  const mli = new THREE.Mesh(new THREE.CylinderGeometry(1.26, 1.26, 0.6, 20), mats.goldFoil);
  mli.position.y = 2.35;
  group.add(mli);

  const statusRing = new THREE.Mesh(new THREE.TorusGeometry(1.28, 0.05, 8, 24), mats.accent);
  statusRing.rotation.x = Math.PI / 2;
  statusRing.position.y = 2.75;
  group.add(statusRing);

  // Twin rooftop Brayton closed-cycle turbine exhaust fans
  for (const tx of [-0.55, 0.55]) {
    const shroud = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.4, 0.24, 12, 1, true), mats.hullSlate);
    shroud.position.set(tx, 3.62, 0);
    group.add(shroud);

    const turbineFan = new THREE.Group();
    turbineFan.position.set(tx, 3.66, 0);
    for (let b = 0; b < 4; b++) {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.03, 0.08), mats.cyanGlow);
      blade.rotation.y = (b * Math.PI) / 4;
      turbineFan.add(blade);
    }
    registerAnimatedPart(group, 'fans', turbineFan);
    group.add(turbineFan);
  }

  for (let i = 0; i < 6; i++) {
    const wingGroup = new THREE.Group();
    wingGroup.rotation.y = (i * Math.PI) / 3;
    const panel = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.65, 1.1), mats.radiatorWhite);
    panel.position.set(0, 2.55, 1.72);
    panel.castShadow = !isGhost;
    wingGroup.add(panel);
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.7, 8), mats.copper);
    pipe.rotation.x = Math.PI / 2;
    pipe.position.set(0, 2.05, 1.32);
    wingGroup.add(pipe);
    group.add(wingGroup);
  }
}

function buildSolarArray(group: THREE.Group, mats: PodMaterialSet, isGhost: boolean) {
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(1.02, 1.24, 1.05, 12), mats.hullWhite);
  hub.position.y = 1.58;
  hub.castShadow = !isGhost;
  group.add(hub);

  const band = new THREE.Mesh(new THREE.CylinderGeometry(1.12, 1.15, 0.14, 12), mats.accent);
  band.position.y = 1.45;
  group.add(band);

  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.24, 1.65, 12), mats.hullDark);
  mast.position.y = 2.45;
  group.add(mast);

  // Azimuth slew bearing ring + hydraulic actuator + armored inverter combiner cabinet on deck
  const slewRing = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.06, 8, 20), mats.titanium);
  slewRing.rotation.x = Math.PI / 2;
  slewRing.position.y = 2.12;
  group.add(slewRing);

  const actuator = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 1.1, 10), mats.titanium);
  actuator.position.set(0, 2.75, 0.36);
  actuator.rotation.x = -0.38;
  group.add(actuator);

  const inverter = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.58, 0.65), mats.hullSlate);
  inverter.position.set(1.25, 1.38, 0.85);
  group.add(inverter);

  // Dual-axis tracking gimbal + 4-wing ROSA tensioned array with diagonal spreader trusses
  const gimbal = new THREE.Group();
  gimbal.position.y = 3.35;
  gimbal.rotation.x = 0.34;

  const yoke = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.24, 0.55), mats.titanium);
  gimbal.add(yoke);

  const crossBoom = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 5.05, 10), mats.hullDark);
  crossBoom.rotation.z = Math.PI / 2;
  crossBoom.position.y = -0.06;
  gimbal.add(crossBoom);

  const coords = [
    [-1.45, -0.78],
    [1.45, -0.78],
    [-1.45, 0.78],
    [1.45, 0.78],
  ];
  for (const [wx, wz] of coords) {
    const panel = new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.05, 1.15), mats.solar);
    panel.position.set(wx, 0, wz);
    panel.castShadow = !isGhost;
    gimbal.add(panel);

    const frame = new THREE.Mesh(new THREE.BoxGeometry(2.22, 0.032, 1.22), mats.titanium);
    frame.position.set(wx, -0.035, wz);
    gimbal.add(frame);

    const strut = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.8), mats.hullSlate);
    strut.position.set(wx * 0.7, -0.08, wz * 0.5);
    gimbal.add(strut);

    const tensionTip = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.24, 8), mats.goldFoil);
    tensionTip.rotation.x = Math.PI / 2;
    tensionTip.position.set(wx + (wx > 0 ? 1.08 : -1.08), 0, wz);
    gimbal.add(tensionTip);
  }

  const sunSensor = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), mats.goldFoil);
  sunSensor.position.y = 0.22;
  gimbal.add(sunSensor);

  registerAnimatedPart(group, 'solarTrackers', gimbal);
  group.add(gimbal);
}

function buildBatteryBank(group: THREE.Group, mats: PodMaterialSet, isGhost: boolean) {
  const vault = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.1, 3.1), mats.hullDark);
  vault.position.y = 1.6;
  vault.castShadow = !isGhost;
  group.add(vault);

  for (let i = 0; i < 4; i++) {
    const cx = -1.08 + i * 0.72;
    const cell = new THREE.Mesh(new THREE.BoxGeometry(0.48, 1.15, 2.5), mats.hullSlate);
    cell.position.set(cx, 2.38, 0);
    cell.castShadow = !isGhost;
    group.add(cell);

    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.12, 2.55), mats.goldFoil);
    cap.position.set(cx, 2.98, 0);
    group.add(cap);
  }

  const bus = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.14, 0.26), mats.copper);
  bus.position.set(0, 3.1, 0);
  group.add(bus);

  // Active battery thermal management fan pod on end flank
  const chillerShroud = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.38, 0.26, 12, 1, true), mats.hullSlate);
  chillerShroud.position.set(1.38, 2.28, -1.15);
  group.add(chillerShroud);
  const chillerFan = new THREE.Group();
  chillerFan.position.set(1.38, 2.34, -1.15);
  for (let b = 0; b < 3; b++) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.03, 0.08), mats.cyanGlow);
    blade.rotation.y = (b * Math.PI) / 3;
    chillerFan.add(blade);
  }
  registerAnimatedPart(group, 'fans', chillerFan);
  group.add(chillerFan);

  const chargeBar = new THREE.Mesh(new THREE.BoxGeometry(3.44, 0.12, 0.12), mats.accent);
  chargeBar.position.set(0, 1.55, 1.56);
  group.add(chargeBar);
}

function buildPowerTransformer(group: THREE.Group, mats: PodMaterialSet, isGhost: boolean) {
  // Open-frame 1000V DC substation with 3 tall ceramic insulator bushings + steel gantry
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.85, 3.0), mats.hullSlate);
  plinth.position.y = 1.48;
  plinth.castShadow = !isGhost;
  group.add(plinth);

  for (const bx of [-1.05, 0, 1.05]) {
    const core = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.42, 1.05, 14), mats.hullDark);
    core.position.set(bx, 2.4, 0);
    core.castShadow = !isGhost;
    group.add(core);

    for (let disc = 0; disc < 3; disc++) {
      const fin = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 0.08, 14), mats.hullWhite);
      fin.position.set(bx, 2.15 + disc * 0.28, 0);
      group.add(fin);
    }

    const terminal = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), mats.copper);
    terminal.position.set(bx, 3.05, 0);
    group.add(terminal);
  }

  // Overhead bus gantry beam + dielectric radiator cooling fan
  const gantry = new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.14, 0.22), mats.titanium);
  gantry.position.set(0, 3.25, 0);
  group.add(gantry);

  const fanBox = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.55, 0.45), mats.hullDark);
  fanBox.position.set(0, 2.15, 1.15);
  group.add(fanBox);

  const txFan = new THREE.Group();
  txFan.position.set(0, 2.46, 1.15);
  for (let b = 0; b < 3; b++) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.03, 0.08), mats.accent);
    blade.rotation.y = (b * Math.PI) / 3;
    txFan.add(blade);
  }
  registerAnimatedPart(group, 'fans', txFan);
  group.add(txFan);
  addRooftopStrobe(group, mats, 1.35, 3.35, 0);
}

function buildEnergyControlHub(group: THREE.Group, mats: PodMaterialSet, isGhost: boolean) {
  // Compact armored neural dispatch block with glowing lightbar array + twin tracking micro-dishes
  const body = new THREE.Mesh(new THREE.CylinderGeometry(1.65, 1.85, 1.35, 8), mats.hullDark);
  body.position.y = 1.72;
  body.castShadow = !isGhost;
  group.add(body);

  const turret = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.35, 0.65, 8), mats.hullSlate);
  turret.position.y = 2.7;
  group.add(turret);

  const lightRing = new THREE.Mesh(new THREE.TorusGeometry(1.32, 0.06, 8, 24), mats.accent);
  lightRing.rotation.x = Math.PI / 2;
  lightRing.position.y = 2.4;
  group.add(lightRing);

  for (const sx of [-0.65, 0.65]) {
    const dishWrap = new THREE.Group();
    dishWrap.position.set(sx, 3.25, 0);
    const dish = new THREE.Mesh(new THREE.ConeGeometry(0.4, 0.25, 14, 1, true), mats.titanium);
    dish.rotation.x = Math.PI * 0.78;
    dishWrap.add(dish);
    registerAnimatedPart(group, 'dishes', dishWrap);
    group.add(dishWrap);
  }
  addRooftopStrobe(group, mats, 0, 3.05, 0);
}

// ==========================================
// 4. LIFE SUPPORT (9 DISTINCT DESIGNS)
// ==========================================

function buildOxygenPlant(group: THREE.Group, mats: PodMaterialSet, isGhost: boolean) {
  const body = new THREE.Mesh(new THREE.CylinderGeometry(1.68, 1.82, 1.15, 12), mats.hullWhite);
  body.position.y = 1.62;
  body.castShadow = !isGhost;
  group.add(body);

  const band = new THREE.Mesh(new THREE.CylinderGeometry(1.76, 1.78, 0.14, 12), mats.accent);
  band.position.y = 1.5;
  group.add(band);

  for (const sx of [-0.78, 0.78]) {
    const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.68, 20, 16), mats.hullWhite);
    sphere.position.set(sx, 2.75, 0);
    sphere.castShadow = !isGhost;
    group.add(sphere);

    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.69, 0.05, 8, 24), mats.accent);
    collar.rotation.x = Math.PI / 2;
    collar.position.set(sx, 2.75, 0);
    group.add(collar);

    const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.48, 0.45, 12), mats.hullDark);
    stand.position.set(sx, 2.25, 0);
    group.add(stand);
  }

  // Central glowing 800°C SOXE electrolysis furnace stack + spinning O2 compressor turbine
  const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.34, 1.25, 14), mats.hullDark);
  stack.position.set(0, 2.85, -0.75);
  const glowBand = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.18, 14), mats.amberGlow);
  glowBand.position.set(0, 3.15, -0.75);
  group.add(stack, glowBand);

  const oxTurbine = new THREE.Group();
  oxTurbine.position.set(0, 3.52, -0.75);
  for (let b = 0; b < 3; b++) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.03, 0.08), mats.cyanGlow);
    blade.rotation.y = (b * Math.PI) / 3;
    oxTurbine.add(blade);
  }
  registerAnimatedPart(group, 'fans', oxTurbine);
  group.add(oxTurbine);

  addExternalPipe(
    group,
    [new THREE.Vector3(-0.78, 3.43, 0), new THREE.Vector3(-0.4, 3.7, 0), new THREE.Vector3(0.4, 3.7, 0), new THREE.Vector3(0.78, 3.43, 0)],
    0.055,
    mats.titanium
  );
  addExternalManifold(group, mats, 0, 1.65, 1.68, 0);
  addRooftopStrobe(group, mats, 0, 3.45, 0.65);
}

function buildWaterSystem(group: THREE.Group, mats: PodMaterialSet, isGhost: boolean) {
  const mainTank = new THREE.Mesh(new THREE.CylinderGeometry(1.65, 1.78, 1.25, 16), mats.hullWhite);
  mainTank.position.y = 1.68;
  mainTank.castShadow = !isGhost;
  group.add(mainTank);

  const band = new THREE.Mesh(new THREE.CylinderGeometry(1.72, 1.74, 0.14, 16), mats.accent);
  band.position.y = 1.45;
  group.add(band);

  for (let i = 0; i < 3; i++) {
    const angle = (i * Math.PI * 2) / 3;
    const cx = Math.cos(angle) * 0.88;
    const cz = Math.sin(angle) * 0.88;
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 1.3, 16), mats.titanium);
    col.position.set(cx, 2.8, cz);
    col.castShadow = !isGhost;
    group.add(col);

    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.32, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.5), mats.hullSlate);
    cap.position.set(cx, 3.45, cz);
    group.add(cap);

    const sightGlass = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.24, 16), mats.cyanGlow);
    sightGlass.position.set(cx, 2.85, cz);
    group.add(sightGlass);
  }

  // Central spinning rotary VCD distillation centrifuge drum
  const vcdGroup = new THREE.Group();
  vcdGroup.position.set(0, 2.75, 0);
  const vcdDrum = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.9, 10), mats.goldFoil);
  const vcdFins = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.14, 0.14), mats.cyanGlow);
  vcdFins.position.y = 0.28;
  vcdGroup.add(vcdDrum, vcdFins);
  registerAnimatedPart(group, 'spinners', vcdGroup);
  group.add(vcdGroup);

  const header = new THREE.Mesh(new THREE.TorusGeometry(0.88, 0.06, 8, 24), mats.accent);
  header.rotation.x = Math.PI / 2;
  header.position.y = 3.25;
  group.add(header);
  addExternalManifold(group, mats, 0, 1.68, -1.68, Math.PI);
}

function buildWaterRecovery(group: THREE.Group, mats: PodMaterialSet, isGhost: boolean) {
  // Horizontal forward-osmosis twin membrane skids + brine pressure sphere + spinning RO impeller
  const base = new THREE.Mesh(new THREE.BoxGeometry(3.3, 0.95, 2.9), mats.hullSlate);
  base.position.y = 1.52;
  base.castShadow = !isGhost;
  group.add(base);

  for (const mz of [-0.65, 0.65]) {
    const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.46, 2.5, 16), mats.hullWhite);
    drum.rotation.z = Math.PI / 2;
    drum.position.set(-0.2, 2.45, mz);
    drum.castShadow = !isGhost;
    group.add(drum);

    const strap = new THREE.Mesh(new THREE.TorusGeometry(0.48, 0.04, 8, 16), mats.accent);
    strap.rotation.y = Math.PI / 2;
    strap.position.set(-0.2, 2.45, mz);
    group.add(strap);
  }

  const brineSphere = new THREE.Mesh(new THREE.SphereGeometry(0.62, 18, 14), mats.goldFoil);
  brineSphere.position.set(1.1, 2.48, 0);
  group.add(brineSphere);

  const roPump = new THREE.Group();
  roPump.position.set(1.1, 3.22, 0);
  for (let b = 0; b < 3; b++) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.04, 0.1), mats.cyanGlow);
    blade.rotation.y = (b * Math.PI) / 3;
    roPump.add(blade);
  }
  registerAnimatedPart(group, 'fans', roPump);
  group.add(roPump);
}

function buildUVPurifier(group: THREE.Group, mats: PodMaterialSet, isGhost: boolean) {
  // Open-bay cylindrical UV-C quartz sterilization manifold with rotating reflector cage
  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(1.72, 1.85, 0.85, 16), mats.hullWhite);
  plinth.position.y = 1.48;
  plinth.castShadow = !isGhost;
  group.add(plinth);

  const uvCage = new THREE.Group();
  uvCage.position.y = 2.6;
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2 + Math.PI / 4;
    const x = Math.cos(a) * 0.85;
    const z = Math.sin(a) * 0.85;

    const uvCore = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 1.45, 12), mats.cyanGlow);
    uvCore.position.set(x, 0, z);
    uvCage.add(uvCore);

    const glassSleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 1.4, 14), mats.glass);
    glassSleeve.position.set(x, 0, z);
    glassSleeve.renderOrder = 2;
    uvCage.add(glassSleeve);
  }
  registerAnimatedPart(group, 'spinners', uvCage);
  group.add(uvCage);

  const topPlenum = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.35, 0.28, 16), mats.hullDark);
  topPlenum.position.y = 3.42;
  group.add(topPlenum);
}

function buildAirFilterPod(group: THREE.Group, mats: PodMaterialSet, isGhost: boolean) {
  // Heavy dust precipitator cabinet + twin cyclone dust catchers + rotating rooftop HEPA fan
  const cabinet = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.45, 2.8), mats.hullWhite);
  cabinet.position.y = 1.78;
  cabinet.castShadow = !isGhost;
  group.add(cabinet);

  // Louvered intake vents
  for (let i = 0; i < 4; i++) {
    const slat = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.12, 0.12), mats.hullDark);
    slat.position.set(-0.4, 1.35 + i * 0.25, 1.44);
    slat.rotation.x = 0.35;
    group.add(slat);
  }

  // Twin cyclone conical separators
  for (const cz of [-0.65, 0.65]) {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.42, 1.05, 12), mats.titanium);
    cone.rotation.x = Math.PI;
    cone.position.set(1.05, 2.65, cz);
    group.add(cone);
  }

  // Rooftop HEPA rotary turbine cowl
  const cowl = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.82, 0.45, 16, 1, true), mats.hullSlate);
  cowl.position.set(-0.45, 2.72, 0);
  group.add(cowl);

  const fanGroup = new THREE.Group();
  fanGroup.position.set(-0.45, 2.78, 0);
  for (let b = 0; b < 3; b++) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.04, 0.18), mats.accent);
    blade.rotation.y = (b * Math.PI) / 3;
    fanGroup.add(blade);
  }
  registerAnimatedPart(group, 'fans', fanGroup);
  group.add(fanGroup);
}

function buildThermalRadiator(group: THREE.Group, mats: PodMaterialSet, isGhost: boolean) {
  // Ammonia pump hub + tall mast + wide Z-folded ISS white thermal radiator wings
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.72, 1.15, 12), mats.hullWhite);
  hub.position.y = 1.62;
  hub.castShadow = !isGhost;
  group.add(hub);

  const trussMast = new THREE.Mesh(new THREE.BoxGeometry(0.32, 1.9, 0.32), mats.titanium);
  trussMast.position.y = 3.05;
  group.add(trussMast);

  const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 4.4, 10), mats.hullDark);
  boom.rotation.z = Math.PI / 2;
  boom.position.y = 3.45;
  group.add(boom);

  for (const side of [-1, 1]) {
    const wingPivot = new THREE.Group();
    wingPivot.position.set(side * 1.45, 3.45, 0);
    wingPivot.rotation.x = 0.22;

    const wing = new THREE.Mesh(new THREE.BoxGeometry(1.65, 1.1, 0.06), mats.radiatorWhite);
    wing.castShadow = !isGhost;
    wingPivot.add(wing);

    const edge = new THREE.Mesh(new THREE.BoxGeometry(1.68, 0.08, 0.1), mats.accent);
    edge.position.set(0, 0.53, 0.02);
    wingPivot.add(edge);

    registerGantryPart(group, wingPivot, 'rx', 0.22, 0.16, 0.65);
    group.add(wingPivot);
  }
}

function buildHumidityControl(group: THREE.Group, mats: PodMaterialSet, isGhost: boolean) {
  // Twin rotary desiccant wheel drums + rooftop dehumidifier blower
  const base = new THREE.Mesh(new THREE.BoxGeometry(3.1, 1.05, 2.7), mats.hullWhite);
  base.position.y = 1.58;
  base.castShadow = !isGhost;
  group.add(base);

  for (const wx of [-0.8, 0.8]) {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.68, 0.55, 20), mats.titanium);
    wheel.rotation.x = Math.PI / 2;
    wheel.position.set(wx, 2.65, 0);
    wheel.castShadow = !isGhost;
    group.add(wheel);

    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.68, 0.06, 8, 20), mats.accent);
    rim.position.set(wx, 2.65, 0.28);
    group.add(rim);
  }

  // Central condensing tank + spinning blower turbine on top
  const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 1.0, 14), mats.cyanGlow);
  tank.position.set(0, 2.58, -0.75);
  group.add(tank);

  const blower = new THREE.Group();
  blower.position.set(0, 3.16, -0.75);
  for (let b = 0; b < 3; b++) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.03, 0.1), mats.accent);
    blade.rotation.y = (b * Math.PI) / 3;
    blower.add(blade);
  }
  registerAnimatedPart(group, 'fans', blower);
  group.add(blower);
}

function buildCO2Scrubber(group: THREE.Group, mats: PodMaterialSet, isGhost: boolean) {
  // 4-Bed Molecular Sieve dual vertical amine towers + oscillating diverter valve
  const base = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.75, 1.0, 12), mats.hullSlate);
  base.position.y = 1.55;
  base.castShadow = !isGhost;
  group.add(base);

  for (const tx of [-0.72, 0.72]) {
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 1.75, 16), mats.goldFoil);
    tower.position.set(tx, 2.85, 0);
    tower.castShadow = !isGhost;
    group.add(tower);

    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.5, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), mats.hullDark);
    dome.position.set(tx, 3.72, 0);
    group.add(dome);
  }

  addExternalPipe(
    group,
    [new THREE.Vector3(-0.72, 3.85, 0), new THREE.Vector3(0, 4.15, 0), new THREE.Vector3(0.72, 3.85, 0)],
    0.06,
    mats.accent
  );

  const diverter = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.24, 0.24), mats.cyanGlow);
  diverter.position.set(0, 4.24, 0);
  registerGantryPart(group, diverter, 'ry', 0, 0.75, 1.6);
  group.add(diverter);
}

function buildIceDriller(group: THREE.Group, mats: PodMaterialSet, isGhost: boolean) {
  // Heavy skid-mounted Rodriguez ice well derrick + spinning auger string + vapor tank
  const deck = new THREE.Mesh(new THREE.BoxGeometry(3.25, 0.85, 3.1), mats.hullSlate);
  deck.position.y = 1.15;
  deck.castShadow = !isGhost;
  group.add(deck);

  for (const [dx, dz] of [[-0.65, -0.65], [0.65, -0.65], [-0.65, 0.65], [0.65, 0.65]]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.085, 3.0, 8), mats.titanium);
    leg.position.set(dx * 0.8, 3.0, dz * 0.8);
    leg.rotation.z = dx > 0 ? 0.1 : -0.1;
    leg.rotation.x = dz > 0 ? -0.1 : 0.1;
    group.add(leg);
  }

  const augerGroup = new THREE.Group();
  augerGroup.position.y = 2.4;
  const auger = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.15, 3.7, 8), mats.goldFoil);
  const flute = new THREE.Mesh(new THREE.BoxGeometry(0.55, 2.2, 0.08), mats.accent);
  flute.position.y = -0.35;
  augerGroup.add(auger, flute);
  registerAnimatedPart(group, 'spinners', augerGroup);
  group.add(augerGroup);

  const crown = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.28, 0.95), mats.accent);
  crown.position.y = 4.55;
  group.add(crown);

  const steamDrum = new THREE.Mesh(new THREE.CapsuleGeometry(0.38, 0.85, 6, 12), mats.hullWhite);
  steamDrum.position.set(-1.15, 2.05, 0.85);
  group.add(steamDrum);
}

// ==========================================
// 5. MEDICAL & HEALTH (5 DISTINCT DESIGNS)
// ==========================================

function buildMedicalCore(group: THREE.Group, mats: PodMaterialSet, isGhost: boolean) {
  const body = new THREE.Mesh(new THREE.CylinderGeometry(1.88, 1.98, 1.55, 8), mats.hullWhite);
  body.position.y = 1.82;
  body.castShadow = !isGhost;
  group.add(body);

  const roof = new THREE.Mesh(new THREE.CylinderGeometry(1.45, 1.88, 0.4, 8), mats.hullSlate);
  roof.position.y = 2.8;
  group.add(roof);

  // Raised Medical Cross emblem + rooftop HEPA sterile plenum + exterior O2 manifold + medevac strobe
  const bar1 = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.12, 0.36), mats.accent);
  bar1.position.y = 3.06;
  const bar2 = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.12, 1.1), mats.accent);
  bar2.position.y = 3.06;
  group.add(bar1, bar2);

  const hepaBox = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.36, 0.64), mats.hullSlate);
  hepaBox.position.set(0.75, 2.94, -0.68);
  group.add(hepaBox);

  const medFan = new THREE.Group();
  medFan.position.set(0.75, 3.18, -0.68);
  for (let b = 0; b < 3; b++) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.03, 0.08), mats.cyanGlow);
    blade.rotation.y = (b * Math.PI) / 3;
    medFan.add(blade);
  }
  registerAnimatedPart(group, 'fans', medFan);
  group.add(medFan);

  for (const bx of [-0.28, 0.28]) {
    const tank = new THREE.Mesh(new THREE.CapsuleGeometry(0.14, 0.62, 6, 10), mats.titanium);
    tank.position.set(bx, 1.8, -1.9);
    group.add(tank);
  }
  addExternalManifold(group, mats, 1.85, 1.8, 0, Math.PI / 2);
  addRooftopStrobe(group, mats, -0.9, 2.95, 0.9);
  addRecessedWindows(group, 4, 1.88, 1.88, mats, 0.65, 0.34);
}

function buildMedicalClinic(group: THREE.Group, mats: PodMaterialSet, isGhost: boolean) {
  // Stepped wide outpatient pavilion with wrap-around diagnostic glass ribbon
  const tier1 = new THREE.Mesh(new THREE.BoxGeometry(3.55, 1.1, 3.15), mats.hullWhite);
  tier1.position.y = 1.6;
  tier1.castShadow = !isGhost;
  group.add(tier1);

  const glassBand = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.38, 3.2), mats.interiorGlow);
  glassBand.position.y = 2.0;
  group.add(glassBand);

  const tier2 = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.65, 2.2), mats.hullSlate);
  tier2.position.y = 2.48;
  group.add(tier2);

  // Twin side medical O2 cylinders + sterile HVAC air-handler rotor
  for (const oz of [-0.55, 0.55]) {
    const bottle = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.85, 6, 10), mats.accent);
    bottle.position.set(1.5, 2.6, oz);
    group.add(bottle);
  }

  const hvacFan = new THREE.Group();
  hvacFan.position.set(-0.4, 2.88, 0);
  for (let b = 0; b < 3; b++) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.03, 0.1), mats.cyanGlow);
    blade.rotation.y = (b * Math.PI) / 3;
    hvacFan.add(blade);
  }
  registerAnimatedPart(group, 'fans', hvacFan);
  group.add(hvacFan);
  addRooftopStrobe(group, mats, 0.55, 2.86, 0.65);
}

function buildSurgeryHyperbaric(group: THREE.Group, mats: PodMaterialSet, isGhost: boolean) {
  // Cleanroom operating dome + protruding cylindrical hyperbaric recompression chamber + robotic surgical boom
  const domeBase = new THREE.Mesh(new THREE.CylinderGeometry(1.55, 1.68, 1.15, 16), mats.hullWhite);
  domeBase.position.set(-0.35, 1.62, 0);
  domeBase.castShadow = !isGhost;
  group.add(domeBase);

  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(1.52, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.5),
    mats.glass
  );
  dome.position.set(-0.35, 2.2, 0);
  dome.renderOrder = 2;
  group.add(dome);

  const surgicalArm = new THREE.Group();
  surgicalArm.position.set(-0.35, 2.35, 0);
  const boom = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.72, 0.12), mats.titanium);
  boom.position.y = 0.36;
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), mats.cyanGlow);
  lamp.position.y = 0.72;
  surgicalArm.add(boom, lamp);
  registerGantryPart(group, surgicalArm, 'rz', 0, 0.38, 1.05);
  group.add(surgicalArm);

  // Hyperbaric pressure vessel protruding starboard
  const lock = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 1.9, 18), mats.titanium);
  lock.rotation.z = Math.PI / 2;
  lock.position.set(0.95, 1.85, 0);
  lock.castShadow = !isGhost;
  group.add(lock);

  const lockRing = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.06, 8, 18), mats.accent);
  lockRing.rotation.y = Math.PI / 2;
  lockRing.position.set(1.55, 1.85, 0);
  group.add(lockRing);
}

function buildPharmaBioReactor(group: THREE.Group, mats: PodMaterialSet, isGhost: boolean) {
  // Cleanroom bay with glass roof revealing 4 stainless microfluidic bioreactor vats + spinning agitators
  const box = new THREE.Mesh(new THREE.BoxGeometry(3.3, 1.1, 3.0), mats.hullWhite);
  box.position.y = 1.6;
  box.castShadow = !isGhost;
  group.add(box);

  for (const [vx, vz] of [[-0.65, -0.6], [0.65, -0.6], [-0.65, 0.6], [0.65, 0.6]]) {
    const vat = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.95, 14), mats.titanium);
    vat.position.set(vx, 2.45, vz);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.35, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.5), mats.accent);
    cap.position.set(vx, 2.92, vz);
    group.add(vat, cap);

    const agitator = new THREE.Group();
    agitator.position.set(vx, 3.24, vz);
    const paddle = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.04, 0.08), mats.cyanGlow);
    agitator.add(paddle);
    registerAnimatedPart(group, 'spinners', agitator);
    group.add(agitator);
  }

  const enclosure = new THREE.Mesh(new THREE.BoxGeometry(2.65, 1.15, 2.45), mats.glass);
  enclosure.position.y = 2.7;
  enclosure.renderOrder = 2;
  group.add(enclosure);
}

function buildIsolationBSL4(group: THREE.Group, mats: PodMaterialSet, isGhost: boolean) {
  // Negative-pressure BSL-4 ward with caution band & tall plasma incinerator exhaust stack + fan
  const ward = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.55, 2.85), mats.hullSlate);
  ward.position.y = 1.82;
  ward.castShadow = !isGhost;
  group.add(ward);

  const bioBand = new THREE.Mesh(new THREE.BoxGeometry(3.26, 0.18, 2.91), mats.caution);
  bioBand.position.y = 2.35;
  group.add(bioBand);

  // Tall HEPA plasma incinerator chimney + spinning exhaust fan
  const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.36, 1.8, 12), mats.hullDark);
  stack.position.set(-0.95, 3.45, -0.65);
  group.add(stack);

  const plasmaRing = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.05, 8, 16), mats.accent);
  plasmaRing.rotation.x = Math.PI / 2;
  plasmaRing.position.set(-0.95, 4.1, -0.65);
  group.add(plasmaRing);

  const exhaustFan = new THREE.Group();
  exhaustFan.position.set(-0.95, 4.38, -0.65);
  for (let b = 0; b < 3; b++) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.03, 0.08), mats.amberGlow);
    blade.rotation.y = (b * Math.PI) / 3;
    exhaustFan.add(blade);
  }
  registerAnimatedPart(group, 'fans', exhaustFan);
  group.add(exhaustFan);
  addRooftopStrobe(group, mats, 0.95, 2.65, 0.85);
}

// ==========================================
// 6. SCIENCE & OBSERVATION (8 DISTINCT DESIGNS)
// ==========================================

function buildObservatory(group: THREE.Group, mats: PodMaterialSet, isGhost: boolean) {
  const pier = new THREE.Mesh(new THREE.CylinderGeometry(1.75, 1.9, 1.45, 20), mats.hullWhite);
  pier.position.y = 1.78;
  pier.castShadow = !isGhost;
  group.add(pier);

  const domeGroup = new THREE.Group();
  domeGroup.position.y = 2.48;

  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(1.72, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.52),
    mats.hullSlate
  );
  dome.castShadow = !isGhost;
  domeGroup.add(dome);

  const shutter = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.85, 1.15), mats.hullDark);
  shutter.position.set(0, 0.87, 0.95);
  shutter.rotation.x = -0.45;
  domeGroup.add(shutter);

  const scopeBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 1.6, 16), mats.titanium);
  scopeBarrel.position.set(0, 1.07, 1.25);
  scopeBarrel.rotation.x = Math.PI / 3;
  domeGroup.add(scopeBarrel);

  const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.05, 16), mats.cyanGlow);
  lens.position.set(0, 1.44, 1.9);
  lens.rotation.x = Math.PI / 3;
  domeGroup.add(lens);

  // Coaxial guide-scope tube + slotted dome ribs
  const guideScope = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.0, 10), mats.goldFoil);
  guideScope.position.set(0.35, 1.08, 1.15);
  guideScope.rotation.x = Math.PI / 3;
  domeGroup.add(guideScope);

  for (const sx of [-0.4, 0.4]) {
    const archRib = new THREE.Mesh(new THREE.TorusGeometry(1.74, 0.035, 6, 20, Math.PI * 0.5), mats.titanium);
    archRib.position.x = sx;
    archRib.rotation.y = Math.PI / 2;
    domeGroup.add(archRib);
  }

  registerAnimatedPart(group, 'dishes', domeGroup);
  group.add(domeGroup);
}

function buildScienceLab(group: THREE.Group, mats: PodMaterialSet, isGhost: boolean) {
  const mainCylinder = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.25, 3.5, 20), mats.hullWhite);
  mainCylinder.rotation.z = Math.PI / 2;
  mainCylinder.position.y = 2.05;
  mainCylinder.castShadow = !isGhost;
  group.add(mainCylinder);

  for (const sx of [-1.75, 1.75]) {
    const endCap = new THREE.Mesh(
      new THREE.SphereGeometry(1.25, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.5),
      mats.hullSlate
    );
    endCap.rotation.z = sx > 0 ? -Math.PI / 2 : Math.PI / 2;
    endCap.position.set(sx, 2.05, 0);
    group.add(endCap);
  }

  const band = new THREE.Mesh(new THREE.CylinderGeometry(1.28, 1.28, 0.22, 20), mats.accent);
  band.rotation.z = Math.PI / 2;
  band.position.y = 2.05;
  group.add(band);

  const skylight = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.28, 0.75), mats.glass);
  skylight.position.set(0, 3.28, 0);
  group.add(skylight);

  // Rotating roof-mounted micro-centrifuge optical pod
  const centrifuge = new THREE.Group();
  centrifuge.position.set(0, 3.56, 0);
  const rotorDisc = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.1, 8), mats.titanium);
  const rotorArm = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.08, 0.14), mats.cyanGlow);
  centrifuge.add(rotorDisc, rotorArm);
  registerAnimatedPart(group, 'spinners', centrifuge);
  group.add(centrifuge);
}

function buildSoilLab(group: THREE.Group, mats: PodMaterialSet, isGhost: boolean) {
  // Mineralogy sample lab with exterior spinning rotary sieve carousel & CheMin X-ray analyzer box
  const lab = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.45, 2.9), mats.hullWhite);
  lab.position.set(-0.45, 1.78, 0);
  lab.castShadow = !isGhost;
  group.add(lab);

  const carousel = new THREE.Group();
  carousel.position.set(1.25, 1.45, 0);
  const carouselDisc = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.78, 0.45, 8), mats.hullDark);
  const carouselCross = new THREE.Mesh(new THREE.BoxGeometry(1.38, 0.12, 0.16), mats.accent);
  carouselCross.position.y = 0.22;
  carousel.add(carouselDisc, carouselCross);
  registerAnimatedPart(group, 'spinners', carousel);
  group.add(carousel);

  const sieveHopper = new THREE.Mesh(new THREE.ConeGeometry(0.55, 0.85, 12), mats.goldFoil);
  sieveHopper.rotation.x = Math.PI;
  sieveHopper.position.set(1.25, 2.25, 0);
  group.add(sieveHopper);

  const xrayBox = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.55, 1.4), mats.accent);
  xrayBox.position.set(-0.45, 2.75, 0);
  group.add(xrayBox);
}

function buildGeologyLab(group: THREE.Group, mats: PodMaterialSet, isGhost: boolean) {
  // Field geology octagon with exterior rock-core rack + oscillating Raman laser arm + beacon
  const oct = new THREE.Mesh(new THREE.CylinderGeometry(1.65, 1.8, 1.4, 8), mats.hullSlate);
  oct.position.y = 1.75;
  oct.castShadow = !isGhost;
  group.add(oct);

  // Exterior basalt core-sample rack
  for (let i = 0; i < 3; i++) {
    const core = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.95, 8), mats.regolithShield);
    core.position.set(-1.3 + i * 0.28, 2.85, -0.7);
    group.add(core);
  }

  // Oscillating Raman laser scanner arm over rock-core rack
  const laserArm = new THREE.Group();
  laserArm.position.set(-1.02, 3.45, -0.7);
  const laserHead = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.12, 0.16), mats.cyanGlow);
  laserArm.add(laserHead);
  registerGantryPart(group, laserArm, 'rx', 0, 0.45, 1.4);
  group.add(laserArm);

  // Seismic sensor tripod mast on deck edge
  const seis = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.48, 0.55, 10), mats.goldFoil);
  seis.position.set(1.15, 2.72, 0.65);
  group.add(seis);

  addRooftopStrobe(group, mats, 1.15, 2.98, 0.65);
}

function buildBiologyLab(group: THREE.Group, mats: PodMaterialSet, isGhost: boolean) {
  // Double-bubble bio-containment lab with twin spinning orbital petri shakers under glass domes
  const deck = new THREE.Mesh(new THREE.BoxGeometry(3.45, 0.9, 2.8), mats.hullWhite);
  deck.position.y = 1.5;
  deck.castShadow = !isGhost;
  group.add(deck);

  for (const dx of [-0.85, 0.85]) {
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(0.78, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.5),
      mats.glass
    );
    dome.position.set(dx, 1.95, 0);
    dome.renderOrder = 2;
    group.add(dome);

    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.78, 0.05, 8, 20), mats.accent);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(dx, 1.96, 0);
    group.add(ring);

    const shaker = new THREE.Group();
    shaker.position.set(dx, 2.04, 0);
    const petri = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.16, 8), mats.foliage);
    const dishCross = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.06, 0.12), mats.cyanGlow);
    dishCross.position.y = 0.09;
    shaker.add(petri, dishCross);
    registerAnimatedPart(group, 'spinners', shaker);
    group.add(shaker);
  }
}

function buildWeatherMast(group: THREE.Group, mats: PodMaterialSet, isGhost: boolean) {
  const base = new THREE.Mesh(new THREE.CylinderGeometry(1.45, 1.65, 1.15, 8), mats.hullWhite);
  base.position.y = 1.62;
  base.castShadow = !isGhost;
  group.add(base);

  // Open 4-strut tapered lattice mast
  for (const [mx, mz] of [[-0.35, -0.35], [0.35, -0.35], [-0.35, 0.35], [0.35, 0.35]]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.055, 2.85, 6), mats.titanium);
    leg.position.set(mx * 0.72, 3.45, mz * 0.72);
    leg.rotation.z = mx > 0 ? 0.07 : -0.07;
    leg.rotation.x = mz > 0 ? -0.07 : 0.07;
    group.add(leg);
  }

  // Spinning cross-arm cup anemometer
  const spinnerGroup = new THREE.Group();
  spinnerGroup.position.y = 4.45;
  const arm = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.07, 0.07), mats.hullDark);
  spinnerGroup.add(arm);
  for (const ax of [-0.9, 0.9]) {
    const cup = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 10), mats.accent);
    cup.position.set(ax, 0.08, 0);
    spinnerGroup.add(cup);
  }
  registerAnimatedPart(group, 'spinners', spinnerGroup);
  group.add(spinnerGroup);

  const lidarDome = new THREE.Mesh(new THREE.SphereGeometry(0.32, 14, 10), mats.cyanGlow);
  lidarDome.position.y = 4.98;
  group.add(lidarDome);
}

function buildRadiationStation(group: THREE.Group, mats: PodMaterialSet, isGhost: boolean) {
  // Polyethylene-skirted dosimetry hub with triple skyward particle telescopes & spinning gyro ring
  const skirt = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.95, 1.1, 6), mats.hullDark);
  skirt.position.y = 1.6;
  skirt.castShadow = !isGhost;
  group.add(skirt);

  const tepcSphere = new THREE.Mesh(new THREE.SphereGeometry(0.55, 16, 12), mats.goldFoil);
  tepcSphere.position.y = 2.6;
  group.add(tepcSphere);

  const gyroRing = new THREE.Group();
  gyroRing.position.y = 2.6;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.88, 0.05, 8, 20), mats.cyanGlow);
  ring.rotation.x = 0.65;
  gyroRing.add(ring);
  registerAnimatedPart(group, 'spinners', gyroRing);
  group.add(gyroRing);

  for (let i = 0; i < 3; i++) {
    const a = (i * Math.PI * 2) / 3;
    const scope = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 1.35, 12), mats.titanium);
    scope.position.set(Math.cos(a) * 0.9, 2.75, Math.sin(a) * 0.9);
    scope.rotation.z = -Math.cos(a) * 0.45;
    scope.rotation.x = Math.sin(a) * 0.45;
    group.add(scope);
  }
}

function buildSensorDome(group: THREE.Group, mats: PodMaterialSet, isGhost: boolean) {
  // Laser spectrometer turret with rotating optical ring & twin atmospheric sniffer probes
  const body = new THREE.Mesh(new THREE.CylinderGeometry(1.65, 1.75, 1.1, 16), mats.hullWhite);
  body.position.y = 1.6;
  body.castShadow = !isGhost;
  group.add(body);

  const turret = new THREE.Group();
  turret.position.y = 2.45;
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.15, 0.55, 16), mats.hullDark);
  turret.add(ring);
  const laserEye = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.5, 12), mats.cyanGlow);
  laserEye.rotation.x = Math.PI / 2;
  laserEye.position.set(0, 0, 1.05);
  turret.add(laserEye);
  registerAnimatedPart(group, 'dishes', turret);
  group.add(turret);

  for (const sx of [-1.15, 1.15]) {
    const probe = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 1.25, 8), mats.accent);
    probe.position.set(sx, 2.7, -0.7);
    group.add(probe);
  }
}

// ==========================================
// 7. ENGINEERING & MANUFACTURING (6 DISTINCT DESIGNS)
// ==========================================

function buildWorkshop(group: THREE.Group, mats: PodMaterialSet, isGhost: boolean) {
  const hall = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.5, 3.0), mats.hullSlate);
  hall.position.y = 1.8;
  hall.castShadow = !isGhost;
  group.add(hall);

  // Exterior compressed argon welding gas cylinders
  for (let i = 0; i < 3; i++) {
    const bottle = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.95, 6, 10), mats.accent);
    bottle.position.set(-1.35 + i * 0.4, 2.95, -0.85);
    group.add(bottle);
  }

  // Overhead exhaust fume hood + spinning extractor fan + rocking orbital welder turret
  const hood = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.95, 0.65, 4), mats.hullDark);
  hood.rotation.y = Math.PI / 4;
  hood.position.set(0.75, 2.85, 0.25);
  group.add(hood);

  const hoodFan = new THREE.Group();
  hoodFan.position.set(0.75, 3.22, 0.25);
  for (let b = 0; b < 3; b++) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.04, 0.1), mats.amberGlow);
    blade.rotation.y = (b * Math.PI) / 3;
    hoodFan.add(blade);
  }
  registerAnimatedPart(group, 'fans', hoodFan);
  group.add(hoodFan);

  const welderArm = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.16, 0.16), mats.accent);
  welderArm.position.set(-0.25, 2.72, 0.72);
  registerGantryPart(group, welderArm, 'ry', 0, 0.65, 1.5);
  group.add(welderArm);
}

function build3DPrinter(group: THREE.Group, mats: PodMaterialSet, isGhost: boolean) {
  // Glass-fronted SLS/DMLS print bay + sliding laser print-head gantry + twin basalt silos
  const bay = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.75, 2.8), mats.hullDark);
  bay.position.set(-0.65, 1.92, 0);
  bay.castShadow = !isGhost;
  group.add(bay);

  const printGlass = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.25, 0.12), mats.glass);
  printGlass.position.set(-0.65, 1.95, 1.42);
  group.add(printGlass);

  // Sliding SLS laser print head sweeping across the visible glass bay
  const printHead = new THREE.Group();
  printHead.position.set(-0.65, 2.25, 0.9);
  const carriage = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.22, 0.95), mats.titanium);
  const laserBeam = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.08, 0.8), mats.amberGlow);
  laserBeam.position.y = -0.14;
  printHead.add(carriage, laserBeam);
  registerGantryPart(group, printHead, 'x', -0.65, 0.56, 2.4);
  group.add(printHead);

  // Twin vertical basalt powder feed silos
  for (const sz of [-0.65, 0.65]) {
    const silo = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 1.85, 14), mats.titanium);
    silo.position.set(1.15, 2.05, sz);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.5, 0.4, 14), mats.accent);
    cap.position.set(1.15, 3.15, sz);
    group.add(silo, cap);
  }
}

function buildAssemblyLine(group: THREE.Group, mats: PodMaterialSet, isGhost: boolean) {
  // Open-bay gantry fabrication hall with animated articulated robotic arm
  const base = new THREE.Mesh(new THREE.BoxGeometry(3.45, 0.95, 3.1), mats.hullDark);
  base.position.y = 1.52;
  base.castShadow = !isGhost;
  group.add(base);

  // Twin side gantry pillars + overhead bridge beam
  for (const px of [-1.45, 1.45]) {
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.28, 1.95, 2.8), mats.hullSlate);
    pillar.position.set(px, 2.95, 0);
    group.add(pillar);
  }
  const bridge = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.28, 0.55), mats.accent);
  bridge.position.set(0, 3.82, 0);
  group.add(bridge);

  // Articulated swinging delta robot arm
  const armPivot = new THREE.Group();
  armPivot.position.set(0, 3.7, 0);
  const arm1 = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 1.1, 8), mats.titanium);
  arm1.position.set(0, -0.5, 0.15);
  arm1.rotation.x = 0.25;
  const claw = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), mats.amberGlow);
  claw.position.set(0, -1.05, 0.32);
  armPivot.add(arm1, claw);
  registerGantryPart(group, armPivot, 'rz', 0, 0.48, 1.75);
  group.add(armPivot);
}

function buildRoboticsBay(group: THREE.Group, mats: PodMaterialSet, isGhost: boolean) {
  // Covered rover/drone service hangar with sliding inspection lidar & induction charge pad
  const deck = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.75, 3.2), mats.hullSlate);
  deck.position.y = 1.05;
  deck.castShadow = !isGhost;
  group.add(deck);

  for (const pz of [-1.35, 1.35]) {
    const arch = new THREE.Mesh(new THREE.TorusGeometry(1.65, 0.14, 8, 16, Math.PI), mats.hullDark);
    arch.position.set(0, 1.4, pz);
    group.add(arch);
  }

  const roof = new THREE.Mesh(
    new THREE.CylinderGeometry(1.68, 1.68, 2.75, 16, 1, false, 0, Math.PI),
    mats.hullWhite
  );
  roof.rotation.z = Math.PI / 2;
  roof.rotation.y = Math.PI / 2;
  roof.position.y = 1.4;
  group.add(roof);

  // Charge pad beacon
  const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.7, 0.08, 16), mats.caution);
  pad.position.set(0, 1.46, 0);
  group.add(pad);

  // Spinning rooftop autonomous drone lidar mast
  const lidar = new THREE.Group();
  lidar.position.set(0, 3.16, 0);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 0.32, 10), mats.hullDark);
  const bar = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.1, 0.12), mats.cyanGlow);
  bar.position.y = 0.2;
  lidar.add(mast, bar);
  registerAnimatedPart(group, 'spinners', lidar);
  group.add(lidar);
}

function buildISRUPlant(group: THREE.Group, mats: PodMaterialSet, isGhost: boolean) {
  // Molten Regolith Electrolysis crucible tower + cyclone separator + rocking slag crane & fan
  const deck = new THREE.Mesh(new THREE.BoxGeometry(3.3, 1.0, 3.0), mats.hullSlate);
  deck.position.y = 1.15;
  deck.castShadow = !isGhost;
  group.add(deck);

  const smelter = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.94, 1.75, 16), mats.hullDark);
  smelter.position.set(-0.7, 2.5, 0);
  smelter.castShadow = !isGhost;
  group.add(smelter);

  const furnaceGlow = new THREE.Mesh(new THREE.CylinderGeometry(0.78, 0.78, 0.2, 16), mats.amberGlow);
  furnaceGlow.position.set(-0.7, 2.55, 0);
  group.add(furnaceGlow);

  const hopper = new THREE.Mesh(new THREE.ConeGeometry(0.72, 1.25, 14), mats.titanium);
  hopper.rotation.x = Math.PI;
  hopper.position.set(0.85, 2.65, 0);
  group.add(hopper);

  // Rotating cyclone separator auger inside hopper + crucible exhaust fan
  const crusherRotor = new THREE.Group();
  crusherRotor.position.set(0.85, 3.32, 0);
  for (let b = 0; b < 3; b++) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.05, 0.12), mats.accent);
    blade.rotation.y = (b * Math.PI) / 3;
    crusherRotor.add(blade);
  }
  registerAnimatedPart(group, 'fans', crusherRotor);
  group.add(crusherRotor);

  addExternalPipe(
    group,
    [new THREE.Vector3(-0.7, 3.4, 0), new THREE.Vector3(0.1, 3.7, 0), new THREE.Vector3(0.85, 3.25, 0)],
    0.065,
    mats.copper
  );
}

function buildPartsWarehouse(group: THREE.Group, mats: PodMaterialSet, isGhost: boolean) {
  // Tall ASRS automated high-bay storage rack tower with moving vertical lift shuttle
  const tower = new THREE.Mesh(new THREE.BoxGeometry(3.2, 2.35, 2.7), mats.hullWhite);
  tower.position.y = 2.22;
  tower.castShadow = !isGhost;
  group.add(tower);

  for (let rx = -1.1; rx <= 1.1; rx += 0.55) {
    const rib = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.42, 2.84), mats.hullSlate);
    rib.position.set(rx, 2.22, 0);
    group.add(rib);
  }

  const header = new THREE.Mesh(new THREE.BoxGeometry(3.3, 0.18, 2.86), mats.accent);
  header.position.y = 3.35;
  group.add(header);

  // Exterior automated ASRS cargo lift carriage moving up/down along front guide rail
  const liftRail = new THREE.Mesh(new THREE.BoxGeometry(0.18, 2.2, 0.12), mats.titanium);
  liftRail.position.set(0, 2.25, 1.42);
  group.add(liftRail);

  const shuttle = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.34, 0.24), mats.caution);
  shuttle.position.set(0, 2.2, 1.5);
  registerGantryPart(group, shuttle, 'y', 2.25, 0.72, 1.35);
  group.add(shuttle);
  addRooftopStrobe(group, mats, 1.15, 3.45, 0.9);
}

// ==========================================
// 8. TRANSPORT, COMMS, WASTE, STORAGE & SECURITY
// ==========================================

function buildCommDish(group: THREE.Group, mats: PodMaterialSet, isGhost: boolean) {
  const base = new THREE.Mesh(new THREE.CylinderGeometry(1.55, 1.75, 1.25, 12), mats.hullWhite);
  base.position.y = 1.68;
  base.castShadow = !isGhost;
  group.add(base);

  const band = new THREE.Mesh(new THREE.CylinderGeometry(1.65, 1.68, 0.14, 12), mats.accent);
  band.position.y = 1.55;
  group.add(band);

  const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.6, 0.75, 12), mats.hullDark);
  ped.position.y = 2.65;
  group.add(ped);

  // Articulated elevation yoke arms cradling the parabolic reflector
  for (const yx of [-0.48, 0.48]) {
    const yokeArm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.72, 0.22), mats.titanium);
    yokeArm.position.set(yx, 3.05, 0.05);
    group.add(yokeArm);
  }

  const dishPts: THREE.Vector2[] = [];
  for (let i = 0; i <= 12; i++) {
    const r = (i / 12) * 1.58;
    const y = r * r * 0.24;
    dishPts.push(new THREE.Vector2(r, y));
  }
  const dishGeo = new THREE.LatheGeometry(dishPts, 32);
  const dishGroup = new THREE.Group();
  dishGroup.position.set(0, 3.38, 0.15);
  dishGroup.rotation.x = Math.PI * 0.32;

  const dishMat = getOrCreateMaterial('mat_dish_white', () =>
    new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.35, metalness: 0.25, side: THREE.DoubleSide })
  );
  const dish = new THREE.Mesh(dishGeo, isGhost ? mats.hullWhite : dishMat);
  dish.castShadow = !isGhost;
  dishGroup.add(dish);

  const backing = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.32, 0.28, 14), mats.hullDark);
  backing.position.y = -0.14;
  dishGroup.add(backing);

  // Rear parabolic dish structural ribs + Cassegrain sub-reflector cone
  for (let r = 0; r < 6; r++) {
    const rib = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.06, 0.05), mats.titanium);
    rib.position.set(0, 0.05, 0);
    rib.rotation.y = (r * Math.PI) / 6;
    dishGroup.add(rib);
  }

  for (let s = 0; s < 3; s++) {
    const a = (s * Math.PI * 2) / 3;
    addExternalPipe(
      dishGroup,
      [new THREE.Vector3(Math.cos(a) * 1.25, 0.36, Math.sin(a) * 1.25), new THREE.Vector3(0, 1.15, 0)],
      0.03,
      mats.titanium
    );
  }
  const feed = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.2, 0.28, 12), mats.goldFoil);
  feed.position.y = 1.15;
  dishGroup.add(feed);

  const subReflector = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.16, 16), mats.titanium);
  subReflector.rotation.x = Math.PI;
  subReflector.position.y = 1.02;
  dishGroup.add(subReflector);

  // Secondary DSOC 1550nm Optical Laser Terminal turret on deck
  const dsocPod = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.3, 0.42, 12), mats.hullSlate);
  dsocPod.position.set(1.08, 2.48, -0.75);
  const dsocLens = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), mats.cyanGlow);
  dsocLens.position.set(1.08, 2.75, -0.75);
  group.add(dsocPod, dsocLens);

  registerAnimatedPart(group, 'dishes', dishGroup);
  group.add(dishGroup);
}

function buildAirlock(group: THREE.Group, mats: PodMaterialSet, isGhost: boolean) {
  const body = new THREE.Mesh(new THREE.CylinderGeometry(1.55, 1.7, 1.55, 16), mats.hullWhite);
  body.position.y = 1.82;
  body.castShadow = !isGhost;
  group.add(body);

  const vestShape = new THREE.Shape();
  vestShape.moveTo(-0.9, 0);
  vestShape.lineTo(0.9, 0);
  vestShape.lineTo(0.75, 1.35);
  vestShape.lineTo(-0.75, 1.35);
  vestShape.closePath();

  const vestGeo = new THREE.ExtrudeGeometry(vestShape, {
    depth: 1.0,
    bevelEnabled: true,
    bevelThickness: 0.08,
    bevelSize: 0.06,
    bevelSegments: 2,
  });
  const vestibule = new THREE.Mesh(vestGeo, mats.hullSlate);
  vestibule.position.set(0, 1.08, 1.25);
  vestibule.castShadow = !isGhost;
  group.add(vestibule);

  const hatchRing = new THREE.Mesh(new THREE.TorusGeometry(0.52, 0.07, 8, 20), mats.accent);
  hatchRing.position.set(0, 1.75, 2.34);
  group.add(hatchRing);

  const hatchDoor = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 0.08, 18), mats.titanium);
  hatchDoor.rotation.x = Math.PI / 2;
  hatchDoor.position.set(0, 1.75, 2.32);
  group.add(hatchDoor);

  // Dogged rotary pressure handwheel + starboard EVA tool & tether locker
  const wheelRim = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.025, 6, 14), mats.caution);
  wheelRim.position.set(0, 1.75, 2.38);
  group.add(wheelRim);

  const evaLocker = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.62, 0.32), mats.hullDark);
  evaLocker.position.set(1.12, 1.65, 1.48);
  group.add(evaLocker);

  const ramp = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.14, 1.05), mats.hullDark);
  ramp.position.set(0, 0.62, 2.35);
  ramp.rotation.x = 0.35;
  group.add(ramp);

  // Electrostatic dust-repelling portal arch + caution threshold
  const portalArch = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.055, 8, 16, Math.PI), mats.caution);
  portalArch.position.set(0, 1.48, 2.28);
  group.add(portalArch);

  const floodLamp = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.12, 0.16), mats.interiorGlow);
  floodLamp.position.set(0, 2.48, 2.25);
  group.add(floodLamp);

  for (const tx of [-0.55, 0.55]) {
    const tank = new THREE.Mesh(new THREE.CapsuleGeometry(0.24, 0.9, 6, 12), mats.goldFoil);
    tank.rotation.z = Math.PI / 2;
    tank.position.set(tx, 2.82, -0.2);
    group.add(tank);

    const eqSphere = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 10), mats.titanium);
    eqSphere.position.set(tx * 2.1, 2.05, 0.7);
    group.add(eqSphere);
  }

  // Depressurization strobe beacon + dust-purge fan
  const purgeFan = new THREE.Group();
  purgeFan.position.set(0, 2.68, -0.75);
  for (let b = 0; b < 3; b++) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.03, 0.09), mats.cyanGlow);
    blade.rotation.y = (b * Math.PI) / 3;
    purgeFan.add(blade);
  }
  registerAnimatedPart(group, 'fans', purgeFan);
  group.add(purgeFan);
  addRooftopStrobe(group, mats, 0, 2.66, 0.65);
}

function buildSuitportWall(group: THREE.Group, mats: PodMaterialSet, isGhost: boolean) {
  // Dual rear-entry suitport docking wall with 2 EVA suits mounted externally + purge blower
  const hull = new THREE.Mesh(new THREE.BoxGeometry(3.35, 1.65, 2.45), mats.hullWhite);
  hull.position.y = 1.88;
  hull.castShadow = !isGhost;
  group.add(hull);

  const angledPanel = new THREE.Mesh(new THREE.BoxGeometry(2.9, 1.4, 0.35), mats.hullSlate);
  angledPanel.position.set(0, 1.82, 1.25);
  angledPanel.rotation.x = -0.15;
  group.add(angledPanel);

  // Two docked EVA suits standing in exterior suitports
  for (const sx of [-0.72, 0.72]) {
    const suitPack = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.62, 0.28), mats.titanium);
    suitPack.position.set(sx, 1.78, 1.5);
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.28, 6, 10), mats.hullWhite);
    torso.position.set(sx, 1.72, 1.72);
    const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 10), mats.goldFoil);
    helmet.position.set(sx, 2.12, 1.72);
    group.add(suitPack, torso, helmet);
  }

  const purgeBlower = new THREE.Group();
  purgeBlower.position.set(0, 2.76, 0);
  for (let b = 0; b < 3; b++) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.03, 0.1), mats.accent);
    blade.rotation.y = (b * Math.PI) / 3;
    purgeBlower.add(blade);
  }
  registerAnimatedPart(group, 'fans', purgeBlower);
  group.add(purgeBlower);
}

function buildSuitStowage(group: THREE.Group, mats: PodMaterialSet, isGhost: boolean) {
  // Vertical drying locker bays with overhead desiccant manifold + spinning drying turbine
  const hull = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.6, 2.65), mats.hullSlate);
  hull.position.y = 1.85;
  hull.castShadow = !isGhost;
  group.add(hull);

  for (let i = -1; i <= 1; i++) {
    const bay = new THREE.Mesh(new THREE.BoxGeometry(0.78, 1.35, 0.14), mats.hullWhite);
    bay.position.set(i * 0.95, 1.82, 1.35);
    group.add(bay);
  }

  const ventDuct = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 2.5, 12), mats.accent);
  ventDuct.rotation.z = Math.PI / 2;
  ventDuct.position.y = 2.85;
  group.add(ventDuct);

  const dryerFan = new THREE.Group();
  dryerFan.position.set(0, 3.16, 0);
  for (let b = 0; b < 3; b++) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.03, 0.1), mats.cyanGlow);
    blade.rotation.y = (b * Math.PI) / 3;
    dryerFan.add(blade);
  }
  registerAnimatedPart(group, 'fans', dryerFan);
  group.add(dryerFan);
}

function buildGarageBay(group: THREE.Group, mats: PodMaterialSet, isGhost: boolean) {
  const archShape = new THREE.Shape();
  archShape.moveTo(-1.85, 0);
  archShape.lineTo(1.85, 0);
  archShape.lineTo(1.85, 1.35);
  archShape.lineTo(1.25, 2.05);
  archShape.lineTo(-1.25, 2.05);
  archShape.lineTo(-1.85, 1.35);
  archShape.closePath();

  const hangarGeo = new THREE.ExtrudeGeometry(archShape, {
    depth: 3.1,
    bevelEnabled: true,
    bevelThickness: 0.08,
    bevelSize: 0.06,
    bevelSegments: 2,
  });
  hangarGeo.center();

  const hangar = new THREE.Mesh(hangarGeo, mats.hullWhite);
  hangar.position.y = 2.08;
  hangar.castShadow = !isGhost;
  hangar.receiveShadow = !isGhost;
  group.add(hangar);

  for (let s = 0; s < 4; s++) {
    const slat = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.28, 0.08), mats.hullSlate);
    slat.position.set(0, 1.3 + s * 0.34, 1.62);
    group.add(slat);
  }
  const doorHeader = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.14, 0.16), mats.accent);
  doorHeader.position.set(0, 2.58, 1.64);
  group.add(doorHeader);

  // Overhead hoist I-beam & sliding hoist trolley
  const hoistRail = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.72), mats.caution);
  hoistRail.position.set(0, 2.75, 1.72);
  group.add(hoistRail);

  const trolley = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.18, 0.24), mats.accent);
  trolley.position.set(0, 2.6, 1.72);
  registerGantryPart(group, trolley, 'z', 1.72, 0.26, 1.5);
  group.add(trolley);

  for (const fx of [-1.25, 1.25]) {
    const stanchion = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.55, 8), mats.titanium);
    stanchion.position.set(fx, 1.15, 2.22);
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.1, 0.1), mats.interiorGlow);
    lamp.position.set(fx, 1.44, 2.22);
    group.add(stanchion, lamp);
  }

  const ramp = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.16, 1.3), mats.hullDark);
  ramp.position.set(0, 0.68, 2.25);
  ramp.rotation.x = 0.34;
  group.add(ramp);

  // Rooftop Helipad deck + H marking + landing beacon
  const helipad = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.25, 0.12, 16), mats.hullDark);
  helipad.position.set(0, 3.16, -0.1);
  group.add(helipad);

  const hBar1 = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.03, 0.85), mats.accent);
  hBar1.position.set(-0.32, 3.23, -0.1);
  const hBar2 = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.03, 0.85), mats.accent);
  hBar2.position.set(0.32, 3.23, -0.1);
  const hCross = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.03, 0.14), mats.accent);
  hCross.position.set(0, 3.23, -0.1);
  group.add(hBar1, hBar2, hCross);
  addRooftopStrobe(group, mats, 1.05, 3.25, 1.05);
}

function buildVehicleServiceBay(group: THREE.Group, mats: PodMaterialSet, isGhost: boolean) {
  // Drive-through hydraulic gantry bay with sliding bridge crane trolley + spare rover tires
  const pad = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.3, 3.4), mats.hullDark);
  pad.position.y = 0.56;
  group.add(pad);

  for (const px of [-1.45, 1.45]) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(0.42, 1.85, 3.1), mats.hullSlate);
    wall.position.set(px, 1.62, 0);
    wall.castShadow = !isGhost;
    group.add(wall);
  }
  const craneBeam = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.24, 0.45), mats.caution);
  craneBeam.position.set(0, 2.68, 0);
  group.add(craneBeam);

  // Sliding bridge crane hoist trolley traveling left-to-right on X
  const hoistTrolley = new THREE.Group();
  hoistTrolley.position.set(0, 2.46, 0);
  const block = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.28, 0.52), mats.titanium);
  const hook = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 0.45, 8), mats.accent);
  hook.position.y = -0.3;
  hoistTrolley.add(block, hook);
  registerGantryPart(group, hoistTrolley, 'x', 0, 0.88, 1.15);
  group.add(hoistTrolley);

  // Stacked spare mesh rover tires outside
  for (let t = 0; t < 2; t++) {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.24, 16), mats.hullDark);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(-1.82, 1.15 + t * 0.78, 0.65);
    group.add(wheel);
  }
}

function buildLanderCargoPod(group: THREE.Group, mats: PodMaterialSet, isGhost: boolean) {
  // Authentic Starship/Blue Moon heavy cargo lander on 4 splayed legs + thruster bells + slewing crane
  const hull = new THREE.Mesh(new THREE.CylinderGeometry(1.68, 1.82, 1.85, 16), mats.hullWhite);
  hull.position.y = 2.05;
  hull.castShadow = !isGhost;
  group.add(hull);

  const heatRing = new THREE.Mesh(new THREE.CylinderGeometry(1.86, 1.86, 0.22, 16), mats.hullDark);
  heatRing.position.y = 1.2;
  group.add(heatRing);

  // 4 Methalox thruster bells underneath
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2 + Math.PI / 4;
    const bell = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.34, 0.45, 12, 1, true), mats.titanium);
    bell.position.set(Math.cos(a) * 0.72, 0.85, Math.sin(a) * 0.72);
    group.add(bell);
  }

  // Rooftop unloading slewing gantry crane + cargo crate
  const gantryPivot = new THREE.Group();
  gantryPivot.position.set(1.15, 2.98, 0);
  const gantry = new THREE.Mesh(new THREE.BoxGeometry(0.22, 1.35, 0.22), mats.titanium);
  gantry.position.y = 0.6;
  const arm = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.18, 0.18), mats.accent);
  arm.position.set(-0.9, 1.22, 0);
  gantryPivot.add(gantry, arm);
  registerGantryPart(group, gantryPivot, 'ry', 0, 0.65, 0.75);
  group.add(gantryPivot);

  const crate = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.55, 0.9), mats.goldFoil);
  crate.position.set(-0.45, 3.25, 0);
  group.add(crate);
  addRooftopStrobe(group, mats, -1.15, 3.05, 0.85);
}

function buildStorageVariant(
  group: THREE.Group,
  mats: PodMaterialSet,
  isGhost: boolean,
  variant: 'storage' | 'food_storage' | 'seed_vault' | 'exploration_depot' | 'emergency_crate'
) {
  if (variant === 'seed_vault') {
    // Lead-shielded octagonal dewar cryo-bank with rotating cryo distribution manifold
    const vault = new THREE.Mesh(new THREE.CylinderGeometry(1.78, 1.95, 1.5, 8), mats.hullSlate);
    vault.position.y = 1.8;
    vault.castShadow = !isGhost;
    group.add(vault);

    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2;
      const dewar = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.95, 12), mats.titanium);
      dewar.position.set(Math.cos(a) * 0.85, 2.9, Math.sin(a) * 0.85);
      group.add(dewar);
    }
    const lid = new THREE.Group();
    lid.position.y = 3.55;
    const cone = new THREE.Mesh(new THREE.ConeGeometry(1.25, 0.45, 8), mats.accent);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.08, 0.14), mats.cyanGlow);
    bar.position.y = 0.25;
    lid.add(cone, bar);
    registerAnimatedPart(group, 'spinners', lid);
    group.add(lid);
    return;
  }

  if (variant === 'food_storage') {
    // Frosted cryogenic nitrogen food vault with exterior chiller radiator + live fan
    const freezer = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.55, 2.95), mats.hullWhite);
    freezer.position.y = 1.82;
    freezer.castShadow = !isGhost;
    group.add(freezer);

    const chiller = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.55, 1.15), mats.cyanGlow);
    chiller.position.set(0, 2.86, 0);
    group.add(chiller);

    const cryoFan = new THREE.Group();
    cryoFan.position.set(0, 3.22, 0);
    for (let b = 0; b < 3; b++) {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.04, 0.12), mats.titanium);
      blade.rotation.y = (b * Math.PI) / 3;
      cryoFan.add(blade);
    }
    registerAnimatedPart(group, 'fans', cryoFan);
    group.add(cryoFan);
    return;
  }

  // Standard / exploration / emergency cargo bays with sliding ISO gantry trolley + N2 purge bottles
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(3.4, 1.55, 3.0),
    variant === 'emergency_crate' ? mats.hullDark : mats.hullWhite
  );
  body.position.y = 1.82;
  body.castShadow = !isGhost;
  group.add(body);

  for (let rx = -1.2; rx <= 1.2; rx += 0.8) {
    const rib = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.68, 3.16), mats.hullSlate);
    rib.position.set(rx, 1.84, 0);
    group.add(rib);
  }

  for (const cz of [-0.65, 0.65]) {
    const crate = new THREE.Mesh(
      new THREE.BoxGeometry(2.55, 0.52, 0.92),
      variant === 'exploration_depot' ? mats.goldFoil : mats.hullDark
    );
    crate.position.set(0, 2.86, cz);
    group.add(crate);
    const latch = new THREE.Mesh(
      new THREE.BoxGeometry(2.6, 0.08, 0.14),
      variant === 'emergency_crate' ? mats.caution : mats.accent
    );
    latch.position.set(0, 2.86, cz + (cz > 0 ? 0.44 : -0.44));
    group.add(latch);
  }

  // Overhead gantry crane beam + sliding hoist trolley + N2 purge bottles
  for (const gx of [-1.45, 1.45]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.95, 0.14), mats.titanium);
    post.position.set(gx, 3.1, 0);
    group.add(post);
  }
  const beam = new THREE.Mesh(new THREE.BoxGeometry(3.15, 0.14, 0.2), mats.caution);
  beam.position.set(0, 3.58, 0);
  group.add(beam);

  const trolley = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.24, 0.34), mats.accent);
  trolley.position.set(0, 3.48, 0);
  registerGantryPart(group, trolley, 'x', 0, 1.0, 0.95);
  group.add(trolley);

  for (const nx of [-0.35, 0, 0.35]) {
    const n2 = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.55, 6, 8), mats.titanium);
    n2.position.set(nx, 1.75, 1.6);
    group.add(n2);
  }
}

function buildWasteVariant(
  group: THREE.Group,
  mats: PodMaterialSet,
  isGhost: boolean,
  variant: 'waste' | 'waste_sort' | 'compost_reactor' | 'scwo_reactor' | 'plastic_recycler'
) {
  const base = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.1, 2.8), mats.hullSlate);
  base.position.y = 1.6;
  base.castShadow = !isGhost;
  group.add(base);

  if (variant === 'scwo_reactor') {
    // High-pressure twin spherical Supercritical Water Oxidation vessels + oscillating pump bridge
    for (const sx of [-0.85, 0.85]) {
      const vessel = new THREE.Mesh(new THREE.SphereGeometry(0.7, 18, 14), mats.titanium);
      vessel.position.set(sx, 2.75, 0);
      vessel.castShadow = !isGhost;
      group.add(vessel);
      const collar = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.05, 8, 18), mats.amberGlow);
      collar.rotation.x = Math.PI / 2;
      collar.position.set(sx, 2.75, 0);
      group.add(collar);
    }
    const pumpHead = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.25, 0.4), mats.cyanGlow);
    pumpHead.position.set(0, 3.5, 0);
    registerGantryPart(group, pumpHead, 'y', 3.5, 0.14, 4.2);
    group.add(pumpHead);
    return;
  }

  if (variant === 'compost_reactor') {
    // Aerobic rotating green biocomposter cylinder with soil discharge chute + top vent fan
    const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 2.25, 18), mats.foliage);
    drum.rotation.z = Math.PI / 2;
    drum.position.set(0, 2.72, 0);
    drum.castShadow = !isGhost;
    group.add(drum);
    const motor = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.65, 0.65), mats.hullDark);
    motor.position.set(-1.35, 2.72, 0);
    group.add(motor);

    const agitatorFin = new THREE.Group();
    agitatorFin.position.set(1.22, 2.72, 0);
    for (let b = 0; b < 3; b++) {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.72, 0.12), mats.accent);
      blade.rotation.x = (b * Math.PI) / 3;
      agitatorFin.add(blade);
    }
    registerGantryPart(group, agitatorFin, 'rx', 0, 1.4, 2.1);
    group.add(agitatorFin);
    return;
  }

  if (variant === 'plastic_recycler') {
    // Polymer pelletizer + rotating shredder hopper rotor + twin filament extrusion spools
    const shredder = new THREE.Mesh(new THREE.ConeGeometry(0.72, 1.1, 12), mats.titanium);
    shredder.rotation.x = Math.PI;
    shredder.position.set(-0.75, 2.68, 0);
    group.add(shredder);

    const shredRotor = new THREE.Group();
    shredRotor.position.set(-0.75, 3.25, 0);
    for (let b = 0; b < 3; b++) {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.05, 0.14), mats.accent);
      blade.rotation.y = (b * Math.PI) / 3;
      shredRotor.add(blade);
    }
    registerAnimatedPart(group, 'spinners', shredRotor);
    group.add(shredRotor);

    for (const sz of [-0.5, 0.5]) {
      const spool = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.14, 10, 18), mats.accent);
      spool.rotation.y = Math.PI / 2;
      spool.position.set(0.8, 2.65, sz);
      group.add(spool);
    }
    return;
  }

  if (variant === 'waste_sort') {
    // Optical sorting conveyor tunnel hood with sliding cyan laser scanner head
    const hood = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.85, 1.45), mats.hullWhite);
    hood.position.y = 2.55;
    const scanner = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.95, 1.55), mats.cyanGlow);
    scanner.position.y = 2.55;
    registerGantryPart(group, scanner, 'x', 0, 0.95, 1.85);
    group.add(hood, scanner);
    return;
  }

  // Default pyrolytic bio-waste drum with copper heat-exchanger coils + rocking exhaust valve
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 1.85, 20), mats.titanium);
  drum.rotation.z = Math.PI / 2;
  drum.position.set(-0.35, 2.65, 0);
  drum.castShadow = !isGhost;
  group.add(drum);

  for (let i = -2; i <= 2; i++) {
    const coil = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.045, 8, 20), mats.copper);
    coil.rotation.y = Math.PI / 2;
    coil.position.set(-0.35 + i * 0.34, 2.65, 0);
    group.add(coil);
  }

  const hopper = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.32, 1.05, 12), mats.hullDark);
  hopper.position.set(1.05, 2.68, 0);
  group.add(hopper);

  const hopperFan = new THREE.Group();
  hopperFan.position.set(1.05, 3.26, 0);
  for (let b = 0; b < 3; b++) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.04, 0.1), mats.accent);
    blade.rotation.y = (b * Math.PI) / 3;
    hopperFan.add(blade);
  }
  registerAnimatedPart(group, 'fans', hopperFan);
  group.add(hopperFan);
}

function buildSecurityVariant(
  group: THREE.Group,
  mats: PodMaterialSet,
  isGhost: boolean,
  variant: 'bunker' | 'spe_bunker' | 'command_bridge' | 'fire_pod' | 'backup_eclss' | 'disaster_hub'
) {
  if (variant === 'bunker' || variant === 'spe_bunker') {
    const vaultShape = new THREE.Shape();
    vaultShape.moveTo(-2.1, 0);
    vaultShape.lineTo(2.1, 0);
    vaultShape.lineTo(1.45, variant === 'spe_bunker' ? 1.85 : 1.55);
    vaultShape.lineTo(-1.45, variant === 'spe_bunker' ? 1.85 : 1.55);
    vaultShape.closePath();

    const vaultGeo = new THREE.ExtrudeGeometry(vaultShape, {
      depth: 3.4,
      bevelEnabled: true,
      bevelThickness: 0.14,
      bevelSize: 0.12,
      bevelSegments: 2,
    });
    vaultGeo.center();

    const regolithVault = new THREE.Mesh(vaultGeo, mats.regolithShield);
    regolithVault.position.y = variant === 'spe_bunker' ? 1.45 : 1.3;
    regolithVault.castShadow = !isGhost;
    regolithVault.receiveShadow = !isGhost;
    group.add(regolithVault);

    for (const rz of [-1.2, 0, 1.2]) {
      const rib = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.75, 0.18), mats.hullDark);
      rib.position.set(0, 1.35, rz);
      group.add(rib);
    }

    const blastDoor = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.2, 0.25), mats.titanium);
    blastDoor.position.set(0, 1.15, 1.78);
    group.add(blastDoor);

    const stripe = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.12, 0.28), mats.accent);
    stripe.position.set(0, 1.8, 1.78);
    group.add(stripe);

    if (variant === 'spe_bunker') {
      // Water-jacketed overhead radiation shield tank
      const waterTank = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.25, 0.45, 16), mats.cyanGlow);
      waterTank.position.set(0, 2.55, 0);
      group.add(waterTank);
    }
    addRooftopStrobe(group, mats, 0, variant === 'spe_bunker' ? 2.82 : 2.38, 1.15);
    return;
  }

  if (variant === 'fire_pod') {
    const base = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.2, 2.8), mats.hullDark);
    base.position.y = 1.65;
    base.castShadow = !isGhost;
    group.add(base);

    // 4 Red high-pressure nitrogen deluge bottles
    for (const [fx, fz] of [[-0.65, -0.55], [0.65, -0.55], [-0.65, 0.55], [0.65, 0.55]]) {
      const bottle = new THREE.Mesh(new THREE.CapsuleGeometry(0.32, 0.95, 6, 12), mats.accent);
      bottle.position.set(fx, 2.85, fz);
      group.add(bottle);
    }

    const smokeFan = new THREE.Group();
    smokeFan.position.set(0, 2.35, 0);
    for (let b = 0; b < 3; b++) {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.04, 0.1), mats.caution);
      blade.rotation.y = (b * Math.PI) / 3;
      smokeFan.add(blade);
    }
    registerAnimatedPart(group, 'fans', smokeFan);
    group.add(smokeFan);
    addRooftopStrobe(group, mats, 0, 2.38, 1.15);
    return;
  }

  if (variant === 'backup_eclss') {
    const cube = new THREE.Mesh(new THREE.BoxGeometry(3.1, 1.45, 2.9), mats.hullSlate);
    cube.position.y = 1.78;
    cube.castShadow = !isGhost;
    group.add(cube);

    // Chemical O2 candle canister bank + circulation blower
    for (let i = -2; i <= 2; i++) {
      const candle = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.95, 10), mats.goldFoil);
      candle.position.set(i * 0.48, 2.85, 0);
      group.add(candle);
    }
    const circFan = new THREE.Group();
    circFan.position.set(0, 2.58, 1.05);
    for (let b = 0; b < 3; b++) {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.03, 0.1), mats.cyanGlow);
      blade.rotation.y = (b * Math.PI) / 3;
      circFan.add(blade);
    }
    registerAnimatedPart(group, 'fans', circFan);
    group.add(circFan);
    return;
  }

  // Command Bridge or Disaster Monitoring Citadel with rotating rooftop radar array
  const hull = new THREE.Mesh(new THREE.CylinderGeometry(1.85, 2.05, 1.45, 8), mats.hullDark);
  hull.position.y = 1.78;
  hull.castShadow = !isGhost;
  group.add(hull);

  const bridge = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.65, 0.85, 8), mats.hullSlate);
  bridge.position.y = 2.9;
  group.add(bridge);

  addRecessedWindows(group, 8, 1.45, 2.88, mats, 0.44, 0.24);

  const radarArray = new THREE.Group();
  radarArray.position.y = 3.55;
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2 + Math.PI / 4;
    const blade = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, variant === 'disaster_hub' ? 1.05 : 0.72, 0.28),
      variant === 'disaster_hub' ? mats.accent : mats.titanium
    );
    blade.position.set(Math.cos(a) * 0.85, 0.1, Math.sin(a) * 0.85);
    blade.rotation.y = a;
    radarArray.add(blade);
  }
  const radarBar = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.12, 0.22), mats.cyanGlow);
  radarBar.position.y = 0.55;
  radarArray.add(radarBar);
  registerAnimatedPart(group, 'spinners', radarArray);
  group.add(radarArray);
}

// ==========================================
// MAIN POD FACTORY (55+ DISTINCT ARCHITECTURES)
// ==========================================

function selectFoundationStyle(mt: string): BaseStyle {
  if (mt === 'bunker' || mt === 'spe_bunker' || mt === 'garage' || mt === 'veh_service') {
    return 'low_plinth';
  }
  if (
    mt === 'driller' ||
    mt === 'isru_plant' ||
    mt === 'lander_pod' ||
    mt === 'robotics_bay' ||
    mt === 'parts_warehouse' ||
    mt === '3d_printer' ||
    mt === 'assembly'
  ) {
    return 'skid';
  }
  if (
    mt === 'observatory' ||
    mt === 'comm' ||
    mt === 'nuclear' ||
    mt === 'smr_nuclear' ||
    mt === 'atrium_dome' ||
    mt === 'cinema' ||
    mt === 'wellness'
  ) {
    return 'circular';
  }
  return 'octagonal';
}

export function createPodMesh(
  pod: PodDefinition,
  isGhost: boolean = false,
  isValidPlacement: boolean = true
): THREE.Group {
  const group = new THREE.Group();
  group.name = `pod_${pod.id}`;

  const mats = getPodMaterials(pod.colorAccent, isGhost, isValidPlacement);
  const mt = pod.modelType;
  const baseStyle = selectFoundationStyle(mt);

  // 1. Varied Grounded Foundation Platform + Contact Shadow
  addFoundationPlatform(group, mats, isGhost, baseStyle);

  // 2. Specialized, Distinct Architectural Superstructure per Module Type
  switch (mt) {
    // Habitats & Community
    case 'living':
      buildLivingTransHab(group, mats, isGhost);
      break;
    case 'atrium_dome':
      buildAtriumDome(group, mats, isGhost);
      break;
    case 'galley':
      buildGalleyHall(group, mats, isGhost);
      break;
    case 'rec_hall':
      buildRecHall(group, mats, isGhost);
      break;
    case 'cinema':
      buildCinemaDome(group, mats, isGhost);
      break;
    case 'classroom':
      buildClassroomStudio(group, mats, isGhost);
      break;
    case 'library':
      buildLibraryVault(group, mats, isGhost);
      break;
    case 'wellness':
      buildWellnessSanctuary(group, mats, isGhost);
      break;
    case 'gym':
      buildFitnessGym(group, mats, isGhost);
      break;
    case 'food_processing':
      buildFoodProcessing(group, mats, isGhost);
      break;

    // Food & Agriculture
    case 'greenhouse':
      buildGreenhouseTunnel(group, mats, isGhost);
      break;
    case 'hydroponics':
      buildHydroponicsSpire(group, mats, isGhost);
      break;
    case 'aeroponics':
      buildAeroponicsTowers(group, mats, isGhost);
      break;
    case 'plant_research':
      buildPlantResearchLab(group, mats, isGhost);
      break;

    // Energy & Electricity
    case 'nuclear':
      buildKilopowerNuclear(group, mats, isGhost);
      break;
    case 'smr_nuclear':
      buildSMRNuclear(group, mats, isGhost);
      break;
    case 'solar_array':
      buildSolarArray(group, mats, isGhost);
      break;
    case 'battery_bank':
      buildBatteryBank(group, mats, isGhost);
      break;
    case 'transformer':
      buildPowerTransformer(group, mats, isGhost);
      break;
    case 'energy_control':
      buildEnergyControlHub(group, mats, isGhost);
      break;

    // Life Support
    case 'oxygen':
      buildOxygenPlant(group, mats, isGhost);
      break;
    case 'water':
      buildWaterSystem(group, mats, isGhost);
      break;
    case 'water_recovery':
      buildWaterRecovery(group, mats, isGhost);
      break;
    case 'purifier':
      buildUVPurifier(group, mats, isGhost);
      break;
    case 'filter':
      buildAirFilterPod(group, mats, isGhost);
      break;
    case 'radiator':
      buildThermalRadiator(group, mats, isGhost);
      break;
    case 'humidity':
      buildHumidityControl(group, mats, isGhost);
      break;
    case 'co2_scrub':
      buildCO2Scrubber(group, mats, isGhost);
      break;
    case 'driller':
      buildIceDriller(group, mats, isGhost);
      break;

    // Medical & Health
    case 'medical':
      buildMedicalCore(group, mats, isGhost);
      break;
    case 'clinic':
      buildMedicalClinic(group, mats, isGhost);
      break;
    case 'surgery':
      buildSurgeryHyperbaric(group, mats, isGhost);
      break;
    case 'pharma':
      buildPharmaBioReactor(group, mats, isGhost);
      break;
    case 'isolation':
      buildIsolationBSL4(group, mats, isGhost);
      break;

    // Science & Research
    case 'observatory':
      buildObservatory(group, mats, isGhost);
      break;
    case 'science_lab':
      buildScienceLab(group, mats, isGhost);
      break;
    case 'soil_lab':
      buildSoilLab(group, mats, isGhost);
      break;
    case 'geology':
      buildGeologyLab(group, mats, isGhost);
      break;
    case 'biology':
      buildBiologyLab(group, mats, isGhost);
      break;
    case 'weather_mast':
      buildWeatherMast(group, mats, isGhost);
      break;
    case 'radiation_sensor':
      buildRadiationStation(group, mats, isGhost);
      break;
    case 'sensor_dome':
      buildSensorDome(group, mats, isGhost);
      break;

    // Engineering & Manufacturing
    case 'workshop':
      buildWorkshop(group, mats, isGhost);
      break;
    case '3d_printer':
      build3DPrinter(group, mats, isGhost);
      break;
    case 'assembly':
      buildAssemblyLine(group, mats, isGhost);
      break;
    case 'robotics_bay':
      buildRoboticsBay(group, mats, isGhost);
      break;
    case 'isru_plant':
      buildISRUPlant(group, mats, isGhost);
      break;
    case 'parts_warehouse':
      buildPartsWarehouse(group, mats, isGhost);
      break;

    // Transport, Comms, Storage & Security
    case 'comm':
      buildCommDish(group, mats, isGhost);
      break;
    case 'airlock':
      buildAirlock(group, mats, isGhost);
      break;
    case 'suitport':
      buildSuitportWall(group, mats, isGhost);
      break;
    case 'suit_stowage':
      buildSuitStowage(group, mats, isGhost);
      break;
    case 'garage':
      buildGarageBay(group, mats, isGhost);
      break;
    case 'veh_service':
      buildVehicleServiceBay(group, mats, isGhost);
      break;
    case 'lander_pod':
      buildLanderCargoPod(group, mats, isGhost);
      break;
    case 'storage':
    case 'food_storage':
    case 'seed_vault':
    case 'exploration_depot':
    case 'emergency_crate':
      buildStorageVariant(group, mats, isGhost, mt);
      break;
    case 'waste':
    case 'waste_sort':
    case 'compost_reactor':
    case 'scwo_reactor':
    case 'plastic_recycler':
      buildWasteVariant(group, mats, isGhost, mt);
      break;
    case 'bunker':
    case 'spe_bunker':
    case 'command_bridge':
    case 'fire_pod':
    case 'backup_eclss':
    case 'disaster_hub':
      buildSecurityVariant(group, mats, isGhost, mt);
      break;
    default:
      buildLivingTransHab(group, mats, isGhost);
      break;
  }

  // 3. Standardized Airtight Connection Port Collars (4 cardinal axes)
  addAirlockPorts(group, mats, baseStyle === 'low_plinth' || baseStyle === 'skid' ? 1.18 : 1.38);

  return group;
}

// ==========================================
// CONNECTION TUNNELS
// ==========================================

export function createConnectionTunnelMesh(
  x1: number,
  z1: number,
  x2: number,
  z2: number
): THREE.Group {
  const group = new THREE.Group();
  group.name = 'tunnel_connector';

  const midX = (x1 + x2) / 2;
  const midZ = (z1 + z2) / 2;
  const length = Math.hypot(x2 - x1, z2 - z1);
  const angle = Math.atan2(x2 - x1, z2 - z1);

  const hullMat = getOrCreateMaterial('tunnelHull_v2', () =>
    new THREE.MeshStandardMaterial({
      color: 0x475569,
      metalness: 0.55,
      roughness: 0.38,
    })
  );

  const ringMat = getOrCreateMaterial('tunnelRing_v2', () =>
    new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.82,
      roughness: 0.26,
    })
  );

  const trimMat = getOrCreateMaterial('tunnelTrim_v2', () =>
    new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      metalness: 0.4,
      roughness: 0.4,
    })
  );

  const glowMat = getOrCreateMaterial('tunnelGlow_v2', () =>
    new THREE.MeshStandardMaterial({
      color: 0xf6e6c2,
      emissive: 0xe6c382,
      emissiveIntensity: 0.28,
      roughness: 0.4,
    })
  );

  const copperMat = getOrCreateMaterial('tunnelCopper_v2', () =>
    new THREE.MeshStandardMaterial({
      color: 0xc86f3c,
      metalness: 0.86,
      roughness: 0.24,
    })
  );

  const span = Math.max(0.5, length - 4.0);
  const tubeGeo = new THREE.CylinderGeometry(0.45, 0.45, span, 22);
  const tube = new THREE.Mesh(tubeGeo, hullMat);
  tube.rotation.x = Math.PI / 2;
  tube.castShadow = true;
  tube.receiveShadow = true;
  group.add(tube);

  // Dorsal pressurized cable tray + parallel power/coolant conduits
  const spine = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.1, span), trimMat);
  spine.position.y = 0.48;
  group.add(spine);

  const conduit = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, span, 8), hullMat);
  conduit.rotation.x = Math.PI / 2;
  conduit.position.set(0.32, 0.36, 0);
  group.add(conduit);

  const coolantLine = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, span, 8), copperMat);
  coolantLine.rotation.x = Math.PI / 2;
  coolantLine.position.set(-0.32, 0.36, 0);
  group.add(coolantLine);

  // Recessed warm viewport porthole slits on both tunnel flanks
  for (const sx of [-0.45, 0.45]) {
    const porthole = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.14, span * 0.42), glowMat);
    porthole.position.set(sx, 0.04, 0);
    group.add(porthole);
  }

  // Accordion flex-bellows ribs + bolted end bulkhead collars
  const ribCount = 4;
  for (let i = 0; i < ribCount; i++) {
    const offset = ((i - (ribCount - 1) / 2) * span) / ribCount;
    const rib = new THREE.Mesh(new THREE.TorusGeometry(0.49, 0.055, 8, 22), ringMat);
    rib.position.z = offset;
    group.add(rib);
  }

  for (const ez of [-span * 0.46, span * 0.46]) {
    const bulkhead = new THREE.Mesh(new THREE.TorusGeometry(0.51, 0.065, 8, 22), trimMat);
    bulkhead.position.z = ez;
    group.add(bulkhead);
  }

  // Ground-anchored support stanchions & footpads with lateral sway braces
  for (const sz of [-span * 0.3, span * 0.3]) {
    const cradle = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.14, 0.18), ringMat);
    cradle.position.set(0, -0.45, sz);
    group.add(cradle);

    const crossbar = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.06, 0.06), trimMat);
    crossbar.position.set(0, -0.88, sz);
    group.add(crossbar);

    for (const sx of [-0.32, 0.32]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.06, 0.92, 8), ringMat);
      leg.position.set(sx, -0.9, sz);
      leg.castShadow = true;
      group.add(leg);
      const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.19, 0.08, 8), hullMat);
      pad.position.set(sx, -1.3, sz);
      group.add(pad);
    }
  }

  group.position.set(midX, 1.32, midZ);
  group.rotation.y = angle;

  return group;
}

// ==========================================
// ROVER, ASTRONAUT, HELICOPTER, SPACECRAFT
// ==========================================

export function createRoverMesh(): THREE.Group {
  const rover = new THREE.Group();
  rover.name = 'mars_rover';

  const bodyMat = getOrCreateMaterial('roverBody_v4', () =>
    new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      map: createHullPanelTexture(),
      metalness: 0.3,
      roughness: 0.38,
    })
  );
  const goldMat = getOrCreateMaterial('roverGold_v4', () =>
    new THREE.MeshPhysicalMaterial({
      color: 0xd99b26,
      bumpMap: createKaptonBumpTexture(),
      bumpScale: 0.03,
      metalness: 0.94,
      roughness: 0.2,
      clearcoat: 0.4,
    })
  );
  const chassisMat = getOrCreateMaterial('roverChassis_v4', () =>
    new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.85, roughness: 0.25 })
  );
  const wheelMat = getOrCreateMaterial('roverWheel_v4', () =>
    new THREE.MeshStandardMaterial({ color: 0x2c3748, metalness: 0.72, roughness: 0.52 })
  );
  const lensMat = getOrCreateMaterial('roverLens_v4', () =>
    new THREE.MeshPhysicalMaterial({ color: 0x1e3a5f, metalness: 0.2, roughness: 0.08, clearcoat: 1.0 })
  );

  const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.44, 1.58), bodyMat);
  chassis.position.y = 0.66;
  chassis.castShadow = true;
  rover.add(chassis);

  const belly = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.16, 1.35), goldMat);
  belly.position.y = 0.42;
  rover.add(belly);

  const deck = new THREE.Mesh(new THREE.BoxGeometry(1.24, 0.06, 1.68), chassisMat);
  deck.position.y = 0.91;
  rover.add(deck);

  // High-Gain Parabolic Dish + UHF Whip Antenna
  const hga = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.08, 0.08, 16), bodyMat);
  hga.position.set(-0.32, 1.08, -0.45);
  hga.rotation.x = -0.35;
  rover.add(hga);

  const uhf = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.015, 0.62, 6), chassisMat);
  uhf.position.set(0.45, 1.24, -0.58);
  rover.add(uhf);

  // Finned Rear MMRTG nuclear power pack
  const rtg = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 0.58, 10), chassisMat);
  rtg.rotation.x = Math.PI * 0.35;
  rtg.position.set(0, 0.84, -0.94);
  rover.add(rtg);
  for (let f = 0; f < 4; f++) {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.42, 0.03), chassisMat);
    fin.position.set(0, 0.84, -0.94);
    fin.rotation.set(Math.PI * 0.35, 0, (f * Math.PI) / 4);
    rover.add(fin);
  }

  // ChemCam / Mastcam-Z stereo optical head
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.055, 0.8, 10), bodyMat);
  mast.position.set(0.32, 1.3, 0.48);
  rover.add(mast);

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.15, 0.22), bodyMat);
  head.position.set(0.32, 1.7, 0.48);
  rover.add(head);

  for (const ex of [0.24, 0.4]) {
    const eye = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.06, 10), lensMat);
    eye.rotation.x = Math.PI / 2;
    eye.position.set(ex, 1.7, 0.59);
    rover.add(eye);
  }

  // Rocker-Bogie Differential Cross-Beam & Side Links
  for (const sx of [-0.62, 0.62]) {
    const rockerBar = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.06, 1.26), chassisMat);
    rockerBar.position.set(sx, 0.54, 0);
    rover.add(rockerBar);
  }

  // Six Rocker-Bogie Grooved Titanium Wheels
  const wheelGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.19, 16);
  const treadRingGeo = new THREE.TorusGeometry(0.24, 0.025, 6, 16);
  const hubGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.21, 10);
  const wheelOffsets = [
    [-0.76, 0.24, 0.62],
    [0.76, 0.24, 0.62],
    [-0.82, 0.24, 0.0],
    [0.82, 0.24, 0.0],
    [-0.76, 0.24, -0.62],
    [0.76, 0.24, -0.62],
  ];

  for (const [wx, wy, wz] of wheelOffsets) {
    const wheel = new THREE.Mesh(wheelGeo, wheelMat);
    wheel.position.set(wx, wy, wz);
    wheel.rotation.z = Math.PI / 2;
    wheel.castShadow = true;
    rover.add(wheel);

    const tread = new THREE.Mesh(treadRingGeo, chassisMat);
    tread.position.set(wx, wy, wz);
    tread.rotation.y = Math.PI / 2;
    rover.add(tread);

    const hub = new THREE.Mesh(hubGeo, goldMat);
    hub.position.set(wx, wy, wz);
    hub.rotation.z = Math.PI / 2;
    rover.add(hub);

    const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.44, 6), chassisMat);
    strut.position.set(wx * 0.75, 0.44, wz);
    strut.rotation.z = wx > 0 ? 0.55 : -0.55;
    rover.add(strut);
  }

  // Front Articulated Robotic Coring Arm
  const arm1 = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.55, 8), chassisMat);
  arm1.position.set(-0.25, 0.55, 0.92);
  arm1.rotation.x = Math.PI / 3;
  rover.add(arm1);

  const turretTool = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.14, 8), goldMat);
  turretTool.position.set(-0.25, 0.35, 1.2);
  rover.add(turretTool);

  rover.scale.set(0.88, 0.88, 0.88);
  return rover;
}

export function createAstronautMesh(suitAccentColor: number | string = 0xe05a36): THREE.Group {
  const astronaut = new THREE.Group();
  astronaut.name = 'astronaut_eva';

  const suitMat = getOrCreateMaterial('astroSuit_v3', () =>
    new THREE.MeshStandardMaterial({ color: 0xedf1f7, roughness: 0.62, metalness: 0.08 })
  );
  const visorMat = getOrCreateMaterial('astroVisor_v3', () =>
    new THREE.MeshPhysicalMaterial({
      color: 0xd99b26,
      metalness: 0.96,
      roughness: 0.05,
      clearcoat: 1.0,
    })
  );
  const packMat = getOrCreateMaterial('astroPack_v3', () =>
    new THREE.MeshStandardMaterial({ color: 0x2a3342, roughness: 0.42, metalness: 0.58 })
  );
  const titaniumMat = getOrCreateMaterial('astroTi_v3', () =>
    new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.28, metalness: 0.85 })
  );
  const accentMat = new THREE.MeshStandardMaterial({ color: suitAccentColor, roughness: 0.48 });

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.28, 6, 12), suitMat);
  torso.position.y = 0.68;
  torso.castShadow = true;
  astronaut.add(torso);

  // Waist bearing seal ring
  const waistRing = new THREE.Mesh(new THREE.TorusGeometry(0.21, 0.025, 6, 16), titaniumMat);
  waistRing.rotation.x = Math.PI / 2;
  waistRing.position.y = 0.52;
  astronaut.add(waistRing);

  // Chest Display & Control Module (DCM)
  const dcm = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.14, 0.08), packMat);
  dcm.position.set(0, 0.72, 0.21);
  astronaut.add(dcm);

  const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.04, 0.09), accentMat);
  stripe.position.set(0, 0.75, 0.215);
  astronaut.add(stripe);

  // Helmet & Neck Disconnect Collar
  const neckRing = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.025, 6, 16), titaniumMat);
  neckRing.rotation.x = Math.PI / 2;
  neckRing.position.y = 0.92;
  astronaut.add(neckRing);

  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.21, 16, 16), suitMat);
  helmet.position.y = 1.08;
  helmet.castShadow = true;
  astronaut.add(helmet);

  const visor = new THREE.Mesh(
    new THREE.SphereGeometry(0.175, 14, 12, 0, Math.PI * 2, 0, Math.PI * 0.52),
    visorMat
  );
  visor.position.set(0, 1.08, 0.065);
  visor.rotation.x = Math.PI * 0.36;
  astronaut.add(visor);

  // PLSS Backpack with Twin O2 Tanks + Whip Antenna
  const pack = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.44, 0.2), packMat);
  pack.position.set(0, 0.72, -0.22);
  pack.castShadow = true;
  astronaut.add(pack);

  for (const tx of [-0.09, 0.09]) {
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.36, 10), titaniumMat);
    tank.position.set(tx, 0.72, -0.32);
    astronaut.add(tank);
  }

  const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.012, 0.32, 6), packMat);
  ant.position.set(0.11, 1.08, -0.26);
  astronaut.add(ant);

  const armGeo = new THREE.CapsuleGeometry(0.068, 0.28, 4, 8);
  const leftArm = new THREE.Mesh(armGeo, suitMat);
  leftArm.position.set(-0.31, 0.64, 0);
  leftArm.rotation.z = Math.PI * 0.08;
  astronaut.add(leftArm);

  const rightArm = new THREE.Mesh(armGeo, suitMat);
  rightArm.position.set(0.31, 0.64, 0);
  rightArm.rotation.z = -Math.PI * 0.08;
  astronaut.add(rightArm);

  const legGeo = new THREE.CapsuleGeometry(0.08, 0.3, 4, 8);
  const leftLeg = new THREE.Mesh(legGeo, suitMat);
  leftLeg.position.set(-0.12, 0.25, 0);
  astronaut.add(leftLeg);

  const rightLeg = new THREE.Mesh(legGeo, suitMat);
  rightLeg.position.set(0.12, 0.25, 0);
  astronaut.add(rightLeg);

  const bootGeo = new THREE.BoxGeometry(0.14, 0.1, 0.22);
  const leftBoot = new THREE.Mesh(bootGeo, packMat);
  leftBoot.position.set(-0.12, 0.05, 0.04);
  astronaut.add(leftBoot);

  const rightBoot = new THREE.Mesh(bootGeo, packMat);
  rightBoot.position.set(0.12, 0.05, 0.04);
  astronaut.add(rightBoot);

  astronaut.scale.set(0.88, 0.88, 0.88);
  return astronaut;
}

export function createMarsHelicopterMesh(): THREE.Group {
  const heli = new THREE.Group();
  heli.name = 'mars_helicopter';

  const bodyMat = getOrCreateMaterial('heliBody_v3', () =>
    new THREE.MeshPhysicalMaterial({
      color: 0xd99b26,
      bumpMap: createKaptonBumpTexture(),
      bumpScale: 0.03,
      metalness: 0.92,
      roughness: 0.22,
      clearcoat: 0.4,
    })
  );
  const solarMat = getOrCreateMaterial('heliSolar_v3', () =>
    new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      map: createSolarCellTexture(),
      metalness: 0.72,
      roughness: 0.14,
      clearcoat: 0.9,
    })
  );
  const rotorMat = getOrCreateMaterial('heliRotor_v3', () =>
    new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.65, roughness: 0.3 })
  );
  const legMat = getOrCreateMaterial('heliLeg_v3', () =>
    new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.85, roughness: 0.24 })
  );

  // Insulated Warm Electronics Fuselage Box + Downward Navigation Camera Lens
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.26, 0.32), bodyMat);
  body.position.y = 0.5;
  body.castShadow = true;
  heli.add(body);

  const navCam = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.06, 10), rotorMat);
  navCam.position.y = 0.35;
  heli.add(navCam);

  // Splayed Carbon-Composite Landing Legs + Titanium Footpads
  const legAngles = [Math.PI * 0.25, Math.PI * 0.75, Math.PI * 1.25, Math.PI * 1.75];
  for (const angle of legAngles) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.56, 6), legMat);
    const lx = Math.cos(angle) * 0.26;
    const lz = Math.sin(angle) * 0.26;
    leg.position.set(lx, 0.25, lz);
    leg.rotation.z = Math.cos(angle) * 0.48;
    leg.rotation.x = -Math.sin(angle) * 0.48;
    heli.add(leg);

    const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.055, 0.024, 8), legMat);
    pad.position.set(lx * 1.48, 0.012, lz * 1.48);
    heli.add(pad);
  }

  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.028, 0.72, 10), legMat);
  mast.position.y = 0.96;
  heli.add(mast);

  // Top Photovoltaic Charging Wing
  const solar = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.024, 0.48), solarMat);
  solar.position.y = 1.32;
  heli.add(solar);

  // Coaxial Counter-Rotating Carbon Airfoils + Swashplate Hubs
  const lowerRotorGroup = new THREE.Group();
  lowerRotorGroup.position.y = 0.82;
  const lowerHub = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.04, 10), legMat);
  const blade1 = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.015, 0.09), rotorMat);
  lowerRotorGroup.add(lowerHub, blade1);
  heli.add(lowerRotorGroup);

  const upperRotorGroup = new THREE.Group();
  upperRotorGroup.position.y = 1.08;
  const upperHub = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.04, 10), legMat);
  const blade2 = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.015, 0.09), rotorMat);
  upperRotorGroup.add(upperHub, blade2);
  heli.add(upperRotorGroup);

  heli.userData = {
    lowerRotor: lowerRotorGroup,
    upperRotor: upperRotorGroup,
  };

  heli.scale.set(0.95, 0.95, 0.95);
  return heli;
}

export function createSpacecraftMesh(): THREE.Group {
  const craft = new THREE.Group();
  craft.name = 'dragon_spacecraft';

  const hullMat = getOrCreateMaterial('dragonHull_v2', () =>
    new THREE.MeshPhysicalMaterial({
      color: 0xf1f5f9,
      roughness: 0.24,
      metalness: 0.35,
      clearcoat: 0.5,
    })
  );
  const darkMat = getOrCreateMaterial('dragonDark_v2', () =>
    new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.48, metalness: 0.65 })
  );
  const solarMat = getOrCreateMaterial('dragonSolar_v2', () =>
    new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      map: createSolarCellTexture(),
      metalness: 0.7,
      roughness: 0.14,
      clearcoat: 0.8,
    })
  );
  const plumeMat = getOrCreateMaterial('dragonPlume_v2', () =>
    new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.72,
    })
  );

  const capPts = [
    new THREE.Vector2(0.0, 2.7),
    new THREE.Vector2(0.45, 2.62),
    new THREE.Vector2(0.75, 2.3),
    new THREE.Vector2(1.45, 1.15),
    new THREE.Vector2(1.88, 0.12),
    new THREE.Vector2(1.9, 0.0),
    new THREE.Vector2(0.0, 0.0),
  ];
  const capsule = new THREE.Mesh(new THREE.LatheGeometry(capPts, 28), hullMat);
  craft.add(capsule);

  const nose = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.54, 0.22, 20), darkMat);
  nose.position.y = 2.64;
  craft.add(nose);

  const heatShield = new THREE.Mesh(new THREE.TorusGeometry(1.89, 0.08, 8, 28), darkMat);
  heatShield.rotation.x = Math.PI / 2;
  craft.add(heatShield);

  for (const wx of [-0.32, 0.32]) {
    const win = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.18, 0.06), darkMat);
    win.position.set(wx, 1.55, 1.18);
    win.rotation.x = -Math.PI * 0.18;
    craft.add(win);
  }

  for (let q = 0; q < 4; q++) {
    const angle = (q * Math.PI) / 2;
    const blister = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.55, 6, 10), hullMat);
    blister.position.set(Math.cos(angle) * 1.55, 0.65, Math.sin(angle) * 1.55);
    blister.rotation.z = Math.cos(angle) * 0.28;
    blister.rotation.x = -Math.sin(angle) * 0.28;
    craft.add(blister);
  }

  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(1.88, 1.88, 2.2, 24), hullMat);
  trunk.position.y = -1.1;
  craft.add(trunk);

  const trunkSolar = new THREE.Mesh(
    new THREE.CylinderGeometry(1.91, 1.91, 1.95, 24, 1, false, 0, Math.PI),
    solarMat
  );
  trunkSolar.position.y = -1.1;
  trunkSolar.rotation.y = Math.PI * 0.5;
  craft.add(trunkSolar);

  for (const sx of [-1.98, 1.98]) {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.85, 0.65), hullMat);
    fin.position.set(sx, -1.15, 0);
    craft.add(fin);
  }

  const plume = new THREE.Mesh(new THREE.ConeGeometry(0.65, 2.4, 16, 1, true), plumeMat);
  plume.position.y = -3.35;
  plume.rotation.x = Math.PI;
  craft.add(plume);

  craft.scale.set(0.68, 0.68, 0.68);
  return craft;
}
