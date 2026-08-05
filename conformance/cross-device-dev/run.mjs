#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { deepStrictEqual } from "node:assert";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { assert, runMain, section, step } from "../lib/index.mjs";
import { startControlServer } from "../../scripts/peers/control-server.mjs";
import { GUI_PEER_IDS, adapterFor } from "../../scripts/peers/registry.mjs";
import {
  forgetPeer,
  logPath,
  peerEntry,
  readState,
  recordPeer,
} from "../../scripts/peers/state.mjs";
import { BrowserUiDriver } from "./drivers/browser.mjs";
import { NativeUiDriver } from "./drivers/native.mjs";
import { coverageFromProof, VARIANTS } from "./ledger.mjs";
import { decodePublisherIdentity256t } from "../../packages/app-registry/dist/index.js";

const repoRoot = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const args = process.argv.slice(2);
const attach = args.includes("--attach");
const matrix = args.includes("--matrix");
const buildPeers = args.includes("--build");
const allowSkip =
  args.includes("--allow-skip") || process.env.CROSS_DEVICE_ALLOW_SKIP === "1";
const scenarioSelection = args.find((arg) => arg.startsWith("--scenarios="));
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const artifactRoot = join(repoRoot, ".tmp", "cross-device-dev", timestamp);

const COVERING = [
  { id: "S1", chain: ["desktop", "ios"] },
  { id: "S2", chain: ["ios", "android"] },
  { id: "S3", chain: ["android", "web"] },
  { id: "S4", chain: ["web", "desktop"] },
];
const FULL = VARIANTS.flatMap((from) =>
  VARIANTS.filter((to) => to !== from).map((to) => ({
    id: `M-${from}-${to}`,
    chain: [from, to],
  })),
);
// P2's signed-locator spike proved that an installed peer cannot change the
// serving identity without the original publisher signing a new locator. Keep
// S5 as the documented hub-carried fallback and do not score it as a product
// source/target role proof.
const MIRROR_FALLBACK = {
  id: "S5",
  chain: ["desktop", "web"],
  transportVia: ["hub"],
  nonScoring: true,
  fallback: "publisher-signed locator cannot delegate a new serving identity",
};

const FIXTURE_BUNDLE = `import { lxmf, storage, ui } from "@twistedpear/miniapp-sdk";
let title = "Cross-device hello";
await storage.kv.set("booted", new TextEncoder().encode("yes"));
async function render() {
  await ui.render({ root: { id: "root", type: "view", children: [
    { id: "title", type: "text", props: { value: title } },
    { id: "send", type: "button", props: { label: "Send", event: "cross.send" } }
  ] } });
}
ui.onEvent(async ({ event }) => {
  if (event !== "cross.send") return;
  try { await lxmf.send({ to: "peer", subject: "cross", body: "cross" }); title = "SENT"; }
  catch (error) { title = "DENIED: " + error.message; }
  await render();
});
await render();
`;

const sleep = (ms) =>
  new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
function requestedScenarios() {
  const selected = scenarioSelection;
  const candidates = matrix ? [...FULL, MIRROR_FALLBACK] : COVERING;
  if (selected === undefined) return candidates;
  const ids = new Set(
    selected.slice("--scenarios=".length).split(",").filter(Boolean),
  );
  const result = candidates.filter((scenario) => ids.has(scenario.id));
  assert(
    result.length === ids.size,
    `unknown scenario(s): ${[...ids].filter((id) => !result.some((item) => item.id === id)).join(", ")}`,
  );
  return result;
}

function stateText(state) {
  return JSON.stringify(state?.widgetTree ?? {});
}

async function waitFor(command, predicate, label, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  let last = null;
  while (Date.now() < deadline) {
    last = await command("state");
    if (predicate(last)) return last;
    await sleep(100);
  }
  throw new Error(`${label}; last=${JSON.stringify(last)}`);
}

