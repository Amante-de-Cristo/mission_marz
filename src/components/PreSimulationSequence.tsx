import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { Rocket, Wrench, FastForward, CheckCircle2, Compass, Layers, ShieldCheck } from 'lucide-react';
import { PlacedPod } from '../types';
import { POD_MAP, PRESET_MARS_BASE, CATEGORY_COLORS } from '../utils/podCatalog';
import { audioManager } from '../utils/audioManager';
import {
  createSpacecraftMesh,
  createPodMesh,
  createConnectionTunnelMesh,
  createMarsRegolithTexture,
  createMarsBumpTexture,
} from '../utils/podGeometries';
import {
  createEarthTexture,
  createMarsGlobeTexture,
  createMoonTexture,
  createSunFlareTexture,
  createParticleTexture,
  getPodActionText,
} from '../utils/transitCosmos';

interface PreSimulationSequenceProps {
  onComplete: () => void;
  onSkip: () => void;
  constructionDays?: number;
  transitDays?: number;
  placedPods?: PlacedPod[];
}

export const PreSimulationSequence: React.FC<PreSimulationSequenceProps> = ({
  onComplete,
  onSkip,
  constructionDays = 14,
  transitDays = 210,
  placedPods = [],
}) => {
  // Phase: 'transit' (Earth -> Mars 3D flight) -> 'construction' (Surface Robotic Assembly)
  const [phase, setPhase] = useState<'transit' | 'construction'>('transit');
  const [currentDay, setCurrentDay] = useState(1);
  const [progress, setProgress] = useState(0); // 0 to 1 for current phase
  const [currentPodIndex, setCurrentPodIndex] = useState(0);
  const [activePodActionText, setActivePodActionText] = useState('Welding foundation bulkhead...');

  const threeMountRef = useRef<HTMLDivElement | null>(null);

  // Fallback to certified preset base if no pods placed
  const targetPods = placedPods.length > 0 ? placedPods : PRESET_MARS_BASE.map((p, idx) => ({
    instanceId: `preset_${p.podId}_${idx}`,
    podId: p.podId,
    gridX: p.gridX,
    gridZ: p.gridZ,
    rotation: p.rotation,
    placedAt: Date.now() + idx,
  }));

  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const onSkipRef = useRef(onSkip);
  onSkipRef.current = onSkip;

  // Shared ref read continuously by Three.js renderLoop
  const animStateRef = useRef<{
    progress: number;
    phase: 'transit' | 'construction';
    podIndex: number;
  }>({
    progress: 0,
    phase: 'transit',
    podIndex: 0,
  });

  // Single stepping timer across Transit (0-75 steps) and Construction (75-155 steps)
  useEffect(() => {
    const transitSteps = 75; // 7.5 seconds for dramatic orbital transit
    const constSteps = 85; // 8.5 seconds for sequential base construction
    const totalSteps = transitSteps + constSteps;

    let step = 0;
    let switchedToConstruction = false;
    let lastReportedPodIdx = -1;

    const interval = setInterval(() => {
      step++;

      if (step <= transitSteps) {
        // Stage 1: Transit
        const p = Math.min(1, step / transitSteps);
        setProgress(p);
        const day = Math.min(transitDays, Math.floor(p * transitDays) + 1);
        setCurrentDay(day);
        animStateRef.current = { progress: p, phase: 'transit', podIndex: 0 };

        if (step % 10 === 0) {
          audioManager.playClick();
        }
      } else {
        // Stage 2: Construction
        if (!switchedToConstruction) {
          switchedToConstruction = true;
          setPhase('construction');
          audioManager.playPlacePod();
        }

        const constStep = step - transitSteps;
        const p = Math.min(1, constStep / constSteps);
        setProgress(p);
        const day = Math.min(constructionDays, Math.floor(p * constructionDays) + 1);
        setCurrentDay(day);

        // Calculate which pod is actively being constructed
        const numPods = Math.max(1, targetPods.length);
        const podIdx = Math.min(numPods - 1, Math.floor(p * numPods));
        setCurrentPodIndex(podIdx);
        animStateRef.current = { progress: p, phase: 'construction', podIndex: podIdx };

        if (podIdx !== lastReportedPodIdx) {
          lastReportedPodIdx = podIdx;
          const currentPod = targetPods[podIdx];
          const def = POD_MAP.get(currentPod.podId);
          setActivePodActionText(getPodActionText(currentPod.podId, def?.name || 'Base Module'));
          audioManager.playPlacePod();
        } else if (constStep % 8 === 0) {
          audioManager.playRotate();
        }
      }

      if (step >= totalSteps) {
        clearInterval(interval);
        audioManager.playVictory();
        onCompleteRef.current();
      }
    }, 100);

    return () => clearInterval(interval);
  }, [transitDays, constructionDays, targetPods]);

  // Main Three.js Scene Setup & Animation Loop
  useEffect(() => {
    const container = threeMountRef.current;
    if (!container) return;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050103);

    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 8, 26);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    container.appendChild(renderer.domElement);

    // 2. Lights
    const ambLight = new THREE.AmbientLight(0xffeedd, 0.45);
    scene.add(ambLight);

    const sunLight = new THREE.DirectionalLight(0xfff5ea, 2.4);
    sunLight.position.set(30, 40, -50);
    scene.add(sunLight);

    // 3. Cosmic Backdrop: Distant Twinkling Starfield
    const starCount = 1200;
    const starGeo = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      starPositions[i * 3] = (Math.random() - 0.5) * 350;
      starPositions[i * 3 + 1] = (Math.random() - 0.5) * 350;
      starPositions[i * 3 + 2] = (Math.random() - 0.5) * 350;

      // Color variation: blue-white, warm yellow, orange
      const tone = Math.random();
      if (tone < 0.6) {
        starColors[i * 3] = 0.95;
        starColors[i * 3 + 1] = 0.98;
        starColors[i * 3 + 2] = 1.0;
      } else if (tone < 0.85) {
        starColors[i * 3] = 1.0;
        starColors[i * 3 + 1] = 0.9;
        starColors[i * 3 + 2] = 0.6;
      } else {
        starColors[i * 3] = 0.6;
        starColors[i * 3 + 1] = 0.85;
        starColors[i * 3 + 2] = 1.0;
      }
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3));

    const starMat = new THREE.PointsMaterial({
      size: 1.4,
      sizeAttenuation: false,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
    });
    const starfield = new THREE.Points(starGeo, starMat);
    scene.add(starfield);

    // ==========================================
    // STAGE 1: TRANSIT OBJECTS GROUP
    // ==========================================
    const transitGroup = new THREE.Group();
    transitGroup.name = 'transit_group';
    scene.add(transitGroup);

    // Sun Sprite with Radiant Flare
    const sunTex = createSunFlareTexture();
    const sunMat = new THREE.SpriteMaterial({
      map: sunTex,
      color: 0xffffff,
      transparent: true,
      blending: THREE.AdditiveBlending,
    });
    const sunSprite = new THREE.Sprite(sunMat);
    sunSprite.position.set(0, 24, -80);
    sunSprite.scale.set(36, 36, 1);
    transitGroup.add(sunSprite);

    // Earth (Departure Planet)
    const earthTex = createEarthTexture();
    const earthGeo = new THREE.SphereGeometry(4.2, 36, 36);
    const earthMat = new THREE.MeshStandardMaterial({
      map: earthTex,
      roughness: 0.65,
      metalness: 0.15,
    });
    const earthMesh = new THREE.Mesh(earthGeo, earthMat);
    const earthPos = new THREE.Vector3(-26, 0, -8);
    earthMesh.position.copy(earthPos);
    transitGroup.add(earthMesh);

    // Earth Atmosphere Glow Ring
    const earthAtmoGeo = new THREE.SphereGeometry(4.45, 32, 32);
    const earthAtmoMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.28,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
    });
    const earthAtmo = new THREE.Mesh(earthAtmoGeo, earthAtmoMat);
    earthMesh.add(earthAtmo);

    // Moon Orbiting Earth
    const moonTex = createMoonTexture();
    const moonGeo = new THREE.SphereGeometry(1.1, 24, 24);
    const moonMat = new THREE.MeshStandardMaterial({
      map: moonTex,
      roughness: 0.85,
      metalness: 0.05,
    });
    const moonMesh = new THREE.Mesh(moonGeo, moonMat);
    moonMesh.position.set(6.5, 1.5, 0);
    earthMesh.add(moonMesh);

    // Mars (Arrival Target Planet)
    const marsTex = createMarsGlobeTexture();
    const marsGeo = new THREE.SphereGeometry(3.0, 36, 36);
    const marsMat = new THREE.MeshStandardMaterial({
      map: marsTex,
      roughness: 0.8,
      metalness: 0.1,
    });
    const marsMesh = new THREE.Mesh(marsGeo, marsMat);
    const marsPos = new THREE.Vector3(28, 2, -6);
    marsMesh.position.copy(marsPos);
    transitGroup.add(marsMesh);

    // Mars Atmosphere Haze Ring
    const marsAtmoGeo = new THREE.SphereGeometry(3.2, 32, 32);
    const marsAtmoMat = new THREE.MeshBasicMaterial({
      color: 0xff5522,
      transparent: true,
      opacity: 0.25,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
    });
    const marsAtmo = new THREE.Mesh(marsAtmoGeo, marsAtmoMat);
    marsMesh.add(marsAtmo);

    // Jezero Crater Target Beacon on Mars
    const beaconGeo = new THREE.RingGeometry(0.25, 0.45, 16);
    const beaconMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
    });
    const targetBeacon = new THREE.Mesh(beaconGeo, beaconMat);
    targetBeacon.position.set(0.8, 1.1, 2.7);
    targetBeacon.lookAt(marsMesh.position);
    marsMesh.add(targetBeacon);

    // Hohmann Transfer Elliptical Arc
    const transferCurve = new THREE.CubicBezierCurve3(
      new THREE.Vector3(earthPos.x + 4.5, earthPos.y, earthPos.z),
      new THREE.Vector3((earthPos.x + marsPos.x) * 0.45, 10, -18),
      new THREE.Vector3((earthPos.x + marsPos.x) * 0.55, 12, -14),
      new THREE.Vector3(marsPos.x - 3.5, marsPos.y, marsPos.z)
    );

    const orbitPoints = transferCurve.getPoints(64);
    const orbitGeo = new THREE.BufferGeometry().setFromPoints(orbitPoints);
    const orbitMat = new THREE.LineDashedMaterial({
      color: 0x38bdf8,
      dashSize: 1.2,
      gapSize: 0.8,
      transparent: true,
      opacity: 0.6,
    });
    const orbitLine = new THREE.Line(orbitGeo, orbitMat);
    orbitLine.computeLineDistances();
    transitGroup.add(orbitLine);

    // SpaceX Dragon Spacecraft
    const spacecraft = createSpacecraftMesh();
    spacecraft.scale.set(0.85, 0.85, 0.85);
    transitGroup.add(spacecraft);

    // Ion Engine Plume Trail Particles
    const plumeParticleCount = 80;
    const plumeTex = createParticleTexture();
    const plumeGeo = new THREE.BufferGeometry();
    const plumePos = new Float32Array(plumeParticleCount * 3);
    const plumeAlphas = new Float32Array(plumeParticleCount);
    plumeGeo.setAttribute('position', new THREE.BufferAttribute(plumePos, 3));

    const plumeMat = new THREE.PointsMaterial({
      size: 2.4,
      map: plumeTex,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const plumeParticles = new THREE.Points(plumeGeo, plumeMat);
    transitGroup.add(plumeParticles);

    // ==========================================
    // STAGE 2: SURFACE CONSTRUCTION OBJECTS GROUP
    // ==========================================
    const surfaceGroup = new THREE.Group();
    surfaceGroup.name = 'surface_group';
    surfaceGroup.visible = false;
    scene.add(surfaceGroup);

    // Martian Ground
    const regolithTex = createMarsRegolithTexture();
    const bumpTex = createMarsBumpTexture();
    const groundGeo = new THREE.PlaneGeometry(160, 160, 32, 32);
    const groundMat = new THREE.MeshStandardMaterial({
      map: regolithTex,
      bumpMap: bumpTex,
      bumpScale: 0.16,
      roughness: 0.88,
      metalness: 0.12,
    });
    const groundMesh = new THREE.Mesh(groundGeo, groundMat);
    groundMesh.rotation.x = -Math.PI / 2;
    surfaceGroup.add(groundMesh);

    // Martian Grid Helper
    const gridLines = new THREE.GridHelper(80, 20, 0xff5522, 0x441b12);
    gridLines.position.y = 0.04;
    surfaceGroup.add(gridLines);

    // Distant Mountain Ring
    const mountainGeo = new THREE.CylinderGeometry(75, 85, 18, 24, 1, true);
    const mountainMat = new THREE.MeshStandardMaterial({
      color: 0x6e2410,
      roughness: 0.95,
      side: THREE.BackSide,
    });
    const mountainMesh = new THREE.Mesh(mountainGeo, mountainMat);
    mountainMesh.position.y = 7;
    surfaceGroup.add(mountainMesh);

    // Pod Meshes for Base Construction
    const constructedPodMeshes: THREE.Group[] = [];
    const podCoordMap = new Map<string, PlacedPod>();

    for (let i = 0; i < targetPods.length; i++) {
      const p = targetPods[i];
      const def = POD_MAP.get(p.podId);
      if (!def) continue;

      const podMesh = createPodMesh(def, false, true);
      podMesh.position.set(p.gridX * 6.0, 0, p.gridZ * 6.0);
      podMesh.rotation.y = THREE.MathUtils.degToRad(p.rotation);
      podMesh.scale.set(0, 0, 0); // starts hidden until pop-in
      surfaceGroup.add(podMesh);
      constructedPodMeshes.push(podMesh);
      podCoordMap.set(`${p.gridX},${p.gridZ}`, p);
    }

    // Inter-pod Connection Tunnels (spawn as neighbors complete)
    const tunnelsGroup = new THREE.Group();
    surfaceGroup.add(tunnelsGroup);

    // Robotic Laser Welding Drone
    const drone = new THREE.Group();
    const droneBodyGeo = new THREE.BoxGeometry(0.8, 0.35, 0.8);
    const droneBodyMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8, roughness: 0.2 });
    const droneBody = new THREE.Mesh(droneBodyGeo, droneBodyMat);
    drone.add(droneBody);

    // Drone glowing core light
    const droneLight = new THREE.PointLight(0x38bdf8, 2.5, 12);
    droneLight.position.y = -0.2;
    drone.add(droneLight);

    // Twin welding laser emitter arms
    const laserMat = new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.9 });
    const laserGeo1 = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-0.3, 0, 0), new THREE.Vector3(0, -3.2, 0)]);
    const laserLine1 = new THREE.Line(laserGeo1, laserMat);
    drone.add(laserLine1);

    const laserGeo2 = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0.3, 0, 0), new THREE.Vector3(0, -3.2, 0)]);
    const laserLine2 = new THREE.Line(laserGeo2, laserMat);
    drone.add(laserLine2);

    drone.position.set(0, 4.5, 0);
    surfaceGroup.add(drone);

    // Welding Sparks Particles
    const sparkCount = 90;
    const sparkGeo = new THREE.BufferGeometry();
    const sparkPositions = new Float32Array(sparkCount * 3);
    sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPositions, 3));
    const sparkMat = new THREE.PointsMaterial({
      color: 0x67e8f9,
      size: 2.2,
      sizeAttenuation: false,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
    });
    const sparkPoints = new THREE.Points(sparkGeo, sparkMat);
    surfaceGroup.add(sparkPoints);

    // Animation variables
    let animId = 0;
    let clock = new THREE.Clock();

    function renderLoop() {
      animId = requestAnimationFrame(renderLoop);
      const delta = clock.getDelta();
      const elapsed = clock.getElapsedTime();

      // Read current live animation state
      const { progress: animProg, phase: animPhase, podIndex: animPodIdx } = animStateRef.current;

      // Slow celestial drift for background starfield
      starfield.rotation.y = elapsed * 0.0015;

      if (animPhase === 'transit') {
        transitGroup.visible = true;
        surfaceGroup.visible = false;
        scene.fog = null;
        scene.background = new THREE.Color(0x050103);

        // Planetary rotations
        earthMesh.rotation.y = elapsed * 0.05;
        moonMesh.position.x = Math.sin(elapsed * 0.4) * 6.5;
        moonMesh.position.z = Math.cos(elapsed * 0.4) * 6.5;
        marsMesh.rotation.y = elapsed * 0.04;
        targetBeacon.rotation.z = elapsed * 1.5;

        // Trajectory flight progress t (0 to 1)
        const t = Math.max(0, Math.min(1, animProg));
        const shipPos = transferCurve.getPoint(t);
        const tangent = transferCurve.getTangent(t).normalize();

        spacecraft.position.copy(shipPos);

        // Align spacecraft nose to forward velocity vector
        const lookTarget = shipPos.clone().add(tangent);
        spacecraft.lookAt(lookTarget);
        spacecraft.rotateX(-Math.PI / 2); // correct model orientation
        spacecraft.rotateZ(Math.sin(elapsed * 2) * 0.08); // gentle micro-thruster roll

        // Ion engine particle plume trail trailing backwards
        const plumePosAttr = plumeParticles.geometry.attributes.position as THREE.BufferAttribute;
        for (let i = 0; i < plumeParticleCount; i++) {
          const trailDist = (i / plumeParticleCount) * 4.5;
          const jitter = (Math.random() - 0.5) * 0.18;
          const px = shipPos.x - tangent.x * trailDist + jitter;
          const py = shipPos.y - tangent.y * trailDist + jitter;
          const pz = shipPos.z - tangent.z * trailDist + jitter;
          plumePosAttr.setXYZ(i, px, py, pz);
        }
        plumePosAttr.needsUpdate = true;

        // Fluid 3D Camera Orbit Dynamics around central axis between Earth and Mars
        // Majestic sweeping camera movement with zooming and tracking
        const orbitAngle = t * Math.PI * 1.4 - 0.5; // ~250° panoramic orbit
        const camDist = 18 - Math.sin(t * Math.PI) * 5; // zoom in mid-flight and approach
        const camX = shipPos.x + Math.sin(orbitAngle) * camDist;
        const camY = shipPos.y + 4.5 + Math.cos(t * Math.PI * 2) * 2.5;
        const camZ = shipPos.z + Math.cos(orbitAngle) * camDist + 3.0;

        camera.position.set(camX, camY, camZ);
        camera.lookAt(shipPos.x, shipPos.y + 0.5, shipPos.z);
      } else {
        // ==========================================
        // STAGE 2: SURFACE ROBOTIC WELDING ASSEMBLY
        // ==========================================
        transitGroup.visible = false;
        surfaceGroup.visible = true;
        if (!scene.fog) {
          scene.fog = new THREE.FogExp2(0x240d07, 0.008);
          scene.background = new THREE.Color(0x1a0805);
        }

        const constProg = Math.max(0, Math.min(1, animProg));
        const activeIdx = animPodIdx;
        const numPods = constructedPodMeshes.length;

        // Smooth camera gliding orbit around base
        const camOrbit = elapsed * 0.25;
        const camRadius = 26;
        camera.position.set(Math.sin(camOrbit) * camRadius, 14, Math.cos(camOrbit) * camRadius);
        camera.lookAt(0, 1.5, 0);

        // Animate pod pop-in scaling (elastic spring: 0 -> 1.15 -> 1.0)
        for (let i = 0; i < numPods; i++) {
          const mesh = constructedPodMeshes[i];
          if (i < activeIdx) {
            // Fully completed pods
            mesh.scale.set(1, 1, 1);
          } else if (i === activeIdx) {
            // Currently active building pod: smooth pop-in spring
            const podFraction = (constProg * numPods) - activeIdx;
            const popScale = Math.min(1, Math.max(0, podFraction * 1.3));
            const spring = popScale > 0.85 ? 1.0 + (1 - popScale) * 0.4 : popScale * 1.15;
            mesh.scale.set(spring, spring, spring);

            // Move robotic welding drone over this pod
            drone.position.x = THREE.MathUtils.lerp(drone.position.x, mesh.position.x, 0.15);
            drone.position.z = THREE.MathUtils.lerp(drone.position.z, mesh.position.z, 0.15);
            drone.position.y = 4.2 + Math.sin(elapsed * 4) * 0.3;

            // Welding laser beam endpoints aiming at pod anchors
            const laserTarget1 = new THREE.Vector3(
              mesh.position.x - drone.position.x + Math.sin(elapsed * 6) * 0.8,
              -drone.position.y + 0.5,
              mesh.position.z - drone.position.z + Math.cos(elapsed * 6) * 0.8
            );
            (laserLine1.geometry.attributes.position as THREE.BufferAttribute).setXYZ(1, laserTarget1.x, laserTarget1.y, laserTarget1.z);
            laserLine1.geometry.attributes.position.needsUpdate = true;

            const laserTarget2 = new THREE.Vector3(
              mesh.position.x - drone.position.x - Math.sin(elapsed * 6) * 0.8,
              -drone.position.y + 0.5,
              mesh.position.z - drone.position.z - Math.cos(elapsed * 6) * 0.8
            );
            (laserLine2.geometry.attributes.position as THREE.BufferAttribute).setXYZ(1, laserTarget2.x, laserTarget2.y, laserTarget2.z);
            laserLine2.geometry.attributes.position.needsUpdate = true;

            // Welding sparks spraying on active pod
            const sparkPosAttr = sparkPoints.geometry.attributes.position as THREE.BufferAttribute;
            for (let s = 0; s < sparkCount; s++) {
              sparkPosAttr.setXYZ(
                s,
                mesh.position.x + (Math.random() - 0.5) * 2.2,
                0.2 + Math.random() * 1.6,
                mesh.position.z + (Math.random() - 0.5) * 2.2
              );
            }
            sparkPosAttr.needsUpdate = true;
          } else {
            // Yet to be constructed
            mesh.scale.set(0, 0, 0);
          }
        }

        // Automatic connection tunnels spawn as adjacent pods finish
        // Clear and rebuild matching tunnels up to activeIdx
        while (tunnelsGroup.children.length > 0) {
          tunnelsGroup.remove(tunnelsGroup.children[0]);
        }
        for (let i = 0; i <= activeIdx; i++) {
          const currentP = targetPods[i];
          if (!currentP) continue;

          // Check East
          const eastNeighbor = podCoordMap.get(`${currentP.gridX + 1},${currentP.gridZ}`);
          if (eastNeighbor) {
            const eastIdx = targetPods.findIndex((p) => p.instanceId === eastNeighbor.instanceId);
            if (eastIdx !== -1 && eastIdx <= activeIdx) {
              const tunnel = createConnectionTunnelMesh(
                currentP.gridX * 6.0,
                currentP.gridZ * 6.0,
                (currentP.gridX + 1) * 6.0,
                currentP.gridZ * 6.0
              );
              tunnelsGroup.add(tunnel);
            }
          }

          // Check South
          const southNeighbor = podCoordMap.get(`${currentP.gridX},${currentP.gridZ + 1}`);
          if (southNeighbor) {
            const southIdx = targetPods.findIndex((p) => p.instanceId === southNeighbor.instanceId);
            if (southIdx !== -1 && southIdx <= activeIdx) {
              const tunnel = createConnectionTunnelMesh(
                currentP.gridX * 6.0,
                currentP.gridZ * 6.0,
                currentP.gridX * 6.0,
                (currentP.gridZ + 1) * 6.0
              );
              tunnelsGroup.add(tunnel);
            }
          }
        }
      }

      renderer.render(scene, camera);
    }

    renderLoop();

    // Resize handler
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [targetPods]);

  // Calculate dynamic telemetry for Transit stage
  const distanceTraveledMkm = (progress * 225.3).toFixed(1);
  const flightVelocity = (21.4 + Math.sin(progress * Math.PI) * 4.2).toFixed(1);
  const commDelayMin = (3.2 + progress * 15.6).toFixed(1);

  // Active pod info
  const activePod = targetPods[currentPodIndex];
  const activePodDef = activePod ? POD_MAP.get(activePod.podId) : null;
  const activeCategoryTheme = activePodDef ? CATEGORY_COLORS[activePodDef.category] : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/90 backdrop-blur-2xl animate-fadeIn">
      <div className="w-full max-w-4xl rounded-3xl bg-[#100505f5] border border-[#ff552266] shadow-[0_0_80px_#ff552244] overflow-hidden flex flex-col text-left">
        {/* Cinematic Header Bar */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-black/60 relative">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${
                phase === 'transit'
                  ? 'bg-gradient-to-br from-cyan-500 to-blue-700 shadow-[0_0_25px_#06b6d466]'
                  : 'bg-gradient-to-br from-orange-500 to-red-700 shadow-[0_0_25px_#f9731666]'
              }`}
            >
              {phase === 'transit' ? (
                <Rocket className="w-5 h-5 text-white animate-pulse" />
              ) : (
                <Wrench className="w-5 h-5 text-white animate-spin" />
              )}
            </div>

            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-white/50 font-bold block">
                {phase === 'transit'
                  ? 'STAGE 1 // 3D SPACEX DRAGON INTERPLANETARY TRANSIT'
                  : 'STAGE 2 // SURFACE AUTONOMOUS ROBOTIC WELDING ASSEMBLY'}
              </span>
              <h3 className="text-base sm:text-lg font-mono font-black text-white tracking-wide">
                {phase === 'transit'
                  ? `Earth to Mars Transit: Day ${currentDay} of ${transitDays}`
                  : `Colony Construction: Sol ${currentDay} of ${constructionDays}`}
              </h3>
            </div>
          </div>

          {/* Skip Button */}
          <button
            onClick={() => {
              audioManager.playClick();
              onSkipRef.current();
            }}
            className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-mono font-bold flex items-center gap-2 transition-all cursor-pointer shadow-md hover:scale-105"
            title="Skip Cinematic Sequence"
            aria-label="Skip Cinematic Sequence"
          >
            <FastForward className="w-4 h-4 text-orange-400" />
            <span>Skip Sequence</span>
          </button>
        </div>

        {/* 3D WebGL Canvas Viewport */}
        <div className="relative w-full h-80 sm:h-96 bg-black overflow-hidden border-b border-white/10">
          <div ref={threeMountRef} className="w-full h-full block cursor-default" />

          {/* STAGE 1 TELEMETRY OVERLAY */}
          {phase === 'transit' && (
            <div className="absolute bottom-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-cyan-300 bg-black/80 px-4 py-2 rounded-2xl backdrop-blur-xl border border-white/10 shadow-xl">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                <span>Velocity: {flightVelocity} km/s</span>
              </div>
              <div>
                <span>Traveled: {distanceTraveledMkm}M km / 225.3M km</span>
              </div>
              <div className="hidden sm:block">
                <span>DSN Latency: {commDelayMin} min</span>
              </div>
              <div className="text-white/60">
                <span>Hohmann Transfer Arc (1.00 → 1.52 AU)</span>
              </div>
            </div>
          )}

          {/* STAGE 2: GLASSMORPHISM MODULE POP-IN & WELDING STATUS OVERLAY */}
          {phase === 'construction' && (
            <div className="absolute top-4 left-4 right-4 sm:right-auto sm:max-w-md pointer-events-none animate-fadeIn">
              <div className="p-3.5 rounded-2xl bg-[#100505cc] border border-[#ff552255] backdrop-blur-xl shadow-[0_0_40px_#ff552233] text-left">
                <div className="flex items-center gap-3">
                  {/* Sleek Loading / Cycling Status Circle */}
                  <div className="relative w-12 h-12 flex-shrink-0 flex items-center justify-center">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 48 48">
                      {/* Track background */}
                      <circle
                        cx="24"
                        cy="24"
                        r="20"
                        className="stroke-white/10 fill-none"
                        strokeWidth="3.5"
                      />
                      {/* Active glowing laser arc */}
                      <circle
                        cx="24"
                        cy="24"
                        r="20"
                        className="stroke-[#ff5522] fill-none transition-all duration-150"
                        strokeWidth="3.5"
                        strokeDasharray={125.6}
                        strokeDashoffset={125.6 * (1 - (progress * targetPods.length - currentPodIndex))}
                        strokeLinecap="round"
                      />
                    </svg>
                    {/* Center Percentage Display */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-[10px] font-mono font-black text-white">
                        {Math.round(progress * 100)}%
                      </span>
                    </div>
                  </div>

                  {/* Real-time Dynamic Descriptive Building Text */}
                  <div className="flex-1 truncate">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: activeCategoryTheme?.hex || '#ff5522' }}
                      />
                      <h4 className="text-xs font-mono font-bold text-white truncate">
                        {activePodDef?.name || 'Base Module'}
                      </h4>
                      <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-white/10 text-white/70">
                        [{activePod?.gridX}, {activePod?.gridZ}]
                      </span>
                    </div>
                    <p className="text-[11px] font-mono text-amber-300 leading-snug line-clamp-2">
                      {activePodActionText}
                    </p>
                  </div>
                </div>

                {/* Sub-status ticks */}
                <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center justify-between text-[10px] font-mono text-white/50">
                  <span>Module {currentPodIndex + 1} of {targetPods.length}</span>
                  <span className="text-emerald-400">✓ Laser Welding Active</span>
                  <span>Sol {currentDay} / 14</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Overall Progress Tracker & Footer Bar */}
        <div className="p-4 sm:p-5 bg-black/60 space-y-3">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-white/60">
              {phase === 'transit'
                ? 'Hohmann Transfer Trajectory Progress'
                : `Base Assembly Progress (${currentPodIndex + 1}/${targetPods.length} Modules)`}
            </span>
            <span className="font-bold text-white font-mono text-sm">
              {Math.round(progress * 100)}%
            </span>
          </div>

          <div className="w-full h-3 rounded-full bg-black/80 border border-white/15 overflow-hidden p-0.5">
            <div
              className={`h-full rounded-full transition-all duration-100 ${
                phase === 'transit'
                  ? 'bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 shadow-[0_0_15px_#06b6d488]'
                  : 'bg-gradient-to-r from-[#ff5522] via-amber-400 to-emerald-400 shadow-[0_0_15px_#ff552288]'
              }`}
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono text-white/50 pt-1">
            <span>
              {phase === 'transit'
                ? 'Interplanetary Cruise: Dragon Translunar & Trans-Mars Delta-V Active'
                : 'Automated Regolith Sintering & Pressurized Tunnel Interconnects'}
            </span>
            <span className="text-orange-400 font-bold">NASA AI Flight Supervisor</span>
          </div>
        </div>
      </div>
    </div>
  );
};
