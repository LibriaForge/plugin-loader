import {LibriaPlugin} from "./types";

export function definePlugin<T>(
    pluginType: string,
    api: T,
    name: string
): LibriaPlugin<T> {
    return {
        pluginType: pluginType,
        name,
        api
    };
}