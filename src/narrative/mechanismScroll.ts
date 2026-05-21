function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

function smoothstep(t: number): number {
  const x = clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
}

function phaseProgress(progress: number, start: number, end: number): number {
  if (progress <= start) return 0;
  if (progress >= end) return 1;
  return smoothstep((progress - start) / (end - start));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

type Point = { x: number; y: number };

const DEG2RAD = Math.PI / 180;

/** Full scroll (0→1) — subtle mRNA drift before translation awakens. */
const MRNA_ROTATION_TURNS = 0.18;

/** mRNA spin after ribosomes bind (deg / second). */
const MRNA_AUTO_ROT_DEG_PER_SEC = 14;

/** Visible lower-arc span 40S covers (CCW along chain). */
const SCAN_40_ARC_DEG = 42;

/**
 * 40S 轨道半径 = mRNA 链半径 × 该系数（同圆心，只旋转不平移）。
 * meet40 即扫描终点在该轨道上的位置，不再单独平移。
 */
const SUB40_ORBIT_SCALE = 0.975;

const PHASE = {
  bind60Start: 0.05,
  bind60End: 0.2,
  convergeStart: 0.2,
  /** 40S/60S meet — translation latches here; mRNA switches to auto-spin. */
  convergeEnd: 0.82,
  /** 40S scan begins — later so step 2 (carry to start codon) has more scroll room. */
  bind40Start: 0.48,
  /** SINEUP descends back to rest — scroll-scrubbed after bind (~9% of travel). */
  sineReturnEnd: 0.91,
} as const;

function activeStep(progress: number): number {
  if (progress >= PHASE.convergeEnd) return 4;
  if (progress >= PHASE.bind40Start) return 3;
  if (progress >= PHASE.bind60End) return 2;
  if (progress >= PHASE.bind60Start) return 1;
  return 1;
}

function normCenter(el: HTMLElement, stage: HTMLElement): Point {
  const er = el.getBoundingClientRect();
  const sr = stage.getBoundingClientRect();
  if (sr.width <= 0 || sr.height <= 0) return { x: 0.5, y: 0.5 };
  return {
    x: clamp((er.left + er.width / 2 - sr.left) / sr.width, 0, 1),
    y: clamp((er.top + er.height / 2 - sr.top) / sr.height, 0, 1),
  };
}

function tipBindPoint(tip: Point): Point {
  return {
    x: tip.x + 0.01,
    y: tip.y,
  };
}

function mrnaRingMetrics(mrnaEl: HTMLElement): { radiusPx: number } {
  const h = mrnaEl.offsetHeight;
  const dy = (0.998 - 0.5) * h;
  return { radiusPx: Math.abs(dy) };
}

/** Ring center in viewport px — mrnaHost never rotates, so this stays stable. */
function mrnaHostCenterPx(mrnaHost: HTMLElement): Point {
  const r = mrnaHost.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

function pxToNorm(stage: HTMLElement, px: Point): Point {
  const sr = stage.getBoundingClientRect();
  return {
    x: (px.x - sr.left) / sr.width,
    y: (px.y - sr.top) / sr.height,
  };
}

/** 40S position on its orbit — rotation about mRNA center, no translation. */
function ring40PointNorm(
  stage: HTMLElement,
  mrnaHost: HTMLElement,
  mrnaEl: HTMLElement,
  worldRad: number,
): Point {
  const { radiusPx } = mrnaRingMetrics(mrnaEl);
  const orbitR = radiusPx * SUB40_ORBIT_SCALE;
  const centerPx = mrnaHostCenterPx(mrnaHost);
  return pxToNorm(stage, {
    x: centerPx.x + orbitR * Math.cos(worldRad),
    y: centerPx.y + orbitR * Math.sin(worldRad),
  });
}

type MeetPlan = {
  meet60: Point;
  /** Final 40S dock — end of orbit rotation at meetWorldRad. */
  meet40: Point;
  scanStartWorldRad: number;
  meetWorldRad: number;
};

function computeMeetPlan(
  stage: HTMLElement,
  mrnaHost: HTMLElement,
  mrnaEl: HTMLElement,
  bindX: number,
): MeetPlan {
  const { radiusPx } = mrnaRingMetrics(mrnaEl);
  const centerPx = mrnaHostCenterPx(mrnaHost);
  const sr = stage.getBoundingClientRect();
  const meetXpx = sr.left + bindX * sr.width;

  const dx = meetXpx - centerPx.x;
  const cosWr = clamp(dx / radiusPx, -1, 1);
  const sinWrAbs = Math.sqrt(Math.max(0, 1 - cosWr * cosWr));

  /** Lower visible arc — 60S chain intersection. */
  const meetWorldRad = Math.atan2(radiusPx * sinWrAbs, dx);
  const scanArcRad = SCAN_40_ARC_DEG * DEG2RAD;
  const scanStartWorldRad = meetWorldRad + scanArcRad;

  const meet60Px = {
    x: meetXpx,
    y: centerPx.y + radiusPx * Math.sin(meetWorldRad),
  };
  const meet60 = pxToNorm(stage, meet60Px);

  const meet40 = ring40PointNorm(stage, mrnaHost, mrnaEl, meetWorldRad);

  return { meet60, meet40, scanStartWorldRad, meetWorldRad };
}

/** CCW arc scan — rotation only, no post-bind translation. */
function scan40Pos(
  stage: HTMLElement,
  mrnaHost: HTMLElement,
  mrnaEl: HTMLElement,
  plan: MeetPlan,
  bind40T: number,
): Point {
  const { scanStartWorldRad, meetWorldRad } = plan;
  const worldRad = lerp(scanStartWorldRad, meetWorldRad, smoothstep(bind40T));
  return ring40PointNorm(stage, mrnaHost, mrnaEl, worldRad);
}

export interface MechanismScrollController {
  destroy(): void;
}

export function mountMechanismScroll(root: HTMLElement): MechanismScrollController {
  const scrollHost = root.querySelector<HTMLElement>('.mechanism-scroll');
  const stage = root.querySelector<HTMLElement>('.mechanism-stage');
  const mrnaHost = root.querySelector<HTMLElement>('.mechanism__mrna-host');
  const mrna = root.querySelector<HTMLElement>('.mechanism__mrna');
  const mrnaRotor = root.querySelector<HTMLElement>('.mechanism__mrna-rotor');
  const mrnaSineHost = root.querySelector<HTMLElement>('.mechanism__mrna-sine-host');
  const sineTip = root.querySelector<HTMLElement>('.mechanism__sine-tip');
  const sub40 = root.querySelector<HTMLElement>('.mechanism__sub40');
  const sub60 = root.querySelector<HTMLElement>('.mechanism__sub60');
  const narrative = root.querySelector<HTMLElement>('.mechanism__narrative');

  if (
    !scrollHost ||
    !stage ||
    !mrnaHost ||
    !mrna ||
    !mrnaRotor ||
    !mrnaSineHost ||
    !sineTip ||
    !sub40 ||
    !sub60
  ) {
    return { destroy: () => {} };
  }

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let meetPlanCacheKey = '';
  let meetPlan: MeetPlan = {
    meet60: { x: 0.5, y: 0.55 },
    meet40: { x: 0.5, y: 0.56 },
    scanStartWorldRad: 0,
    meetWorldRad: 0,
  };
  let frozenMeet40: Point | null = null;
  let bindBurstPlayed = false;
  let autoSpinActive = false;
  let bindMrnaRotDeg = 0;
  let bindTimeMs = 0;
  let lastScrollP = 0;

  type RestLayout = {
    baseTip: Point;
    sub60Start: Point;
    stageH: number;
  };

  let restLayout: RestLayout | null = null;
  let restLayoutKey = '';

  const remeasureRestLayout = (): void => {
    mrnaSineHost.style.setProperty('--mech-sine-lift', '0px');
    mrnaSineHost.classList.remove('is-carrying');

    const baseTip = normCenter(sineTip, stage);
    const key = `${stage.offsetWidth}x${stage.offsetHeight}x${mrnaSineHost.offsetWidth}`;
    restLayout = {
      baseTip,
      sub60Start: {
        x: clamp(baseTip.x + 0.22, 0.62, 0.92),
        y: clamp(baseTip.y + 0.06, 0.45, 0.94),
      },
      stageH: stage.offsetHeight,
    };
    restLayoutKey = key;
  };

  const getRestLayout = (): RestLayout => {
    const key = `${stage.offsetWidth}x${stage.offsetHeight}x${mrnaSineHost.offsetWidth}`;
    if (!restLayout || key !== restLayoutKey) remeasureRestLayout();
    return restLayout!;
  };

  const playBindBurst = (): void => {
    if (bindBurstPlayed) return;
    bindBurstPlayed = true;
    sub40.classList.add('is-glow-burst');
    sub60.classList.add('is-glow-burst');
    window.setTimeout(() => {
      sub40.classList.remove('is-glow-burst');
      sub60.classList.remove('is-glow-burst');
    }, 1400);
  };

  const syncTranslatingVisuals = (scrollP: number): void => {
    const active = scrollP >= PHASE.convergeEnd;
    root.classList.toggle('is-translating', active);
    stage.classList.toggle('is-translating', active);
    sub40.classList.toggle('is-glow', active);
    sub60.classList.toggle('is-glow', active);
    if (!active) {
      sub40.classList.remove('is-glow-burst');
      sub60.classList.remove('is-glow-burst');
      bindBurstPlayed = false;
    } else if (scrollP >= lastScrollP) {
      playBindBurst();
    }
  };

  const mrnaAutoRotDeg = (): number =>
    bindMrnaRotDeg + ((performance.now() - bindTimeMs) / 1000) * MRNA_AUTO_ROT_DEG_PER_SEC;

  const refreshMeetPlan = (bindX: number, keepFrozen40: boolean): void => {
    const key = `${stage.offsetWidth}x${stage.offsetHeight}x${mrna.offsetWidth}x${mrna.offsetHeight}x${bindX.toFixed(4)}`;
    if (key === meetPlanCacheKey) return;
    meetPlan = computeMeetPlan(stage, mrnaHost, mrna, bindX);
    meetPlanCacheKey = key;
    if (!keepFrozen40) frozenMeet40 = null;
  };

  const setPos = (el: HTMLElement, p: Point, opacity = 1): void => {
    const x = `${(p.x * 100).toFixed(2)}%`;
    const y = `${(p.y * 100).toFixed(2)}%`;
    const o = `${opacity}`;
    if (el.style.getPropertyValue('--mech-x') !== x) el.style.setProperty('--mech-x', x);
    if (el.style.getPropertyValue('--mech-y') !== y) el.style.setProperty('--mech-y', y);
    if (el.style.opacity !== o) el.style.opacity = o;
  };

  const applyFrame = (scrollProgress: number): void => {
    const scrollP = clamp(scrollProgress, 0, 1);
    const scrollingBack = scrollP < lastScrollP - 0.00005;

    const p = scrollP;

    const { baseTip, sub60Start, stageH } = getRestLayout();
    const bindTip = tipBindPoint(baseTip);

    const bind60T = phaseProgress(p, PHASE.bind60Start, PHASE.bind60End);
    const convergeT = phaseProgress(p, PHASE.convergeStart, PHASE.convergeEnd);
    const bind40T = phaseProgress(p, PHASE.bind40Start, PHASE.convergeEnd);
    const sineReturnT = phaseProgress(p, PHASE.convergeEnd, PHASE.sineReturnEnd);
    const is40Bound = convergeT >= 1;

    refreshMeetPlan(bindTip.x, is40Bound);
    syncTranslatingVisuals(scrollP);

    const scrollMrnaRotDeg = scrollP * 360 * MRNA_ROTATION_TURNS;
    const pastBind = scrollP >= PHASE.convergeEnd;
    const allowAutoSpin =
      !reducedMotion && pastBind && !scrollingBack && scrollP >= PHASE.sineReturnEnd;

    if (allowAutoSpin) {
      if (!autoSpinActive) {
        autoSpinActive = true;
        bindMrnaRotDeg = scrollMrnaRotDeg;
        bindTimeMs = performance.now();
      }
    } else {
      autoSpinActive = false;
    }

    const mrnaRotDeg = autoSpinActive ? mrnaAutoRotDeg() : scrollMrnaRotDeg;

    mrnaRotor.style.setProperty('--mech-mrna-rot', `${mrnaRotDeg.toFixed(2)}deg`);

    const { meet60 } = meetPlan;

    let liftPx = 0;
    let carrying = false;
    if (bind60T >= 1 && convergeT < 1) {
      const targetTipY = lerp(baseTip.y, meet60.y, convergeT);
      liftPx = (baseTip.y - targetTipY) * stageH;
      carrying = true;
    } else if (is40Bound && sineReturnT < 1) {
      const targetTipY = lerp(meet60.y, baseTip.y, sineReturnT);
      liftPx = (baseTip.y - targetTipY) * stageH;
      carrying = true;
    }

    mrnaSineHost.classList.toggle('is-carrying', carrying);
    const lift = `${liftPx.toFixed(1)}px`;
    if (mrnaSineHost.style.getPropertyValue('--mech-sine-lift') !== lift) {
      mrnaSineHost.style.setProperty('--mech-sine-lift', lift);
    }

    let sub60Pos: Point = { ...sub60Start };
    let sub60Opacity = 0;

    if (p >= PHASE.bind60Start * 0.75) {
      sub60Opacity = 1;
      if (bind60T < 1) {
        sub60Pos = {
          x: lerp(sub60Start.x, bindTip.x, bind60T),
          y: lerp(sub60Start.y, bindTip.y, bind60T),
        };
      } else if (convergeT < 1) {
        sub60Pos = {
          x: bindTip.x,
          y: lerp(bindTip.y, meet60.y, convergeT),
        };
      } else {
        sub60Pos = { ...meet60 };
      }
    }

    setPos(sub60, sub60Pos, sub60Opacity);

    if (is40Bound) {
      if (!frozenMeet40) {
        frozenMeet40 = { ...meetPlan.meet40 };
      }
      sub40.classList.add('is-bound');
      setPos(sub40, frozenMeet40, 1);
    } else {
      frozenMeet40 = null;
      sub40.classList.remove('is-bound');

      if (p >= PHASE.bind40Start) {
        setPos(sub40, scan40Pos(stage, mrnaHost, mrna, meetPlan, bind40T), 1);
      } else {
        setPos(sub40, { x: 0.5, y: 0.5 }, 0);
      }
    }

    if (narrative) {
      const step = activeStep(p);
      if (narrative.dataset.activeStep !== String(step)) {
        narrative.dataset.activeStep = String(step);
      }
    }

    stage.dataset.progress = scrollP.toFixed(3);
    stage.dataset.bound40 = is40Bound ? '1' : '0';
    stage.dataset.translating = pastBind ? '1' : '0';

    lastScrollP = scrollP;
  };

  const sectionProgress = (): number => {
    const rect = scrollHost.getBoundingClientRect();
    const travel = scrollHost.offsetHeight - window.innerHeight;
    if (travel <= 0) return 0;
    return clamp(-rect.top / travel, 0, 1);
  };

  let raf = 0;
  const tick = (): void => {
    applyFrame(sectionProgress());
    if (autoSpinActive && !reducedMotion) {
      raf = requestAnimationFrame(tick);
    } else {
      raf = 0;
    }
  };

  const schedule = (): void => {
    if (raf) return;
    raf = requestAnimationFrame(tick);
  };

  const onLayoutChange = (): void => {
    remeasureRestLayout();
    schedule();
  };

  const ro = new ResizeObserver(onLayoutChange);
  ro.observe(stage);
  ro.observe(scrollHost);
  ro.observe(mrnaHost);

  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule, { passive: true });

  if (reducedMotion) {
    remeasureRestLayout();
    applyFrame(1);
  } else {
    remeasureRestLayout();
    applyFrame(0);
    schedule();
  }

  return {
    destroy: () => {
      if (raf) cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      root.classList.remove('is-translating');
      stage.classList.remove('is-translating');
      sub40.classList.remove('is-glow', 'is-glow-burst');
      sub60.classList.remove('is-glow', 'is-glow-burst');
    },
  };
}
