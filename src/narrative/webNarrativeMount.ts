import type { WebNarrativeContent } from '../content/webNarrative';
import { mountSynthesisTrackLines } from './synthesisTrackLines';
import { mountSynthesisTrackScroll } from './synthesisTrackScroll';
import { mountMechanismScroll } from './mechanismScroll';

export interface NarrativeApi {
  refresh(): void;
  destroy(): void;
}

export interface MountNarrativeOptions {
  beforeDestroy?: () => void;
}

/* ── Tiny helpers ── */

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  parent: HTMLElement,
): HTMLElementTagNameMap[K] {
  const n = document.createElement(tag);
  n.className = className;
  parent.appendChild(n);
  return n;
}

/* ── Section reveal via IntersectionObserver ── */

function observeReveals(root: HTMLElement): () => void {
  const targets = root.querySelectorAll<HTMLElement>('.reveal');
  if (targets.length === 0) return () => {};

  const obs = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.classList.add('is-visible');
          obs.unobserve(e.target);
        }
      }
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.05 },
  );

  for (const t of Array.from(targets)) obs.observe(t);
  return () => obs.disconnect();
}

/* ── Hero 叙事文案：进入视口约一半时即完全不透明，之后保持（用于通篇阅读） ── */

function observeHeroNarrativeReveal(
  heroSec: HTMLElement,
  onIntersect?: (ratio: number) => void,
): () => void {
  const thresholds = Array.from({ length: 41 }, (_, i) => i / 40);
  let latched = 0;
  const obs = new IntersectionObserver(
    (entries) => {
      const e = entries[0];
      if (!e) return;
      const r = e.intersectionRatio;
      onIntersect?.(r);
      const t = Math.min(1, r / 0.5);
      const smooth = t * t * (3 - 2 * t);
      latched = Math.max(latched, smooth);
      heroSec.style.setProperty('--hero-narrative-opacity', latched.toFixed(5));
    },
    { threshold: thresholds },
  );
  obs.observe(heroSec);
  return () => obs.disconnect();
}

/* ── Scroll：主 canvas 随下滑淡化（与 Design 长卷衔接） ── */

