import type { WebOpeningBlock } from '../../content/webNarrative';

const CARD_ROMAN = ['Ⅰ', 'Ⅱ', 'Ⅲ'] as const;

interface OpeningBentoProps {
  opening: WebOpeningBlock;
}

export function OpeningBento({ opening }: OpeningBentoProps) {
  return (
    <section className="story-section story-section--opening-bento">
      <div className="story-inner story-inner--opening-bento">
        <div className="opening-bento__head">
          {opening.eyebrow && (
            <p className="section-label reveal">{opening.eyebrow}</p>
          )}
          <h2 className="section-heading opening-bento__title reveal reveal--delay">
            {opening.title}
          </h2>
          <p className="opening-bento__subtitle reveal reveal--delay">
            {opening.subtitle}
          </p>
        </div>

        <div className="hero-bento gallery-grid reveal reveal--delay reveal--stagger">
          {opening.cards.map((card, i) => (
            <article key={i} className="gallery-card hero-bento-card" tabIndex={0}>
              <div className="hero-bento-card__panel">
                <span className="hero-bento-card__roman-index" aria-hidden="true">
                  {CARD_ROMAN[i] ?? `${i + 1}`}
                </span>
                <div className="hero-bento-card__panel-back">
                  <div className="hero-bento-card__hover-scene">
                    <img
                      className="hero-bento-card__hover-bg"
                      src={card.hoverBgUrl}
                      alt=""
                      decoding="async"
                      aria-hidden="true"
                    />
                  </div>
                </div>
                <div className="hero-bento-card__visual">
                  <img
                    className="hero-bento-card__img"
                    src={card.imageUrl}
                    alt={card.imageAlt ?? ''}
                    loading="lazy"
                  />
                </div>
                <p className="hero-bento-card__tag">{card.tag}</p>
              </div>
              <div className="hero-bento-card__caption">
                <h3 className="hero-bento-card__title">{card.title}</h3>
                <p className="hero-bento-card__body">{card.body}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
