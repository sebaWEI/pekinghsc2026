import * as THREE from 'three';
import { MeshSurfaceSampler } from 'three/examples/jsm/math/MeshSurfaceSampler.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { createSceneSetup } from './scene/setup';
import { loadRnaModel } from './rna/modelLoader';
import { resolvePartMeta } from './rna/partRegistry';
import type { InteractionState, PartMeta, RnaPart } from './types/rna';
import { createPartRaycastController } from './interaction/raycast';
import { createHotspotLayer } from './interaction/hotspots';
import { computeFocusCameraTarget } from './camera/cameraController';
import { createIntroCard } from './ui/introCard';
import { WEB_NARRATIVE } from './content/webNarrative';
import { mountNarrative } from './narrative/webNarrativeMount';
import {
  createNarrativeHeroRnaView,
  type NarrativeHeroRnaView,
  RNA_INSET_LAYER,
} from './narrative/narrativeHeroRnaView';
import {
  createNarrativeHeroSineupStrip,
  type NarrativeHeroSineupStrip,
} from './narrative/narrativeHeroSineupStrip';
import { igemStatic } from './content/igemAssets';

const canvas = document.getElementById('hero-canvas') as HTMLCanvasElement;
const hintEl = document.getElementById('click-hint');
const hintTextEl = document.getElementById('hint-text');
const hintRingEl = hintEl?.querySelector('.hint-ring') as HTMLElement | null;
const overlayEl = document.getElementById('overlay');
const scrollExploreHintEl = document.getElementById('scroll-explore-hint');
const showcaseTaglineEl = document.getElementById('hero-showcase-tagline');

/** 与 animate 内 `overviewInteractive` 同步，供窗口级 pointer 在叙事滚动段不要触发 hold · RNA 拾取 */
const heroOverviewInputGate = { active: false };

const { renderer, camera, scene } = createSceneSetup(canvas);
renderer.localClippingEnabled = true;

const BASE_COLORS: THREE.Color[] = [
  new THREE.Color('#ff4d6a'),
  new THREE.Color('#4da6ff'),
  new THREE.Color('#4de8a0'),
  new THREE.Color('#ffb84d'),
];

// --- 🌟 增强点：生成高级质感柔光粒子纹理 ---
function createGlowTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const ctx = c.getContext('2d')!;
  const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
  grad.addColorStop(0.15, 'rgba(220, 240, 255, 0.9)');
  grad.addColorStop(0.4, 'rgba(80, 160, 255, 0.3)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}
const glowTexture = createGlowTexture();
// 合成粒子：圆形柔光（additive 光晕，无方框）
function createMorphParticleTexture(): THREE.CanvasTexture {
  const size = 64;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;
  const half = size / 2;
  ctx.clearRect(0, 0, size, size);
  const grad = ctx.createRadialGradient(half, half, 0, half, half, half);
  grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
  grad.addColorStop(0.18, 'rgba(230, 245, 255, 0.92)');
  grad.addColorStop(0.42, 'rgba(120, 195, 255, 0.42)');
  grad.addColorStop(0.72, 'rgba(80, 160, 255, 0.12)');
  grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(half, half, half, 0, Math.PI * 2);
  ctx.fill();
  const tex = new THREE.CanvasTexture(c);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  return tex;
}
const morphParticleTexture = createMorphParticleTexture();

function createGoboTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, 256, 256);

  const radial = ctx.createRadialGradient(128, 128, 18, 128, 128, 124);
  radial.addColorStop(0.0, 'rgba(255,255,255,0.96)');
  radial.addColorStop(0.22, 'rgba(220,240,255,0.78)');
  radial.addColorStop(0.52, 'rgba(140,196,255,0.22)');
  radial.addColorStop(1.0, 'rgba(0,0,0,0)');
  ctx.fillStyle = radial;
  ctx.fillRect(0, 0, 256, 256);

  ctx.save();
  ctx.translate(128, 128);
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2 + (Math.random() - 0.5) * 0.12;
    const w = 3 + Math.random() * 5;
    const len = 72 + Math.random() * 52;
    ctx.rotate(a);
    ctx.fillStyle = `rgba(190, 225, 255, ${0.06 + Math.random() * 0.08})`;
    ctx.fillRect(18, -w * 0.5, len, w);
    ctx.setTransform(1, 0, 0, 1, 128, 128);
  }
  ctx.restore();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  return tex;
}
const goboTexture = createGoboTexture();
const logoSpotMap = new THREE.TextureLoader().load(
  igemStatic('/images/214b5722d42d86e64d169524cfb674f0.jpg'),
);
logoSpotMap.colorSpace = THREE.SRGBColorSpace;
logoSpotMap.minFilter = THREE.LinearFilter;
logoSpotMap.magFilter = THREE.LinearFilter;
logoSpotMap.generateMipmaps = false;

function createRingTextTexture(text: string): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 2048;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  ctx.clearRect(0, 0, c.width, c.height);

  const grad = ctx.createLinearGradient(0, 0, c.width, 0);
  grad.addColorStop(0.0, 'rgba(142, 214, 255, 0.06)');
  grad.addColorStop(0.25, 'rgba(208, 238, 255, 0.92)');
  grad.addColorStop(0.5, 'rgba(132, 198, 255, 0.44)');
  grad.addColorStop(0.75, 'rgba(214, 243, 255, 0.95)');
  grad.addColorStop(1.0, 'rgba(138, 205, 255, 0.08)');
  ctx.fillStyle = grad;
  ctx.font = '800 132px "Segoe UI", Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(118, 199, 255, 0.45)';
  ctx.shadowBlur = 18;
  const tiled = `${text}   ${text}   ${text}   ${text}`;
  ctx.fillText(tiled, 36, c.height * 0.52);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  // Constrain glyphs to a narrow torus band so text sits on outer side.
  tex.repeat.set(2.2, 1);
  // tex.offset.set(0, 0.0);
  return tex;
}

interface AnimMesh {
  mesh: THREE.Mesh;
  targetPos: THREE.Vector3;
  targetColor: THREE.Color;
  revealOffset: number;
}

interface StrandBuildResult {
  group: THREE.Group;
  animMeshes: AnimMesh[];
  backbonePoints: THREE.Vector3[];
}

interface TargetParticle {
  target: THREE.Vector3;
  start: THREE.Vector3;
  color: THREE.Color;
  revealOffset: number;
  swirlDir: number; // 用于粒子的螺旋进入效果
}

interface OrbitRingLayer {
  mesh: THREE.Mesh;
  axisBase: THREE.Vector3;
  wobbleAxis: THREE.Vector3;
  wobbleSpeed: number;
  wobbleAmp: number;
  speed: number;
  pulsePhase: number;
  textMap: THREE.CanvasTexture;
  scrollSpeed: number;
}

function clamp01(v: number): number {
  return Math.min(Math.max(v, 0), 1);
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}


// 采用 Expo 缓动，让粒子聚拢像是有磁力吸附一样干脆
function easeOutExpo(x: number): number {
  return x === 1 ? 1 : 1 - Math.pow(2, -10 * x);
}

function randomSpherePoint(radius: number): THREE.Vector3 {
  const u = Math.random();
  const v = Math.random();
  const theta = 2 * Math.PI * u;
  const phi = Math.acos(2 * v - 1);
  const r = radius * Math.cbrt(Math.random());
  return new THREE.Vector3(
    r * Math.sin(phi) * Math.cos(theta),
    r * Math.sin(phi) * Math.sin(theta),
    r * Math.cos(phi),
  );
}

function createRNAStrand(
  helixRadius: number,
  pitch: number,
  turns: number,
  yOffset: number,
  phaseOffset: number,
): StrandBuildResult {
  const group = new THREE.Group();
  const animMeshes: AnimMesh[] = [];
  const pointsPerTurn = 120;
  const totalPoints = turns * pointsPerTurn;
  const basesPerTurn = 11;

  const curvePoints: THREE.Vector3[] = [];
  for (let i = 0; i <= totalPoints; i++) {
    const frac = i / totalPoints;
    const angle = frac * turns * Math.PI * 2 + phaseOffset;
    const x = helixRadius * Math.cos(angle);
    const y = frac * turns * pitch - (turns * pitch) / 2 + yOffset;
    const z = helixRadius * Math.sin(angle);
    curvePoints.push(new THREE.Vector3(x, y, z));
  }
  const curve = new THREE.CatmullRomCurve3(curvePoints);

  const tube = new THREE.Mesh(
    new THREE.TubeGeometry(curve, 220, 0.05, 12, false),
    new THREE.MeshStandardMaterial({
      color: 0x8f9ec3,
    roughness: 0.25,
      metalness: 0.55,
      transparent: true,
      opacity: 0,
    }),
  );
  group.add(tube);

  const riboseGeo = new THREE.SphereGeometry(0.07, 8, 6);
  const riboseColor = new THREE.Color(0xaabbdd);
  const riboseMat = new THREE.MeshPhysicalMaterial({
    color: riboseColor,
    roughness: 0.15,
    metalness: 0.1,
    transmission: 0.9, // 开启玻璃般的透射效果
    thickness: 0.4,    // 控制折射厚度（体现大分子体积感）
    ior: 1.4,          // 折射率，类似水或细胞液
    iridescence: 0.8,  // 开启薄膜干涉（类似肥皂泡的炫彩反射）
    iridescenceIOR: 1.3,
    transparent: true,
    opacity: 0,
  });

  const totalBases = turns * basesPerTurn;
  for (let i = 0; i < totalBases; i++) {
    const frac = i / totalBases;
    const angle = frac * turns * Math.PI * 2 + phaseOffset;
    const x = helixRadius * Math.cos(angle);
    const y = frac * turns * pitch - (turns * pitch) / 2 + yOffset;
    const z = helixRadius * Math.sin(angle);

    const ribose = new THREE.Mesh(riboseGeo, riboseMat.clone());
    ribose.position.set(x, y, z);
    group.add(ribose);
    animMeshes.push({
      mesh: ribose,
      targetPos: new THREE.Vector3(x, y, z),
      targetColor: riboseColor.clone(),
      revealOffset: frac,
    });

    const radialDir = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle)).normalize();
    const flip = i % 3 === 0 ? -1 : 1;
    const baseColor = BASE_COLORS[i % BASE_COLORS.length];
    const baseLength = 0.45 + Math.sin(i * 1.7) * 0.08;

    const stick = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.025, baseLength, 6),
      new THREE.MeshStandardMaterial({
      color: baseColor,
      roughness: 0.35,
      metalness: 0.15,
        transparent: true,
        opacity: 0,
      }),
    );
    const midPoint = new THREE.Vector3(x, y, z).add(
      radialDir.clone().multiplyScalar(flip * baseLength * 0.5),
    );
    stick.position.copy(midPoint);
    stick.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      radialDir.clone().multiplyScalar(flip),
    );
    group.add(stick);
    animMeshes.push({
      mesh: stick,
      targetPos: midPoint.clone(),
      targetColor: baseColor.clone(),
      revealOffset: frac + 0.02,
    });

    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.07, 10, 8),
      new THREE.MeshStandardMaterial({
      color: baseColor,
      roughness: 0.15,
      metalness: 0.25,
      emissive: baseColor,
      emissiveIntensity: 0.5,
        transparent: true,
        opacity: 0,
      }),
    );
    const headPos = new THREE.Vector3(x, y, z).add(
      radialDir.clone().multiplyScalar(flip * baseLength),
    );
    head.position.copy(headPos);
    group.add(head);
    animMeshes.push({
      mesh: head,
      targetPos: headPos.clone(),
      targetColor: baseColor.clone(),
      revealOffset: frac + 0.04,
    });
  }

  const backbonePoints: THREE.Vector3[] = [];
  for (let i = 0; i <= 220; i++) {
    backbonePoints.push(curve.getPoint(i / 220));
  }

  return { group, animMeshes, backbonePoints };
}

const strand1 = createRNAStrand(0.85, 3.8, 3.0, 0, 0);
const strand2 = createRNAStrand(0.55, 2.9, 4.0, 0.8, Math.PI * 0.4);
const rnaVisualRoot = new THREE.Group();
rnaVisualRoot.position.y = 0.85;
scene.add(rnaVisualRoot);
const introCard = createIntroCard(document.body);
introCard.hide();

