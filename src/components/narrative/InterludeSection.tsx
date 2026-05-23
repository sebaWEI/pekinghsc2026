interface InterludeSectionProps {
  title: string;
  body: string;
}

export function InterludeSection({ title, body }: InterludeSectionProps) {
  return (
    <section className="story-section story-section--interlude">
      <div className="interlude-inner reveal">
        <h2 className="interlude-heading">{title}</h2>
        <p className="interlude-body">{body}</p>
      </div>
    </section>
  );
}
