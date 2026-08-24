import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import {
  hasKey,
  indexStatuses,
  scriptCitations,
  subsetRows,
  tableCells,
  testCitations,
  titleMatches,
  vectorCitations,
} from "../../scripts/analysis/spec-traceability.mjs";

const root = path.resolve(import.meta.dirname, "../..");
const waivers = JSON.parse(
  fs.readFileSync(path.join(root, "spec-traceability-waivers.json"), "utf8"),
);

function run() {
  return spawnSync(
    globalThis.process.execPath,
    ["scripts/analysis/spec-traceability.mjs"],
    { cwd: root, encoding: "utf8" },
  );
}

describe("specification evidence traceability", () => {
  it("passes on the tree as committed", () => {
    const result = run();
    expect(result.stdout).toContain("spec-traceability: PASS");
    expect(result.status).toBe(0);
  });

  it("checks every spec, not only the ones with subset tables", () => {
    const result = run();
    // SPEC-MEDIA delegates to six per-medium profiles beside its own page, four
    // of which carry subset tables. Reading only `spec.md` measured none of
    // them, so the profile count is what proves the whole directory is read.
    expect(result.stdout).toMatch(/21 spec\(s\), 7 profile\(s\)/);
  });

  it("reads a subset row's Pinned by cell", () => {
    const rows = subsetRows(
      [
        "## 2. Subset",
        "",
        "| Upstream feature | TwistedPear use | Pinned by |",
        "| --- | --- | --- |",
        "| SHA-256 | Hashing | `crypto.json` → `sha256` |",
        "| Ratchets | Forward secrecy |  |",
        "",
        "## 3. Extensions",
      ].join("\n"),
    );
    expect(rows).toHaveLength(2);
    expect(rows[0].pinnedBy).toBe("`crypto.json` → `sha256`");
    expect(rows[1].pinnedBy).toBe("");
  });

  it("ignores the separator row and non-rows", () => {
    expect(tableCells("| --- | --- |")).toBeNull();
    expect(tableCells("not a row")).toBeNull();
    expect(tableCells("| a | b |")).toEqual(["a", "b"]);
  });

  // Two citations on one line: the key list must not swallow the second file.
  it("splits two vector citations sharing a line", () => {
    const found = vectorCitations(
      "`crypto.json` → `hkdfSha256`, `identity.json` → `hkdf`",
    );
    expect(found).toEqual([
      { file: "crypto.json", key: "hkdfSha256" },
      { file: "identity.json", key: "hkdf" },
    ]);
  });

  it("resolves a cited case whether it is a key or a named entry", () => {
    expect(hasKey({ sha256: { digest: "x" } }, "sha256")).toBe(true);
    // `lxmf.json` → `hello-world` names the `name` of one of `messages`.
    expect(hasKey({ messages: [{ name: "hello-world" }] }, "hello-world")).toBe(
      true,
    );
    expect(hasKey({ messages: [{ name: "other" }] }, "hello-world")).toBe(
      false,
    );
  });

  it("takes every title from a citation listing several", () => {
    const found = testCitations(
      '`auto-discovery.test.ts` ("prefers multicast…", "falls back to Bonjour…")',
    );
    expect(found.map((entry) => entry.title)).toEqual([
      "prefers multicast…",
      "falls back to Bonjour…",
    ]);
  });

  // An elided title is a citation convention; an exact one that no longer
  // matches is a renamed test, which is the rot this gate exists to catch.
  it("accepts an elided title by prefix but not a renamed one", () => {
    const source = 'it("adds an interface scope to unscoped IPv6 addresses")';
    expect(titleMatches(source, "adds an interface scope…")).toBe(true);
    expect(titleMatches(source, "adds an interface scope...")).toBe(true);
    expect(
      titleMatches(
        source,
        "adds an interface scope to unscoped IPv6 addresses",
      ),
    ).toBe(true);
    expect(titleMatches(source, "adds an interface zone")).toBe(false);
    // A bare ellipsis would match everything, so it matches nothing.
    expect(titleMatches(source, "…")).toBe(false);
  });

  it("finds npm commands cited anywhere in a spec", () => {
    expect(
      scriptCitations("run `npm run test:interop` and `npm run sizes`"),
    ).toEqual(["test:interop", "sizes"]);
  });

  it("reads spec statuses out of the index", () => {
    const statuses = indexStatuses(
      [
        "| Spec | Scope | Status |",
        "| --- | --- | --- |",
        "| [SPEC-WIRE](spec-wire/spec.md) | Packets | **normative** (profile) |",
        "| [SPEC-FREENET](spec-freenet/spec.md) | Contracts | **stub** |",
      ].join("\n"),
    );
    expect(statuses.get("spec-wire")).toContain("normative");
    expect(statuses.get("spec-freenet")).toContain("stub");
  });

  it("fails a citation that is not waived", () => {
    const spec = path.join(root, "specs/spec-cap/spec.md");
    const original = fs.readFileSync(spec, "utf8");
    try {
      fs.writeFileSync(
        spec,
        `${original}\n\nEvidence: \`npm run test:no-such-script-here\`.\n`,
      );
      const result = run();
      expect(result.status).toBe(1);
      expect(result.stderr).toContain("test:no-such-script-here");
    } finally {
      fs.writeFileSync(spec, original);
    }
  });

  // A waiver is debt, not permission. One that stops matching has to be
  // removed, or the list becomes a licence for the next broken citation.
  it("fails a waiver that no longer matches any finding", () => {
    const file = path.join(root, "spec-traceability-waivers.json");
    const original = fs.readFileSync(file, "utf8");
    try {
      const parsed = JSON.parse(original);
      parsed.waivers.push({
        id: "NEVER-MATCHES",
        finding: "a finding that does not occur",
        reason: "test",
        next: "test",
      });
      fs.writeFileSync(file, `${JSON.stringify(parsed, null, 2)}\n`);
      const result = run();
      expect(result.status).toBe(1);
      expect(result.stderr).toContain("stale waiver NEVER-MATCHES");
    } finally {
      fs.writeFileSync(file, original);
    }
  });

  it("gives every waiver an id, a reason, and a next step", () => {
    expect(waivers.waivers.length).toBeGreaterThan(0);
    const ids = new Set();
    for (const waiver of waivers.waivers) {
      expect(waiver.id, "id").toBeTruthy();
      expect(ids.has(waiver.id), `${waiver.id} is unique`).toBe(false);
      ids.add(waiver.id);
      expect(waiver.finding, waiver.id).toBeTruthy();
      // Without a reason and a next step the list is an allowlist, and the
      // shortest path to a green gate becomes appending to it.
      expect(waiver.reason, waiver.id).toBeTruthy();
      expect(waiver.next, waiver.id).toBeTruthy();
    }
  });
});