function createOrbitRingSystem(): { group: THREE.Group; layers: OrbitRingLayer[] } {
  const group = new THREE.Group();
  const layers: OrbitRingLayer[] = [];
  const defs = [
    {
      radius: 5.65, tube: 0.4, color: 0x6ec8ff, speed: 0.24,
      axis: new THREE.Vector3(0.2, 0.05, 1), wobbleAxis: new THREE.Vector3(0.65, 0.22, 1), wobbleAmp: 0.18, wobbleSpeed: 0.48,
      text: 'SINEUP • SINEUP • SINEUP •',
      scrollSpeed: 0.055,
    },
    {
      radius: 6.25, tube: 0.36, color: 0x8edcff, speed: -0.2,
      axis: new THREE.Vector3(0.55, 1, 0.25), wobbleAxis: new THREE.Vector3(1, 0.35, 0.12), wobbleAmp: 0.16, wobbleSpeed: 0.44,
      text: 'PEKINGHSC • PEKINGHSC • PEKINGHSC •',
      scrollSpeed: -0.046,
    },
  ];
  for (let i = 0; i < defs.length; i++) {
    const d = defs[i];
    const geo = new THREE.TorusGeometry(d.radius, d.tube, 16, 144);
    const ringTextMap = createRingTextTexture(d.text);
    const mat = new THREE.MeshBasicMaterial({
      color: d.color,
      map: ringTextMap,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.FrontSide,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    group.add(mesh);
    layers.push({
      mesh,
      axisBase: d.axis.clone().normalize(),
      wobbleAxis: d.wobbleAxis.clone().normalize(),
      wobbleSpeed: d.wobbleSpeed,
      wobbleAmp: d.wobbleAmp,
      speed: d.speed,
      pulsePhase: Math.random() * Math.PI * 2,
      textMap: ringTextMap,
      scrollSpeed: d.scrollSpeed,
    });
  }
  group.visible = false;
  return { group, layers };
}
const orbitRings = createOrbitRingSystem();
rnaVisualRoot.add(orbitRings.group);
const ringSpotTarget = new THREE.Object3D();
scene.add(ringSpotTarget);
const ringSpotLight = new THREE.SpotLight(0x9dd6ff, 0);
ringSpotLight.map = logoSpotMap ?? goboTexture;
ringSpotLight.position.set(0, 4.8, 5.8);
ringSpotLight.angle = Math.PI / 3.8;
ringSpotLight.penumbra = 0.98;
ringSpotLight.decay = 1.0;
ringSpotLight.distance = 0;
ringSpotLight.castShadow = false;
ringSpotLight.target = ringSpotTarget;
ringSpotLight.visible = false;
scene.add(ringSpotLight);

function createDetailNav(parent: HTMLElement) {
  const root = document.createElement('div');
  root.className = 'detail-nav';

  /** 主页：队徽 + 导航同一灵动岛（叙事顶栏时隐藏） */
  const heroDynamicIsland = document.createElement('div');
  heroDynamicIsland.className = 'hero-dynamic-island';
  const islandBrandSlot = document.createElement('div');
  islandBrandSlot.className = 'hero-dynamic-island__brand';
  const islandLinksScroll = document.createElement('div');
  islandLinksScroll.className = 'hero-dynamic-island__links';

  const orbitRow = document.createElement('div');
  orbitRow.className = 'detail-nav__orbit-row';

  const topBar = document.createElement('header');
  topBar.className = 'detail-nav__top-bar';
  topBar.setAttribute('aria-label', 'Wiki navigation');
  const barBrand = document.createElement('a');
  barBrand.className = 'detail-nav__top-bar-brand';
  barBrand.href = '/';
  barBrand.setAttribute('aria-label', 'Home');
  const barWordmark = document.createElement('span');
  barWordmark.className = 'hero-island-wordmark__text';
  barWordmark.textContent = 'SINEUP';
  barBrand.appendChild(barWordmark);
  const barLinks = document.createElement('nav');
  barLinks.className = 'detail-nav__top-bar-links';
  barLinks.setAttribute('aria-label', 'Sections');
  topBar.appendChild(barBrand);
  topBar.appendChild(barLinks);

  const links = [
    { label: 'Attributions', short: 'AT', href: '/attributions/', side: 'left' as const, row: -1 },
    { label: 'Model', short: 'MD', href: '/model/', side: 'left' as const, row: 0 },
    { label: 'Engineering', short: 'EN', href: '/engineering/', side: 'left' as const, row: 1 },
    { label: 'Contribution', short: 'CT', href: '/contribution/', side: 'right' as const, row: -1 },
    { label: 'Human Practices', short: 'HP', href: '/human-practices/', side: 'right' as const, row: 0 },
    { label: 'Inclusivity', short: 'IN', href: '/inclusivity/', side: 'right' as const, row: 1 },
  ];

  const orbitBtns: HTMLAnchorElement[] = [];
  const barBtns: HTMLAnchorElement[] = [];
  for (let i = 0; i < links.length; i++) {
    const item = links[i];
    const o = document.createElement('a');
    o.className = 'detail-nav__btn detail-nav__btn--orbit';
    o.href = item.href;
    o.textContent = item.label;
    o.setAttribute('aria-label', item.label);
    o.style.setProperty('--delay', `${i * 36}ms`);
    orbitRow.appendChild(o);
    orbitBtns.push(o);

    const b = document.createElement('a');
    b.className = 'detail-nav__bar-link';
    b.href = item.href;
    b.textContent = item.label;
    b.setAttribute('aria-label', item.label);
    barLinks.appendChild(b);
    barBtns.push(b);
  }

  islandLinksScroll.appendChild(orbitRow);
  heroDynamicIsland.appendChild(islandBrandSlot);
  heroDynamicIsland.appendChild(islandLinksScroll);
  root.appendChild(heroDynamicIsland);
  root.appendChild(topBar);
  parent.appendChild(root);

  const btns = links.map((item, i) => ({
    el: orbitBtns[i]!,
    side: item.side,
    row: item.row as -1 | 0 | 1,
    label: item.label,
    short: item.short,
  }));

  let centerSafeOverride = 0;
  let layoutMode: 'orbit' | 'edge' | 'island' | 'heroIsland' = 'orbit';
  let edgeIconMode = false;

  function setStorySafeWidth(px: number) {
    const safe = Math.max(120, Math.round(px));
    document.documentElement.style.setProperty('--story-safe-width', `${safe}px`);
  }

  function setEdgeIconMode(iconMode: boolean) {
    if (edgeIconMode === iconMode) return;
    edgeIconMode = iconMode;
    root.classList.toggle('icon-mode', iconMode);
    for (let i = 0; i < links.length; i++) {
      const item = links[i]!;
      const lab = iconMode ? item.short : item.label;
      orbitBtns[i]!.textContent = lab;
      orbitBtns[i]!.title = iconMode ? item.label : '';
      orbitBtns[i]!.setAttribute('aria-label', item.label);
      barBtns[i]!.textContent = lab;
      barBtns[i]!.title = iconMode ? item.label : '';
      barBtns[i]!.setAttribute('aria-label', item.label);
    }
  }

  function relayout() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    if (layoutMode === 'heroIsland') {
      setEdgeIconMode(false);
      setStorySafeWidth(w * 0.88);
      for (const b of btns) {
        b.el.style.removeProperty('--tx');
        b.el.style.removeProperty('--ty');
      }
      return;
    }
    if (layoutMode === 'island') {
      setEdgeIconMode(false);
      setStorySafeWidth(w * 0.88);
      return;
    }
    if (layoutMode === 'edge') {
      const leftEntries = btns.filter((b) => b.side === 'left');
      const rightEntries = btns.filter((b) => b.side === 'right');
      const edgePadding = THREE.MathUtils.clamp(w * 0.018, 6, 18);
      setEdgeIconMode(false);
      const measuredFullBtnWidth = Math.max(
        112,
        ...btns.map((b) => b.el.offsetWidth),
      );
      const fullHalf = measuredFullBtnWidth * 0.5;
      const fullSideX = Math.max(0, w * 0.5 - edgePadding - fullHalf);
      const fullInnerEdge = fullSideX - fullHalf;
      const fullCenterSafeWidth = (Math.max(56, fullInnerEdge - 34)) * 2;
      const inStoryBar = root.classList.contains('detail-nav--story-bar');
      const forceIconMode = fullCenterSafeWidth < 560 || (inStoryBar && w < 960);
      setEdgeIconMode(forceIconMode);

      const measuredBtnWidth = forceIconMode
        ? Math.max(44, ...btns.map((b) => b.el.offsetWidth))
        : measuredFullBtnWidth;
      const btnHalf = measuredBtnWidth * 0.5;
      const sideX = Math.max(0, w * 0.5 - edgePadding - btnHalf);
      const yStart = -THREE.MathUtils.clamp(h * 0.14, 76, 136);
      const yStep = THREE.MathUtils.clamp(h * 0.11, 62, 112);
      const innerEdge = sideX - btnHalf;
      const keepOut = forceIconMode ? 24 : 34;
      const centerSafeHalf = Math.max(56, innerEdge - keepOut);
      setStorySafeWidth(centerSafeHalf * 2);
      for (let i = 0; i < leftEntries.length; i++) {
        const y = yStart + i * yStep;
        leftEntries[i]!.el.style.setProperty('--tx', `${Math.round(-sideX)}px`);
        leftEntries[i]!.el.style.setProperty('--ty', `${Math.round(y)}px`);
      }
      for (let i = 0; i < rightEntries.length; i++) {
        const y = yStart + i * yStep;
        rightEntries[i]!.el.style.setProperty('--tx', `${Math.round(sideX)}px`);
        rightEntries[i]!.el.style.setProperty('--ty', `${Math.round(y)}px`);
      }
      return;
    }
    setEdgeIconMode(false);
    setStorySafeWidth(w * 0.88);

    const verticalGap = THREE.MathUtils.clamp(h * 0.19, 105, 220);
    const sideBase = Math.min(w * 0.5 - 96, Math.max(300, w * 0.36));
    const centerSafe = Math.max(250, w * 0.24, centerSafeOverride);
    const sideX = Math.max(sideBase, centerSafe + 40);

    for (const btn of btns) {
      const xArc = btn.row === 0 ? 42 : 0;
      const yArc = btn.row === 0 ? 0 : btn.row * verticalGap;
      const x = (btn.side === 'left' ? -1 : 1) * (sideX + xArc);
      btn.el.style.setProperty('--tx', `${Math.round(x)}px`);
      btn.el.style.setProperty('--ty', `${Math.round(yArc)}px`);
    }
  }
  relayout();

  return {
    root,
    show() {
      root.classList.add('show');
    },
    hide() {
      root.classList.remove('show');
      root.classList.remove('detail-nav--story-bar');
    },
    setCenterSafeRadius(px: number) {
      centerSafeOverride = Math.max(0, px);
      relayout();
    },
    setLayoutMode(next: 'orbit' | 'edge' | 'island' | 'heroIsland') {
      if (layoutMode === next) return;
      layoutMode = next;
      root.classList.toggle('detail-nav--island', next === 'island');
      root.classList.toggle('detail-nav--hero-island', next === 'heroIsland');
      relayout();
    },
    getIslandBrandSlot(): HTMLElement {
      return islandBrandSlot;
    },
    relayout,
  };
}

const detailNav = createDetailNav(document.body);
detailNav.hide();

function createHeroIslandWordmark(parent: HTMLElement) {
  const root = document.createElement('div');
  root.className = 'hero-island-wordmark';
  root.setAttribute('aria-label', 'SINEUP');

  const text = document.createElement('span');
  text.className = 'hero-island-wordmark__text';
  text.textContent = 'SINEUP';
  root.appendChild(text);
  parent.appendChild(root);

  return {
    root,
    setVisible(visible: boolean) {
      root.classList.toggle('show', visible);
    },
    setCompact(compact: boolean) {
      root.classList.toggle('compact', compact);
    },
  };
}
const heroIslandWordmark = createHeroIslandWordmark(detailNav.getIslandBrandSlot());

export let narrative: ReturnType<typeof mountNarrative> | null = null;
let narrativeHeroRnaView: NarrativeHeroRnaView | null = null;
let narrativeHeroSineupStrip: NarrativeHeroSineupStrip | null = null;
const ringDynamicAxis = new THREE.Vector3();
const clickImpulseNdc = new THREE.Vector3();
const clickImpulseWorld = new THREE.Vector3();
const clickImpulseDir = new THREE.Vector3();
const clickImpulseCenterLocal = new THREE.Vector3();
const nucleotideImpulseVec = new THREE.Vector3();
const nucleotideImpulseCenterLocal = new THREE.Vector3();
let holdAttractorActive = false;
let holdAttractorStrength = 0;

let rnaParts: RnaPart[] = [];
const partMetaMap = new Map<string, PartMeta>();
let hotspotLayer: ReturnType<typeof createHotspotLayer> | null = null;
let partRaycast: ReturnType<typeof createPartRaycastController> | null = null;
let interactionState: InteractionState = { mode: 'idle', hoveredPartId: null };
let focusBlend = 0;
let focusBlendTarget = 0;
let focusActivePartId: string | null = null;

const allAnimMeshes = [...strand1.animMeshes, ...strand2.animMeshes];
const allBackbonePoints = [...strand1.backbonePoints, ...strand2.backbonePoints];
const allMaterials: THREE.MeshStandardMaterial[] = [];
const rnaSurfaceMaterials: THREE.MeshStandardMaterial[] = [];
let currentRnaOpacity = 0;
let loadedModelRef: THREE.Object3D | null = null;
let focusOverlayGroup: THREE.Group | null = null;
const focusOverlayMaterials: THREE.MeshStandardMaterial[] = [];
const focusClipPlanes = [
  new THREE.Plane(),
  new THREE.Plane(),
  new THREE.Plane(),
  new THREE.Plane(),
  new THREE.Plane(),
  new THREE.Plane(),
];
let focusRotationTarget: THREE.Quaternion | null = null;
/** World-space unit direction: part centre → camera, captured once in `focusOnPart`. */
const focusCameraViewDir = new THREE.Vector3(1, 0.35, 1);
for (const item of allAnimMeshes) {
  const mat = item.mesh.material;
  if (mat instanceof THREE.MeshStandardMaterial) {
    allMaterials.push(mat);
  }
}
for (const strandGroup of [strand1.group, strand2.group]) {
  strandGroup.traverse((obj) => {
    if (obj instanceof THREE.Mesh && obj.material instanceof THREE.MeshStandardMaterial) {
      if (!allMaterials.includes(obj.material)) allMaterials.push(obj.material);
    }
  });
}

function setRnaOpacity(opacity: number): void {
  const o = clamp01(opacity);
  currentRnaOpacity = o;
  for (const mat of allMaterials) {
    mat.transparent = true;
    mat.opacity = o;
    mat.depthWrite = o > 0.85;
  }
}

function applyPartMaterialState(): void {
  let focusedPart: RnaPart | null = null;
  const focusedId = focusActivePartId;
  if (focusedId) {
    focusedPart = rnaParts.find((part) => part.id === focusedId) ?? null;
  }

  for (const mat of rnaSurfaceMaterials) {
    if (focusedPart && focusBlend > 0.001) {
      mat.transparent = true;
      mat.opacity = THREE.MathUtils.lerp(currentRnaOpacity, 0.18, focusBlend);
      mat.depthWrite = false;
    } else {
      mat.transparent = true;
      mat.opacity = currentRnaOpacity;
      mat.depthWrite = currentRnaOpacity > 0.85;
    }
  }

  for (const part of rnaParts) {
    for (const state of part.materials) {
      state.material.opacity = state.baseOpacity;
      state.material.transparent = state.baseTransparent;
      state.material.depthWrite = state.baseDepthWrite;
      state.material.emissive.copy(state.baseEmissive);
      state.material.emissiveIntensity = state.baseEmissiveIntensity;
    }
  }

  if (focusedPart && focusBlend > 0.001) {
    if (focusOverlayGroup) focusOverlayGroup.visible = true;
    for (const mat of focusOverlayMaterials) {
      mat.transparent = true;
      mat.opacity = focusBlend;
      mat.depthWrite = true;
    }
    return;
  }

  if (focusOverlayGroup) focusOverlayGroup.visible = false;

  if (!interactionState.hoveredPartId) return;
  const hovered = rnaParts.find((part) => part.id === interactionState.hoveredPartId);
  if (!hovered) return;
  for (const state of hovered.materials) {
    state.material.emissive.copy(state.baseEmissive).addScalar(0.06);
    state.material.emissiveIntensity = Math.max(state.baseEmissiveIntensity, 0.22);
  }
}

function setHoveredPart(partId: string | null): void {
  if (interactionState.mode === 'focus') {
    const focusedId = interactionState.partId;
    interactionState = { mode: 'focus', partId: focusedId, hoveredPartId: partId };
    hotspotLayer?.setActive(focusedId);
  } else {
    interactionState = { mode: 'idle', hoveredPartId: partId };
    hotspotLayer?.setActive(partId);
  }
  applyPartMaterialState();
}

function exitPartFocus(): void {
  interactionState = { mode: 'idle', hoveredPartId: null };
  focusRotationTarget = null;
  focusBlendTarget = 0;
  pointer.set(0, 0);
  backReset.active = true;
  backReset.elapsed = 0;
  backReset.fromPos.copy(smoothedCamPos);
  backReset.fromLook.copy(smoothedLookAt);
  backReset.fromFov = smoothedFov;
  canvas.style.pointerEvents = '';
  hotspotLayer?.setActive(null);
  introCard.hide();
  detailNav.show();
  applyPartMaterialState();
}

function focusOnPart(partId: string): void {
  const meta = partMetaMap.get(partId);
  if (!meta) return;
  interactionState = { mode: 'focus', partId, hoveredPartId: partId };
  focusActivePartId = partId;
  focusBlendTarget = 1;
  canvas.style.pointerEvents = 'none';
  hotspotLayer?.setActive(partId);
  introCard.show(meta);
  detailNav.hide();
  const selected = rnaParts.find((part) => part.id === partId);
  if (selected) {
    const partVec = selected.center.clone();
    if (partVec.lengthSq() > 1e-6) {
      const rootWorldPos = rnaVisualRoot.getWorldPosition(new THREE.Vector3());
      const camDir = transition.toPos.clone().sub(rootWorldPos).normalize();
      focusRotationTarget = new THREE.Quaternion().setFromUnitVectors(partVec.normalize(), camDir);
    }
    const centerWorld = rnaVisualRoot.localToWorld(selected.center.clone());
    focusCameraViewDir.copy(smoothedCamPos).sub(centerWorld);
    if (focusCameraViewDir.lengthSq() < 1e-6) focusCameraViewDir.copy(transition.toPos).sub(centerWorld);
    if (focusCameraViewDir.lengthSq() < 1e-6) focusCameraViewDir.set(1, 0.35, 1);
    focusCameraViewDir.normalize();
  } else {
    focusCameraViewDir.copy(transition.toPos).sub(transition.toLook);
    if (focusCameraViewDir.lengthSq() < 1e-6) focusCameraViewDir.set(0, 0.25, 1);
    focusCameraViewDir.normalize();
  }
  updateFocusClipPlanes(partId);
  applyPartMaterialState();
  hotspotLayer?.dismissClickGuide();
}

introCard.setOnBack(() => {
  exitPartFocus();
});

function updateFocusClipPlanes(partId: string): void {
  if (!loadedModelRef) return;
  const part = rnaParts.find((it) => it.id === partId);
  if (!part || part.meshes.length === 0) return;
  const box = new THREE.Box3();
  for (const mesh of part.meshes) box.expandByObject(mesh);
  if (box.isEmpty()) return;
  box.expandByScalar(0.05);

  // Keep inside-box fragments, clip outside fragments.
  focusClipPlanes[0].set(new THREE.Vector3(1, 0, 0), -box.min.x);   // x >= min
  focusClipPlanes[1].set(new THREE.Vector3(-1, 0, 0), box.max.x);   // x <= max
  focusClipPlanes[2].set(new THREE.Vector3(0, 1, 0), -box.min.y);   // y >= min
  focusClipPlanes[3].set(new THREE.Vector3(0, -1, 0), box.max.y);   // y <= max
  focusClipPlanes[4].set(new THREE.Vector3(0, 0, 1), -box.min.z);   // z >= min
  focusClipPlanes[5].set(new THREE.Vector3(0, 0, -1), box.max.z);   // z <= max
}

let targetParticles: TargetParticle[] = [];
let morphParticleCount = 0;
let morphPositions = new Float32Array(0);
let morphColors = new Float32Array(0);
let assemblyPathPoints: THREE.Vector3[] = [...allBackbonePoints].sort((a, b) => a.y - b.y);

function addTargetCloud(
  collection: TargetParticle[],
  point: THREE.Vector3,
  color: THREE.Color,
  count: number,
  spread: number,
  revealOffset: number,
): void {
  for (let i = 0; i < count; i++) {
    const jittered = point.clone().add(randomSpherePoint(spread));
    // Fully random spawn in space (not tied to target direction),
    // so particles converge from all around instead of one side.
    const scatterStart = new THREE.Vector3(
      (Math.random() - 0.5) * 30,
      (Math.random() - 0.5) * 22 + 12.0,
      (Math.random() - 0.5) * 28,
    );
    // Keep a minimum initial separation from target to preserve the "gather" feeling.
    const toTarget = jittered.clone().sub(scatterStart);
    if (toTarget.lengthSq() < 20.25) {
      toTarget.normalize();
      scatterStart.addScaledVector(toTarget, -4.5);
    }
    collection.push({
      target: jittered,
      start: scatterStart,
      color,
      revealOffset: clamp01(revealOffset + (Math.random() - 0.5) * 0.05),
      swirlDir: Math.random() > 0.5 ? 1 : -1,
    });
  }
}

function rebuildMorphSystem(particles: TargetParticle[], pathPoints: THREE.Vector3[]): void {
  targetParticles = particles;
  morphParticleCount = targetParticles.length;
  morphPositions = new Float32Array(morphParticleCount * 3);
  morphColors = new Float32Array(morphParticleCount * 3);
  for (let i = 0; i < morphParticleCount; i++) {
    const i3 = i * 3;
    const p = targetParticles[i];
    morphPositions[i3] = p.start.x;
    morphPositions[i3 + 1] = p.start.y;
    morphPositions[i3 + 2] = p.start.z;
    morphColors[i3] = p.color.r;
    morphColors[i3 + 1] = p.color.g;
    morphColors[i3 + 2] = p.color.b;
  }
  morphGeo.setAttribute('position', new THREE.BufferAttribute(morphPositions, 3));
  morphGeo.setAttribute('color', new THREE.BufferAttribute(morphColors, 3));
  morphGeo.setDrawRange(0, morphParticleCount);
  morphGeo.computeBoundingSphere();
  assemblyPathPoints = pathPoints.length > 1 ? pathPoints : [...allBackbonePoints].sort((a, b) => a.y - b.y);
}

function buildProceduralParticleTargets(): void {
  const yMin = Math.min(...allAnimMeshes.map((item) => item.targetPos.y));
  const yMax = Math.max(...allAnimMeshes.map((item) => item.targetPos.y));
  const yRange = Math.max(0.0001, yMax - yMin);
  for (const item of allAnimMeshes) {
    item.revealOffset = clamp01((item.targetPos.y - yMin) / yRange + (Math.random() - 0.5) * 0.03);
  }

  const nextTargets: TargetParticle[] = [];
  for (const p of allBackbonePoints) {
    const reveal = clamp01((p.y - yMin) / yRange);
    addTargetCloud(nextTargets, p, new THREE.Color(0x9cb1d9), 4, 0.06, reveal);
  }
  for (const item of allAnimMeshes) {
    addTargetCloud(nextTargets, item.targetPos, item.targetColor, 7, 0.08, item.revealOffset);
  }
  rebuildMorphSystem(nextTargets, [...allBackbonePoints].sort((a, b) => a.y - b.y));
}

function buildModelParticleTargets(model: THREE.Object3D): void {
  model.updateWorldMatrix(true, true);
  const meshes: THREE.Mesh[] = [];
  model.traverse((obj) => {
    if (
      obj instanceof THREE.Mesh &&
      obj.geometry instanceof THREE.BufferGeometry &&
      !obj.name.startsWith('part_')
    ) {
      meshes.push(obj);
    }
  });
  if (!meshes.length) return;

  const totalTri = meshes.reduce((acc, mesh) => {
    const geo = mesh.geometry;
    const tri = geo.index ? geo.index.count / 3 : geo.attributes.position.count / 3;
    return acc + Math.max(1, tri);
  }, 0);
  const sampled: Array<{ pos: THREE.Vector3; color: THREE.Color }> = [];
  const samplePos = new THREE.Vector3();
  const sampleNormal = new THREE.Vector3();
  const totalDesired = 100000;

  for (const mesh of meshes) {
    const geo = mesh.geometry;
    const tri = geo.index ? geo.index.count / 3 : geo.attributes.position.count / 3;
    const meshSamples = Math.max(120, Math.floor(totalDesired * (Math.max(1, tri) / totalTri)));
    const sampler = new MeshSurfaceSampler(mesh).build();
    const colorAttr = geo.getAttribute('color') as THREE.BufferAttribute | undefined;
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    let matColor = new THREE.Color(0x9cb1d9);
    for (const m of materials) {
      if (m instanceof THREE.MeshStandardMaterial) {
        matColor.copy(m.color);
        if (m.emissiveIntensity > 0) {
          matColor.lerp(m.emissive, Math.min(0.65, m.emissiveIntensity));
        }
        matColor.multiplyScalar(1.12);
        break;
      }
    }
    for (let i = 0; i < meshSamples; i++) {
      sampler.sample(samplePos, sampleNormal);
      mesh.localToWorld(samplePos);
      rnaVisualRoot.worldToLocal(samplePos);
      const particleColor = matColor.clone();
      if (colorAttr && colorAttr.count > 0) {
        const vi = Math.floor(Math.random() * colorAttr.count);
        particleColor.setRGB(colorAttr.getX(vi), colorAttr.getY(vi), colorAttr.getZ(vi));
      }
      sampled.push({ pos: samplePos.clone(), color: particleColor });
    }
  }

  if (!sampled.length) return;
  const yMin = sampled.reduce((m, s) => Math.min(m, s.pos.y), Number.POSITIVE_INFINITY);
  const yMax = sampled.reduce((m, s) => Math.max(m, s.pos.y), Number.NEGATIVE_INFINITY);
  const yRange = Math.max(0.0001, yMax - yMin);
  const nextTargets: TargetParticle[] = [];
  const sortedPath = sampled
    .map((s) => s.pos.clone())
    .sort((a, b) => a.y - b.y)
    .filter((_, i) => i % 6 === 0);

  for (const s of sampled) {
    const reveal = clamp01((s.pos.y - yMin) / yRange);
    addTargetCloud(nextTargets, s.pos, s.color, 1, 0.016, reveal);
  }
  rebuildMorphSystem(nextTargets, sortedPath);
}

const morphGeo = new THREE.BufferGeometry();
const morphMat = new THREE.PointsMaterial({
  size: 0.2,
  map: morphParticleTexture,
  vertexColors: true,
  transparent: true,
  opacity: 1,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
  depthTest: true,
  sizeAttenuation: true,
});
const morphParticles = new THREE.Points(morphGeo, morphMat);
rnaVisualRoot.add(morphParticles);
buildProceduralParticleTargets();

const rnaModelUrl = igemStatic('/models/rna_model_final.glb');
loadRnaModel(rnaModelUrl, 8.0)
  .then((loaded) => {
    rnaVisualRoot.clear();
    // 🌟 核心拦截逻辑：把大纲里的立方体变成“科幻全息框”
    loaded.model.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        // 如果名字是我们的交互框
        if (child.name.startsWith('part_')) {
          child.material = new THREE.MeshStandardMaterial({
            color: 0x4da6ff,
            emissive: 0x4da6ff,
            transparent: true,
            opacity: 0,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            wireframe: true,
          });
        }
        // 顺手修复 RNA 本身的双面渲染
        else {
          const mats = Array.isArray(child.material) ? child.material : [child.material];
          mats.forEach((m) => {
            m.side = THREE.DoubleSide;
            m.transparent = true;
            m.needsUpdate = true;
          });
        }
      }
    });

    // 修复模型位置偏移
    const totalBox = new THREE.Box3().setFromObject(loaded.model);
    const modelCenter = totalBox.getCenter(new THREE.Vector3());
    loaded.model.position.sub(modelCenter);
    // This model is authored with a different forward axis; rotate 90 deg on Y for correct presentation.
    loaded.model.rotation.y += Math.PI * 1.5;

    rnaVisualRoot.add(loaded.model);
    // rnaVisualRoot.clear() above removed morph particles; attach them back.
    rnaVisualRoot.add(morphParticles);
    rnaVisualRoot.add(orbitRings.group);
    loadedModelRef = loaded.model;
    for (const mat of loaded.allMaterials) allMaterials.push(mat);
    rnaSurfaceMaterials.length = 0;
    focusOverlayMaterials.length = 0;

    if (focusOverlayGroup) {
      focusOverlayGroup.removeFromParent();
      focusOverlayGroup.clear();
    }
    focusOverlayGroup = new THREE.Group();
    focusOverlayGroup.name = 'rna-focus-overlays';
    focusOverlayGroup.visible = false;
    loaded.model.add(focusOverlayGroup);

    loaded.model.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      if (child.name.startsWith('part_')) return;
      const mats = Array.isArray(child.material) ? child.material : [child.material];
      for (const m of mats) {
        if (m instanceof THREE.MeshStandardMaterial && !rnaSurfaceMaterials.includes(m)) {
          rnaSurfaceMaterials.push(m);
        }
      }

      const srcMat = mats.find((m): m is THREE.MeshStandardMaterial => m instanceof THREE.MeshStandardMaterial);
      if (!srcMat) return;
      const overlayMat = srcMat.clone();
      overlayMat.transparent = false;
      overlayMat.opacity = 1.0;
      overlayMat.depthWrite = true;
      overlayMat.side = THREE.DoubleSide;
      overlayMat.clippingPlanes = focusClipPlanes;
      overlayMat.clipIntersection = false;
      focusOverlayMaterials.push(overlayMat);

      const overlayMesh = new THREE.Mesh(child.geometry, overlayMat);
      child.updateWorldMatrix(true, false);
      const toModelLocal = loaded.model.matrixWorld.clone().invert().multiply(child.matrixWorld);
      overlayMesh.matrixAutoUpdate = false;
      overlayMesh.matrix.copy(toModelLocal);
      focusOverlayGroup!.add(overlayMesh);
    });

    // Design 相框：第二次渲染，仅 layer 上的 RNA 表面（与主相机共用 scene）
    loaded.model.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      if (child.name.startsWith('part_')) return;
      let p: THREE.Object3D | null = child.parent;
      while (p) {
        if (p.name === 'rna-focus-overlays') return;
        p = p.parent;
      }
      child.layers.enable(RNA_INSET_LAYER);
    });
    scene.traverse((o) => {
      if (o instanceof THREE.Light) o.layers.enable(RNA_INSET_LAYER);
    });

    // --- 🌟 关键修复 3：解决热点重叠，基于真实物理边界计算小白点位置 ---
    rnaParts = loaded.parts.map((part) => {
      const partObject = loaded.model.getObjectByName(part.id);
      const trueCenter = new THREE.Vector3();
      if (partObject) {
        // 利用 Box3 计算这段 RNA 网格的真正几何中心
        const box = new THREE.Box3().setFromObject(partObject);
        box.getCenter(trueCenter);
      } else {
        trueCenter.copy(loaded.model.localToWorld(part.center.clone()));
      }
      const centerInRoot = rnaVisualRoot.worldToLocal(trueCenter);
      const syncedStates = part.meshes.flatMap((mesh) => {
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        return mats
          .filter((m): m is THREE.MeshStandardMaterial => m instanceof THREE.MeshStandardMaterial)
          .map((m) => ({
            material: m,
            baseOpacity: m.opacity,
            baseTransparent: m.transparent,
            baseDepthWrite: m.depthWrite,
            baseEmissive: m.emissive.clone(),
            baseEmissiveIntensity: m.emissiveIntensity,
          }));
      });
      return {
        ...part,
        center: centerInRoot,
        materials: syncedStates,
      };
    });
    setRnaOpacity(currentRnaOpacity);
    partMetaMap.clear();
    for (const part of rnaParts) partMetaMap.set(part.id, resolvePartMeta(part.id));
    partRaycast = createPartRaycastController(rnaParts);
    hotspotLayer?.destroy();
    hotspotLayer = createHotspotLayer(document.body, rnaParts, rnaVisualRoot, (partId) => {
      if (!canStartPartFocus()) return;
      focusOnPart(partId);
    });
    hotspotLayer.setVisible(false);
    buildModelParticleTargets(loaded.model);
    // Mount narrative sections
    const storyEl = document.getElementById('story')!;
    narrative = mountNarrative(WEB_NARRATIVE, storyEl, {
      beforeDestroy: () => {
        narrativeHeroRnaView?.dispose();
        narrativeHeroRnaView = null;
        narrativeHeroSineupStrip?.dispose();
        narrativeHeroSineupStrip = null;
      },
    });
    const insetHost = storyEl.querySelector<HTMLElement>('.hero-glyph__three-host');
    const sineupHost = storyEl.querySelector<HTMLElement>('.hero-sineup-host');
    if (insetHost) {
      narrativeHeroRnaView?.dispose();
      narrativeHeroRnaView = createNarrativeHeroRnaView(insetHost, scene, {
        getModelForBounds: () => loaded.model,
      });
    }
    if (sineupHost) {
      narrativeHeroSineupStrip?.dispose();
      narrativeHeroSineupStrip = createNarrativeHeroSineupStrip(sineupHost);
    }
    const finalBox = new THREE.Box3().setFromObject(loaded.model);
    const size = finalBox.getSize(new THREE.Vector3());
    assemblyCenter.set(0, Math.max(0.15, Math.min(0.55, size.y * 0.03)), 0);
  })
  .catch(() => {
    scene.add(strand1.group);
    scene.add(strand2.group);
    buildProceduralParticleTargets();
  });

