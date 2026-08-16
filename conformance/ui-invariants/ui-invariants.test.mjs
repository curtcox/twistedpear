import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("register:G7-ui-invariants", () => {
  it("runs behavioral browser checks rather than a skipped placeholder", () => {
    const script = readFileSync("conformance/ui-invariants/run.mjs", "utf8");
    expect(script).toContain('from "playwright"');
    expect(script).toContain("Trust & capabilities");
    expect(script).toContain("revocation takes effect without restart");
    expect(script).not.toContain("stub");
  });
});
