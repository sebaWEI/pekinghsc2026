import { useEffect, useRef } from 'react';
import type { WebNarrativeContent } from '../../content/webNarrative';
import { mountSynthesisTrackLines } from '../../narrative/synthesisTrackLines';
import { mountSynthesisTrackScroll } from '../../narrative/synthesisTrackScroll';

interface SynthesisMedia {
  imageUrl: string;
  imageAlt?: string;
  sceneBgUrl?: string;
}

interface MilestoneData {
  label?: string;
  title: string;
  body: string;
  media?: SynthesisMedia;
}

type LayoutSide = 'left' | 'right' | 'center';

function createMilestone(
  parent: HTMLElement,
  side: LayoutSide,
  kind: string,
  data: MilestoneData,
  options?: { hub?: 'left' | 'right'; postMerge?: boolean },
): HTMLElement {
  const hub = options?.hub;
  const layoutClass = hub ? `hub-${hub}` : side;
  const postMergeClass = options?.postMerge ? ' synthesis-milestone--post-merge' : '';

  const article = document.createElement('article');
  article.className = `synthesis-milestone synthesis-milestone--${layoutClass} synthesis-milestone--${kind}${postMergeClass}`;

  const dot = document.createElement('span');
  dot.className = 'synthesis-milestone__dot';
  dot.setAttribute('aria-hidden', 'true');
  article.appendChild(dot);

  const copy = document.createElement('div');
  copy.className = 'synthesis-milestone__copy';

  if (data.label) {
    const label = document.createElement('p');
    label.className = 'synthesis-milestone__label';
    label.textContent = data.label;
    copy.appendChild(label);
  }

  const title = document.createElement('h3');
  title.className = 'synthesis-milestone__title';
  title.textContent = data.title;
  copy.appendChild(title);

  const body = document.createElement('p');
  body.className = 'synthesis-milestone__text';
  body.textContent = data.body;
  copy.appendChild(body);

  article.appendChild(copy);

  if (data.media?.imageUrl) {
    const media = document.createElement('div');
    media.className = 'synthesis-milestone__media';
    media.setAttribute('aria-hidden', 'true');
    const img = document.createElement('img');
    img.src = data.media.imageUrl;
    img.alt = data.media.imageAlt ?? '';
    img.loading = 'lazy';
    img.decoding = 'async';
    media.appendChild(img);
    article.appendChild(media);
  }

  parent.appendChild(article);
  return article;
}

interface SynthesisSectionProps {
  synth: WebNarrativeContent['componentSynthesis'];
}

export function SynthesisSection({ synth }: SynthesisSectionProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = ref.current;
    if (!host) return;

    const sec = document.createElement('section');
    sec.className = 'story-section story-section--synthesis';

    const inner = document.createElement('div');
    inner.className = 'story-inner synthesis';
    sec.appendChild(inner);

    // Head
    const headBlock = document.createElement('div');
    headBlock.className = 'opening-bento__head';
    const label = document.createElement('p');
    label.className = 'section-label reveal';
    label.textContent = synth.label;
    headBlock.appendChild(label);
    const h2 = document.createElement('h2');
    h2.className = 'section-heading opening-bento__title reveal reveal--delay';
    h2.textContent = synth.title;
    headBlock.appendChild(h2);
    const subtitle = document.createElement('p');
    subtitle.className = 'opening-bento__subtitle reveal reveal--delay';
    subtitle.textContent = synth.subtitle;
    headBlock.appendChild(subtitle);
    inner.appendChild(headBlock);

    // Track
    const track = document.createElement('div');
    track.className = 'synthesis-track';
    inner.appendChild(track);

    // Origin
    createMilestone(track, 'center', 'origin', synth.origin, { hub: 'left' });

    // Fork
    const fork = document.createElement('div');
    fork.className = 'synthesis-track__fork';
    track.appendChild(fork);

    const bindingSteps = synth.bindingPath.steps;
    const effectorSteps = synth.effectorPath.steps;
    const forkLen = Math.max(bindingSteps.length, effectorSteps.length);

    for (let i = 0; i < forkLen; i++) {
      if (bindingSteps[i]) {
        createMilestone(fork, 'left', 'binding', {
          label: i === 0 ? synth.bindingPath.label : undefined,
          ...bindingSteps[i],
        });
      }
      if (effectorSteps[i]) {
        createMilestone(fork, 'right', 'effector', {
          label: i === 0 ? synth.effectorPath.label : undefined,
          ...effectorSteps[i],
        });
      }
    }

    // Merge
    createMilestone(track, 'center', 'merge', synth.merge, {
      hub: 'right',
      postMerge: true,
    });

    // Outcomes
    const tail = document.createElement('div');
    tail.className = 'synthesis-track__tail';
    track.appendChild(tail);

    for (const outcome of synth.outcomes) {
      const side: 'left' | 'right' =
        synth.outcomes.indexOf(outcome) % 2 === 0 ? 'left' : 'right';
      createMilestone(tail, side, 'outcome', outcome, {
        hub: side,
        postMerge: true,
      });
    }

    host.appendChild(sec);

    const lines = mountSynthesisTrackLines(track);
    const scroll = mountSynthesisTrackScroll(track, lines);

    return () => {
      scroll.destroy();
      lines.destroy();
      host.innerHTML = '';
    };
  }, [synth]);

  return <div ref={ref} />;
}
