import { DuplicatePluginError, LibriaPlugin, PluginContext, PluginNotFoundError } from './types';

export class DefaultPluginContext implements PluginContext {
    private plugins: Map<string, LibriaPlugin> = new Map<string, LibriaPlugin>();

    public register(id: string, plugin: LibriaPlugin): void {
        if (this.plugins.has(id)) {
            throw new DuplicatePluginError(id);
        }

        this.plugins.set(id, plugin);
    }

    public getPlugin<T = unknown>(id: string): T {
        const plugin = this.plugins.get(id);
        if (!plugin) {
            throw new PluginNotFoundError(id);
        }

        return plugin.api as T;
    }

    public hasPlugin(id: string): boolean {
        return this.plugins.has(id);
    }
}
