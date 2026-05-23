import type { WebNarrativeContent } from '../../content/webNarrative';

interface GallerySectionProps {
  gallery: WebNarrativeContent['gallery'];
}

export function GallerySection({ gallery }: GallerySectionProps) {
  if (gallery.length === 0) return null;

  return (
    <section className="story-section">
      <div className="story-inner">
        <p className="section-label reveal">Gallery</p>
        <h2 className="section-heading reveal reveal--delay">Three snapshots</h2>
        <div className="gallery-grid reveal reveal--delay">
          {gallery.map((item, i) => (
            <article key={i} className="gallery-card">
              <div className="gallery-card__media">
                <img src={item.imageUrl} alt={item.imageAlt} loading="lazy" />
              </div>
              <h3 className="gallery-card__title">{item.title}</h3>
              <p className="gallery-card__body">{item.caption}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
