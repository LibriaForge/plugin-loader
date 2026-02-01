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