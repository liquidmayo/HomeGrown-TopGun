import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  base: './',
  root: 'src/renderer',
  build: {
    outDir: '../../dist/renderer',
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@engine': path.resolve(__dirname, 'src/engine'),
      '@ai': path.resolve(__dirname, 'src/ai'),
      '@data': path.resolve(__dirname, 'src/data'),
      '@renderer': path.resolve(__dirname, 'src/renderer'),
      '@tutorial': path.resolve(__dirname, 'src/tutorial'),
    },
  },
  server: {
    port: 5173,
  },
});
