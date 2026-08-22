import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

function exportedFunctions(source) {
  return [
    ...source.matchAll(/^export async function\*?\s+(\w+)/gm),
    ...source.matchAll(/^export function\*?\s+(\w+)/gm),
  ].map((match) => match[1]);
}

describe("documented SDK surface", () => {
  it("device-io Session API matches packages/miniapp-sdk device exports", () => {
    const deviceSource = readFileSync(
      join(root, "packages/miniapp-sdk/src/device.ts"),
      "utf8",
    );
    const documented = readFileSync(join(root, "docs/device-io.md"), "utf8");
    const sessionSection =
      documented.split("## Session API")[1]?.split("##")[0] ?? "";
    expect(sessionSection).not.toMatch(/device\.subscribe/);
    expect(sessionSection).not.toMatch(/device\.configure/);
    const exports = new Set(exportedFunctions(deviceSource));
    expect(exports.has("subscribe")).toBe(false);
    expect(exports.has("configure")).toBe(false);
    for (const match of sessionSection.matchAll(/device\.(\w+)\(/g)) {
      expect(exports.has(match[1]), match[1]).toBe(true);
    }
  });

  it("authors/11 describes host-surfaced console output", () => {
    const chapter = readFileSync(
      join(root, "authors/11-testing-and-debugging.md"),
      "utf8",
    );
    expect(chapter).toMatch(/console/);
    expect(chapter).toMatch(/host/i);
    expect(chapter).toMatch(/tp test/);
  });
});