function observeScroll(canvas: HTMLElement): () => void {
  const onScroll = () => {
    const st = window.scrollY;
    const vh = window.innerHeight;

    const fade = 1 - Math.min(st / (vh * 0.8), 1);
    canvas.style.opacity = String(fade);
    if (fade < 0.05) {
      canvas.classList.add('faded');
    } else {
      canvas.classList.remove('faded');
    }
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  return () => window.removeEventListener('scroll', onScroll);
}

/* ── Mount ── */

function mountLensSlide(
  parent: HTMLElement,
  slide: WebNarrativeContent['lenses'][number],
  li: number,
  lensLayoutClass: readonly string[],
): void {
  const sec = el('section', 'story-section story-section--lens', parent);
  const layout = el('div', `lens-layout ${lensLayoutClass[li] ?? 'lens-layout--split-default'}`, sec);

  const media = el('div', 'lens-media', layout);
  const isVid = /\.(mp4|webm|ogg)(\?|#|$)/i.test(slide.imageUrl ?? '');
  if (slide.imageUrl) {
    if (isVid) {
      const v = document.createElement('video');
      v.className = 'lens-media__vid';
      v.src = slide.imageUrl;
      v.autoplay = true;
      v.loop = true;
      v.muted = true;
      v.playsInline = true;
      media.appendChild(v);
    } else {
      const img = document.createElement('img');
      img.src = slide.imageUrl;
      img.alt = slide.imageAlt ?? '';
      img.loading = 'lazy';
      media.appendChild(img);
    }
  }

  const text = el('div', 'lens-text', layout);
  const h2 = el('h2', 'section-heading reveal reveal--delay', text);
  h2.textContent = slide.subtitle;
  const p = el('p', 'section-body reveal reveal--delay', text);
  p.textContent = slide.body;
}

type SynthesisMilestoneData = {
  label?: string;
  title: string;
  body: string;
  media?: WebNarrativeContent['componentSynthesis']['origin']['media'];
};

function mountSynthesisMilestone(
  parent: HTMLElement,
  side: 'left' | 'right' | 'center',
  kind: string,
  data: SynthesisMilestoneData,
  options?: { withMedia?: boolean; hub?: 'left' | 'right'; postMerge?: boolean },
): HTMLElement {
  const hub = options?.hub;
  const layoutClass = hub ? `hub-${hub}` : side;
  const hasMedia = Boolean(data.media?.imageUrl);
  const withMedia = options?.withMedia ?? (hasMedia || (hub ? true : side !== 'center'));
  const node = el(
    'article',
    `synthesis-milestone synthesis-milestone--${layoutClass} synthesis-milestone--${kind}${options?.postMerge ? ' synthesis-milestone--post-merge' : ''}`,
    parent,
  );
  el('span', 'synthesis-milestone__dot', node).setAttribute('aria-hidden', 'true');
  const copy = el('div', 'synthesis-milestone__copy', node);
  if (data.label) {
    el('p', 'synthesis-milestone__label', copy).textContent = data.label;
  }
  el('h3', 'synthesis-milestone__title', copy).textContent = data.title;
  el('p', 'synthesis-milestone__text', copy).textContent = data.body;
  if (withMedia && data.media?.imageUrl) {
    const media = el('div', 'synthesis-milestone__media', node);
    media.setAttribute('aria-hidden', 'true');
    const img = document.createElement('img');
    img.src = data.media.imageUrl;
    img.alt = data.media.imageAlt ?? '';
    img.loading = 'lazy';
    img.decoding = 'async';
    media.appendChild(img);
  }
  return node;
}

function collectSynthesisMediaUrls(synth: WebNarrativeContent['componentSynthesis']): string[] {
  const urls = new Set<string>();
  const add = (media?: { imageUrl: string; sceneBgUrl?: string }) => {
    if (!media?.imageUrl) return;
    urls.add(media.imageUrl);
  };
  add(synth.origin.media);
  for (const step of synth.bindingPath.steps) add(step.media);
  for (const step of synth.effectorPath.steps) add(step.media);
  add(synth.merge.media);
  for (const outcome of synth.outcomes) add(outcome.media);
  return [...urls];
}

function mountMechanismSection(parent: HTMLElement): { destroy: () => void } {
  const sec = el('section', 'story-section story-section--mechanism', parent);
  const scrollHost = el('div', 'mechanism-scroll', sec);
  const stage = el('div', 'mechanism-stage', scrollHost);

  const img = (className: string, src: string, alt: string, decorative = false): HTMLImageElement => {
    const node = document.createElement('img');
    node.className = className;
    node.src = src;
    node.alt = alt;
    node.decoding = 'async';
    node.loading = 'eager';
    if (decorative) node.setAttribute('aria-hidden', 'true');
    return node;
  };

  const utrLabels = el('aside', 'mechanism__utr-labels', stage);
  utrLabels.setAttribute('aria-label', 'mRNA region labels');
  el('p', 'mechanism__utr mechanism__utr--5', utrLabels).textContent = "mRNA 5′UTR";

  const utr3 = el('p', 'mechanism__utr mechanism__utr--3', utrLabels);
  utr3.append('mRNA 3′UTR with ');
  const sineMark = document.createElement('span');
  sineMark.className = 'mechanism__sineup-mark';
  sineMark.textContent = 'SINEUP';
  utr3.appendChild(sineMark);

  const NARRATIVE_STEPS = [
    'SINEUP recruits the 60S ribosomal subunit',
    'Carries it to the start codon',
    'Pairs with the 40S ribosomal subunit',
    'Accelerates translation initiation',
  ] as const;

  const narrative = el('div', 'mechanism__narrative', stage);
  narrative.dataset.activeStep = '1';
  for (let i = 0; i < NARRATIVE_STEPS.length; i++) {
    const step = i + 1;
    const row = el('div', 'mechanism__step-row', narrative);
    row.dataset.step = String(step);
    const num = el('span', 'mechanism__step-num', row);
    num.textContent = String(step);
    el('p', 'mechanism__step-text', row).textContent = NARRATIVE_STEPS[i];
  }

  const mrnaHost = el('div', 'mechanism__mrna-host', stage);
  const mrnaRotor = el('div', 'mechanism__mrna-rotor', mrnaHost);
  mrnaRotor.appendChild(img('mechanism__mrna', '/images/mRNA.svg', '', true));
  el('span', 'mechanism__mrna-center', mrnaRotor).setAttribute('aria-hidden', 'true');
  el('span', 'mechanism__mrna-dock', mrnaRotor).setAttribute('aria-hidden', 'true');

  const mrnaSineHost = el('div', 'mechanism__mrna-sine-host', stage);
  mrnaSineHost.appendChild(img('mechanism__mrna-sine', '/images/mRNA_sine2.svg', '', true));
  el('span', 'mechanism__sine-tip', mrnaSineHost).setAttribute('aria-hidden', 'true');
  stage.appendChild(img('mechanism__sub60', '/images/60s.svg', '60S ribosomal subunit'));
  stage.appendChild(img('mechanism__sub40', '/images/40s.svg', '40S ribosomal subunit'));

  const scroll = mountMechanismScroll(sec);
  return { destroy: () => scroll.destroy() };
}

function mountComponentSynthesis(
  parent: HTMLElement,
  synth: WebNarrativeContent['componentSynthesis'],
): { destroy: () => void; refresh: () => void } {
  for (const url of collectSynthesisMediaUrls(synth)) {
    ensureImagePreloadLink(url);
    void preloadImage(url);
  }

  const sec = el('section', 'story-section story-section--synthesis', parent);
  const inner = el('div', 'story-inner synthesis', sec);
  const headBlock = el('div', 'opening-bento__head', inner);
  el('p', 'section-label reveal', headBlock).textContent = synth.label;
  el('h2', 'section-heading opening-bento__title reveal reveal--delay', headBlock).textContent = synth.title;
  el('p', 'opening-bento__subtitle reveal reveal--delay', headBlock).textContent = synth.subtitle;

  const track = el('div', 'synthesis-track', inner);

  mountSynthesisMilestone(track, 'center', 'origin', synth.origin, { hub: 'left' });

  const fork = el('div', 'synthesis-track__fork', track);

  const bindingSteps = synth.bindingPath.steps;
  const effectorSteps = synth.effectorPath.steps;
  const forkLen = Math.max(bindingSteps.length, effectorSteps.length);

  for (let i = 0; i < forkLen; i++) {
    if (bindingSteps[i]) {
      mountSynthesisMilestone(fork, 'left', 'binding', {
        label: i === 0 ? synth.bindingPath.label : undefined,
        ...bindingSteps[i],
      });
    }
    if (effectorSteps[i]) {
      mountSynthesisMilestone(fork, 'right', 'effector', {
        label: i === 0 ? synth.effectorPath.label : undefined,
        ...effectorSteps[i],
      });
    }
  }

  mountSynthesisMilestone(track, 'center', 'merge', synth.merge, { hub: 'right', postMerge: true });

  const tail = el('div', 'synthesis-track__tail', track);
  for (const outcome of synth.outcomes) {
    const side = synth.outcomes.indexOf(outcome) % 2 === 0 ? 'left' : 'right';
    mountSynthesisMilestone(tail, side, 'outcome', outcome, { hub: side, postMerge: true });
  }

  const lines = mountSynthesisTrackLines(track);
  const scroll = mountSynthesisTrackScroll(track, lines);
  return {
    destroy: () => {
      scroll.destroy();
      lines.destroy();
    },
    refresh: () => {
      lines.refresh();
      scroll.refresh();
    },
  };
}

function ensureImagePreloadLink(url: string): void {
  const selector = `link[rel="preload"][as="image"][href="${CSS.escape(url)}"]`;
  if (document.head.querySelector(selector)) return;
  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'image';
  link.href = url;
  document.head.appendChild(link);
}

function preloadImage(url: string): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image();
    const finish = () => {
      void img.decode?.().then(() => resolve()).catch(() => resolve());
    };
    img.onload = finish;
    img.onerror = () => resolve();
    img.decoding = 'async';
    img.src = url;
    if (img.complete) finish();
  });
}

