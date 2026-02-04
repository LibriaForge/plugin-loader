import { describe, expect, it, beforeEach } from 'vitest';

import {
    DefaultPluginContext,
    DuplicatePluginError,
    LibriaPlugin,
    PluginNotFoundError,
} from '../src';

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

            expect(() => context.register('test-plugin', plugin)).not.toThrow();
        });

        it('allows registering multiple plugins with different ids', () => {
            const plugin1: LibriaPlugin = { api: { name: 'plugin1' } };
            const plugin2: LibriaPlugin = { api: { name: 'plugin2' } };

            context.register('plugin-1', plugin1);
            context.register('plugin-2', plugin2);

            expect(context.hasPlugin('plugin-1')).toBe(true);
            expect(context.hasPlugin('plugin-2')).toBe(true);
        });

        it('throws DuplicatePluginError when registering same id twice', () => {
            const plugin: LibriaPlugin = { api: {} };

            context.register('test-plugin', plugin);

            expect(() => context.register('test-plugin', plugin)).toThrow(DuplicatePluginError);
        });

        it('includes plugin id in DuplicatePluginError', () => {
            const plugin: LibriaPlugin = { api: {} };

            context.register('my-plugin', plugin);

            try {
                context.register('my-plugin', plugin);
                expect.fail('Should have thrown');
            } catch (err) {
                expect(err).toBeInstanceOf(DuplicatePluginError);
                const error = err as DuplicatePluginError;
                expect(error.id).toBe('my-plugin');
            }
        });
    });

    describe('getPlugin', () => {
        it('retrieves registered plugin API', () => {
            const api = { greeting: 'hello', value: 42 };
            const plugin: LibriaPlugin<typeof api> = { api };

            context.register('test-plugin', plugin);

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

            context.register('typed-plugin', plugin);

            const api = context.getPlugin<MyPluginAPI>('typed-plugin');
            expect(api.doSomething()).toBe('done');
        });
    });

    describe('hasPlugin', () => {
        it('returns true for registered plugin', () => {
            const plugin: LibriaPlugin = { api: {} };
            context.register('test-plugin', plugin);

            expect(context.hasPlugin('test-plugin')).toBe(true);
        });

        it('returns false for unregistered plugin', () => {
            expect(context.hasPlugin('nonexistent')).toBe(false);
        });

        it('returns false after checking wrong id', () => {
            const plugin: LibriaPlugin = { api: {} };
            context.register('plugin-a', plugin);

            expect(context.hasPlugin('plugin-b')).toBe(false);
        });
    });

    describe('integration', () => {
        it('simulates plugin dependency resolution', () => {
            // Simulate loading plugins in dependency order
            // Plugin C (no deps) -> Plugin B (depends on C) -> Plugin A (depends on B)

            const pluginC: LibriaPlugin<{ getValue: () => number }> = {
                api: { getValue: () => 100 },
            };

            context.register('plugin-c', pluginC);

            // Plugin B uses Plugin C
            const cApi = context.getPlugin<{ getValue: () => number }>('plugin-c');
            const pluginB: LibriaPlugin<{ getDoubleValue: () => number }> = {
                api: { getDoubleValue: () => cApi.getValue() * 2 },
            };

            context.register('plugin-b', pluginB);

            // Plugin A uses Plugin B
            const bApi = context.getPlugin<{ getDoubleValue: () => number }>('plugin-b');
            const pluginA: LibriaPlugin<{ getFinalValue: () => number }> = {
                api: { getFinalValue: () => bApi.getDoubleValue() + 1 },
            };

            context.register('plugin-a', pluginA);

            // Verify the chain works
            const aApi = context.getPlugin<{ getFinalValue: () => number }>('plugin-a');
            expect(aApi.getFinalValue()).toBe(201); // (100 * 2) + 1
        });
    });
});