// 常驻背景闪烁粒子（所有阶段持续可见）
const ambientBgCount = 100000;
const ambientBgBaseVisibleCount = 50000;
const ambientBgGeo = new THREE.BufferGeometry();
const ambientBgPos = new Float32Array(ambientBgCount * 3);
const ambientBgColor = new Float32Array(ambientBgCount * 3);
const ambientBgPhase = new Float32Array(ambientBgCount);
const ambientBgSpeed = new Float32Array(ambientBgCount);
for (let i = 0; i < ambientBgCount; i++) {
  const x = (Math.random() - 0.5) * 44;
  const y = (Math.random() - 0.5) * 26;
  const z = (Math.random() - 0.5) * 112;
  const i3 = i * 3;
  ambientBgPos[i3] = x;
  ambientBgPos[i3 + 1] = y;
  ambientBgPos[i3 + 2] = z;
  ambientBgPhase[i] = Math.random() * Math.PI * 2;
  ambientBgSpeed[i] = 0.2 + Math.random() * 0.45;
  const b = 0.9 + Math.random() * 1.05;
  ambientBgColor[i3] = 0.24 * b;
  ambientBgColor[i3 + 1] = 0.62 * b;
  ambientBgColor[i3 + 2] = 1.15 * b;
}
ambientBgGeo.setAttribute('position', new THREE.BufferAttribute(ambientBgPos, 3));
ambientBgGeo.setAttribute('color', new THREE.BufferAttribute(ambientBgColor, 3));
ambientBgGeo.setAttribute('aPhase', new THREE.BufferAttribute(ambientBgPhase, 1));
ambientBgGeo.setAttribute('aSpeed', new THREE.BufferAttribute(ambientBgSpeed, 1));
ambientBgGeo.setDrawRange(0, ambientBgBaseVisibleCount);
const ambientBgUniforms = {
  uTime: { value: 0 },
  uTexture: { value: glowTexture },
  uPointScale: { value: 150.0 },
  uOpacity: { value: 1.50 },
  uFlowBoost: { value: 0 },
  uAxialDrift: { value: 0 },
  uImpulseCenter: { value: new THREE.Vector3(0, 0, 0) },
  uImpulseStrength: { value: 0.0 },
};
const ambientBgMat = new THREE.ShaderMaterial({
  uniforms: ambientBgUniforms,
  vertexShader: `
    uniform float uTime;
    uniform float uPointScale;
    uniform float uFlowBoost;
    uniform float uAxialDrift;
    uniform vec3 uImpulseCenter;
    uniform float uImpulseStrength;
    attribute vec3 color;
    attribute float aPhase;
    attribute float aSpeed;
    varying vec3 vColor;
    varying float vAlpha;

    vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
    vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

    float snoise(vec3 v) {
      const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
      const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
      vec3 i = floor(v + dot(v, C.yyy));
      vec3 x0 = v - i + dot(i, C.xxx);
      vec3 g = step(x0.yzx, x0.xyz);
      vec3 l = 1.0 - g;
      vec3 i1 = min(g.xyz, l.zxy);
      vec3 i2 = max(g.xyz, l.zxy);
      vec3 x1 = x0 - i1 + C.xxx;
      vec3 x2 = x0 - i2 + C.yyy;
      vec3 x3 = x0 - D.yyy;
      i = mod289(i);
      vec4 p = permute(permute(permute(
          i.z + vec4(0.0, i1.z, i2.z, 1.0))
        + i.y + vec4(0.0, i1.y, i2.y, 1.0))
        + i.x + vec4(0.0, i1.x, i2.x, 1.0));
      float n_ = 1.0 / 7.0;
      vec3 ns = n_ * D.wyz - D.xzx;
      vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
      vec4 x_ = floor(j * ns.z);
      vec4 y_ = floor(j - 7.0 * x_);
      vec4 x = x_ * ns.x + ns.yyyy;
      vec4 y = y_ * ns.x + ns.yyyy;
      vec4 h = 1.0 - abs(x) - abs(y);
      vec4 b0 = vec4(x.xy, y.xy);
      vec4 b1 = vec4(x.zw, y.zw);
      vec4 s0 = floor(b0) * 2.0 + 1.0;
      vec4 s1 = floor(b1) * 2.0 + 1.0;
      vec4 sh = -step(h, vec4(0.0));
      vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
      vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
      vec3 p0 = vec3(a0.xy, h.x);
      vec3 p1 = vec3(a0.zw, h.y);
      vec3 p2 = vec3(a1.xy, h.z);
      vec3 p3 = vec3(a1.zw, h.w);
      vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
      p0 *= norm.x;
      p1 *= norm.y;
      p2 *= norm.z;
      p3 *= norm.w;
      vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
      m = m * m;
      return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
    }

    vec3 curlNoise(vec3 p) {
      const float e = 0.1;
      float n1 = snoise(vec3(p.x, p.y + e, p.z));
      float n2 = snoise(vec3(p.x, p.y - e, p.z));
      float a = (n1 - n2) / (2.0 * e);
      n1 = snoise(vec3(p.x, p.y, p.z + e));
      n2 = snoise(vec3(p.x, p.y, p.z - e));
      float b = (n1 - n2) / (2.0 * e);
      float x = a - b;
      n1 = snoise(vec3(p.x, p.y, p.z + e));
      n2 = snoise(vec3(p.x, p.y, p.z - e));
      a = (n1 - n2) / (2.0 * e);
      n1 = snoise(vec3(p.x + e, p.y, p.z));
      n2 = snoise(vec3(p.x - e, p.y, p.z));
      b = (n1 - n2) / (2.0 * e);
      float y = a - b;
      n1 = snoise(vec3(p.x + e, p.y, p.z));
      n2 = snoise(vec3(p.x - e, p.y, p.z));
      a = (n1 - n2) / (2.0 * e);
      n1 = snoise(vec3(p.x, p.y + e, p.z));
      n2 = snoise(vec3(p.x, p.y - e, p.z));
      b = (n1 - n2) / (2.0 * e);
      float z = a - b;
      return normalize(vec3(x, y, z) + 1e-5);
    }

    void main() {
      vColor = color;
      vec3 base = position;
      vec3 flowInput = base * 0.16 + vec3(0.0, 0.0, uTime * 0.0225 + aPhase);
      vec3 vel = curlNoise(flowInput);
      vec3 pos = base + vel * (1.4 + uFlowBoost * 1.6);
      pos.z += (uFlowBoost * (2.4 + aSpeed * 1.8)) * sin(uTime * 0.2 + aPhase);
      pos.z -= uAxialDrift * (1.2 + aSpeed * 1.0);
      vec3 impulseVec = uImpulseCenter - pos;
      float impulseDist = length(impulseVec);
      float impulseFalloff = 0.22 + 0.78 * exp(-impulseDist * 0.24);
      float impulsePush = uImpulseStrength * impulseFalloff;
      if (impulseDist > 1e-4) {
        pos += (impulseVec / impulseDist) * impulsePush * 0.9;
      }
      vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
      gl_PointSize = uPointScale * (1.0 / max(0.35, -mvPosition.z));
      gl_Position = projectionMatrix * mvPosition;
      // Keep background particles from fading to fully invisible.
      vAlpha = clamp(0.52 + 0.68 * sin(uTime * (0.2 + aSpeed * 0.25) + aPhase), 0.50, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D uTexture;
    uniform float uOpacity;
    varying vec3 vColor;
    varying float vAlpha;
    void main() {
      vec4 tex = texture2D(uTexture, gl_PointCoord);
      gl_FragColor = vec4(vColor * tex.rgb, tex.a * vAlpha * uOpacity);
    }
  `,
  transparent: true,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
});
const ambientBg = new THREE.Points(ambientBgGeo, ambientBgMat);
scene.add(ambientBg);

