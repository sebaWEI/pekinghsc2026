#!/usr/bin/env node
/**
 * Copy latin-subset .woff2 files into uploads/fonts/ for iGEM Uploads.
 * These files are NOT bundled into dist/ — upload them to static.igem.wiki.
 *
 * Usage: npm run prepare:fonts
 */

import { copyFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'uploads', 'fonts');

const FONT_FILES = [
  {
    pkg: '@fontsource/dm-serif-display',
    file: 'dm-serif-display-latin-400-normal.woff2',
  },
  {
    pkg: '@fontsource/dm-serif-display',
    file: 'dm-serif-display-latin-400-italic.woff2',
  },
  { pkg: '@fontsource/inter', file: 'inter-latin-400-normal.woff2' },
  { pkg: '@fontsource/inter', file: 'inter-latin-500-normal.woff2' },
  { pkg: '@fontsource/inter', file: 'inter-latin-600-normal.woff2' },
  { pkg: '@fontsource/inter', file: 'inter-latin-700-normal.woff2' },
  { pkg: '@fontsource/orbitron', file: 'orbitron-latin-600-normal.woff2' },
  { pkg: '@fontsource/orbitron', file: 'orbitron-latin-700-normal.woff2' },
  { pkg: '@fontsource/orbitron', file: 'orbitron-latin-800-normal.woff2' },
  { pkg: '@fontsource/outfit', file: 'outfit-latin-400-normal.woff2' },
  { pkg: '@fontsource/outfit', file: 'outfit-latin-500-normal.woff2' },
  { pkg: '@fontsource/outfit', file: 'outfit-latin-600-normal.woff2' },
  { pkg: '@fontsource/outfit', file: 'outfit-latin-700-normal.woff2' },
];

mkdirSync(outDir, { recursive: true });

let copied = 0;
for (const { pkg, file } of FONT_FILES) {
  const src = join(root, 'node_modules', pkg, 'files', file);
  if (!existsSync(src)) {
    console.error(`Missing ${src} — run npm install first.`);
    process.exit(1);
  }
  const dest = join(outDir, file);
  copyFileSync(src, dest);
  copied++;
  console.log(`  ${file}`);
}

console.log(`\nCopied ${copied} files → uploads/fonts/`);
console.log(
  'Upload to iGEM Uploads so they are served from:\n' +
    '  https://static.igem.wiki/teams/2026/pekinghsc/assets/fonts/',
);
