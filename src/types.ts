export interface LibriaPlugin<T = unknown> {
    api: T;
}

export interface PluginFactory<T = unknown> {
    readonly id: string;
    readonly pluginType: string;
    readonly name?: string;

    create<C extends PluginContext>(ctx: C): LibriaPlugin<T>;
}

export interface PluginContext {
    getPlugin<T = unknown>(id: string): T;
    hasPlugin(id: string): boolean;
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

        this.id = id;
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