// 背景层：核苷酸模型实例（A/U/C/G）
type NucleotideKey = 'A' | 'U' | 'C' | 'G';
type NucleotideInstanceUnit = {
  mesh: THREE.InstancedMesh;
  material: THREE.MeshStandardMaterial;
};
type NucleotideLayer = {
  instances: NucleotideInstanceUnit[];
  basePos: THREE.Vector3[];
  phase: number[];
  speed: number[];
  spin: number[];
  dummy: THREE.Object3D;
};
const nucleotideRoot = new THREE.Group();
scene.add(nucleotideRoot);
const nucleotideLoader = new GLTFLoader();
const nucleotideModelDefs: Array<{ key: NucleotideKey; url: string }> = [
  { key: 'A', url: igemStatic('/models/adenosine.glb') },
  { key: 'U', url: igemStatic('/models/uridine.glb') },
  { key: 'C', url: igemStatic('/models/cytidine.glb') },
  { key: 'G', url: igemStatic('/models/guanosine.glb') },
];
const nucleotideLayers: NucleotideLayer[] = [];
const nucleotideInstancesPerType = 70;

for (const def of nucleotideModelDefs) {
  nucleotideLoader.load(def.url, (gltf) => {
    const sourceMeshes: THREE.Mesh[] = [];
    gltf.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh && obj.geometry instanceof THREE.BufferGeometry) {
        sourceMeshes.push(obj);
      }
    });
    if (!sourceMeshes.length) return;

    const sceneBox = new THREE.Box3().setFromObject(gltf.scene);
    const box = sceneBox.isEmpty() ? null : sceneBox;
    let uniformScale = 1;
    if (box) {
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z, 1e-4);
      uniformScale = 0.22 / maxDim;
    }
    const rootInv = gltf.scene.matrixWorld.clone().invert();
    const instances: NucleotideInstanceUnit[] = [];
    for (const srcMesh of sourceMeshes) {
      const geo = srcMesh.geometry.clone();
      srcMesh.updateWorldMatrix(true, false);
      const toRoot = rootInv.clone().multiply(srcMesh.matrixWorld);
      geo.applyMatrix4(toRoot);
      geo.scale(uniformScale, uniformScale, uniformScale);

      const srcMatCandidate = Array.isArray(srcMesh.material) ? srcMesh.material[0] : srcMesh.material;
      const srcMat = srcMatCandidate instanceof THREE.MeshStandardMaterial
        ? srcMatCandidate
        : new THREE.MeshStandardMaterial({ color: 0xd5ecff, roughness: 0.35, metalness: 0.12 });
      const mat = srcMat.clone();
      if (mat.map) {
        mat.map.colorSpace = THREE.SRGBColorSpace;
        mat.map.minFilter = THREE.LinearMipmapLinearFilter;
        mat.map.magFilter = THREE.LinearFilter;
        mat.map.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
      }
      mat.transparent = true;
      mat.opacity = 0;
      mat.depthWrite = false;
      mat.depthTest = false;
      mat.emissive.setRGB(0, 0, 0);
      mat.emissiveIntensity = 0;
      mat.needsUpdate = true;

      const instanced = new THREE.InstancedMesh(geo, mat, nucleotideInstancesPerType);
      instanced.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      instanced.frustumCulled = false;
      nucleotideRoot.add(instanced);
      instances.push({ mesh: instanced, material: mat });
    }

    const basePos: THREE.Vector3[] = [];
    const phase: number[] = [];
    const speed: number[] = [];
    const spin: number[] = [];
    const dummy = new THREE.Object3D();
    for (let i = 0; i < nucleotideInstancesPerType; i++) {
      basePos.push(new THREE.Vector3(
        (Math.random() - 0.5) * 36,
        (Math.random() - 0.5) * 20,
        (Math.random() - 0.5) * 92,
      ));
      phase.push(Math.random() * Math.PI * 2);
      speed.push(0.16 + Math.random() * 0.3);
      spin.push((Math.random() - 0.5) * 2.0);
      dummy.position.copy(basePos[i]);
      dummy.scale.setScalar(0.82 + Math.random() * 0.32);
      dummy.rotation.set(0, spin[i], 0);
      dummy.updateMatrix();
      for (const unit of instances) {
        unit.mesh.setMatrixAt(i, dummy.matrix);
      }
    }
    for (const unit of instances) {
      unit.mesh.instanceMatrix.needsUpdate = true;
    }
    nucleotideLayers.push({
      instances,
      basePos,
      phase,
      speed,
      spin,
      dummy,
    });
  });
}

