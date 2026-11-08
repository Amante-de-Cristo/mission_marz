import React, { useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { PlacedPod, PodDefinition, CameraState, RoverState } from '../types';
import { POD_MAP } from '../utils/podCatalog';
import {
  createMarsRegolithTexture,
  createMarsBumpTexture,
  createPodMesh,
  createConnectionTunnelMesh,
  createRoverMesh,
  createAstronautMesh,
  createMarsHelicopterMesh,
} from '../utils/podGeometries';
import { audioManager } from '../utils/audioManager';
import { RotateCw, X, Eye } from 'lucide-react';

interface ThreeCanvasProps {
  placedPods: PlacedPod[];
  selectedCatalogPod: PodDefinition | null;
  selectedPlacedPod: PlacedPod | null;
  onPlacePod: (gridX: number, gridZ: number, rotation: number) => void;
  onSelectPlacedPod: (pod: PlacedPod | null) => void;
  onCancelPlacement?: () => void;
  isSimulating: boolean;
  simulationProgress: number; // 0 to 1
  currentSimulationDay: number;
  crewSize?: number;
  onCameraUpdate?: (state: CameraState) => void;
  onRoversUpdate?: (rovers: RoverState[]) => void;
  targetFocusCoord?: { gridX: number; gridZ: number } | null;
  externalRotation?: number;
  onRotateGhost?: () => void;
}

// Expanded 24x24 grid (-12 to 12) = 144m x 144m settlement envelope
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
  currentSimulationDay,
  crewSize = 4,
  onCameraUpdate,
  onRoversUpdate,
  targetFocusCoord,
  externalRotation,
  onRotateGhost,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);

  // References to preserve Three.js state across React renders
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
  const gridHelperRef = useRef<THREE.Group | null>(null);
  const terrainPlaneRef = useRef<THREE.Mesh | null>(null);

  const ghostRotationRef = useRef<number>(0);
  const hoveredGridTileRef = useRef<{ x: number; z: number } | null>(null);

  // State refs for animation loops
  const roversStateRef = useRef<Array<{ mesh: THREE.Group; t: number; radius: number; speed: number; id: string }>>([]);
  const astronautsStateRef = useRef<Array<{
    mesh: THREE.Group;
    t: number;
    speed: number;
    leftLeg?: THREE.Mesh;
    rightLeg?: THREE.Mesh;
    leftArm?: THREE.Mesh;
    rightArm?: THREE.Mesh;
  }>>([]);
  const helicopterFlightStateRef = useRef<{
    active: boolean;
    t: number;
    baseX: number;
    baseZ: number;
  }>({ active: false, t: 0, baseX: 0, baseZ: 0 });

  // Update ghost rotation if parent changes it
  useEffect(() => {
    if (externalRotation !== undefined) {
      ghostRotationRef.current = externalRotation;
      if (ghostGroupRef.current) {
        ghostGroupRef.current.rotation.y = THREE.MathUtils.degToRad(externalRotation);
      }
    }
  }, [externalRotation]);

  // Safe rotate function for on-screen UI buttons
  const rotateGhost = useCallback(() => {
    ghostRotationRef.current = (ghostRotationRef.current + 90) % 360;
    if (ghostGroupRef.current) {
      ghostGroupRef.current.rotation.y = THREE.MathUtils.degToRad(ghostRotationRef.current);
    }
    if (onRotateGhost) {
      onRotateGhost();
    }
    audioManager.playRotate();
  }, [onRotateGhost]);

  // State refs for rendering loop and props
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
  };

  // NOTE: Keyboard shortcuts for 'R' and 'I' are strictly omitted to eliminate all hotkey conflicts.
  // All rotations and inspections are triggered cleanly via on-screen UI buttons and mouse controls.

  // Target Focus smooth pan when minimap or pod selected
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

    // Detect software WebGL
    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    // 1. Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x1a0805); // deep Mars atmosphere
    scene.fog = new THREE.FogExp2(0x240d07, 0.0065);

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.5,
      1200
    );
    camera.position.set(0, 48, 64);
    cameraRef.current = camera;

    // 3. Renderer
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
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(renderer.domElement);

    // 4. Studio Environment Reflections (RoomEnvironment)
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // 5. Controls (Left Drag: Pan, Right Drag: Orbit, Scroll: Zoom)
    const controls = new OrbitControls(camera, renderer.domElement);
    controlsRef.current = controls;
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 - 0.05;
    controls.minDistance = 8;
    controls.maxDistance = 180;
    controls.target.set(0, 0, 0);

    controls.mouseButtons = {
      LEFT: THREE.MOUSE.PAN,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.ROTATE,
    };

    // 6. Lighting
    const hemiLight = new THREE.HemisphereLight(0xff7744, 0x2b0d05, 0.95);
    hemiLight.position.set(0, 60, 0);
    scene.add(hemiLight);
    hemiLightRef.current = hemiLight;

    const sunLight = new THREE.DirectionalLight(0xffeedd, 2.3);
    sunLight.position.set(65, 75, 45);
    sunLight.castShadow = !isSoftwareGl;
    if (sunLight.castShadow) {
      sunLight.shadow.mapSize.width = 1024;
      sunLight.shadow.mapSize.height = 1024;
      sunLight.shadow.camera.near = 10;
      sunLight.shadow.camera.far = 240;
      const d = 80;
      sunLight.shadow.camera.left = -d;
      sunLight.shadow.camera.right = d;
      sunLight.shadow.camera.top = d;
      sunLight.shadow.camera.bottom = -d;
      sunLight.shadow.bias = -0.0005;
      sunLight.shadow.normalBias = 0.02;
    }
    scene.add(sunLight);
    sunLightRef.current = sunLight;

    const ambLight = new THREE.AmbientLight(0x40150d, 0.45);
    scene.add(ambLight);

    // 7. Expanded Terrain & Mars Surface Environment
    const regolithTex = createMarsRegolithTexture();
    const bumpTex = createMarsBumpTexture();

    // 360m x 360m terrain plane with a 152m flat diameter (radius 76m) to cover the 24x24 grid cleanly
    const groundGeo = new THREE.PlaneGeometry(360, 360, 64, 64);
    const posAttr = groundGeo.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const vx = posAttr.getX(i);
      const vy = posAttr.getY(i);
      const distFromCenter = Math.hypot(vx, vy);
      let zElevation = 0;
      if (distFromCenter > 76) {
        zElevation = Math.sin(vx * 0.04) * Math.cos(vy * 0.04) * 4.5 + (distFromCenter - 76) * 0.12;
      }
      posAttr.setZ(i, zElevation);
    }
    groundGeo.computeVertexNormals();

    const groundMat = new THREE.MeshStandardMaterial({
      map: regolithTex,
      bumpMap: bumpTex,
      bumpScale: 0.18,
      roughness: 0.88,
      metalness: 0.12,
    });
    const groundMesh = new THREE.Mesh(groundGeo, groundMat);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.receiveShadow = !isSoftwareGl;
    scene.add(groundMesh);
    terrainPlaneRef.current = groundMesh;

    // Distant Martian crater rim mountains
    const mountainGeo = new THREE.CylinderGeometry(150, 175, 32, 32, 1, true);
    const mountainMat = new THREE.MeshStandardMaterial({
      color: 0x6e2410,
      roughness: 0.95,
      metalness: 0.05,
      side: THREE.BackSide,
    });
    const mountainRing = new THREE.Mesh(mountainGeo, mountainMat);
    mountainRing.position.y = 10;
    scene.add(mountainRing);

    // Distant Starfield & Moons
    const starGeo = new THREE.BufferGeometry();
    const starPositions = new Float32Array(1500 * 3);
    for (let i = 0; i < 1500; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 0.85);
      const rad = 280;
      starPositions[i * 3] = rad * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = rad * Math.cos(phi);
      starPositions[i * 3 + 2] = rad * Math.sin(phi) * Math.sin(theta);
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 1.2,
      sizeAttenuation: false,
      transparent: true,
      opacity: 0.85,
    });
    const starfield = new THREE.Points(starGeo, starMat);
    scene.add(starfield);

    // Phobos moon
    const moonGeo = new THREE.DodecahedronGeometry(2.5, 1);
    const moonMat = new THREE.MeshStandardMaterial({
      color: 0x94827d,
      roughness: 0.9,
      metalness: 0.1,
    });
    const phobos = new THREE.Mesh(moonGeo, moonMat);
    phobos.position.set(-90, 85, -120);
    scene.add(phobos);

    // 8. Expanded 24x24 Grid Helper
    const gridGroup = new THREE.Group();
    const baseGridLines = new THREE.GridHelper(
      GRID_SIZE * GRID_STEP, // 144 units
      GRID_SIZE, // 24 divisions
      0xff5522,
      0x441b12
    );
    baseGridLines.position.y = 0.05;
    gridGroup.add(baseGridLines);

    // Boundary corner beacon pylons
    const pylonGeo = new THREE.CylinderGeometry(0.25, 0.35, 2.2, 6);
    const pylonMat = new THREE.MeshStandardMaterial({
      color: 0xff5522,
      emissive: 0xff3300,
      emissiveIntensity: 0.85,
    });
    const halfGrid = (GRID_SIZE * GRID_STEP) / 2; // 72 units
    [
      [-halfGrid, -halfGrid],
      [halfGrid, -halfGrid],
      [-halfGrid, halfGrid],
      [halfGrid, halfGrid],
    ].forEach(([px, pz]) => {
      const pylon = new THREE.Mesh(pylonGeo, pylonMat);
      pylon.position.set(px, 1.1, pz);
      gridGroup.add(pylon);
    });

    scene.add(gridGroup);
    gridHelperRef.current = gridGroup;

    // 9. Pods, Tunnels, Rovers, and Astronauts Groups
    const podsGroup = new THREE.Group();
    podsGroup.name = 'all_placed_pods';
    scene.add(podsGroup);
    podsGroupRef.current = podsGroup;

    const tunnelsGroup = new THREE.Group();
    tunnelsGroup.name = 'all_tunnels';
    scene.add(tunnelsGroup);
    tunnelsGroupRef.current = tunnelsGroup;

    const roversGroup = new THREE.Group();
    roversGroup.name = 'all_rovers';
    scene.add(roversGroup);
    roversGroupRef.current = roversGroup;

    const astronautsGroup = new THREE.Group();
    astronautsGroup.name = 'all_astronauts';
    scene.add(astronautsGroup);
    astronautsGroupRef.current = astronautsGroup;

    const ghostGroup = new THREE.Group();
    ghostGroup.name = 'ghost_pod_group';
    scene.add(ghostGroup);
    ghostGroupRef.current = ghostGroup;

    // 10. Animation Loop
    let animationFrameId = 0;
    let lastTime = performance.now();
    let lastCameraReportTime = 0;
    let lastReportedX = -9999;
    let lastReportedZ = -9999;
    let lastReportedYaw = -9999;
    let audioStepTimer = 0;

    function renderLoop() {
      animationFrameId = requestAnimationFrame(renderLoop);

      const now = performance.now();
      const delta = Math.min(0.1, (now - lastTime) / 1000);
      lastTime = now;
      const elapsedTime = now * 0.001;

      // Slow rotation for celestial starfield
      starfield.rotation.y = elapsedTime * 0.002;

      // Animate active rovers driving across Martian surface
      const activeRovers = roversStateRef.current;
      const roverReportData: RoverState[] = [];

      for (let i = 0; i < activeRovers.length; i++) {
        const r = activeRovers[i];
        r.t += delta * r.speed;

        // Perimeter patrol trajectory
        const rx = Math.sin(r.t) * r.radius + Math.sin(r.t * 2) * 6;
        const rz = Math.cos(r.t) * r.radius + Math.cos(r.t * 3) * 5;

        // Calculate heading tangent angle
        const nextX = Math.sin(r.t + 0.05) * r.radius + Math.sin((r.t + 0.05) * 2) * 6;
        const nextZ = Math.cos(r.t + 0.05) * r.radius + Math.cos((r.t + 0.05) * 3) * 5;
        const heading = Math.atan2(nextX - rx, nextZ - rz);

        r.mesh.position.set(rx, 0, rz);
        r.mesh.rotation.y = heading;

        roverReportData.push({
          id: r.id,
          x: rx,
          z: rz,
          angle: heading,
          targetX: nextX,
          targetZ: nextZ,
        });
      }

      // Animate Astronauts walking between pods
      const activeAstronauts = astronautsStateRef.current;
      for (let a = 0; a < activeAstronauts.length; a++) {
        const ast = activeAstronauts[a];
        ast.t += delta * ast.speed;

        const loopT = ast.t;
        // Walking oval path between colony nodes
        const walkRadius = 8 + a * 5;
        const ax = Math.sin(loopT * 0.4 + a) * walkRadius;
        const az = Math.cos(loopT * 0.4 + a) * (walkRadius * 0.7);

        const nextAx = Math.sin((loopT + 0.08) * 0.4 + a) * walkRadius;
        const nextAz = Math.cos((loopT + 0.08) * 0.4 + a) * (walkRadius * 0.7);
        const heading = Math.atan2(nextAx - ax, nextAz - az);

        ast.mesh.position.set(ax, 0, az);
        ast.mesh.rotation.y = heading;

        // Arm and leg swinging animation
        const swing = Math.sin(loopT * 6) * 0.35;
        if (ast.leftLeg) ast.leftLeg.rotation.x = swing;
        if (ast.rightLeg) ast.rightLeg.rotation.x = -swing;
        if (ast.leftArm) ast.leftArm.rotation.x = -swing * 0.8;
        if (ast.rightArm) ast.rightArm.rotation.x = swing * 0.8;
      }

      // Animate Ingenuity Mini-Helicopter
      const heli = helicopterRef.current;
      const heliFlight = helicopterFlightStateRef.current;
      if (heli && heliFlight.active) {
        heliFlight.t += delta;
        const ht = heliFlight.t % 22; // 22-second cyclic flight mission

        const lowerRotor = heli.userData.lowerRotor as THREE.Group | undefined;
        const upperRotor = heli.userData.upperRotor as THREE.Group | undefined;

        if (ht < 3.0) {
          // Pre-flight rotor spool-up on helipad
          const speed = (ht / 3.0) * 0.6;
          if (lowerRotor) lowerRotor.rotation.y += speed;
          if (upperRotor) upperRotor.rotation.y -= speed;
          heli.position.set(heliFlight.baseX, 0.4, heliFlight.baseZ);
        } else if (ht < 7.0) {
          // Vertical takeoff up to 8m altitude
          const climbProg = (ht - 3.0) / 4.0;
          if (lowerRotor) lowerRotor.rotation.y += 0.6;
          if (upperRotor) upperRotor.rotation.y -= 0.6;
          heli.position.set(heliFlight.baseX, 0.4 + climbProg * 7.5, heliFlight.baseZ);
        } else if (ht < 16.0) {
          // Survey flight arc over the colony
          const surveyProg = (ht - 7.0) / 9.0;
          const surveyAngle = surveyProg * Math.PI * 2;
          const flightRadius = 18;
          const hx = heliFlight.baseX + Math.sin(surveyAngle) * flightRadius;
          const hz = heliFlight.baseZ + Math.cos(surveyAngle) * (flightRadius * 0.8);
          const hy = 7.9 + Math.sin(surveyProg * Math.PI * 4) * 1.5;

          if (lowerRotor) lowerRotor.rotation.y += 0.65;
          if (upperRotor) upperRotor.rotation.y -= 0.65;
          heli.position.set(hx, hy, hz);
          heli.rotation.y = surveyAngle + Math.PI / 2;
        } else if (ht < 19.5) {
          // Controlled descent back to helipad
          const landProg = (ht - 16.0) / 3.5;
          if (lowerRotor) lowerRotor.rotation.y += 0.5;
          if (upperRotor) upperRotor.rotation.y -= 0.5;
          heli.position.set(heliFlight.baseX, 7.9 - landProg * 7.5, heliFlight.baseZ);
          heli.rotation.y = 0;
        } else {
          // Spool down and rest
          const coast = Math.max(0, (22 - ht) / 2.5) * 0.4;
          if (lowerRotor) lowerRotor.rotation.y += coast;
          if (upperRotor) upperRotor.rotation.y -= coast;
          heli.position.set(heliFlight.baseX, 0.4, heliFlight.baseZ);
        }
      }

      // Handle 30-Day simulation cinematic camera & Day-Night cycle
      if (propsRef.current.isSimulating) {
        const prog = propsRef.current.simulationProgress;
        const sunAngle = prog * Math.PI * 6;
        const sunRadius = 75;
        const sunY = Math.sin(sunAngle) * 55;
        const sunX = Math.cos(sunAngle) * sunRadius;
        const isNight = sunY < 0;

        if (sunLightRef.current) {
          sunLightRef.current.position.set(sunX, Math.max(1, sunY), 40);
          sunLightRef.current.intensity = isNight ? 0.05 : 2.4 * Math.max(0.1, sunY / 55);
        }

        if (hemiLightRef.current) {
          hemiLightRef.current.intensity = isNight ? 0.15 : 0.85;
        }

        if (sceneRef.current) {
          sceneRef.current.background = isNight
            ? new THREE.Color(0x060205)
            : new THREE.Color(0x1a0805);
          sceneRef.current.fog = new THREE.FogExp2(
            isNight ? 0x070204 : 0x240d07,
            0.0065
          );
        }

        // Cinematic Camera Orbit
        const camDist = 52;
        const camAngle = prog * Math.PI * 2 + 0.5;
        camera.position.x = Math.sin(camAngle) * camDist;
        camera.position.z = Math.cos(camAngle) * camDist;
        camera.position.y = 26 + Math.sin(prog * Math.PI * 4) * 6;
        camera.lookAt(0, 3, 0);
      } else {
        // Normal interactive controls
        controls.update();
      }

      // Report Camera State to parent for 2D Minimap synchronization
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
          if (propsRef.current.onCameraUpdate) {
            propsRef.current.onCameraUpdate({
              x: curX,
              z: curZ,
              rotationY: curYaw,
              zoom: camera.position.length(),
            });
          }
        }
        if (propsRef.current.onRoversUpdate && roverReportData.length > 0) {
          propsRef.current.onRoversUpdate(roverReportData);
        }
      }

      renderer.render(scene, camera);
    }

    renderLoop();

    // 11. Resize Handler
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      controls.dispose();
      renderer.dispose();
      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Update Placed Pods, Connection Tunnels, Rovers, Astronauts & Helicopter
  useEffect(() => {
    const podsGroup = podsGroupRef.current;
    const tunnelsGroup = tunnelsGroupRef.current;
    const roversGroup = roversGroupRef.current;
    const astronautsGroup = astronautsGroupRef.current;
    const scene = sceneRef.current;
    if (!podsGroup || !tunnelsGroup || !roversGroup || !astronautsGroup || !scene) return;

    // Clear existing
    while (podsGroup.children.length > 0) {
      podsGroup.remove(podsGroup.children[0]);
    }
    while (tunnelsGroup.children.length > 0) {
      tunnelsGroup.remove(tunnelsGroup.children[0]);
    }
    while (roversGroup.children.length > 0) {
      roversGroup.remove(roversGroup.children[0]);
    }
    while (astronautsGroup.children.length > 0) {
      astronautsGroup.remove(astronautsGroup.children[0]);
    }
    if (helicopterRef.current) {
      scene.remove(helicopterRef.current);
      helicopterRef.current = null;
    }

    roversStateRef.current = [];
    astronautsStateRef.current = [];
    helicopterFlightStateRef.current = { active: false, t: 0, baseX: 0, baseZ: 0 };

    // Build placed pod 3D models
    const placedCoordMap = new Map<string, PlacedPod>();
    let hasRoverGarage = false;
    let garageCoord = { x: 0, z: 0 };

    for (const placed of placedPods) {
      const def = POD_MAP.get(placed.podId);
      if (!def) continue;

      if (placed.podId === 'rover_garage_pod' || def.modelType === 'garage') {
        hasRoverGarage = true;
        garageCoord = { x: placed.gridX * GRID_STEP, z: placed.gridZ * GRID_STEP };
      }

      const podMesh = createPodMesh(def, false, true);
      podMesh.position.set(placed.gridX * GRID_STEP, 0, placed.gridZ * GRID_STEP);
      podMesh.rotation.y = THREE.MathUtils.degToRad(placed.rotation);
      podMesh.userData = { instanceId: placed.instanceId, placed };

      // Selection indicator halo if currently selected
      if (selectedPlacedPod?.instanceId === placed.instanceId) {
        const ringGeo = new THREE.RingGeometry(2.4, 2.7, 32);
        const ringMat = new THREE.MeshBasicMaterial({
          color: 0x38bdf8,
          side: THREE.DoubleSide,
        });
        const selectRing = new THREE.Mesh(ringGeo, ringMat);
        selectRing.rotation.x = -Math.PI / 2;
        selectRing.position.y = 0.12;
        podMesh.add(selectRing);
      }

      podsGroup.add(podMesh);
      placedCoordMap.set(`${placed.gridX},${placed.gridZ}`, placed);
    }

    // Automatic Inter-pod Connection Tunnels across adjacent grid tiles
    for (const placed of placedPods) {
      const px = placed.gridX * GRID_STEP;
      const pz = placed.gridZ * GRID_STEP;

      // Check East (+1 X)
      const eastNeighbor = placedCoordMap.get(`${placed.gridX + 1},${placed.gridZ}`);
      if (eastNeighbor) {
        const tunnel = createConnectionTunnelMesh(
          px,
          pz,
          (placed.gridX + 1) * GRID_STEP,
          pz
        );
        tunnelsGroup.add(tunnel);
      }

      // Check South (+1 Z)
      const southNeighbor = placedCoordMap.get(`${placed.gridX},${placed.gridZ + 1}`);
      if (southNeighbor) {
        const tunnel = createConnectionTunnelMesh(
          px,
          pz,
          px,
          (placed.gridZ + 1) * GRID_STEP
        );
        tunnelsGroup.add(tunnel);
      }
    }

    // Spawn Animated Ground Rovers
    if (hasRoverGarage || isSimulating || placedPods.length >= 3) {
      const roverCount = hasRoverGarage ? 2 : 1;
      for (let i = 0; i < roverCount; i++) {
        const roverMesh = createRoverMesh();
        roversGroup.add(roverMesh);

        roversStateRef.current.push({
          mesh: roverMesh,
          t: i * Math.PI,
          radius: 24 + i * 10,
          speed: 0.22 + i * 0.08,
          id: `rover_${i + 1}`,
        });
      }
    }

    // Spawn Scaled 3D EVA Astronaut Avatars (1 to 7 instances matching mission crew size)
    if (placedPods.length > 0 || isSimulating) {
      const activeCrew = Math.max(1, Math.min(7, crewSize));
      const suitColors = ['#f8fafc', '#38bdf8', '#fbbf24', '#34d399', '#f472b6', '#a78bfa', '#fb923c'];

      for (let c = 0; c < activeCrew; c++) {
        const astronautMesh = createAstronautMesh(suitColors[c % suitColors.length]);
        astronautsGroup.add(astronautMesh);

        // Find legs and arms for articulated walking
        let leftLeg: THREE.Mesh | undefined;
        let rightLeg: THREE.Mesh | undefined;
        let leftArm: THREE.Mesh | undefined;
        let rightArm: THREE.Mesh | undefined;

        astronautMesh.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            if (child.position.x < -0.1 && child.position.y < 0.3) leftLeg = child;
            if (child.position.x > 0.1 && child.position.y < 0.3) rightLeg = child;
            if (child.position.x < -0.25 && child.position.y > 0.5) leftArm = child;
            if (child.position.x > 0.25 && child.position.y > 0.5) rightArm = child;
          }
        });

        astronautsStateRef.current.push({
          mesh: astronautMesh,
          t: c * (Math.PI / 3),
          speed: 0.45 + (c % 3) * 0.05,
          leftLeg,
          rightLeg,
          leftArm,
          rightArm,
        });
      }
    }

    // Spawn Autonomous Mars Mini-Helicopter (Ingenuity style)
    if (hasRoverGarage || isSimulating || placedPods.length >= 5) {
      const heli = createMarsHelicopterMesh();
      const hBaseX = hasRoverGarage ? garageCoord.x + 3.2 : 4.0;
      const hBaseZ = hasRoverGarage ? garageCoord.z + 3.2 : 4.0;

      heli.position.set(hBaseX, 0.4, hBaseZ);
      scene.add(heli);
      helicopterRef.current = heli;

      helicopterFlightStateRef.current = {
        active: true,
        t: 0,
        baseX: hBaseX,
        baseZ: hBaseZ,
      };
    }
  }, [placedPods, selectedPlacedPod, isSimulating, crewSize]);

  // Pointer Raycasting for Placement Preview and Selection
  const raycaster = useRef(new THREE.Raycaster());
  const mouse = useRef(new THREE.Vector2());

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const container = mountRef.current;
    if (!container || !cameraRef.current || !terrainPlaneRef.current) return;

    const rect = container.getBoundingClientRect();
    mouse.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.current.setFromCamera(mouse.current, cameraRef.current);
    const intersects = raycaster.current.intersectObject(terrainPlaneRef.current);

    if (intersects.length > 0) {
      const pt = intersects[0].point;
      const gx = Math.round(pt.x / GRID_STEP);
      const gz = Math.round(pt.z / GRID_STEP);

      const maxG = GRID_SIZE / 2; // 12
      if (Math.abs(gx) <= maxG && Math.abs(gz) <= maxG) {
        hoveredGridTileRef.current = { x: gx, z: gz };

        if (selectedCatalogPod && ghostGroupRef.current) {
          const ghost = ghostGroupRef.current;
          ghost.visible = true;
          ghost.position.set(gx * GRID_STEP, 0, gz * GRID_STEP);
          ghost.rotation.y = THREE.MathUtils.degToRad(ghostRotationRef.current);

          const isOccupied = placedPods.some((p) => p.gridX === gx && p.gridZ === gz);

          while (ghost.children.length > 0) {
            ghost.remove(ghost.children[0]);
          }
          const previewMesh = createPodMesh(selectedCatalogPod, true, !isOccupied);
          ghost.add(previewMesh);
        }
      } else {
        hoveredGridTileRef.current = null;
        if (ghostGroupRef.current) ghostGroupRef.current.visible = false;
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

    // If placing a pod from catalog
    if (selectedCatalogPod && hoveredGridTileRef.current) {
      const { x, z } = hoveredGridTileRef.current;
      const isOccupied = placedPods.some((p) => p.gridX === x && p.gridZ === z);
      if (!isOccupied) {
        onPlacePod(x, z, ghostRotationRef.current);
      }
      return;
    }

    // Check click on placed pods to select / inspect
    if (podsGroupRef.current) {
      const intersects = raycaster.current.intersectObjects(
        podsGroupRef.current.children,
        true
      );
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
    >
      {/* Viewport Control Guide Badge */}
      <div className="absolute top-16 left-3 sm:left-4 z-10 pointer-events-none hidden md:flex flex-col gap-1.5">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#100505cc] border border-[#ff552233] backdrop-blur-md shadow-lg">
          <span className="w-2.5 h-2.5 rounded-full bg-[#ff5522] animate-pulse"></span>
          <span className="text-xs font-mono font-medium tracking-wide text-white/90 uppercase">
            Martian Surface Viewport (24x24 Grid)
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-orange-300">
            {placedPods.length} Pods Placed
          </span>
          {crewSize && (
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
              {crewSize} Crew
            </span>
          )}
        </div>
      </div>

      {/* Floating On-Screen Placement Toolbar when a catalog pod is selected */}
      {selectedCatalogPod && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20 pointer-events-auto flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-[#140505ee] border border-[#ff552288] backdrop-blur-xl shadow-[0_0_30px_#ff552244] animate-fadeIn">
          <div className="flex items-center gap-2 mr-1">
            <span
              className="w-3 h-3 rounded-full flex-shrink-0 animate-ping"
              style={{ backgroundColor: selectedCatalogPod.colorAccent }}
            />
            <div className="text-left">
              <div className="text-xs font-mono font-bold text-white flex items-center gap-1.5">
                <span>Deploying: {selectedCatalogPod.name}</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-white/10 text-orange-300">
                  Angle: {ghostRotationRef.current}°
                </span>
              </div>
              <div className="text-[10px] font-mono text-white/60">
                Left-Click surface grid to place
              </div>
            </div>
          </div>

          {/* On-Screen Dedicated Rotate 90 Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              rotateGhost();
            }}
            className="px-3 py-1.5 rounded-xl bg-[#ff5522] hover:bg-[#ff6633] text-white text-xs font-mono font-bold flex items-center gap-1.5 shadow-md hover:scale-105 transition-all cursor-pointer"
            title="Rotate pod 90 degrees"
            aria-label="Rotate pod 90 degrees"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Rotate 90°</span>
          </button>

          {/* Cancel Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (onCancelPlacement) onCancelPlacement();
              audioManager.playClick();
            }}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-colors cursor-pointer"
            title="Cancel Placement"
            aria-label="Cancel Placement"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Selected Placed Pod Floating Bar */}
      {selectedPlacedPod && !selectedCatalogPod && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20 pointer-events-auto flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-[#0c1424ee] border border-cyan-500/60 backdrop-blur-xl shadow-[0_0_25px_#06b6d433] animate-fadeIn">
          <div className="text-left">
            <div className="text-xs font-mono font-bold text-cyan-300 flex items-center gap-1.5">
              <span>Selected Pod at [{selectedPlacedPod.gridX}, {selectedPlacedPod.gridZ}]</span>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-200">
                {selectedPlacedPod.rotation}°
              </span>
            </div>
            <div className="text-[10px] font-mono text-white/60">
              Click to inspect technical ECLSS parameters
            </div>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelectPlacedPod(selectedPlacedPod);
              audioManager.playClick();
            }}
            className="px-2.5 py-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-mono font-bold flex items-center gap-1 shadow-md cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Inspect</span>
          </button>
        </div>
      )}
    </div>
  );
};
