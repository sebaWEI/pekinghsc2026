import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const dir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: dir,
  publicDir: path.join(dir, '../public'),
  server: {
    host: '127.0.0.1',
    port: 5179,
    strictPort: true,
  },
});
