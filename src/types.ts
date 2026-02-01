export interface LibriaPlugin<T = unknown> {
    readonly pluginType: string;
    readonly name?: string;
    readonly api: T;
}

export interface PluginManifest {
    readonly name: string;
    readonly pluginType: string;

    readonly main?: string;    // cjs
    readonly module?: string;  // esm
    readonly types?: string;

    // resolved absolute path to the plugin folder
    readonly __dir: string;
}

// Plugin Errors

export class PluginLoadError extends Error {
    readonly pluginName: string;
    readonly cause: unknown;

    constructor(pluginName: string, cause: unknown) {
        super(`Failed to load plugin "${pluginName}".\n${String(cause)}`);
        this.name = 'PluginLoadError';
        this.pluginName = pluginName;
        this.cause = cause;
    }
}

export class PluginInvalidExportError extends Error {
    readonly pluginName: string;

    constructor(pluginName: string) {
        super(`Plugin "${pluginName}" has invalid export`);
        this.name = 'PluginInvalidExportError';
        this.pluginName = pluginName;
    }
}

export class PluginTypeMismatchError extends Error {
    readonly pluginName: string;
    readonly expected: string;
    readonly actual: string;

    constructor(pluginName: string, expected: string, actual: string) {
        super(
            `Plugin type mismatch for "${pluginName}": ` +
            `"${actual}" !== "${expected}"`
        );
        this.name = 'PluginTypeMismatchError';
        this.pluginName = pluginName;
        this.expected = expected;
        this.actual = actual;
    }
}