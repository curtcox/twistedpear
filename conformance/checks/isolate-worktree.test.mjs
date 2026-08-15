import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { isolateWorktree } from "../../scripts/site/isolate-worktree.mjs";

const git = (cwd, args) =>
  spawnSync("git", args, { cwd, encoding: "utf8" });

describe("isolateWorktree", () => {
  it("restores tracked files and removes generated output, keeping allowlisted dirs", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "tp-isolate-"));
    try {
      expect(git(root, ["init"]).status).toBe(0);
      fs.writeFileSync(path.join(root, "tracked.txt"), "original\n");
      fs.writeFileSync(path.join(root, ".gitignore"), "dist/\nnode_modules/\n");
      expect(
        git(root, ["add", "tracked.txt", ".gitignore"]).status,
      ).toBe(0);
      expect(
        git(root, [
          "-c",
          "user.email=isolate@test",
          "-c",
          "user.name=isolate",
          "commit",
          "-m",
          "init",
        ]).status,
      ).toBe(0);

      fs.writeFileSync(path.join(root, "tracked.txt"), "dirty\n");
      fs.mkdirSync(path.join(root, "dist"));
      fs.writeFileSync(path.join(root, "dist", "out.js"), "generated\n");
      fs.mkdirSync(path.join(root, "node_modules"));
      fs.writeFileSync(path.join(root, "node_modules", "keep.txt"), "pkg\n");
      fs.mkdirSync(path.join(root, "site-results"));
      fs.writeFileSync(path.join(root, "site-results", "summary.json"), "{}\n");

      isolateWorktree(root);

      expect(fs.readFileSync(path.join(root, "tracked.txt"), "utf8")).toBe(
        "original\n",
      );
      expect(fs.existsSync(path.join(root, "dist"))).toBe(false);
      expect(
        fs.readFileSync(path.join(root, "node_modules", "keep.txt"), "utf8"),
      ).toBe("pkg\n");
      expect(
        fs.readFileSync(path.join(root, "site-results", "summary.json"), "utf8"),
      ).toBe("{}\n");
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
