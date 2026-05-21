export type EmitterPhase = 'off' | 'idle' | 'dead';

export interface EmitterPoint {
  x: number;
  y: number;
}

interface Particle {
  x: number;
  y: number;
  ox: number;
  oy: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  hue: number;
  maxDist: number;
}

export interface SynthesisParticleController {
  canvas: HTMLCanvasElement;
  setPhase(phase: EmitterPhase): void;
  getPhase(): EmitterPhase;
  setEmitters(points: EmitterPoint[]): void;
  /** 在当前发射点触发大火脉冲，0.5s 内渐弱为小火 */
  pulseBurst(large?: boolean): void;
  tick(dt: number): void;
  resize(width: number, height: number): void;
  clear(): void;
  destroy(): void;
}

const ACCENT = { r: 64, g: 212, b: 255 };
const ACCENT_SOFT = { r: 38, g: 136, b: 200 };
const BURST_MS = 500;

/** 0 = 小火，1 = 大火；heat 连续插值 */
function spawnParticle(pool: Particle[], x: number, y: number, heat: number): void {
  const h = Math.min(1, Math.max(0, heat));
  const angle = Math.random() * Math.PI * 2;
  const speed =
    (0.38 + Math.random() * 1.35) * (1 - h) + (1.05 + Math.random() * 2.6) * h;
  const spread = 3 + h * 8;
  const px = x + (Math.random() - 0.5) * spread;
  const py = y + (Math.random() - 0.5) * spread;
  pool.push({
    x: px,
    y: py,
    ox: px,
    oy: py,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    life: 0,
    maxLife:
      (0.28 + Math.random() * 0.26) * (1 - h * 0.25) + (0.22 + Math.random() * 0.18) * h * 0.4,
    size: lerp(1.1 + Math.random() * 1.8, 2.4 + Math.random() * 4, h),
    hue: Math.random(),
    maxDist: (22 + Math.random() * 12) * (1 - h * 0.15) + (38 + Math.random() * 16) * h,
  });
}

