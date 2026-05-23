import { forwardRef } from 'react';

export const HeroSection = forwardRef<HTMLElement>(function HeroSection(_props, ref) {
  return (
    <section className="story-section story-section--hero" ref={ref}>
      {/* 3D RNA host — populated imperatively by narrativeHeroRnaView */}
      <div className="hero-sineup-host" />
      <div className="hero-layout">
        <div className="hero-text">
          <p className="hero-eyebrow" />
          <h1 className="hero-title">Awakening the silent allele</h1>
          <p className="hero-lead">
            We chose a different path: Don&rsquo;t replace the lost genes.
            Empower what remains
          </p>
          <p className="hero-body">
            By leveraging the mechanism of haploinsufficiency, our platform
            targets the single remaining healthy allele. Instead of delivering
            heavy genetic cargo, we deliver ultra-compact synthetic
            SINEUPs&mdash;molecular switches that precisely upregulate the
            translation of endogenous mRNAs to restore physiological balance.
          </p>
        </div>
        <div className="hero-glyph">
          {/* 3D RNA glyph host — populated imperatively by narrativeHeroRnaView */}
          <div className="hero-glyph__three-host" />
        </div>
      </div>
    </section>
  );
});
