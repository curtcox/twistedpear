import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { gates } from "../../scripts/checks/registry.mjs";
import {
  PENDING_CAPTURES,
  SECTIONS,
  isPendingCapture,
  isPlaceholderPng,
  placeholderPng,
  sectionImagesDir,
  surveySection,
} from "../../scripts/site/section-images.mjs";

const root = join(import.meta.dirname, "../..");

describe("GitHub Pages site integrity", () => {
  it("is a registered PR gate that publishes a structured report", () => {
    const gate = gates.find((entry) => entry.id === "site-pages");
    expect(gate).toMatchObject({
      tier: "pr",
      command: ["npm", "run", "site:verify"],
      summary: "site-pages",
    });
    expect(gate.artifacts).toContain("artifacts/site-pages.json");
  });

  it("distinguishes a real capture from the generated hatch PNG", () => {
    expect(isPlaceholderPng(placeholderPng())).toBe(true);
    expect(
      isPlaceholderPng(
        readFileSync(join(root, "authors/images/01-architecture.png")),
      ),
    ).toBe(false);
  });

  it("allowlists only the captures that are still absent", () => {
    for (const { id } of SECTIONS) {
      const { missing } = surveySection(id);
      expect(missing.sort(), id).toEqual(
        [...(PENDING_CAPTURES[id] ?? [])].sort(),
      );
      for (const name of PENDING_CAPTURES[id] ?? []) {
        expect(isPendingCapture(id, name)).toBe(true);
        expect(existsSync(join(sectionImagesDir(id), name))).toBe(false);
      }
    }
  });

  it("does not keep a hatch PNG as a committed capture", () => {
    for (const { id } of SECTIONS) {
      const { names, missing } = surveySection(id);
      for (const name of names) {
        if (missing.includes(name) || !name.endsWith(".png")) continue;
        expect(
          isPlaceholderPng(readFileSync(join(sectionImagesDir(id), name))),
          `${id}/images/${name}`,
        ).toBe(false);
      }
    }
  });
});
