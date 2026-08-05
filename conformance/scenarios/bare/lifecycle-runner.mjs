#!/usr/bin/env bare

await import("../../bare-interop/bare-globals.mjs");
const { runBareLifecycleSlice } = await import("./lifecycle-slice.mjs");

const label = Bare.argv[2] ?? "bare-lifecycle";
const cycles = Number.parseInt(Bare.argv[3] ?? "10", 10);
if (!Number.isInteger(cycles) || cycles < 1) {
  throw new Error(`Invalid lifecycle cycle count: ${Bare.argv[3]}`);
}

const summary = await runBareLifecycleSlice({
  label,
  cycles,
  storePath: `.${label}-lifecycle-store`
});

console.log(`[bare-runner-result] ${JSON.stringify(summary)}`);
