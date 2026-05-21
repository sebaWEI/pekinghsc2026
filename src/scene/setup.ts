import * as THREE from 'three';

export interface SceneSetup {
  renderer: THREE.WebGLRenderer;
  camera: THREE.PerspectiveCamera;
  scene: THREE.Scene;
}

export function createSceneSetup(canvas: HTMLCanvasElement): SceneSetup {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;

  const camera = new THREE.PerspectiveCamera(54, window.innerWidth / window.innerHeight, 0.05, 60);
  camera.position.set(0, 1.3, 8.5);

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

  return { renderer, camera, scene };
}

