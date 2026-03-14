import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  base: './', // Use relative paths for Chrome extension
  build: {
    outDir: resolve(__dirname, '../../dist/side-panel'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'index.html'),
        history: resolve(__dirname, 'history.html')
      }
    },
    minify: false,
    sourcemap: false
  },
  resolve: {
    alias: {
      '@extension/shared': resolve(__dirname, '../../packages/shared/lib/index.ts')
    }
  }
});
