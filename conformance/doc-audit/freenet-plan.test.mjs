import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const read = (path) => readFileSync(join(repositoryRoot, path), "utf8");
const plan = read("docs/freenet-integration-plan.md");
const audit = read("conformance/freenet-spike/completion-audit.md");
const evidence = JSON.parse(
  read("conformance/freenet-spike/evidence-status.json")
);

describe("Freenet integration plan status", () => {
  it("keeps the spike ledger aligned with machine-readable evidence", () => {
    const expected = {
      S1: "complete",
      S2: "partial",
      S3: "complete",
      S4: "partial",
      S5: "partial",
      S6: "complete",
      S7: "partial"
    };
    for (const [spike, status] of Object.entries(expected)) {
      expect(evidence.spikes[spike].status, spike).toBe(status);
      expect(audit, `${spike} audit row`).toMatch(
        new RegExp(`\\| ${spike} [^|]+\\| ${status}`)
      );
    }
    expect(evidence.spikes.S8.status).toBe("complete");
    expect(evidence.gate.status).toBe("partially-open");
    expect(plan).toContain("**Gate verdict: partially open.**");
  });

  it("does not claim externally gated evidence as complete", () => {
    expect(plan).toContain("F4 node provisioning | **not started — blocked by S5**");
    expect(audit).toContain("F4 provisioning | blocked by S5");
    expect(evidence.spikes.S5.remaining).toMatch(/sign and notarize/);
    expect(evidence.spikes.S7.remaining).toMatch(/explicit live-write approval/);
    expect(plan).toContain("Tier 4 — cannot be done in CI");
  });

  it("keeps the shipped contract artifacts and user surfaces documented", () => {
    const bridgeReadme = read("packages/bridge-freenet/README.md");
    for (const artifact of [
      "locator-contract.wasm",
      "packet-log-contract.wasm",
      "propagation-set-contract.wasm"
    ]) {
      expect(bridgeReadme).toContain(artifact);
    }

    const guide = read("guide/11-using-freenet.md");
    expect(guide).toContain("v0.2.112");
    expect(guide).toContain("--freenet-direction 0");
    expect(guide).toContain("--freenet-direction 1");
    expect(guide).toContain("forcePath: \"freenet\"");
    expect(guide).toContain("public and irreversible");

    const cookbook = read("cookbook/10-apps-that-use-freenet.md");
    const manifest = JSON.parse(
      read("cookbook/examples/contract-notebook/app.manifest.json")
    );
    const source = read("cookbook/examples/contract-notebook/bundle.js");
    expect(manifest.capabilities).toEqual(["freenet:contract"]);
    expect(manifest.minHostApi).toBe("0.11.0");
    expect(source).toContain("freenet.get(");
    expect(source).toContain("freenet.put(");
    expect(source).toContain("freenet.update(");
    expect(cookbook).toContain("host displays its own confirmation");
  });

  it("keeps per-host support rows honest", () => {
    const platform = read("docs/platform-capabilities-status.md");
    expect(platform).toContain(
      "| `freenet:contract` | partial · unit · soft | n/a · n/a · n/a | n/a · n/a · n/a | n/a · n/a · n/a | partial · unit · soft |"
    );
    expect(read("guide/appendix-feature-status.md")).toContain(
      "| Freenet integration |"
    );
    expect(read("cookbook/appendix-feature-status.md")).toContain(
      "| `freenet:contract` |"
    );
  });

  it("keeps pinned Freenet verification in per-push and nightly CI", () => {
    const ci = read(".github/workflows/ci.yml");
    const nightly = read(".github/workflows/nightly.yml");
    const hash =
      "b5b6bdf975c1563a98507e94c8edc1091278306e16f25ef216aacea1570a5571";
    expect(ci).toContain("npm run test:freenet-spike");
    expect(ci).toContain("npm run test:freenet-ordered-log");
    expect(ci).toContain("npm run build:freenet-contract");
    expect(ci).toContain("npm run test:freenet-interface");
    expect(ci).toContain("npm run test:freenet-propagation");
    expect(ci).toContain(hash);
    expect(nightly).toContain("npm run test:freenet-local-network");
    expect(nightly).toContain(hash);
  });
});
