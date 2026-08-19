/**
 * `WebAssembly` is a namespace object in V8/JSC/Node (`typeof` is `"object"`).
 * Bare on some hosts exposes it as a constructor (`"function"`). Availability
 * is whether `instantiate` can be called, not the namespace's typeof.
 */
export function webAssemblyInstantiateAvailable(global = globalThis) {
  return typeof global.WebAssembly?.instantiate === "function";
}
