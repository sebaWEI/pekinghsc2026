import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { igemStatic } from '../content/igemAssets';

export interface RnaGlyphApi {
  readonly canvas: HTMLCanvasElement;
  /** Feed scroll delta to spin the model (decays naturally). */
  addScrollDelta(dy: number): void;
  start(): void;
  stop(): void;
  destroy(): void;
}

/**
 * Small 3D RNA model renderer. Loads rna_model_final.glb (same as hero),
 * filters out part_* hitbox meshes, spins on scroll input with momentum decay.
 */
export function createRnaGlyph(): RnaGlyphApi {
  const SIZE = 180;
  const canvas = document.createElement('canvas');
  canvas.width = SIZE * devicePixelRatio;
  canvas.height = SIZE * devicePixelRatio;
  canvas.style.width = `${SIZE}px`;
  canvas.style.height = `${SIZE}px`;

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setSize(canvas.width, canvas.height, false);
  renderer.setPixelRatio(devicePixelRatio);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 40);
  camera.position.set(0, 0.3, 5.5);
  camera.lookAt(0, 0, 0);

  scene.add(new THREE.AmbientLight(0x334466, 2.5));
  const key = new THREE.DirectionalLight(0xaaccff, 4);
  key.position.set(3, 2, 4);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x6644aa, 2.5);
  rim.position.set(-3, -0.5, -2);
  scene.add(rim);

  const modelRoot = new THREE.Group();
  scene.add(modelRoot);

  // Scroll-driven rotation state
  let rotVelY = 0;
  let rotVelX = 0;
  let animId = 0;
  let running = false;
  let lastTime = performance.now();

  const loader = new GLTFLoader();
  loader.load(
    igemStatic('/models/rna_model_final.glb'),
    (gltf) => {
      const model = gltf.scene;

      // Hide interaction hitboxes (same filter as hero scene)
      model.traverse((child) => {
        if (child instanceof THREE.Mesh && child.name.startsWith('part_')) {
          child.visible = false;
        }
      });

      // Center and scale
      const box = new THREE.Box3().setFromObject(model);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const scale = 2.8 / Math.max(size.x, size.y, size.z);
      model.scale.setScalar(scale);
      model.position.sub(center.clone().multiplyScalar(scale));

      // Rotate to match hero orientation
      model.rotation.y += Math.PI * 1.5;

      // Double-sided + subtle emissive
      model.traverse((child) => {
        if (child instanceof THREE.Mesh && !child.name.startsWith('part_')) {
          const mats = Array.isArray(child.material) ? child.material : [child.material];
          for (const m of mats) {
            if (m instanceof THREE.MeshStandardMaterial) {
              m.side = THREE.DoubleSide;
              m.emissive = m.color.clone().multiplyScalar(0.25);
              m.emissiveIntensity = 1;
              m.needsUpdate = true;
            }
          }
        }
      });

      modelRoot.add(model);
    },
    undefined,
    () => console.warn('[glyph] RNA model failed to load'),
  );

  function animate() {
    if (!running) return;
    animId = requestAnimationFrame(animate);

    const now = performance.now();
    const dt = Math.min((now - lastTime) * 0.001, 0.05);
    lastTime = now;

    // Decay rotation velocity
    const decay = Math.pow(0.88, dt * 60);
    rotVelY *= decay;
    rotVelX *= decay;

    // Apply rotation
    modelRoot.rotation.y += rotVelY * dt * 2.5;
    modelRoot.rotation.x += rotVelX * dt * 1.2;

    renderer.render(scene, camera);
  }

  return {
    canvas,
    addScrollDelta(dy: number) {
      // Clamp impulse, add to velocity
      const impulse = Math.max(-3, Math.min(3, dy * 0.004));
      rotVelY += impulse;
      rotVelX += impulse * 0.3;
      rotVelY = Math.max(-4, Math.min(4, rotVelY));
      rotVelX = Math.max(-1.5, Math.min(1.5, rotVelX));
    },
    start() {
      if (running) return;
      running = true;
      lastTime = performance.now();
      animate();
    },
    stop() {
      running = false;
      cancelAnimationFrame(animId);
    },
    destroy() {
      running = false;
      cancelAnimationFrame(animId);
      renderer.dispose();
      scene.clear();
    },
  };
}