async function bringUp(ids) {
  const started = [];
  const skipped = [];
  const ordered = [...ids].sort((a, b) =>
    a === "hub" ? -1 : b === "hub" ? 1 : 0,
  );
  try {
    for (const id of ordered) {
      const adapter = await adapterFor(id);
      assert(adapter !== null, `unknown peer ${id}`);
      const existing = peerEntry(id);
      if (existing !== null && adapter.running(existing)) continue;
      forgetPeer(id);
      try {
        recordPeer(
          id,
          await adapter.up({ log: (line) => step(line), build: buildPeers }),
        );
        started.push(id);
      } catch (error) {
        if (GUI_PEER_IDS.includes(id) && allowSkip) {
          skipped.push(id);
          step(
            `${id} skipped: ${error instanceof Error ? error.message : String(error)}`,
          );
        } else throw error;
      }
    }
    return { started, skipped };
  } catch (error) {
    await tearDown(started);
    throw error;
  }
}

async function tearDown(ids) {
  for (const id of [...ids].reverse()) {
    const adapter = await adapterFor(id);
    const entry = peerEntry(id);
    if (adapter === null || entry === null) continue;
    await adapter.down(entry, { log: (line) => step(line) }).catch(() => {});
    forgetPeer(id);
  }
}

async function connectBrowserDriver(id) {
  const entry = peerEntry(id);
  assert(entry?.cdpPort !== undefined, `${id} has no recorded CDP endpoint`);
  const deadline = Date.now() + 60_000;
  let lastError = null;
  while (Date.now() < deadline) {
    try {
      return await BrowserUiDriver.connect({ id, cdpPort: entry.cdpPort });
    } catch (error) {
      lastError = error;
      await sleep(250);
    }
  }
  throw lastError ?? new Error(`${id} CDP did not become ready`);
}