function burstFalloff(elapsedMs: number, durationMs: number): number {
  const t = Math.min(1, Math.max(0, elapsedMs / durationMs));
  // 缓出：大火缓慢收束为小火
  return (1 - t) ** 2.4;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function mountSynthesisTrackParticles(track: HTMLElement): SynthesisParticleController {
  const canvas = document.createElement('canvas');
  canvas.className = 'synthesis-track__particles';
  canvas.setAttribute('aria-hidden', 'true');
  track.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return {
      canvas,
      setPhase: () => {},
      getPhase: () => 'off' as EmitterPhase,
      setEmitters: () => {},
      pulseBurst: () => {},
      tick: () => {},
      resize: () => {},
      clear: () => {},
      destroy: () => canvas.remove(),
    };
  }

  let phase: EmitterPhase = 'off';
  let emitters: EmitterPoint[] = [];
  let emitAccumulator = 0;
  let burstStart = 0;
  let burstActive = false;
  let burstLarge = false;
  const particles: Particle[] = [];

  const getBurstIntensity = (): number => {
    if (!burstActive) return 0;
    const elapsed = performance.now() - burstStart;
    if (elapsed >= BURST_MS) {
      burstActive = false;
      return 0;
    }
    return burstFalloff(elapsed, BURST_MS);
  };

  const resize = (width: number, height: number): void => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.floor(width * dpr));
    canvas.height = Math.max(1, Math.floor(height * dpr));
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  const pulseBurst = (large = true): void => {
    burstLarge = large;
    burstStart = performance.now();
    burstActive = true;
    for (const e of emitters) {
      const count = large ? 130 : 50;
      for (let i = 0; i < count; i++) spawnParticle(particles, e.x, e.y, 1);
    }
  };

  const setPhase = (next: EmitterPhase): void => {
    phase = next;
    if (next === 'dead' || next === 'off') {
      particles.length = 0;
      burstActive = false;
    }
  };

  const setEmitters = (points: EmitterPoint[]): void => {
    emitters = points;
  };

  const clear = (): void => {
    const w = track.getBoundingClientRect().width;
    const h = track.getBoundingClientRect().height;
    ctx.clearRect(0, 0, w, h);
  };

  const drawCores = (burstI: number): void => {
    if (phase !== 'idle' || emitters.length === 0) return;
    const peak = burstLarge ? 1 : 0.65;
    const b = burstI * peak;
    for (const e of emitters) {
      const coreR = lerp(9, 24, b);
      const coreAlpha = lerp(0.58, 0.88, b);
      const core = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, coreR);
      core.addColorStop(0, `rgba(255,255,255,${coreAlpha})`);
      core.addColorStop(0.35, `rgba(${ACCENT.r},${ACCENT.g},${ACCENT.b},${coreAlpha * 0.62})`);
      core.addColorStop(1, 'rgba(64,212,255,0)');
      ctx.fillStyle = core;
      ctx.beginPath();
      ctx.arc(e.x, e.y, coreR, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  const draw = (burstI: number): void => {
    const w = track.getBoundingClientRect().width;
    const h = track.getBoundingClientRect().height;
    ctx.clearRect(0, 0, w, h);

    for (const p of particles) {
      const t = p.life / p.maxLife;
      const alpha = (1 - t) ** 2.4;
      if (alpha <= 0.01) continue;

      const mix = 0.35 + p.hue * 0.65;
      const r = Math.round(ACCENT_SOFT.r + (ACCENT.r - ACCENT_SOFT.r) * mix);
      const g = Math.round(ACCENT_SOFT.g + (ACCENT.g - ACCENT_SOFT.g) * mix);
      const b = Math.round(ACCENT_SOFT.b + (ACCENT.b - ACCENT_SOFT.b) * mix);

      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2.2);
      grad.addColorStop(0, `rgba(255,255,255,${alpha * 0.88})`);
      grad.addColorStop(0.35, `rgba(${r},${g},${b},${alpha * 0.72})`);
      grad.addColorStop(1, `rgba(${r},${g},${b},0)`);

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (1.1 - t * 0.35), 0, Math.PI * 2);
      ctx.fill();
    }

    drawCores(burstI);
  };

  const tick = (dt: number): void => {
    if (phase === 'off' || phase === 'dead') {
      clear();
      return;
    }

    if (emitters.length === 0) {
      clear();
      return;
    }

    const burstI = getBurstIntensity();
    const peak = burstLarge ? 1 : 0.65;
    const b = burstI * peak;

    // 小火基线更剧烈；大火在 b 上叠加，0.5s 内 b→0 平滑过渡
    const idleRate = 52;
    const peakRate = 280;
    const spawnRate = lerp(idleRate, peakRate, b);
    const spawnHeat = lerp(0.42, 1, b);

    emitAccumulator += spawnRate * dt;
    while (emitAccumulator >= 1) {
      for (const e of emitters) {
        spawnParticle(particles, e.x, e.y, spawnHeat);
      }
      emitAccumulator -= 1;
    }

    const buoyancy = lerp(-48, -36, b);
    const drag = Math.pow(0.966, dt * 60);
    const swirlAmp = lerp(22, 14, b);

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i]!;
      p.life += dt;

      const swirl = Math.sin(p.y * 0.065 + p.life * 6.5 + p.hue * 12) * swirlAmp;
      p.vy += buoyancy * dt;
      p.vx += swirl * dt;
      p.vx *= drag;
      p.vy *= drag;

      p.x += p.vx * dt * 60;
      p.y += p.vy * dt * 60;

      const dx = p.x - p.ox;
      const dy = p.y - p.oy;
      if (p.life >= p.maxLife || dx * dx + dy * dy >= p.maxDist * p.maxDist) {
        particles.splice(i, 1);
      }
    }

    if (particles.length > 550) {
      particles.splice(0, particles.length - 550);
    }

    draw(burstI);
  };

  return {
    canvas,
    setPhase,
    getPhase: () => phase,
    setEmitters,
    pulseBurst,
    tick,
    resize,
    clear,
    destroy: () => canvas.remove(),
  };
}
