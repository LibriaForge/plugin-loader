import { describe, expect, it } from 'vitest';

import {
    CircularDependencyError,
    DependencyNotFoundError,
    DuplicatePluginError,
    ManifestNotFoundError,
    PluginInvalidExportError,
    PluginLoadError,
    PluginNotFoundError,
    PluginTypeMismatchError,
    VersionMismatchError,
} from '../src';

describe('Error classes', () => {
    describe('PluginLoadError', () => {
        it('creates error with plugin name and cause', () => {
            const cause = new Error('Module not found');
            const error = new PluginLoadError('my-plugin', cause);

            expect(error).toBeInstanceOf(Error);
            expect(error).toBeInstanceOf(PluginLoadError);
            expect(error.name).toBe('PluginLoadError');
            expect(error.pluginName).toBe('my-plugin');
            expect(error.cause).toBe(cause);
            expect(error.message).toContain('my-plugin');
            expect(error.message).toContain('Module not found');
        });

        it('handles non-Error cause', () => {
            const error = new PluginLoadError('my-plugin', 'string error');

            expect(error.cause).toBe('string error');
            expect(error.message).toContain('string error');
        });

        it('handles undefined cause', () => {
            const error = new PluginLoadError('my-plugin', undefined);

            expect(error.cause).toBeUndefined();
        });
    });

    describe('PluginInvalidExportError', () => {
        it('creates error with plugin name', () => {
            const error = new PluginInvalidExportError('bad-plugin');

            expect(error).toBeInstanceOf(Error);
            expect(error).toBeInstanceOf(PluginInvalidExportError);
            expect(error.name).toBe('PluginInvalidExportError');
            expect(error.pluginName).toBe('bad-plugin');
            expect(error.message).toContain('bad-plugin');
            expect(error.message).toContain('invalid export');
        });
    });

    describe('PluginTypeMismatchError', () => {
        it('creates error with plugin name and types', () => {
            const error = new PluginTypeMismatchError('my-plugin', 'expected-type', 'actual-type');

            expect(error).toBeInstanceOf(Error);
            expect(error).toBeInstanceOf(PluginTypeMismatchError);
            expect(error.name).toBe('PluginTypeMismatchError');
            expect(error.pluginName).toBe('my-plugin');
            expect(error.expected).toBe('expected-type');
            expect(error.actual).toBe('actual-type');
            expect(error.message).toContain('my-plugin');
            expect(error.message).toContain('expected-type');
            expect(error.message).toContain('actual-type');
        });
    });

    describe('DuplicatePluginError', () => {
        it('creates error with plugin id', () => {
            const error = new DuplicatePluginError('duplicate-id');

            expect(error).toBeInstanceOf(Error);
            expect(error).toBeInstanceOf(DuplicatePluginError);
            expect(error.id).toBe('duplicate-id');
            expect(error.message).toContain('duplicate-id');
            expect(error.message).toContain('Duplicate');
        });
    });

    describe('PluginNotFoundError', () => {
        it('creates error with plugin id', () => {
            const error = new PluginNotFoundError('missing-plugin');

            expect(error).toBeInstanceOf(Error);
            expect(error).toBeInstanceOf(PluginNotFoundError);
            expect(error.name).toBe('PluginNotFoundError');
            expect(error.id).toBe('missing-plugin');
            expect(error.message).toContain('missing-plugin');
            expect(error.message).toContain('not found');
        });
    });

    describe('ManifestNotFoundError', () => {
        it('creates error with plugin id and directory', () => {
            const error = new ManifestNotFoundError('my-plugin', '/path/to/plugin');

            expect(error).toBeInstanceOf(Error);
            expect(error).toBeInstanceOf(ManifestNotFoundError);
            expect(error.name).toBe('ManifestNotFoundError');
            expect(error.pluginId).toBe('my-plugin');
            expect(error.dir).toBe('/path/to/plugin');
            expect(error.message).toContain('my-plugin');
            expect(error.message).toContain('/path/to/plugin');
            expect(error.message).toContain('Manifest not found');
        });
    });

    describe('CircularDependencyError', () => {
        it('creates error with cycle path', () => {
            const cycle = ['plugin-a', 'plugin-b', 'plugin-c', 'plugin-a'];
            const error = new CircularDependencyError(cycle);

            expect(error).toBeInstanceOf(Error);
            expect(error).toBeInstanceOf(CircularDependencyError);
            expect(error.name).toBe('CircularDependencyError');
            expect(error.cycle).toEqual(cycle);
            expect(error.message).toContain('Circular dependency');
            expect(error.message).toContain('plugin-a');
            expect(error.message).toContain('plugin-b');
            expect(error.message).toContain('plugin-c');
            expect(error.message).toContain('->');
        });

        it('handles simple two-node cycle', () => {
            const cycle = ['a', 'b', 'a'];
            const error = new CircularDependencyError(cycle);

            expect(error.cycle).toEqual(cycle);
            expect(error.message).toBe('Circular dependency detected: a -> b -> a');
        });
    });

    describe('DependencyNotFoundError', () => {
        it('creates error with dependency id only', () => {
            const error = new DependencyNotFoundError('missing-dep');

            expect(error).toBeInstanceOf(Error);
            expect(error).toBeInstanceOf(DependencyNotFoundError);
            expect(error.name).toBe('DependencyNotFoundError');
            expect(error.dependencyId).toBe('missing-dep');
            expect(error.requestedBy).toBeUndefined();
            expect(error.message).toContain('missing-dep');
            expect(error.message).toContain('not found');
        });

        it('creates error with dependency id and requester', () => {
            const error = new DependencyNotFoundError('missing-dep', 'parent-plugin');

            expect(error.dependencyId).toBe('missing-dep');
            expect(error.requestedBy).toBe('parent-plugin');
            expect(error.message).toContain('missing-dep');
            expect(error.message).toContain('parent-plugin');
            expect(error.message).toContain('required by');
        });
    });

    describe('VersionMismatchError', () => {
        it('creates error with version details only', () => {
            const error = new VersionMismatchError('my-package', '1.0.0', '^2.0.0');

            expect(error).toBeInstanceOf(Error);
            expect(error).toBeInstanceOf(VersionMismatchError);
            expect(error.name).toBe('VersionMismatchError');
            expect(error.packageId).toBe('my-package');
            expect(error.actualVersion).toBe('1.0.0');
            expect(error.requiredVersion).toBe('^2.0.0');
            expect(error.requestedBy).toBeUndefined();
            expect(error.message).toContain('my-package');
            expect(error.message).toContain('1.0.0');
            expect(error.message).toContain('^2.0.0');
        });

        it('creates error with version details and requester', () => {
            const error = new VersionMismatchError('my-package', '1.0.0', '^2.0.0', 'parent-plugin');

            expect(error.packageId).toBe('my-package');
            expect(error.actualVersion).toBe('1.0.0');
            expect(error.requiredVersion).toBe('^2.0.0');
            expect(error.requestedBy).toBe('parent-plugin');
            expect(error.message).toContain('parent-plugin');
            expect(error.message).toContain('required by');
        });
    });

    describe('error inheritance', () => {
        it('all errors extend Error', () => {
            const errors = [
                new PluginLoadError('test', null),
                new PluginInvalidExportError('test'),
                new PluginTypeMismatchError('test', 'a', 'b'),
                new DuplicatePluginError('test'),
                new PluginNotFoundError('test'),
                new ManifestNotFoundError('test', '/path'),
                new CircularDependencyError(['a', 'b']),
                new DependencyNotFoundError('test'),
                new VersionMismatchError('test', '1.0.0', '2.0.0'),
            ];

            for (const error of errors) {
                expect(error).toBeInstanceOf(Error);
                expect(error.message).toBeDefined();
                expect(typeof error.message).toBe('string');
            }
        });

        it('all errors can be caught as Error', () => {
            const throwError = (error: Error): never => {
                throw error;
            };

            expect(() => throwError(new CircularDependencyError(['a']))).toThrow(Error);
            expect(() => throwError(new DependencyNotFoundError('a'))).toThrow(Error);
            expect(() => throwError(new VersionMismatchError('a', '1', '2'))).toThrow(Error);
        });
    });
});
