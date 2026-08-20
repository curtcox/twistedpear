import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  collectAppFiles,
  loadTpIgnore,
  pathIgnored,
} from "../src/commands/pack-files.js";

describe("collectAppFiles ignore", () => {
  it("matches directory prefixes and extension globs", () => {
    const patterns = ["guida-stuff/", "*.elm", "elm.json"];
    expect(pathIgnored("guida-stuff/0.19.1/foo", patterns)).toBe(true);
    expect(pathIgnored("src/Main.elm", patterns)).toBe(true);
    expect(pathIgnored("elm.json", patterns)).toBe(true);
    expect(pathIgnored("bundle.js", patterns)).toBe(false);
    expect(pathIgnored("assets/icon.svg", patterns)).toBe(false);
    expect(pathIgnored("guida-vendor/TwistedPear/Program.elm", patterns)).toBe(
      true,
    );
  });

  it("does not pack Guida sources or guida-stuff when elm.json is present", () => {
    const cwd = mkdtempSync(join(tmpdir(), "tp-pack-ignore-"));
    try {
      writeFileSync(
        join(cwd, "elm.json"),
        JSON.stringify({ type: "application" }),
      );
      writeFileSync(join(cwd, "app.manifest.json"), "{}");
      writeFileSync(join(cwd, "bundle.js"), "export {}\n");
      mkdirSync(join(cwd, "src"));
      writeFileSync(join(cwd, "src", "Main.elm"), "module Main exposing (main)\n");
      mkdirSync(join(cwd, "guida-vendor", "TwistedPear"), { recursive: true });
      writeFileSync(
        join(cwd, "guida-vendor", "TwistedPear", "Program.elm"),
        "module TwistedPear.Program exposing (app)\n",
      );
      mkdirSync(join(cwd, "guida-stuff"));
      writeFileSync(join(cwd, "guida-stuff", "cache.bin"), "nope");
      writeFileSync(join(cwd, ".tpignore"), "notes.txt\n");
      writeFileSync(join(cwd, "notes.txt"), "secret");
      writeFileSync(join(cwd, "keep.txt"), "ok");

      expect(loadTpIgnore(cwd)).toEqual(
        expect.arrayContaining([
          "guida-stuff/",
          "guida-vendor/",
          "*.elm",
          "elm.json",
          "notes.txt",
        ]),
      );
      const files = collectAppFiles(cwd).map((file) => file.path);
      expect(files).toEqual(["bundle.js", "keep.txt"]);
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });
});
