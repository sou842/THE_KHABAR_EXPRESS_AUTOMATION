import { defineConfig } from 'vite';
import { resolve } from 'path';
import manifest from './manifest.js';
import fs from 'fs';

export default defineConfig({
  build: {
    outDir: resolve(__dirname, '../dist'),
    emptyOutDir: false,
    rollupOptions: {
      input: {
        background: resolve(__dirname, 'src/background/index.ts')
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
      '@src': resolve(__dirname, 'src'),
      '@extension/shared': resolve(__dirname, '../packages/shared/lib/index.ts'),
      '@extension/storage': resolve(__dirname, '../packages/storage/lib/index.ts')
    }
  },
  plugins: [
    {
      name: 'write-manifest',
      closeBundle() {
        const distDir = resolve(__dirname, '../dist');
        if (!fs.existsSync(distDir)) {
          fs.mkdirSync(distDir, { recursive: true });
        }
        fs.writeFileSync(
          resolve(distDir, 'manifest.json'),
          JSON.stringify(manifest, null, 2)
        );
      }
    }
  ]
});
