/** Empty string = same-origin `public/` (build → `dist/` root). */
const DEFAULT_STATIC_BASE = '';
const DEFAULT_VIDEO_BASE = '';

const staticBase =
  (import.meta.env.VITE_IGEM_STATIC_BASE as string | undefined)?.trim() || DEFAULT_STATIC_BASE;
const videoBase =
  (import.meta.env.VITE_IGEM_VIDEO_BASE as string | undefined)?.trim() || DEFAULT_VIDEO_BASE;

function normalize(base: string): string {
  return base.endsWith('/') ? base.slice(0, -1) : base;
}

/** Same-origin URL for files under `public/` (respects Vite `base`, including `./`). */
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

/** Repo placeholders — keep on same origin so they work even when `.env` points CDN at unfinished uploads. */
function isBundledPlaceholderPath(path: string): boolean {
  return path.includes('placeholder-');
}

/**
 * Static images: `public/` (or CDN when configured).
 *
 * - **Dev**: always same-origin (`public/`), so local placeholders work even with `VITE_IGEM_STATIC_BASE` set.
 * - **Production**: CDN root is used only for non-placeholder paths; `placeholder-*` stays same-origin
 *   (must exist under `public/images` so Vite copies them to `dist/images`).
 */
export function igemStatic(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  const cdnRoot = normalize(staticBase);
  const shouldUseCdn =
    !import.meta.env.DEV && Boolean(cdnRoot) && !isBundledPlaceholderPath(p);

  if (shouldUseCdn) {
    return `${cdnRoot}${p}`;
  }
  return joinWithBase(p);
}

export function igemVideo(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${normalize(videoBase)}${p}`;
}