const assemblyFocusPoint = new THREE.Vector3();
const assemblyAnchor = new THREE.Vector3();

function sampleAssemblyFocusPoint(progress: number, out: THREE.Vector3): THREE.Vector3 {
  if (assemblyPathPoints.length === 0) return out.set(0, 0.2, 0);
  if (assemblyPathPoints.length === 1) return out.copy(assemblyPathPoints[0]);
  const p = clamp01(progress);
  const maxIndex = assemblyPathPoints.length - 1;
  const floatIndex = p * maxIndex;
  const i0 = Math.floor(floatIndex);
  const i1 = Math.min(i0 + 1, maxIndex);
  const mix = floatIndex - i0;
  return out.lerpVectors(assemblyPathPoints[i0], assemblyPathPoints[i1], mix);
}

const dpr = renderer.getPixelRatio();
const rtWidth = window.innerWidth * dpr;
const rtHeight = window.innerHeight * dpr;
const depthTarget = new THREE.WebGLRenderTarget(rtWidth, rtHeight);
depthTarget.texture.minFilter = THREE.LinearFilter;
depthTarget.texture.magFilter = THREE.LinearFilter;
depthTarget.texture.generateMipmaps = false;
depthTarget.depthTexture = new THREE.DepthTexture(rtWidth, rtHeight);
depthTarget.depthTexture.format = THREE.DepthFormat;
depthTarget.depthTexture.type = THREE.UnsignedShortType;

const postScene = new THREE.Scene();
const postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const postMaterial = new THREE.ShaderMaterial({
  vertexShader: `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
  `,
  fragmentShader: `
  varying vec2 vUv;
  uniform sampler2D tDiffuse;
  uniform sampler2D tDepth;
  uniform float cameraNear;
  uniform float cameraFar;
    uniform vec2 uPointer;
    uniform float uCornerGlow;
    uniform float uCornerFollow;
    uniform float uTime;
    uniform float uRippleIntensity;
    uniform float uHeartbeatEnabled;

  float readDepth(sampler2D depthSampler, vec2 coord) {
    float fragCoordZ = texture2D(depthSampler, coord).x;
    float viewZ = (cameraNear * cameraFar) / ((cameraFar - cameraNear) * fragCoordZ - cameraFar);
    return (viewZ + cameraNear) / (cameraNear - cameraFar);
  }

  float sourceMaskAt(vec2 uv) {
    vec2 suv = clamp(uv, vec2(0.001), vec2(0.999));
    float d = readDepth(tDepth, suv);
    float obj = 1.0 - smoothstep(0.992, 0.9997, d);
    float l = dot(texture2D(tDiffuse, suv).rgb, vec3(0.2126, 0.7152, 0.0722));
    float bright = smoothstep(0.02, 0.22, l);
    return obj * bright;
  }

  float dilatedMaskAt(vec2 uv, float radius) {
    vec2 d1 = vec2(radius, 0.0);
    vec2 d2 = vec2(0.0, radius);
    vec2 d3 = vec2(radius * 0.7071, radius * 0.7071);
    vec2 d4 = vec2(radius * 0.7071, -radius * 0.7071);
    float m = sourceMaskAt(uv);
    m = max(m, sourceMaskAt(uv + d1));
    m = max(m, sourceMaskAt(uv - d1));
    m = max(m, sourceMaskAt(uv + d2));
    m = max(m, sourceMaskAt(uv - d2));
    m = max(m, sourceMaskAt(uv + d3));
    m = max(m, sourceMaskAt(uv - d3));
    m = max(m, sourceMaskAt(uv + d4));
    m = max(m, sourceMaskAt(uv - d4));
    return m;
  }

  void main() {
      // --- Heartbeat double-pulse flash, focused on RNA silhouette ---
      float baseDepth = readDepth(tDepth, vUv);
      float emitterMask = sourceMaskAt(vUv);
      float cycle = 3.2;
      float t = mod(uTime, cycle);
      float beat1 = exp(-pow((t - 0.20) * 7.5, 2.0));
      float beat2 = exp(-pow((t - 0.43) * 8.5, 2.0));
      float heartBeat = clamp((beat1 + beat2 * 0.9) * uHeartbeatEnabled, 0.0, 1.0);
      float beatDrive = smoothstep(0.04, 0.85, heartBeat);
      vec2 edgeDir = normalize(vec2(dFdx(baseDepth), dFdy(baseDepth)) + vec2(1e-6));
      float microJitter = sin((vUv.x + vUv.y) * 38.0 + uTime * 7.2) * 0.5 + 0.5;
      vec2 distortion = edgeDir * (0.0007 + beatDrive * 0.0028) * microJitter * (0.3 + emitterMask * 0.7) * uRippleIntensity;
      vec2 sampleUv = vUv + distortion;

      // 1. 镜头边缘色差 (Chromatic Aberration)
      vec2 offset = vec2(0.003, 0.0) * length(sampleUv - 0.5);
      float r = texture2D(tDiffuse, sampleUv + offset).r;
      float g = texture2D(tDiffuse, sampleUv).g;
      float b = texture2D(tDiffuse, sampleUv - offset).b;

      vec3 diffuse = vec3(r, g, b);
      float depth = readDepth(tDepth, sampleUv);

      // 2. RNA 深度边缘柔光
    float edge = abs(dFdx(depth)) + abs(dFdy(depth));
      float glow = smoothstep(0.001, 0.018, edge);
      vec3 glowColor = vec3(0.15, 0.65, 1.0) * 0.7;
      vec3 colored = diffuse + glow * glowColor;

      // 3. 深邃暗蓝渐变背景
      float radial = length(sampleUv - vec2(0.5, 0.4));
      vec3 bgCenter = vec3(0.05, 0.11, 0.24);
      vec3 bgEdge = vec3(0.005, 0.01, 0.03);
      vec3 envBg = mix(bgCenter, bgEdge, smoothstep(0.0, 1.1, radial));

      // 粒子保护
      float isBackground = smoothstep(0.99, 0.999, depth);
      float luma = dot(diffuse, vec3(0.2126, 0.7152, 0.0722));
      float particleMask = smoothstep(0.01, 0.12, luma);
      float blueCore = smoothstep(0.22, 0.9, diffuse.b);
      float blueDominance = smoothstep(0.05, 0.35, diffuse.b - max(diffuse.r, diffuse.g));
      float bgParticleMask = blueCore * blueDominance;
      float protectedMask = max(particleMask, bgParticleMask);
      float bgBlend = isBackground * (1.0 - protectedMask);

    float fog = smoothstep(0.0, 0.9, depth);
      vec3 objFogged = mix(colored, envBg, fog * 0.5);

      // 角落光斑
      vec2 pNorm = uPointer * 0.5 + 0.5;
      vec2 tlCenter = mix(vec2(0.16, 0.18), vec2(0.16, 0.18) + (pNorm - 0.5) * vec2(0.16, 0.14), uCornerFollow);
      vec2 brCenter = mix(vec2(0.84, 0.82), vec2(0.84, 0.82) + (pNorm - 0.5) * vec2(0.16, 0.14), uCornerFollow);
      float tl = exp(-pow(length(sampleUv - tlCenter) / 0.26, 2.0));
      float br = exp(-pow(length(sampleUv - brCenter) / 0.28, 2.0));
      vec3 cornerColorADim = vec3(0.22, 0.46, 0.78);
      vec3 cornerColorBDim = vec3(0.2, 0.5, 0.76);
      vec3 cornerColorABright = vec3(0.3, 0.62, 1.0);
      vec3 cornerColorBBright = vec3(0.24, 0.68, 1.0);
      vec3 cornerColorA = mix(cornerColorADim, cornerColorABright, uCornerFollow);
      vec3 cornerColorB = mix(cornerColorBDim, cornerColorBBright, uCornerFollow);
      float cornerGain = mix(0.82, 1.0, uCornerFollow);
      vec3 cornerGlow = (cornerColorA * tl + cornerColorB * br) * uCornerGlow * cornerGain;

      // 心跳强化：主脉冲 + 两层沿 RNA 轮廓外扩的壳层波前（重冲击、低亮度）
      float pulseProgA = clamp((t - 0.18) / 0.58, 0.0, 1.0);
      float pulseProgB = clamp((t - 0.40) / 0.46, 0.0, 1.0);
      float shellEnvA = smoothstep(0.0, 0.10, pulseProgA) * (1.0 - smoothstep(0.70, 1.0, pulseProgA));
      float shellEnvB = smoothstep(0.0, 0.10, pulseProgB) * (1.0 - smoothstep(0.72, 1.0, pulseProgB));
      float shellRadiusA = mix(0.0008, 0.030, pulseProgA);
      float shellRadiusB = mix(0.0008, 0.022, pulseProgB);
      float shellA = max(dilatedMaskAt(vUv, shellRadiusA) - emitterMask, 0.0) * shellEnvA;
      float shellB = max(dilatedMaskAt(vUv, shellRadiusB) - emitterMask, 0.0) * shellEnvB * 0.85;

      float edgeIon = smoothstep(0.002, 0.026, edge) * (0.32 + beatDrive * 0.68) * emitterMask;
      float magneticPulse = (heartBeat * (0.16 + emitterMask * 0.34) + shellA * 0.24 + shellB * 0.2 + edgeIon * 0.16) * uRippleIntensity * uHeartbeatEnabled;
      vec3 pulseColor = vec3(0.068, 0.255, 0.45) * magneticPulse;

      vec3 finalColor = mix(objFogged, envBg, bgBlend) + cornerGlow + pulseColor;
      finalColor = min(finalColor, vec3(1.06));

      gl_FragColor = vec4(finalColor, 1.0);
    }
  `,
  uniforms: {
    cameraNear: { value: camera.near },
    cameraFar: { value: camera.far },
    tDiffuse: { value: null },
    tDepth: { value: null },
    uPointer: { value: new THREE.Vector2(0, 0) },
    uCornerGlow: { value: 0 },
    uCornerFollow: { value: 0 },
    uTime: { value: 0 },
    uRippleIntensity: { value: 0 },
    uHeartbeatEnabled: { value: 1 },
  },
});
postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), postMaterial));

