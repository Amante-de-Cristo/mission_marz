import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { PlacedPod, PodDefinition, CameraState, RoverState, DailySimulationLog } from '../types';
import { POD_MAP } from '../utils/podCatalog';
import {
  createMarsRegolithTexture,
  createMarsBumpTexture,
  createPodMesh,
  createConnectionTunnelMesh,
  createRoverMesh,
  createAstronautMesh,
  createMarsHelicopterMesh,
  GantryMotionSpec,
} from '../utils/podGeometries';
import { audioManager } from '../utils/audioManager';

interface ThreeCanvasProps {
  placedPods: PlacedPod[];
  selectedCatalogPod: PodDefinition | null;
  selectedPlacedPod: PlacedPod | null;
  onPlacePod: (gridX: number, gridZ: number, rotation: number) => void;
  onSelectPlacedPod: (pod: PlacedPod | null) => void;
  onCancelPlacement?: () => void;
  isSimulating: boolean;
  simulationProgress: number;
  currentSimulationDay: number;
  crewSize?: number;
  onCameraUpdate?: (state: CameraState) => void;
  onRoversUpdate?: (rovers: RoverState[]) => void;
  targetFocusCoord?: { gridX: number; gridZ: number } | null;
  externalRotation?: number;
  onRotateGhost?: () => void;
  simulationLog?: DailySimulationLog | null;
  simulationFailed?: boolean;
  deleteMode?: boolean;
  onDemolishPod?: (instanceId: string) => void;
}

const GRID_SIZE = 24;
const GRID_STEP = 6.0;

