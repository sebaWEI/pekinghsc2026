import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { stringToSlug } from "../utils";
import "../styles/footer.css";

const FOOTER_SECTIONS = [
  {
    title: "Project",
    items: [
      { name: "Description", url: "/description" },
      { name: "Engineering", url: "/engineering" },
      { name: "Contribution", url: "/contribution" },
    ],
  },
  {
    title: "Wet Lab",
    items: [
      { name: "Experiments", url: "/experiments" },
      { name: "Notebook", url: "/notebook" },
      { name: "Safety", url: "/safety-and-security" },
    ],
  },
  {
    title: "Dry Lab",
    items: [
      { name: "Model", url: "/model" },
      { name: "Software", url: "/software" },
    ],
  },
];

const SINEUP_LABEL = "SINEUP";
const EDGE_STROKE = 5;
const GO_HERO_EVENT = "igem:go-hero";

function FooterSineupWordmark({ isHome }: { isHome: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const hoverLeaveTimerRef = useRef<number | undefined>(undefined);
  const [fontSize, setFontSize] = useState<number | null>(null);
  const [textBox, setTextBox] = useState({ width: 0, height: 0 });
  const [isHovered, setIsHovered] = useState(false);

  useLayoutEffect(() => {
    const container = containerRef.current;
    const measure = measureRef.current;
    if (!container || !measure) return;

    const fit = () => {
      const maxWidth = container.clientWidth;
      if (maxWidth <= 0) return;

      let lo = 8;
      let hi = 512;

      while (lo < hi - 0.5) {
        const mid = (lo + hi) / 2;
        measure.style.fontSize = `${mid}px`;
        if (measure.scrollWidth > maxWidth) {
          hi = mid;
        } else {
          lo = mid;
        }
      }

      setFontSize(lo);
      setTextBox({
        width: measure.scrollWidth,
        height: measure.offsetHeight,
      });
    };

    fit();

    const observer = new ResizeObserver(fit);
    observer.observe(container);

    void document.fonts.ready.then(fit);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    return () => {
      if (hoverLeaveTimerRef.current) {
        window.clearTimeout(hoverLeaveTimerRef.current);
      }
    };
  }, []);

  const handleHoverEnter = () => {
    if (hoverLeaveTimerRef.current) {
      window.clearTimeout(hoverLeaveTimerRef.current);
    }
    setIsHovered(true);
  };

  const handleHoverLeave = () => {
    hoverLeaveTimerRef.current = window.setTimeout(() => {
      setIsHovered(false);
    }, 140);
  };

  const handleGoHero = () => {
    window.dispatchEvent(new CustomEvent(GO_HERO_EVENT));
  };

  const measureStyle = fontSize ? { fontSize: `${fontSize}px` } : undefined;
  const strokePad = Math.max(EDGE_STROKE * 3, (fontSize ?? 0) * 0.08);
  const viewWidth = textBox.width + strokePad * 2;
  const viewHeight = textBox.height + strokePad * 2;
  const textX = strokePad + textBox.width / 2;
  const textY = strokePad + (fontSize ?? 0) * 0.88;
  const hitboxWidthPct = (textBox.width / viewWidth) * 100;
  const hitboxHeightPct = (textBox.height / viewHeight) * 100;

  const textProps = {
    x: textX,
    y: textY,
    textAnchor: "middle" as const,
    dominantBaseline: "alphabetic" as const,
    fontSize: fontSize ?? undefined,
    letterSpacing: "0.1em",
  };

  return (
    <div className="footer-sineup" ref={containerRef}>
      <span
        ref={measureRef}
        className="footer-sineup__measure"
        style={measureStyle}
        aria-hidden="true"
      >
        {SINEUP_LABEL}
      </span>

      {fontSize && textBox.width > 0 ? (
        <div
          className={`footer-sineup__stage${isHovered ? " is-active" : ""}`}
        >
          {isHome ? (
            <button
              type="button"
              className="footer-sineup__hitbox"
              style={{
                width: `${hitboxWidthPct}%`,
                height: `${hitboxHeightPct}%`,
              }}
              aria-label="Return to hero"
              onClick={handleGoHero}
              onMouseEnter={handleHoverEnter}
              onMouseLeave={handleHoverLeave}
            />
          ) : (
            <Link
              to="/"
              className="footer-sineup__hitbox"
              style={{
                width: `${hitboxWidthPct}%`,
                height: `${hitboxHeightPct}%`,
              }}
              aria-label="Return to hero"
              onClick={handleGoHero}
              onMouseEnter={handleHoverEnter}
              onMouseLeave={handleHoverLeave}
            />
          )}
          <svg
            className="footer-sineup__svg"
            viewBox={`0 0 ${viewWidth} ${viewHeight}`}
            aria-hidden="true"
          >
            <defs>
              <filter
                id="footer-sineup-glow-filter"
                x="-35%"
                y="-35%"
                width="170%"
                height="170%"
              >
                <feGaussianBlur stdDeviation="5.5" result="blur" />
                <feOffset in="blur" dx="0" dy="0" result="glow">
                  {isHovered ? (
                    <>
                      <animate
                        attributeName="dx"
                        values="0;2.2;0;-2.2;0"
                        dur="4.4s"
                        repeatCount="indefinite"
                      />
                      <animate
                        attributeName="dy"
                        values="0;-1.4;0;1.4;0"
                        dur="3.3s"
                        repeatCount="indefinite"
                      />
                    </>
                  ) : null}
                </feOffset>
                <feMerge>
                  <feMergeNode in="glow" />
                </feMerge>
              </filter>

              <linearGradient
                id="footer-sineup-fill-gradient"
                gradientUnits="userSpaceOnUse"
                x1={textX}
                y1={textY - fontSize}
                x2={textX}
                y2={textY}
              >
                <stop offset="0%" stopColor="#6d7580" />
                <stop offset="42%" stopColor="#445668" />
                <stop offset="100%" stopColor="#343a40" />
              </linearGradient>

              <linearGradient
                id="footer-sineup-edge-shine"
                gradientUnits="userSpaceOnUse"
                x1={strokePad}
                y1={textY}
                x2={strokePad + textBox.width}
                y2={textY}
              >
                <stop offset="0%" stopColor="#d4f8ff" stopOpacity="1">
                  {isHovered ? (
                    <animate
                      attributeName="stop-opacity"
                      values="0.82;1;0.82"
                      dur="2.8s"
                      repeatCount="indefinite"
                    />
                  ) : null}
                </stop>
                <stop offset="7%" stopColor="#40d4ff" stopOpacity="0.92" />
                <stop offset="20%" stopColor="#40d4ff" stopOpacity="0.62" />
                <stop offset="50%" stopColor="#40d4ff" stopOpacity="0.58" />
                <stop offset="80%" stopColor="#40d4ff" stopOpacity="0.62" />
                <stop offset="93%" stopColor="#40d4ff" stopOpacity="0.92" />
                <stop offset="100%" stopColor="#d4f8ff" stopOpacity="1">
                  {isHovered ? (
                    <animate
                      attributeName="stop-opacity"
                      values="0.82;1;0.82"
                      dur="2.8s"
                      repeatCount="indefinite"
                      begin="1.4s"
                    />
                  ) : null}
                </stop>
              </linearGradient>
            </defs>

            <text
              {...textProps}
              className="footer-sineup__glow"
              fill="none"
              stroke="#40d4ff"
              strokeWidth={EDGE_STROKE * 1.55}
            >
              {SINEUP_LABEL}
            </text>
            <text
              {...textProps}
              className="footer-sineup__stroke"
              fill="none"
              strokeWidth={EDGE_STROKE}
            >
              {SINEUP_LABEL}
            </text>
            <text
              {...textProps}
              className="footer-sineup__fill"
              fill="url(#footer-sineup-fill-gradient)"
              stroke="none"
            >
              {SINEUP_LABEL}
            </text>
          </svg>
        </div>
      ) : null}
    </div>
  );
}

export function Footer() {
  const location = useLocation();
  const navRevealRef = useRef<HTMLDivElement>(null);
  const sineupRevealRef = useRef<HTMLDivElement>(null);
  const teamYear = import.meta.env.VITE_TEAM_YEAR;
  const teamName = import.meta.env.VITE_TEAM_NAME;
  const teamSlug = stringToSlug(teamName);
  const currentPath =
    location.pathname.split(teamSlug).pop() || "/";
  const isHome = currentPath === "/" || currentPath === "";

  const [hovered, setHovered] = useState<{
    groupIdx: number;
    itemIdx: number;
  } | null>(null);

  useEffect(() => {
    const navReveal = navRevealRef.current;
    const sineupReveal = sineupRevealRef.current;
    if (!navReveal && !sineupReveal) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (prefersReducedMotion) {
      navReveal?.classList.add("is-visible");
      sineupReveal?.classList.add("is-visible");
      return;
    }

    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          revealObserver.unobserve(entry.target);
        });
      },
      { threshold: 0.2, rootMargin: "0px 0px -8% 0px" },
    );

    const sineupObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          sineupObserver.unobserve(entry.target);
        });
      },
      { threshold: 0.55, rootMargin: "0px 0px -2% 0px" },
    );

    if (navReveal) revealObserver.observe(navReveal);
    if (sineupReveal) sineupObserver.observe(sineupReveal);

    return () => {
      revealObserver.disconnect();
      sineupObserver.disconnect();
    };
  }, []);

  return (
    <footer
      className={`pt-5 pb-5 footer py-5 bg-dark text-white custom-footer${
        isHome ? " custom-footer--home" : " mt-5"
      }`}
    >
      <div className="container">
        <div className="row mb-4">
          <div className="col-lg-4 col-xs-12">
            <h4 className="mb-3">{teamName}</h4>
            <p
              className="text-muted"
              style={{ fontSize: "14px", lineHeight: "1.6" }}
            >
              Welcome to the wiki of team {teamName} ({teamYear}) from
              PekingHSC. We are dedicated to combining synthetic biology with
              medical engineering to solve real-world health challenges.
            </p>
          </div>

          <div
            ref={navRevealRef}
            className="col-lg-8 col-xs-12 footer-reveal footer-reveal--nav"
          >
            <div className="row">
              {FOOTER_SECTIONS.map((group, groupIdx) => (
                <div key={groupIdx} className="col-sm-4 col-xs-12 mb-3">
                  <h5
                    className="text-secondary mb-3"
                    style={{ fontSize: "13px", letterSpacing: "1px" }}
                  >
                    {group.title}
                  </h5>
                  <ul className="list-unstyled">
                    {group.items.map((item, itemIdx) => {
                      const isCurrentGroupHovered =
                        hovered?.groupIdx === groupIdx;
                      const isSelfHovered =
                        isCurrentGroupHovered && hovered?.itemIdx === itemIdx;

                      const itemClass = `footer-link-item ${
                        isCurrentGroupHovered && !isSelfHovered
                          ? "is-dimmed"
                          : ""
                      }`;

                      return (
                        <li
                          key={itemIdx}
                          className={itemClass}
                          style={{ marginBottom: "10px", fontSize: "14px" }}
                          onMouseEnter={() =>
                            setHovered({ groupIdx, itemIdx })
                          }
                          onMouseLeave={() => setHovered(null)}
                        >
                          <Link
                            to={item.url}
                            className="text-white-50 text-decoration-none"
                            style={{ transition: "color 0.2s" }}
                          >
                            {item.name}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>

        <hr className="border-secondary" />

        <div
          ref={sineupRevealRef}
          className="footer-reveal footer-reveal--sineup"
        >
          <FooterSineupWordmark isHome={isHome} />
        </div>

        {/* The following MUST be on every page: license information and link to the repository on gitlab.igem.org */}
        <div className="row mt-3">
          <div className="col text-center" style={{ fontSize: "12px", color: "#888" }}>
            <p className="mb-1">
              © {teamYear} - Content on this site is licensed under a{" "}
              <a
                className="text-white-50"
                href="https://creativecommons.org/licenses/by/4.0/"
                rel="license"
                target="_blank"
              >
                Creative Commons Attribution 4.0 International license
              </a>
              .
            </p>
            <p className="mb-0">
              The repository used to create this website is available at{" "}
              <a
                href={`https://gitlab.igem.org/${teamYear}/${teamSlug}`}
                className="text-white-50"
                target="_blank"
                rel="noopener noreferrer"
              >
                gitlab.igem.org/{teamYear}/{teamSlug}
              </a>
              .
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
