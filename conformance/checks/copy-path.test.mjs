import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { copyPath } from "../../scripts/checks/copy-path.mjs";

describe("copyPath", () => {
  it("copies a file and a directory without throwing EISDIR", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "tp-copy-path-"));
    try {
      const file = path.join(root, "report.json");
      fs.writeFileSync(file, "{}\n");
      const directory = path.join(root, "reports", "api");
      fs.mkdirSync(directory, { recursive: true });
      fs.writeFileSync(path.join(directory, "index.md"), "# api\n");

      const destRoot = path.join(root, "dest");
      copyPath(file, path.join(destRoot, "report.json"));
      copyPath(directory, path.join(destRoot, "reports", "api"));

      expect(fs.readFileSync(path.join(destRoot, "report.json"), "utf8")).toBe(
        "{}\n",
      );
      expect(
        fs.readFileSync(
          path.join(destRoot, "reports", "api", "index.md"),
          "utf8",
        ),
      ).toBe("# api\n");
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
