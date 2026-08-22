import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { runInit, runPack } from "../src/commands/index.js";
import { runApp } from "../src/commands/guida-commands.js";
import { linkJsProject } from "../src/commands/js-bundle.js";

const passphrase = "conformance identity passphrase";
const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("multi-file JS linking", () => {
  it("emits a deterministic bundle and identical archives", async () => {
    const cwd = mkdtempSync(join(tmpdir(), "tp-js-link-"));
    temporaryDirectories.push(cwd);
    mkdirSync(join(cwd, "app", "src"), { recursive: true });
    writeFileSync(
      join(cwd, "app", "src", "score.js"),
      `export function score(n) { return n * 2; }\n`,
    );
    writeFileSync(
      join(cwd, "app", "src", "main.js"),
      `import { score } from "./score.js";
await sdk.ui.render({
  root: { id: "root", type: "text", props: { value: String(score(21)) } }
});
`,
    );
    writeFileSync(
      join(cwd, "app", "app.manifest.json"),
      JSON.stringify({
        name: "linked-counter",
        version: "1.0.0",
        entry: "src/main.js",
        capabilities: [],
      }),
    );
    const first = linkJsProject(join(cwd, "app"), "src/main.js");
    const second = linkJsProject(join(cwd, "app"), "src/main.js");
    expect(first).toBe(second);
    expect(first).toContain("score");
    const consoleLog = vi.spyOn(console, "log").mockImplementation(() => {});
    try {
      expect(
        await runInit({ cwd, args: [], identityPassphrase: passphrase }),
      ).toBe(0);
      expect(await runApp({ cwd, args: ["build", "app"] })).toBe(0);
      writeFileSync(
        join(cwd, "app", "app.manifest.json"),
        JSON.stringify({
          name: "linked-counter",
          version: "1.0.0",
          entry: "bundle.js",
          capabilities: [],
        }),
      );
      expect(await runPack({ cwd, args: ["app", "--out", "a.tpkg"] })).toBe(0);
      expect(await runPack({ cwd, args: ["app", "--out", "b.tpkg"] })).toBe(0);
    } finally {
      consoleLog.mockRestore();
    }
    expect(readFileSync(join(cwd, "a.tpkg"))).toEqual(
      readFileSync(join(cwd, "b.tpkg")),
    );
  });
});
