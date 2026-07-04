import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const outPath = path.join(projectRoot, 'public/exports/hero-rna-poster.png');
const exportUrl = 'http://127.0.0.1:5179/export-hero-rna.html';
const viteBin = path.join(projectRoot, 'node_modules/vite/bin/vite.js');
const exportViteConfig = path.join(projectRoot, 'scripts/export-vite.config.ts');

function waitForServer(vite, url, timeoutMs = 60_000) {
  const started = Date.now();
  let viteLog = '';

  vite.stdout.on('data', (chunk) => {
    viteLog += chunk.toString();
  });
  vite.stderr.on('data', (chunk) => {
    viteLog += chunk.toString();
  });

  return new Promise((resolve, reject) => {
    const tick = async () => {
      if (viteLog.includes('Local:')) {
        try {
          const res = await fetch(url);
          if (res.ok) {
            resolve(undefined);
            return;
          }
        } catch {
          /* retry */
        }
      }

      if (Date.now() - started > timeoutMs) {
        reject(new Error(`Timed out waiting for ${url}\n${viteLog.trim()}`));
        return;
      }

      setTimeout(tick, 250);
    };

    tick();
  });
}

function startExportServer() {
  return spawn(process.execPath, [viteBin, '--config', exportViteConfig], {
    cwd: projectRoot,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: process.env,
  });
}

async function main() {
  const vite = startExportServer();

  try {
    await waitForServer(vite, exportUrl);

    const { chromium } = await import('playwright');
    const browser = await chromium.launch({
      args: ['--ignore-gpu-blocklist', '--enable-webgl'],
    });
    const page = await browser.newPage();

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.error('[page]', msg.text());
      }
    });

    await page.goto(exportUrl, { waitUntil: 'networkidle', timeout: 120_000 });
    await page.waitForFunction(
      () =>
        document.body.dataset.exportReady === '1' ||
        document.body.dataset.exportError,
      undefined,
      { timeout: 120_000 },
    );

    const exportError = await page.evaluate(() => document.body.dataset.exportError);
    if (exportError) {
      throw new Error(exportError);
    }

    const dataUrl = await page.evaluate(() => window.__HERO_RNA_PNG__);
    if (!dataUrl?.startsWith('data:image/png;base64,')) {
      throw new Error('Export page did not produce a PNG data URL');
    }

    const base64 = dataUrl.replace(/^data:image\/png;base64,/, '');
    await mkdir(path.dirname(outPath), { recursive: true });
    await writeFile(outPath, Buffer.from(base64, 'base64'));

    await browser.close();
    console.log(`Wrote ${outPath}`);
  } finally {
    vite.kill('SIGTERM');
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
