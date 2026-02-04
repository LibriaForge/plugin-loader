# @libria/plugin-loader

A TypeScript-first plugin system for Node.js applications with dependency resolution, lifecycle hooks, and hot-reloading.

## Features

- **Dependency Resolution** - Plugins can depend on other plugins with semver version requirements
- **Circular Dependency Detection** - Throws clear errors when circular dependencies are found
- **Async Plugin Initialization** - Factories can be async for loading configs, connecting to databases, etc.
- **Lifecycle Hooks** - `onLoad` and `onUnload` hooks for setup and cleanup
- **Hot-Reloading** - Watch for file changes and reload plugins on the fly
- **Plugin Queries** - Find plugins by type, get metadata, list all loaded plugins
- **TypeScript First** - Full type safety with generics for plugin APIs
- **ESM & CJS Support** - Load plugins in either module format

![Version](https://img.shields.io/npm/v/@libria/plugin-loader)
![License](https://img.shields.io/npm/l/@libria/plugin-loader)

## Installation

```bash
npm install @libria/plugin-loader
```

## Quick Start

### 1. Define a Plugin

Create a plugin with `definePlugin`:

```typescript
// plugins/greeter/src/index.ts
import { definePlugin } from '@libria/plugin-loader';

interface GreeterAPI {
    greet(name: string): string;
}

export default definePlugin<GreeterAPI>({
    id: 'greeter',
    pluginType: 'util',

    create(ctx) {
        return {
            api: {
                greet(name) {
                    return `Hello, ${name}!`;
                }
            }
        };
    }
});
```

### 2. Create a Plugin Manifest

Each plugin needs a `plugin.json` in its directory:

```json
{
    "id": "greeter",
    "name": "Greeter Plugin",
    "pluginType": "util",
    "version": "1.0.0",
    "module": "./dist/index.mjs"
}
```

### 3. Load and Use Plugins

```typescript
import { PluginManager } from '@libria/plugin-loader';

const manager = new PluginManager();

// Load all plugins from a directory
await manager.loadPlugins(['./plugins/*']);

// Use a plugin
const greeter = manager.getPlugin<GreeterAPI>('greeter');
console.log(greeter.greet('World')); // "Hello, World!"
```

## Plugin Manifest

The `plugin.json` file defines your plugin's metadata:

```json
{
    "id": "my-plugin",
    "name": "My Plugin",
    "pluginType": "feature",
    "version": "1.0.0",
    "description": "Optional description",
    "module": "./dist/index.mjs",
    "main": "./dist/index.cjs",
    "dependencies": [
        { "id": "other-plugin", "version": "^1.0.0" }
    ]
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `id` | Yes | Unique identifier for the plugin |
| `pluginType` | Yes | Category/type of the plugin (for queries) |
| `version` | Yes | Semver version string |
| `name` | No | Human-readable name |
| `description` | No | Plugin description |
| `module` | No* | Path to ESM entry point |
| `main` | No* | Path to CJS entry point |
| `dependencies` | No | Array of plugin dependencies |

*At least one of `module` or `main` is required.

## Plugin Dependencies

Plugins can depend on other plugins. Dependencies are loaded first, and the loading order is determined by topological sort.

```json
{
    "id": "plugin-a",
    "pluginType": "feature",
    "version": "1.0.0",
    "module": "./dist/index.mjs",
    "dependencies": [
        { "id": "plugin-b", "version": "^1.0.0" },
        { "id": "plugin-c", "version": ">=2.0.0" }
    ]
}
```

Access dependencies in your plugin via the context:

```typescript
export default definePlugin<MyAPI>({
    id: 'plugin-a',
    pluginType: 'feature',

    create(ctx) {
        // Dependencies are guaranteed to be loaded
        const pluginB = ctx.getPlugin<PluginBAPI>('plugin-b');
        const pluginC = ctx.getPlugin<PluginCAPI>('plugin-c');

        return {
            api: {
                doSomething() {
                    return pluginB.getValue() + pluginC.calculate();
                }
            }
        };
    }
});
```

### Version Requirements

Dependencies use semver ranges:

- `"1.0.0"` - Exact version
- `"^1.0.0"` - Compatible with 1.x.x
- `"~1.0.0"` - Compatible with 1.0.x
- `">=1.0.0 <2.0.0"` - Range
- `"*"` - Any version

## Async Initialization

Plugin factories can be async for loading configs, connecting to services, etc:

```typescript
export default definePlugin<DatabaseAPI>({
    id: 'database',
    pluginType: 'service',

    async create(ctx) {
        const config = await loadConfig();
        const connection = await connectToDatabase(config);

        return {
            api: {
                query: (sql) => connection.query(sql),
                close: () => connection.close()
            }
        };
    }
});
```

## Lifecycle Hooks

Plugins can implement lifecycle hooks for setup and cleanup:

```typescript
export default definePlugin<MyAPI>({
    id: 'my-plugin',
    pluginType: 'feature',

    create(ctx) {
        let intervalId: NodeJS.Timeout;

        return {
            api: {
                // ... your API
            },

            onLoad() {
                // Called after plugin is registered
                console.log('Plugin loaded!');
                intervalId = setInterval(() => {
                    console.log('heartbeat');
                }, 1000);
            },

            async onUnload() {
                // Called before plugin is unloaded
                // Can be async for cleanup
                clearInterval(intervalId);
                await saveState();
                console.log('Plugin unloaded!');
            }
        };
    }
});
```

## Hot-Reloading

Reload plugins without restarting your application:

```typescript
const manager = new PluginManager();
await manager.loadPlugins(['./plugins/*']);

// Manual reload
await manager.reloadPlugin('my-plugin');

// Watch for file changes
await manager.watch(['./plugins/*'], (id, event, error) => {
    if (event === 'reload') {
        console.log(`Plugin ${id} reloaded successfully`);
    }
    if (event === 'error') {
        console.error(`Failed to reload ${id}:`, error);
    }
});

// Stop watching
await manager.stopWatching();
```

## Plugin Queries

Query loaded plugins by type or get metadata:

```typescript
// Get all loaded plugin IDs
const ids = manager.getPluginIds();
// ['greeter', 'database', 'logger']

// Check if a plugin is loaded
if (manager.hasPlugin('greeter')) {
    // ...
}

// Get metadata for a plugin
const meta = manager.getPluginMetadata('greeter');
// { id: 'greeter', name: 'Greeter Plugin', version: '1.0.0', ... }

// Get all plugins of a specific type
const services = manager.getPluginsByType('service');
// [{ id: 'database', ... }, { id: 'cache', ... }]

// Get all metadata
const allMeta = manager.getAllMetadata();
```

## Graceful Shutdown

Properly unload all plugins (calls `onUnload` hooks in reverse order):

```typescript
process.on('SIGTERM', async () => {
    await manager.shutdown();
    process.exit(0);
});
```

## Error Handling

The library provides typed errors for common scenarios:

```typescript
import {
    PluginLoadError,           // Failed to load plugin module
    PluginInvalidExportError,  // Plugin doesn't export a valid factory
    PluginNotFoundError,       // Plugin not found (getPlugin, reload, unload)
    ManifestNotFoundError,     // plugin.json not found during reload
    DuplicatePluginError,      // Attempting to register same ID twice
    CircularDependencyError,   // Circular dependency detected
    DependencyNotFoundError,   // Required dependency not found
    VersionMismatchError,      // Dependency version doesn't match
} from '@libria/plugin-loader';

try {
    await manager.loadPlugins(['./plugins/*']);
} catch (err) {
    if (err instanceof CircularDependencyError) {
        console.error('Circular dependency:', err.cycle.join(' -> '));
    }
    if (err instanceof VersionMismatchError) {
        console.error(
            `${err.packageId}@${err.actualVersion} doesn't satisfy ${err.requiredVersion}`
        );
    }
}

try {
    await manager.reloadPlugin('my-plugin');
} catch (err) {
    if (err instanceof PluginNotFoundError) {
        console.error(`Plugin ${err.id} is not loaded`);
    }
    if (err instanceof ManifestNotFoundError) {
        console.error(`Manifest missing for ${err.pluginId} in ${err.dir}`);
    }
}
```

## API Reference

### `PluginManager`

| Method | Description |
|--------|-------------|
| `loadPlugins(patterns: string[])` | Load plugins from glob patterns |
| `getPlugin<T>(id: string): T` | Get a plugin's API by ID |
| `hasPlugin(id: string): boolean` | Check if a plugin is loaded |
| `getPluginIds(): string[]` | Get all loaded plugin IDs |
| `getPluginMetadata(id: string)` | Get metadata for a plugin |
| `getPluginsByType(type: string)` | Get all plugins of a type |
| `getAllMetadata()` | Get all plugin metadata |
| `reloadPlugin(id: string)` | Hot-reload a specific plugin |
| `unloadPlugin(id: string)` | Unload a specific plugin |
| `watch(patterns, callback)` | Watch for file changes |
| `stopWatching()` | Stop watching for changes |
| `shutdown()` | Unload all plugins and cleanup |
| `getContext()` | Get the internal plugin context |

### `definePlugin<T>(factory: PluginFactory<T>)`

Helper function for defining plugins with proper typing.

### `PluginContext`

Passed to the `create` function:

| Method | Description |
|--------|-------------|
| `getPlugin<T>(id: string): T` | Get another plugin's API |
| `hasPlugin(id: string): boolean` | Check if a plugin is loaded |

### `LibriaPlugin<T>`

The return type of `create`:

```typescript
interface LibriaPlugin<T> {
    api: T;
    onLoad?(): void | Promise<void>;
    onUnload?(): void | Promise<void>;
}
```

## Directory Structure

Recommended project structure:

```
my-app/
├── src/
│   └── index.ts
├── plugins/
│   ├── greeter/
│   │   ├── plugin.json
│   │   ├── src/
│   │   │   └── index.ts
│   │   └── dist/
│   │       └── index.mjs
│   └── database/
│       ├── plugin.json
│       ├── src/
│       │   └── index.ts
│       └── dist/
│           └── index.mjs
└── package.json
```

## License

MIT
