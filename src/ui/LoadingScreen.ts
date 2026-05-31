/**
 * AAA-game-style loading screen controller.
 *
 * Cinematic letterbox bars, animated particle background,
 * smooth percentage counter, rotating flavor tips, and
 * a shimmering progress bar.
 *
 * Reusable — import on any page:
 *   const loader = createLoadingScreen();
 *   loader.show();
 *   // … load …
 *   loader.hide();
 */

import '../styles/loading-screen.css';

export interface LoadingScreenController {
  show(): void;
  hide(): void;
  setProgress(current: number, total: number): void;
  setLabel(text: string): void;
  destroy(): void;
}

// ── Cycling flavor tips ──
const LOADING_TIPS: string[] = [
  'Folding SINE/B2 secondary structures…',
  'Docking ribosomal subunits in silico…',
  'Optimising binding domain affinity…',
  'Running molecular dynamics simulations…',
  'Aligning CRISPR compatibility matrices…',
  'Calibrating translational upregulation…',
  'Mining motif libraries for SINEUP targets…',
  'Iterating inverse-folding pipelines…',
  'Validating co-folding confidence scores…',
  'Assembling the ChromDel expression cassette…',
  'Indexing microdeletion gene networks…',
  'Simulating spatial pharmacokinetics…',
];

const TIP_INTERVAL_MS = 3_800;