const ASSEMBLY_DURATION = 5.2;
const TRANSITION_DURATION = 2.8;
const ASSEMBLY_BLEND_START = 0.66;
const READY_PARTICLE_FADE_DURATION = 1.5;
const PARTICLE_OPACITY_ASSEMBLY_START = 1.0;
const PARTICLE_OPACITY_ASSEMBLY_END = 0.22;
const PARTICLE_OPACITY_READY_END = 0.0;
const PRE_CLICK_RNA_Y = 0.85;
const POST_CLICK_RNA_Y = 0.0;
/** 主展示：RNA 置于视窗左侧约黄金分割（略偏左 + 机位） */
const POST_CLICK_RNA_X = -0.78;
/** 聚焦分栏：根节点略偏 +X，给左侧面板留白；不宜过大否则右侧出画 */
const FOCUS_LAYOUT_RNA_X = 0.58;
const FINAL_CAMERA_POS = new THREE.Vector3(7.15, 2.62, 10.35);
const FINAL_LOOK_AT = new THREE.Vector3(-0.2, 0.2, 0);

type Phase = 'assembly' | 'ready' | 'transition' | 'follow';
type ExperienceState = 'assembly' | 'ready' | 'transition' | 'overview' | 'story' | 'focus';
let phase: Phase = 'assembly';
let phaseElapsed = 0;
let readyInteractive = false;

function resolveExperienceState(
  phaseNow: Phase,
  mode: InteractionState['mode'],
): ExperienceState {
  if (phaseNow === 'assembly') return 'assembly';
  if (phaseNow === 'ready') return 'ready';
  if (phaseNow === 'transition') return 'transition';
  if (mode === 'focus') return 'focus';
  return 'overview';
}

function canStartPartFocus(): boolean {
  return phase === 'follow';
}

function updateHoldAttractorTarget(clientX: number, clientY: number): void {
  if (phase !== 'follow') return;
  clickImpulseNdc.set(
    (clientX / window.innerWidth) * 2 - 1,
    -(clientY / window.innerHeight) * 2 + 1,
    0.2,
  );
  clickImpulseWorld.copy(clickImpulseNdc).unproject(camera);
  clickImpulseDir.copy(clickImpulseWorld).sub(camera.position).normalize();
  clickImpulseWorld.copy(camera.position).addScaledVector(clickImpulseDir, 6.8);
  clickImpulseCenterLocal.copy(clickImpulseWorld);
  ambientBg.worldToLocal(clickImpulseCenterLocal);
  ambientBgUniforms.uImpulseCenter.value.copy(clickImpulseCenterLocal);
}

const transition = {
  fromPos: new THREE.Vector3(),
  fromLook: new THREE.Vector3(),
  fromFov: camera.fov,
  toPos: FINAL_CAMERA_POS.clone(),
  toLook: FINAL_LOOK_AT.clone(),
  toFov: 50,
  elapsed: 0,
};
const backReset = {
  active: false,
  elapsed: 0,
  duration: 0.72,
  fromPos: new THREE.Vector3(),
  fromLook: new THREE.Vector3(),
  fromFov: camera.fov,
};

const pointer = new THREE.Vector2(0, 0);
const pointerSmooth = new THREE.Vector2(0, 0);
let cornerGlowStrength = 0;
let cornerFollowStrength = 0;
let rippleIntensity = 0;
let ambientPhaseBoost = 0;
let cornerGlowScaleSmooth = 0.34;

// --- 🌟 增强点：全局相机阻尼系统变量 ---
// 将物理摄像机状态和意图状态分离，实现无论什么阶段切换都能极度平滑的过渡
const desiredCamPos = new THREE.Vector3();
const desiredLookAt = new THREE.Vector3();
let desiredFov = camera.fov;

const smoothedCamPos = new THREE.Vector3();
const smoothedLookAt = new THREE.Vector3(0, 0.2, 0);
let smoothedFov = camera.fov;
let isFirstFrame = true;
let rnaYOffset = PRE_CLICK_RNA_Y;
let rnaXOffset = 0;

const assemblyLook = new THREE.Vector3();
const assemblyCenter = new THREE.Vector3(0, 0.35, 0);
const assemblyHeadSmoothed = new THREE.Vector3();
const followForward = new THREE.Vector3();
const followRight = new THREE.Vector3();
const followToAnchor = new THREE.Vector3();
const ambientAnchorTarget = new THREE.Vector3();
let orbitTheta = 0;
const identityQuat = new THREE.Quaternion();

function updateHintState(next: 'locked' | 'ready' | 'hide'): void {
  if (!hintEl || !hintTextEl) return;
  hintEl.classList.remove('locked', 'ready');
  if (next === 'locked') {
    hintEl.classList.add('locked');
    hintEl.style.opacity = '1';
    hintTextEl.textContent = 'RNA synthesis in progress...';
    if (hintRingEl) hintRingEl.style.opacity = '0';
  } else if (next === 'ready') {
    hintEl.classList.add('ready');
    hintEl.style.opacity = '1';
    hintTextEl.textContent = "Dive into SINEB2's world";
    if (hintRingEl) hintRingEl.style.opacity = '';
  } else {
    hintEl.style.opacity = '0';
  }
}

function updateOverlayState(next: 'assembling' | 'ready' | 'hide'): void {
  if (!overlayEl) return;
  overlayEl.classList.remove('assembling', 'ready', 'hide');
  if (next === 'hide') {
    overlayEl.classList.add('hide');
    return;
  }
  overlayEl.classList.add('show', next);
}

/** 本轮浏览内已进入过主展示（follow），刷新或从外链返回时跳过合成/就绪 */
const HERO_SESSION_FOLLOW_KEY = 'igem2026-wiki-hero-reached-follow';

function replayIntroFromQuery(): boolean {
  return new URLSearchParams(window.location.search).get('replay') === '1';
}

function hasStoredFollowHero(): boolean {
  if (typeof window === 'undefined' || replayIntroFromQuery()) return false;
  try {
    return sessionStorage.getItem(HERO_SESSION_FOLLOW_KEY) === '1';
  } catch {
    return false;
  }
}

function storeFollowHeroReached(): void {
  try {
    sessionStorage.setItem(HERO_SESSION_FOLLOW_KEY, '1');
  } catch {
    /* 隐私模式 / 配额 */
  }
}

function applyStoredFollowHeroState(): void {
  if (!hasStoredFollowHero()) return;
  phase = 'follow';
  phaseElapsed = 0;
  readyInteractive = true;
  rnaYOffset = POST_CLICK_RNA_Y;
  rnaXOffset = POST_CLICK_RNA_X;
  rnaVisualRoot.position.y = rnaYOffset;
  rnaVisualRoot.position.x = rnaXOffset;
  setRnaOpacity(1);
  morphMat.opacity = 0;
  morphMat.size = 0.12;
  updateHintState('hide');
  updateOverlayState('hide');
  transition.elapsed = TRANSITION_DURATION;
  camera.position.copy(FINAL_CAMERA_POS);
  camera.lookAt(FINAL_LOOK_AT);
  camera.fov = transition.toFov;
  camera.updateProjectionMatrix();
  smoothedCamPos.copy(FINAL_CAMERA_POS);
  smoothedLookAt.copy(FINAL_LOOK_AT);
  smoothedFov = transition.toFov;
  holdAttractorActive = false;
  backReset.active = false;
}

updateHintState('locked');
updateOverlayState('assembling');
setRnaOpacity(0);
applyStoredFollowHeroState();

function beginTransitionToFollow(): void {
  if (phase !== 'ready' || !readyInteractive) return;
  phase = 'transition';
  phaseElapsed = 0;
  transition.elapsed = 0;
  transition.fromPos.copy(smoothedCamPos);
  transition.fromLook.copy(smoothedLookAt);
  transition.fromFov = smoothedFov;
  // Deterministic transition target independent from click timing.
  transition.toPos.copy(FINAL_CAMERA_POS);
  transition.toLook.copy(FINAL_LOOK_AT);
  transition.toFov = 50;
  updateHintState('hide');
  updateOverlayState('hide');
}

canvas.addEventListener('click', beginTransitionToFollow);
canvas.addEventListener('touchstart', beginTransitionToFollow, { passive: true });
window.addEventListener('pointermove', (ev) => {
  pointer.x = (ev.clientX / window.innerWidth) * 2 - 1;
  pointer.y = (ev.clientY / window.innerHeight) * 2 - 1;
  if (holdAttractorActive) updateHoldAttractorTarget(ev.clientX, ev.clientY);
});
window.addEventListener('pointerdown', (ev) => {
  if (phase !== 'follow') return;
  if (!heroOverviewInputGate.active) return;
  const target = ev.target as HTMLElement | null;
  if (target?.closest('a,button,input,textarea,select')) return;
  holdAttractorActive = true;
  updateHoldAttractorTarget(ev.clientX, ev.clientY);
});
window.addEventListener('pointerup', () => {
  holdAttractorActive = false;
});
canvas.addEventListener('pointerdown', () => {
  if (!heroOverviewInputGate.active || !canStartPartFocus() || !partRaycast) return;
  const picked = partRaycast.pickPart(pointer, camera);
  if (picked) {
    focusOnPart(picked);
  }
});
// Wheel handler removed — narrative uses native browser scroll


const clock = new THREE.Clock();

