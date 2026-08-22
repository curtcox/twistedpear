import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { runCreate, runTest } from "../src/commands/index.js";

const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("tp test command", () => {
  it("runs an app's test files and returns their exit code", async () => {
    const cwd = mkdtempSync(join(tmpdir(), "tp-test-"));
    temporaryDirectories.push(cwd);
    await runCreate({ cwd, args: ["hello"] });
    const appDir = join(cwd, "hello-miniapp");
    mkdirSync(join(appDir, "test"));
    writeFileSync(
      join(appDir, "test", "smoke.test.js"),
      `import { test } from "node:test";
import assert from "node:assert/strict";
test("harness loop", () => assert.equal(1 + 1, 2));
`,
    );
    expect(await runTest({ cwd, args: ["hello-miniapp"] })).toBe(0);
  });
});
