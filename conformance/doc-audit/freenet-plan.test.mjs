import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { readWorkletSource } from "../ui-invariants/worklet-source.mjs";

const repositoryRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const read = (path) => readFileSync(join(repositoryRoot, path), "utf8");
const plan = read("docs/freenet-plan.md");
// Status claims live in the current-implementation document, never in the plan.
const current = read("docs/freenet.md");
const simulatorPlan = read("docs/freenet-simulator-first-work-plan.md");
const audit = read("conformance/freenet-spike/completion-audit.md");
const evidence = JSON.parse(
  read("conformance/freenet-spike/evidence-status.json"),
);

describe("Freenet integration status", () => {
  it("keeps the plan and the current-implementation document cross-linked", () => {
    expect(plan).toContain("counterpart: docs/freenet.md");
    expect(current).toContain("counterpart: docs/freenet-plan.md");
    expect(plan).toContain("(freenet.md)");
    expect(current).toContain("(freenet-plan.md)");
  });

  it("keeps the spike ledger aligned with machine-readable evidence", () => {
    const expected = {
      S1: "complete",
      S2: "partial",
      S3: "complete",
      S4: "partial",
      S5: "partial",
      S6: "complete",
      S7: "partial",
    };
    for (const [spike, status] of Object.entries(expected)) {
      expect(evidence.spikes[spike].status, spike).toBe(status);
      expect(audit, `${spike} audit row`).toMatch(
        new RegExp(`\\| ${spike} [^|]+\\| ${status}`),
      );
    }
    expect(evidence.spikes.S8.status).toBe("complete");
    expect(evidence.gate.status).toBe("partially-open");
    expect(current).toContain("**Gate verdict: partially open.**");
  });

  it("does not claim externally gated evidence as complete", () => {
    expect(current).toMatch(
      /F4 node provisioning\s+\|\s+\*\*software supervision started; redistribution gated\*\*/,
    );
    expect(audit).toMatch(
      /F4 provisioning\s+\|\s+supervision software-complete; redistribute gated/,
    );
    expect(evidence.spikes.S5.remaining).toMatch(/sign and notarize/);
    expect(evidence.spikes.S7.remaining).toMatch(
      /explicit live-write approval/,
    );
    expect(current).toContain("Tier 4 — cannot be done in CI");
  });

  it("keeps simulator-first remaining work linked without weakening evidence gates", () => {
    expect(plan).toContain("freenet-simulator-first-work-plan.md");
    expect(read("docs/README.md")).toContain(
      "Freenet simulator-first work plan",
    );
    expect(simulatorPlan).toContain("FREENET_FORCE_CROSS_NODE=1");
    expect(simulatorPlan).toMatch(
      /Public Freenet\s+writes, signing\/notarization, and hardware runs remain explicit approval gates/,
    );
    expect(simulatorPlan).toMatch(
      /Simulator evidence may close software\s+readiness/,
    );
    expect(simulatorPlan).toMatch(
      /must not be relabeled as physical-device evidence/,
    );
  });

  it("keeps the shipped contract artifacts and user surfaces documented", () => {
    const bridgeReadme = read("packages/bridge-freenet/README.md");
    for (const artifact of [
      "locator-contract.wasm",
      "packet-log-contract.wasm",
      "propagation-set-contract.wasm",
    ]) {
      expect(bridgeReadme).toContain(artifact);
    }

    const guide = read("guide/11-using-freenet.md");
    expect(guide).toContain("v0.2.112");
    expect(guide).toContain("--freenet-direction 0");
    expect(guide).toContain("--freenet-direction 1");
    expect(guide).toContain('forcePath: "freenet"');
    expect(guide).toContain("public and irreversible");

    const cookbook = read("cookbook/10-apps-that-use-freenet.md");
    const manifest = JSON.parse(
      read("cookbook/examples/contract-notebook/app.manifest.json"),
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
    expect(platform).toMatch(
      /\| `freenet:contract`\s+\| partial · unit · soft \| partial · unit · soft \| partial · unit · soft \| n\/a · n\/a · n\/a\s+\| partial · unit · soft \|/,
    );
    expect(platform).toMatch(/simulator-verified remote-node grant/i);
    expect(read("guide/appendix-feature-status.md")).toMatch(
      /\|\s*Freenet integration\s*\|/,
    );
    expect(read("cookbook/appendix-feature-status.md")).toMatch(
      /\|\s*`freenet:contract`\s*\|/,
    );
  });

  it("keeps distinct-node B3 and grant simulator probes wired", () => {
    const pkg = JSON.parse(read("package.json"));
    const mobileWorklet = readWorkletSource(
      join(repositoryRoot, "apps/harness-mobile/worklet/entry.mjs"),
    );
    expect(pkg.scripts["test:freenet-distinct-nodes"]).toMatch(
      /run-distinct-nodes\.mjs/,
    );
    expect(pkg.scripts["test:android-emulator:freenet-grant"]).toMatch(
      /freenet-grant\.mjs/,
    );
    expect(pkg.scripts["test:ios-sim:freenet-grant"]).toMatch(
      /freenet-grant\.mjs/,
    );
    expect(read("conformance/freenet-spike/run-distinct-nodes.mjs")).toContain(
      "prove-f2-interface.mjs",
    );
    expect(read("conformance/freenet-spike/run-distinct-nodes.mjs")).toContain(
      "prove-f2-announce-lxmf.mjs",
    );
    expect(read("conformance/freenet-spike/run-distinct-nodes.mjs")).toContain(
      "prove-f3-propagation.mjs",
    );
    expect(read("conformance/freenet-spike/run-local-f2.mjs")).toContain(
      "prove-f2-announce-lxmf.mjs",
    );
    expect(read(".maestro/freenet-remote-grant.yaml")).toContain(
      "freenet-grant-revoke",
    );
    expect(read(".maestro/freenet-remote-grant.yaml")).toContain(
      "freenet-session-status",
    );
    expect(read(".maestro/freenet-remote-grant.yaml")).toContain(
      "freenet-write-confirm",
    );
    expect(read(".maestro/freenet-remote-grant.yaml")).toContain(
      "freenet-grant-reconnect",
    );
    expect(read(".maestro/freenet-remote-grant.yaml")).toContain(
      "Node unavailable",
    );
    expect(read("apps/harness-mobile/src/freenet-remote-session.ts")).toContain(
      "auth-failed",
    );
    expect(
      readWorkletSource(
        join(repositoryRoot, "apps/harness-mobile/worklet/protocol.ts"),
      ),
    ).toContain("set-freenet-config");
    expect(mobileWorklet).toContain("FreenetClientContractBackend");
    expect(mobileWorklet).toContain("FreenetInterface");
    expect(mobileWorklet).toContain("FreenetPropagationStore");
    expect(mobileWorklet).toContain("PropagationServer");
    expect(mobileWorklet).toContain("pullRemoteMirror");
    expect(read("apps/harness-mobile/src/freenet-remote-grant.ts")).toContain(
      "rendezvousHex",
    );
    expect(read(".maestro/freenet-remote-grant.yaml")).toContain(
      "freenet-propagation-role-status",
    );
    expect(read("conformance/android-emulator/ci.sh")).toContain(
      "freenet-grant.mjs",
    );
    expect(
      JSON.parse(read("package.json")).scripts["test:freenet-supervisor"],
    ).toMatch(/prove-supervisor\.mjs/);
  });

  it("keeps pinned Freenet verification in per-push and nightly CI", () => {
    const ci = read(".github/workflows/ci.yml");
    const nightly = read(".github/workflows/nightly.yml");
    const hash =
      "b5b6bdf975c1563a98507e94c8edc1091278306e16f25ef216aacea1570a5571";
    expect(ci).toContain("packages/bridge-freenet/test");
    expect(ci).toContain("npm run test:freenet-spike");
    expect(ci).toContain("npm run test:freenet-ordered-log");
    expect(ci).toContain("npm run build:freenet-contract");
    expect(ci).toContain("npm run test:freenet-interface");
    expect(ci).toContain("npm run test:freenet-propagation");
    expect(ci).toContain("npm run test:freenet-supervisor");
    expect(ci).toContain("npm run test:freenet-distinct-nodes -- --smoke");
    expect(ci).toContain(hash);
    expect(nightly).toContain("npm run test:freenet-local-network");
    expect(nightly).toContain(hash);
  });
});
