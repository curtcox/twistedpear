import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repositoryRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../..",
);

describe("Guida documentation samples", () => {
  it("requires a Guida twin for every documented sample app and prose JS listing", () => {
    const result = spawnSync(
      process.execPath,
      ["scripts/doc-audit/guida-doc-samples.mjs"],
      { cwd: repositoryRoot, encoding: "utf8" },
    );
    expect(result.status, result.stderr || result.stdout).toBe(0);
  });
});
