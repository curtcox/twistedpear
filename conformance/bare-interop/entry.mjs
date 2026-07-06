/**
 * Bare interop bundle entry — installs crypto shim before loading test logic.
 */

await import("./crypto-shim.mjs");
const { runBareInterop } = await import("./tests.mjs");
await runBareInterop();
