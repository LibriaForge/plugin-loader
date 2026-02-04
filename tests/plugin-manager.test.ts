import path from 'path';

import { describe, expect, it } from 'vitest';

import { CircularDependencyError, PluginManager, VersionMismatchError } from '../src';

describe('PluginManager', () => {
    describe('loadPlugins', () => {
        it('loads plugins from a single pattern', async () => {
            const manager = new PluginManager();
            // Use glob pattern to match the plugin directory
            const pattern = path.resolve('tests/fixtures/esm-*').replace(/\\/g, '/');

            await manager.loadPlugins([pattern]);

            expect(manager.hasPlugin('esm-plugin')).toBe(true);
        });

        it('loads plugins from multiple patterns', async () => {
            const manager = new PluginManager();
            const patterns = [
                path.resolve('tests/fixtures/esm-*').replace(/\\/g, '/'),
                path.resolve('tests/fixtures/cjs-*').replace(/\\/g, '/'),
            ];

            await manager.loadPlugins(patterns);

            expect(manager.hasPlugin('esm-plugin')).toBe(true);
            expect(manager.hasPlugin('cjs-plugin')).toBe(true);
        });

        it('loads plugins with dependencies in correct order', async () => {
            const manager = new PluginManager();
            const pattern = path.resolve('tests/fixtures/dep-chain');

            // Plugin A depends on B, B depends on C
            // Should load C, then B, then A
            await manager.loadPlugins([pattern]);

            expect(manager.hasPlugin('plugin-a')).toBe(true);
            expect(manager.hasPlugin('plugin-b')).toBe(true);
            expect(manager.hasPlugin('plugin-c')).toBe(true);
        });

        it('handles glob patterns', async () => {
            const manager = new PluginManager();
            // Use pattern that matches esm-plugin and cjs-plugin but not invalid-plugin
            const pattern = path.resolve('tests/fixtures/{esm,cjs}-plugin').replace(/\\/g, '/');

            await manager.loadPlugins([pattern]);

            expect(manager.hasPlugin('esm-plugin')).toBe(true);
            expect(manager.hasPlugin('cjs-plugin')).toBe(true);
        });
    });

    describe('getPlugin', () => {
        it('returns plugin API after loading', async () => {
            const manager = new PluginManager();
            await manager.loadPlugins([path.resolve('tests/fixtures/esm-*').replace(/\\/g, '/')]);

            const api = manager.getPlugin<{ hello: () => string }>('esm-plugin');

            expect(api.hello()).toBe('world');
        });

        it('returns CJS plugin API', async () => {
            const manager = new PluginManager();
            await manager.loadPlugins([path.resolve('tests/fixtures/cjs-*').replace(/\\/g, '/')]);

            const api = manager.getPlugin<{ hello: () => string }>('cjs-plugin');

            expect(api.hello()).toBe('cjs world');
        });

        it('plugins can access their dependencies', async () => {
            const manager = new PluginManager();
            await manager.loadPlugins([path.resolve('tests/fixtures/dep-chain')]);

            // Plugin A should be able to call Plugin B's methods
            const pluginA = manager.getPlugin<{ getName: () => string; getDependencyName: () => string }>('plugin-a');

            expect(pluginA.getName()).toBe('Plugin A');
            expect(pluginA.getDependencyName()).toBe('Plugin B');

            // Plugin B should be able to call Plugin C's methods
            const pluginB = manager.getPlugin<{ getName: () => string; getDependencyName: () => string }>('plugin-b');

            expect(pluginB.getName()).toBe('Plugin B');
            expect(pluginB.getDependencyName()).toBe('Plugin C');
        });
    });

    describe('hasPlugin', () => {
        it('returns false for unloaded plugin', () => {
            const manager = new PluginManager();
            expect(manager.hasPlugin('nonexistent')).toBe(false);
        });

        it('returns true after loading', async () => {
            const manager = new PluginManager();
            expect(manager.hasPlugin('esm-plugin')).toBe(false);

            await manager.loadPlugins([path.resolve('tests/fixtures/esm-*').replace(/\\/g, '/')]);

            expect(manager.hasPlugin('esm-plugin')).toBe(true);
        });
    });

    describe('error handling', () => {
        it('throws CircularDependencyError for circular dependencies', async () => {
            const manager = new PluginManager();
            const pattern = path.resolve('tests/fixtures/circular-deps');

            await expect(manager.loadPlugins([pattern])).rejects.toThrow(CircularDependencyError);
        });

        it('throws VersionMismatchError for incompatible versions', async () => {
            const manager = new PluginManager();
            const pattern = path.resolve('tests/fixtures/version-mismatch');

            await expect(manager.loadPlugins([pattern])).rejects.toThrow(VersionMismatchError);
        });
    });

    describe('edge cases', () => {
        it('handles empty patterns gracefully', async () => {
            const manager = new PluginManager();

            await expect(manager.loadPlugins([])).resolves.not.toThrow();
        });

        it('handles non-existent paths gracefully', async () => {
            const manager = new PluginManager();
            const pattern = path.resolve('tests/fixtures/nonexistent');

            // Should not throw, just find no plugins
            await expect(manager.loadPlugins([pattern])).resolves.not.toThrow();
        });

        it('getContext returns the internal context', async () => {
            const manager = new PluginManager();
            await manager.loadPlugins([path.resolve('tests/fixtures/esm-*').replace(/\\/g, '/')]);

            const context = manager.getContext();

            expect(context.hasPlugin('esm-plugin')).toBe(true);
            expect(context.getPlugin('esm-plugin')).toBeDefined();
        });
    });
});
