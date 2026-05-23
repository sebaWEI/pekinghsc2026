import { useEffect, useRef } from 'react';
import { mountMechanismScroll } from '../../narrative/mechanismScroll';

/**
 * Imperative mechanism section.
 *
 * Renders a container and mounts the scroll-driven mechanism animation
 * (mRNA rotation + ribosomal subunit delivery) directly into it.
 */
export function MechanismSection() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = ref.current;
    if (!host) return;

    const section = document.createElement('section');
    section.className = 'story-section story-section--mechanism';

    const scrollHost = document.createElement('div');
    scrollHost.className = 'mechanism-scroll';
    section.appendChild(scrollHost);

    const stage = document.createElement('div');
    stage.className = 'mechanism-stage';
    scrollHost.appendChild(stage);

    // Helper
    const img = (
      className: string,
      src: string,
      alt: string,
      decorative = false,
    ): HTMLImageElement => {
      const node = document.createElement('img');
      node.className = className;
      node.src = src;
      node.alt = alt;
      node.decoding = 'async';
      node.loading = 'eager';
      if (decorative) node.setAttribute('aria-hidden', 'true');
      return node;
    };

    // UTR labels
    const utrLabels = document.createElement('aside');
    utrLabels.className = 'mechanism__utr-labels';
    utrLabels.setAttribute('aria-label', 'mRNA region labels');
    stage.appendChild(utrLabels);

    const utr5 = document.createElement('p');
    utr5.className = 'mechanism__utr mechanism__utr--5';
    utr5.textContent = 'mRNA 5′UTR';
    utrLabels.appendChild(utr5);

    const utr3 = document.createElement('p');
    utr3.className = 'mechanism__utr mechanism__utr--3';
    utr3.append('mRNA 3′UTR with ');
    const sineMark = document.createElement('span');
    sineMark.className = 'mechanism__sineup-mark';
    sineMark.textContent = 'SINEUP';
    utr3.appendChild(sineMark);
    utrLabels.appendChild(utr3);

    // Narrative steps
    const NARRATIVE_STEPS = [
      'SINEUP recruits the 60S ribosomal subunit',
      'Carries it to the start codon',
      'Pairs with the 40S ribosomal subunit',
      'Accelerates translation initiation',
    ] as const;

    const narrative = document.createElement('div');
    narrative.className = 'mechanism__narrative';
    narrative.dataset.activeStep = '1';
    stage.appendChild(narrative);

    for (let i = 0; i < NARRATIVE_STEPS.length; i++) {
      const step = i + 1;
      const row = document.createElement('div');
      row.className = 'mechanism__step-row';
      row.dataset.step = String(step);
      const num = document.createElement('span');
      num.className = 'mechanism__step-num';
      num.textContent = String(step);
      row.appendChild(num);
      const text = document.createElement('p');
      text.className = 'mechanism__step-text';
      text.textContent = NARRATIVE_STEPS[i];
      row.appendChild(text);
      narrative.appendChild(row);
    }

    // mRNA
    const mrnaHost = document.createElement('div');
    mrnaHost.className = 'mechanism__mrna-host';
    const mrnaRotor = document.createElement('div');
    mrnaRotor.className = 'mechanism__mrna-rotor';
    mrnaRotor.appendChild(img('mechanism__mrna', './images/mRNA.svg', '', true));
    const mrnaCenter = document.createElement('span');
    mrnaCenter.className = 'mechanism__mrna-center';
    mrnaCenter.setAttribute('aria-hidden', 'true');
    mrnaRotor.appendChild(mrnaCenter);
    const mrnaDock = document.createElement('span');
    mrnaDock.className = 'mechanism__mrna-dock';
    mrnaDock.setAttribute('aria-hidden', 'true');
    mrnaRotor.appendChild(mrnaDock);
    mrnaHost.appendChild(mrnaRotor);
    stage.appendChild(mrnaHost);

    // SINE mRNA
    const mrnaSineHost = document.createElement('div');
    mrnaSineHost.className = 'mechanism__mrna-sine-host';
    mrnaSineHost.appendChild(
      img('mechanism__mrna-sine', './images/mRNA_sine2.svg', '', true),
    );
    const sineTip = document.createElement('span');
    sineTip.className = 'mechanism__sine-tip';
    sineTip.setAttribute('aria-hidden', 'true');
    mrnaSineHost.appendChild(sineTip);
    stage.appendChild(mrnaSineHost);

    // Ribosomal subunits
    stage.appendChild(
      img('mechanism__sub60', './images/60s.svg', '60S ribosomal subunit'),
    );
    stage.appendChild(
      img('mechanism__sub40', './images/40s.svg', '40S ribosomal subunit'),
    );

    host.appendChild(section);

    const scroll = mountMechanismScroll(section);

    return () => {
      scroll.destroy();
      host.innerHTML = '';
    };
  }, []);

  return <div ref={ref} />;
}
