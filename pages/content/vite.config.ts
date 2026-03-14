import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    outDir: resolve(__dirname, '../../dist/content'),
    emptyOutDir: false,
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'src/index.ts')
      },
      output: {
        entryFileNames: '[name].iife.js',
        format: 'iife'
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
