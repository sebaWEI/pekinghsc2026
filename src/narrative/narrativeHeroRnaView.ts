import * as THREE from 'three';

/** 与主页共用 scene；内嵌相机仅渲染启用此层的 RNA 表面（避免环带 / 粒子等混入相框） */
export const RNA_INSET_LAYER = 10;

/** 叙事 Hero 相框：RNA / SINEUP 等入场动画共用参数 */
export const NARRATIVE_HERO_ENTRANCE = {
  /** 相框进入视口足够多且滚动稳定后再触发 */
  START_OPACITY: 0.98,
  /** 触发后再等一小会儿，避免与滚动抢镜 */
  SETTLE: 0.45,
  /** 淡入 + 上冒 / 切角同步完成，略快 */
  DURATION: 1.15,
} as const;
/** 静态构图距离系数：越大 RNA 在相框里越小 */
const DIST_FINAL = 0.76;

function easeOutExpo(t: number): number {
  return t >= 1 ? 1 : 1 - 2 ** (-10 * t);
}

export interface NarrativeHeroRnaView {
  update(dt: number): void;
  /** 与 `.story-section--hero` 的 `--hero-narrative-opacity` 同步；接近 0 时跳过渲染 */
  setNarrativeOpacity(p: number): void;
  dispose(): void;
}

/**
 * 叙事 Design 相框内：延迟触发后，淡入与自下而上冒出同步进行，大小不变。
 */
export function createNarrativeHeroRnaView(
  host: HTMLElement,
  scene: THREE.Scene,
  options: {
    getModelForBounds: () => THREE.Object3D;
  },
): NarrativeHeroRnaView {
  const canvas = document.createElement('canvas');
  canvas.className = 'hero-glyph__canvas';
  host.appendChild(canvas);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;
  renderer.setClearColor(0x000000, 0);

  const cam = new THREE.PerspectiveCamera(36, 1, 0.04, 96);
  cam.layers.disableAll();
  cam.layers.enable(RNA_INSET_LAYER);

  const { getModelForBounds } = options;

  let narrativeOpacity = 0;
  let lastW = 0;
  let lastH = 0;
  let entranceElapsed = 0;
  let entranceStarted = false;
  let entranceDone = false;

  const viewDir = new THREE.Vector3(0.38, 0.22, 0.9).normalize();
  const lookOffset = new THREE.Vector3();
  const lookOffsetStart = new THREE.Vector3();
  const lookOffsetEnd = new THREE.Vector3();
  const camPos = new THREE.Vector3();
  const lookTarget = new THREE.Vector3();

  function resizeFromHost(): void {
    const w = host.clientWidth;
    const h = host.clientHeight;
    if (w < 2 || h < 2) return;
    if (w === lastW && h === lastH) return;
    lastW = w;
    lastH = h;
    renderer.setSize(w, h, false);
    cam.aspect = w / h;
    cam.updateProjectionMatrix();
  }

  const ro = new ResizeObserver(() => resizeFromHost());
  ro.observe(host);
  resizeFromHost();

  function getEntranceProgress(): number {
    if (entranceDone) return 1;
    if (!entranceStarted) return 0;

    const elapsed = entranceElapsed - NARRATIVE_HERO_ENTRANCE.SETTLE;
    if (elapsed <= 0) return 0;

    const t = Math.min(1, elapsed / NARRATIVE_HERO_ENTRANCE.DURATION);
    if (t >= 1) entranceDone = true;
    return easeOutExpo(t);
  }

  return {
    setNarrativeOpacity(p: number) {
      narrativeOpacity = THREE.MathUtils.clamp(p, 0, 1);
    },

    update(dt: number) {
      if (narrativeOpacity < NARRATIVE_HERO_ENTRANCE.START_OPACITY * 0.95) {
        canvas.style.opacity = '0';
        return;
      }

      if (!entranceStarted && narrativeOpacity >= NARRATIVE_HERO_ENTRANCE.START_OPACITY) {
        entranceStarted = true;
        entranceElapsed = 0;
      }

      if (entranceStarted && !entranceDone) {
        entranceElapsed += dt;
      }

      resizeFromHost();

      const progress = getEntranceProgress();
      canvas.style.opacity = String(progress);
      if (progress <= 0.001) return;

      const model = getModelForBounds();
      const box = new THREE.Box3().setFromObject(model);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z, 0.01);

      const fovRad = (cam.fov * Math.PI) / 180;
      const dist = ((maxDim * 0.52) / Math.tan(fovRad / 2)) * DIST_FINAL;

      camPos.copy(center).addScaledVector(viewDir, dist);
      cam.position.copy(camPos);

      // 视线从高 → 低：屏幕内容自下往上冒（之前反了所以像从上往下）
      lookOffsetStart.set(-maxDim * 0.14, maxDim * 0.32, -maxDim * 0.04);
      lookOffsetEnd.set(-maxDim * 0.14, maxDim * 0.04, -maxDim * 0.05);
      lookOffset.copy(lookOffsetStart).lerp(lookOffsetEnd, progress);
      lookTarget.copy(center).add(lookOffset);
      cam.up.set(0, 1, 0);
      cam.lookAt(lookTarget);

      const bg = scene.background;
      const env = scene.environment;
      scene.background = null;
      scene.environment = null;
      renderer.render(scene, cam);
      scene.background = bg;
      scene.environment = env;
    },

    dispose() {
      ro.disconnect();
      renderer.dispose();
      canvas.remove();
    },
  };
}