function mountOpeningBento(parent: HTMLElement, op: WebNarrativeContent['opening']): void {
  for (const card of op.cards) {
    ensureImagePreloadLink(card.hoverBgUrl);
    ensureImagePreloadLink(card.imageUrl);
    void preloadImage(card.hoverBgUrl);
    void preloadImage(card.imageUrl);
  }

  const openingSec = el('section', 'story-section story-section--opening-bento', parent);
  const openingInner = el('div', 'story-inner story-inner--opening-bento', openingSec);
  const headBlock = el('div', 'opening-bento__head', openingInner);
  el('p', 'section-label reveal', headBlock).textContent = op.eyebrow;
  const openingTitle = el('h2', 'section-heading opening-bento__title reveal reveal--delay', headBlock);
  openingTitle.textContent = op.title;
  el('p', 'opening-bento__subtitle reveal reveal--delay', headBlock).textContent = op.subtitle;

  const CARD_ROMAN = ['Ⅰ', 'Ⅱ', 'Ⅲ'] as const;

  const bento = el('div', 'hero-bento gallery-grid reveal reveal--delay', openingInner);
  let cardOrdinal = 0;
  for (const card of op.cards) {
    const article = el('article', 'gallery-card hero-bento-card', bento);
    article.tabIndex = 0;
    const panel = el('div', 'hero-bento-card__panel', article);
    const romanEl = el('span', 'hero-bento-card__roman-index', panel);
    romanEl.textContent =
      CARD_ROMAN[cardOrdinal] ?? `${cardOrdinal + 1}`;
    romanEl.setAttribute('aria-hidden', 'true');
    cardOrdinal += 1;
    const panelBack = el('div', 'hero-bento-card__panel-back', panel);
    const hoverScene = el('div', 'hero-bento-card__hover-scene', panelBack);
    const hoverBg = document.createElement('img');
    hoverBg.className = 'hero-bento-card__hover-bg';
    hoverBg.src = card.hoverBgUrl;
    hoverBg.alt = '';
    hoverBg.decoding = 'async';
    hoverBg.setAttribute('aria-hidden', 'true');
    hoverScene.appendChild(hoverBg);
    void hoverBg.decode?.().catch(() => {});
    const vis = el('div', 'hero-bento-card__visual', panel);
    const img = document.createElement('img');
    img.className = 'hero-bento-card__img';
    img.src = card.imageUrl;
    img.alt = card.imageAlt ?? '';
    img.loading = 'lazy';
    vis.appendChild(img);
    el('p', 'hero-bento-card__tag', panel).textContent = card.tag;
    const caption = el('div', 'hero-bento-card__caption', article);
    el('h3', 'hero-bento-card__title', caption).textContent = card.title;
    el('p', 'hero-bento-card__body', caption).textContent = card.body;
  }
}

