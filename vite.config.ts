import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => ({
  base: './',
  build: {
    target: 'es2020',
    sourcemap: mode === 'development',
    minify: 'esbuild',
    // Milestone 12.1 — strip console.* / debugger from production bundles
    esbuild: {
      drop: mode === 'production' ? ['console', 'debugger'] : [],
    },
  },
  server: {
    host: true,
    port: 5173,
  },
}));
