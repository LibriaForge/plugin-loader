import { describe, expect, it } from 'vitest';

import { definePlugin, DefaultPluginContext, PluginContext, PluginFactory } from '../src';

describe('definePlugin', () => {
    it('returns the same factory object', () => {
        const factory: PluginFactory<{ foo: string }> = {
            id: 'test-plugin',
            pluginType: 'test',
            create: () => ({ api: { foo: 'bar' } }),
        };

        const result = definePlugin(factory);

        expect(result).toBe(factory);
    });

    it('preserves all factory properties', () => {
        const factory: PluginFactory<{ value: number }> = {
            id: 'my-plugin',
            pluginType: 'custom',
            name: 'My Plugin',
            create: () => ({ api: { value: 42 } }),
        };

        const result = definePlugin(factory);

        expect(result.id).toBe('my-plugin');
        expect(result.pluginType).toBe('custom');
        expect(result.name).toBe('My Plugin');
        expect(typeof result.create).toBe('function');
    });

    it('factory can create plugins with context access', () => {
        const factory = definePlugin<{ getMessage: () => string }>({
            id: 'context-aware-plugin',
            pluginType: 'test',
            create: (ctx: PluginContext) => {
                return {
                    api: {
                        getMessage: () => {
                            if (ctx.hasPlugin('greeting-plugin')) {
                                return ctx.getPlugin<{ greet: () => string }>('greeting-plugin').greet();
                            }
                            return 'No greeting available';
                        },
                    },
                };
            },
        });

        // Test without dependency
        const context1 = new DefaultPluginContext();
        const plugin1 = factory.create(context1);
        expect(plugin1.api.getMessage()).toBe('No greeting available');

        // Test with dependency
        const context2 = new DefaultPluginContext();
        context2.register('greeting-plugin', { api: { greet: () => 'Hello!' } });
        const plugin2 = factory.create(context2);
        expect(plugin2.api.getMessage()).toBe('Hello!');
    });

    it('supports generic type inference', () => {
        interface MyAPI {
            calculate(a: number, b: number): number;
        }

        const factory = definePlugin<MyAPI>({
            id: 'calculator',
            pluginType: 'util',
            create: () => ({
                api: {
                    calculate: (a, b) => a + b,
                },
            }),
        });

        const context = new DefaultPluginContext();
        const plugin = factory.create(context);

        expect(plugin.api.calculate(2, 3)).toBe(5);
    });

    it('allows plugins to depend on other plugins', () => {
        // Define a base plugin
        const baseFactory = definePlugin<{ getValue: () => number }>({
            id: 'base-plugin',
            pluginType: 'test',
            create: () => ({
                api: { getValue: () => 10 },
            }),
        });

        // Define a dependent plugin
        const dependentFactory = definePlugin<{ getDoubleValue: () => number }>({
            id: 'dependent-plugin',
            pluginType: 'test',
            create: (ctx) => {
                const base = ctx.getPlugin<{ getValue: () => number }>('base-plugin');
                return {
                    api: {
                        getDoubleValue: () => base.getValue() * 2,
                    },
                };
            },
        });

        // Simulate proper loading order
        const context = new DefaultPluginContext();

        // Load base first
        const basePlugin = baseFactory.create(context);
        context.register('base-plugin', basePlugin);

        // Then load dependent
        const dependentPlugin = dependentFactory.create(context);
        context.register('dependent-plugin', dependentPlugin);

        expect(dependentPlugin.api.getDoubleValue()).toBe(20);
    });

    it('works with complex nested APIs', () => {
        interface ComplexAPI {
            utils: {
                format(value: string): string;
                parse(value: string): number;
            };
            config: {
                get(key: string): string | undefined;
                set(key: string, value: string): void;
            };
        }

        const storage = new Map<string, string>();

        const factory = definePlugin<ComplexAPI>({
            id: 'complex-plugin',
            pluginType: 'util',
            create: () => ({
                api: {
                    utils: {
                        format: (value) => `[${value}]`,
                        parse: (value) => parseInt(value, 10),
                    },
                    config: {
                        get: (key) => storage.get(key),
                        set: (key, value) => storage.set(key, value),
                    },
                },
            }),
        });

        const context = new DefaultPluginContext();
        const plugin = factory.create(context);

        expect(plugin.api.utils.format('test')).toBe('[test]');
        expect(plugin.api.utils.parse('42')).toBe(42);

        plugin.api.config.set('key', 'value');
        expect(plugin.api.config.get('key')).toBe('value');
    });
});
