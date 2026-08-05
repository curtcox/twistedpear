#!/usr/bin/env node
const needs = JSON.parse(process.env.CI_NEEDS ?? "{}");
const bad = Object.entries(needs).filter(([, value]) => value.result !== "success");
if (bad.length > 0) {
  console.error(
    "CI dependencies not green:",
    bad.map(([name, value]) => `${name}=${value.result}`).join(", ")
  );
  process.exit(1);
}
console.log(`All ${Object.keys(needs).length} CI dependencies succeeded`);
