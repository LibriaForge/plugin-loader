import {PluginManifest} from "./types";
import fs from "fs-extra";
import fg from "fast-glob";
import path from "path";

export async function findPlugins(
    pattern: string,
    pluginType?: string
): Promise<PluginManifest[]> {
    const manifests: PluginManifest[] = [];

    // Check if pattern is a glob pattern or a simple path
    const isGlob = pattern.includes('*') || pattern.includes('{') || pattern.includes('?');

    if (isGlob) {
        // Normalize path separators for fast-glob (it expects forward slashes)
        const normalizedPattern = pattern.replace(/\\/g, '/');

        // Use fast-glob to find all matching directories
        const pluginDirs = await fg(normalizedPattern, {
            onlyDirectories: true,
            absolute: true,
        });

        for (const dir of pluginDirs) {
            const manifestPath = path.join(dir, 'plugin.json');
            if (!(await fs.pathExists(manifestPath))) continue;

            const raw = await fs.readJson(manifestPath);

            if (pluginType && raw.pluginType !== pluginType) continue;

            manifests.push({
                ...raw,
                __dir: dir
            });
        }
    } else {
        // Original behavior for simple directory paths
        if (!(await fs.pathExists(pattern))) return [];

        const entries = await fs.readdir(pattern);

        for (const entry of entries) {
            const fullPath = path.join(pattern, entry);
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
    }

    return manifests;
}