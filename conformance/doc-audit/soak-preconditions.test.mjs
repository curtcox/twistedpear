import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  REQUIREMENTS,
  gatesByRequirement,
  installOrder,
  survey,
} from "../../scripts/tools/requirements.mjs";
import { render } from "../../scripts/tools/doctor.mjs";
import { parse, runCommands } from "../../scripts/tools/install.mjs";
import { summarize } from "../../scripts/security/fix.mjs";
import { readAllowlist, resolve } from "../../scripts/security/advisories.mjs";
import { gates } from "../../scripts/checks/registry.mjs";
import { collect, gateStatus } from "../../scripts/checks/status.mjs";
import { derivedGateItems } from "../../scripts/work/lib.mjs";

describe("tool requirements", () => {
  it("describes every requirement the gate registry names", () => {
    const named = [...gatesByRequirement().keys()].sort();
    const undescribed = named.filter((token) => !REQUIREMENTS[token]);
    // An undescribed token still probes as "is there a command by this name",
    // but the doctor cannot say what it is for or how to get it.
    expect(undescribed).toEqual([]);
  });

  it("covers the release tier as well as the pr tier", () => {
    expect([...gatesByRequirement("release").keys()]).toContain("network");
  });

  it("says what a missing tool costs and how to get it", () => {
    const output = render([
      {
        token: "shellcheck",
        present: false,
        why: "linting the shell scripts",
        gates: ["shell"],
        install: [["brew", "install", "shellcheck"]],
      },
    ]).join("\n");
    expect(output).toContain("MISSING");
    expect(output).toContain("blocks: shell");
    expect(output).toContain("brew install shellcheck");
  });

  it("installs prerequisites before the tools that need them", () => {
    const order = installOrder([
      { token: "cargo-deny", present: false, gates: [], install: [["x"]] },
      { token: "rust", present: false, gates: [], install: [["y"]] },
    ]).map((report) => report.token);
    expect(order).toEqual(["rust", "cargo-deny"]);
  });

  it("leaves present tools out of the install plan", () => {
    const order = installOrder([
      { token: "rust", present: true, gates: [], install: [["y"]] },
      { token: "cargo-deny", present: false, gates: [], install: [["x"]] },
    ]).map((report) => report.token);
    expect(order).toEqual(["cargo-deny"]);
  });

  it("reports a platform with no recipe rather than inventing one", () => {
    const [swift] = survey({ platform: "win32" }).filter(
      (report) => report.token === "swiftlint",
    );
    expect(swift.install).toEqual([]);
    expect(swift.manual).toMatch(/macOS only/);
  });

  it("changes nothing on a dry run", () => {
    const result = runCommands([["definitely-not-a-real-binary"]], {
      dryRun: true,
    });
    expect(result.ok).toBe(true);
  });

  it("stops at the first failed install command", () => {
    const result = runCommands(
      [
        ["node", "-e", "process.exit(1)"],
        ["node", "-e", "process.exit(0)"],
      ],
      { dryRun: false },
    );
    expect(result.ok).toBe(false);
    expect(result.failedAt).toEqual(["node", "-e", "process.exit(1)"]);
  });

  it("parses the install flags", () => {
    expect(parse(["--dry-run", "--only=rust,ruff"])).toEqual({
      dryRun: true,
      tier: "pr",
      only: ["rust", "ruff"],
    });
  });
});

describe("the advisories gate", () => {
  it("is a release-tier gate, so it gates soaks and not every PR", () => {
    const gate = gates.find((entry) => entry.id === "advisories");
    expect(gate?.tier).toBe("release");
    expect(gate?.requires).toContain("network");
  });

  it("stays out of the work queue while still blocking the soak", () => {
    const root = mkdtempSync(join(tmpdir(), "tp-advisories-"));
    writeFileSync(
      join(root, "checks.json"),
      JSON.stringify({
        version: 1,
        generatedAt: new Date().toISOString(),
        commit: "abc",
        digest: "d",
        treeDigest: "t",
        gates: {
          advisories: {
            title: "Unresolved dependency advisories",
            command: "npm run audit:advisories",
            ok: false,
            at: "",
            commit: "abc",
            tier: "release",
            measuredOn: "t",
          },
        },
      }),
    );
    // Nothing for work:next — a dependency advisory with no upstream fix must
    // not park the entire queue.
    expect(derivedGateItems(root)).toEqual([]);
    // But the soak guard sees it, because `blocking` is not tier-filtered.
    expect(
      gateStatus(root, { digest: "d", treeDigest: "t" }).blocking.map(
        (gate) => gate.id,
      ),
    ).toEqual(["advisories"]);
  });

  it("records both tiers so one file answers both questions", () => {
    const root = mkdtempSync(join(tmpdir(), "tp-tiers-"));
    const status = collect(root, { digest: "d", treeDigest: "t", commit: "c" });
    expect(status.gates.advisories?.tier).toBe("release");
    expect(status.gates.coverage?.tier).toBe("pr");
  });
});

describe("advisory reconciliation", () => {
  function repo(entries) {
    const root = mkdtempSync(join(tmpdir(), "tp-allow-"));
    writeFileSync(
      join(root, "audit-allowlist.json"),
      JSON.stringify({ version: 1, entries }),
    );
    return root;
  }

  it("treats an unexpired allowlist entry as resolved", () => {
    const root = repo([
      { id: "vite", severity: "high", expires: "2999-01-01", reason: "x" },
    ]);
    const state = resolve(root, {
      now: new Date("2026-08-10"),
      dependabot: false,
    });
    expect(state.expired).toEqual([]);
    expect(readAllowlist(root).entries).toHaveLength(1);
  });

  it("reports an expired entry rather than silently honouring it", () => {
    const root = repo([
      { id: "vite", severity: "high", expires: "2026-01-01", reason: "x" },
    ]);
    const state = resolve(root, {
      now: new Date("2026-08-10"),
      dependabot: false,
    });
    expect(state.expired.map((entry) => entry.id)).toEqual(["vite"]);
  });

  it("says when the Dependabot half of the picture is unavailable", () => {
    const state = resolve(repo([]), { dependabot: false });
    expect(state.dependabot.available).toBe(false);
    expect(state.dependabot.reason).toBeTruthy();
  });
});

describe("audit:fix reporting", () => {
  it("names what was fixed and what still needs a decision", () => {
    const before = {
      unresolved: [
        { id: "nanoid", severity: "high" },
        { id: "image-size", severity: "high", scope: "runtime" },
      ],
      allowlisted: [],
    };
    const after = {
      unresolved: [{ id: "image-size", severity: "high", scope: "runtime" }],
      allowlisted: [],
    };
    const output = summarize(before, after).join("\n");
    expect(output).toContain("Fixed: nanoid");
    expect(output).toContain("Still unresolved (1)");
    expect(output).toContain("image-size");
    expect(output).toContain("audit-allowlist.json");
  });

  it("does not claim a fix when nothing moved", () => {
    const state = { unresolved: [{ id: "x", severity: "high" }] };
    expect(summarize(state, state).join("\n")).toContain(
      "Nothing was fixable without a breaking upgrade",
    );
  });
});
