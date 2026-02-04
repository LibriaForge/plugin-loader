import { FSWatcher, watch } from 'chokidar';

import { DefaultPluginContext } from './default-plugin-context';
import { findPlugins } from './find-plugins';
import { topologicalSort } from './helpers';
import { loadPlugin, clearPluginCache } from './load-plugin';
import {
    ManifestNotFoundError,
    PluginManifest,
    PluginMetadata,
    PluginNotFoundError,
} from './types';

function manifestToMetadata(manifest: PluginManifest): PluginMetadata {
    return {
        id: manifest.id,
        name: manifest.name,
        pluginType: manifest.pluginType,
        version: manifest.version,
        description: manifest.description,
        dependencies: manifest.dependencies,
        dir: manifest.__dir,
    };
}

export class PluginManager {
    private readonly context: DefaultPluginContext;
    private manifests: Map<string, PluginManifest> = new Map();
    private watcher: FSWatcher | null = null;
    private watchPatterns: string[] = [];

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
            await this.loadSinglePlugin(manifest);
        }
    }

    private async loadSinglePlugin(manifest: PluginManifest): Promise<void> {
        const factory = await loadPlugin(manifest);
        const plugin = await Promise.resolve(factory.create(this.context));
        const metadata = manifestToMetadata(manifest);

        this.context.register(manifest.id, plugin, metadata);
        this.manifests.set(manifest.id, manifest);

        // Call onLoad lifecycle hook
        if (plugin.onLoad) {
            await Promise.resolve(plugin.onLoad());
        }
    }

    private async unloadSinglePlugin(id: string): Promise<void> {
        const plugin = this.context.getPluginInstance(id);

        // Call onUnload lifecycle hook before removing
        if (plugin?.onUnload) {
            await Promise.resolve(plugin.onUnload());
        }

        this.context.unregister(id);
        this.manifests.delete(id);
    }

    /**
     * Reload a specific plugin by ID (useful for hot-reload)
     */
    public async reloadPlugin(id: string): Promise<void> {
        const manifest = this.manifests.get(id);
        if (!manifest) {
            throw new PluginNotFoundError(id);
        }

        // Clear the module cache for this plugin
        clearPluginCache(manifest);

        // Unload the old plugin
        await this.unloadSinglePlugin(id);

        // Re-read the manifest from the plugin directory
        const [newManifest] = await findPlugins(manifest.__dir);
        if (!newManifest) {
            throw new ManifestNotFoundError(id, manifest.__dir);
        }

        // Load the new version
        await this.loadSinglePlugin(newManifest);
    }

    /**
     * Unload a plugin by ID
     */
    public async unloadPlugin(id: string): Promise<void> {
        if (!this.hasPlugin(id)) {
            throw new PluginNotFoundError(id);
        }
        await this.unloadSinglePlugin(id);
    }

    /**
     * Start watching for plugin file changes (hot-reload)
     * @param patterns Glob patterns to watch (same as loadPlugins)
     * @param onChange Callback when a plugin is reloaded
     */
    public async watch(
        patterns: string[],
        onChange?: (id: string, event: 'reload' | 'error', error?: Error) => void
    ): Promise<void> {
        if (this.watcher) {
            await this.stopWatching();
        }

        this.watchPatterns = patterns;

        // Get all plugin directories to watch
        const dirsToWatch: string[] = [];
        for (const [, manifest] of this.manifests) {
            dirsToWatch.push(manifest.__dir);
        }

        if (dirsToWatch.length === 0) {
            return;
        }

        this.watcher = watch(dirsToWatch, {
            ignoreInitial: true,
            awaitWriteFinish: {
                stabilityThreshold: 100,
                pollInterval: 50,
            },
        });

        this.watcher.on('change', async (filePath: string) => {
            // Find which plugin this file belongs to
            for (const [id, manifest] of this.manifests) {
                if (filePath.startsWith(manifest.__dir)) {
                    try {
                        await this.reloadPlugin(id);
                        onChange?.(id, 'reload');
                    } catch (err) {
                        onChange?.(
                            id,
                            'error',
                            err instanceof Error ? err : new Error(String(err))
                        );
                    }
                    break;
                }
            }
        });
    }

    /**
     * Stop watching for file changes
     */
    public async stopWatching(): Promise<void> {
        if (this.watcher) {
            await this.watcher.close();
            this.watcher = null;
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
     * Get all loaded plugin IDs
     */
    public getPluginIds(): string[] {
        return this.context.getPluginIds();
    }

    /**
     * Get metadata for a specific plugin
     */
    public getPluginMetadata(id: string): PluginMetadata | undefined {
        return this.context.getPluginMetadata(id);
    }

    /**
     * Get all plugins of a specific type
     */
    public getPluginsByType(pluginType: string): PluginMetadata[] {
        return this.context.getPluginsByType(pluginType);
    }

    /**
     * Get all loaded plugin metadata
     */
    public getAllMetadata(): PluginMetadata[] {
        return this.context.getAllMetadata();
    }

    /**
     * Get the plugin context (for advanced use cases)
     */
    public getContext(): DefaultPluginContext {
        return this.context;
    }

    /**
     * Shutdown the plugin manager - unloads all plugins and stops watching
     */
    public async shutdown(): Promise<void> {
        await this.stopWatching();

        // Unload plugins in reverse order (dependents before dependencies)
        const ids = [...this.manifests.keys()].reverse();
        for (const id of ids) {
            await this.unloadSinglePlugin(id);
        }
    }
}
