import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { compileGuidaWorkspace } from "../src/compile-workspace.js";
import { memoryGuidaConfig } from "../src/memory-config.js";

const here = dirname(fileURLToPath(import.meta.url));
const helloMain = readFileSync(
  join(here, "../templates/hello/src/Main.elm"),
  "utf8",
);
const helloElmJson = readFileSync(
  join(here, "../templates/hello/elm.json"),
  "utf8",
);

describe.skipIf(
  await import("guida")
    .then(() => false)
    .catch(() => true),
)("Guida workspace compiler", () => {
  it("compiles a file map and reports Node compile latency", async () => {
    const started = performance.now();
    const result = await compileGuidaWorkspace([
      { path: "elm.json", content: helloElmJson },
      { path: "src/Main.elm", content: helloMain },
    ]);
    const compileMs = performance.now() - started;
    expect(result.bundle).toContain("sdk.ui.render");
    expect(result.minifiedBytes).toBeGreaterThan(1000);
    expect(compileMs).toBeLessThan(60_000);
  }, 120_000);

  it("memory config round-trips files", async () => {
    const files = new Map<string, Buffer>([
      ["/app/hello.txt", Buffer.from("hi")],
    ]);
    const home = mkdtempSync(join(tmpdir(), "tp-guida-home-"));
    const config = memoryGuidaConfig(files, {
      cwd: "/app",
      homedir: home,
    });
    try {
      expect((await config.readFile("hello.txt")).toString()).toBe("hi");
      await config.writeFile("src/Main.elm", "module Main exposing (main)");
      expect((await config.readFile("/app/src/Main.elm")).toString()).toContain(
        "Main",
      );
      const listed = await config.readDirectory("/app");
      expect(listed.files).toEqual(expect.arrayContaining(["hello.txt", "src"]));
    } finally {
      rmSync(home, { recursive: true, force: true });
    }
  });
});
