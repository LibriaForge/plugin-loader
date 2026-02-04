import semver from 'semver';

import {
    CircularDependencyError,
    DependencyNotFoundError,
    PluginManifest,
    VersionMismatchError,
} from '../types';

export function topologicalSort(packages: PluginManifest[]): PluginManifest[] {
    const packageMap = new Map(packages.map(pkg => [pkg.id, pkg]));
    const sorted: PluginManifest[] = [];
    const visiting = new Set<string>();
    const visited = new Set<string>();

    function visit(id: string, requiredVersion?: string, path: string[] = []): void {
        if (visited.has(id)) {
            // Still need to validate version even if already visited
            if (requiredVersion) {
                const pkg = packageMap.get(id);
                if (pkg && !semver.satisfies(pkg.version, requiredVersion)) {
                    throw new VersionMismatchError(
                        id,
                        pkg.version,
                        requiredVersion,
                        path[path.length - 1]
                    );
                }
            }
            return;
        }

        if (visiting.has(id)) {
            // Circular dependency detected
            const cycle = [...path, id].slice(path.indexOf(id));
            throw new CircularDependencyError(cycle);
        }

        const pkg = packageMap.get(id);
        if (!pkg) {
            throw new DependencyNotFoundError(id, path[path.length - 1]);
        }

        // Validate version requirement
        if (requiredVersion && !semver.satisfies(pkg.version, requiredVersion)) {
            throw new VersionMismatchError(id, pkg.version, requiredVersion, path[path.length - 1]);
        }

        visiting.add(id);

        // Visit all dependencies first
        if (pkg.dependencies) {
            for (const dep of pkg.dependencies) {
                visit(dep.id, dep.version, [...path, id]);
            }
        }

        visiting.delete(id);
        visited.add(id);
        sorted.push(pkg);
    }

    // Visit all packages
    for (const pkg of packages) {
        visit(pkg.id);
    }

    return sorted;
}
