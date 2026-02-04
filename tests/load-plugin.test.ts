import path from 'path';

import { describe, expect, it } from 'vitest';

import {
    DefaultPluginContext,
    loadPlugin,
    PluginInvalidExportError,
    PluginLoadError,
    PluginManifest,
} from '../src';

function createManifest(overrides: Partial<PluginManifest> & { __dir: string }): PluginManifest {
    return {
        id: 'test-plugin',
        name: 'Test Plugin',
        pluginType: 'test',
        version: '1.0.0',
        ...overrides,
    };
}

describe('loadPlugin', () => {
    describe('ESM plugins', () => {
        it('loads ESM plugin factory successfully', async () => {
            const manifest = createManifest({
                id: 'esm-plugin',
                __dir: path.resolve('tests/fixtures/esm-plugin'),
                module: './dist/index.mjs',
            });

            const factory = await loadPlugin<{ hello: () => string }>(manifest);

            expect(factory).toBeDefined();
            expect(factory.id).toBe('esm-plugin');
            expect(factory.pluginType).toBe('test');
            expect(typeof factory.create).toBe('function');
        });

        it('factory creates plugin with working API', async () => {
            const manifest = createManifest({
                id: 'esm-plugin',
                __dir: path.resolve('tests/fixtures/esm-plugin'),
                module: './dist/index.mjs',
            });

            const factory = await loadPlugin<{ hello: () => string }>(manifest);
            const context = new DefaultPluginContext();
            const plugin = factory.create(context);

            expect(plugin.api.hello()).toBe('world');
        });
    });

    describe('CJS plugins', () => {
        it('loads CJS plugin factory successfully', async () => {
            const manifest = createManifest({
                id: 'cjs-plugin',
                __dir: path.resolve('tests/fixtures/cjs-plugin'),
                main: './dist/index.cjs',
            });

            const factory = await loadPlugin<{ hello: () => string }>(manifest);

            expect(factory).toBeDefined();
            expect(factory.id).toBe('cjs-plugin');
            expect(typeof factory.create).toBe('function');
        });

        it('CJS factory creates plugin with working API', async () => {
            const manifest = createManifest({
                id: 'cjs-plugin',
                __dir: path.resolve('tests/fixtures/cjs-plugin'),
                main: './dist/index.cjs',
            });

            const factory = await loadPlugin<{ hello: () => string }>(manifest);
            const context = new DefaultPluginContext();
            const plugin = factory.create(context);

            expect(plugin.api.hello()).toBe('cjs world');
        });
    });

    describe('fallback behavior', () => {
        it('falls back to CJS when ESM fails', async () => {
            const manifest = createManifest({
                id: 'cjs-plugin',
                __dir: path.resolve('tests/fixtures/cjs-plugin'),
                module: './nonexistent.mjs', // This will fail
                main: './dist/index.cjs', // Should fall back to this
            });

            const factory = await loadPlugin<{ hello: () => string }>(manifest);
            const context = new DefaultPluginContext();
            const plugin = factory.create(context);

            expect(plugin.api.hello()).toBe('cjs world');
        });

        it('prefers ESM over CJS when both are available', async () => {
            const manifest = createManifest({
                id: 'esm-plugin',
                __dir: path.resolve('tests/fixtures/esm-plugin'),
                module: './dist/index.mjs',
                main: './dist/index.cjs',
            });

            const factory = await loadPlugin<{ hello: () => string }>(manifest);
            const context = new DefaultPluginContext();
            const plugin = factory.create(context);

            // ESM plugin returns "world"
            expect(plugin.api.hello()).toBe('world');
        });
    });

    describe('error handling', () => {
        it('throws PluginLoadError when no module can be loaded', async () => {
            const manifest = createManifest({
                id: 'nonexistent-plugin',
                __dir: path.resolve('tests/fixtures/nonexistent'),
                module: './index.mjs',
            });

            await expect(loadPlugin(manifest)).rejects.toThrow(PluginLoadError);
        });

        it('throws PluginLoadError with plugin id', async () => {
            const manifest = createManifest({
                id: 'my-failing-plugin',
                __dir: path.resolve('tests/fixtures/nonexistent'),
                module: './index.mjs',
            });

            try {
                await loadPlugin(manifest);
                expect.fail('Should have thrown');
            } catch (err) {
                expect(err).toBeInstanceOf(PluginLoadError);
                const error = err as PluginLoadError;
                expect(error.pluginName).toBe('my-failing-plugin');
            }
        });

        it('throws PluginInvalidExportError for invalid exports', async () => {
            const manifest = createManifest({
                id: 'invalid-plugin',
                __dir: path.resolve('tests/fixtures/invalid-plugin'),
                module: './dist/index.mjs',
            });

            await expect(loadPlugin(manifest)).rejects.toThrow(PluginInvalidExportError);
        });

        it('throws PluginLoadError when neither module nor main is specified', async () => {
            const manifest = createManifest({
                id: 'no-entry-plugin',
                __dir: path.resolve('tests/fixtures/esm-plugin'),
                // No module or main specified
            });

            await expect(loadPlugin(manifest)).rejects.toThrow(PluginLoadError);
        });
    });

    describe('factory validation', () => {
        it('validates factory has required properties', async () => {
            const manifest = createManifest({
                id: 'esm-plugin',
                __dir: path.resolve('tests/fixtures/esm-plugin'),
                module: './dist/index.mjs',
            });

            const factory = await loadPlugin(manifest);

            expect(factory).toHaveProperty('id');
            expect(factory).toHaveProperty('pluginType');
            expect(factory).toHaveProperty('create');
        });
    });
});
