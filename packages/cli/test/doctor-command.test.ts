import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { runCreate, runDoctor } from "../src/commands/index.js";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("tp doctor", () => {
  it("reports findings for a cookbook app", async () => {
    const code = await runDoctor({
      cwd: repoRoot,
      args: ["cookbook/apps/dice-table"],
    });
    expect(code).toBe(0);
  });

  it("accepts a freshly scaffolded app", async () => {
    const cwd = mkdtempSync(join(tmpdir(), "tp-doctor-"));
    temporaryDirectories.push(cwd);
    await runCreate({ cwd, args: ["hello"] });
    expect(await runDoctor({ cwd, args: ["hello-miniapp"] })).toBe(0);
  });
});
