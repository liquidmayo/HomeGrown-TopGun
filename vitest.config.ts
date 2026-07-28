import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
  resolve: {
    alias: {
      '@engine': path.resolve(__dirname, 'src/engine'),
      '@ai': path.resolve(__dirname, 'src/ai'),
      '@data': path.resolve(__dirname, 'src/data'),
      '@tutorial': path.resolve(__dirname, 'src/tutorial'),
      '@renderer': path.resolve(__dirname, 'src/renderer'),
    },
  },
});
