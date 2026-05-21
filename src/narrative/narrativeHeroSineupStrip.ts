import { igemStatic } from '../content/igemAssets';
import { NARRATIVE_HERO_ENTRANCE } from './narrativeHeroRnaView';

/** SINEUP 条带单独节奏：比 RNA 更慢、更缓 */
const SINEUP_ENTRANCE = {
  SETTLE: 0.75,
  DURATION: 2.85,
} as const;

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

function restYOffset(): number {
  return Math.max(260, Math.min(window.innerHeight * 0.36, 400));
}

export interface NarrativeHeroSineupStrip {
  update(dt: number): void;
  setNarrativeOpacity(p: number): void;
  dispose(): void;
}

function isHeroSceneActive(section: HTMLElement): boolean {
  const r = section.getBoundingClientRect();
  const vh = window.innerHeight;
  const visible = Math.min(r.bottom, vh) - Math.max(r.top, 0);
  const cover = visible / Math.max(vh, 1);
  return cover >= 0.52 && r.top <= vh * 0.38 && r.bottom >= vh * 0.45;
}

/**
 * 条带只露中间一段（头尾在屏外裁切）。
 * 仅约束水平位移：尾端始终贴左/右屏缘，不往内滑出露尾。
 */
function applyStripTransform(
  img: HTMLImageElement,
  side: 'left' | 'right',
  x: number,
  y: number,
): void {
  img.style.transform = `translate(${x}px, ${y}px) rotate(-45deg)`;
  const r = img.getBoundingClientRect();

  if (side === 'left') {
    if (r.left > 0) {
      img.style.transform = `translate(${x - r.left}px, ${y}px) rotate(-45deg)`;
    }
    return;
  }

  const rightEdge = window.innerWidth;
  if (r.right < rightEdge) {
    img.style.transform = `translate(${x + (rightEdge - r.right)}px, ${y}px) rotate(-45deg)`;
  }
}

/**
 * 叙事 Hero 层：左上 / 右下对称 SINEUP 条带，仅在本幕可见。
 */
export function createNarrativeHeroSineupStrip(host: HTMLElement): NarrativeHeroSineupStrip {
  const section = host.closest('.story-section--hero') as HTMLElement | null;
  if (!section) {
    throw new Error('hero-sineup-host must live inside .story-section--hero');
  }

  const imgTl = document.createElement('img');
  imgTl.className = 'hero-sineup-strip hero-sineup-strip--tl';
  imgTl.src = igemStatic('/images/sineup.svg');
  imgTl.alt = '';
  imgTl.draggable = false;

  const imgBr = document.createElement('img');
  imgBr.className = 'hero-sineup-strip hero-sineup-strip--br';
  imgBr.src = igemStatic('/images/sineup.svg');
  imgBr.alt = '';
  imgBr.draggable = false;

  host.append(imgTl, imgBr);

  let narrativeOpacity = 0;
  let entranceElapsed = 0;
  let entranceStarted = false;
  let entranceDone = false;

  function getEntranceProgress(): number {
    if (entranceDone) return 1;
    if (!entranceStarted) return 0;

    const elapsed = entranceElapsed - SINEUP_ENTRANCE.SETTLE;
    if (elapsed <= 0) return 0;

    const t = Math.min(1, elapsed / SINEUP_ENTRANCE.DURATION);
    if (t >= 1) entranceDone = true;
    return easeOutCubic(t);
  }

  function applyTopLeft(progress: number): void {
    const w = host.clientWidth;
    if (w < 2) return;

    const stripH = imgTl.offsetHeight || imgTl.getBoundingClientRect().height || 56;
    const rotPad = stripH * 0.5 * Math.SQRT1_2 + 8;

    const endX = rotPad;
    const endY = restYOffset();

    const travel = Math.min(w * 0.055, 64);
    const startX = endX - travel;
    const startY = endY + travel * 0.42;

    const x = startX + (endX - startX) * progress;
    const y = startY + (endY - startY) * progress;

    imgTl.style.opacity = String(progress);
    applyStripTransform(imgTl, 'left', x, y);
  }

  function applyBottomRight(progress: number): void {
    const w = host.clientWidth;
    if (w < 2) return;

    const stripH = imgBr.offsetHeight || imgBr.getBoundingClientRect().height || 56;
    const rotPad = stripH * 0.5 * Math.SQRT1_2 + 8;

    const endTx = -rotPad;
    const endTy = -restYOffset();

    const travel = Math.min(w * 0.055, 64);
    const startTx = endTx + travel;
    const startTy = endTy - travel * 0.42;

    const tx = startTx + (endTx - startTx) * progress;
    const ty = startTy + (endTy - startTy) * progress;

    imgBr.style.opacity = String(progress);
    applyStripTransform(imgBr, 'right', tx, ty);
  }

  function syncVisibility(active: boolean): void {
    host.classList.toggle('is-visible', active);
    if (!active) {
      imgTl.style.opacity = '0';
      imgBr.style.opacity = '0';
    }
  }

  return {
    setNarrativeOpacity(p: number) {
      narrativeOpacity = Math.min(1, Math.max(0, p));
    },

    update(dt: number) {
      // 入场完成后永久保留，滚动不再隐藏
      if (entranceDone) {
        syncVisibility(true);
        applyTopLeft(1);
        applyBottomRight(1);
        return;
      }

      if (!entranceStarted) {
        const sceneActive = isHeroSceneActive(section);
        if (!sceneActive || narrativeOpacity < NARRATIVE_HERO_ENTRANCE.START_OPACITY * 0.95) {
          syncVisibility(false);
          return;
        }

        const r = section.getBoundingClientRect();
        const readyToStart = r.top <= window.innerHeight * 0.32;
        if (readyToStart && narrativeOpacity >= NARRATIVE_HERO_ENTRANCE.START_OPACITY) {
          entranceStarted = true;
          entranceElapsed = 0;
        } else {
          syncVisibility(false);
          return;
        }
      }

      if (entranceStarted) {
        entranceElapsed += dt;
      }

      syncVisibility(true);
      const progress = getEntranceProgress();
      applyTopLeft(progress);
      applyBottomRight(progress);
    },

    dispose() {
      imgTl.remove();
      imgBr.remove();
    },
  };
}
