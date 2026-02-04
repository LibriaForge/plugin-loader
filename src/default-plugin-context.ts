import {
    DuplicatePluginError,
    LibriaPlugin,
    PluginContext,
    PluginMetadata,
    PluginNotFoundError,
} from './types';

interface RegisteredPlugin {
    plugin: LibriaPlugin;
    metadata: PluginMetadata;
}

export class DefaultPluginContext implements PluginContext {
    private plugins: Map<string, RegisteredPlugin> = new Map();

    public register(id: string, plugin: LibriaPlugin, metadata: PluginMetadata): void {
        if (this.plugins.has(id)) {
            throw new DuplicatePluginError(id);
        }

        this.plugins.set(id, { plugin, metadata });
    }

    public unregister(id: string): LibriaPlugin | undefined {
        const registered = this.plugins.get(id);
        if (registered) {
            this.plugins.delete(id);
            return registered.plugin;
        }
        return undefined;
    }

    public getPlugin<T = unknown>(id: string): T {
        const registered = this.plugins.get(id);
        if (!registered) {
            throw new PluginNotFoundError(id);
        }

        return registered.plugin.api as T;
    }

    public hasPlugin(id: string): boolean {
        return this.plugins.has(id);
    }

    /** Get the raw LibriaPlugin instance (includes lifecycle hooks) */
    public getPluginInstance(id: string): LibriaPlugin | undefined {
        return this.plugins.get(id)?.plugin;
    }

    /** Get metadata for a specific plugin */
    public getPluginMetadata(id: string): PluginMetadata | undefined {
        return this.plugins.get(id)?.metadata;
    }

    /** Get all plugin IDs */
    public getPluginIds(): string[] {
        return [...this.plugins.keys()];
    }

    /** Get all plugins of a specific type */
    public getPluginsByType(pluginType: string): PluginMetadata[] {
        const result: PluginMetadata[] = [];
        for (const { metadata } of this.plugins.values()) {
            if (metadata.pluginType === pluginType) {
                result.push(metadata);
            }
        }
        return result;
    }

    /** Get all loaded plugin metadata */
    public getAllMetadata(): PluginMetadata[] {
        return [...this.plugins.values()].map(r => r.metadata);
    }
}
