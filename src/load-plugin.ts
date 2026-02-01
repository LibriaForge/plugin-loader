import {
    LibriaPlugin,
    PluginManifest,
    PluginLoadError,
    PluginInvalidExportError,
    PluginTypeMismatchError
} from "./types";
import path from "path";
import {pathToFileURL} from "url";
import {createRequire} from "node:module";

const require = createRequire(import.meta.url);

export async function loadPlugin<T = unknown>(
    manifest: PluginManifest
): Promise<LibriaPlugin<T>> {
    let mod: any;
    let lastError: unknown;

    // 1️⃣ Try ESM first
    if (manifest.module) {
        try {
            const esmPath = path.resolve(manifest.__dir, manifest.module);
            mod = await import(pathToFileURL(esmPath).href);
        } catch (err) {
            lastError = err;
        }
    }

    // 2️⃣ Fallback to CJS
    if (!mod && manifest.main) {
        try {
            const cjsPath = path.resolve(manifest.__dir, manifest.main);
            mod = require(cjsPath);
        } catch (err) {
            lastError = err;
        }
    }

    if (!mod) {
        throw new PluginLoadError(manifest.name, lastError);
    }

    // 3️⃣ Normalize export
    const plugin = (mod.default ?? mod) as LibriaPlugin<T>;

    if (!plugin || typeof plugin !== 'object') {
        throw new PluginInvalidExportError(manifest.name);
    }

    if (plugin.pluginType !== manifest.pluginType) {
        throw new PluginTypeMismatchError(
            manifest.name,
            manifest.pluginType,
            plugin.pluginType
        );
    }

    return plugin;
}