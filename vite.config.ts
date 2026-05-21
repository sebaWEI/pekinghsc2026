import { defineConfig } from 'vite';

/** Default `./` suits iGEM / static hosting in subfolders. Override with `VITE_BASE=/` for domain-root deploy. */
export default defineConfig({
  base: process.env.VITE_BASE ?? './',
});
