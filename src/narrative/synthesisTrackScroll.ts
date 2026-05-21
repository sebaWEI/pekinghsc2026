import type { SynthesisNodePathMeta, SynthesisTrackLinesController } from './synthesisTrackLines';
import { collectSynthesisNodes } from './synthesisTrackLines';
import {
  mountSynthesisTrackParticles,
  type EmitterPhase,
  type EmitterPoint,
  type SynthesisParticleController,
} from './synthesisTrackParticles';

const PATH_KEYS = ['stem', 'binding', 'effector', 'tail'] as const;

/** Lit-path front sits at this fraction of viewport height (from top). */
const FRONT_VIEWPORT_Y_RATIO = 0.8;

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

function viewportFrontY(track: HTMLElement): number {
  const trackRect = track.getBoundingClientRect();
  return window.innerHeight * FRONT_VIEWPORT_Y_RATIO - trackRect.top;
}

function litLengthUpToY(path: SVGPathElement, frontY: number): number {
  const total = path.getTotalLength();
  if (total <= 0) return 0;

  const startY = path.getPointAtLength(0).y;
  const endY = path.getPointAtLength(total).y;

  if (frontY < startY) return 0;
  if (frontY >= endY) return total;

  let lo = 0;
  let hi = total;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    if (path.getPointAtLength(mid).y <= frontY) lo = mid;
    else hi = mid;
  }
  return lo;
}

function setPathGlow(path: SVGPathElement, length: number, litLength: number): void {
  const lit = clamp(litLength, 0, length);
  path.style.strokeDasharray = `${length}`;
  path.style.strokeDashoffset = `${length - lit}`;
}

function pathTip(
  lines: SynthesisTrackLinesController,
  key: (typeof PATH_KEYS)[number],
  lit: number,
): EmitterPoint | null {
  if (lit <= 0.5) return null;
  const pt = lines.paths[key].getPointAtLength(lit);
  return { x: pt.x, y: pt.y };
}

