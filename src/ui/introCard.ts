import type { PartMeta } from '../types/rna';

export interface IntroCardController {
  show(meta: PartMeta): void;
  hide(): void;
  setOnBack(handler: () => void): void;
}

export function createIntroCard(parent: HTMLElement): IntroCardController {
  const root = document.createElement('div');
  root.className = 'rna-intro-card';
  root.innerHTML = `
    <div class="rna-intro-card__panel">
      <header class="rna-intro-card__masthead" aria-hidden="false">
        <div class="rna-intro-card__headline-line1"></div>
        <div class="rna-intro-card__headline-line2"></div>
      </header>
      <div class="rna-intro-card__blocks">
        <article class="rna-intro-card__block">
          <h3 class="rna-intro-card__block-label"></h3>
          <p class="rna-intro-card__block-body"></p>
        </article>
        <article class="rna-intro-card__block">
          <h3 class="rna-intro-card__block-label"></h3>
          <p class="rna-intro-card__block-body"></p>
        </article>
        <article class="rna-intro-card__block">
          <h3 class="rna-intro-card__block-label"></h3>
          <p class="rna-intro-card__block-body"></p>
        </article>
      </div>
      <button type="button" class="rna-intro-card__back">
        <span class="rna-intro-card__back-text">Back</span>
      </button>
    </div>
  `;
  parent.appendChild(root);

  const line1El = root.querySelector('.rna-intro-card__headline-line1') as HTMLDivElement;
  const line2El = root.querySelector('.rna-intro-card__headline-line2') as HTMLDivElement;
  const blockEls = root.querySelectorAll('.rna-intro-card__block');
  const backBtn = root.querySelector('.rna-intro-card__back') as HTMLButtonElement;

  let onBack: () => void = () => {};
  backBtn.addEventListener('click', () => onBack());

  return {
    show(meta) {
      line1El.textContent = meta.headlineNumber;
      line2El.textContent = meta.headlineSub;
      for (let i = 0; i < 3; i++) {
        const block = blockEls[i];
        if (!block) continue;
        const b = meta.dataBlocks[i]!;
        const label = block.querySelector('.rna-intro-card__block-label') as HTMLHeadingElement;
        const body = block.querySelector('.rna-intro-card__block-body') as HTMLParagraphElement;
        label.textContent = b.label;
        body.textContent = b.body;
      }
      root.classList.add('show');
    },
    hide() {
      root.classList.remove('show');
    },
    setOnBack(handler) {
      onBack = handler;
    },
  };
}
