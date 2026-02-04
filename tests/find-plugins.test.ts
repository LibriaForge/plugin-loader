import path from 'path';

import { describe, expect, it } from 'vitest';

import { findPlugins } from '../src';

describe('findPlugins', () => {
    const fixturesDir = path.resolve('tests/fixtures');

    describe('directory scanning', () => {
        it('finds plugins in a directory', async () => {
            const plugins = await findPlugins(fixturesDir);

            expect(plugins.length).toBeGreaterThan(0);
            expect(plugins.some(p => p.id === 'esm-plugin')).toBe(true);
            expect(plugins.some(p => p.id === 'cjs-plugin')).toBe(true);
        });

        it('sets __dir for each found plugin', async () => {
            const plugins = await findPlugins(fixturesDir);

            for (const plugin of plugins) {
                expect(plugin.__dir).toBeDefined();
                expect(path.isAbsolute(plugin.__dir)).toBe(true);
            }
        });

        it('returns empty array for non-existent directory', async () => {
            const plugins = await findPlugins(path.resolve('tests/nonexistent'));
            expect(plugins).toEqual([]);
        });

        it('returns empty array for empty directory', async () => {
            // Using a directory that exists but has no plugins
            const plugins = await findPlugins(path.resolve('tests'));
            expect(plugins).toEqual([]);
        });
    });

    describe('glob patterns', () => {
        it('finds plugins using glob pattern', async () => {
            const pattern = path.resolve('tests/fixtures/*-plugin').replace(/\\/g, '/');
            const plugins = await findPlugins(pattern);

            expect(plugins.length).toBeGreaterThan(0);
            expect(plugins.some(p => p.id === 'esm-plugin')).toBe(true);
            expect(plugins.some(p => p.id === 'cjs-plugin')).toBe(true);
        });

        it('finds plugins in nested directories with glob', async () => {
            const pattern = path.resolve('tests/fixtures/dep-chain/*').replace(/\\/g, '/');
            const plugins = await findPlugins(pattern);

            expect(plugins).toHaveLength(3);
            expect(plugins.some(p => p.id === 'plugin-a')).toBe(true);
            expect(plugins.some(p => p.id === 'plugin-b')).toBe(true);
            expect(plugins.some(p => p.id === 'plugin-c')).toBe(true);
        });

        it('handles Windows-style paths in glob patterns', async () => {
            // The function should normalize backslashes to forward slashes
            const pattern = path.resolve('tests/fixtures/*-plugin');
            const plugins = await findPlugins(pattern);

            expect(plugins.length).toBeGreaterThan(0);
        });
    });

    describe('pluginType filtering', () => {
        it('filters plugins by pluginType', async () => {
            const plugins = await findPlugins(fixturesDir, 'test');

            expect(plugins.length).toBeGreaterThan(0);
            for (const plugin of plugins) {
                expect(plugin.pluginType).toBe('test');
            }
        });

        it('returns empty array when no plugins match pluginType', async () => {
            const plugins = await findPlugins(fixturesDir, 'nonexistent-type');
            expect(plugins).toEqual([]);
        });

        it('filters with glob pattern and pluginType', async () => {
            const pattern = path.resolve('tests/fixtures/*-plugin').replace(/\\/g, '/');
            const plugins = await findPlugins(pattern, 'test');

            expect(plugins.length).toBeGreaterThan(0);
            for (const plugin of plugins) {
                expect(plugin.pluginType).toBe('test');
            }
        });
    });

    describe('manifest parsing', () => {
        it('parses all manifest fields', async () => {
            const plugins = await findPlugins(fixturesDir);
            const esmPlugin = plugins.find(p => p.id === 'esm-plugin');

            expect(esmPlugin).toBeDefined();
            expect(esmPlugin!.id).toBe('esm-plugin');
            expect(esmPlugin!.name).toBe('ESM Plugin');
            expect(esmPlugin!.pluginType).toBe('test');
            expect(esmPlugin!.version).toBe('1.0.0');
            expect(esmPlugin!.module).toBe('./dist/index.mjs');
        });

        it('parses dependencies from manifest', async () => {
            const pattern = path.resolve('tests/fixtures/dep-chain/*').replace(/\\/g, '/');
            const plugins = await findPlugins(pattern);
            const pluginA = plugins.find(p => p.id === 'plugin-a');

            expect(pluginA).toBeDefined();
            expect(pluginA!.dependencies).toBeDefined();
            expect(pluginA!.dependencies).toHaveLength(1);
            expect(pluginA!.dependencies![0].id).toBe('plugin-b');
            expect(pluginA!.dependencies![0].version).toBe('^1.0.0');
        });
    });

    describe('edge cases', () => {
        it('skips directories without plugin.json', async () => {
            // tests/fixtures contains some directories without plugin.json
            const plugins = await findPlugins(fixturesDir);

            // Should not throw, just skip those directories
            expect(Array.isArray(plugins)).toBe(true);
        });

        it('skips files (non-directories) in path', async () => {
            const plugins = await findPlugins(fixturesDir);

            // Should only return valid plugins from directories
            for (const plugin of plugins) {
                expect(plugin.id).toBeDefined();
                expect(plugin.__dir).toBeDefined();
            }
        });
    });
});
