export interface SynthesisTrackPaths {
  stem: SVGPathElement;
  binding: SVGPathElement;
  effector: SVGPathElement;
  tail: SVGPathElement;
}

export interface SynthesisTrackGlowPaths extends SynthesisTrackPaths {}

export interface SynthesisNodePathMeta {
  el: HTMLElement;
  pathKey: keyof SynthesisTrackPaths;
  pathT: number;
  y: number;
}

export interface SynthesisTrackLinesController {
  paths: SynthesisTrackPaths;
  glowPaths: SynthesisTrackGlowPaths;
  mergeBurst: SVGCircleElement;
  metrics: { stemStartY: number; trackEndY: number; mergeHubX: number; mergeHubY: number };
  refresh(): void;
  destroy(): void;
  getPathLengths(): Record<keyof SynthesisTrackPaths, number>;
  collectNodeMeta(track: HTMLElement): SynthesisNodePathMeta[];
}

const SVG_NS = 'http://www.w3.org/2000/svg';
const DEFAULT_RAIL_X = 0.13;

function readRailX(track: HTMLElement): number {
  const section = track.closest<HTMLElement>('.story-section--synthesis');
  const source = section ?? track;
  const v = parseFloat(getComputedStyle(source).getPropertyValue('--synthesis-rail-x'));
  return Number.isFinite(v) && v > 0 && v < 0.5 ? v : DEFAULT_RAIL_X;
}

function layoutScale(trackWidth: number): number {
  return Math.max(0.62, trackWidth / 920);
}

function createPath(className: string): SVGPathElement {
  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('class', className);
  return path;
}

function anchor(el: Element, trackRect: DOMRect) {
  const r = el.getBoundingClientRect();
  return {
    x: r.left + r.width / 2 - trackRect.left,
    y: r.top + r.height / 2 - trackRect.top,
    top: r.top - trackRect.top,
    bottom: r.bottom - trackRect.top,
  };
}

function buildBranchPath(
  cx: number,
  yBranch: number,
  railX: number,
  yForkTop: number,
  yForkBottom: number,
  mergeX: number,
  mergeY: number,
  scale: number,
): string {
  const dx = Math.abs(railX - cx);
  const forkSpan = Math.max(yForkBottom - yForkTop, 1);
  const leadCap = 52 * scale;
  const leadIn = Math.min(leadCap, Math.max(18, (yForkTop - yBranch) * 0.72));
  const leadOut = Math.min(leadCap, Math.max(18, forkSpan * 0.14, (mergeY - yForkBottom) * 0.45));
  const dir = railX < cx ? -1 : 1;

  return [
    `M ${cx} ${yBranch}`,
    `C ${cx} ${yBranch + leadIn * 0.38}`,
    `${cx + dir * dx * 0.18} ${yBranch + leadIn * 0.72}`,
    `${cx + dir * dx * 0.58} ${yForkTop - leadIn * 0.1}`,
    `C ${cx + dir * dx * 0.9} ${yForkTop + leadIn * 0.06}`,
    `${railX} ${yForkTop + leadIn * 0.16}`,
    `${railX} ${yForkTop + leadIn * 0.28}`,
    `L ${railX} ${yForkBottom - leadOut * 0.28}`,
    `C ${railX} ${yForkBottom + leadOut * 0.06}`,
    `${railX + (mergeX - railX) * 0.38} ${mergeY - leadOut * 0.2}`,
    `${mergeX} ${mergeY}`,
  ].join(' ');
}

function closestPathT(path: SVGPathElement, x: number, y: number): number {
  const len = path.getTotalLength();
  if (len <= 0) return 0;
  let bestT = 0;
  let bestD = Infinity;
  const steps = 48;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const pt = path.getPointAtLength(t * len);
    const d = (pt.x - x) ** 2 + (pt.y - y) ** 2;
    if (d < bestD) {
      bestD = d;
      bestT = t;
    }
  }
  return bestT;
}

function pickPathKey(
  node: HTMLElement,
): keyof SynthesisTrackPaths {
  if (node.classList.contains('synthesis-milestone--origin')) return 'stem';
  if (node.classList.contains('synthesis-milestone--merge')) return 'tail';
  if (node.classList.contains('synthesis-milestone--binding')) return 'binding';
  if (node.classList.contains('synthesis-milestone--effector')) return 'effector';
  if (node.classList.contains('synthesis-milestone--outcome')) return 'tail';
  return 'stem';
}

export function collectSynthesisNodes(track: HTMLElement): HTMLElement[] {
  const origin = track.querySelector<HTMLElement>('.synthesis-milestone--origin');
  const fork = Array.from(
    track.querySelectorAll<HTMLElement>('.synthesis-track__fork > .synthesis-milestone'),
  );
  const merge = track.querySelector<HTMLElement>('.synthesis-milestone--merge');
  const outcomes = Array.from(
    track.querySelectorAll<HTMLElement>('.synthesis-track__tail .synthesis-milestone'),
  );

  const nodes: HTMLElement[] = [];
  if (origin) nodes.push(origin);
  nodes.push(...fork);
  if (merge) nodes.push(merge);
  nodes.push(...outcomes);
  return nodes;
}

