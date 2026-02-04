import { describe, expect, it } from 'vitest';

import {
    CircularDependencyError,
    DependencyNotFoundError,
    PluginManifest,
    topologicalSort,
    VersionMismatchError,
} from '../src';

function createManifest(
    id: string,
    version: string,
    dependencies?: { id: string; version: string }[]
): PluginManifest {
    return {
        id,
        name: id,
        pluginType: 'test',
        version,
        module: './dist/index.mjs',
        dependencies,
        __dir: `/fake/path/${id}`,
    };
}

describe('topologicalSort', () => {
    describe('basic sorting', () => {
        it('returns empty array for empty input', () => {
            const result = topologicalSort([]);
            expect(result).toEqual([]);
        });

        it('returns single plugin unchanged', () => {
            const manifest = createManifest('plugin-a', '1.0.0');
            const result = topologicalSort([manifest]);
            expect(result).toEqual([manifest]);
        });

        it('returns independent plugins in order', () => {
            const a = createManifest('plugin-a', '1.0.0');
            const b = createManifest('plugin-b', '1.0.0');
            const c = createManifest('plugin-c', '1.0.0');

            const result = topologicalSort([a, b, c]);
            expect(result).toHaveLength(3);
            expect(result).toContain(a);
            expect(result).toContain(b);
            expect(result).toContain(c);
        });
    });

    describe('dependency ordering', () => {
        it('sorts dependencies before dependents (simple chain)', () => {
            const a = createManifest('plugin-a', '1.0.0', [{ id: 'plugin-b', version: '^1.0.0' }]);
            const b = createManifest('plugin-b', '1.0.0');

            const result = topologicalSort([a, b]);
            expect(result.indexOf(b)).toBeLessThan(result.indexOf(a));
        });

        it('sorts multi-level dependencies correctly', () => {
            // A depends on B, B depends on C
            const a = createManifest('plugin-a', '1.0.0', [{ id: 'plugin-b', version: '^1.0.0' }]);
            const b = createManifest('plugin-b', '1.0.0', [{ id: 'plugin-c', version: '^1.0.0' }]);
            const c = createManifest('plugin-c', '1.0.0');

            const result = topologicalSort([a, b, c]);

            // C should come before B, B should come before A
            expect(result.indexOf(c)).toBeLessThan(result.indexOf(b));
            expect(result.indexOf(b)).toBeLessThan(result.indexOf(a));
        });

        it('handles diamond dependencies', () => {
            // A depends on B and C, both B and C depend on D
            const a = createManifest('plugin-a', '1.0.0', [
                { id: 'plugin-b', version: '^1.0.0' },
                { id: 'plugin-c', version: '^1.0.0' },
            ]);
            const b = createManifest('plugin-b', '1.0.0', [{ id: 'plugin-d', version: '^1.0.0' }]);
            const c = createManifest('plugin-c', '1.0.0', [{ id: 'plugin-d', version: '^1.0.0' }]);
            const d = createManifest('plugin-d', '1.0.0');

            const result = topologicalSort([a, b, c, d]);

            // D should come before B and C, both B and C should come before A
            expect(result.indexOf(d)).toBeLessThan(result.indexOf(b));
            expect(result.indexOf(d)).toBeLessThan(result.indexOf(c));
            expect(result.indexOf(b)).toBeLessThan(result.indexOf(a));
            expect(result.indexOf(c)).toBeLessThan(result.indexOf(a));
        });

        it('handles multiple independent dependency chains', () => {
            // Chain 1: A -> B
            // Chain 2: C -> D
            const a = createManifest('plugin-a', '1.0.0', [{ id: 'plugin-b', version: '^1.0.0' }]);
            const b = createManifest('plugin-b', '1.0.0');
            const c = createManifest('plugin-c', '1.0.0', [{ id: 'plugin-d', version: '^1.0.0' }]);
            const d = createManifest('plugin-d', '1.0.0');

            const result = topologicalSort([a, b, c, d]);

            expect(result.indexOf(b)).toBeLessThan(result.indexOf(a));
            expect(result.indexOf(d)).toBeLessThan(result.indexOf(c));
        });
    });

    describe('circular dependency detection', () => {
        it('detects simple circular dependency (A -> B -> A)', () => {
            const a = createManifest('plugin-a', '1.0.0', [{ id: 'plugin-b', version: '^1.0.0' }]);
            const b = createManifest('plugin-b', '1.0.0', [{ id: 'plugin-a', version: '^1.0.0' }]);

            expect(() => topologicalSort([a, b])).toThrow(CircularDependencyError);
        });

        it('detects circular dependency in chain (A -> B -> C -> A)', () => {
            const a = createManifest('plugin-a', '1.0.0', [{ id: 'plugin-b', version: '^1.0.0' }]);
            const b = createManifest('plugin-b', '1.0.0', [{ id: 'plugin-c', version: '^1.0.0' }]);
            const c = createManifest('plugin-c', '1.0.0', [{ id: 'plugin-a', version: '^1.0.0' }]);

            expect(() => topologicalSort([a, b, c])).toThrow(CircularDependencyError);
        });

        it('provides cycle path in error', () => {
            const a = createManifest('plugin-a', '1.0.0', [{ id: 'plugin-b', version: '^1.0.0' }]);
            const b = createManifest('plugin-b', '1.0.0', [{ id: 'plugin-c', version: '^1.0.0' }]);
            const c = createManifest('plugin-c', '1.0.0', [{ id: 'plugin-a', version: '^1.0.0' }]);

            try {
                topologicalSort([a, b, c]);
                expect.fail('Should have thrown');
            } catch (err) {
                expect(err).toBeInstanceOf(CircularDependencyError);
                const error = err as CircularDependencyError;
                expect(error.cycle).toContain('plugin-a');
                expect(error.cycle).toContain('plugin-b');
                expect(error.cycle).toContain('plugin-c');
            }
        });

        it('detects self-referencing dependency', () => {
            const a = createManifest('plugin-a', '1.0.0', [{ id: 'plugin-a', version: '^1.0.0' }]);

            expect(() => topologicalSort([a])).toThrow(CircularDependencyError);
        });
    });

    describe('missing dependency detection', () => {
        it('throws DependencyNotFoundError for missing dependency', () => {
            const a = createManifest('plugin-a', '1.0.0', [
                { id: 'plugin-missing', version: '^1.0.0' },
            ]);

            expect(() => topologicalSort([a])).toThrow(DependencyNotFoundError);
        });

        it('provides dependency id in error', () => {
            const a = createManifest('plugin-a', '1.0.0', [
                { id: 'plugin-missing', version: '^1.0.0' },
            ]);

            try {
                topologicalSort([a]);
                expect.fail('Should have thrown');
            } catch (err) {
                expect(err).toBeInstanceOf(DependencyNotFoundError);
                const error = err as DependencyNotFoundError;
                expect(error.dependencyId).toBe('plugin-missing');
                expect(error.requestedBy).toBe('plugin-a');
            }
        });

        it('throws for deeply nested missing dependency', () => {
            const a = createManifest('plugin-a', '1.0.0', [{ id: 'plugin-b', version: '^1.0.0' }]);
            const b = createManifest('plugin-b', '1.0.0', [
                { id: 'plugin-missing', version: '^1.0.0' },
            ]);

            try {
                topologicalSort([a, b]);
                expect.fail('Should have thrown');
            } catch (err) {
                expect(err).toBeInstanceOf(DependencyNotFoundError);
                const error = err as DependencyNotFoundError;
                expect(error.dependencyId).toBe('plugin-missing');
                expect(error.requestedBy).toBe('plugin-b');
            }
        });
    });

    describe('version validation', () => {
        it('accepts compatible versions (exact match)', () => {
            const a = createManifest('plugin-a', '1.0.0', [{ id: 'plugin-b', version: '1.0.0' }]);
            const b = createManifest('plugin-b', '1.0.0');

            const result = topologicalSort([a, b]);
            expect(result).toHaveLength(2);
        });

        it('accepts compatible versions (caret range)', () => {
            const a = createManifest('plugin-a', '1.0.0', [{ id: 'plugin-b', version: '^1.0.0' }]);
            const b = createManifest('plugin-b', '1.2.3');

            const result = topologicalSort([a, b]);
            expect(result).toHaveLength(2);
        });

        it('accepts compatible versions (tilde range)', () => {
            const a = createManifest('plugin-a', '1.0.0', [{ id: 'plugin-b', version: '~1.2.0' }]);
            const b = createManifest('plugin-b', '1.2.5');

            const result = topologicalSort([a, b]);
            expect(result).toHaveLength(2);
        });

        it('accepts compatible versions (range)', () => {
            const a = createManifest('plugin-a', '1.0.0', [
                { id: 'plugin-b', version: '>=1.0.0 <2.0.0' },
            ]);
            const b = createManifest('plugin-b', '1.5.0');

            const result = topologicalSort([a, b]);
            expect(result).toHaveLength(2);
        });

        it('throws VersionMismatchError for incompatible versions', () => {
            const a = createManifest('plugin-a', '1.0.0', [{ id: 'plugin-b', version: '^2.0.0' }]);
            const b = createManifest('plugin-b', '1.5.0');

            expect(() => topologicalSort([a, b])).toThrow(VersionMismatchError);
        });

        it('provides version details in error', () => {
            const a = createManifest('plugin-a', '1.0.0', [{ id: 'plugin-b', version: '^2.0.0' }]);
            const b = createManifest('plugin-b', '1.5.0');

            try {
                topologicalSort([a, b]);
                expect.fail('Should have thrown');
            } catch (err) {
                expect(err).toBeInstanceOf(VersionMismatchError);
                const error = err as VersionMismatchError;
                expect(error.packageId).toBe('plugin-b');
                expect(error.actualVersion).toBe('1.5.0');
                expect(error.requiredVersion).toBe('^2.0.0');
                expect(error.requestedBy).toBe('plugin-a');
            }
        });

        it('validates versions for already-visited packages', () => {
            // A and C both depend on B, but with different version requirements
            // A requires ^1.0.0, C requires ^2.0.0, B is 1.5.0
            const a = createManifest('plugin-a', '1.0.0', [{ id: 'plugin-b', version: '^1.0.0' }]);
            const b = createManifest('plugin-b', '1.5.0');
            const c = createManifest('plugin-c', '1.0.0', [{ id: 'plugin-b', version: '^2.0.0' }]);

            expect(() => topologicalSort([a, b, c])).toThrow(VersionMismatchError);
        });
    });
});