export function createLoadingScreen(
  root?: HTMLElement,
): LoadingScreenController {
  const parent = root ?? document.body;

  // ── DOM construction ──
  const overlay = document.createElement('div');
  overlay.className = 'loading-screen';

  overlay.innerHTML = `
    <canvas class="loading-screen__canvas" id="loading-canvas"></canvas>
    <div class="loading-screen__noise"></div>
    <div class="loading-screen__bar-top" id="loading-bar-top"></div>
    <div class="loading-screen__bar-bottom" id="loading-bar-bottom"></div>
    <div class="loading-screen__content">
      <div class="loading-screen__ring-container">
        <div class="loading-screen__ring-glow"></div>
        <div class="loading-screen__ring-outer"></div>
        <div class="loading-screen__ring-spinner" id="ring-spinner-1"></div>
        <div class="loading-screen__ring-spinner loading-screen__ring-spinner--inner" id="ring-spinner-2"></div>
        <div class="loading-screen__ring-spinner loading-screen__ring-spinner--pulse" id="ring-spinner-3"></div>
      </div>
      <div class="loading-screen__brand">
        <p class="loading-screen__title">SINEB2–ChromDel</p>
        <p class="loading-screen__subtitle">Peking HSC 2026</p>
      </div>
      <div class="loading-screen__progress-track">
        <div class="loading-screen__progress-fill" id="loading-progress-fill"></div>
      </div>
      <div class="loading-screen__status" id="loading-status">Initialising…</div>
    </div>
    <div class="loading-screen__meta">iGEM 2026 · PKU</div>
  `;

  let destroyed = false;
  let hidden = true;
  let animFrameId = 0;
  let tipTimer: ReturnType<typeof setTimeout> | null = null;
  // ── DOM refs ──
  const canvas = overlay.querySelector('#loading-canvas') as HTMLCanvasElement;
  const barTop = overlay.querySelector('#loading-bar-top') as HTMLDivElement;
  const barBottom = overlay.querySelector('#loading-bar-bottom') as HTMLDivElement;
  const progressFill = overlay.querySelector('#loading-progress-fill') as HTMLDivElement;
  const statusEl = overlay.querySelector('#loading-status') as HTMLDivElement;

  // ── Particle system ──
  let particles: Array<{
    x: number; y: number;
    vx: number; vy: number;
    size: number;
    alpha: number;
    life: number;
    maxLife: number;
  }> = [];
  let ctx: CanvasRenderingContext2D | null = null;
  let canvasW = 0;
  let canvasH = 0;

  function resizeCanvas(): void {
    if (!canvas || !ctx) return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio, 2);
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvasW = w;
    canvasH = h;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.scale(dpr, dpr);
  }

  function initCanvas(): void {
    ctx = canvas.getContext('2d');
    if (!ctx) return;
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Spawn initial particles
    const count = Math.min(80, Math.floor((window.innerWidth * window.innerHeight) / 15000));
    particles = [];
    for (let i = 0; i < count; i++) {
      particles.push(createParticle());
    }
  }

  function createParticle() {
    return {
      x: Math.random() * canvasW,
      y: Math.random() * canvasH,
      vx: (Math.random() - 0.5) * 0.25,
      vy: (Math.random() - 0.5) * 0.25 - 0.08,
      size: 0.8 + Math.random() * 2.2,
      alpha: 0.15 + Math.random() * 0.3,
      life: 0,
      maxLife: 400 + Math.random() * 800,
    };
  }

  function drawParticles(): void {
    if (!ctx || !canvasW) return;
    ctx.clearRect(0, 0, canvasW, canvasH);

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life++;

      // Fade in/out
      const fadeIn = Math.min(1, p.life / 60);
      const fadeOut = Math.max(0, Math.min(1, (p.maxLife - p.life) / 60));
      const alpha = p.alpha * fadeIn * fadeOut * 0.6;

      // Wrap around
      if (p.x < -10) p.x = canvasW + 10;
      if (p.x > canvasW + 10) p.x = -10;
      if (p.y < -10) p.y = canvasH + 10;
      if (p.y > canvasH + 10) p.y = -10;

      // Reset expired
      if (p.life >= p.maxLife) {
        Object.assign(p, createParticle());
        p.x = Math.random() * canvasW;
        p.y = canvasH + 5;
      }

      // Draw glow dot
      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3);
      grad.addColorStop(0, `rgba(160, 210, 255, ${alpha})`);
      grad.addColorStop(0.25, `rgba(100, 170, 240, ${alpha * 0.5})`);
      grad.addColorStop(1, 'rgba(60, 140, 220, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function startParticleLoop(): void {
    function frame(): void {
      if (destroyed) return;
      drawParticles();
      animFrameId = requestAnimationFrame(frame);
    }
    animFrameId = requestAnimationFrame(frame);
  }

  // ── Tip cycling ──
  let tipIndex = 0;

  function startTipCycle(): void {
    tipIndex = Math.floor(Math.random() * LOADING_TIPS.length);
    cycleTip();
  }

  function cycleTip(): void {
    if (destroyed) return;
    if (!statusEl) return;

    // Fade out
    statusEl.classList.add('loading-screen__status--fading');
    setTimeout(() => {
      if (destroyed) return;
      statusEl.textContent = LOADING_TIPS[tipIndex];
      tipIndex = (tipIndex + 1) % LOADING_TIPS.length;
      statusEl.classList.remove('loading-screen__status--fading');
    }, 350);

    tipTimer = setTimeout(cycleTip, TIP_INTERVAL_MS);
  }

  // ── Cinematic bar reveal ──
  function showBars(): void {
    requestAnimationFrame(() => {
      barTop.style.height = '48px';
      barBottom.style.height = '48px';
    });
  }

  function hideBars(): void {
    barTop.style.height = '0';
    barBottom.style.height = '0';
  }

  // ── Controller ──
  const controller: LoadingScreenController = {
    show() {
      if (destroyed) return;
      if (hidden) {
        parent.appendChild(overlay);
        hidden = false;
        initCanvas();
        startParticleLoop();
        startTipCycle();
        // Trigger bars after mount
        requestAnimationFrame(() => showBars());
      }
      overlay.classList.remove('loading-screen--hidden');
    },

    hide() {
      if (destroyed) return;
      hideBars();
      overlay.classList.add('loading-screen--hidden');

      // Stop background systems
      cancelAnimationFrame(animFrameId);
      if (tipTimer) clearTimeout(tipTimer);
      window.removeEventListener('resize', resizeCanvas);

      setTimeout(() => {
        if (destroyed) return;
        if (overlay.parentNode) {
          overlay.parentNode.removeChild(overlay);
        }
        hidden = true;
      }, 900);
    },

    setProgress(current: number, total: number) {
      if (destroyed) return;
      const pct = total > 0 ? Math.min(100, (current / total) * 100) : 0;
      if (progressFill) {
        progressFill.style.width = `${pct}%`;
      }
    },

    setLabel(text: string) {
      if (destroyed) return;
      if (statusEl) {
        statusEl.textContent = text;
        statusEl.classList.remove('loading-screen__status--fading');
        if (tipTimer) clearTimeout(tipTimer);
      }
    },

    destroy() {
      destroyed = true;
      cancelAnimationFrame(animFrameId);
      if (tipTimer) clearTimeout(tipTimer);
      window.removeEventListener('resize', resizeCanvas);
      if (overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
      }
    },
  };

  return controller;
}
