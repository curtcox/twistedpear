#!/usr/bin/env node
// @ts-nocheck
/**
 * Real-binary FreenetSupervisor smoke (simulator-first workstream C).
 *
 * Starts a user-supplied, optionally hash-verified Freenet executable through
 * FreenetSupervisor, asserts readiness + token hygiene, then stops cleanly.
 */

import { createHash } from "node:crypto";
import { createReadStream, existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { assert, runMain, section, step } from "../lib/index.mjs";

const binary =
  process.env.FREENET_BINARY ??
  (existsSync("/Applications/Freenet.app/Contents/MacOS/freenet-bin")
    ? "/Applications/Freenet.app/Contents/MacOS/freenet-bin"
    : null);
const expectedSha256 = process.env.FREENET_BINARY_SHA256;
const label = process.env.FREENET_SUPERVISOR_LABEL ?? "local-user-binary";
const keepState = process.env.FREENET_KEEP_LOCAL_STATE === "1";

assert(binary !== null, "FREENET_BINARY (or Freenet.app) is required");
assert(existsSync(binary), `Freenet binary not found: ${binary}`);

const spikeRoot = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(spikeRoot, "../..");
const dataDir = mkdtempSync(join(tmpdir(), "tp-freenet-supervisor-"));

async function sha256File(path) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path)) {
    hash.update(chunk);
  }
  return hash.digest("hex");
}

await runMain(async () => {
  section("FreenetSupervisor user-supplied binary");
  const { FreenetSupervisor, redactFreenetAuthToken } = await import(
    join(repoRoot, "packages/host-core/dist/index.js")
  );

  const statuses = [];
  const supervisor = new FreenetSupervisor({
    binaryPath: binary,
    ...(expectedSha256 !== undefined ? { expectedSha256 } : {}),
    dataDir,
    readyTimeoutMs: Number(process.env.FREENET_SUPERVISOR_READY_MS ?? 45_000),
    maxRestartAttempts: 1,
    onStatus: (status, detail) => {
      statuses.push({ status, detail: detail ?? null });
    }
  });

  try {
    if (expectedSha256 !== undefined) {
      step(`verifying SHA-256 ${expectedSha256.slice(0, 12)}…`);
    } else {
      const actual = await sha256File(binary);
      step(`binary SHA-256 ${actual} (pass FREENET_BINARY_SHA256 to enforce)`);
    }

    step("starting supervised Freenet process");
    const snapshot = await supervisor.start();
    assert(snapshot.status === "online", `expected online, got ${snapshot.status}`);
    assert(snapshot.wsUrl !== null && snapshot.wsUrl.startsWith("ws://127.0.0.1:"), "wsUrl");
    assert(
      snapshot.authToken !== null && snapshot.authToken.length >= 32,
      "auth token generated"
    );
    assert(!snapshot.wsUrl.includes(snapshot.authToken), "token must not appear in wsUrl");
    assert(
      !JSON.stringify(statuses).includes(snapshot.authToken),
      "token must not appear in status callbacks"
    );
    const redacted = redactFreenetAuthToken(
      `token=${snapshot.authToken}`,
      snapshot.authToken
    );
    assert(redacted === "token=[redacted-token]", "redaction helper");

    step("stopping supervised Freenet process");
    await supervisor.stop();
    assert(supervisor.status === "stopped", `expected stopped, got ${supervisor.status}`);

    const proof = {
      schemaVersion: 1,
      label,
      recordedAt: new Date().toISOString(),
      environment: "user-supplied-binary",
      binaryPath: binary,
      binarySha256Hex: await sha256File(binary),
      expectedSha256Enforced: expectedSha256 !== undefined,
      statuses,
      wsUrlShape: "ws://127.0.0.1:<ephemeral>/v1/contract/command",
      authTokenInUrl: false,
      conclusion: "FreenetSupervisor reached online and stopped cleanly"
    };
    const outDir = join(repoRoot, ".tmp");
    mkdirSync(outDir, { recursive: true });
    const outPath = join(outDir, `freenet-supervisor-proof-${label}.json`);
    writeFileSync(outPath, `${JSON.stringify(proof, null, 2)}\n`);
    console.log(`[freenet-supervisor] proof written to ${outPath}`);
  } finally {
    await supervisor.stop().catch(() => {});
    if (keepState) {
      console.error(`Preserved Freenet supervisor state at ${dataDir}`);
    } else {
      rmSync(dataDir, { recursive: true, force: true });
    }
  }
});
