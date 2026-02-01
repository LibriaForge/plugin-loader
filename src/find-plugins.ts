import {PluginManifest} from "./types";
import fs from "fs-extra";
import path from "path";

export async function findPlugins(
    pluginsDir: string,
    pluginType?: string
): Promise<PluginManifest[]> {
    if (!(await fs.pathExists(pluginsDir))) return [];

    const entries = await fs.readdir(pluginsDir);
    const manifests: PluginManifest[] = [];

    for (const entry of entries) {
        const fullPath = path.join(pluginsDir, entry);
        const stat = await fs.stat(fullPath);

        if (!stat.isDirectory()) continue;

        const manifestPath = path.join(fullPath, 'plugin.json');
        if (!(await fs.pathExists(manifestPath))) continue;

        const raw = await fs.readJson(manifestPath);

        if (pluginType && raw.pluginType !== pluginType) continue;

        manifests.push({
            ...raw,
            __dir: fullPath
        });
    }

    return manifests;
}