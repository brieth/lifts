import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Served from https://<user>.github.io/lifts/ on GitHub Pages,
// so the base path must match the repo name.
export default defineConfig({
  base: '/lifts/',
  plugins: [react()],
});
