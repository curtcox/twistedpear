import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(import.meta.dirname, "../..");

describe("focused unit gate", () => {
  it("uses a local worker cap and leaves separately registered suites to their gates", () => {
    const runner = fs.readFileSync(
      path.join(root, "scripts/test-unit.mjs"),
      "utf8",
    );
    const config = fs.readFileSync(path.join(root, "vitest.config.ts"), "utf8");
    const registry = fs.readFileSync(
      path.join(root, "scripts/checks/registry.mjs"),
      "utf8",
    );

    expect(registry).toContain(
      'gate("unit-tests", "Unit tests", "test:unit", "pr", ["node"])',
    );
    expect(
      fs.readFileSync(path.join(root, "scripts/checks/run.mjs"), "utf8"),
    ).toContain("TP_HEADROOM_OWNER_PIDS");
    expect(runner).toContain("unitWorkerArgs");
    expect(runner).toContain("TP_UNIT_GATE");
    expect(config).toContain('process.env.TP_UNIT_GATE === "1"');
    expect(config).toContain("conformance/release-harness/**");
    expect(config).toContain("conformance/doc-audit/**");
    expect(config).toContain("properties*.test.ts");
    expect(config).toContain("packages/reticulum-ts/test/fuzz.test.ts");
    expect(config).toContain("packages/lxmf-ts/test/fuzz.test.ts");
    expect(config).toContain("packages/guida-twistedpear/test/parity.test.ts");
  });
});
