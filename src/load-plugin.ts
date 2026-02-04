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
            mod = await import(pathToFileURL(esmPath).href);
        } catch (err) {
            lastError = err;
        }
    }

    // 2. Fallback to CJS
    if (!mod && manifest.main) {
        try {
            const cjsPath = path.resolve(manifest.__dir, manifest.main);
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
