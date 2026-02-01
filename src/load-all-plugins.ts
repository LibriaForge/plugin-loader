import {LibriaPlugin} from "./types";
import {findPlugins} from "./find-plugins";
import {loadPlugin} from "./load-plugin";

export async function loadAllPlugins<T = unknown>(
    pattern: string,
    pluginType?: string
): Promise<LibriaPlugin<T>[]> {
    const manifests = await findPlugins(pattern, pluginType);
    const plugins: LibriaPlugin<T>[] = [];

    for (const manifest of manifests) {
        const plugin = await loadPlugin<T>(manifest);
        plugins.push(plugin);
    }

    return plugins;
}
