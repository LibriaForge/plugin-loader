import { beforeAll, describe, expect, it } from 'vitest';
import path from 'path';
import {findPlugins} from "../../src";

describe('finds plugins one level deep', async () => {
    it('should find plugins in fixtures directory', async () => {
        const plugins = await findPlugins(
            path.resolve('tests/fixtures')
        );

        expect(plugins.map(p => p.name)).toContain('esm-plugin');
        expect(plugins.map(p => p.name)).toContain('cjs-plugin');
    });
});

describe('finds plugins using glob patterns', async () => {
    it('should find plugins with glob pattern', async () => {
        const plugins = await findPlugins(
            path.resolve('tests/fixtures/*-plugin')
        );

        expect(plugins.map(p => p.name)).toContain('esm-plugin');
        expect(plugins.map(p => p.name)).toContain('cjs-plugin');
    });

    it('should find plugins with recursive glob pattern', async () => {
        const plugins = await findPlugins(
            path.resolve('tests/fixtures/**/*')
        );

        expect(plugins.map(p => p.name)).toContain('esm-plugin');
        expect(plugins.map(p => p.name)).toContain('cjs-plugin');
    });

    it('should filter by plugin type with glob', async () => {
        const plugins = await findPlugins(
            path.resolve('tests/fixtures/**/*'),
            'nonexistent'
        );

        expect(plugins).toHaveLength(0);
    });
});

describe('finds plugins with plugin.json inside dist', async () => {
    it('should find plugins with plugin.json in dist folder using glob', async () => {
        const plugins = await findPlugins(
            path.resolve('tests/fixtures/dist-plugin-*/dist')
        );

        expect(plugins).toHaveLength(2);
        expect(plugins.map(p => p.name)).toContain('dist-plugin-alpha');
        expect(plugins.map(p => p.name)).toContain('dist-plugin-beta');
    });

    it('should find dist plugins with recursive glob', async () => {
        const plugins = await findPlugins(
            path.resolve('tests/fixtures/**/dist')
        );

        expect(plugins.map(p => p.name)).toContain('dist-plugin-alpha');
        expect(plugins.map(p => p.name)).toContain('dist-plugin-beta');
    });

    it('should filter dist plugins by type', async () => {
        const plugins = await findPlugins(
            path.resolve('tests/fixtures/dist-plugin-*/dist'),
            'test'
        );

        expect(plugins).toHaveLength(2);
        expect(plugins.every(p => p.pluginType === 'test')).toBe(true);
    });
});