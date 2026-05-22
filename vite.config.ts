import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

/** Default `./` suits iGEM / static hosting in subfolders. Override with `VITE_BASE=/` for domain-root deploy. */
export default defineConfig({
  base: process.env.VITE_BASE ?? './',
  plugins: [tailwindcss()],
});