await runMain(async () => {
  mkdirSync(artifactRoot, { recursive: true });
  const scenarios = requestedScenarios();
  const activeVariants = VARIANTS.filter((variant) =>
    scenarios.some((scenario) => scenario.chain.includes(variant)),
  );
  section(
    `Cross-device develop-and-run: ${scenarios.map((scenario) => scenario.id).join(", ")}`,
  );
  let owned = [];
  let control = null;
  const ui = new Map();
  const skipped = new Set();
  const proof = {
    generatedAt: new Date().toISOString(),
    matrix,
    scenarios: [],
  };
  const negativeTargets = new Set();
  let coverage = coverageFromProof(proof);

  try {
    control = await startControlServer();
    if (!attach) {
      const result = await bringUp(["hub", ...activeVariants]);
      owned = result.started;
      result.skipped.forEach((id) => skipped.add(id));
    } else {
      for (const id of activeVariants) {
        const entry = readState().peers[id];
        if (entry === undefined) skipped.add(id);
      }
    }

    for (const id of activeVariants.filter(
      (variant) => !skipped.has(variant) && variant !== "web",
    )) {
      try {
        await control.waitForAgent(id, 90_000);
      } catch (error) {
        if (!allowSkip) throw error;
        skipped.add(id);
      }
    }

    if (activeVariants.includes("desktop") && !skipped.has("desktop"))
      ui.set("desktop", await connectBrowserDriver("desktop"));
    if (activeVariants.includes("web") && !skipped.has("web"))
      ui.set("web", await connectBrowserDriver("web"));
    if (activeVariants.includes("ios") && !skipped.has("ios")) {
      ui.set(
        "ios",
        new NativeUiDriver({
          id: "ios",
          device: peerEntry("ios").udid,
          repoRoot,
          artifactDir: artifactRoot,
        }),
      );
    }
    if (activeVariants.includes("android") && !skipped.has("android")) {
      const serial = spawnSync("adb", ["get-serialno"], {
        encoding: "utf8",
      }).stdout.trim();
      ui.set(
        "android",
        new NativeUiDriver({
          id: "android",
          device: serial,
          repoRoot,
          artifactDir: artifactRoot,
        }),
      );
    }

    const commandFor = (id) =>
      id === "web"
        ? (cmd, payload = {}) => ui.get("web").command(cmd, payload)
        : (cmd, payload = {}, timeoutMs = 120_000) =>
            control.command(id, cmd, payload, timeoutMs);

    const approve = async (id, action, kind) => {
      const pending = Promise.resolve().then(action);
      const approval =
        kind === "install"
          ? ui.get(id).approveInstall()
          : kind === "run"
            ? ui.get(id).approveRun()
            : ui.get(id).approveConfirmation(kind);
      const [result] = await Promise.all([pending, approval]);
      return result;
    };

    for (const scenario of scenarios) {
      const [developer, runner] = scenario.chain;
      const record = {
        id: scenario.id,
        developer,
        runner,
        status: "passed",
        hops: [],
        ...(scenario.nonScoring ? { nonScoring: true } : {}),
        ...(scenario.transportVia
          ? { transportVia: scenario.transportVia }
          : {}),
        ...(scenario.fallback ? { fallback: scenario.fallback } : {}),
      };
      proof.scenarios.push(record);
      if (scenario.chain.some((id) => skipped.has(id))) {
        record.status = "skipped";
        record.reason = `unavailable: ${scenario.chain.filter((id) => skipped.has(id)).join(", ")}`;
        continue;
      }
      const scenarioDir = join(artifactRoot, scenario.id);
      mkdirSync(scenarioDir, { recursive: true });
      try {
        const dev = commandFor(developer);
        const target = commandFor(runner);
        const manifest = JSON.parse(
          readFileSync(
            join(repoRoot, "apps", "devstudio", "app.manifest.json"),
            "utf8",
          ),
        );
        const bundle = readFileSync(
          join(repoRoot, "apps", "devstudio", "bundle.js"),
          "utf8",
        );
        await dev("devstudio.load", { manifest, bundle });
        await dev("project.create");
        const created = await waitFor(
          dev,
          (value) => stateText(value.state).includes("Created project"),
          "project creation timed out",
        );
        const projectNode = created.state.widgetTree.root.children.find(
          (node) => node.id?.startsWith("proj-"),
        );
        const project = projectNode.id.slice("proj-".length);
        const appId = `cross-${scenario.id.toLowerCase().replace(/[^a-z0-9-]/g, "-")}`;
        await dev("project.write", {
          path: `${project}/app.json`,
          content: JSON.stringify(
            {
              name: appId,
              version: "0.1.0",
              entry: "bundle.js",
              capabilities: ["storage:kv", "lxmf:send"],
            },
            null,
            2,
          ),
        });
        await dev("project.write", {
          path: `${project}/bundle.js`,
          content: FIXTURE_BUNDLE,
        });

        await approve(developer, () => dev("preview"), "Preview an app");
        const preview = await waitFor(
          dev,
          (value) => stateText(value.preview).includes("Cross-device hello"),
          "preview did not render",
        );
        const previewTree = preview.preview.widgetTree;
        await dev("preview", { action: "stop" });

        await approve(developer, () => dev("package"), "Package and sign");
        const packaged = await waitFor(
          dev,
          (value) => /[A-Za-z0-9_-]{94}/.test(stateText(value.state)),
          "package 256t did not appear",
        );
        const qr = packaged.state.widgetTree.root.children.find(
          (node) => node.id === "package-qr",
        );
        const t256 = qr.props.value;
        assert(
          /^[A-Za-z0-9_-]{94}$/.test(t256),
          `${scenario.id}: invalid 256t`,
        );
        await approve(developer, () => dev("publish"), "Publish an app");
        await waitFor(
          dev,
          (value) => stateText(value.state).includes("Published v"),
          "publish did not complete",
        );

        if (!negativeTargets.has(runner)) {
          const sourceArchive = await dev("cas.read", { t256 });
          const corrupted = Buffer.from(sourceArchive.archiveHex, "hex");
          assert(
            corrupted.length > 0,
            `${scenario.id}: published archive is empty`,
          );
          corrupted[Math.floor(corrupted.length / 2)] ^= 0x01;
          const beforeNegative = await target("state");
          const negative = await target("negative.verify", {
            t256,
            archiveHex: corrupted.toString("hex"),
          });
          const afterNegative = await target("state");
          assert(
            negative.refused === true && negative.stage === "sha512",
            `${scenario.id}: corrupted archive was not refused at SHA-512`,
          );
          assert(
            negative.codeExecuted === false,
            `${scenario.id}: corrupted archive reached code execution`,
          );
          assert(
            JSON.stringify(beforeNegative.state) ===
              JSON.stringify(afterNegative.state),
            `${scenario.id}: corrupted archive changed runtime state`,
          );
          record.negative = { target: runner, ...negative };
          negativeTargets.add(runner);
        }

        const publisher = await dev("trust.show");
        const sourcePublicKey = decodePublisherIdentity256t(
          publisher.identity256t,
        );
        await approve(
          runner,
          () =>
            target("trust.import", {
              identity256t: publisher.identity256t,
              label: `${developer} ${scenario.id}`,
            }),
          "Trust a new publisher",
        );
        const installed = await approve(
          runner,
          () => target("install", { t256 }),
          "install",
        );
        assert(
          installed.trusted === true,
          `${scenario.id}: target did not mark publisher trusted`,
        );
        assert(
          installed.source !== "local-cas" && installed.fetchPath !== "inline",
          `${scenario.id}: target did not fetch the archive from the mesh`,
        );
        assert(
          installed.publisherPublicKey === sourcePublicKey,
          `${scenario.id}: installed publisher is not the source peer identity`,
        );
        assert(
          installed.servingPublicKey === sourcePublicKey,
          `${scenario.id}: signed locator does not attribute the fetch to the source peer`,
        );
        await approve(runner, () => target("run", { appId }), "run");
        const running = await waitFor(
          target,
          (value) => stateText(value.state).includes("Cross-device hello"),
          "installed app did not render",
        );
        const runTree = running.state.widgetTree;
        deepStrictEqual(
          runTree,
          previewTree,
          `${scenario.id}: preview/run widget trees differ`,
        );
        await target("ui.event", { nodeId: "send", event: "cross.send" });
        await waitFor(
          target,
          (value) => stateText(value.state).includes("DENIED:"),
          "capability denial was not visible",
        );

        record.hops.push({
          from: developer,
          to: runner,
          status: "passed",
          t256,
          appId,
          trusted: true,
          source: installed.source ?? installed.fetchPath ?? "resource",
          servingPublicKey: installed.servingPublicKey,
        });
        writeFileSync(
          join(scenarioDir, "hop.json"),
          `${JSON.stringify(record.hops[0], null, 2)}\n`,
        );
        writeFileSync(
          join(scenarioDir, "widget-tree.json"),
          `${JSON.stringify(runTree, null, 2)}\n`,
        );
        step(`${scenario.id}: ${developer} → ${runner} passed`);
      } catch (error) {
        record.status = "failed";
        record.error = error instanceof Error ? error.message : String(error);
        for (const id of scenario.chain) {
          await ui
            .get(id)
            ?.screenshot?.(join(scenarioDir, `${id}-failure.png`))
            .catch(() => {});
          try {
            const state = await commandFor(id)("state");
            writeFileSync(
              join(scenarioDir, `${id}-state.json`),
              `${JSON.stringify(state, null, 2)}\n`,
            );
          } catch {}
          try {
            writeFileSync(
              join(scenarioDir, `${id}.log`),
              readFileSync(logPath(id)),
            );
          } catch {}
        }
        if (!allowSkip) throw error;
      }
    }

    coverage = coverageFromProof(proof);
    if (!allowSkip && scenarioSelection === undefined) {
      assert(
        coverage.empty.length === 0,
        `coverage cells empty: ${coverage.empty.join(", ")}`,
      );
    }
    step(`artifacts: ${artifactRoot}`);
  } finally {
    coverage = coverageFromProof(proof);
    writeFileSync(
      join(artifactRoot, "proof.json"),
      `${JSON.stringify(proof, null, 2)}\n`,
    );
    writeFileSync(
      join(artifactRoot, "coverage.json"),
      `${JSON.stringify(coverage, null, 2)}\n`,
    );
    for (const driver of ui.values()) await driver.close().catch(() => {});
    await control?.close().catch(() => {});
    if (!attach) await tearDown(owned);
  }
});
