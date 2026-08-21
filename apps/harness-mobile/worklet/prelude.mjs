/* global console */
/**
 * BareKit worklet prelude: register crash absorbers before any other module runs.
 * Kept as the bare-pack entry so listeners exist before entry.mjs imports evaluate.
 */
Bare.on("unhandledRejection", (reason) => {
  const detail =
    reason instanceof Error
      ? `${reason.name}: ${reason.message}`
      : String(reason);
  console.error("[bare] unhandledRejection", detail);
});

Bare.on("uncaughtException", (err) => {
  const detail =
    err instanceof Error ? `${err.name}: ${err.message}` : String(err);
  console.error("[bare] uncaughtException", detail);
});

const { installBareWorkerPolyfill } =
  await import("../../../packages/worklet-core/src/bare-worker-polyfill.mjs");
try {
  installBareWorkerPolyfill();
} catch (error) {
  const detail =
    error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  console.error("[bare] Worker polyfill skipped", detail);
}

await import("./entry.mjs");
