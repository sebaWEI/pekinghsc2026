import type { WebLensSlide } from '../../content/webNarrative';

const LENS_LAYOUT_CLASSES = [
  'lens-layout--split-default',
  'lens-layout--split-reverse',
  'lens-layout--stack-focus',
] as const;

interface LensSlideProps {
  slide: WebLensSlide;
  index: number;
}

export function LensSlide({ slide, index }: LensSlideProps) {
  const layoutClass =
    LENS_LAYOUT_CLASSES[index % LENS_LAYOUT_CLASSES.length] ??
    'lens-layout--split-default';
  const isVideo = /\.(mp4|webm|ogg)(\?|#|$)/i.test(slide.imageUrl ?? '');

  return (
    <section className={`story-section story-section--lens`}>
      <div className={`lens-layout ${layoutClass}`}>
        <div className="lens-media">
          {slide.imageUrl &&
            (isVideo ? (
              <video
                className="lens-media__vid"
                src={slide.imageUrl}
                autoPlay
                loop
                muted
                playsInline
              />
            ) : (
              <img
                src={slide.imageUrl}
                alt={slide.imageAlt ?? ''}
                loading="lazy"
              />
            ))}
        </div>
        <div className="lens-text">
          <h2 className="section-heading reveal reveal--delay">
            {slide.subtitle}
          </h2>
          <p className="section-body reveal reveal--delay">{slide.body}</p>
        </div>
      </div>
    </section>
  );
}
