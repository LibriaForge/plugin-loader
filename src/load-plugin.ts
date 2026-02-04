import { createRequire } from 'node:module';
import path from 'path';
import { pathToFileURL } from 'url';

import { PluginFactory, PluginInvalidExportError, PluginLoadError, PluginManifest } from './types';

const require = createRequire(import.meta.url);

function isPluginFactory(obj: unknown): obj is PluginFactory {
    return (
        typeof obj === 'object' &&
        obj !== null &&
        'id' in obj &&
        'pluginType' in obj &&
        'create' in obj &&
        typeof (obj as PluginFactory).create === 'function'
    );
}

export async function loadPlugin<T = unknown>(manifest: PluginManifest): Promise<PluginFactory<T>> {
    let mod: unknown;
    let lastError: unknown;

    // 1. Try ESM first
    if (manifest.module) {
        try {
            const esmPath = path.resolve(manifest.__dir, manifest.module);
            const fileUrl = pathToFileURL(esmPath).href;
            // Add timestamp to bust ESM cache for hot-reload
            mod = await import(`${fileUrl}?t=${Date.now()}`);
        } catch (err) {
            lastError = err;
        }
    }

    // 2. Fallback to CJS
    if (!mod && manifest.main) {
        try {
            const cjsPath = path.resolve(manifest.__dir, manifest.main);
            // Clear CJS cache before requiring
            delete require.cache[require.resolve(cjsPath)];
            mod = require(cjsPath);
        } catch (err) {
            lastError = err;
        }
    }

    if (!mod) {
        throw new PluginLoadError(manifest.id, lastError);
    }

    // 3. Normalize export
    const moduleWithDefault = mod as { default?: unknown };
    const factory = (moduleWithDefault.default ?? mod) as PluginFactory<T>;

    if (!isPluginFactory(factory)) {
        throw new PluginInvalidExportError(manifest.id);
    }

    return factory;
}

/**
 * Clear the module cache for a plugin (used for hot-reload)
 */
export function clearPluginCache(manifest: PluginManifest): void {
    // Clear CJS cache
    if (manifest.main) {
        const cjsPath = path.resolve(manifest.__dir, manifest.main);
        try {
            delete require.cache[require.resolve(cjsPath)];
        } catch {
            // Ignore if not in cache
        }
    }

    // ESM cache is handled by timestamp query param in loadPlugin
}
