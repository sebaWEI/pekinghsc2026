import * as THREE from 'three';
import type { RnaPart } from '../types/rna';

interface HotspotEntry {
  id: string;
  el: HTMLButtonElement;
  worldPos: THREE.Vector3;
}

const RNA_FOCUS_CLICK_GUIDE_KEY = 'igem2026-wiki-rna-focus-clicked';
const CLICK_GUIDE_PULSE_SHOW_MS = 5000;
const CLICK_GUIDE_PULSE_HIDE_MS = 5000;
const CLICK_GUIDE_FADE_MS = 720;

export interface HotspotLayer {
  setVisible(visible: boolean): void;
  setActive(partId: string | null): void;
  update(camera: THREE.Camera, viewport: { width: number; height: number }): void;
  dismissClickGuide(): void;
  destroy(): void;
}

export function createHotspotLayer(
  parent: HTMLElement,
  parts: RnaPart[],
  modelRoot: THREE.Object3D,
  onClick: (partId: string) => void,
): HotspotLayer {
  const layer = document.createElement('div');
  layer.className = 'rna-hotspot-layer';
  parent.appendChild(layer);

  const clickGuideEl = document.createElement('div');
  clickGuideEl.className = 'rna-hotspot-click-guide';
  clickGuideEl.setAttribute('aria-hidden', 'true');

  const clickGuideLineSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  clickGuideLineSvg.setAttribute('class', 'rna-hotspot-click-guide__line');
  clickGuideLineSvg.setAttribute('aria-hidden', 'true');

  const clickGuideLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  clickGuideLine.setAttribute('class', 'rna-hotspot-click-guide__line-path');
  clickGuideLineSvg.appendChild(clickGuideLine);

  const clickGuideDot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  clickGuideDot.setAttribute('class', 'rna-hotspot-click-guide__line-dot');
  clickGuideLineSvg.appendChild(clickGuideDot);

  const clickGuideLabel = document.createElement('span');
  clickGuideLabel.className = 'rna-hotspot-click-guide__label';
  clickGuideLabel.innerHTML =
    '<span class="rna-hotspot-click-guide__action">click</span> to view detail';

  clickGuideEl.appendChild(clickGuideLineSvg);
  clickGuideEl.appendChild(clickGuideLabel);
  layer.appendChild(clickGuideEl);

  const entries: HotspotEntry[] = [];
  const partById = new Map(parts.map((part) => [part.id, part]));
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    const button = document.createElement('button');
    button.className = 'rna-hotspot';
    button.type = 'button';
    button.title = part.id;
    button.style.setProperty('--hx', '0px');
    button.style.setProperty('--hy', '0px');
    button.style.setProperty('--intro-delay', `${i * 120}ms`);
    button.addEventListener('click', (ev) => {
      ev.stopPropagation();
      dismissClickGuide();
      onClick(part.id);
    });
    layer.appendChild(button);
    entries.push({ id: part.id, el: button, worldPos: new THREE.Vector3() });
  }

  const projected = new THREE.Vector3();
  let activePartId: string | null = null;
  let introPlayed = false;
  let introTimer: number | null = null;
  /** 须与 setVisible 同步：update() 每帧会重写子节点 pointer-events，仅在为 true 时才允许可点 */
  let hotspotsHitTarget = false;
  let clickGuideFirstDone = false;
  let clickGuidePulseShowing = true;
  let pulseTimer: number | null = null;
  let layerVisible = false;
  try {
    clickGuideFirstDone = localStorage.getItem(RNA_FOCUS_CLICK_GUIDE_KEY) === '1';
  } catch {
    clickGuideFirstDone = false;
  }

  function clearPulseTimer(): void {
    if (pulseTimer !== null) {
      window.clearTimeout(pulseTimer);
      pulseTimer = null;
    }
  }

  function setClickGuideVisible(visible: boolean): void {
    clickGuideEl.classList.toggle('rna-hotspot-click-guide--visible', visible);
  }

  function runPulseStep(showNext: boolean): void {
    clearPulseTimer();
    if (!clickGuideFirstDone || !hotspotsHitTarget) return;

    clickGuidePulseShowing = showNext;
    setClickGuideVisible(showNext);

    pulseTimer = window.setTimeout(() => {
      runPulseStep(!showNext);
    }, (showNext ? CLICK_GUIDE_PULSE_SHOW_MS : CLICK_GUIDE_PULSE_HIDE_MS) + CLICK_GUIDE_FADE_MS);
  }

  function startPulseCycle(): void {
    if (!clickGuideFirstDone || !hotspotsHitTarget) return;
    runPulseStep(true);
  }

  function shouldShowClickGuide(): boolean {
    if (!hotspotsHitTarget) return false;
    if (!clickGuideFirstDone) return true;
    return clickGuidePulseShowing;
  }

  function dismissClickGuide(): void {
    if (clickGuideFirstDone) return;
    clickGuideFirstDone = true;
    clickGuidePulseShowing = false;
    setClickGuideVisible(false);
    clearPulseTimer();
    try {
      localStorage.setItem(RNA_FOCUS_CLICK_GUIDE_KEY, '1');
    } catch {
      /* 隐私模式 / 配额 */
    }
  }

  function updateClickGuidePosition(
    visibleEntries: Array<{ entry: HotspotEntry; x: number; y: number }>,
    viewport: { width: number; height: number },
  ): void {
    if (!shouldShowClickGuide() || visibleEntries.length === 0) {
      setClickGuideVisible(false);
      return;
    }

    const centerX = viewport.width * 0.5;
    const centerY = viewport.height * 0.5;
    let anchor = visibleEntries[0];
    let bestDist = Number.POSITIVE_INFINITY;
    for (const item of visibleEntries) {
      const dist = Math.hypot(item.x - centerX, item.y - centerY);
      if (dist < bestDist) {
        bestDist = dist;
        anchor = item;
      }
    }

    const labelOffsetX = -112;
    const labelOffsetY = -88;
    const lineStartX = labelOffsetX + 18;
    const lineStartY = labelOffsetY + 10;
    const lineEndX = 0;
    const lineEndY = 0;
    const pad = 10;
    const minX = Math.min(lineStartX, lineEndX) - pad;
    const minY = Math.min(lineStartY, lineEndY) - pad;
    const width = Math.max(lineStartX, lineEndX) + pad - minX;
    const height = Math.max(lineStartY, lineEndY) + pad - minY;

    clickGuideEl.style.setProperty('--hx', `${anchor.x}px`);
    clickGuideEl.style.setProperty('--hy', `${anchor.y}px`);
    clickGuideEl.style.setProperty('--label-x', `${labelOffsetX}px`);
    clickGuideEl.style.setProperty('--label-y', `${labelOffsetY}px`);

    clickGuideLineSvg.style.left = `${minX}px`;
    clickGuideLineSvg.style.top = `${minY}px`;
    clickGuideLineSvg.style.width = `${width}px`;
    clickGuideLineSvg.style.height = `${height}px`;
    clickGuideLineSvg.setAttribute('viewBox', `0 0 ${width} ${height}`);

    const x1 = lineStartX - minX;
    const y1 = lineStartY - minY;
    const x2 = lineEndX - minX;
    const y2 = lineEndY - minY;

    clickGuideLine.setAttribute('x1', String(x1));
    clickGuideLine.setAttribute('y1', String(y1));
    clickGuideLine.setAttribute('x2', String(x2));
    clickGuideLine.setAttribute('y2', String(y2));
    clickGuideDot.setAttribute('cx', String(x2));
    clickGuideDot.setAttribute('cy', String(y2));
    clickGuideDot.setAttribute('r', '2.5');

    setClickGuideVisible(true);
  }

  return {
    setVisible(visible) {
      const wasVisible = layerVisible;
      layerVisible = visible;
      hotspotsHitTarget = visible;
      layer.style.opacity = visible ? '1' : '0';
      layer.style.pointerEvents = visible ? 'auto' : 'none';
      if (!visible) {
        clearPulseTimer();
        setClickGuideVisible(false);
      } else if (clickGuideFirstDone && !wasVisible) {
        startPulseCycle();
      }
      // 父层 pointer-events:none 时，子节点若保留 auto 仍会截获命中测试；隐藏时必须清掉。
      for (const entry of entries) {
        entry.el.style.pointerEvents = visible ? '' : 'none';
      }
      if (visible && !introPlayed) {
        introPlayed = true;
        for (const entry of entries) {
          entry.el.classList.add('intro-seq');
        }
        const totalDurationMs = Math.max(1000, parts.length * 120 + 980);
        introTimer = window.setTimeout(() => {
          for (const entry of entries) {
            entry.el.classList.remove('intro-seq');
          }
          introTimer = null;
        }, totalDurationMs);
      }
    },
    setActive(partId) {
      activePartId = partId;
      for (const entry of entries) {
        entry.el.classList.toggle('active', entry.id === partId);
        entry.el.classList.toggle('muted', !!partId && entry.id !== partId);
      }
    },
    update(camera, viewport) {
      const width = Math.max(viewport.width, 1);
      const height = Math.max(viewport.height, 1);
      const visibleEntries: Array<{ entry: HotspotEntry; x: number; y: number }> = [];
      for (const entry of entries) {
        const part = partById.get(entry.id);
        if (!part) continue;
        entry.worldPos.copy(part.center);
        modelRoot.localToWorld(entry.worldPos);
        projected.copy(entry.worldPos).project(camera);
        const inFront = projected.z < 1;
        const visible = inFront && projected.x >= -1.1 && projected.x <= 1.1 && projected.y >= -1.1 && projected.y <= 1.1;
        if (!visible) {
          entry.el.style.opacity = '0';
          entry.el.style.pointerEvents = 'none';
          continue;
        }
        visibleEntries.push({
          entry,
          x: ((projected.x + 1) * 0.5) * width,
          y: ((1 - projected.y) * 0.5) * height,
        });
      }

      // De-overlap hotspots in screen space when multiple centers are close.
      const minDistance = 28;
      for (let iter = 0; iter < 3; iter++) {
        for (let i = 0; i < visibleEntries.length; i++) {
          for (let j = i + 1; j < visibleEntries.length; j++) {
            const a = visibleEntries[i];
            const b = visibleEntries[j];
            let dx = b.x - a.x;
            let dy = b.y - a.y;
            let dist = Math.hypot(dx, dy);
            if (dist >= minDistance) continue;
            if (dist < 1e-3) {
              const angle = ((i * 31 + j * 17) % 360) * (Math.PI / 180);
              dx = Math.cos(angle);
              dy = Math.sin(angle);
              dist = 1;
            }
            const push = (minDistance - dist) * 0.5;
            const nx = dx / dist;
            const ny = dy / dist;
            a.x -= nx * push;
            a.y -= ny * push;
            b.x += nx * push;
            b.y += ny * push;
          }
        }
      }

      for (const item of visibleEntries) {
        item.entry.el.style.setProperty('--hx', `${item.x}px`);
        item.entry.el.style.setProperty('--hy', `${item.y}px`);
        item.entry.el.style.opacity = activePartId && activePartId !== item.entry.id ? '0.35' : '1';
        item.entry.el.style.pointerEvents = hotspotsHitTarget ? 'auto' : 'none';
      }

      updateClickGuidePosition(visibleEntries, viewport);
    },
    dismissClickGuide,
    destroy() {
      clearPulseTimer();
      if (introTimer !== null) {
        window.clearTimeout(introTimer);
      }
      layer.remove();
    },
  };
}

