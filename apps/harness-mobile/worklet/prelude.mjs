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

await import("./entry.mjs");
