import { defineConfig } from 'tsdown';

export default defineConfig({
    entry: ['src/index.ts'], // Main export file
    format: ['cjs', 'esm'], // CJS and ESM; add 'iife' for browser if needed
    dts: true, // Generate types
    sourcemap: true,
    clean: true,
    minify: true, // Production minification
  target: false,
});