function updateMorphParticles(progress: number): void {
  const posAttr = morphGeo.getAttribute('position') as THREE.BufferAttribute;
  for (let i = 0; i < morphParticleCount; i++) {
    const p = targetParticles[i];
    const i3 = i * 3;
    const localRaw = clamp01((progress + 0.04 - p.revealOffset) / 0.12);
    // 使用 Expo 带来更有张力的吸附感
    const localEased = easeOutExpo(localRaw);
    const endSnap = THREE.MathUtils.smoothstep(progress, 0.9, 1.0);
    const local = Math.max(localEased, endSnap);
    
    // --- 🌟 增强点：增加螺旋飞行轨迹 (Swirl) ---
    const swirlAngle = (1 - local) * Math.PI * 2.5 * p.swirlDir;
    const swirlRadius = (1 - local) * 0.8;
    const dx = Math.cos(swirlAngle) * swirlRadius;
    const dz = Math.sin(swirlAngle) * swirlRadius;

    const x = THREE.MathUtils.lerp(p.start.x, p.target.x, local) + dx;
    const y = THREE.MathUtils.lerp(p.start.y, p.target.y, local);
    const z = THREE.MathUtils.lerp(p.start.z, p.target.z, local) + dz;
    
    morphPositions[i3] = x;
    morphPositions[i3 + 1] = y;
    morphPositions[i3 + 2] = z;
  }
  posAttr.needsUpdate = true;
}

