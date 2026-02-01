import { beforeAll, describe, expect, it } from 'vitest';

import path from 'path';
import fs from 'fs';
import {loadPlugin, PluginTypeMismatchError} from "../../src";

describe('loads esm plugin', async () => {
    it('loads esm plugin', async () => {
        const manifest = JSON.parse(
            fs.readFileSync(
                path.resolve('tests/fixtures/esm-plugin/plugin.json'),
                'utf-8'
            )
        );

        // What find-plugins does in the background
        manifest.__dir = path.resolve('tests/fixtures/esm-plugin');

        const plugin = await loadPlugin<{ hello: () => string }>(manifest);

        expect(plugin.pluginType).toBe('test');
        expect(plugin.api.hello()).toBe('world');
    });
});

describe('loads cjs plugin', async () => {
    it('loads cjs plugin', async () => {
        const manifest = JSON.parse(
            fs.readFileSync(
                path.resolve('tests/fixtures/cjs-plugin/plugin.json'),
                'utf-8'
            )
        );

        // What find-plugins does in the background
        manifest.__dir = path.resolve('tests/fixtures/cjs-plugin');

        const plugin = await loadPlugin<{ hello: () => string }>(manifest);

        expect(plugin.pluginType).toBe('test');
        expect(plugin.api.hello()).toBe('cjs world');
    });
});

describe('handles invalid plugin', async () => {
    it('throws PluginTypeMismatchError for empty plugin', async () => {
        const manifest = JSON.parse(
            fs.readFileSync(
                path.resolve('tests/fixtures/invalid-plugin/plugin.json'),
                'utf-8'
            )
        );

        // What find-plugins does in the background
        manifest.__dir = path.resolve('tests/fixtures/invalid-plugin');

        await expect(loadPlugin(manifest)).rejects.toThrow(PluginTypeMismatchError);
        await expect(loadPlugin(manifest)).rejects.toThrow('invalid-plugin');
    });
});
