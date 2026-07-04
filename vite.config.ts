import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { stringToSlug } from './src/utils/stringToSlug';

export default () => {
  const env = loadEnv('dev', process.cwd());
  const teamName = env.VITE_TEAM_NAME || 'PekingHSC';
  const teamYear = env.VITE_TEAM_YEAR || '2026';
  return defineConfig({
    base: `/${stringToSlug(teamName + teamYear)}/`,
    plugins: [react(), tailwindcss()],
  });
};