export function mountSynthesisTrackLines(track: HTMLElement): SynthesisTrackLinesController {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', 'synthesis-track__lines');
  svg.setAttribute('aria-hidden', 'true');

  const baseGroup = document.createElementNS(SVG_NS, 'g');
  baseGroup.setAttribute('class', 'synthesis-track__lines-base');

  const glowGroup = document.createElementNS(SVG_NS, 'g');
  glowGroup.setAttribute('class', 'synthesis-track__lines-glow');

  const paths: SynthesisTrackPaths = {
    stem: createPath('synthesis-track__line synthesis-track__line--stem synthesis-track__line--base'),
    binding: createPath('synthesis-track__line synthesis-track__line--binding synthesis-track__line--base'),
    effector: createPath('synthesis-track__line synthesis-track__line--effector synthesis-track__line--base'),
    tail: createPath('synthesis-track__line synthesis-track__line--tail synthesis-track__line--base'),
  };

  const glowPaths: SynthesisTrackGlowPaths = {
    stem: createPath('synthesis-track__line synthesis-track__line--stem synthesis-track__line--glow'),
    binding: createPath('synthesis-track__line synthesis-track__line--binding synthesis-track__line--glow'),
    effector: createPath('synthesis-track__line synthesis-track__line--effector synthesis-track__line--glow'),
    tail: createPath('synthesis-track__line synthesis-track__line--tail synthesis-track__line--glow'),
  };

  for (const path of Object.values(paths)) baseGroup.appendChild(path);
  for (const path of Object.values(glowPaths)) glowGroup.appendChild(path);

  const mergeBurst = document.createElementNS(SVG_NS, 'circle');
  mergeBurst.setAttribute('class', 'synthesis-track__merge-burst');
  mergeBurst.setAttribute('r', '0');
  glowGroup.appendChild(mergeBurst);

  svg.append(baseGroup, glowGroup);
  track.prepend(svg);

  const metrics = { stemStartY: 0, trackEndY: 0, mergeHubX: 0, mergeHubY: 0 };

  const layout = (): void => {
    const trackRect = track.getBoundingClientRect();
    if (trackRect.width < 1 || trackRect.height < 1) return;

    svg.setAttribute('width', String(trackRect.width));
    svg.setAttribute('height', String(trackRect.height));
    svg.setAttribute('viewBox', `0 0 ${trackRect.width} ${trackRect.height}`);

    const w = trackRect.width;
    const railX = readRailX(track);
    const scale = layoutScale(w);
    const lx = w * railX;
    const rx = w * (1 - railX);
    const cx = w * 0.5;

    const originDot = track.querySelector('.synthesis-milestone--origin .synthesis-milestone__dot');
    const mergeDot = track.querySelector('.synthesis-milestone--merge .synthesis-milestone__dot');
    const forkEl = track.querySelector('.synthesis-track__fork');
    const tailEl = track.querySelector('.synthesis-track__tail');
    if (!originDot || !mergeDot || !forkEl || !tailEl) return;

    const origin = anchor(originDot, trackRect);
    const merge = anchor(mergeDot, trackRect);
    const forkRect = forkEl.getBoundingClientRect();
    const forkTop = forkRect.top - trackRect.top;
    const forkBottom = forkRect.bottom - trackRect.top;
    const tailRect = tailEl.getBoundingClientRect();
    const tailEnd = tailRect.bottom - trackRect.top;

    const stemLen = Math.min(36 * scale, Math.max(10, (forkTop - origin.bottom) * 0.32));
    const yBranch = origin.bottom + stemLen;

    const stemD = `M ${cx} ${origin.bottom} L ${cx} ${yBranch}`;
    const bindingD = buildBranchPath(cx, yBranch, lx, forkTop, forkBottom, merge.x, merge.y, scale);
    const effectorD = buildBranchPath(cx, yBranch, rx, forkTop, forkBottom, merge.x, merge.y, scale);
    const tailD = `M ${merge.x} ${merge.bottom} L ${merge.x} ${tailEnd}`;

    for (const [key, d] of [
      ['stem', stemD],
      ['binding', bindingD],
      ['effector', effectorD],
      ['tail', tailD],
    ] as const) {
      paths[key].setAttribute('d', d);
      glowPaths[key].setAttribute('d', d);
    }

    mergeBurst.setAttribute('cx', String(merge.x));
    mergeBurst.setAttribute('cy', String(merge.y));

    metrics.stemStartY = origin.bottom;
    metrics.trackEndY = tailEnd;
    metrics.mergeHubX = merge.x;
    metrics.mergeHubY = merge.y;

    for (const path of Object.values({ ...paths, ...glowPaths })) {
      path.dataset.length = String(path.getTotalLength());
    }
  };

  const collectNodeMeta = (trackEl: HTMLElement): SynthesisNodePathMeta[] => {
    const trackRect = trackEl.getBoundingClientRect();
    return collectSynthesisNodes(trackEl).map((node) => {
      const dot = node.querySelector('.synthesis-milestone__dot')!;
      const pt = anchor(dot, trackRect);
      const pathKey = pickPathKey(node);
      const pathEl = paths[pathKey];
      return {
        el: node,
        pathKey,
        pathT: closestPathT(pathEl, pt.x, pt.y),
        y: pt.y,
      };
    });
  };

  const ro = new ResizeObserver(() => layout());
  ro.observe(track);

  const classObs = new MutationObserver(() => layout());
  classObs.observe(track, { attributes: true, attributeFilter: ['class'] });

  requestAnimationFrame(layout);
  window.addEventListener('load', layout, { once: true });

  return {
    paths,
    glowPaths,
    mergeBurst,
    metrics,
    refresh: layout,
    destroy() {
      ro.disconnect();
      classObs.disconnect();
      svg.remove();
    },
    getPathLengths() {
      return {
        stem: paths.stem.getTotalLength(),
        binding: paths.binding.getTotalLength(),
        effector: paths.effector.getTotalLength(),
        tail: paths.tail.getTotalLength(),
      };
    },
    collectNodeMeta,
  };
}
