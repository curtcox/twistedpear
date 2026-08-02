import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { gates } from "../../scripts/checks/registry.mjs";

const root = path.resolve(import.meta.dirname, "../..");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const workflow = fs.readFileSync(path.join(root, ".github/workflows/ci.yml"), "utf8");
const reports = fs.readFileSync(path.join(root, "scripts/site/run-reports.mjs"), "utf8");

describe("static-analysis gate registry", () => {
  it("has unique, complete declarations whose npm scripts exist", () => {
    expect(new Set(gates.map((gate) => gate.id)).size).toBe(gates.length);
    for (const gate of gates) {
      expect(gate.title).toBeTruthy();
      expect(["pr", "nightly"]).toContain(gate.tier);
      expect(gate.requires.length).toBeGreaterThan(0);
      expect(gate.artifacts.length).toBeGreaterThan(0);
      expect(gate.command.slice(0, 2)).toEqual(["npm", "run"]);
      expect(manifest.scripts[gate.command[2]], `${gate.id} script`).toBeTruthy();
    }
  });

  it("drives CI and the report dashboard from the registry", () => {
    expect(workflow).toContain("checks:matrix");
    expect(workflow).toContain("scripts/checks/run.mjs --tier=pr --only=${{ matrix.id }}");
    expect(workflow).toContain("ci-green:");
    expect(reports).toContain('import { gates } from "../checks/registry.mjs"');
    expect(reports).toContain("for (const gate of gates)");
  });
});