export function mountSynthesisTrackScroll(
  track: HTMLElement,
  lines: SynthesisTrackLinesController,
): { destroy: () => void; refresh: () => void } {
  const section = track.closest<HTMLElement>('.story-section--synthesis');
  if (!section) return { destroy: () => {}, refresh: () => {} };

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const particles: SynthesisParticleController = mountSynthesisTrackParticles(track);

  let nodeMeta: SynthesisNodePathMeta[] = [];
  let mergeY = Infinity;
  let mergePoint: EmitterPoint | null = null;
  let ignited = new WeakSet<HTMLElement>();
  let mergePlayed = false;
  let mergeBurstPlayed = false;
  let startBurstPlayed = false;
  let maxFrontY = 0;
  let emitterPhase: EmitterPhase = 'off';
  let scrollRaf = 0;
  let animRaf = 0;
  let lastAnimTs = 0;
  let finished = false;

  const rebuildMeta = (): void => {
    lines.refresh();
    nodeMeta = lines.collectNodeMeta(track);
    const mergeMeta = nodeMeta.find((m) => m.el.classList.contains('synthesis-milestone--merge'));
    mergeY = mergeMeta?.y ?? Infinity;

    const trackRect = track.getBoundingClientRect();
    const mergeDot = track.querySelector('.synthesis-milestone--merge .synthesis-milestone__dot');
    if (mergeDot) {
      const r = mergeDot.getBoundingClientRect();
      mergePoint = {
        x: r.left + r.width / 2 - trackRect.left,
        y: r.top + r.height / 2 - trackRect.top,
      };
    }

    const trackH = trackRect.height;
    const trackW = trackRect.width;
    if (trackH > 0) maxFrontY = Math.min(maxFrontY, trackH);
    particles.resize(trackW, trackH);
  };

  const litLengthForPath = (pathKey: (typeof PATH_KEYS)[number], frontY: number): number => {
    const path = lines.paths[pathKey];
    const length = path.getTotalLength();
    if (length <= 0) return 0;

    if ((pathKey === 'binding' || pathKey === 'effector') && frontY >= mergeY) {
      return length;
    }

    return litLengthUpToY(path, frontY);
  };

  const getEmitterPoints = (frontY: number): EmitterPoint[] => {
    const { trackEndY } = lines.metrics;
    if (frontY >= trackEndY - 2) return [];

    const points: EmitterPoint[] = [];
    const pushTip = (key: (typeof PATH_KEYS)[number]) => {
      const tip = pathTip(lines, key, litLengthForPath(key, frontY));
      if (tip) points.push(tip);
    };

    if (frontY >= mergeY - 2) {
      pushTip('tail');
      if (points.length === 0 && mergePoint) points.push(mergePoint);
      return points;
    }

    if (litLengthForPath('binding', frontY) > 0.5) pushTip('binding');
    if (litLengthForPath('effector', frontY) > 0.5) pushTip('effector');
    if (points.length === 0) pushTip('stem');

    return points;
  };

  const updateGlow = (frontY: number): void => {
    for (const key of PATH_KEYS) {
      const length = lines.paths[key].getTotalLength();
      setPathGlow(lines.glowPaths[key], length, litLengthForPath(key, frontY));
    }
  };

  const igniteNode = (node: HTMLElement): void => {
    if (ignited.has(node)) return;
    ignited.add(node);
    node.classList.add('is-igniting');
    window.setTimeout(() => {
      node.classList.remove('is-igniting');
      node.classList.add('is-lit');
    }, 520);
  };

  const playMerge = (): void => {
    if (mergePlayed) return;
    mergePlayed = true;
    track.classList.add('is-merge-active');
    const merge = track.querySelector('.synthesis-milestone--merge');
    merge?.classList.add('is-merging');
    window.setTimeout(() => {
      merge?.classList.remove('is-merging');
    }, 900);
  };

  const updateNodes = (frontY: number): void => {
    for (const meta of nodeMeta) {
      if (frontY >= meta.y) igniteNode(meta.el);
    }
    if (frontY >= mergeY) playMerge();
  };

  const stopBurning = (): void => {
    if (finished) return;
    finished = true;
    emitterPhase = 'dead';
    particles.setPhase('dead');
    particles.clear();
  };

  const updateEmitter = (frontY: number): void => {
    if (finished || emitterPhase === 'dead') return;

    const { stemStartY, trackEndY } = lines.metrics;

    if (frontY >= trackEndY - 2) {
      stopBurning();
      return;
    }

    const emitters = getEmitterPoints(frontY);
    if (emitters.length === 0) {
      particles.setEmitters([]);
      particles.clear();
      return;
    }

    particles.setEmitters(emitters);

    if (emitterPhase === 'off' && frontY >= stemStartY + 2) {
      emitterPhase = 'idle';
      particles.setPhase('idle');
      if (!startBurstPlayed) {
        startBurstPlayed = true;
        particles.pulseBurst(true);
      }
    }

    if (frontY >= mergeY && !mergeBurstPlayed && mergePoint) {
      mergeBurstPlayed = true;
      const saved = emitters;
      particles.setEmitters([mergePoint]);
      particles.pulseBurst(true);
      particles.setEmitters(saved);
    }
  };

  const applyAllLit = (): void => {
    maxFrontY = Math.max(track.getBoundingClientRect().height, maxFrontY);
    for (const key of PATH_KEYS) {
      const length = lines.paths[key].getTotalLength();
      setPathGlow(lines.glowPaths[key], length, length);
    }
    const nodes = collectSynthesisNodes(track);
    for (const node of nodes) {
      node.classList.add('is-lit');
    }
    track.classList.add('is-merge-active');
    stopBurning();
  };

  const scrollTick = (): void => {
    scrollRaf = 0;
    if (nodeMeta.length === 0) rebuildMeta();
    if (finished) return;

    const sectionRect = section.getBoundingClientRect();
    if (sectionRect.top > window.innerHeight * 0.6) return;

    const currentFrontY = viewportFrontY(track);
    maxFrontY = Math.max(maxFrontY, currentFrontY);

    const trackH = Math.max(track.getBoundingClientRect().height, 1);
    track.style.setProperty('--synthesis-front-y', `${maxFrontY.toFixed(1)}px`);
    track.style.setProperty('--synthesis-scroll-progress', clamp(maxFrontY / trackH, 0, 1).toFixed(4));

    updateGlow(maxFrontY);
    updateNodes(maxFrontY);
    updateEmitter(maxFrontY);

    if (emitterPhase === 'idle' && !animRaf) {
      lastAnimTs = 0;
      animLoop(performance.now());
    }
  };

  const animLoop = (ts: number): void => {
    if (finished || emitterPhase !== 'idle') {
      animRaf = 0;
      if (finished) particles.clear();
      return;
    }

    animRaf = requestAnimationFrame(animLoop);
    const dt = lastAnimTs ? Math.min(0.05, (ts - lastAnimTs) / 1000) : 1 / 60;
    lastAnimTs = ts;
    particles.tick(dt);
  };

  const scheduleScroll = (): void => {
    if (scrollRaf) return;
    scrollRaf = requestAnimationFrame(scrollTick);
  };

  const ro = new ResizeObserver(() => {
    rebuildMeta();
    scheduleScroll();
  });
  ro.observe(track);
  ro.observe(section);

  window.addEventListener('scroll', scheduleScroll, { passive: true });
  window.addEventListener('resize', scheduleScroll, { passive: true });

  rebuildMeta();
  if (reducedMotion) {
    applyAllLit();
  } else {
    scheduleScroll();
  }

  return {
    destroy: () => {
      if (scrollRaf) cancelAnimationFrame(scrollRaf);
      if (animRaf) cancelAnimationFrame(animRaf);
      ro.disconnect();
      window.removeEventListener('scroll', scheduleScroll);
      window.removeEventListener('resize', scheduleScroll);
      particles.destroy();
    },
    refresh: () => {
      rebuildMeta();
      scheduleScroll();
    },
  };
}
