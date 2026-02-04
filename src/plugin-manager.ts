import { DefaultPluginContext } from './default-plugin-context';
import { findPlugins } from './find-plugins';
import { topologicalSort } from './helpers';
import { loadPlugin } from './load-plugin';
import { PluginManifest } from './types';

export class PluginManager {
    private readonly context: DefaultPluginContext;

    public constructor() {
        this.context = new DefaultPluginContext();
    }

    public async loadPlugins(patterns: string[]): Promise<void> {
        const allManifests: PluginManifest[] = [];

        for (const pattern of patterns) {
            const manifests = await findPlugins(pattern);
            allManifests.push(...manifests);
        }

        // Sort the manifests so that the dependencies are loaded before their dependents
        const sortedManifests = topologicalSort(allManifests);

        for (const manifest of sortedManifests) {
            const factory = await loadPlugin(manifest);
            const plugin = factory.create(this.context);
            this.context.register(manifest.id, plugin);
        }
    }

    /**
     * Get a plugin's API by its id
     */
    public getPlugin<T = unknown>(id: string): T {
        return this.context.getPlugin<T>(id);
    }

    /**
     * Check if a plugin is loaded
     */
    public hasPlugin(id: string): boolean {
        return this.context.hasPlugin(id);
    }

    /**
     * Get the plugin context (for advanced use cases)
     */
    public getContext(): DefaultPluginContext {
        return this.context;
    }
}
