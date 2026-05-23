import { useCallback, useEffect, useRef } from 'react';
import type { WebNarrativeContent } from '../../content/webNarrative';
import { LensSlide } from './LensSlide';
import { OpeningBento } from './OpeningBento';
import { HeroSection } from './HeroSection';
import { MechanismSection } from './MechanismSection';
import { SynthesisSection } from './SynthesisSection';
import { GallerySection } from './GallerySection';
import { InterludeSection } from './InterludeSection';
import { FooterSection } from './FooterSection';

interface NarrativeProps {
  content: WebNarrativeContent;
  /** Called when the hero narrative section intersects, for 3D RNA view sync */
  onHeroNarrativeIntersect?: (ratio: number) => void;
}

/**
 * Declarative narrative. Replaces the imperative mountNarrative() in
 * webNarrativeMount.ts. Produces identical DOM class names and hierarchy
 * so all existing CSS continues to work.
 */
export function Narrative({ content, onHeroNarrativeIntersect }: NarrativeProps) {
  const rootRef = useRef<HTMLElement>(null);

  // --- Hero observer: callback ref ensures observer is created immediately
  //     when the DOM element mounts, avoiding React StrictMode timing issues.
  const heroObserverRef = useRef<IntersectionObserver | null>(null);
  const latchedRef = useRef(0);

  const heroRefCallback = useCallback(
    (el: HTMLElement | null) => {
      // Cleanup previous observer
      heroObserverRef.current?.disconnect();
      heroObserverRef.current = null;

      if (!el) return;

      const thresholds = Array.from({ length: 41 }, (_, i) => i / 40);

      const obs = new IntersectionObserver(
        (entries) => {
          const e = entries[0];
          if (!e) return;
          const r = e.intersectionRatio;
          onHeroNarrativeIntersect?.(r);
          const t = Math.min(1, r / 0.5);
          const smooth = t * t * (3 - 2 * t);
          latchedRef.current = Math.max(latchedRef.current, smooth);
          el.style.setProperty(
            '--hero-narrative-opacity',
            latchedRef.current.toFixed(5),
          );
        },
        { threshold: thresholds },
      );

      obs.observe(el);
      heroObserverRef.current = obs;
    },
    [onHeroNarrativeIntersect],
  );

  // Cleanup hero observer on unmount
  useEffect(() => {
    return () => {
      heroObserverRef.current?.disconnect();
      heroObserverRef.current = null;
    };
  }, []);

  // --- IntersectionObserver for .reveal elements ---
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const targets = root.querySelectorAll<HTMLElement>('.reveal');
    if (targets.length === 0) return;

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
  }, [content]);

  // --- Scroll observer: canvas fade ---
  useEffect(() => {
    const canvas = document.getElementById('hero-canvas');
    if (!canvas) return;

    const onScroll = () => {
      const st = window.scrollY;
      const vh = window.innerHeight;
      const fade = 1 - Math.min(st / (vh * 0.8), 1);
      canvas.style.opacity = String(fade);
      canvas.classList.toggle('faded', fade < 0.05);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // --- Lenses: split first lens, then opening bento, then rest lenses ---
  const [firstLens, ...restLenses] = content.lenses;

  return (
    <main className="story" id="story" ref={rootRef}>
      {/* Spacer between hero canvas and narrative */}
      <div className="story-hero-spacer" aria-hidden="true" />

      {/* Lens 01 */}
      {firstLens && <LensSlide slide={firstLens} index={0} />}

      {/* Opening Bento */}
      <OpeningBento opening={content.opening} />

      {/* Hero: "Awakening the silent allele" + 3D RNA glyph */}
      <HeroSection ref={heroRefCallback} />

      {/* Mechanism animation */}
      <MechanismSection />

      {/* Component synthesis */}
      <SynthesisSection synth={content.componentSynthesis} />

      {/* Remaining lenses */}
      {restLenses.map((slide, i) => (
        <LensSlide key={i} slide={slide} index={i + 1} />
      ))}

      {/* Gallery (optional) */}
      <GallerySection gallery={content.gallery} />

      {/* Interlude */}
      <InterludeSection
        title={content.interlude.title}
        body={content.interlude.body}
      />

      {/* Footer */}
      <FooterSection
        tagline={content.footer.tagline}
        email={content.footer.email}
        lab={content.footer.lab}
      />
    </main>
  );
}
