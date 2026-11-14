import * as THREE from 'three';
import { PodDefinition } from '../types';
import { createPodMesh } from './podGeometries';

const previewCache = new Map<string, string>();

let sharedRenderer: THREE.WebGLRenderer | null = null;
let sharedScene: THREE.Scene | null = null;
let sharedCamera: THREE.PerspectiveCamera | null = null;

function ensureStudioRig(width: number, height: number) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return null;
  if (sharedRenderer && sharedScene && sharedCamera) {
    sharedRenderer.setSize(width, height, false);
    sharedCamera.aspect = width / height;
    sharedCamera.updateProjectionMatrix();
    return { renderer: sharedRenderer, scene: sharedScene, camera: sharedCamera };
  }

  try {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
      powerPreference: 'default',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;

    const scene = new THREE.Scene();

    // Three-point studio lighting for crisp 3D aerospace module photography
    const hemi = new THREE.HemisphereLight(0xdce6ff, 0x3b221a, 0.95);
    scene.add(hemi);

    const keyLight = new THREE.DirectionalLight(0xfff1dc, 2.3);
    keyLight.position.set(6, 9, 7);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x93c5fd, 0.9);
    fillLight.position.set(-7, 4, 5);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xc4b5fd, 1.35);
    rimLight.position.set(-4, 6, -8);
    scene.add(rimLight);

    // Subtle matte orbital pad beneath module
    const padGeo = new THREE.CylinderGeometry(3.15, 3.25, 0.12, 36);
    const padMat = new THREE.MeshStandardMaterial({
      color: 0x1e1a2b,
      roughness: 0.72,
      metalness: 0.35,
    });
    const pad = new THREE.Mesh(padGeo, padMat);
    pad.position.y = -0.07;
    scene.add(pad);

    const ringGeo = new THREE.RingGeometry(3.16, 3.23, 48);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x7c3aed,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = -0.005;
    scene.add(ring);

    const camera = new THREE.PerspectiveCamera(34, width / height, 0.1, 100);

    sharedRenderer = renderer;
    sharedScene = scene;
    sharedCamera = camera;

    return { renderer, scene, camera };
  } catch {
    return null;
  }
}

export function renderPodPreviewDataUrl(pod: PodDefinition): string | null {
  if (previewCache.has(pod.id)) {
    return previewCache.get(pod.id)!;
  }

  const rig = ensureStudioRig(420, 315);
  if (!rig) return null;

  const { renderer, scene, camera } = rig;
  const podGroup = createPodMesh(pod, false, true);
  podGroup.rotation.y = Math.PI * 0.22;
  scene.add(podGroup);

  // Auto-frame bounding box cleanly inside the 4:3 frame
  const box = new THREE.Box3().setFromObject(podGroup);
  const center = new THREE.Vector3();
  const size = new THREE.Vector3();
  box.getCenter(center);
  box.getSize(size);

  const maxDim = Math.max(size.x, size.y, size.z, 3.5);
  const fovRad = THREE.MathUtils.degToRad(camera.fov);
  const dist = (maxDim / (2 * Math.tan(fovRad / 2))) * 1.48;

  camera.position.set(
    center.x + dist * 0.74,
    center.y + dist * 0.56,
    center.z + dist * 0.78
  );
  camera.lookAt(center.x, center.y + 0.08, center.z);
  camera.updateMatrixWorld();

  renderer.render(scene, camera);
  const dataUrl = renderer.domElement.toDataURL('image/png');

  scene.remove(podGroup);
  previewCache.set(pod.id, dataUrl);
  return dataUrl;
}
