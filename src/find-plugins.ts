import path from 'path';

import fg from 'fast-glob';
import fs from 'fs-extra';

import { PluginManifest } from './types';

export async function findPlugins(pattern: string, pluginType?: string): Promise<PluginManifest[]> {
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
                __dir: dir,
            });
        }
    } else {
        // Simple directory path - check if it exists
        if (!(await fs.pathExists(pattern))) return [];

        // First, check if the directory itself is a plugin (has plugin.json)
        const directManifestPath = path.join(pattern, 'plugin.json');
        if (await fs.pathExists(directManifestPath)) {
            const raw = await fs.readJson(directManifestPath);
            if (!pluginType || raw.pluginType === pluginType) {
                manifests.push({
                    ...raw,
                    __dir: path.resolve(pattern),
                });
            }
            return manifests;
        }

        // Otherwise, scan subdirectories for plugins
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
                __dir: fullPath,
            });
        }
    }

    return manifests;
}
