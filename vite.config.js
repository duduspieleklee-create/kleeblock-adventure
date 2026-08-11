import { defineConfig } from 'vite';
import { execSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Auto-pick latest git tag as version (called at server start, never cached)
function getGitTag() {
  try {
    const v = execSync('git -C . tag --sort=-creatordate | head -1', {
      cwd: __dirname,
      encoding: 'utf-8',
    }).trim();
    console.log('GAME_VERSION resolved:', v);
    return v;
  } catch {
    return '0.0.0';
  }
}

export default defineConfig({
  root: './',
  base: './',
  define: {
    'import.meta.env.GAME_VERSION': JSON.stringify(getGitTag()),
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/phaser')) return 'phaser';
        },
      },
    },
  },
  server: {
    host: '0.0.0.0',
    port: 8080,
    open: false,
  },
});