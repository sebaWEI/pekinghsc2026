/** CDN base for static assets on static.igem.wiki (see .env.example). */
const DEFAULT_STATIC_BASE = '';
const DEFAULT_VIDEO_BASE = '';

const staticBase =
  (import.meta.env.VITE_IGEM_STATIC_BASE as string | undefined)?.trim() || DEFAULT_STATIC_BASE;
const videoBase =
  (import.meta.env.VITE_IGEM_VIDEO_BASE as string | undefined)?.trim() || DEFAULT_VIDEO_BASE;

function normalize(base: string): string {
  return base.endsWith('/') ? base.slice(0, -1) : base;
}

/** Same-origin fallback when CDN is not configured (local dev without .env). */
function joinWithBase(pathFromRoot: string): string {
  const p = pathFromRoot.startsWith('/') ? pathFromRoot.slice(1) : pathFromRoot;
  const raw = (import.meta.env.BASE_URL || '/').trim() || '/';
  if (raw === '/' || raw === '') {
    return `/${p}`;
  }
  if (raw === './' || raw === '.') {
    return `./${p}`;
  }
  const prefix = raw.endsWith('/') ? raw : `${raw}/`;
  return `${prefix}${p}`.replace(/\/{3,}/g, '/');
}

/**
 * Static asset URL — images, models, fonts on iGEM CDN when `VITE_IGEM_STATIC_BASE` is set.
 */
export function igemStatic(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  const cdnRoot = normalize(staticBase);

  if (cdnRoot) {
    return `${cdnRoot}${p}`;
  }
  return joinWithBase(p);
}

export function igemVideo(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${normalize(videoBase)}${p}`;
}
