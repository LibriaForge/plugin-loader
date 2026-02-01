import { describe, expect, it } from 'vitest';
import path from 'path';
import { loadAllPlugins } from "../../src";

describe('loadAllPlugins', async () => {
    it('should load all plugins from a directory using glob', async () => {
        const plugins = await loadAllPlugins<{ hello: () => string }>(
            'tests/fixtures/{esm,cjs}-plugin'
        );

        expect(plugins).toHaveLength(2);
        expect(plugins.some(p => p.api.hello() === 'world')).toBe(true);
        expect(plugins.some(p => p.api.hello() === 'cjs world')).toBe(true);
    });

    it('should load plugins using wildcard glob pattern', async () => {
        const plugins = await loadAllPlugins<{ hello: () => string }>(
            path.resolve('tests/fixtures/{esm,cjs}-plugin')
        );

        expect(plugins).toHaveLength(2);
    });

    it('should filter by plugin type', async () => {
        const plugins = await loadAllPlugins(
            path.resolve('tests/fixtures/{esm,cjs}-plugin'),
            'test'
        );

        expect(plugins).toHaveLength(2);
        expect(plugins.every(p => p.pluginType === 'test')).toBe(true);
    });

    it('should return empty array when no plugins match', async () => {
        const plugins = await loadAllPlugins(
            path.resolve('tests/fixtures'),
            'nonexistent-type'
        );

        expect(plugins).toHaveLength(0);
    });

    it('should load dist plugins using glob pattern', async () => {
        const plugins = await loadAllPlugins<{ greet: () => string }>(
            path.resolve('tests/fixtures/dist-plugin-*/dist')
        );

        expect(plugins).toHaveLength(2);
        expect(plugins.some(p => p.api.greet() === 'Hello from Alpha!')).toBe(true);
        expect(plugins.some(p => p.api.greet() === 'Hello from Beta!')).toBe(true);
    });

    it('should load dist plugins filtered by type', async () => {
        const plugins = await loadAllPlugins(
            path.resolve('tests/fixtures/dist-plugin-*/dist'),
            'test'
        );

        expect(plugins).toHaveLength(2);
        expect(plugins.every(p => p.pluginType === 'test')).toBe(true);
    });
});
