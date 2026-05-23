interface FooterSectionProps {
  tagline: string;
  email: string;
  lab: string;
}

export function FooterSection({ tagline, email, lab }: FooterSectionProps) {
  return (
    <footer className="story-section story-section--footer">
      <div className="footer-inner reveal">
        <p className="footer-tagline">{tagline}</p>
        <a className="footer-link" href={`mailto:${email}`}>
          {email}
        </a>
        <p className="footer-note">{lab}</p>
      </div>
    </footer>
  );
}
