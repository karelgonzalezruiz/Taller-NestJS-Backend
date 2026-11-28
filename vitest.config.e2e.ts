import { defineConfig } from 'vitest/config';
import { metadataPlugin } from './test/metadata-plugin.js';

export default defineConfig({
  plugins: [metadataPlugin()],
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    hookTimeout: 30000,
    testTimeout: 10000,
  },
});