function animate(): void {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.1);

  const elapsed = clock.getElapsedTime();
  focusBlend = THREE.MathUtils.lerp(focusBlend, focusBlendTarget, 1 - Math.exp(-dt * 10.0));
  if (focusBlendTarget === 0 && focusBlend < 0.001) {
    focusBlend = 0;
    focusActivePartId = null;
  }
  applyPartMaterialState();
  if (backReset.active) {
    backReset.elapsed += dt;
    if (backReset.elapsed >= backReset.duration) {
      backReset.elapsed = backReset.duration;
      backReset.active = false;
    }
  }
  const orbitSpeed =
    phase === 'assembly' ? 0.72 :
    phase === 'ready' ? 0.76 :
    0.0;
  orbitTheta += dt * orbitSpeed;

  if (phase === 'assembly' || phase === 'ready' || phase === 'transition') {
    phaseElapsed += dt;
  }

  const rnaYTarget = phase === 'assembly' || phase === 'ready' ? PRE_CLICK_RNA_Y : POST_CLICK_RNA_Y;
  rnaYOffset = THREE.MathUtils.lerp(rnaYOffset, rnaYTarget, 1 - Math.exp(-dt * 2.6));
  rnaVisualRoot.position.y = rnaYOffset;
  const rnaXTarget =
    interactionState.mode === 'focus'
      ? FOCUS_LAYOUT_RNA_X
      : phase === 'transition' || phase === 'follow'
        ? POST_CLICK_RNA_X
        : 0;
  rnaXOffset = THREE.MathUtils.lerp(rnaXOffset, rnaXTarget, 1 - Math.exp(-dt * 2.6));
  rnaVisualRoot.position.x = rnaXOffset;
  
  document.documentElement.classList.toggle(
    'hero-scroll-lock',
    phase !== 'follow' || interactionState.mode === 'focus',
  );

  if (phase === 'assembly' && phaseElapsed >= ASSEMBLY_DURATION) {
    phase = 'ready';
    phaseElapsed = 0;
    readyInteractive = false;
    setRnaOpacity(1);
    morphMat.opacity = PARTICLE_OPACITY_ASSEMBLY_END;
    updateHintState('locked');
    updateOverlayState('assembling');
  } else if (phase === 'transition' && phaseElapsed >= TRANSITION_DURATION) {
    phase = 'follow';
    phaseElapsed = 0;
    morphMat.opacity = 0;
    storeFollowHeroReached();
  }

  if (phase === 'assembly') {
    const t = clamp01(phaseElapsed / ASSEMBLY_DURATION);
    updateMorphParticles(t);
    morphMat.size = 0.22 - 0.06 * t;
    const blend = clamp01((t - ASSEMBLY_BLEND_START) / (1 - ASSEMBLY_BLEND_START));
    setRnaOpacity(blend);
    morphMat.opacity = THREE.MathUtils.lerp(
      PARTICLE_OPACITY_ASSEMBLY_START,
      PARTICLE_OPACITY_ASSEMBLY_END,
      blend,
    );
  } else if (phase === 'ready') {
    morphMat.size = 0.14;
    const readyFadeRaw = clamp01(phaseElapsed / READY_PARTICLE_FADE_DURATION);
    const readyFade = THREE.MathUtils.smootherstep(readyFadeRaw, 0, 1);
    morphMat.opacity = THREE.MathUtils.lerp(
      PARTICLE_OPACITY_ASSEMBLY_END,
      PARTICLE_OPACITY_READY_END,
      readyFade,
    );
    if (!readyInteractive && readyFadeRaw >= 0.999) {
      readyInteractive = true;
      updateHintState('ready');
      updateOverlayState('ready');
    }
  }

  const ringDisplayMode = phase === 'follow';
  orbitRings.group.visible = ringDisplayMode;
  const inPartFocus = phase === 'follow' && interactionState.mode === 'focus';
  const ringPeripheryMul = inPartFocus ? 0.4 : 1;
  /** Focus framing is static; spinning rings read as “RNA tumbling”. */
  const ringSpeedMul = inPartFocus ? 0 : 1;
  if (orbitRings.group.visible) {
    for (const layer of orbitRings.layers) {
      ringDynamicAxis
        .copy(layer.axisBase)
        .applyAxisAngle(
          layer.wobbleAxis,
          Math.sin(elapsed * layer.wobbleSpeed + layer.pulsePhase) * layer.wobbleAmp,
        )
        .normalize();
      layer.mesh.rotateOnAxis(ringDynamicAxis, dt * layer.speed * ringSpeedMul);
      const mat = layer.mesh.material;
      if (!(mat instanceof THREE.MeshBasicMaterial)) continue;
      const pulse = 0.78 + 0.22 * Math.sin(elapsed * 1.7 + layer.pulsePhase);
      mat.opacity = THREE.MathUtils.clamp(
        (0.1 + 1.0 * 0.44) * pulse * ringPeripheryMul,
        0,
        0.72,
      );
      const nextOffset = layer.textMap.offset.x + dt * layer.scrollSpeed * (0.6 + 1.0 * 1.2);
      layer.textMap.offset.x = ((nextOffset % 1) + 1) % 1;
    }
  }
  const ringSpotPulse = 0.78 + 0.22 * Math.sin(elapsed * 1.25 + 0.9);
  const ringSpotIntensity = 1.0 * ringSpotPulse * 220.0;
  /** Orbiting fill light reads as the molecule “crawling” when the frame is meant to be static. */
  ringSpotLight.visible = ringSpotIntensity > 0.01 && !inPartFocus;
  if (ringSpotLight.visible) {
    const orbit = elapsed * 0.42;
    ringSpotLight.position.set(
      Math.cos(orbit) * 5.1,
      3.6 + Math.sin(orbit * 0.82) * 0.9,
      Math.sin(orbit) * 4.8,
    );
    rnaVisualRoot.getWorldPosition(ringSpotTarget.position);
    ringSpotTarget.position.y += 0.28 + Math.sin(elapsed * 0.62) * 0.09;
    ringSpotLight.intensity = ringSpotIntensity;
  } else {
    ringSpotLight.intensity = 0;
  }

  // 背景层：Curl Noise 流体场
  ambientBgUniforms.uTime.value = elapsed;
  ambientBg.rotation.y += dt * 0.003;
  ambientBg.rotation.x += dt * 0.0015;
  if (phase === 'follow') {
    followForward.subVectors(smoothedLookAt, smoothedCamPos).normalize();
    const ambientPathDistance = 0 * 4.8;
    ambientAnchorTarget.copy(transition.toPos).addScaledVector(followForward, ambientPathDistance);
    ambientAnchorTarget.addScaledVector(followForward, -0 * 5.2);
    // Keep cloud center aligned with current camera centerline to avoid left/right screen bias.
    followRight.crossVectors(followForward, camera.up).normalize();
    followToAnchor.copy(ambientAnchorTarget).sub(smoothedCamPos);
    const lateralOffset = followToAnchor.dot(followRight);
    ambientAnchorTarget.addScaledVector(followRight, -lateralOffset * 0.92);
  } else {
    ambientAnchorTarget.set(0, 0, 0);
  }
  const ambientAnchorLerp = 1 - Math.exp(-dt * 1.85);
  ambientBg.position.lerp(ambientAnchorTarget, ambientAnchorLerp);
  const attractTarget = phase === 'follow' && holdAttractorActive ? 1.8 : 0.0;
  const attractDamping = attractTarget > holdAttractorStrength ? 4.0 : 7.0;
  holdAttractorStrength = THREE.MathUtils.lerp(
    holdAttractorStrength,
    attractTarget,
    1 - Math.exp(-dt * attractDamping),
  );
  ambientBgUniforms.uImpulseStrength.value = holdAttractorStrength;

  // 角落光斑：ready后明显，follow时跟随鼠标
  const isPostClick = phase === 'transition' || phase === 'follow';
  const storyFlashLocked = phase === 'follow' && interactionState.mode !== 'focus' && 0 > 0;
  const ambientTarget = isPostClick ? 1.0 : 0.48;
  ambientPhaseBoost = THREE.MathUtils.lerp(ambientPhaseBoost, ambientTarget, 1 - Math.exp(-dt * 2.6));
  const storyDiveAmount = clamp01(0 / 1);
  const bgDensityBoost = phase === 'follow' ? storyDiveAmount : 0;
  ambientBgUniforms.uOpacity.value = THREE.MathUtils.lerp(0.56, 1.22, ambientPhaseBoost) + bgDensityBoost * 0.32;
  ambientBgUniforms.uPointScale.value = THREE.MathUtils.lerp(20.0, 33.0, ambientPhaseBoost) + bgDensityBoost * 5.4;
  if (phase === 'follow' && interactionState.mode === 'focus') {
    const fb = focusBlend;
    ambientBgUniforms.uOpacity.value += fb * 0.38;
    ambientBgUniforms.uPointScale.value += fb * 11;
  }
  ambientBgUniforms.uFlowBoost.value = bgDensityBoost;
  ambientBgUniforms.uAxialDrift.value = 0;
  const visibleBgCount = Math.round(THREE.MathUtils.lerp(ambientBgBaseVisibleCount, ambientBgCount, bgDensityBoost));
  ambientBgGeo.setDrawRange(0, visibleBgCount);
  const nucleotideSpawn = phase === 'follow' ? THREE.MathUtils.smoothstep(0, 0 - 0.02, 0 + 0.28) : 0;
  nucleotideRoot.position.copy(ambientBg.position);
  for (const layer of nucleotideLayers) {
    const instanceScaleMul = THREE.MathUtils.lerp(0.0, 1.48, nucleotideSpawn);
    const opacity = THREE.MathUtils.lerp(0.0, 0.92, nucleotideSpawn);
    for (const unit of layer.instances) {
      unit.material.opacity = opacity;
    }
    for (let i = 0; i < layer.basePos.length; i++) {
      const base = layer.basePos[i];
      const spd = layer.speed[i];
      const ph = layer.phase[i];
      const t = elapsed * (0.72 + spd * 0.42) + ph;
      const driftAmp = 0.14 + bgDensityBoost * 0.12;
      layer.dummy.position.set(
        base.x + Math.sin(t * 0.93 + base.z * 0.1) * driftAmp,
        base.y + Math.cos(t * 0.72 + base.x * 0.12) * (0.12 + bgDensityBoost * 0.08),
        base.z - 0 * (0.78 + spd * 0.62) + Math.sin(t * 0.6 + base.y * 0.08) * 0.09,
      );
      if (holdAttractorStrength > 0.001) {
        nucleotideImpulseCenterLocal.copy(clickImpulseWorld).sub(nucleotideRoot.position);
        nucleotideImpulseVec.copy(nucleotideImpulseCenterLocal).sub(layer.dummy.position);
        const dist = nucleotideImpulseVec.length();
        if (dist > 1e-4) {
          const falloff = 0.24 + 0.76 * Math.exp(-dist * 0.22);
          const pull = holdAttractorStrength * falloff * 0.42;
          layer.dummy.position.addScaledVector(nucleotideImpulseVec.normalize(), pull);
        }
      }
      const s = (0.66 + spd * 0.42) * instanceScaleMul;
      layer.dummy.scale.setScalar(s);
      layer.dummy.rotation.set(
        Math.sin(t * 0.35) * 0.22,
        layer.spin[i] + t * 0.55,
        Math.cos(t * 0.28) * 0.2,
      );
      layer.dummy.updateMatrix();
      for (const unit of layer.instances) {
        unit.mesh.setMatrixAt(i, layer.dummy.matrix);
      }
    }
    for (const unit of layer.instances) {
      unit.mesh.instanceMatrix.needsUpdate = true;
    }
  }
  const cornerTarget =
    phase === 'assembly' ? 0.15 : isPostClick ? (interactionState.mode === 'focus' ? 1.22 : 1.0) : 0.85;
  const followTarget = isPostClick ? 1 : 0;
  cornerGlowStrength = THREE.MathUtils.lerp(cornerGlowStrength, cornerTarget, 1 - Math.exp(-dt * 4.4));
  cornerFollowStrength = THREE.MathUtils.lerp(cornerFollowStrength, followTarget, 1 - Math.exp(-dt * 5.6));
  const cornerScaleTarget = isPostClick ? 0.42 : 0.34;
  cornerGlowScaleSmooth = THREE.MathUtils.lerp(cornerGlowScaleSmooth, cornerScaleTarget, 1 - Math.exp(-dt * 6.2));
  const rippleTarget = phase === 'ready' && !storyFlashLocked ? 0.76 : 0.0;
  rippleIntensity = THREE.MathUtils.lerp(rippleIntensity, rippleTarget, 1 - Math.exp(-dt * 1.9));
  if (phase !== 'ready') rippleIntensity = 0;
  if (storyFlashLocked && rippleIntensity < 0.012) rippleIntensity = 0;

  if (canStartPartFocus() && partRaycast && interactionState.mode !== 'focus') {
    const hoveredPartId = partRaycast.pickPart(pointer, camera);
    setHoveredPart(hoveredPartId);
  } else if (interactionState.mode !== 'focus' && interactionState.hoveredPartId) {
    setHoveredPart(null);
  }

  if (phase === 'follow') {
    pointerSmooth.lerp(pointer, dt * 2.7);
    if (interactionState.mode === 'focus') {
      if (focusRotationTarget) {
        const rotLerp = 1 - Math.exp(-dt * 4.4);
        rnaVisualRoot.quaternion.slerp(focusRotationTarget, rotLerp);
      }
      updateFocusClipPlanes(interactionState.partId);
    } else {
      if (backReset.active) {
        const rotLerp = 1 - Math.exp(-dt * 5.2);
        rnaVisualRoot.quaternion.slerp(identityQuat, rotLerp);
      } else {
        const targetRotY = pointerSmooth.x * 0.07;
        const targetRotX = -pointerSmooth.y * 0.045;
        const rotFollowLerp = 1 - Math.exp(-dt * 6.2);
        rnaVisualRoot.rotation.y = THREE.MathUtils.lerp(rnaVisualRoot.rotation.y, targetRotY, rotFollowLerp);
        rnaVisualRoot.rotation.x = THREE.MathUtils.lerp(rnaVisualRoot.rotation.x, targetRotX, rotFollowLerp);
      }
    }
  } else {
    if (interactionState.mode !== 'focus') {
      const autoRotY = Math.sin(elapsed * 0.22) * 0.18;
      const autoRotX = Math.sin(elapsed * 0.14) * 0.045;
      const rotAutoLerp = 1 - Math.exp(-dt * 4.6);
      rnaVisualRoot.rotation.y = THREE.MathUtils.lerp(rnaVisualRoot.rotation.y, autoRotY, rotAutoLerp);
      rnaVisualRoot.rotation.x = THREE.MathUtils.lerp(rnaVisualRoot.rotation.x, autoRotX, rotAutoLerp);
    }
  }

  // 计算理想机位 (Desired Camera)
  if (phase === 'assembly' || phase === 'ready') {
    const autoProgress = phase === 'assembly'
      ? clamp01(phaseElapsed / ASSEMBLY_DURATION)
      : 1.0;
    const p = easeInOutCubic(autoProgress);
    const followHeadRaw = sampleAssemblyFocusPoint(clamp01(0.06 + p * 0.94), assemblyFocusPoint);
    const headSmoothFactor = 1.0 - Math.exp(-dt * (phase === 'assembly' ? 6.4 : 4.2));
    if (phase === 'assembly' && phaseElapsed < dt * 1.2) {
      assemblyHeadSmoothed.copy(followHeadRaw);
    } else {
      assemblyHeadSmoothed.lerp(followHeadRaw, headSmoothFactor);
    }
    const followHead = assemblyHeadSmoothed;
    const orbitBlend = THREE.MathUtils.smoothstep(p, 0.12, 0.88);
    const orbitCenter = assemblyAnchor.lerpVectors(followHead, assemblyCenter, orbitBlend);
    const angle = orbitTheta + p * 1.75 + Math.sin(elapsed * 0.14) * 0.15;
    const radius = THREE.MathUtils.lerp(3.4, 12.8, p);
    const elevation = THREE.MathUtils.lerp(-0.05, 0.36, p);
    const planarRadius = radius * Math.cos(elevation);
    desiredCamPos.set(
      orbitCenter.x + planarRadius * Math.cos(angle),
      orbitCenter.y + radius * Math.sin(elevation),
      orbitCenter.z + planarRadius * Math.sin(angle),
    );
    assemblyLook.lerpVectors(followHead, assemblyCenter, THREE.MathUtils.smoothstep(p, 0.22, 0.92));
    assemblyLook.x += Math.cos(elapsed * 0.22) * 0.14;
    assemblyLook.y += Math.sin(elapsed * 0.2) * 0.1;
    desiredLookAt.copy(assemblyLook);
    desiredFov = THREE.MathUtils.lerp(38, 56, p);
  } else if (phase === 'transition') {
    transition.elapsed += dt;
    const t = clamp01(transition.elapsed / TRANSITION_DURATION);
    const e = easeInOutCubic(t);
    desiredCamPos.lerpVectors(transition.fromPos, transition.toPos, e);
    desiredLookAt.lerpVectors(transition.fromLook, transition.toLook, e);
    desiredFov = THREE.MathUtils.lerp(transition.fromFov, transition.toFov, e);
  } else {
    if (interactionState.mode === 'focus') {
      const focusedId = interactionState.partId;
      const focused = rnaParts.find((part) => part.id === focusedId);
      if (focused) {
        const focusTarget = computeFocusCameraTarget(focused, rnaVisualRoot, focusCameraViewDir);
        desiredCamPos.copy(focusTarget.position);
        desiredLookAt.copy(focusTarget.lookAt);
        desiredFov = focusTarget.fov;
      } else {
        desiredCamPos.copy(transition.toPos);
        desiredLookAt.copy(transition.toLook);
        desiredFov = transition.toFov;
      }
    } else {
      if (backReset.active) {
        const t = clamp01(backReset.elapsed / backReset.duration);
        const e = easeInOutCubic(t);
        desiredCamPos.lerpVectors(backReset.fromPos, transition.toPos, e);
        desiredLookAt.lerpVectors(backReset.fromLook, transition.toLook, e);
        desiredFov = THREE.MathUtils.lerp(backReset.fromFov, transition.toFov, e);
      } else {
        const diveAmount = clamp01(0 / 1);
        followForward.subVectors(transition.toLook, transition.toPos).normalize();
        const diveDistance = 0 * 7.8;
        desiredCamPos.copy(transition.toPos).addScaledVector(followForward, diveDistance);
        desiredLookAt.copy(transition.toLook).addScaledVector(followForward, diveDistance + 1.9);
        const pointerGain = THREE.MathUtils.lerp(0.95, 0.24, diveAmount);
        desiredCamPos.x += pointerSmooth.x * 0.52 * pointerGain;
        desiredCamPos.y -= pointerSmooth.y * 0.3 * pointerGain;
        desiredCamPos.z += pointerSmooth.x * 0.12 * pointerGain;
        desiredLookAt.x += pointerSmooth.x * 0.2 * pointerGain;
        desiredLookAt.y -= pointerSmooth.y * 0.11 * pointerGain;
        desiredFov = THREE.MathUtils.lerp(transition.toFov, 64, diveAmount);
      }
    }
  }

  // --- 🌟 增强点：应用全局摄影机惯性弹簧系统 ---
  // 这消除了所有阶段切换时硬编码带来的顿挫，让轨迹如德芙般丝滑
  if (isFirstFrame) {
    smoothedCamPos.copy(desiredCamPos);
    smoothedLookAt.copy(desiredLookAt);
    smoothedFov = desiredFov;
    isFirstFrame = false;
  }

  // 根据阶段调整阻尼感：自由跟随状态阻尼更高更柔软，自动播放状态响应更快
  const storyDiving = phase === 'follow' && 0 > 0.01;
  const damping = phase === 'follow' ? (storyDiving ? 4.0 : 4.5) : 3.2;
  const dampFactor = 1.0 - Math.exp(-dt * damping);

  smoothedCamPos.lerp(desiredCamPos, dampFactor);
  smoothedLookAt.lerp(desiredLookAt, dampFactor);
  smoothedFov = THREE.MathUtils.lerp(smoothedFov, desiredFov, dampFactor);

  camera.position.copy(smoothedCamPos);
  camera.lookAt(smoothedLookAt);
  camera.fov = smoothedFov;
  camera.updateProjectionMatrix();

  postMaterial.uniforms.cameraNear.value = camera.near;
  postMaterial.uniforms.cameraFar.value = camera.far;
  postMaterial.uniforms.uPointer.value.copy(pointerSmooth);
  postMaterial.uniforms.uCornerGlow.value = cornerGlowStrength * cornerGlowScaleSmooth;
  postMaterial.uniforms.uCornerFollow.value = cornerFollowStrength;
  postMaterial.uniforms.uTime.value = elapsed;
  postMaterial.uniforms.uRippleIntensity.value = rippleIntensity;
  postMaterial.uniforms.uHeartbeatEnabled.value = phase === 'ready' ? 1 : 0;
  document.documentElement.classList.toggle(
    'rna-focus-mode',
    phase === 'follow' && interactionState.mode === 'focus' && focusBlend > 0.06,
  );
  const showComplianceFooter = phase === 'transition' || phase === 'follow';
  document.body.classList.toggle('show-compliance-footer', showComplianceFooter);

  const experienceState = resolveExperienceState(phase, interactionState.mode);
  const isOverviewSection = experienceState === 'overview';
  const inStorySection = experienceState === 'story';
  const isDisplaySection = isOverviewSection || inStorySection;
  const inFocus = interactionState.mode === 'focus';
  /** 滑过与 body 同色的空白全屏后，再切换顶栏 / 隐藏轨道与热点 */
  const heroChromeEnd = Math.max(120, window.innerHeight * 0.3);
  const atHeroChrome = phase === 'follow' && !inFocus && window.scrollY < heroChromeEnd;
  const overviewInteractive = isOverviewSection && atHeroChrome;
  heroOverviewInputGate.active = overviewInteractive;
  const heroCanvasPointerOn =
    phase === 'ready' || (phase === 'follow' && overviewInteractive);
  canvas.style.pointerEvents = heroCanvasPointerOn ? 'auto' : 'none';
  if (!overviewInteractive) holdAttractorActive = false;

  heroIslandWordmark.setVisible(isDisplaySection && atHeroChrome);
  heroIslandWordmark.setCompact(inStorySection);

  // Persistent click guide during overview state.

  if (scrollExploreHintEl) {
    const showScrollCue =
      phase === 'follow' &&
      interactionState.mode !== 'focus' &&
      window.scrollY < window.innerHeight * 0.92;
    scrollExploreHintEl.classList.toggle('scroll-explore-hint--visible', showScrollCue);
  }

  if (showcaseTaglineEl) {
    const showTagline =
      phase === 'follow' && interactionState.mode !== 'focus' && atHeroChrome;
    showcaseTaglineEl.classList.toggle('hero-showcase-tagline--visible', showTagline);
    showcaseTaglineEl.setAttribute('aria-hidden', showTagline ? 'false' : 'true');
  }

  const heroDesignSec = document.querySelector('.story-section--hero') as HTMLElement | null;
  if (heroDesignSec) {
    const raw = parseFloat(
      getComputedStyle(heroDesignSec).getPropertyValue('--hero-narrative-opacity').trim(),
    );
    const o = Number.isFinite(raw) ? raw : 0;
    if (narrativeHeroRnaView) {
      narrativeHeroRnaView.setNarrativeOpacity(o);
      narrativeHeroRnaView.update(dt);
    }
    if (narrativeHeroSineupStrip) {
      narrativeHeroSineupStrip.setNarrativeOpacity(o);
      narrativeHeroSineupStrip.update(dt);
    }
  }

  if (hotspotLayer) {
    hotspotLayer.setVisible(overviewInteractive);
    hotspotLayer.update(camera, { width: window.innerWidth, height: window.innerHeight });
  }
  if (isDisplaySection) {
    if (inStorySection) {
      if (false) {
        detailNav.setLayoutMode('island');
      } else {
        detailNav.setLayoutMode('edge');
      }
      detailNav.setCenterSafeRadius(0);
    } else {
      detailNav.setLayoutMode('heroIsland');
      detailNav.setCenterSafeRadius(0);
    }
    detailNav.show();
    detailNav.root.classList.toggle('detail-nav--story-bar', !atHeroChrome);
    detailNav.relayout();
  } else {
    detailNav.setLayoutMode('orbit');
    detailNav.setCenterSafeRadius(0);
    detailNav.hide();
  }
    renderer.setRenderTarget(depthTarget);
  renderer.render(scene, camera);
  postMaterial.uniforms.tDiffuse.value = depthTarget.texture;
  postMaterial.uniforms.tDepth.value = depthTarget.depthTexture;
  renderer.setRenderTarget(null);
  renderer.render(postScene, postCamera);
}

window.addEventListener('resize', () => {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  const newDpr = renderer.getPixelRatio();
  depthTarget.setSize(w * newDpr, h * newDpr);
  renderer.setSize(w, h);
  detailNav.relayout();
  if (narrative) narrative.refresh();
});

animate();