export const ThreeCanvas: React.FC<ThreeCanvasProps> = ({
  placedPods,
  selectedCatalogPod,
  selectedPlacedPod,
  onPlacePod,
  onSelectPlacedPod,
  onCancelPlacement,
  isSimulating,
  simulationProgress,
  crewSize = 4,
  onCameraUpdate,
  onRoversUpdate,
  targetFocusCoord,
  externalRotation = 0,
  onRotateGhost,
  simulationLog = null,
  simulationFailed = false,
  deleteMode = false,
  onDemolishPod,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);

  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const sunLightRef = useRef<THREE.DirectionalLight | null>(null);
  const hemiLightRef = useRef<THREE.HemisphereLight | null>(null);

  const podsGroupRef = useRef<THREE.Group | null>(null);
  const tunnelsGroupRef = useRef<THREE.Group | null>(null);
  const roversGroupRef = useRef<THREE.Group | null>(null);
  const astronautsGroupRef = useRef<THREE.Group | null>(null);
  const helicopterRef = useRef<THREE.Group | null>(null);
  const ghostGroupRef = useRef<THREE.Group | null>(null);
  const tileIndicatorRef = useRef<THREE.Mesh | null>(null);
  const terrainPlaneRef = useRef<THREE.Mesh | null>(null);
  const skyDomeRef = useRef<THREE.Mesh | null>(null);
  const sunDiscRef = useRef<THREE.Mesh | null>(null);

  const ghostRotationRef = useRef<number>(0);
  const hoveredGridTileRef = useRef<{ x: number; z: number } | null>(null);

  const roversStateRef = useRef<
    Array<{ mesh: THREE.Group; t: number; radius: number; speed: number; id: string }>
  >([]);
  const astronautsStateRef = useRef<
    Array<{
      mesh: THREE.Group;
      t: number;
      speed: number;
      leftLeg?: THREE.Mesh;
      rightLeg?: THREE.Mesh;
      leftArm?: THREE.Mesh;
      rightArm?: THREE.Mesh;
    }>
  >([]);
  const helicopterFlightStateRef = useRef<{
    active: boolean;
    t: number;
    baseX: number;
    baseZ: number;
  }>({ active: false, t: 0, baseX: 0, baseZ: 0 });
  const animatedDishesRef = useRef<Array<{ obj: THREE.Object3D; phase: number }>>([]);
  const animatedSpinnersRef = useRef<THREE.Object3D[]>([]);
  const animatedFansRef = useRef<THREE.Object3D[]>([]);
  const animatedSolarTrackersRef = useRef<Array<{ obj: THREE.Object3D; phase: number }>>([]);
  const animatedGantriesRef = useRef<Array<GantryMotionSpec & { phase: number }>>([]);

  useEffect(() => {
    ghostRotationRef.current = externalRotation;
    if (ghostGroupRef.current) {
      ghostGroupRef.current.rotation.y = THREE.MathUtils.degToRad(externalRotation);
    }
  }, [externalRotation]);

  // Clear ghost/indicator when placement canceled or deleteMode changes
  useEffect(() => {
    if (!selectedCatalogPod) {
      if (ghostGroupRef.current) ghostGroupRef.current.visible = false;
      if (!deleteMode && tileIndicatorRef.current) {
        tileIndicatorRef.current.visible = false;
      }
    }
    if (deleteMode && ghostGroupRef.current) {
      ghostGroupRef.current.visible = false;
    }
  }, [selectedCatalogPod, deleteMode]);

  const propsRef = useRef({
    placedPods,
    selectedCatalogPod,
    selectedPlacedPod,
    onPlacePod,
    onSelectPlacedPod,
    isSimulating,
    simulationProgress,
    crewSize,
    onCameraUpdate,
    onRoversUpdate,
    targetFocusCoord,
    simulationLog,
    simulationFailed,
    deleteMode,
    onDemolishPod,
  });
  propsRef.current = {
    placedPods,
    selectedCatalogPod,
    selectedPlacedPod,
    onPlacePod,
    onSelectPlacedPod,
    isSimulating,
    simulationProgress,
    crewSize,
    onCameraUpdate,
    onRoversUpdate,
    targetFocusCoord,
    simulationLog,
    simulationFailed,
    deleteMode,
    onDemolishPod,
  };

  useEffect(() => {
    if (targetFocusCoord && controlsRef.current) {
      const targetX = targetFocusCoord.gridX * GRID_STEP;
      const targetZ = targetFocusCoord.gridZ * GRID_STEP;
      controlsRef.current.target.set(targetX, 1.5, targetZ);
    }
  }, [targetFocusCoord]);

  // Main Three.js Scene Setup
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x140d18);
    scene.fog = new THREE.FogExp2(0x28171c, 0.0046);

    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.5,
      1100
    );
    camera.position.set(0, 44, 62);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
      alpha: false,
    });
    rendererRef.current = renderer;
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.04;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    const handleContextLost = (e: Event) => {
      e.preventDefault();
    };
    renderer.domElement.addEventListener('webglcontextlost', handleContextLost, false);

    // Studio IBL Environment Reflections
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    const controls = new OrbitControls(camera, renderer.domElement);
    controlsRef.current = controls;
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 - 0.06;
    controls.minDistance = 10;
    controls.maxDistance = 175;
    controls.target.set(0, 0, 0);
    controls.mouseButtons = {
      LEFT: THREE.MOUSE.PAN,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.ROTATE,
    };

    // Physical Mars Atmospheric Sky Dome (Warm Dusty Horizon -> High-Altitude Plum Zenith)
    const skyCanvas = document.createElement('canvas');
    skyCanvas.width = 32;
    skyCanvas.height = 256;
    const skyCtx = skyCanvas.getContext('2d')!;
    const skyGrad = skyCtx.createLinearGradient(0, 0, 0, 256);
    skyGrad.addColorStop(0.0, '#090710');
    skyGrad.addColorStop(0.28, '#171122');
    skyGrad.addColorStop(0.45, '#3b2122');
    skyGrad.addColorStop(0.54, '#6e3b2b');
    skyGrad.addColorStop(0.62, '#4a261c');
    skyGrad.addColorStop(1.0, '#1e100d');
    skyCtx.fillStyle = skyGrad;
    skyCtx.fillRect(0, 0, 32, 256);
    const skyTex = new THREE.CanvasTexture(skyCanvas);
    skyTex.colorSpace = THREE.SRGBColorSpace;
    const skyMat = new THREE.MeshBasicMaterial({
      map: skyTex,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      color: 0xffffff,
    });
    const skyDome = new THREE.Mesh(new THREE.SphereGeometry(460, 32, 20), skyMat);
    scene.add(skyDome);
    skyDomeRef.current = skyDome;

    // Distant Martian Sun Disc + Phobos Silhouette
    const sunDisc = new THREE.Mesh(
      new THREE.CircleGeometry(7.5, 24),
      new THREE.MeshBasicMaterial({ color: 0xfff3dc, fog: false })
    );
    sunDisc.position.set(165, 195, 130);
    sunDisc.lookAt(0, 0, 0);
    scene.add(sunDisc);
    sunDiscRef.current = sunDisc;

    const phobosGeo = new THREE.IcosahedronGeometry(3.4, 2);
    const phobosPos = phobosGeo.attributes.position;
    const stickneyDir = new THREE.Vector3(0.65, 0.3, 0.68).normalize();
    const pv = new THREE.Vector3();
    for (let i = 0; i < phobosPos.count; i++) {
      pv.fromBufferAttribute(phobosPos, i);
      const dir = pv.clone().normalize();
      const ang = dir.angleTo(stickneyDir);
      let rScale = 1 + Math.sin(dir.x * 4.5 + dir.y * 3.1) * 0.05;
      if (ang < 0.62) {
        const t = ang / 0.62;
        rScale -= (1 - t * t) * 0.24;
      }
      phobosPos.setXYZ(i, pv.x * 1.28 * rScale, pv.y * 0.85 * rScale, pv.z * 0.96 * rScale);
    }
    phobosGeo.computeVertexNormals();
    const phobos = new THREE.Mesh(
      phobosGeo,
      new THREE.MeshStandardMaterial({ color: 0x6b605c, roughness: 0.95, metalness: 0.02, fog: false })
    );
    phobos.position.set(-190, 145, -180);
    scene.add(phobos);

    // 3-Point Warm Martian Daylight + Rusty Ground Bounce + Cool Rim Fill
    const hemiLight = new THREE.HemisphereLight(0xc2cee0, 0x612a1b, 0.88);
    hemiLight.position.set(0, 60, 0);
    scene.add(hemiLight);
    hemiLightRef.current = hemiLight;

    const sunLight = new THREE.DirectionalLight(0xffe7cf, 2.35);
    sunLight.position.set(60, 72, 48);
    sunLight.castShadow = !isSoftwareGl;
    if (sunLight.castShadow) {
      sunLight.shadow.mapSize.width = 2048;
      sunLight.shadow.mapSize.height = 2048;
      sunLight.shadow.camera.near = 10;
      sunLight.shadow.camera.far = 230;
      const d = 82;
      sunLight.shadow.camera.left = -d;
      sunLight.shadow.camera.right = d;
      sunLight.shadow.camera.top = d;
      sunLight.shadow.camera.bottom = -d;
      sunLight.shadow.bias = -0.00045;
      sunLight.shadow.normalBias = 0.022;
    }
    scene.add(sunLight);
    sunLightRef.current = sunLight;

    const rimLight = new THREE.DirectionalLight(0x9fb5d6, 0.4);
    rimLight.position.set(-65, 32, -55);
    scene.add(rimLight);

    // Sculpted 160x160 Jezero Crater Terrain with Sedimentary Delta Terraces
    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    const regolithTex = createMarsRegolithTexture(maxAniso);
    const bumpTex = createMarsBumpTexture(maxAniso);

    const groundGeo = new THREE.PlaneGeometry(460, 460, 160, 160);
    const posAttr = groundGeo.attributes.position;
    const groundColors = new Float32Array(posAttr.count * 3);
    const padColor = new THREE.Color(0xc9896c);
    const ridgeColor = new THREE.Color(0xe0a280);
    const basinColor = new THREE.Color(0x9c5b43);
    const strataColor = new THREE.Color(0x7c4330);
    const tempCol = new THREE.Color();

    for (let i = 0; i < posAttr.count; i++) {
      const vx = posAttr.getX(i);
      const vy = posAttr.getY(i);
      const dist = Math.hypot(vx, vy);
      let zElev = 0;
      if (dist > 77) {
        const t = dist - 77;
        const primaryRidge =
          Math.sin(vx * 0.032) * Math.cos(vy * 0.032) * 5.2 +
          Math.sin(vx * 0.075 + vy * 0.055) * 1.85;
        const duneRipples = Math.sin(vx * 0.21 + Math.cos(vy * 0.15) * 1.5) * 0.52;
        const deltaShelf = Math.floor((t * 0.14) / 2.2) * 0.35;
        const blend = Math.min(1, t / 24);
        zElev = Math.max(0, (primaryRidge + duneRipples) * blend + t * 0.15 + deltaShelf * blend);
      }
      posAttr.setZ(i, zElev);

      if (dist <= 74) {
        const subtle = Math.sin(vx * 0.09) * Math.cos(vy * 0.09) * 0.04;
        tempCol.copy(padColor).offsetHSL(0, 0, subtle);
      } else {
        const hNorm = Math.min(1, zElev / 17);
        const band = Math.sin(zElev * 1.7) * 0.5 + 0.5;
        tempCol.copy(basinColor).lerp(ridgeColor, hNorm).lerp(strataColor, band * 0.18);
      }
      groundColors[i * 3] = tempCol.r;
      groundColors[i * 3 + 1] = tempCol.g;
      groundColors[i * 3 + 2] = tempCol.b;
    }
    groundGeo.setAttribute('color', new THREE.BufferAttribute(groundColors, 3));
    groundGeo.computeVertexNormals();

    const groundMat = new THREE.MeshStandardMaterial({
      map: regolithTex,
      bumpMap: bumpTex,
      bumpScale: 0.3,
      vertexColors: true,
      roughness: 0.92,
      metalness: 0.04,
    });
    const groundMesh = new THREE.Mesh(groundGeo, groundMat);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.receiveShadow = !isSoftwareGl;
    scene.add(groundMesh);
    terrainPlaneRef.current = groundMesh;

    // Multi-Class Martian Basalt Boulders & Scree Stones (outside build zone)
    const rockGeo = new THREE.DodecahedronGeometry(1.0, 1);
    const rockPos = rockGeo.attributes.position;
    for (let i = 0; i < rockPos.count; i++) {
      const rx = rockPos.getX(i);
      const ry = rockPos.getY(i);
      const rz = rockPos.getZ(i);
      const strata = 0.74 + Math.sin(rx * 3.6 + rz * 3.1) * 0.26;
      rockPos.setXYZ(i, rx * strata, ry * 0.6 * strata, rz * strata);
    }
    rockGeo.computeVertexNormals();

    const rockMat = new THREE.MeshStandardMaterial({
      color: 0x622f20,
      bumpMap: bumpTex,
      bumpScale: 0.09,
      roughness: 0.93,
      metalness: 0.04,
    });
    const rockCount = 240;
    const rocks = new THREE.InstancedMesh(rockGeo, rockMat, rockCount);
    rocks.castShadow = !isSoftwareGl;
    rocks.receiveShadow = !isSoftwareGl;
    const dummy = new THREE.Object3D();
    const rockColor = new THREE.Color();
    for (let i = 0; i < rockCount; i++) {
      const angle = (i / rockCount) * Math.PI * 2 + (i % 11) * 0.19;
      const isBoulder = i < 80;
      const rad = isBoulder ? 76 + ((i * 23) % 88) : 73 + ((i * 17) % 64);
      dummy.position.set(Math.cos(angle) * rad, isBoulder ? 0.35 : 0.14, Math.sin(angle) * rad);
      dummy.rotation.set((i % 5) * 0.38, angle * 1.3, (i % 3) * 0.27);
      const s = isBoulder ? 0.9 + ((i * 13) % 16) * 0.15 : 0.32 + ((i * 7) % 10) * 0.08;
      dummy.scale.set(s * 1.25, s * 0.76, s * 0.95);
      dummy.updateMatrix();
      rocks.setMatrixAt(i, dummy.matrix);

      rockColor.setHSL(0.032 + ((i % 7) - 3) * 0.004, 0.42, 0.2 + (i % 5) * 0.032);
      rocks.setColorAt(i, rockColor);
    }
    rocks.instanceMatrix.needsUpdate = true;
    if (rocks.instanceColor) rocks.instanceColor.needsUpdate = true;
    rocks.computeBoundingSphere();
    scene.add(rocks);

    // Landing-Zone Perimeter Survey Beacons along outer pad boundaries
    const bollardGeo = new THREE.CylinderGeometry(0.11, 0.16, 0.92, 10);
    const bollardMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.75, roughness: 0.32 });
    const beaconCapGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.14, 10);
    const beaconCapMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xd97706,
      emissiveIntensity: 0.45,
      roughness: 0.25,
    });
    const padHalf = (GRID_SIZE * GRID_STEP) / 2;
    for (const bx of [-padHalf, 0, padHalf]) {
      for (const bz of [-padHalf, 0, padHalf]) {
        if (bx === 0 && bz === 0) continue;
        const bollard = new THREE.Mesh(bollardGeo, bollardMat);
        bollard.position.set(bx, 0.46, bz);
        bollard.castShadow = !isSoftwareGl;
        const cap = new THREE.Mesh(beaconCapGeo, beaconCapMat);
        cap.position.set(bx, 0.98, bz);
        scene.add(bollard, cap);
      }
    }

    // High-Altitude Stars (faint & realistic near zenith)
    const starGeo = new THREE.BufferGeometry();
    const starPositions = new Float32Array(900 * 3);
    for (let i = 0; i < 900; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(0.32 + Math.random() * 0.68);
      const rad = 410;
      starPositions[i * 3] = rad * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = rad * Math.cos(phi);
      starPositions[i * 3 + 2] = rad * Math.sin(phi) * Math.sin(theta);
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0xe2e8f0,
      size: 1.0,
      sizeAttenuation: false,
      transparent: true,
      opacity: 0.45,
    });
    const starfield = new THREE.Points(starGeo, starMat);
    scene.add(starfield);

    // Atmospheric Dust Particles
    const dustCount = 280;
    const dustGeo = new THREE.BufferGeometry();
    const dustPositions = new Float32Array(dustCount * 3);
    for (let i = 0; i < dustCount; i++) {
      dustPositions[i * 3] = (Math.random() - 0.5) * 145;
      dustPositions[i * 3 + 1] = 0.6 + Math.random() * 14;
      dustPositions[i * 3 + 2] = (Math.random() - 0.5) * 145;
    }
    dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
    const dustMat = new THREE.PointsMaterial({
      color: 0xc97449,
      size: 0.42,
      transparent: true,
      opacity: 0.0,
    });
    const dustParticles = new THREE.Points(dustGeo, dustMat);
    scene.add(dustParticles);

    // Clean Muted Architectural CAD Grid (subtle so realistic regolith shines)
    const baseGridLines = new THREE.GridHelper(
      GRID_SIZE * GRID_STEP,
      GRID_SIZE,
      0x4f436b,
      0x2b233b
    );
    baseGridLines.position.y = 0.03;
    if (Array.isArray(baseGridLines.material)) {
      baseGridLines.material.forEach((m) => {
        m.transparent = true;
        m.opacity = 0.42;
      });
    } else {
      baseGridLines.material.transparent = true;
      baseGridLines.material.opacity = 0.42;
    }
    scene.add(baseGridLines);

    // Tile hover indicator for crisp placement feedback
    const indicatorGeo = new THREE.RingGeometry(2.5, 2.75, 4);
    indicatorGeo.rotateZ(Math.PI / 4);
    const indicatorMat = new THREE.MeshBasicMaterial({
      color: 0x34d399,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
    });
    const tileIndicator = new THREE.Mesh(indicatorGeo, indicatorMat);
    tileIndicator.rotation.x = -Math.PI / 2;
    tileIndicator.position.y = 0.06;
    tileIndicator.visible = false;
    scene.add(tileIndicator);
    tileIndicatorRef.current = tileIndicator;

    // Entity Groups
    const podsGroup = new THREE.Group();
    scene.add(podsGroup);
    podsGroupRef.current = podsGroup;

    const tunnelsGroup = new THREE.Group();
    scene.add(tunnelsGroup);
    tunnelsGroupRef.current = tunnelsGroup;

    const roversGroup = new THREE.Group();
    scene.add(roversGroup);
    roversGroupRef.current = roversGroup;

    const astronautsGroup = new THREE.Group();
    scene.add(astronautsGroup);
    astronautsGroupRef.current = astronautsGroup;

    const ghostGroup = new THREE.Group();
    scene.add(ghostGroup);
    ghostGroupRef.current = ghostGroup;

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    let animationFrameId = 0;
    let lastTime = performance.now();
    let lastCameraReportTime = 0;
    let lastReportedX = -9999;
    let lastReportedZ = -9999;
    let lastReportedYaw = -9999;

    const dayBg = new THREE.Color(0x110d1b);
    const nightBg = new THREE.Color(0x07050c);
    const stormBg = new THREE.Color(0x22130e);
    const failBg = new THREE.Color(0x1d0912);
    const dayFog = new THREE.Color(0x140f21);
    const nightFog = new THREE.Color(0x090710);
    const stormFog = new THREE.Color(0x3a1c12);
    const failFog = new THREE.Color(0x280c16);
    const defaultSunColor = new THREE.Color(0xfff1e0);
    const stormSunColor = new THREE.Color(0xffb380);
    const failSunColor = new THREE.Color(0xf43f5e);

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          animationFrameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          animationFrameId = window.setTimeout(cb, 80);
        }
      };
      animationFrameId = window.setTimeout(poll, 5);
    }

    function renderLoop() {
      const now = performance.now();
      const delta = Math.min(0.1, (now - lastTime) / 1000);
      lastTime = now;
      const elapsedTime = now * 0.001;

      starfield.rotation.y = elapsedTime * 0.0015;

      // Animate Rovers
      const activeRovers = roversStateRef.current;
      const roverReportData: RoverState[] = [];
      for (let i = 0; i < activeRovers.length; i++) {
        const r = activeRovers[i];
        r.t += delta * r.speed;
        const rx = Math.sin(r.t) * r.radius + Math.sin(r.t * 2) * 5;
        const rz = Math.cos(r.t) * r.radius + Math.cos(r.t * 3) * 4;
        const nextX = Math.sin(r.t + 0.05) * r.radius + Math.sin((r.t + 0.05) * 2) * 5;
        const nextZ = Math.cos(r.t + 0.05) * r.radius + Math.cos((r.t + 0.05) * 3) * 4;
        const heading = Math.atan2(nextX - rx, nextZ - rz);
        r.mesh.position.set(rx, 0, rz);
        r.mesh.rotation.y = heading;
        roverReportData.push({ id: r.id, x: rx, z: rz, angle: heading, targetX: nextX, targetZ: nextZ });
      }

      // Animate Astronauts
      const activeAstronauts = astronautsStateRef.current;
      for (let a = 0; a < activeAstronauts.length; a++) {
        const ast = activeAstronauts[a];
        ast.t += delta * ast.speed;
        const loopT = ast.t;
        const walkRadius = 8 + a * 5;
        const ax = Math.sin(loopT * 0.4 + a) * walkRadius;
        const az = Math.cos(loopT * 0.4 + a) * (walkRadius * 0.7);
        const nextAx = Math.sin((loopT + 0.08) * 0.4 + a) * walkRadius;
        const nextAz = Math.cos((loopT + 0.08) * 0.4 + a) * (walkRadius * 0.7);
        const heading = Math.atan2(nextAx - ax, nextAz - az);

        ast.mesh.position.set(ax, 0, az);
        ast.mesh.rotation.y = heading;

        const swing = Math.sin(loopT * 6) * 0.32;
        if (ast.leftLeg) ast.leftLeg.rotation.x = swing;
        if (ast.rightLeg) ast.rightLeg.rotation.x = -swing;
        if (ast.leftArm) ast.leftArm.rotation.x = -swing * 0.7;
        if (ast.rightArm) ast.rightArm.rotation.x = swing * 0.7;
      }

      // Animate Helicopter
      const heli = helicopterRef.current;
      const heliFlight = helicopterFlightStateRef.current;
      if (heli && heliFlight.active) {
        heliFlight.t += delta;
        const ht = heliFlight.t % 22;
        const lowerRotor = heli.userData.lowerRotor as THREE.Group | undefined;
        const upperRotor = heli.userData.upperRotor as THREE.Group | undefined;

        if (ht < 3.0) {
          const speed = (ht / 3.0) * 0.6;
          if (lowerRotor) lowerRotor.rotation.y += speed;
          if (upperRotor) upperRotor.rotation.y -= speed;
          heli.position.set(heliFlight.baseX, 0.35, heliFlight.baseZ);
        } else if (ht < 7.0) {
          const climbProg = (ht - 3.0) / 4.0;
          if (lowerRotor) lowerRotor.rotation.y += 0.6;
          if (upperRotor) upperRotor.rotation.y -= 0.6;
          heli.position.set(heliFlight.baseX, 0.35 + climbProg * 7.5, heliFlight.baseZ);
        } else if (ht < 16.0) {
          const surveyProg = (ht - 7.0) / 9.0;
          const surveyAngle = surveyProg * Math.PI * 2;
          const flightRadius = 18;
          const hx = heliFlight.baseX + Math.sin(surveyAngle) * flightRadius;
          const hz = heliFlight.baseZ + Math.cos(surveyAngle) * (flightRadius * 0.8);
          const hy = 7.85 + Math.sin(surveyProg * Math.PI * 4) * 1.4;
          if (lowerRotor) lowerRotor.rotation.y += 0.65;
          if (upperRotor) upperRotor.rotation.y -= 0.65;
          heli.position.set(hx, hy, hz);
          heli.rotation.y = surveyAngle + Math.PI / 2;
        } else if (ht < 19.5) {
          const landProg = (ht - 16.0) / 3.5;
          if (lowerRotor) lowerRotor.rotation.y += 0.5;
          if (upperRotor) upperRotor.rotation.y -= 0.5;
          heli.position.set(heliFlight.baseX, 7.85 - landProg * 7.5, heliFlight.baseZ);
          heli.rotation.y = 0;
        } else {
          const coast = Math.max(0, (22 - ht) / 2.5) * 0.4;
          if (lowerRotor) lowerRotor.rotation.y += coast;
          if (upperRotor) upperRotor.rotation.y -= coast;
          heli.position.set(heliFlight.baseX, 0.35, heliFlight.baseZ);
        }
      }

      // Animate Module Mechanical Sub-assemblies (Dishes, Anemometers, Fans, Solar Trackers, Gantries)
      const dishes = animatedDishesRef.current;
      for (let i = 0; i < dishes.length; i++) {
        const d = dishes[i];
        d.obj.rotation.y = Math.sin(elapsedTime * 0.42 + d.phase) * 0.55;
      }
      const spinners = animatedSpinnersRef.current;
      for (let i = 0; i < spinners.length; i++) {
        spinners[i].rotation.y += delta * 2.8;
      }
      const fans = animatedFansRef.current;
      for (let i = 0; i < fans.length; i++) {
        fans[i].rotation.y += delta * 5.2;
      }
      const solarTrackers = animatedSolarTrackersRef.current;
      for (let i = 0; i < solarTrackers.length; i++) {
        const s = solarTrackers[i];
        s.obj.rotation.y = Math.sin(elapsedTime * 0.25 + s.phase) * 0.45;
        s.obj.rotation.x = 0.28 + Math.cos(elapsedTime * 0.2 + s.phase) * 0.14;
      }
      const gantries = animatedGantriesRef.current;
      for (let i = 0; i < gantries.length; i++) {
        const g = gantries[i];
        const val = g.base + Math.sin(elapsedTime * g.speed + g.phase) * g.amp;
        if (g.axis === 'x') g.obj.position.x = val;
        else if (g.axis === 'y') g.obj.position.y = val;
        else if (g.axis === 'z') g.obj.position.z = val;
        else if (g.axis === 'rx') g.obj.rotation.x = val;
        else if (g.axis === 'ry') g.obj.rotation.y = val;
        else if (g.axis === 'rz') g.obj.rotation.z = val;
      }

      if (propsRef.current.isSimulating) {
        const prog = propsRef.current.simulationProgress;
        const simLog = propsRef.current.simulationLog;
        const hasFailed = Boolean(propsRef.current.simulationFailed);
        const isStorm = (simLog?.solarMultiplier ?? 1) < 0.75;

        const sunAngle = prog * Math.PI * 6;
        const sunY = Math.sin(sunAngle) * 55;
        const sunX = Math.cos(sunAngle) * 75;
        const isNight = sunY < 0;

        if (sunLightRef.current) {
          sunLightRef.current.position.set(sunX, Math.max(2, sunY), 45);
          if (hasFailed) {
            sunLightRef.current.color.copy(failSunColor);
            sunLightRef.current.intensity = 1.15;
          } else if (isStorm) {
            sunLightRef.current.color.copy(stormSunColor);
            sunLightRef.current.intensity = isNight ? 0.14 : 1.05 * Math.max(0.25, sunY / 55);
          } else {
            sunLightRef.current.color.copy(defaultSunColor);
            sunLightRef.current.intensity = isNight ? 0.12 : 2.35 * Math.max(0.15, sunY / 55);
          }
        }
        if (sunDiscRef.current) {
          sunDiscRef.current.visible = !isNight && !isStorm;
          sunDiscRef.current.position.set(sunX * 3.1, sunY * 3.1, 130);
          sunDiscRef.current.lookAt(camera.position);
        }
        if (skyDomeRef.current) {
          const sMat = skyDomeRef.current.material as THREE.MeshBasicMaterial;
          sMat.color.setHex(
            hasFailed ? 0x6b2835 : isStorm ? 0xb8643a : isNight ? 0x262038 : 0xffffff
          );
        }
        if (hemiLightRef.current) {
          hemiLightRef.current.intensity = hasFailed ? 0.45 : isNight ? 0.25 : isStorm ? 0.55 : 0.88;
        }

        const targetBg = hasFailed ? failBg : isStorm ? stormBg : isNight ? nightBg : dayBg;
        const targetFog = hasFailed ? failFog : isStorm ? stormFog : isNight ? nightFog : dayFog;
        scene.background = targetBg;
        if (scene.fog instanceof THREE.FogExp2) {
          scene.fog.color.copy(targetFog);
          scene.fog.density = hasFailed ? 0.0085 : isStorm ? 0.0145 : 0.0046;
        }

        // Drifting dust particles during storms
        dustMat.opacity = isStorm ? 0.65 : 0.08;
        const dAttr = dustGeo.attributes.position as THREE.BufferAttribute;
        const windSpeed = isStorm ? 22 : 4;
        for (let i = 0; i < dustCount; i++) {
          let dx = dAttr.getX(i) + delta * windSpeed;
          if (dx > 70) dx = -70;
          dAttr.setX(i, dx);
        }
        dAttr.needsUpdate = true;

        const camDist = 52;
        const camAngle = prog * Math.PI * 2 + 0.5;
        camera.position.x = Math.sin(camAngle) * camDist;
        camera.position.z = Math.cos(camAngle) * camDist;
        camera.position.y = 26 + Math.sin(prog * Math.PI * 4) * 5;
        camera.lookAt(0, 2.5, 0);
      } else {
        scene.background = dayBg;
        if (sunLightRef.current) {
          sunLightRef.current.color.copy(defaultSunColor);
          sunLightRef.current.intensity = 2.35;
          sunLightRef.current.position.set(60, 72, 48);
        }
        if (sunDiscRef.current) {
          sunDiscRef.current.visible = true;
          sunDiscRef.current.position.set(165, 195, 130);
          sunDiscRef.current.lookAt(camera.position);
        }
        if (skyDomeRef.current) {
          (skyDomeRef.current.material as THREE.MeshBasicMaterial).color.setHex(0xffffff);
        }
        if (hemiLightRef.current) {
          hemiLightRef.current.intensity = 0.88;
        }
        if (scene.fog instanceof THREE.FogExp2) {
          scene.fog.color.setHex(0x28171c);
          scene.fog.density = 0.0046;
        }
        dustMat.opacity = 0.12;
        const dAttr = dustGeo.attributes.position as THREE.BufferAttribute;
        for (let i = 0; i < dustCount; i++) {
          let dx = dAttr.getX(i) + delta * 1.4;
          if (dx > 70) dx = -70;
          dAttr.setX(i, dx);
        }
        dAttr.needsUpdate = true;
        controls.update();
      }

      if (!propsRef.current.isSimulating && now - lastCameraReportTime > 90) {
        lastCameraReportTime = now;
        const curYaw = controls.getAzimuthalAngle();
        const curX = camera.position.x;
        const curZ = camera.position.z;
        if (
          Math.abs(curX - lastReportedX) > 0.05 ||
          Math.abs(curZ - lastReportedZ) > 0.05 ||
          Math.abs(curYaw - lastReportedYaw) > 0.01
        ) {
          lastReportedX = curX;
          lastReportedZ = curZ;
          lastReportedYaw = curYaw;
          propsRef.current.onCameraUpdate?.({
            x: curX,
            z: curZ,
            rotationY: curYaw,
            zoom: camera.position.length(),
          });
        }
        if (propsRef.current.onRoversUpdate && roverReportData.length > 0) {
          propsRef.current.onRoversUpdate(roverReportData);
        }
      }

      renderer.render(scene, camera);
      if (isSoftwareGl) afterDraw(renderLoop);
      else animationFrameId = requestAnimationFrame(renderLoop);
    }

    renderLoop();

    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      clearTimeout(animationFrameId);
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('webglcontextlost', handleContextLost);
      controls.dispose();
      renderer.dispose();
      if (container && renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Update Placed Pods, Tunnels, Rovers, Astronauts & Helicopter
  useEffect(() => {
    const podsGroup = podsGroupRef.current;
    const tunnelsGroup = tunnelsGroupRef.current;
    const roversGroup = roversGroupRef.current;
    const astronautsGroup = astronautsGroupRef.current;
    const scene = sceneRef.current;
    if (!podsGroup || !tunnelsGroup || !roversGroup || !astronautsGroup || !scene) return;

    while (podsGroup.children.length > 0) podsGroup.remove(podsGroup.children[0]);
    while (tunnelsGroup.children.length > 0) tunnelsGroup.remove(tunnelsGroup.children[0]);
    while (roversGroup.children.length > 0) roversGroup.remove(roversGroup.children[0]);
    while (astronautsGroup.children.length > 0) astronautsGroup.remove(astronautsGroup.children[0]);
    if (helicopterRef.current) {
      scene.remove(helicopterRef.current);
      helicopterRef.current = null;
    }

    roversStateRef.current = [];
    astronautsStateRef.current = [];
    helicopterFlightStateRef.current = { active: false, t: 0, baseX: 0, baseZ: 0 };
    animatedDishesRef.current = [];
    animatedSpinnersRef.current = [];
    animatedFansRef.current = [];
    animatedSolarTrackersRef.current = [];
    animatedGantriesRef.current = [];

    const placedCoordMap = new Map<string, PlacedPod>();
    let hasRoverGarage = false;
    let garageCoord = { x: 0, z: 0 };

    for (let idx = 0; idx < placedPods.length; idx++) {
      const placed = placedPods[idx];
      const def = POD_MAP.get(placed.podId);
      if (!def) continue;

      if (placed.podId === 'rover_garage_pod' || def.modelType === 'garage') {
        hasRoverGarage = true;
        garageCoord = { x: placed.gridX * GRID_STEP, z: placed.gridZ * GRID_STEP };
      }

      const podMesh = createPodMesh(def, false, true);
      podMesh.position.set(placed.gridX * GRID_STEP, 0, placed.gridZ * GRID_STEP);
      podMesh.rotation.y = THREE.MathUtils.degToRad(placed.rotation);
      podMesh.userData.instanceId = placed.instanceId;
      podMesh.userData.placed = placed;

      if (Array.isArray(podMesh.userData.dishes)) {
        for (const obj of podMesh.userData.dishes as THREE.Object3D[]) {
          animatedDishesRef.current.push({ obj, phase: idx * 1.1 });
        }
      }
      if (Array.isArray(podMesh.userData.spinners)) {
        for (const obj of podMesh.userData.spinners as THREE.Object3D[]) {
          animatedSpinnersRef.current.push(obj);
        }
      }
      if (Array.isArray(podMesh.userData.fans)) {
        for (const obj of podMesh.userData.fans as THREE.Object3D[]) {
          animatedFansRef.current.push(obj);
        }
      }
      if (Array.isArray(podMesh.userData.solarTrackers)) {
        for (const obj of podMesh.userData.solarTrackers as THREE.Object3D[]) {
          animatedSolarTrackersRef.current.push({ obj, phase: idx * 0.7 });
        }
      }
      if (Array.isArray(podMesh.userData.gantries)) {
        for (const spec of podMesh.userData.gantries as GantryMotionSpec[]) {
          animatedGantriesRef.current.push({ ...spec, phase: idx * 0.9 });
        }
      }

      if (selectedPlacedPod?.instanceId === placed.instanceId) {
        const ringGeo = new THREE.RingGeometry(2.55, 2.78, 32);
        const ringMat = new THREE.MeshBasicMaterial({
          color: 0x8b5cf6,
          side: THREE.DoubleSide,
        });
        const selectRing = new THREE.Mesh(ringGeo, ringMat);
        selectRing.rotation.x = -Math.PI / 2;
        selectRing.position.y = 0.08;
        podMesh.add(selectRing);
      }

      podsGroup.add(podMesh);
      placedCoordMap.set(`${placed.gridX},${placed.gridZ}`, placed);
    }

    for (const placed of placedPods) {
      const px = placed.gridX * GRID_STEP;
      const pz = placed.gridZ * GRID_STEP;

      const eastNeighbor = placedCoordMap.get(`${placed.gridX + 1},${placed.gridZ}`);
      if (eastNeighbor) {
        tunnelsGroup.add(createConnectionTunnelMesh(px, pz, (placed.gridX + 1) * GRID_STEP, pz));
      }

      const southNeighbor = placedCoordMap.get(`${placed.gridX},${placed.gridZ + 1}`);
      if (southNeighbor) {
        tunnelsGroup.add(createConnectionTunnelMesh(px, pz, px, (placed.gridZ + 1) * GRID_STEP));
      }
    }

    if (hasRoverGarage || isSimulating || placedPods.length >= 3) {
      const roverCount = hasRoverGarage ? 2 : 1;
      for (let i = 0; i < roverCount; i++) {
        const roverMesh = createRoverMesh();
        roversGroup.add(roverMesh);
        roversStateRef.current.push({
          mesh: roverMesh,
          t: i * Math.PI,
          radius: 24 + i * 10,
          speed: 0.2 + i * 0.07,
          id: `rover_${i + 1}`,
        });
      }
    }

    if (placedPods.length > 0 || isSimulating) {
      const activeCrew = Math.max(1, Math.min(7, crewSize));
      const suitColors = ['#e05a36', '#38bdf8', '#fbbf24', '#34d399', '#f472b6', '#a78bfa', '#fb923c'];

      for (let c = 0; c < activeCrew; c++) {
        const astronautMesh = createAstronautMesh(suitColors[c % suitColors.length]);
        astronautsGroup.add(astronautMesh);

        let leftLeg: THREE.Mesh | undefined;
        let rightLeg: THREE.Mesh | undefined;
        let leftArm: THREE.Mesh | undefined;
        let rightArm: THREE.Mesh | undefined;

        astronautMesh.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            if (child.position.x < -0.1 && child.position.y < 0.35) leftLeg = child;
            if (child.position.x > 0.1 && child.position.y < 0.35) rightLeg = child;
            if (child.position.x < -0.25 && child.position.y > 0.5) leftArm = child;
            if (child.position.x > 0.25 && child.position.y > 0.5) rightArm = child;
          }
        });

        astronautsStateRef.current.push({
          mesh: astronautMesh,
          t: c * (Math.PI / 3),
          speed: 0.42 + (c % 3) * 0.05,
          leftLeg,
          rightLeg,
          leftArm,
          rightArm,
        });
      }
    }

    if (hasRoverGarage || isSimulating || placedPods.length >= 5) {
      const heli = createMarsHelicopterMesh();
      const hBaseX = hasRoverGarage ? garageCoord.x + 3.2 : 4.0;
      const hBaseZ = hasRoverGarage ? garageCoord.z + 3.2 : 4.0;
      heli.position.set(hBaseX, 0.35, hBaseZ);
      scene.add(heli);
      helicopterRef.current = heli;
      helicopterFlightStateRef.current = { active: true, t: 0, baseX: hBaseX, baseZ: hBaseZ };
    }
  }, [placedPods, selectedPlacedPod, isSimulating, crewSize]);

  const raycaster = useRef(new THREE.Raycaster());
  const mouse = useRef(new THREE.Vector2());
  const lastGhostKeyRef = useRef<string>('');

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const container = mountRef.current;
    if (!container || !cameraRef.current || !terrainPlaneRef.current) return;

    const rect = container.getBoundingClientRect();
    mouse.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.current.setFromCamera(mouse.current, cameraRef.current);

    if (propsRef.current.deleteMode) {
      if (ghostGroupRef.current) ghostGroupRef.current.visible = false;
      if (podsGroupRef.current && tileIndicatorRef.current) {
        const podHits = raycaster.current.intersectObjects(podsGroupRef.current.children, true);
        if (podHits.length > 0) {
          let current: THREE.Object3D | null = podHits[0].object;
          while (current && !current.userData.placed) {
            current = current.parent;
          }
          if (current && current.userData.placed) {
            const placed = current.userData.placed as PlacedPod;
            tileIndicatorRef.current.visible = true;
            tileIndicatorRef.current.position.set(placed.gridX * GRID_STEP, 0.08, placed.gridZ * GRID_STEP);
            (tileIndicatorRef.current.material as THREE.MeshBasicMaterial).color.setHex(0xf43f5e);
            return;
          }
        }
        tileIndicatorRef.current.visible = false;
      }
      return;
    }

    const intersects = raycaster.current.intersectObject(terrainPlaneRef.current);

    if (intersects.length > 0) {
      const pt = intersects[0].point;
      const gx = Math.round(pt.x / GRID_STEP);
      const gz = Math.round(pt.z / GRID_STEP);

      const maxG = GRID_SIZE / 2;
      if (Math.abs(gx) <= maxG && Math.abs(gz) <= maxG) {
        hoveredGridTileRef.current = { x: gx, z: gz };

        if (selectedCatalogPod && ghostGroupRef.current && tileIndicatorRef.current) {
          const isOccupied = placedPods.some((p) => p.gridX === gx && p.gridZ === gz);
          const ghost = ghostGroupRef.current;
          ghost.visible = true;
          ghost.position.set(gx * GRID_STEP, 0, gz * GRID_STEP);
          ghost.rotation.y = THREE.MathUtils.degToRad(ghostRotationRef.current);

          const indicator = tileIndicatorRef.current;
          indicator.visible = true;
          indicator.position.set(gx * GRID_STEP, 0.06, gz * GRID_STEP);
          (indicator.material as THREE.MeshBasicMaterial).color.setHex(
            isOccupied ? 0xf43f5e : 0x34d399
          );

          const ghostKey = `${selectedCatalogPod.id}_${!isOccupied}`;
          if (lastGhostKeyRef.current !== ghostKey) {
            lastGhostKeyRef.current = ghostKey;
            while (ghost.children.length > 0) ghost.remove(ghost.children[0]);
            ghost.add(createPodMesh(selectedCatalogPod, true, !isOccupied));
          }
        }
      } else {
        hoveredGridTileRef.current = null;
        if (ghostGroupRef.current) ghostGroupRef.current.visible = false;
        if (tileIndicatorRef.current) tileIndicatorRef.current.visible = false;
      }
    }
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;

    const container = mountRef.current;
    if (!container || !cameraRef.current || !sceneRef.current) return;

    const rect = container.getBoundingClientRect();
    mouse.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.current.setFromCamera(mouse.current, cameraRef.current);

    if (propsRef.current.deleteMode) {
      if (podsGroupRef.current) {
        const intersects = raycaster.current.intersectObjects(podsGroupRef.current.children, true);
        if (intersects.length > 0) {
          let current: THREE.Object3D | null = intersects[0].object;
          while (current && !current.userData.placed) {
            current = current.parent;
          }
          if (current && current.userData.placed) {
            const placed = current.userData.placed as PlacedPod;
            propsRef.current.onDemolishPod?.(placed.instanceId);
            audioManager.playDemolish();
            if (tileIndicatorRef.current) tileIndicatorRef.current.visible = false;
            return;
          }
        }
      }
      return;
    }

    if (selectedCatalogPod && hoveredGridTileRef.current) {
      const { x, z } = hoveredGridTileRef.current;
      const isOccupied = placedPods.some((p) => p.gridX === x && p.gridZ === z);
      if (!isOccupied) {
        onPlacePod(x, z, ghostRotationRef.current);
      }
      return;
    }

    if (podsGroupRef.current) {
      const intersects = raycaster.current.intersectObjects(podsGroupRef.current.children, true);
      if (intersects.length > 0) {
        let current: THREE.Object3D | null = intersects[0].object;
        while (current && !current.userData.placed) {
          current = current.parent;
        }
        if (current && current.userData.placed) {
          onSelectPlacedPod(current.userData.placed);
          audioManager.playClick();
          return;
        }
      }
    }

    onSelectPlacedPod(null);
  };

  return (
    <div
      ref={mountRef}
      className="w-full h-full relative cursor-crosshair select-none"
      onPointerMove={handlePointerMove}
      onClick={handleClick}
      data-testid="three-canvas-container"
      data-delete-mode={deleteMode ? 'true' : 'false'}
    />
  );
};
