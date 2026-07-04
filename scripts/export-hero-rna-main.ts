import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

declare global {
  interface Window {
    __HERO_RNA_PNG__?: string;
  }
}

const WIDTH = 3840;
const HEIGHT = 2160;

const FINAL_CAMERA_POS = new THREE.Vector3(7.15, 2.62, 10.35);
const FINAL_LOOK_AT = new THREE.Vector3(-0.2, 0.2, 0);
const POST_CLICK_RNA_X = -0.78;
const POST_CLICK_RNA_Y = 0;

async function loadHeroModel(url: string): Promise<THREE.Object3D> {
  const gltf = await new GLTFLoader().loadAsync(url);
  const model = gltf.scene;

  const preBox = new THREE.Box3().setFromObject(model);
  const preSize = preBox.getSize(new THREE.Vector3());
  model.scale.setScalar(8.0 / Math.max(preSize.y, 1e-4));

  const box = new THREE.Box3().setFromObject(model);
  model.position.sub(box.getCenter(new THREE.Vector3()));
  model.position.y += 0.15;
  model.rotation.x = -Math.PI * 0.03;
  model.updateWorldMatrix(true, true);

  model.traverse((child) => {
    if (!(child instanceof THREE.Mesh) || !child.material) return;

    if (child.name.startsWith('part_')) {
      child.visible = false;
      return;
    }

    const mats = Array.isArray(child.material) ? child.material : [child.material];
    for (const material of mats) {
      material.visible = true;
      material.side = THREE.DoubleSide;
      if ('opacity' in material) {
        material.opacity = 1;
      }
      if ('transparent' in material) {
        material.transparent = true;
      }
      if ('depthWrite' in material) {
        material.depthWrite = true;
      }
      material.needsUpdate = true;
    }
  });

  const totalBox = new THREE.Box3().setFromObject(model);
  model.position.sub(totalBox.getCenter(new THREE.Vector3()));
  model.rotation.y += Math.PI * 1.5;
  model.updateWorldMatrix(true, true);

  return model;
}

function assertCanvasHasContent(renderer: THREE.WebGLRenderer) {
  const gl = renderer.getContext();
  const sampleW = 64;
  const sampleH = 64;
  const pixels = new Uint8Array(sampleW * sampleH * 4);
  gl.readPixels(0, 0, sampleW, sampleH, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

  let brightness = 0;
  for (let i = 0; i < pixels.length; i += 4) {
    brightness += pixels[i]! + pixels[i + 1]! + pixels[i + 2]!;
  }

  if (brightness < 5000) {
    throw new Error('Rendered canvas appears blank');
  }
}

async function exportHeroRnaPng() {
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    preserveDrawingBuffer: true,
  });
  renderer.setSize(WIDTH, HEIGHT, false);
  renderer.setPixelRatio(1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;
  renderer.setClearColor(0x050510, 1);

  const camera = new THREE.PerspectiveCamera(50, WIDTH / HEIGHT, 0.05, 60);
  camera.position.copy(FINAL_CAMERA_POS);
  camera.lookAt(FINAL_LOOK_AT);

  const scene = new THREE.Scene();
  scene.add(new THREE.AmbientLight(0x334466, 3));

  const keyLight = new THREE.DirectionalLight(0xaaccff, 7);
  keyLight.position.set(5, 3, 5);
  scene.add(keyLight);

  const rimLight = new THREE.DirectionalLight(0x6644aa, 5);
  rimLight.position.set(-4, -1, -3);
  scene.add(rimLight);

  const fillLight = new THREE.DirectionalLight(0x44aacc, 2.5);
  fillLight.position.set(0, -3, 2);
  scene.add(fillLight);

  const topLight = new THREE.DirectionalLight(0xffccaa, 3);
  topLight.position.set(0, 6, 1);
  scene.add(topLight);

  const model = await loadHeroModel('/models/rna_model_final.glb');

  const rnaVisualRoot = new THREE.Group();
  rnaVisualRoot.position.set(POST_CLICK_RNA_X, POST_CLICK_RNA_Y, 0);
  rnaVisualRoot.add(model);
  scene.add(rnaVisualRoot);

  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });

  renderer.render(scene, camera);
  assertCanvasHasContent(renderer);

  window.__HERO_RNA_PNG__ = canvas.toDataURL('image/png');
  document.body.dataset.exportReady = '1';

  renderer.dispose();
}

exportHeroRnaPng().catch((error) => {
  console.error(error);
  document.body.dataset.exportError = String(error);
});
