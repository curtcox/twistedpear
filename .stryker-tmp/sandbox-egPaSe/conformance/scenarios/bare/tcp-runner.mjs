#!/usr/bin/env bare
// @ts-nocheck

await import("../../bare-interop/bare-globals.mjs");
const { runBareTcpSlice } = await import("./tcp-slice.mjs");

const label = Bare.argv[2] ?? "bare-tcp";
await runBareTcpSlice({
  label,
  storePath: `.${label}-tcp-store`
});

console.log(`[bare-runner] ${label} TCP slice passed`);
