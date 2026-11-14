import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { MarsLandingSite } from '../types';
import {
  PRESET_MARS_SITES,
  deriveLandingSiteFromLatLon,
  formatMarsCoordinates,
} from '../utils/marsSites';
import { audioManager } from '../utils/audioManager';
import { getOrCreateMarsGlobeAssets } from '../utils/marsGlobeBuilder';

interface MarsGlobeSelectorProps {
  selectedSite: MarsLandingSite;
  onSelectSite: (site: MarsLandingSite) => void;
  className?: string;
}

function latLonToVec3(latDeg: number, lonDeg: number, radius: number, out: THREE.Vector3): THREE.Vector3 {
  const phi = THREE.MathUtils.degToRad(90 - latDeg);
  const theta = THREE.MathUtils.degToRad(lonDeg + 180);
  out.set(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
  return out;
}

function vec3ToLatLon(localPoint: THREE.Vector3): { lat: number; lon: number } {
  const n = localPoint.clone().normalize();
  const lat = 90 - THREE.MathUtils.radToDeg(Math.acos(THREE.MathUtils.clamp(n.y, -1, 1)));
  // Match Three.js SphereGeometry UV/equirectangular mapping
  let lon = THREE.MathUtils.radToDeg(Math.atan2(n.z, -n.x)) - 180;
  if (lon < -180) lon += 360;
  if (lon > 180) lon -= 360;
  return { lat, lon };
}

function createCrateredPhobosGeometry(): THREE.BufferGeometry {
  const geo = new THREE.IcosahedronGeometry(0.115, 2);
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();
  const stickneyDir = new THREE.Vector3(0.85, 0.25, 0.45).normalize();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const n = v.clone().normalize();
    let rad = 1.0 + Math.sin(n.x * 5.2 + n.z * 3.8) * 0.08;
    // Stickney crater depression
    const d = n.distanceTo(stickneyDir);
    if (d < 0.55) {
      rad -= 0.24 * Math.pow(1 - d / 0.55, 1.5);
    }
    v.set(n.x * 0.135 * rad, n.y * 0.095 * rad, n.z * 0.105 * rad);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  return geo;
}

export const MarsGlobeSelector: React.FC<MarsGlobeSelectorProps> = ({
  selectedSite,
  onSelectSite,
  className = '',
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [hoverCoords, setHoverCoords] = useState<{ lat: number; lon: number } | null>(null);

  const selectedSiteRef = useRef<MarsLandingSite>(selectedSite);
  selectedSiteRef.current = selectedSite;
  const onSelectSiteRef = useRef(onSelectSite);
  onSelectSiteRef.current = onSelectSite;

  const pinGroupRef = useRef<THREE.Group | null>(null);
  const pulseRingRef = useRef<THREE.Mesh | null>(null);
  const marsGroupRef = useRef<THREE.Group | null>(null);
  const targetCameraDirRef = useRef<THREE.Vector3 | null>(null);
  const presetPinMeshesRef = useRef<Array<{ mesh: THREE.Mesh; site: MarsLandingSite }>>([]);

  // Sync 3D landing pin and smoothly orient camera when selectedSite changes externally
  useEffect(() => {
    const pinGroup = pinGroupRef.current;
    if (!pinGroup) return;

    const surfacePos = new THREE.Vector3();
    latLonToVec3(selectedSite.lat, selectedSite.lon, 2.02, surfacePos);
    pinGroup.position.copy(surfacePos);
    pinGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), surfacePos.clone().normalize());

    // Smoothly turn camera toward preset site selection
    targetCameraDirRef.current = surfacePos.clone().normalize();
  }, [selectedSite]);

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
    scene.background = new THREE.Color(0x0b0816);

    const camera = new THREE.PerspectiveCamera(
      40,
      Math.max(1, container.clientWidth) / Math.max(1, container.clientHeight),
      0.1,
      100
    );
    const initialDir = latLonToVec3(
      selectedSiteRef.current.lat,
      selectedSiteRef.current.lon,
      1,
      new THREE.Vector3()
    ).normalize();
    camera.position.copy(initialDir.multiplyScalar(5.8));

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    container.appendChild(renderer.domElement);

    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.06;
    controls.minDistance = 3.4;
    controls.maxDistance = 8.6;
    controls.rotateSpeed = 0.72;

    controls.addEventListener('start', () => {
      targetCameraDirRef.current = null;
    });

    // Three-point celestial lighting
    const hemi = new THREE.HemisphereLight(0xc4b5fd, 0x2e1312, 0.55);
    scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xfff1e0, 2.35);
    sun.position.set(8, 4, 6);
    scene.add(sun);

    const rim = new THREE.DirectionalLight(0x8b5cf6, 0.65);
    rim.position.set(-7, -3, -6);
    scene.add(rim);

    // Background Starfield
    const starCount = 700;
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 24 + Math.random() * 14;
      starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPos[i * 3 + 1] = r * Math.cos(phi);
      starPos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const stars = new THREE.Points(
      starGeo,
      new THREE.PointsMaterial({ color: 0xe9d5ff, size: 0.075, transparent: true, opacity: 0.7 })
    );
    scene.add(stars);

    // 3D Mars Sphere + Atmosphere Rim
    const marsGroup = new THREE.Group();
    scene.add(marsGroup);
    marsGroupRef.current = marsGroup;

    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    const marsAssets = getOrCreateMarsGlobeAssets(maxAniso);

    const sphereMat = new THREE.MeshStandardMaterial({
      map: marsAssets.albedo,
      normalMap: marsAssets.normal,
      normalScale: new THREE.Vector2(1.35, 1.35),
      roughnessMap: marsAssets.roughness,
      roughness: 1.0,
      metalness: 0.04,
    });
    const marsMesh = new THREE.Mesh(marsAssets.geometry, sphereMat);
    marsMesh.userData.sharedMarsAsset = true;
    marsGroup.add(marsMesh);

    // Subtle Equatorial & Meridian Telemetry Rings
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xa78bfa,
      transparent: true,
      opacity: 0.16,
      side: THREE.DoubleSide,
    });
    const eqRing = new THREE.Mesh(new THREE.RingGeometry(2.035, 2.045, 72), ringMat);
    eqRing.rotation.x = Math.PI / 2;
    marsGroup.add(eqRing);

    // Fresnel Atmospheric Glow Shell
    const atmoGeo = new THREE.SphereGeometry(2.14, 48, 36);
    const atmoMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uColor: { value: new THREE.Color(0xe07a5f) },
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vViewPosition;
        void main() {
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          vNormal = normalize(normalMatrix * normal);
          vViewPosition = -mvPosition.xyz;
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        varying vec3 vNormal;
        varying vec3 vViewPosition;
        void main() {
          vec3 viewDir = normalize(vViewPosition);
          float rim = pow(clamp(1.0 + dot(vNormal, viewDir), 0.0, 1.0), 2.8);
          gl_FragColor = vec4(uColor, rim * 0.65);
        }
      `,
    });
    const atmoMesh = new THREE.Mesh(atmoGeo, atmoMat);
    marsGroup.add(atmoMesh);

    // Curated Preset Landmark Pins on 3D Mars
    const landmarkMeshes: Array<{ mesh: THREE.Mesh; site: MarsLandingSite }> = [];
    const markerGeo = new THREE.SphereGeometry(0.045, 12, 12);
    const ringMarkerGeo = new THREE.RingGeometry(0.06, 0.085, 20);
    for (const site of PRESET_MARS_SITES) {
      const pos = new THREE.Vector3();
      latLonToVec3(site.lat, site.lon, 2.025, pos);
      const markerMat = new THREE.MeshBasicMaterial({ color: 0xddd6fe });
      const marker = new THREE.Mesh(markerGeo, markerMat);
      marker.position.copy(pos);
      marker.userData = { presetSite: site };
      marsGroup.add(marker);

      const halo = new THREE.Mesh(
        ringMarkerGeo,
        new THREE.MeshBasicMaterial({
          color: 0xa78bfa,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.7,
        })
      );
      halo.position.copy(pos);
      halo.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), pos.clone().normalize());
      marsGroup.add(halo);

      landmarkMeshes.push({ mesh: marker, site });
    }
    presetPinMeshesRef.current = landmarkMeshes;

    // Active Selected Landing Beacon Pin
    const pinGroup = new THREE.Group();
    const stem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.015, 0.02, 0.28, 10),
      new THREE.MeshStandardMaterial({ color: 0xfef3c7, emissive: 0x8b5cf6, emissiveIntensity: 0.8 })
    );
    stem.position.y = 0.14;
    pinGroup.add(stem);

    const orb = new THREE.Mesh(
      new THREE.SphereGeometry(0.065, 16, 16),
      new THREE.MeshStandardMaterial({ color: 0x34d399, emissive: 0x10b981, emissiveIntensity: 0.9 })
    );
    orb.position.y = 0.28;
    pinGroup.add(orb);

    const pulseRing = new THREE.Mesh(
      new THREE.RingGeometry(0.11, 0.145, 32),
      new THREE.MeshBasicMaterial({
        color: 0x34d399,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.85,
      })
    );
    pulseRing.rotation.x = -Math.PI / 2;
    pulseRing.position.y = 0.015;
    pinGroup.add(pulseRing);
    pulseRingRef.current = pulseRing;

    const initPos = new THREE.Vector3();
    latLonToVec3(selectedSiteRef.current.lat, selectedSiteRef.current.lon, 2.02, initPos);
    pinGroup.position.copy(initPos);
    pinGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), initPos.clone().normalize());
    marsGroup.add(pinGroup);
    pinGroupRef.current = pinGroup;

    // Orbiting Sculpted Phobos Moonlet (with Stickney Crater) + MRO Orbital Relay Satellite
    const phobosPivot = new THREE.Group();
    phobosPivot.rotation.z = 0.18;
    const phobosMesh = new THREE.Mesh(
      createCrateredPhobosGeometry(),
      new THREE.MeshStandardMaterial({ color: 0x7c6b64, roughness: 0.94, metalness: 0.04 })
    );
    phobosMesh.position.set(3.08, 0, 0);
    phobosPivot.add(phobosMesh);
    scene.add(phobosPivot);

    const satPivot = new THREE.Group();
    satPivot.rotation.x = 0.55;
    const satGroup = new THREE.Group();
    const satBody = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.055, 0.11, 6),
      new THREE.MeshPhysicalMaterial({ color: 0xd99b26, metalness: 0.94, roughness: 0.2, clearcoat: 0.4 })
    );
    const satDish = new THREE.Mesh(
      new THREE.ConeGeometry(0.075, 0.04, 14, 1, true),
      new THREE.MeshStandardMaterial({ color: 0xf1f5f9, metalness: 0.4, roughness: 0.35, side: THREE.DoubleSide })
    );
    satDish.position.set(0, 0.07, 0);
    satDish.rotation.x = Math.PI;
    const satBoom = new THREE.Mesh(
      new THREE.CylinderGeometry(0.008, 0.008, 0.38, 6),
      new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8, roughness: 0.25 })
    );
    satBoom.rotation.z = Math.PI / 2;
    const satWings = new THREE.Mesh(
      new THREE.BoxGeometry(0.36, 0.008, 0.085),
      new THREE.MeshPhysicalMaterial({ color: 0x1d4ed8, metalness: 0.72, roughness: 0.15, clearcoat: 0.85 })
    );
    satGroup.add(satBody, satDish, satBoom, satWings);
    satGroup.position.set(2.58, 0, 0);
    satPivot.add(satGroup);
    scene.add(satPivot);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // Raycasting for Click-Anywhere Landing Site Selection
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let pointerDownPos = { x: 0, y: 0 };

    const updateMouse = (clientX: number, clientY: number) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    };

    const handlePointerDown = (e: PointerEvent) => {
      pointerDownPos = { x: e.clientX, y: e.clientY };
    };

    const handlePointerMove = (e: PointerEvent) => {
      updateMouse(e.clientX, e.clientY);
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObject(marsMesh, false);
      if (hits.length > 0) {
        const localPt = marsGroup.worldToLocal(hits[0].point.clone());
        setHoverCoords(vec3ToLatLon(localPt));
        renderer.domElement.style.cursor = 'crosshair';
      } else {
        setHoverCoords(null);
        renderer.domElement.style.cursor = 'grab';
      }
    };

    const handlePointerUp = (e: PointerEvent) => {
      const dist = Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y);
      if (dist > 6) return; // Ignore orbit drags

      updateMouse(e.clientX, e.clientY);
      raycaster.setFromCamera(mouse, camera);

      // Check landmark pins first
      const pinHits = raycaster.intersectObjects(
        landmarkMeshes.map((l) => l.mesh),
        false
      );
      if (pinHits.length > 0 && pinHits[0].object.userData.presetSite) {
        audioManager.playClick();
        onSelectSiteRef.current(pinHits[0].object.userData.presetSite);
        return;
      }

      // Otherwise hit anywhere on Mars sphere
      const hits = raycaster.intersectObject(marsMesh, false);
      if (hits.length > 0) {
        const localPt = marsGroup.worldToLocal(hits[0].point.clone());
        const { lat, lon } = vec3ToLatLon(localPt);
        const derived = deriveLandingSiteFromLatLon(lat, lon);
        audioManager.playClick();
        onSelectSiteRef.current(derived);
      }
    };

    renderer.domElement.addEventListener('pointerdown', handlePointerDown);
    renderer.domElement.addEventListener('pointermove', handlePointerMove);
    renderer.domElement.addEventListener('pointerup', handlePointerUp);

    let frameId = 0;
    let lastTime = performance.now();

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    const _desiredCamPos = new THREE.Vector3();

    function tick() {
      const now = performance.now();
      const delta = Math.min(0.1, (now - lastTime) / 1000);
      lastTime = now;
      const t = now * 0.001;

      stars.rotation.y += delta * 0.012;
      phobosPivot.rotation.y += delta * 0.28;
      phobosMesh.rotation.y += delta * 0.4;
      satPivot.rotation.y -= delta * 0.48;

      if (pulseRingRef.current) {
        const s = 1 + ((t * 1.1) % 1) * 0.85;
        pulseRingRef.current.scale.set(s, s, 1);
        (pulseRingRef.current.material as THREE.MeshBasicMaterial).opacity =
          0.85 * (1 - ((t * 1.1) % 1));
      }

      // Smoothly swing camera toward selected landing site when requested
      if (targetCameraDirRef.current) {
        const camDist = camera.position.length();
        _desiredCamPos.copy(targetCameraDirRef.current).multiplyScalar(camDist);
        camera.position.x = THREE.MathUtils.damp(camera.position.x, _desiredCamPos.x, 4.5, delta);
        camera.position.y = THREE.MathUtils.damp(camera.position.y, _desiredCamPos.y, 4.5, delta);
        camera.position.z = THREE.MathUtils.damp(camera.position.z, _desiredCamPos.z, 4.5, delta);
        camera.position.normalize().multiplyScalar(camDist);
        if (camera.position.distanceTo(_desiredCamPos) < 0.04) {
          targetCameraDirRef.current = null;
        }
      }

      controls.update();
      renderer.render(scene, camera);

      if (isSoftwareGl) afterDraw(tick);
      else frameId = requestAnimationFrame(tick);
    }

    tick();

    const handleResize = () => {
      if (!container) return;
      camera.aspect = Math.max(1, container.clientWidth) / Math.max(1, container.clientHeight);
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    const handleContextLost = (e: Event) => {
      e.preventDefault();
    };
    renderer.domElement.addEventListener('webglcontextlost', handleContextLost, false);

    return () => {
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('webglcontextlost', handleContextLost);
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      renderer.domElement.removeEventListener('pointermove', handlePointerMove);
      renderer.domElement.removeEventListener('pointerup', handlePointerUp);
      controls.dispose();
      scene.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.geometry && !mesh.userData.sharedMarsAsset) mesh.geometry.dispose();
        if (mesh.material) {
          const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          mats.forEach((m) => m.dispose());
        }
      });
      renderer.dispose();
      if (container && renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div className={`relative w-full h-full overflow-hidden bg-[#0b0816] ${className}`}>
      <div ref={mountRef} className="w-full h-full" />

      {/* Minimal Live Coordinate Readout */}
      <div className="pointer-events-none absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-[#131021]/90 border border-violet-300/15 text-[11px] font-mono text-violet-100 tabular-nums">
        {hoverCoords
          ? formatMarsCoordinates(hoverCoords.lat, hoverCoords.lon)
          : formatMarsCoordinates(selectedSite.lat, selectedSite.lon)}
      </div>

      {/* Subtle Bottom Drag/Click Guidance */}
      <div className="pointer-events-none absolute bottom-3 left-3 text-[11px] text-violet-200/70">
        Drag to spin · Click anywhere on Mars to set landing site
      </div>
    </div>
  );
};
