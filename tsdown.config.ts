import { defineConfig } from 'tsdown';

const isDebug = process.env.NODE_ENV !== 'production';

export default defineConfig({
    entry: ['src/index.ts'], // Main export file
    format: ['cjs', 'esm'], // CJS and ESM; add 'iife' for browser if needed
    dts: true, // Generate types
    sourcemap: true,
    clean: true,
    minify: !isDebug, // Production minification
});
