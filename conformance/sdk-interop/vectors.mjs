// SPEC-SDK vector replay: execute specs/spec-sdk/vectors/calls.json over a
// binding and require every pinned expectation to hold. Run over BOTH
// bindings in CI (reference via conformance/sdk-interop, loopback via
// conformance/bind-loopback) — identical observable results minus timing.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  createVectorHost,
  executeStep,
  normalizeValue,
  registerApp
} from "./vector-hosts.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const VECTORS_PATH = join(here, "..", "..", "specs", "spec-sdk", "vectors", "calls.json");

export async function runSdkVectors(bindingKind) {
  const doc = JSON.parse(readFileSync(VECTORS_PATH, "utf8"));
  const failures = [];
  let steps = 0;

  for (const vector of doc.vectors) {
    const vectorApp = vector.app ?? doc.defaultApp;
    const { host, ready, close } = createVectorHost(vector.host ?? "standard", bindingKind);
    await ready;
    try {
      if (vectorApp.register !== false) await registerApp(host, vectorApp);
      if (vector.setup?.maxMessagesPerSecond !== undefined) {
        host.setResourceLimits(vectorApp.name, { maxMessagesPerSecond: vector.setup.maxMessagesPerSecond });
      }
      for (const [index, step] of vector.steps.entries()) {
        steps += 1;
        const where = `${vector.name} step ${index}`;
        const response = await executeStep(host, vectorApp, step);
        const expect = step.expect;
        if (response.ok !== expect.ok) {
          failures.push(`${where}: expected ok=${expect.ok}, got ok=${response.ok} (${JSON.stringify(response.error ?? response.result)})`);
          continue;
        }
        if (!expect.ok) {
          const code = response.error?.code ?? "BROKER_ERROR";
          if (code !== expect.code) {
            failures.push(`${where}: expected code ${expect.code}, got ${code}: ${response.error?.message}`);
          } else if (
            expect.messageIncludes !== undefined &&
            !response.error.message.toLowerCase().includes(expect.messageIncludes.toLowerCase())
          ) {
            failures.push(`${where}: message "${response.error.message}" lacks "${expect.messageIncludes}"`);
          }
          continue;
        }
        if (expect.result !== undefined) {
          const got = normalizeValue(response.result) ?? null;
          if (JSON.stringify(got) !== JSON.stringify(expect.result)) {
            failures.push(`${where}: result mismatch\n  expected ${JSON.stringify(expect.result)}\n  got      ${JSON.stringify(got)}`);
          }
        }
        if (expect.resultKeys !== undefined) {
          const keys = Object.keys(response.result ?? {}).sort();
          if (JSON.stringify(keys) !== JSON.stringify(expect.resultKeys)) {
            failures.push(`${where}: result keys ${JSON.stringify(keys)} != ${JSON.stringify(expect.resultKeys)}`);
          }
        }
      }
    } finally {
      await close();
    }
  }

  return { vectors: doc.vectors.length, steps, failures };
}
