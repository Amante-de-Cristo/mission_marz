import * as THREE from 'three';
import { PodDefinition } from '../types';

// Shared materials and geometries caching for 60fps performance
const sharedMaterials = new Map<string, THREE.Material>();

function getOrCreateMaterial(key: string, creator: () => THREE.Material): THREE.Material {
  if (!sharedMaterials.has(key)) {
    sharedMaterials.set(key, creator());
  }
  return sharedMaterials.get(key)!;
}

// Procedural Martian regolith texture generator using HTML5 Canvas
export function createMarsRegolithTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Base Martian rust red
  ctx.fillStyle = '#b34728';
  ctx.fillRect(0, 0, 512, 512);

  // Layered noise and crater speckles
  for (let i = 0; i < 4500; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const r = Math.random() * 2.5 + 0.5;
    const tone = Math.random();
    if (tone < 0.3) {
      ctx.fillStyle = 'rgba(139, 44, 21, 0.4)'; // dark basalt
    } else if (tone < 0.7) {
      ctx.fillStyle = 'rgba(197, 86, 52, 0.5)'; // iron rust orange
    } else {
      ctx.fillStyle = 'rgba(235, 130, 85, 0.35)'; // bright dust
    }
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Dune ripples
  ctx.strokeStyle = 'rgba(92, 28, 12, 0.18)';
  ctx.lineWidth = 3.5;
  for (let y = 10; y < 512; y += 32) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(150, y + 10, 350, y - 10, 512, y);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(16, 16);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// Procedural Bump Map for Mars Surface
export function createMarsBumpTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, 256, 256);

  for (let i = 0; i < 2000; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const r = Math.random() * 3 + 1;
    const v = Math.floor(Math.random() * 120 + 70);
    ctx.fillStyle = `rgb(${v},${v},${v})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(16, 16);
  return texture;
}

// Build procedural 3-12 part 3D model for any Pod Definition
export function createPodMesh(pod: PodDefinition, isGhost: boolean = false, isValidPlacement: boolean = true): THREE.Group {
  const group = new THREE.Group();
  group.name = `pod_${pod.id}`;

  const opacity = isGhost ? 0.65 : 1.0;

  // Materials based on state
  const ghostMat = (color: string) =>
    new THREE.MeshStandardMaterial({
      color: isValidPlacement ? (isGhost ? 0x22c55e : color) : 0xef4444,
      transparent: true,
      opacity,
      roughness: 0.3,
      metalness: 0.2,
      emissive: isValidPlacement ? 0x113311 : 0x551111,
      emissiveIntensity: 0.3,
    });

  const hullWhite = isGhost
    ? ghostMat('#ffffff')
    : (getOrCreateMaterial('hullWhite', () =>
        new THREE.MeshStandardMaterial({
          color: 0xeeeeee,
          metalness: 0.25,
          roughness: 0.35,
        })
      ) as THREE.MeshStandardMaterial);

  const hullDark = isGhost
    ? ghostMat('#222222')
    : (getOrCreateMaterial('hullDark', () =>
        new THREE.MeshStandardMaterial({
          color: 0x22262a,
          metalness: 0.75,
          roughness: 0.3,
        })
      ) as THREE.MeshStandardMaterial);

  const accentMat = isGhost
    ? ghostMat(pod.colorAccent)
    : (getOrCreateMaterial(`accent_${pod.colorAccent}`, () =>
        new THREE.MeshStandardMaterial({
          color: pod.colorAccent,
          metalness: 0.5,
          roughness: 0.25,
          emissive: pod.colorAccent,
          emissiveIntensity: 0.35,
        })
      ) as THREE.MeshStandardMaterial);

  const goldThermalMat = isGhost
    ? ghostMat('#d97706')
    : (getOrCreateMaterial('goldThermal', () =>
        new THREE.MeshStandardMaterial({
          color: 0xf59e0b,
          metalness: 0.9,
          roughness: 0.15,
        })
      ) as THREE.MeshStandardMaterial);

  const solarPanelMat = isGhost
    ? ghostMat('#0284c7')
    : (getOrCreateMaterial('solarPanel', () =>
        new THREE.MeshStandardMaterial({
          color: 0x082038,
          metalness: 0.85,
          roughness: 0.1,
          emissive: 0x024477,
          emissiveIntensity: 0.3,
        })
      ) as THREE.MeshStandardMaterial);

  const glassMat = isGhost
    ? ghostMat('#38bdf8')
    : (getOrCreateMaterial('glassCupola', () =>
        new THREE.MeshStandardMaterial({
          color: 0x38bdf8,
          metalness: 0.1,
          roughness: 0.1,
          transparent: true,
          opacity: 0.65,
        })
      ) as THREE.MeshStandardMaterial);

  const foliageMat = isGhost
    ? ghostMat('#22c55e')
    : (getOrCreateMaterial('foliageGreen', () =>
        new THREE.MeshStandardMaterial({
          color: 0x16a34a,
          metalness: 0.1,
          roughness: 0.8,
        })
      ) as THREE.MeshStandardMaterial);

  // 1. Base Ground Foundation / Landing Leveling Pads (Parts 1 to 4)
  const padGeo = new THREE.CylinderGeometry(0.55, 0.75, 0.25, 8);
  const strutGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.95, 6);
  const legPositions = [
    [-1.6, 0.12, -1.6],
    [1.6, 0.12, -1.6],
    [-1.6, 0.12, 1.6],
    [1.6, 0.12, 1.6],
  ];

  for (const [lx, ly, lz] of legPositions) {
    const pad = new THREE.Mesh(padGeo, hullDark);
    pad.position.set(lx, ly, lz);
    pad.castShadow = !isGhost;
    group.add(pad);

    const strut = new THREE.Mesh(strutGeo, hullDark);
    strut.position.set(lx * 0.8, 0.55, lz * 0.8);
    strut.rotation.z = lx > 0 ? -0.22 : 0.22;
    strut.rotation.x = lz > 0 ? 0.22 : -0.22;
    group.add(strut);
  }

  // 2. Heavy Subfloor Platform (Part 5)
  const floorGeo = new THREE.CylinderGeometry(2.2, 2.35, 0.45, 8);
  const floorMesh = new THREE.Mesh(floorGeo, hullDark);
  floorMesh.position.y = 0.85;
  floorMesh.castShadow = !isGhost;
  group.add(floorMesh);

  // 3. Primary Main Hull Geometry & Specialized Features
  const mt = pod.modelType;

  if (mt === 'living' || mt === 'atrium_dome' || mt === 'rec_hall') {
    // Geodesic/Dome Living Habitat
    const domeGeo = new THREE.SphereGeometry(1.9, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55);
    const mainHull = new THREE.Mesh(domeGeo, hullWhite);
    mainHull.position.y = 1.05;
    mainHull.castShadow = !isGhost;
    group.add(mainHull);

    // Multi-window observation ring
    for (let w = 0; w < 6; w++) {
      const wAngle = (w * Math.PI) / 3;
      const winGeo = new THREE.BoxGeometry(0.4, 0.35, 0.08);
      const win = new THREE.Mesh(winGeo, glassMat);
      win.position.set(Math.sin(wAngle) * 1.82, 1.85, Math.cos(wAngle) * 1.82);
      win.rotation.y = wAngle;
      group.add(win);
    }

    // Rooftop Cupola
    const cupolaGeo = new THREE.SphereGeometry(0.85, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.5);
    const cupola = new THREE.Mesh(cupolaGeo, glassMat);
    cupola.position.y = 2.75;
    group.add(cupola);

    // Communication Spire
    const spireGeo = new THREE.CylinderGeometry(0.04, 0.08, 1.2, 6);
    const spire = new THREE.Mesh(spireGeo, hullDark);
    spire.position.y = 3.8;
    group.add(spire);
  } else if (mt === 'greenhouse' || mt === 'hydroponics' || mt === 'aeroponics') {
    // Hexagonal transparent greenhouse habitat
    const bioGeo = new THREE.CylinderGeometry(1.85, 2.05, 1.6, 6);
    const mainHull = new THREE.Mesh(bioGeo, hullWhite);
    mainHull.position.y = 1.85;
    group.add(mainHull);

    // Faceted geodesic transparent glass roof
    const roofGeo = new THREE.ConeGeometry(1.95, 1.2, 6);
    const roofMesh = new THREE.Mesh(roofGeo, glassMat);
    roofMesh.position.y = 3.25;
    group.add(roofMesh);

    // Internal Lush Green Vegetation Clusters
    for (let c = 0; c < 5; c++) {
      const cAngle = (c * Math.PI * 2) / 5;
      const plantGeo = new THREE.DodecahedronGeometry(0.35, 0);
      const plant = new THREE.Mesh(plantGeo, foliageMat);
      plant.position.set(Math.cos(cAngle) * 0.9, 1.65, Math.sin(cAngle) * 0.9);
      group.add(plant);
    }

    // LED Grow Light Array
    const growLightGeo = new THREE.BoxGeometry(0.2, 0.1, 2.4);
    const growLightMat = isGhost
      ? ghostMat('#ec4899')
      : new THREE.MeshStandardMaterial({
          color: 0xec4899,
          emissive: 0xec4899,
          emissiveIntensity: 0.9,
        });
    const growLight = new THREE.Mesh(growLightGeo, growLightMat);
    growLight.position.y = 2.6;
    group.add(growLight);
  } else if (mt === 'nuclear' || mt === 'smr_nuclear') {
    // Nuclear Stirling Reactor Vessel
    const coreGeo = new THREE.CylinderGeometry(1.25, 1.45, 2.4, 12);
    const mainHull = new THREE.Mesh(coreGeo, hullDark);
    mainHull.position.y = 2.05;
    group.add(mainHull);

    // Glowing Cerenkov / Energy Core Ring
    const coreRingGeo = new THREE.CylinderGeometry(1.3, 1.3, 0.35, 16);
    const coreRingMat = isGhost
      ? ghostMat('#eab308')
      : new THREE.MeshStandardMaterial({
          color: 0xf59e0b,
          emissive: 0xf59e0b,
          emissiveIntensity: 0.85,
        });
    const coreRing = new THREE.Mesh(coreRingGeo, coreRingMat);
    coreRing.position.y = 2.1;
    group.add(coreRing);

    // Radiation Shield Torus
    const torusGeo = new THREE.TorusGeometry(1.55, 0.25, 8, 16);
    const torus = new THREE.Mesh(torusGeo, goldThermalMat);
    torus.rotation.x = Math.PI / 2;
    torus.position.y = 2.7;
    group.add(torus);

    // Stirling Radiator Heat Pipes
    for (let a = 0; a < 4; a++) {
      const angle = (a * Math.PI) / 2;
      const finGeo = new THREE.BoxGeometry(0.08, 1.8, 1.0);
      const fin = new THREE.Mesh(finGeo, accentMat);
      fin.position.set(Math.cos(angle) * 1.6, 2.4, Math.sin(angle) * 1.6);
      fin.rotation.y = angle;
      group.add(fin);
    }
  } else if (mt === 'solar_array') {
    // Solar Array Deployment Hub
    const hubGeo = new THREE.CylinderGeometry(1.15, 1.35, 1.3, 8);
    const mainHull = new THREE.Mesh(hubGeo, hullWhite);
    mainHull.position.y = 1.7;
    group.add(mainHull);

    // Dual Deployable Solar Wings
    const wingGeo = new THREE.BoxGeometry(4.2, 0.08, 1.35);
    const wing = new THREE.Mesh(wingGeo, solarPanelMat);
    wing.position.set(0, 2.5, 0);
    wing.rotation.z = 0.15;
    group.add(wing);

    // Gimbal Mast
    const mastGeo = new THREE.CylinderGeometry(0.14, 0.16, 1.4, 6);
    const mast = new THREE.Mesh(mastGeo, hullDark);
    mast.position.y = 2.0;
    group.add(mast);
  } else if (mt === 'garage' || mt === 'veh_service') {
    // Wide Rover Garage with Roll-Up Pressure Door
    const garageGeo = new THREE.BoxGeometry(3.6, 2.0, 3.2);
    const mainHull = new THREE.Mesh(garageGeo, hullWhite);
    mainHull.position.y = 2.05;
    group.add(mainHull);

    // Roll-Up Pressure Door (Front face)
    const doorGeo = new THREE.PlaneGeometry(2.0, 1.5);
    const doorMat = isGhost
      ? ghostMat('#ffaa00')
      : new THREE.MeshStandardMaterial({
          color: 0x334155,
          metalness: 0.8,
          roughness: 0.3,
        });
    const door = new THREE.Mesh(doorGeo, doorMat);
    door.position.set(0, 1.8, 1.62);
    group.add(door);

    // Drive-in ramp
    const rampGeo = new THREE.BoxGeometry(2.2, 0.15, 1.2);
    const ramp = new THREE.Mesh(rampGeo, hullDark);
    ramp.position.set(0, 0.95, 2.2);
    ramp.rotation.x = 0.25;
    group.add(ramp);

    // Hazard warning stripes
    const hazardGeo = new THREE.BoxGeometry(2.1, 0.12, 0.05);
    const hazard = new THREE.Mesh(hazardGeo, accentMat);
    hazard.position.set(0, 2.6, 1.63);
    group.add(hazard);
  } else if (mt === 'oxygen') {
    // MOXIE Oxygen Plant with Dual Cryogenic O2 Spheres
    const plantGeo = new THREE.CylinderGeometry(1.6, 1.8, 1.5, 8);
    const mainHull = new THREE.Mesh(plantGeo, hullWhite);
    mainHull.position.y = 1.8;
    group.add(mainHull);

    // 2 Cryogenic O2 Pressure Spheres on roof
    const sphereGeo = new THREE.SphereGeometry(0.65, 12, 8);
    const tank1 = new THREE.Mesh(sphereGeo, hullWhite);
    tank1.position.set(-0.7, 2.9, 0);
    group.add(tank1);

    const tank2 = new THREE.Mesh(sphereGeo, hullWhite);
    tank2.position.set(0.7, 2.9, 0);
    group.add(tank2);

    // Cyan Cryogenic Band on spheres
    const cyanBandGeo = new THREE.TorusGeometry(0.66, 0.06, 6, 16);
    const cyanBandMat = isGhost ? ghostMat('#06b6d4') : accentMat;
    const band1 = new THREE.Mesh(cyanBandGeo, cyanBandMat);
    band1.position.set(-0.7, 2.9, 0);
    band1.rotation.x = Math.PI / 2;
    group.add(band1);

    const band2 = new THREE.Mesh(cyanBandGeo, cyanBandMat);
    band2.position.set(0.7, 2.9, 0);
    band2.rotation.x = Math.PI / 2;
    group.add(band2);
  } else if (mt === 'battery_bank') {
    // Modular Battery Storage Vault
    const bankGeo = new THREE.BoxGeometry(3.2, 1.9, 3.2);
    const mainHull = new THREE.Mesh(bankGeo, hullDark);
    mainHull.position.y = 2.0;
    group.add(mainHull);

    // High-voltage cell stack modules
    for (let b = 0; b < 3; b++) {
      const cellGeo = new THREE.BoxGeometry(0.6, 0.8, 2.6);
      const cell = new THREE.Mesh(cellGeo, goldThermalMat);
      cell.position.set((b - 1) * 0.9, 2.2, 0);
      group.add(cell);
    }
  } else if (mt === 'comm') {
    // Deep Space Network Parabolic Dish
    const baseGeo = new THREE.CylinderGeometry(1.6, 1.8, 1.4, 8);
    const mainHull = new THREE.Mesh(baseGeo, hullWhite);
    mainHull.position.y = 1.75;
    group.add(mainHull);

    // Steerable Parabolic Dish
    const dishGeo = new THREE.SphereGeometry(1.5, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.35);
    const dish = new THREE.Mesh(dishGeo, goldThermalMat);
    dish.rotation.x = Math.PI * 0.75;
    dish.position.set(0, 3.3, 0.4);
    group.add(dish);

    // Sub-reflector feed horn
    const feedGeo = new THREE.ConeGeometry(0.16, 0.8, 6);
    const feed = new THREE.Mesh(feedGeo, accentMat);
    feed.position.set(0, 3.6, 0.9);
    feed.rotation.x = Math.PI * 0.75;
    group.add(feed);
  } else {
    // Standard High-Tech Pressurized Module
    const cylGeo = new THREE.CylinderGeometry(1.75, 1.95, 1.7, 8);
    const mainHull = new THREE.Mesh(cylGeo, hullWhite);
    mainHull.position.y = 1.9;
    group.add(mainHull);

    const roofCapGeo = new THREE.CylinderGeometry(1.2, 1.75, 0.45, 8);
    const roofCap = new THREE.Mesh(roofCapGeo, hullDark);
    roofCap.position.y = 2.95;
    group.add(roofCap);

    const equipBoxGeo = new THREE.BoxGeometry(0.9, 0.5, 0.9);
    const equipBox = new THREE.Mesh(equipBoxGeo, accentMat);
    equipBox.position.set(0, 3.35, 0);
    group.add(equipBox);
  }

  // 4. Mission Marking Accent Band
  const bandGeo = new THREE.CylinderGeometry(1.85, 1.95, 0.28, 8);
  const bandMesh = new THREE.Mesh(bandGeo, accentMat);
  bandMesh.position.y = 1.7;
  group.add(bandMesh);

  // 5. 4 Standardized Air-tight Connection Port Collars
  const portGeo = new THREE.CylinderGeometry(0.46, 0.46, 0.52, 8);
  const portPositions = [
    { x: 0, z: 2.0, ry: 0 },
    { x: 0, z: -2.0, ry: Math.PI },
    { x: 2.0, z: 0, ry: Math.PI / 2 },
    { x: -2.0, z: 0, ry: -Math.PI / 2 },
  ];

  for (const pos of portPositions) {
    const port = new THREE.Mesh(portGeo, hullDark);
    port.rotation.x = Math.PI / 2;
    port.rotation.z = pos.ry;
    port.position.set(pos.x, 1.35, pos.z);
    group.add(port);

    const ringGeo = new THREE.RingGeometry(0.35, 0.48, 8);
    const ring = new THREE.Mesh(ringGeo, accentMat);
    ring.position.set(pos.x * 1.05, 1.35, pos.z * 1.05);
    ring.rotation.y = pos.ry;
    group.add(ring);
  }

  // 6. Beacon LED Light on Top
  const beaconGeo = new THREE.SphereGeometry(0.18, 8, 8);
  const beaconMat = new THREE.MeshStandardMaterial({
    color: pod.colorAccent,
    emissive: pod.colorAccent,
    emissiveIntensity: isGhost ? 0.4 : 1.2,
  });
  const beacon = new THREE.Mesh(beaconGeo, beaconMat);
  beacon.position.y = 3.5;
  group.add(beacon);

  return group;
}

// Procedural Connection Tunnel between adjacent pods
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

  const hullMat = getOrCreateMaterial('tunnelHull', () =>
    new THREE.MeshStandardMaterial({
      color: 0x334155,
      metalness: 0.65,
      roughness: 0.35,
    })
  );

  const ringMat = getOrCreateMaterial('tunnelRing', () =>
    new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.85,
      roughness: 0.25,
    })
  );

  const stripMat = getOrCreateMaterial('tunnelStrip', () =>
    new THREE.MeshStandardMaterial({
      color: 0xff5522,
      emissive: 0xff5522,
      emissiveIntensity: 0.8,
    })
  );

  // Main corrugated pressurized tube
  const tubeGeo = new THREE.CylinderGeometry(0.46, 0.46, length - 1.2, 12);
  const tube = new THREE.Mesh(tubeGeo, hullMat);
  tube.rotation.x = Math.PI / 2;
  group.add(tube);

  // Pressure reinforcement ribs
  const ribCount = 3;
  for (let i = 0; i < ribCount; i++) {
    const offset = ((i - (ribCount - 1) / 2) * (length - 1.8)) / ribCount;
    const ribGeo = new THREE.TorusGeometry(0.52, 0.08, 6, 12);
    const rib = new THREE.Mesh(ribGeo, ringMat);
    rib.position.z = offset;
    group.add(rib);
  }

  // Luminescence safety line
  const stripGeo = new THREE.BoxGeometry(0.08, 0.04, length - 1.4);
  const strip = new THREE.Mesh(stripGeo, stripMat);
  strip.position.y = 0.49;
  group.add(strip);

  group.position.set(midX, 1.35, midZ);
  group.rotation.y = angle;

  return group;
}

// Procedural Mars Exploration Rover Model
export function createRoverMesh(): THREE.Group {
  const rover = new THREE.Group();
  rover.name = 'mars_rover';

  const bodyMat = getOrCreateMaterial('roverBody', () =>
    new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      metalness: 0.7,
      roughness: 0.3,
    })
  );

  const chassisMat = getOrCreateMaterial('roverChassis', () =>
    new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.8,
      roughness: 0.2,
    })
  );

  const wheelMat = getOrCreateMaterial('roverWheel', () =>
    new THREE.MeshStandardMaterial({
      color: 0x334155,
      metalness: 0.5,
      roughness: 0.6,
    })
  );

  // 1. Main Avionics Chassis Box
  const bodyGeo = new THREE.BoxGeometry(1.2, 0.5, 1.6);
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = 0.65;
  rover.add(body);

  // 2. Solar Deck on top
  const deckGeo = new THREE.BoxGeometry(1.3, 0.05, 1.7);
  const deck = new THREE.Mesh(deckGeo, chassisMat);
  deck.position.y = 0.92;
  rover.add(deck);

  // 3. Camera Mast (Pancam)
  const mastGeo = new THREE.CylinderGeometry(0.04, 0.05, 0.8, 6);
  const mast = new THREE.Mesh(mastGeo, chassisMat);
  mast.position.set(0.3, 1.3, 0.5);
  rover.add(mast);

  const headGeo = new THREE.BoxGeometry(0.25, 0.12, 0.15);
  const head = new THREE.Mesh(headGeo, bodyMat);
  head.position.set(0.3, 1.7, 0.5);
  rover.add(head);

  // 4. Six Rocker-Bogie Wheels
  const wheelGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.2, 8);
  const wheelOffsets = [
    [-0.75, 0.25, 0.6],
    [0.75, 0.25, 0.6],
    [-0.8, 0.25, 0.0],
    [0.8, 0.25, 0.0],
    [-0.75, 0.25, -0.6],
    [0.75, 0.25, -0.6],
  ];

  for (const [wx, wy, wz] of wheelOffsets) {
    const wheel = new THREE.Mesh(wheelGeo, wheelMat);
    wheel.position.set(wx, wy, wz);
    wheel.rotation.z = Math.PI / 2;
    rover.add(wheel);
  }

  // 5. Front Robotic Science Arm
  const armGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.6, 6);
  const arm = new THREE.Mesh(armGeo, chassisMat);
  arm.position.set(-0.3, 0.5, 0.9);
  arm.rotation.x = Math.PI / 4;
  rover.add(arm);

  rover.scale.set(0.85, 0.85, 0.85);
  return rover;
}

// Procedural Construction / Welding Assembly Bot
export function createConstructionBotMesh(): THREE.Group {
  const bot = new THREE.Group();
  bot.name = 'construction_bot';

  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0xff7700,
    metalness: 0.6,
    roughness: 0.3,
  });

  const bodyGeo = new THREE.BoxGeometry(0.9, 0.6, 0.9);
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = 0.5;
  bot.add(body);

  // Laser welding arm
  const armGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.8, 6);
  const arm = new THREE.Mesh(armGeo, bodyMat);
  arm.position.set(0, 0.9, 0.4);
  arm.rotation.x = Math.PI / 3;
  bot.add(arm);

  // Welding spark tip
  const sparkGeo = new THREE.SphereGeometry(0.08, 6, 6);
  const sparkMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x38bdf8,
    emissiveIntensity: 1.5,
  });
  const spark = new THREE.Mesh(sparkGeo, sparkMat);
  spark.position.set(0, 0.6, 0.8);
  bot.add(spark);

  bot.scale.set(0.9, 0.9, 0.9);
  return bot;
}

// Procedural 3D Astronaut EVA Avatar Model
export function createAstronautMesh(suitAccentColor: number | string = 0xff5522): THREE.Group {
  const astronaut = new THREE.Group();
  astronaut.name = 'astronaut_eva';

  const suitMat = getOrCreateMaterial('astroSuit', () =>
    new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.6,
      metalness: 0.1,
    })
  );

  const visorMat = getOrCreateMaterial('astroVisor', () =>
    new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      metalness: 0.95,
      roughness: 0.05,
      emissive: 0xd97706,
      emissiveIntensity: 0.2,
    })
  );

  const packMat = getOrCreateMaterial('astroPack', () =>
    new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.4,
      metalness: 0.5,
    })
  );

  const accentMat = new THREE.MeshStandardMaterial({
    color: suitAccentColor,
    roughness: 0.5,
  });

  // 1. Torso
  const torsoGeo = new THREE.CylinderGeometry(0.24, 0.22, 0.5, 8);
  const torso = new THREE.Mesh(torsoGeo, suitMat);
  torso.position.y = 0.65;
  astronaut.add(torso);

  // Chest display patch
  const chestGeo = new THREE.BoxGeometry(0.18, 0.12, 0.06);
  const chest = new THREE.Mesh(chestGeo, accentMat);
  chest.position.set(0, 0.72, 0.22);
  astronaut.add(chest);

  // 2. Helmet & Visor
  const helmetGeo = new THREE.SphereGeometry(0.2, 10, 10);
  const helmet = new THREE.Mesh(helmetGeo, suitMat);
  helmet.position.y = 1.05;
  astronaut.add(helmet);

  const visorGeo = new THREE.SphereGeometry(0.16, 8, 8, 0, Math.PI * 2, 0, Math.PI * 0.5);
  const visor = new THREE.Mesh(visorGeo, visorMat);
  visor.position.set(0, 1.05, 0.07);
  visor.rotation.x = Math.PI * 0.35;
  astronaut.add(visor);

  // 3. PLSS Backpack (Portable Life Support System)
  const packGeo = new THREE.BoxGeometry(0.3, 0.42, 0.18);
  const pack = new THREE.Mesh(packGeo, packMat);
  pack.position.set(0, 0.72, -0.22);
  astronaut.add(pack);

  // 4. Arms
  const armGeo = new THREE.CylinderGeometry(0.08, 0.07, 0.4, 6);
  const leftArm = new THREE.Mesh(armGeo, suitMat);
  leftArm.position.set(-0.32, 0.62, 0);
  leftArm.rotation.z = Math.PI * 0.08;
  astronaut.add(leftArm);

  const rightArm = new THREE.Mesh(armGeo, suitMat);
  rightArm.position.set(0.32, 0.62, 0);
  rightArm.rotation.z = -Math.PI * 0.08;
  astronaut.add(rightArm);

  // 5. Legs & Boots
  const legGeo = new THREE.CylinderGeometry(0.09, 0.08, 0.45, 6);
  const leftLeg = new THREE.Mesh(legGeo, suitMat);
  leftLeg.position.set(-0.13, 0.23, 0);
  astronaut.add(leftLeg);

  const rightLeg = new THREE.Mesh(legGeo, suitMat);
  rightLeg.position.set(0.13, 0.23, 0);
  astronaut.add(rightLeg);

  const bootGeo = new THREE.BoxGeometry(0.14, 0.1, 0.22);
  const leftBoot = new THREE.Mesh(bootGeo, packMat);
  leftBoot.position.set(-0.13, 0.05, 0.04);
  astronaut.add(leftBoot);

  const rightBoot = new THREE.Mesh(bootGeo, packMat);
  rightBoot.position.set(0.13, 0.05, 0.04);
  astronaut.add(rightBoot);

  astronaut.scale.set(0.85, 0.85, 0.85);
  return astronaut;
}

// Procedural 3D Ingenuity-Style Mars Mini-Helicopter Model
export function createMarsHelicopterMesh(): THREE.Group {
  const heli = new THREE.Group();
  heli.name = 'mars_helicopter';

  const bodyMat = getOrCreateMaterial('heliBody', () =>
    new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.7,
      roughness: 0.3,
    })
  );

  const solarMat = getOrCreateMaterial('heliSolar', () =>
    new THREE.MeshStandardMaterial({
      color: 0x1e3a8a,
      metalness: 0.9,
      roughness: 0.1,
    })
  );

  const rotorMat = getOrCreateMaterial('heliRotor', () =>
    new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      metalness: 0.8,
      roughness: 0.2,
    })
  );

  const legMat = getOrCreateMaterial('heliLeg', () =>
    new THREE.MeshStandardMaterial({
      color: 0x64748b,
      metalness: 0.9,
      roughness: 0.2,
    })
  );

  // 1. Central Avionics Box (Fuselage)
  const bodyGeo = new THREE.BoxGeometry(0.35, 0.3, 0.35);
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = 0.5;
  heli.add(body);

  // 2. Four Carbon Fiber Landing Legs
  const legAngles = [Math.PI * 0.25, Math.PI * 0.75, Math.PI * 1.25, Math.PI * 1.75];
  for (const angle of legAngles) {
    const legGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.55, 4);
    const leg = new THREE.Mesh(legGeo, legMat);
    const lx = Math.cos(angle) * 0.28;
    const lz = Math.sin(angle) * 0.28;
    leg.position.set(lx, 0.25, lz);
    leg.rotation.z = Math.cos(angle) * 0.5;
    leg.rotation.x = -Math.sin(angle) * 0.5;
    heli.add(leg);

    // Foot pad
    const padGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.02, 6);
    const pad = new THREE.Mesh(padGeo, legMat);
    pad.position.set(lx * 1.5, 0.01, lz * 1.5);
    heli.add(pad);
  }

  // 3. Mast Shaft
  const mastGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.65, 8);
  const mast = new THREE.Mesh(mastGeo, legMat);
  mast.position.y = 0.95;
  heli.add(mast);

  // 4. Solar Panel Deck on Top
  const solarGeo = new THREE.BoxGeometry(0.42, 0.02, 0.42);
  const solar = new THREE.Mesh(solarGeo, solarMat);
  solar.position.y = 1.28;
  heli.add(solar);

  // Mast Antenna Spike
  const antennaGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.25, 4);
  const antenna = new THREE.Mesh(antennaGeo, legMat);
  antenna.position.y = 1.42;
  heli.add(antenna);

  // 5. Lower and Upper Contra-Rotating Rotor Blades
  const lowerRotorGroup = new THREE.Group();
  lowerRotorGroup.position.y = 0.82;
  const bladeGeo1 = new THREE.BoxGeometry(1.4, 0.015, 0.08);
  const blade1 = new THREE.Mesh(bladeGeo1, rotorMat);
  lowerRotorGroup.add(blade1);
  heli.add(lowerRotorGroup);

  const upperRotorGroup = new THREE.Group();
  upperRotorGroup.position.y = 1.08;
  const bladeGeo2 = new THREE.BoxGeometry(1.4, 0.015, 0.08);
  const blade2 = new THREE.Mesh(bladeGeo2, rotorMat);
  upperRotorGroup.add(blade2);
  heli.add(upperRotorGroup);

  heli.userData = {
    lowerRotor: lowerRotorGroup,
    upperRotor: upperRotorGroup,
  };

  heli.scale.set(0.9, 0.9, 0.9);
  return heli;
}

// Procedural 3D SpaceX Dragon-Style Spacecraft Model
export function createSpacecraftMesh(): THREE.Group {
  const craft = new THREE.Group();
  craft.name = 'dragon_spacecraft';

  const hullMat = getOrCreateMaterial('dragonHull', () =>
    new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.25,
      metalness: 0.4,
    })
  );

  const darkMat = getOrCreateMaterial('dragonDark', () =>
    new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.5,
      metalness: 0.6,
    })
  );

  const solarMat = getOrCreateMaterial('dragonSolar', () =>
    new THREE.MeshStandardMaterial({
      color: 0x1e3a8a,
      metalness: 0.9,
      roughness: 0.1,
    })
  );

  const plumeMat = getOrCreateMaterial('dragonPlume', () =>
    new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x06b6d4,
      emissiveIntensity: 2.2,
      transparent: true,
      opacity: 0.85,
    })
  );

  // 1. Aerodynamic Conical Crew Capsule
  const capsuleGeo = new THREE.CylinderGeometry(0.65, 1.9, 2.4, 18);
  const capsule = new THREE.Mesh(capsuleGeo, hullMat);
  capsule.position.y = 1.2;
  craft.add(capsule);

  // Nosecone Cap
  const noseGeo = new THREE.SphereGeometry(0.65, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.5);
  const nose = new THREE.Mesh(noseGeo, darkMat);
  nose.position.y = 2.4;
  craft.add(nose);

  // Windows / Visor Ports
  const winGeo = new THREE.BoxGeometry(0.3, 0.2, 0.05);
  const win = new THREE.Mesh(winGeo, darkMat);
  win.position.set(0, 1.8, 1.15);
  win.rotation.x = -Math.PI * 0.15;
  craft.add(win);

  // 2. Draco Thruster Blisters (4 quadrants)
  for (let q = 0; q < 4; q++) {
    const angle = (q * Math.PI) / 2;
    const blisterGeo = new THREE.BoxGeometry(0.35, 0.45, 0.25);
    const blister = new THREE.Mesh(blisterGeo, darkMat);
    blister.position.set(Math.cos(angle) * 1.5, 0.9, Math.sin(angle) * 1.5);
    blister.rotation.y = angle;
    craft.add(blister);
  }

  // 3. Trunk / Service Module
  const trunkGeo = new THREE.CylinderGeometry(1.9, 1.9, 2.2, 18);
  const trunk = new THREE.Mesh(trunkGeo, hullMat);
  trunk.position.y = -1.1;
  craft.add(trunk);

  // Trunk Solar Panel Wrap on Half Cylinder
  const trunkSolarGeo = new THREE.CylinderGeometry(1.92, 1.92, 2.0, 18, 1, false, 0, Math.PI);
  const trunkSolar = new THREE.Mesh(trunkSolarGeo, solarMat);
  trunkSolar.position.y = -1.1;
  trunkSolar.rotation.y = Math.PI * 0.5;
  craft.add(trunkSolar);

  // Aerodynamic trunk fins (2 fins)
  const finGeo = new THREE.BoxGeometry(0.08, 1.8, 0.6);
  const fin1 = new THREE.Mesh(finGeo, hullMat);
  fin1.position.set(2.0, -1.2, 0);
  craft.add(fin1);
  const fin2 = new THREE.Mesh(finGeo, hullMat);
  fin2.position.set(-2.0, -1.2, 0);
  craft.add(fin2);

  // 4. Glowing Plasma / Ion Engine Plume
  const plumeGeo = new THREE.ConeGeometry(0.7, 2.5, 12, 1, true);
  const plume = new THREE.Mesh(plumeGeo, plumeMat);
  plume.position.y = -3.4;
  plume.rotation.x = Math.PI;
  craft.add(plume);

  craft.scale.set(0.65, 0.65, 0.65);
  return craft;
}

