/**
 * The suite against its own specification.
 *
 * `docs/user-policy-plan.md` §9.3 is the list of attacks this directory owes a
 * test each. Parsing it here means adding a row to the plan fails the build
 * until someone attacks it, and renaming an attack cannot quietly orphan its
 * test.
 */
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { BYPASS_CATALOGUE } from "./catalogue.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "../..");
const PLAN = join(ROOT, "docs/user-policy-plan.md");
const ROW = /^\|\s*(B\d+)\s*\|\s*([^—|]+?)\s*—/;

function catalogueFromPlan(): ReadonlyArray<{ id: string; attack: string }> {
  return readFileSync(PLAN, "utf8")
    .split("\n")
    .flatMap((line) => {
      const match = ROW.exec(line);
      return match?.[1] !== undefined && match[2] !== undefined
        ? [{ id: match[1], attack: match[2] }]
        : [];
    });
}

const suite = readdirSync(HERE)
  .filter((name) => name.endsWith(".test.ts") && name !== "catalogue.test.ts")
  .map((name) => readFileSync(join(HERE, name), "utf8"))
  .join("\n");

describe("bypass catalogue", () => {
  it("matches the table in the plan", () => {
    expect(catalogueFromPlan()).toEqual(BYPASS_CATALOGUE);
  });

  it("has an executable test for every entry", () => {
    const missing = BYPASS_CATALOGUE.filter(
      (entry) => !suite.includes(`it("${entry.id} —`),
    ).map((entry) => entry.id);
    expect(missing).toEqual([]);
    // B8's second half is marked pending POL-8-RECOVERY rather than asserted.
    // Written without the literal marker so the census does not count this
    // string as a suppressed test of its own.
    expect(suite).toMatch(/todo\(\s*"B8 —[^"]*POL-8-RECOVERY/);
  });

  it("asserts B14 succeeds rather than fails", () => {
    expect(suite).toContain("B14 — self-lockout, asserted to succeed");
  });
});
