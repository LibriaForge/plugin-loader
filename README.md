# @libria/plugin-loader

A simple, type-safe plugin loader for Node.js applications. Supports both ESM and CommonJS plugins with glob pattern discovery.

## Installation

```bash
npm install @libria/plugin-loader
```

## Quick Start

### 1. Create a Plugin

Create a `plugin.json` manifest in your plugin directory:

```json
{
  "name": "my-plugin",
  "pluginType": "greeting",
  "module": "./dist/index.mjs"
}
```

Create the plugin module:

```typescript
// src/index.ts
import { definePlugin } from '@libria/plugin-loader';

export default definePlugin('greeting', {
  sayHello(name: string) {
    return `Hello, ${name}!`;
  }
});
```

### 2. Load Plugins

```typescript
import { findPlugins, loadPlugin, loadAllPlugins } from '@libria/plugin-loader';

// Load all plugins from a directory
const plugins = await loadAllPlugins('./plugins', 'greeting');

for (const plugin of plugins) {
  console.log(plugin.api.sayHello('World'));
}
```

## API

### `definePlugin<T>(pluginType, api, name?)`

Helper function to create a type-safe plugin export.

```typescript
import { definePlugin } from '@libria/plugin-loader';

export default definePlugin('my-type', {
  myMethod() {
    return 'Hello!';
  }
});
```

### `findPlugins(pattern, pluginType?)`

Discovers plugins by scanning directories for `plugin.json` manifests.

```typescript
import { findPlugins } from '@libria/plugin-loader';

// Simple directory path (scans one level deep)
const manifests = await findPlugins('./plugins');

// Glob pattern
const manifests = await findPlugins('./plugins/*-plugin');

// Recursive glob
const manifests = await findPlugins('./plugins/**/dist');

// Filter by plugin type
const manifests = await findPlugins('./plugins', 'greeting');
```

### `loadPlugin<T>(manifest)`

Loads a single plugin from its manifest. Supports both ESM (`module`) and CommonJS (`main`) entry points.

```typescript
import { findPlugins, loadPlugin } from '@libria/plugin-loader';

const [manifest] = await findPlugins('./plugins/my-plugin');
const plugin = await loadPlugin<{ sayHello: (name: string) => string }>(manifest);

console.log(plugin.api.sayHello('World'));
```

### `loadAllPlugins<T>(pattern, pluginType?)`

Convenience function that combines `findPlugins` and `loadPlugin`. Discovers and loads all matching plugins.

```typescript
import { loadAllPlugins } from '@libria/plugin-loader';

const plugins = await loadAllPlugins<{ greet: () => string }>(
  './plugins/*-plugin',
  'greeting'
);

for (const plugin of plugins) {
  console.log(plugin.api.greet());
}
```

## Plugin Manifest

The `plugin.json` file defines plugin metadata:

| Field        | Type   | Required | Description                          |
|--------------|--------|----------|--------------------------------------|
| `name`       | string | Yes      | Unique plugin identifier             |
| `pluginType` | string | Yes      | Plugin category/type for filtering   |
| `module`     | string | No       | ESM entry point (relative path)      |
| `main`       | string | No       | CommonJS entry point (relative path) |
| `types`      | string | No       | TypeScript declaration file          |

At least one of `module` or `main` must be specified.

### ESM Plugin Example

```
my-plugin/
  plugin.json
  dist/
    index.mjs
```

```json
{
  "name": "my-plugin",
  "pluginType": "feature",
  "module": "./dist/index.mjs"
}
```

### CommonJS Plugin Example

```
my-plugin/
  plugin.json
  dist/
    index.cjs
```

```json
{
  "name": "my-plugin",
  "pluginType": "feature",
  "main": "./dist/index.cjs"
}
```

### Nested Manifest (dist folder)

You can place `plugin.json` inside the `dist` folder and use glob patterns to discover it:

```
my-plugin/
  dist/
    plugin.json
    index.mjs
```

```typescript
// Discover plugins with manifest in dist/
const plugins = await loadAllPlugins('./plugins/*/dist');
```

## Types

### `LibriaPlugin<T>`

```typescript
interface LibriaPlugin<T = unknown> {
  readonly pluginType: string;
  readonly name?: string;
  readonly api: T;
}
```

### `PluginManifest`

```typescript
interface PluginManifest {
  readonly name: string;
  readonly pluginType: string;
  readonly main?: string;
  readonly module?: string;
  readonly types?: string;
  readonly __dir: string; // Resolved absolute path
}
```

## Error Handling

The library throws specific errors for common issues:

- **`PluginLoadError`** - Failed to load the plugin module
- **`PluginInvalidExportError`** - Plugin export is not a valid object
- **`PluginTypeMismatchError`** - Plugin type doesn't match manifest

```typescript
import { loadPlugin, PluginTypeMismatchError } from '@libria/plugin-loader';

try {
  const plugin = await loadPlugin(manifest);
} catch (error) {
  if (error instanceof PluginTypeMismatchError) {
    console.error(`Type mismatch: expected ${error.expected}, got ${error.actual}`);
  }
}
```

## License

MIT
