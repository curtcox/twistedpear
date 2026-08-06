#!/usr/bin/env bare

await import("../bare-interop/bare-globals.mjs");
const { runBareTcpSlice } = await import("../scenarios/bare/tcp-slice.mjs");

await runBareTcpSlice({
  label: "bare-device",
  storePath: ".bare-device-store",
});

console.log("bare-device: TCP slice passed on Bare runtime");
