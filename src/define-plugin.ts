import {LibriaPlugin} from "./types";

export function definePlugin<T>(
    pluginType: string,
    name: string,
    api: T
): LibriaPlugin<T> {
    return {
        pluginType: pluginType,
        name,
        api
    };
}