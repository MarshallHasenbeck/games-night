import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The app shares code with the web version in ../../src (puzzle logic, pixel art, sounds, styles) but builds on its own into ./dist.
export default defineConfig({
  plugins: [react()],
  base: './',
  resolve: { dedupe: ['react', 'react-dom'] },
  server: { fs: { allow: ['../..'] } },
  build: { target: 'safari15', chunkSizeWarningLimit: 900 },
  worker: { format: 'es' },
  define: { __BUILD__: JSON.stringify(new Date().toISOString().slice(5, 16).replace('T', ' ')) },
});