export function mountNarrative(
  content: WebNarrativeContent,
  parent: HTMLElement,
  opts?: MountNarrativeOptions,
): NarrativeApi {
  const canvas = document.getElementById('hero-canvas')!;

  // ---- 与 body 同色的空白页：与 3D 主页错开，再进入叙述长卷 ----
  el('div', 'story-hero-spacer', parent).setAttribute('aria-hidden', 'true');

  /** 三节交替版式，避免「三张完全同款」的视觉疲劳 */
  const lensLayoutClass = ['lens-layout--split-default', 'lens-layout--split-reverse', 'lens-layout--stack-focus'] as const;

  // ---- 第一屏：From coordinates to candidates（原 lens 01）----
  const [firstLens, ...restLenses] = content.lenses;
  if (firstLens) {
    mountLensSlide(parent, firstLens, 0, lensLayoutClass);
  }

  // ---- 第二屏：The Triple Dead End — Bento ----
  mountOpeningBento(parent, content.opening);

  // ---- 第三屏：Awakening the silent allele — 双栏（文案 + RNA 相框）----
  const heroSec = el('section', 'story-section story-section--hero', parent);
  el('div', 'hero-sineup-host', heroSec);
  const heroLayout = el('div', 'hero-layout', heroSec);
  const heroText = el('div', 'hero-text', heroLayout);
  el('p', 'hero-eyebrow', heroText).textContent = '';
  el('h1', 'hero-title', heroText).textContent = 'Awakening the silent allele';
  el('p', 'hero-lead', heroText).textContent =
    'We chose a different path: Don’t replace the lost genes. Empower what remains';
  el('p', 'hero-body', heroText).textContent =
    'By leveraging the mechanism of haploinsufficiency, our platform targets the single remaining healthy allele. Instead of delivering heavy genetic cargo, we deliver ultra-compact synthetic SINEUPs—molecular switches that precisely upregulate the translation of endogenous mRNAs to restore physiological balance.';
  const glyphFrame = el('div', 'hero-glyph', heroLayout);
  el('div', 'hero-glyph__three-host', glyphFrame);

  // ---- 机制动画：mRNA 旋转 + SINEUP 递送核糖体 ----
  const mechanism = mountMechanismSection(parent);

  // ---- Component synthesis: Two paths, one element ----
  const synthesis = mountComponentSynthesis(parent, content.componentSynthesis);

  // ---- 后续 lens 屏（02、03）----
  restLenses.forEach((slide, i) => {
    mountLensSlide(parent, slide, i + 1, lensLayoutClass);
  });

  // ---- Gallery（可选；opening Bento 已承担三组信息）----
  if (content.gallery.length > 0) {
    const galSec = el('section', 'story-section', parent);
    const galInner = el('div', 'story-inner', galSec);
    el('p', 'section-label reveal', galInner).textContent = 'Gallery';
    el('h2', 'section-heading reveal reveal--delay', galInner).textContent =
      'Three snapshots';
    const galGrid = el('div', 'gallery-grid reveal reveal--delay', galInner);
    for (const item of content.gallery) {
      const card = el('article', 'gallery-card', galGrid);
      const mediaE = el('div', 'gallery-card__media', card);
      const img = document.createElement('img');
      img.src = item.imageUrl;
      img.alt = item.imageAlt;
      img.loading = 'lazy';
      mediaE.appendChild(img);
      el('h3', 'gallery-card__title', card).textContent = item.title;
      el('p', 'gallery-card__body', card).textContent = item.caption;
    }
  }

  // ---- Interlude ----
  const intSec = el('section', 'story-section story-section--interlude', parent);
  const intInner = el('div', 'interlude-inner reveal', intSec);
  el('h2', 'interlude-heading', intInner).textContent = content.interlude.title;
  el('p', 'interlude-body', intInner).textContent = content.interlude.body;

  // ---- Footer ----
  const footSec = el('footer', 'story-section story-section--footer', parent);
  const footInner = el('div', 'footer-inner reveal', footSec);
  el('p', 'footer-tagline', footInner).textContent = content.footer.tagline;
  const mail = el('a', 'footer-link', footInner) as HTMLAnchorElement;
  mail.href = `mailto:${content.footer.email}`;
  mail.textContent = content.footer.email;
  el('p', 'footer-note', footInner).textContent = content.footer.lab;

  // ---- Observers ----
  const revealCleanup = observeReveals(parent);
  const heroRevealCleanup = observeHeroNarrativeReveal(heroSec);
  const scrollCleanup = observeScroll(canvas);

  // ---- Refresh on resize ----
  const onResize = () => {
    synthesis.refresh();
  };
  window.addEventListener('resize', onResize, { passive: true });

  return {
    refresh() {
      onResize();
    },
    destroy() {
      opts?.beforeDestroy?.();
      window.removeEventListener('resize', onResize);
      synthesis.destroy();
      mechanism.destroy();
      revealCleanup();
      heroRevealCleanup();
      scrollCleanup();
      parent.innerHTML = '';
    },
  };
}
