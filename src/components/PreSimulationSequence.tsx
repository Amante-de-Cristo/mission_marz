import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as THREE from 'three';
import { Rocket, Wrench, FastForward } from 'lucide-react';
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
  const [phase, setPhase] = useState<'transit' | 'construction'>('transit');
  const [currentDay, setCurrentDay] = useState(1);
  const [progress, setProgress] = useState(0);
  const [currentPodIndex, setCurrentPodIndex] = useState(0);
  const [activePodActionText, setActivePodActionText] = useState('Welding foundation bulkhead...');

  const threeMountRef = useRef<HTMLDivElement | null>(null);
  const completedRef = useRef(false);

  const targetPods = useMemo(
    () =>
      placedPods.length > 0
        ? placedPods
        : PRESET_MARS_BASE.map((p, idx) => ({
            instanceId: `preset_${p.podId}_${idx}`,
            podId: p.podId,
            gridX: p.gridX,
            gridZ: p.gridZ,
            rotation: p.rotation,
            placedAt: idx,
          })),
    [placedPods]
  );

  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const onSkipRef = useRef(onSkip);
  onSkipRef.current = onSkip;

  const animStateRef = useRef<{
    progress: number;
    phase: 'transit' | 'construction';
    podIndex: number;
  }>({
    progress: 0,
    phase: 'transit',
    podIndex: 0,
  });

  useEffect(() => {
    const transitSteps = 75;
    const constSteps = 85;
    const totalSteps = transitSteps + constSteps;

    let step = 0;
    let switchedToConstruction = false;
    let lastReportedPodIdx = -1;

    const interval = setInterval(() => {
      step++;

      if (step <= transitSteps) {
        const p = Math.min(1, step / transitSteps);
        setProgress(p);
        const day = Math.min(transitDays, Math.floor(p * transitDays) + 1);
        setCurrentDay(day);
        animStateRef.current = { progress: p, phase: 'transit', podIndex: 0 };

        if (step % 10 === 0) {
          audioManager.playClick();
        }
      } else {
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
        if (!completedRef.current) {
          completedRef.current = true;
          audioManager.playVictory();
          onCompleteRef.current();
        }
      }
    }, 100);

    return () => clearInterval(interval);
  }, [transitDays, constructionDays, targetPods]);

  useEffect(() => {
    const container = threeMountRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x090710);

    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 8, 26);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);

    const ambLight = new THREE.HemisphereLight(0xfde6d8, 0x2a1814, 0.75);
    scene.add(ambLight);

    const sunLight = new THREE.DirectionalLight(0xfff5ea, 2.4);
    sunLight.position.set(30, 40, -50);
    scene.add(sunLight);

    // Starfield
    const starCount = 1000;
    const starGeo = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      starPositions[i * 3] = (Math.random() - 0.5) * 350;
      starPositions[i * 3 + 1] = (Math.random() - 0.5) * 350;
      starPositions[i * 3 + 2] = (Math.random() - 0.5) * 350;

      const tone = Math.random();
      if (tone < 0.6) {
        starColors[i * 3] = 0.95;
        starColors[i * 3 + 1] = 0.98;
        starColors[i * 3 + 2] = 1.0;
      } else if (tone < 0.85) {
        starColors[i * 3] = 1.0;
        starColors[i * 3 + 1] = 0.9;
        starColors[i * 3 + 2] = 0.65;
      } else {
        starColors[i * 3] = 0.65;
        starColors[i * 3 + 1] = 0.85;
        starColors[i * 3 + 2] = 1.0;
      }
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3));

    const starMat = new THREE.PointsMaterial({
      size: 1.3,
      sizeAttenuation: false,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
    });
    const starfield = new THREE.Points(starGeo, starMat);
    scene.add(starfield);

    // STAGE 1: TRANSIT
    const transitGroup = new THREE.Group();
    scene.add(transitGroup);

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

    const earthTex = createEarthTexture();
    const earthMesh = new THREE.Mesh(
      new THREE.SphereGeometry(4.2, 36, 36),
      new THREE.MeshStandardMaterial({ map: earthTex, roughness: 0.65, metalness: 0.1 })
    );
    const earthPos = new THREE.Vector3(-26, 0, -8);
    earthMesh.position.copy(earthPos);
    transitGroup.add(earthMesh);

    const earthAtmo = new THREE.Mesh(
      new THREE.SphereGeometry(4.45, 32, 32),
      new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.25,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
      })
    );
    earthMesh.add(earthAtmo);

    const moonTex = createMoonTexture();
    const moonMesh = new THREE.Mesh(
      new THREE.SphereGeometry(1.1, 24, 24),
      new THREE.MeshStandardMaterial({ map: moonTex, roughness: 0.85, metalness: 0.05 })
    );
    moonMesh.position.set(6.5, 1.5, 0);
    earthMesh.add(moonMesh);

    const marsTex = createMarsGlobeTexture();
    const marsMesh = new THREE.Mesh(
      new THREE.SphereGeometry(3.0, 36, 36),
      new THREE.MeshStandardMaterial({ map: marsTex, roughness: 0.8, metalness: 0.08 })
    );
    const marsPos = new THREE.Vector3(28, 2, -6);
    marsMesh.position.copy(marsPos);
    transitGroup.add(marsMesh);

    const marsAtmo = new THREE.Mesh(
      new THREE.SphereGeometry(3.2, 32, 32),
      new THREE.MeshBasicMaterial({
        color: 0xe05a36,
        transparent: true,
        opacity: 0.22,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
      })
    );
    marsMesh.add(marsAtmo);

    const targetBeacon = new THREE.Mesh(
      new THREE.RingGeometry(0.25, 0.45, 16),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide })
    );
    targetBeacon.position.set(0.8, 1.1, 2.7);
    targetBeacon.lookAt(marsMesh.position);
    marsMesh.add(targetBeacon);

    const transferCurve = new THREE.CubicBezierCurve3(
      new THREE.Vector3(earthPos.x + 4.5, earthPos.y, earthPos.z),
      new THREE.Vector3((earthPos.x + marsPos.x) * 0.45, 10, -18),
      new THREE.Vector3((earthPos.x + marsPos.x) * 0.55, 12, -14),
      new THREE.Vector3(marsPos.x - 3.5, marsPos.y, marsPos.z)
    );

    const orbitGeo = new THREE.BufferGeometry().setFromPoints(transferCurve.getPoints(64));
    const orbitLine = new THREE.Line(
      orbitGeo,
      new THREE.LineDashedMaterial({
        color: 0x38bdf8,
        dashSize: 1.2,
        gapSize: 0.8,
        transparent: true,
        opacity: 0.6,
      })
    );
    orbitLine.computeLineDistances();
    transitGroup.add(orbitLine);

    const spacecraft = createSpacecraftMesh();
    spacecraft.scale.set(0.85, 0.85, 0.85);
    transitGroup.add(spacecraft);

    const plumeParticleCount = 80;
    const plumeTex = createParticleTexture();
    const plumeGeo = new THREE.BufferGeometry();
    const plumePos = new Float32Array(plumeParticleCount * 3);
    plumeGeo.setAttribute('position', new THREE.BufferAttribute(plumePos, 3));
    const plumeParticles = new THREE.Points(
      plumeGeo,
      new THREE.PointsMaterial({
        size: 2.2,
        map: plumeTex,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    transitGroup.add(plumeParticles);

    // STAGE 2: SURFACE CONSTRUCTION
    const surfaceGroup = new THREE.Group();
    surfaceGroup.visible = false;
    scene.add(surfaceGroup);

    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    const regolithTex = createMarsRegolithTexture(maxAniso);
    const bumpTex = createMarsBumpTexture(maxAniso);
    const groundMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(160, 160, 32, 32),
      new THREE.MeshStandardMaterial({
        map: regolithTex,
        bumpMap: bumpTex,
        bumpScale: 0.16,
        roughness: 0.9,
        metalness: 0.08,
      })
    );
    groundMesh.rotation.x = -Math.PI / 2;
    surfaceGroup.add(groundMesh);

    const gridLines = new THREE.GridHelper(84, 14, 0x6d4aff, 0x2b1e4a);
    gridLines.position.y = 0.03;
    surfaceGroup.add(gridLines);

    const constructedPodMeshes: THREE.Group[] = [];
    const podCoordMap = new Map<string, PlacedPod>();

    for (let i = 0; i < targetPods.length; i++) {
      const p = targetPods[i];
      const def = POD_MAP.get(p.podId);
      if (!def) continue;

      const podMesh = createPodMesh(def, false, true);
      podMesh.position.set(p.gridX * 6.0, 0, p.gridZ * 6.0);
      podMesh.rotation.y = THREE.MathUtils.degToRad(p.rotation);
      podMesh.scale.set(0, 0, 0);
      surfaceGroup.add(podMesh);
      constructedPodMeshes.push(podMesh);
      podCoordMap.set(`${p.gridX},${p.gridZ}`, p);
    }

    const tunnelsGroup = new THREE.Group();
    surfaceGroup.add(tunnelsGroup);

    // Assembly Drone
    const drone = new THREE.Group();
    const droneBody = new THREE.Mesh(
      new THREE.BoxGeometry(0.85, 0.35, 0.85),
      new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.75, roughness: 0.25 })
    );
    drone.add(droneBody);

    const droneLight = new THREE.PointLight(0x38bdf8, 2.2, 12);
    droneLight.position.y = -0.2;
    drone.add(droneLight);

    const laserMat = new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.85 });
    const laserLine1 = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-0.3, 0, 0), new THREE.Vector3(0, -3.2, 0)]),
      laserMat
    );
    drone.add(laserLine1);

    const laserLine2 = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0.3, 0, 0), new THREE.Vector3(0, -3.2, 0)]),
      laserMat
    );
    drone.add(laserLine2);

    drone.position.set(0, 4.5, 0);
    surfaceGroup.add(drone);

    const sparkCount = 80;
    const sparkGeo = new THREE.BufferGeometry();
    sparkGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(sparkCount * 3), 3));
    const sparkPoints = new THREE.Points(
      sparkGeo,
      new THREE.PointsMaterial({
        color: 0x67e8f9,
        size: 2.0,
        sizeAttenuation: false,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
      })
    );
    surfaceGroup.add(sparkPoints);

    let animId = 0;
    const clock = new THREE.Clock();

    function renderLoop() {
      animId = requestAnimationFrame(renderLoop);
      const elapsed = clock.getElapsedTime();
      const { progress: animProg, phase: animPhase, podIndex: animPodIdx } = animStateRef.current;

      starfield.rotation.y = elapsed * 0.0015;

      if (animPhase === 'transit') {
        transitGroup.visible = true;
        surfaceGroup.visible = false;
        scene.fog = null;
        scene.background = new THREE.Color(0x090710);

        earthMesh.rotation.y = elapsed * 0.05;
        moonMesh.position.x = Math.sin(elapsed * 0.4) * 6.5;
        moonMesh.position.z = Math.cos(elapsed * 0.4) * 6.5;
        marsMesh.rotation.y = elapsed * 0.04;
        targetBeacon.rotation.z = elapsed * 1.5;

        const t = Math.max(0, Math.min(1, animProg));
        const shipPos = transferCurve.getPoint(t);
        const tangent = transferCurve.getTangent(t).normalize();

        spacecraft.position.copy(shipPos);
        spacecraft.lookAt(shipPos.clone().add(tangent));
        spacecraft.rotateX(-Math.PI / 2);
        spacecraft.rotateZ(Math.sin(elapsed * 2) * 0.06);

        const plumePosAttr = plumeParticles.geometry.attributes.position as THREE.BufferAttribute;
        for (let i = 0; i < plumeParticleCount; i++) {
          const trailDist = (i / plumeParticleCount) * 4.5;
          const jitter = (Math.random() - 0.5) * 0.16;
          plumePosAttr.setXYZ(
            i,
            shipPos.x - tangent.x * trailDist + jitter,
            shipPos.y - tangent.y * trailDist + jitter,
            shipPos.z - tangent.z * trailDist + jitter
          );
        }
        plumePosAttr.needsUpdate = true;

        const orbitAngle = t * Math.PI * 1.4 - 0.5;
        const camDist = 18 - Math.sin(t * Math.PI) * 5;
        camera.position.set(
          shipPos.x + Math.sin(orbitAngle) * camDist,
          shipPos.y + 4.5 + Math.cos(t * Math.PI * 2) * 2.5,
          shipPos.z + Math.cos(orbitAngle) * camDist + 3.0
        );
        camera.lookAt(shipPos.x, shipPos.y + 0.5, shipPos.z);
      } else {
        transitGroup.visible = false;
        surfaceGroup.visible = true;
        if (!scene.fog) {
          scene.fog = new THREE.FogExp2(0x130e1e, 0.008);
          scene.background = new THREE.Color(0x130e1e);
        }

        const constProg = Math.max(0, Math.min(1, animProg));
        const activeIdx = animPodIdx;
        const numPods = constructedPodMeshes.length;

        const camOrbit = elapsed * 0.25;
        const camRadius = 26;
        camera.position.set(Math.sin(camOrbit) * camRadius, 14, Math.cos(camOrbit) * camRadius);
        camera.lookAt(0, 1.5, 0);

        for (let i = 0; i < numPods; i++) {
          const mesh = constructedPodMeshes[i];
          if (i < activeIdx) {
            mesh.scale.set(1, 1, 1);
          } else if (i === activeIdx) {
            const podFraction = constProg * numPods - activeIdx;
            const popScale = Math.min(1, Math.max(0, podFraction * 1.3));
            const spring = popScale > 0.85 ? 1.0 + (1 - popScale) * 0.35 : popScale * 1.12;
            mesh.scale.set(spring, spring, spring);

            drone.position.x = THREE.MathUtils.lerp(drone.position.x, mesh.position.x, 0.15);
            drone.position.z = THREE.MathUtils.lerp(drone.position.z, mesh.position.z, 0.15);
            drone.position.y = 4.2 + Math.sin(elapsed * 4) * 0.25;

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
            mesh.scale.set(0, 0, 0);
          }
        }

        while (tunnelsGroup.children.length > 0) {
          tunnelsGroup.remove(tunnelsGroup.children[0]);
        }
        for (let i = 0; i <= activeIdx; i++) {
          const currentP = targetPods[i];
          if (!currentP) continue;

          const eastNeighbor = podCoordMap.get(`${currentP.gridX + 1},${currentP.gridZ}`);
          if (eastNeighbor) {
            const eastIdx = targetPods.findIndex((p) => p.instanceId === eastNeighbor.instanceId);
            if (eastIdx !== -1 && eastIdx <= activeIdx) {
              tunnelsGroup.add(
                createConnectionTunnelMesh(
                  currentP.gridX * 6.0,
                  currentP.gridZ * 6.0,
                  (currentP.gridX + 1) * 6.0,
                  currentP.gridZ * 6.0
                )
              );
            }
          }

          const southNeighbor = podCoordMap.get(`${currentP.gridX},${currentP.gridZ + 1}`);
          if (southNeighbor) {
            const southIdx = targetPods.findIndex((p) => p.instanceId === southNeighbor.instanceId);
            if (southIdx !== -1 && southIdx <= activeIdx) {
              tunnelsGroup.add(
                createConnectionTunnelMesh(
                  currentP.gridX * 6.0,
                  currentP.gridZ * 6.0,
                  currentP.gridX * 6.0,
                  (currentP.gridZ + 1) * 6.0
                )
              );
            }
          }
        }
      }

      renderer.render(scene, camera);
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
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      if (container && renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [targetPods]);

  const distanceTraveledMkm = (progress * 225.3).toFixed(1);
  const flightVelocity = (21.4 + Math.sin(progress * Math.PI) * 4.2).toFixed(1);
  const commDelayMin = (3.2 + progress * 15.6).toFixed(1);

  const activePod = targetPods[currentPodIndex];
  const activePodDef = activePod ? POD_MAP.get(activePod.podId) : null;
  const activeCategoryTheme = activePodDef ? CATEGORY_COLORS[activePodDef.category] : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#06040C]/85">
      <div className="w-full max-w-4xl rounded-2xl bg-[#131021] border border-violet-300/18 shadow-2xl overflow-hidden flex flex-col text-left">
        {/* Header Bar */}
        <div className="px-5 py-4 border-b border-violet-300/12 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#1B1630] border border-violet-300/15 flex items-center justify-center">
              {phase === 'transit' ? (
                <Rocket className="w-4 h-4 text-violet-300" />
              ) : (
                <Wrench className="w-4 h-4 text-violet-400" />
              )}
            </div>

            <div>
              <span className="text-[11px] font-medium text-violet-200/60 block">
                {phase === 'transit'
                  ? 'Phase 1 · Interplanetary Transit'
                  : 'Phase 2 · Surface Robotic Assembly'}
              </span>
              <h3 className="text-base font-semibold text-violet-50 tabular-nums">
                {phase === 'transit'
                  ? `Earth to Mars · Day ${currentDay} of ${transitDays}`
                  : `Colony Construction · Sol ${currentDay} of ${constructionDays}`}
              </h3>
            </div>
          </div>

          <button
            onClick={() => {
              audioManager.playClick();
              onSkipRef.current();
            }}
            className="px-3.5 py-2 rounded-lg bg-[#1B1630] hover:bg-[#241D3F] border border-violet-300/15 text-violet-100 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Skip Sequence"
            aria-label="Skip Sequence"
          >
            <FastForward className="w-3.5 h-3.5 text-violet-400" />
            <span>Skip</span>
          </button>
        </div>

        {/* 3D WebGL Viewport */}
        <div className="relative w-full h-80 sm:h-96 bg-[#090710] overflow-hidden border-b border-violet-300/12">
          <div ref={threeMountRef} className="w-full h-full block cursor-default" />

          {phase === 'transit' && (
            <div className="absolute bottom-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-violet-100 bg-[#131021]/95 px-4 py-2 rounded-xl border border-violet-300/15 tabular-nums">
              <span>Velocity: {flightVelocity} km/s</span>
              <span>Distance: {distanceTraveledMkm}M / 225.3M km</span>
              <span className="hidden sm:inline">Signal Delay: {commDelayMin} min</span>
              <span className="text-violet-200/60">Hohmann Transfer (1.00 → 1.52 AU)</span>
            </div>
          )}

          {phase === 'construction' && (
            <div className="absolute top-4 left-4 right-4 sm:right-auto sm:max-w-md pointer-events-none">
              <div className="p-3.5 rounded-xl bg-[#131021]/95 border border-violet-300/18 shadow-xl text-left">
                <div className="flex items-center gap-3">
                  <div className="relative w-11 h-11 shrink-0 flex items-center justify-center">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 48 48">
                      <circle
                        cx="24"
                        cy="24"
                        r="20"
                        className="stroke-violet-300/15 fill-none"
                        strokeWidth="3.5"
                      />
                      <circle
                        cx="24"
                        cy="24"
                        r="20"
                        className="stroke-[#8B5CF6] fill-none transition-all duration-150"
                        strokeWidth="3.5"
                        strokeDasharray={125.6}
                        strokeDashoffset={125.6 * (1 - (progress * targetPods.length - currentPodIndex))}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-[10px] font-mono font-semibold text-violet-50 tabular-nums">
                        {Math.round(progress * 100)}%
                      </span>
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: activeCategoryTheme?.hex || '#8B5CF6' }}
                      />
                      <h4 className="text-xs font-semibold text-violet-50 truncate">
                        {activePodDef?.name || 'Base Module'}
                      </h4>
                      <span className="text-[10px] font-mono text-violet-200/60 tabular-nums">
                        [{activePod?.gridX}, {activePod?.gridZ}]
                      </span>
                    </div>
                    <p className="text-xs text-violet-200/80 leading-snug line-clamp-2">
                      {activePodActionText}
                    </p>
                  </div>
                </div>

                <div className="mt-2.5 pt-2 border-t border-violet-300/12 flex items-center justify-between text-[11px] font-mono text-violet-200/60 tabular-nums">
                  <span>Module {currentPodIndex + 1} / {targetPods.length}</span>
                  <span className="text-emerald-400">Laser Welding Active</span>
                  <span>Sol {currentDay} / {constructionDays}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Progress */}
        <div className="px-5 py-4 space-y-2.5">
          <div className="flex items-center justify-between text-xs tabular-nums">
            <span className="text-violet-200/65">
              {phase === 'transit'
                ? 'Transfer Trajectory Progress'
                : `Surface Assembly (${currentPodIndex + 1} of ${targetPods.length} modules)`}
            </span>
            <span className="font-mono font-semibold text-violet-50">
              {Math.round(progress * 100)}%
            </span>
          </div>

          <div className="w-full h-2 rounded-full bg-violet-300/12 overflow-hidden">
            <div
              className="h-full bg-[#8B5CF6] transition-all duration-100"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
