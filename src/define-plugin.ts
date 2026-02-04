import { PluginFactory } from './types';

export function definePlugin<T>(factory: PluginFactory<T>): PluginFactory<T> {
    return factory;
}
