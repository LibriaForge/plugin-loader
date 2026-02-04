// Lifecycle hooks that plugins can implement
export interface PluginLifecycle {
    /** Called after the plugin is registered and ready to use */
    onLoad?(): void | Promise<void>;
    /** Called before the plugin is unloaded (for hot-reload or shutdown) */
    onUnload?(): void | Promise<void>;
}

export interface LibriaPlugin<T = unknown> extends PluginLifecycle {
    api: T;
}

export interface PluginFactory<T = unknown> {
    readonly id: string;
    readonly pluginType: string;
    readonly name?: string;

    /** Create the plugin instance. Can be sync or async. */
    create<C extends PluginContext>(ctx: C): LibriaPlugin<T> | Promise<LibriaPlugin<T>>;
}

export interface PluginContext {
    getPlugin<T = unknown>(id: string): T;
    hasPlugin(id: string): boolean;
}

/** Metadata stored for each loaded plugin */
export interface PluginMetadata {
    readonly id: string;
    readonly name?: string;
    readonly pluginType: string;
    readonly version: string;
    readonly description?: string;
    readonly dependencies?: { id: string; version: string }[];
    /** Absolute path to the plugin directory */
    readonly dir: string;
}

export interface PluginManifest {
    readonly id: string;
    readonly name?: string;
    readonly pluginType: string;
    readonly version: string; // Semver
    readonly description?: string;

    readonly main?: string; // cjs
    readonly module?: string; // esm
    readonly types?: string;

    readonly dependencies?: { id: string; version: string }[];
    // resolved absolute path to the plugin folder
    readonly __dir: string;
}

// Plugin Errors

export class PluginLoadError extends Error {
    public readonly pluginName: string;
    public readonly cause: unknown;

    constructor(pluginName: string, cause: unknown) {
        super(`Failed to load plugin "${pluginName}".\n${String(cause)}`);
        this.name = 'PluginLoadError';
        this.pluginName = pluginName;
        this.cause = cause;
    }
}

export class PluginInvalidExportError extends Error {
    public readonly pluginName: string;

    constructor(pluginName: string) {
        super(`Plugin "${pluginName}" has invalid export`);
        this.name = 'PluginInvalidExportError';
        this.pluginName = pluginName;
    }
}

export class PluginTypeMismatchError extends Error {
    public readonly pluginName: string;
    public readonly expected: string;
    public readonly actual: string;

    constructor(pluginName: string, expected: string, actual: string) {
        super(`Plugin type mismatch for "${pluginName}": ` + `"${actual}" !== "${expected}"`);
        this.name = 'PluginTypeMismatchError';
        this.pluginName = pluginName;
        this.expected = expected;
        this.actual = actual;
    }
}

export class DuplicatePluginError extends Error {
    public readonly id: string;

    constructor(id: string) {
        super(`Duplicate plugin "${id}"`);

        this.id = id;
    }
}

export class PluginNotFoundError extends Error {
    public readonly id: string;

    constructor(id: string) {
        super(`Plugin "${id}" not found`);
        this.name = 'PluginNotFoundError';
        this.id = id;
    }
}

export class ManifestNotFoundError extends Error {
    public readonly pluginId: string;
    public readonly dir: string;

    constructor(pluginId: string, dir: string) {
        super(`Manifest not found for plugin "${pluginId}" in "${dir}"`);
        this.name = 'ManifestNotFoundError';
        this.pluginId = pluginId;
        this.dir = dir;
    }
}

// Dependency Resolution Errors

export class CircularDependencyError extends Error {
    public readonly cycle: string[];

    constructor(cycle: string[]) {
        super(`Circular dependency detected: ${cycle.join(' -> ')}`);
        this.name = 'CircularDependencyError';
        this.cycle = cycle;
    }
}

export class DependencyNotFoundError extends Error {
    public readonly dependencyId: string;
    public readonly requestedBy?: string;

    constructor(dependencyId: string, requestedBy?: string) {
        const message = requestedBy
            ? `Dependency "${dependencyId}" not found (required by "${requestedBy}")`
            : `Dependency "${dependencyId}" not found`;
        super(message);
        this.name = 'DependencyNotFoundError';
        this.dependencyId = dependencyId;
        this.requestedBy = requestedBy;
    }
}

export class VersionMismatchError extends Error {
    public readonly packageId: string;
    public readonly actualVersion: string;
    public readonly requiredVersion: string;
    public readonly requestedBy?: string;

    constructor(
        packageId: string,
        actualVersion: string,
        requiredVersion: string,
        requestedBy?: string
    ) {
        const message = requestedBy
            ? `Version mismatch: ${packageId}@${actualVersion} does not satisfy ${requiredVersion} (required by "${requestedBy}")`
            : `Version mismatch: ${packageId}@${actualVersion} does not satisfy ${requiredVersion}`;
        super(message);
        this.name = 'VersionMismatchError';
        this.packageId = packageId;
        this.actualVersion = actualVersion;
        this.requiredVersion = requiredVersion;
        this.requestedBy = requestedBy;
    }
}
