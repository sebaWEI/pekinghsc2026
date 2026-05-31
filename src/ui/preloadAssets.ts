/**
 * Preload images by URL — returns a Promise that resolves when all images
 * are loaded (or at least one fails — we don't want a single broken image
 * to hold up the entire page).
 *
 * Usage:
 *   await preloadImages(['./images/mRNA.svg', './images/60s.svg', …]);
 */

/**
 * Preload images with optional progress callback.
 * Each image has an 8-second timeout — if the browser hangs on a URL,
 * we move on rather than blocking the page forever.
 *
 * @param urls — image URLs to load
 * @param onProgress — called each time one image finishes, with (loaded, total)
 */
export async function preloadImages(
  urls: string[],
  onProgress?: (loaded: number, total: number) => void,
): Promise<void> {
  const unique = [...new Set(urls.filter(Boolean))];
  if (unique.length === 0) return;

  let loadedCount = 0;
  const total = unique.length;

  const promises = unique.map(
    (url) =>
      new Promise<void>((resolve) => {
        let settled = false;
        const finish = (): void => {
          if (settled) return;
          settled = true;
          loadedCount++;
          onProgress?.(loadedCount, total);
          resolve();
        };

        const img = new Image();
        try {
          const u = new URL(url, window.location.href);
          if (u.origin !== window.location.origin) {
            img.crossOrigin = 'anonymous';
          }
        } catch {
          // relative URL — fine
        }
        img.onload = finish;
        img.onerror = () => {
          console.warn(`[preloadAssets] failed to load: ${url}`);
          finish();
        };
        img.src = url;

        // Safety timeout: if the browser hangs on this URL, move on after 8s
        setTimeout(finish, 8_000);
      }),
  );

  await Promise.all(promises);
}

/**
 * Extract all image URLs from WebNarrativeContent (or any object tree).
 * Recursively walks objects/arrays looking for string values that look
 * like image paths (end with .png, .jpg, .jpeg, .gif, .webp, .svg, .avif).
 *
 * Also handles arrays of strings so we can pass additional URLs.
 */
export function extractImageUrls(data: Record<string, unknown>): string[] {
  const results = new Set<string>();

  const IMAGE_EXT_RE = /\.(png|jpg|jpeg|gif|webp|svg|avif|glb)(\?|#|$)/i;

  function walk(value: unknown): void {
    if (typeof value === 'string') {
      if (IMAGE_EXT_RE.test(value)) {
        results.add(value);
      }
    } else if (Array.isArray(value)) {
      for (const item of value) walk(item);
    } else if (value && typeof value === 'object') {
      for (const v of Object.values(value as Record<string, unknown>)) {
        walk(v);
      }
    }
  }

  walk(data);
  return [...results];
}
