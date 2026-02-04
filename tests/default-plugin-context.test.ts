import { describe, expect, it, beforeEach } from 'vitest';

import {
    DefaultPluginContext,
    DuplicatePluginError,
    LibriaPlugin,
    PluginMetadata,
    PluginNotFoundError,
} from '../src';

function createMetadata(id: string, pluginType = 'test'): PluginMetadata {
    return {
        id,
        name: id,
        pluginType,
        version: '1.0.0',
        dir: `/fake/path/${id}`,
    };
}

describe('DefaultPluginContext', () => {
    let context: DefaultPluginContext;

    beforeEach(() => {
        context = new DefaultPluginContext();
    });

    describe('register', () => {
        it('registers a plugin successfully', () => {
            const plugin: LibriaPlugin<{ foo: string }> = {
                api: { foo: 'bar' },
            };

            expect(() =>
                context.register('test-plugin', plugin, createMetadata('test-plugin'))
            ).not.toThrow();
        });

        it('allows registering multiple plugins with different ids', () => {
            const plugin1: LibriaPlugin = { api: { name: 'plugin1' } };
            const plugin2: LibriaPlugin = { api: { name: 'plugin2' } };

            context.register('plugin-1', plugin1, createMetadata('plugin-1'));
            context.register('plugin-2', plugin2, createMetadata('plugin-2'));

            expect(context.hasPlugin('plugin-1')).toBe(true);
            expect(context.hasPlugin('plugin-2')).toBe(true);
        });

        it('throws DuplicatePluginError when registering same id twice', () => {
            const plugin: LibriaPlugin = { api: {} };
            const metadata = createMetadata('test-plugin');

            context.register('test-plugin', plugin, metadata);

            expect(() => context.register('test-plugin', plugin, metadata)).toThrow(
                DuplicatePluginError
            );
        });

        it('includes plugin id in DuplicatePluginError', () => {
            const plugin: LibriaPlugin = { api: {} };
            const metadata = createMetadata('my-plugin');

            context.register('my-plugin', plugin, metadata);

            try {
                context.register('my-plugin', plugin, metadata);
                expect.fail('Should have thrown');
            } catch (err) {
                expect(err).toBeInstanceOf(DuplicatePluginError);
                const error = err as DuplicatePluginError;
                expect(error.id).toBe('my-plugin');
            }
        });
    });

    describe('unregister', () => {
        it('removes a registered plugin', () => {
            const plugin: LibriaPlugin = { api: {} };
            context.register('test-plugin', plugin, createMetadata('test-plugin'));

            expect(context.hasPlugin('test-plugin')).toBe(true);
            context.unregister('test-plugin');
            expect(context.hasPlugin('test-plugin')).toBe(false);
        });

        it('returns the unregistered plugin', () => {
            const plugin: LibriaPlugin = { api: { value: 42 } };
            context.register('test-plugin', plugin, createMetadata('test-plugin'));

            const unregistered = context.unregister('test-plugin');
            expect(unregistered).toBe(plugin);
        });

        it('returns undefined for non-existent plugin', () => {
            const result = context.unregister('nonexistent');
            expect(result).toBeUndefined();
        });
    });

    describe('getPlugin', () => {
        it('retrieves registered plugin API', () => {
            const api = { greeting: 'hello', value: 42 };
            const plugin: LibriaPlugin<typeof api> = { api };

            context.register('test-plugin', plugin, createMetadata('test-plugin'));

            const retrieved = context.getPlugin<typeof api>('test-plugin');
            expect(retrieved).toEqual(api);
            expect(retrieved.greeting).toBe('hello');
            expect(retrieved.value).toBe(42);
        });

        it('throws PluginNotFoundError for unregistered plugin', () => {
            expect(() => context.getPlugin('nonexistent')).toThrow(PluginNotFoundError);
        });

        it('includes plugin id in PluginNotFoundError', () => {
            try {
                context.getPlugin('my-missing-plugin');
                expect.fail('Should have thrown');
            } catch (err) {
                expect(err).toBeInstanceOf(PluginNotFoundError);
                const error = err as PluginNotFoundError;
                expect(error.id).toBe('my-missing-plugin');
            }
        });

        it('supports generic type parameter', () => {
            interface MyPluginAPI {
                doSomething(): string;
            }

            const plugin: LibriaPlugin<MyPluginAPI> = {
                api: {
                    doSomething: () => 'done',
                },
            };

            context.register('typed-plugin', plugin, createMetadata('typed-plugin'));

            const api = context.getPlugin<MyPluginAPI>('typed-plugin');
            expect(api.doSomething()).toBe('done');
        });
    });

    describe('hasPlugin', () => {
        it('returns true for registered plugin', () => {
            const plugin: LibriaPlugin = { api: {} };
            context.register('test-plugin', plugin, createMetadata('test-plugin'));

            expect(context.hasPlugin('test-plugin')).toBe(true);
        });

        it('returns false for unregistered plugin', () => {
            expect(context.hasPlugin('nonexistent')).toBe(false);
        });

        it('returns false after checking wrong id', () => {
            const plugin: LibriaPlugin = { api: {} };
            context.register('plugin-a', plugin, createMetadata('plugin-a'));

            expect(context.hasPlugin('plugin-b')).toBe(false);
        });
    });

    describe('metadata queries', () => {
        beforeEach(() => {
            context.register(
                'plugin-a',
                { api: {} },
                { ...createMetadata('plugin-a'), pluginType: 'type-1' }
            );
            context.register(
                'plugin-b',
                { api: {} },
                { ...createMetadata('plugin-b'), pluginType: 'type-1' }
            );
            context.register(
                'plugin-c',
                { api: {} },
                { ...createMetadata('plugin-c'), pluginType: 'type-2' }
            );
        });

        it('getPluginIds returns all plugin IDs', () => {
            const ids = context.getPluginIds();
            expect(ids).toContain('plugin-a');
            expect(ids).toContain('plugin-b');
            expect(ids).toContain('plugin-c');
            expect(ids).toHaveLength(3);
        });

        it('getPluginMetadata returns metadata for a plugin', () => {
            const metadata = context.getPluginMetadata('plugin-a');
            expect(metadata).toBeDefined();
            expect(metadata?.id).toBe('plugin-a');
            expect(metadata?.pluginType).toBe('type-1');
        });

        it('getPluginMetadata returns undefined for unknown plugin', () => {
            const metadata = context.getPluginMetadata('nonexistent');
            expect(metadata).toBeUndefined();
        });

        it('getPluginsByType returns plugins of specific type', () => {
            const type1Plugins = context.getPluginsByType('type-1');
            expect(type1Plugins).toHaveLength(2);
            expect(type1Plugins.map(p => p.id)).toContain('plugin-a');
            expect(type1Plugins.map(p => p.id)).toContain('plugin-b');
        });

        it('getPluginsByType returns empty array for unknown type', () => {
            const plugins = context.getPluginsByType('nonexistent-type');
            expect(plugins).toEqual([]);
        });

        it('getAllMetadata returns all plugin metadata', () => {
            const all = context.getAllMetadata();
            expect(all).toHaveLength(3);
        });

        it('getPluginInstance returns the raw plugin', () => {
            const plugin = context.getPluginInstance('plugin-a');
            expect(plugin).toBeDefined();
            expect(plugin?.api).toBeDefined();
        });
    });

    describe('integration', () => {
        it('simulates plugin dependency resolution', () => {
            const pluginC: LibriaPlugin<{ getValue: () => number }> = {
                api: { getValue: () => 100 },
            };

            context.register('plugin-c', pluginC, createMetadata('plugin-c'));

            const cApi = context.getPlugin<{ getValue: () => number }>('plugin-c');
            const pluginB: LibriaPlugin<{ getDoubleValue: () => number }> = {
                api: { getDoubleValue: () => cApi.getValue() * 2 },
            };

            context.register('plugin-b', pluginB, createMetadata('plugin-b'));

            const bApi = context.getPlugin<{ getDoubleValue: () => number }>('plugin-b');
            const pluginA: LibriaPlugin<{ getFinalValue: () => number }> = {
                api: { getFinalValue: () => bApi.getDoubleValue() + 1 },
            };

            context.register('plugin-a', pluginA, createMetadata('plugin-a'));

            const aApi = context.getPlugin<{ getFinalValue: () => number }>('plugin-a');
            expect(aApi.getFinalValue()).toBe(201);
        });
    });
});
