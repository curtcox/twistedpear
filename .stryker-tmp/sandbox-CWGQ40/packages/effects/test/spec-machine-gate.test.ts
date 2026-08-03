// @ts-nocheck
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
//  — plain-JS conformance gate without type declarations.
import { runMachineGate } from "../../../conformance/machine/gate.mjs";
//  — see above.
import { machines as referenceMachines } from "../../../conformance/machine/reference-machines.mjs";
//  — see above.
import { machines as canaryMachines, EXPECTED_FAILURE } from "../../../conformance/machine/canary-machines.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, "..", "..", "..");
const cli = join(repo, "conformance", "machine", "run.mjs");

interface GateResult {
  checks: number;
  failures: Array<{ machine: string; check: string; message: string }>;
}

describe("SPEC-MACHINE freestanding gate", () => {
  it("passes the in-repo reference machine", () => {
    const result = runMachineGate(referenceMachines) as GateResult;
    expect(result.failures).toEqual([]);
    expect(result.checks).toBeGreaterThanOrEqual(4);
  });

  for (const [name, expected] of Object.entries(EXPECTED_FAILURE as Record<string, string>)) {
    it(`canary ${name} fails the ${expected} check`, () => {
      const machine = (canaryMachines as Record<string, unknown>)[name];
      const result = runMachineGate({ [name]: machine }) as GateResult;
      expect(result.failures.map((failure) => failure.check)).toContain(expected);
    });
  }

  it("gates a machine module outside this repository via the CLI", () => {
    const outside = mkdtempSync(join(tmpdir(), "spec-machine-gate-"));
    const good = join(outside, "good-machines.mjs");
    writeFileSync(
      good,
      `export const machines = {
        counter: {
          initial: { n: 0 },
          step: (state, event) =>
            event.kind === "tick"
              ? { state: { n: state.n + 1 }, intents: [{ kind: "log", level: "info", message: "tick" }] }
              : { state, intents: [] },
          tape: [{ kind: "start", at: 0 }, { kind: "tick", at: 5 }]
        }
      };\n`
    );
    const pass = spawnSync(process.execPath, [cli, good], { encoding: "utf8" });
    expect(pass.status, pass.stdout + pass.stderr).toBe(0);

    const bad = join(outside, "bad-machines.mjs");
    writeFileSync(
      bad,
      `export const machines = {
        clocky: {
          initial: null,
          step: (state, event) =>
            event.kind === "tick"
              ? { state, intents: [{ kind: "log", level: "info", message: String(Date.now()) }] }
              : { state, intents: [] },
          tape: [{ kind: "tick", at: 5 }]
        }
      };\n`
    );
    const fail = spawnSync(process.execPath, [cli, bad], { encoding: "utf8" });
    expect(fail.status, fail.stdout + fail.stderr).toBe(1);
    expect(fail.stdout + fail.stderr).toContain("tripwire");
  });
});
