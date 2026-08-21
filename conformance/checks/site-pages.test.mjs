import { existsSync, readdirSync, readFileSync } from "node:fs";
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

function parseVersion(value) {
  return value.split(".").map((part) => Number.parseInt(part, 10));
}

function versionAtLeast(version, base) {
  const left = parseVersion(version);
  const right = parseVersion(base);
  for (let i = 0; i < 3; i += 1) {
    if ((left[i] ?? 0) > (right[i] ?? 0)) return true;
    if ((left[i] ?? 0) < (right[i] ?? 0)) return false;
  }
  return true;
}

/** Ranges `npm ci` can satisfy from a workspace package without hitting the registry. */
function workspaceRangeSatisfied(range, version) {
  if (range === "*" || range.startsWith("file:") || range.startsWith("workspace:")) {
    return true;
  }
  if (range === version) return true;
  if (range.startsWith("^")) {
    const base = range.slice(1);
    const [major] = parseVersion(version);
    const [baseMajor] = parseVersion(base);
    return major === baseMajor && versionAtLeast(version, base);
  }
  if (range.startsWith("~")) {
    const [major, minor] = parseVersion(version);
    const [baseMajor, baseMinor] = parseVersion(range.slice(1));
    return (
      major === baseMajor &&
      minor === baseMinor &&
      versionAtLeast(version, range.slice(1))
    );
  }
  return false;
}

function workspaceManifests(repoRoot) {
  const manifests = [];
  for (const dir of [
    join(repoRoot, "packages"),
    join(repoRoot, "apps"),
    join(repoRoot, "apps/harness-mobile/modules"),
  ]) {
    if (!existsSync(dir)) continue;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const file = join(dir, entry.name, "package.json");
      if (existsSync(file)) manifests.push(file);
    }
  }
  return manifests;
}

function workspaceRangeMismatches(repoRoot) {
  const versions = new Map();
  const manifests = workspaceManifests(repoRoot);
  for (const file of manifests) {
    const pkg = JSON.parse(readFileSync(file, "utf8"));
    if (typeof pkg.name === "string" && typeof pkg.version === "string") {
      versions.set(pkg.name, pkg.version);
    }
  }
  /** @type {string[]} */
  const mismatches = [];
  for (const file of manifests) {
    const pkg = JSON.parse(readFileSync(file, "utf8"));
    for (const block of [pkg.dependencies, pkg.devDependencies, pkg.peerDependencies]) {
      if (!block) continue;
      for (const [name, range] of Object.entries(block)) {
        const version = versions.get(name);
        if (!version || workspaceRangeSatisfied(range, version)) continue;
        mismatches.push(
          `${file.slice(repoRoot.length + 1)}: ${name}@${range} (workspace is ${version})`,
        );
      }
    }
  }
  return mismatches;
}

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

  it("keeps workspace dependency ranges on unpublished packages", () => {
    const mismatches = workspaceRangeMismatches(root);
    expect(mismatches, mismatches.join("\n")).toEqual([]);
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
