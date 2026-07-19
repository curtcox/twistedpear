/**
 * Bare interop bundle entry — installs crypto shim before loading test logic.
 */

await import("./bare-globals.mjs");
await import("./crypto-shim.mjs");
const { runBareInterop } = await import("./tests.mjs");
await runBareInterop();
globalThis.Bare?.exit(0);
