/**
 * Services are written as small module-level functions that take their
 * dependencies first: `createLibrary(deps, actor, input)`. This binds `deps` once,
 * so callers use `service.createLibrary(actor, input)` and tests pass fakes as deps.
 * @template {Record<string, (deps: any, ...args: any[]) => any>} F
 * @param {unknown} deps
 * @param {F} functions
 * @returns {{ [K in keyof F]: (...args: any[]) => ReturnType<F[K]> }}
 */
export function bindDeps(deps, functions) {
  return Object.fromEntries(
    Object.entries(functions).map(([name, fn]) => [name, (...args) => fn(deps, ...args)]),
  );
}
