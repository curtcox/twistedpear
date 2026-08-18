import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(import.meta.dirname, "../..");

describe("coverage suite", () => {
  it("excludes cookbook from the coverage run, not only via CLI --exclude", () => {
    // Vitest 4 project includes ignore CLI `--exclude`, which is why cookbook
    // tests timed out under coverage instrumentation and reddened the ratchet.
    const run = fs.readFileSync(
      path.join(root, "scripts/coverage-run.mjs"),
      "utf8",
    );
    const config = fs.readFileSync(path.join(root, "vitest.config.ts"), "utf8");
    expect(run).toContain('TP_COVERAGE: "1"');
    expect(config).toContain('process.env.TP_COVERAGE === "1"');
    expect(run).toContain("conformance/cookbook/**");
    expect(config).toContain("conformance/cookbook/**");
    expect(run).toContain("coverageWorkerArgs");
    expect(run).toContain("judgeHeadroom");
  });
});
