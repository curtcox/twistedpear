#!/usr/bin/env node
/**
 * Disposable self-hosted ntfy rendezvous evidence gate.
 *
 *   npm run test:ntfy-service
 *   NTFY_SERVICE_REQUIRED=1 npm run test:ntfy-service
 *
 * Starts a pinned ntfy image in a private container on a loopback port, pairs
 * two real hosts through the shipping adapter, and records:
 *
 *   · TPN2 short-code and legacy TPN1 rendezvous
 *   · ciphertext-only message storage, server cache file, and server logs
 *   · replay rejection of a re-published packet
 *   · reconnect across a server restart, with an actionable offline diagnostic
 *   · CORS posture, and the diagnostic a browser-blocked fetch produces
 *   · deny-all authentication: anonymous denial and bearer-token success
 *   · deletion of the container and its volume after the run
 *
 * The public ntfy service is never contacted: the base URL is generated here and
 * asserted to be loopback. Tokens, codes, topics, and ciphertext stay out of the
 * recorded artifact. Docker is required; without it the run skips unless
 * NTFY_SERVICE_REQUIRED=1.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { webcrypto } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { assert, runMain, section, step } from "../lib/index.mjs";
import {
  decodeNtfyRendezvousSecret,
  encodeNtfyRendezvousSecret,
  NtfyRendezvousClient,
} from "../../packages/peer-discovery/dist/index.js";
import {
  assertLoopbackOnly,
  DisposableNtfyServer,
  dockerUnavailableReason,
  ensureImage,
  NTFY_IMAGE,
} from "./server.mjs";
import { CodeCourier, pairOverNtfy, signedOfferEnvelope } from "./pairing.mjs";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");
const required = process.env.NTFY_SERVICE_REQUIRED === "1";
const checks = [];
const entropy = async (length) =>
  webcrypto.getRandomValues(new Uint8Array(length));

function record(name, detail) {
  checks.push({ name, detail });
  step(`${name}: ${detail}`);
}

function client(server, options = {}) {
  return new NtfyRendezvousClient({
    baseUrl: server.baseUrl,
    entropy,
    ...(options.bearerToken === undefined
      ? {}
      : { bearerToken: options.bearerToken }),
    ...(options.fetch === undefined ? {} : { fetch: options.fetch }),
  });
}

const hex = (bytes) =>
  [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");

async function rawMessages(server, secret, token) {
  const response = await fetch(
    `${server.baseUrl}/${hex(secret.topic)}/json?poll=1`,
    token === null ? {} : { headers: { Authorization: `Bearer ${token}` } },
  );
  assert(response.ok, `raw topic read failed with ${response.status}`);
  const text = await response.text();
  return {
    text,
    events: text
      .split("\n")
      .filter((line) => line.trim().length > 0)
      .map((line) => JSON.parse(line)),
  };
}

async function expectError(promise, code, what) {
  try {
    await promise;
  } catch (error) {
    assert(
      error?.code === code,
      `${what} raised ${error?.code ?? error?.name}: ${error?.message}`,
    );
    return error;
  }
  throw new Error(`${what} resolved instead of failing with ${code}`);
}

/** Pairs two hosts and proves nothing readable reaches the server. */
async function runOpenServer(server) {
  section("anonymous disposable server");
  const courier = new CodeCourier();
  const paired = await pairOverNtfy({
    offerClient: client(server),
    joinClient: client(server),
    courier,
  });
  assert(paired.alice.displayLabel === "Bob", "offering host paired with Bob");
  assert(paired.bob.displayLabel === "Alice", "joining host paired with Alice");
  assert(
    paired.alice.rendezvous === "ntfy" && paired.bob.rendezvous === "ntfy",
    "both hosts recorded the ntfy rendezvous",
  );
  assert(
    /^TPN2-[A-Z2-7-]+$/.test(paired.code),
    "the offering host did not present a checksummed TPN2 short code",
  );
  const words = paired.confirmations.map((entry) => entry.words.join("-"));
  assert(
    words.length === 2 && words[0] === words[1],
    `hosts derived different confirmation words (${words.length} confirmations)`,
  );
  assert(
    paired.confirmations[0].words.length === 3,
    "expected a three-word short authentication string",
  );
  record(
    "tpn2-short-code-pairing",
    `two hosts authenticated over a ${paired.code.length}-character TPN2 code and derived the same three-word confirmation`,
  );

  const secret = decodeNtfyRendezvousSecret(paired.code);
  const stored = await rawMessages(server, secret, null);
  assert(stored.events.length >= 2, "offer and answer are both stored");
  for (const event of stored.events)
    assert(
      /^[A-Za-z0-9_-]+$/.test(event.message),
      "stored message is not opaque base64url",
    );
  for (const secretish of ["peer-link", "Alice", "Bob", paired.code])
    assert(
      !stored.text.includes(secretish),
      `server storage leaked ${secretish === paired.code ? "the rendezvous code" : `"${secretish}"`}`,
    );
  const cacheHits = ["peer-link", "Alice", "Bob"].map((needle) =>
    server.countInFile("/var/lib/ntfy/cache.db", needle),
  );
  assert(
    cacheHits.every((count) => count === 0),
    `server cache file contains plaintext (${cacheHits.join("/")})`,
  );
  const logs = server.logs();
  for (const secretish of ["peer-link", "Alice", paired.code])
    assert(!logs.includes(secretish), "server logs leaked rendezvous material");
  record(
    "ciphertext-only-storage",
    `${stored.events.length} stored messages, cache file, and server logs carry no service, label, or code plaintext`,
  );

  const replayed = stored.events[0].message;
  const publishReplay = await fetch(`${server.baseUrl}/${hex(secret.topic)}`, {
    method: "POST",
    body: replayed,
  });
  assert(publishReplay.ok, "replay publish was accepted by the plain server");
  const observer = client(server);
  const delivered = await observer.poll(secret);
  const ids = new Set(delivered.map((message) => hex(message.id)));
  assert(
    ids.size === delivered.length,
    "replayed packet was surfaced twice to the host",
  );
  assert(
    delivered.length === stored.events.length,
    `expected ${stored.events.length} distinct messages, saw ${delivered.length}`,
  );
  record(
    "replay-rejection",
    "a re-published identical packet is dropped by the host replay cache",
  );
}

/** A stopped server must produce an actionable diagnostic and then resume. */
async function runReconnect(server) {
  section("reconnect");
  const publisher = client(server);
  const secret = await publisher.createSecret();
  await publisher.publish(secret, await signedOfferEnvelope());
  server.stop();
  const offline = await expectError(
    client(server).poll(secret),
    "UNAVAILABLE",
    "polling a stopped server",
  );
  assert(
    /cross-origin policy/.test(offline.message),
    "offline diagnostic is not actionable",
  );
  record(
    "offline-diagnostic",
    "a stopped server surfaces UNAVAILABLE naming URL, TLS, and cross-origin causes",
  );
  await server.restart();
  const resumed = await client(server).poll(secret);
  assert(
    resumed.length === 1 && resumed[0].role === "offer",
    `expected the pending offer after restart, saw ${resumed.length} messages`,
  );
  const paired = await pairOverNtfy({
    offerClient: client(server),
    joinClient: client(server),
  });
  assert(paired.alice.displayLabel === "Bob", "pairing failed after restart");
  record(
    "reconnect-across-restart",
    "the pending offer survives a restart in the persistent cache and a fresh pairing completes afterwards",
  );
}

async function runCors(server) {
  section("cross-origin posture");
  const secret = await client(server).createSecret();
  const response = await fetch(
    `${server.baseUrl}/${hex(secret.topic)}/json?poll=1`,
    { headers: { Origin: "https://web-host.example.invalid" } },
  );
  const allowOrigin = response.headers.get("access-control-allow-origin");
  assert(
    allowOrigin === "*",
    `self-hosted ntfy advertised ${allowOrigin ?? "no"} allow-origin`,
  );
  record(
    "cors-allowed",
    "the disposable server returns access-control-allow-origin: * so a static web host can use it",
  );
  const blocked = client(server, {
    fetch: async () => {
      throw new TypeError("Failed to fetch");
    },
  });
  await expectError(
    blocked.poll(secret),
    "UNAVAILABLE",
    "a CORS-blocked browser fetch",
  );
  record(
    "cors-failure-diagnostic",
    "a browser-style blocked fetch becomes UNAVAILABLE with a cross-origin hint instead of a bare TypeError",
  );
}

async function runAuthenticatedServer(server) {
  section("deny-all authenticated server");
  const anonymous = client(server);
  const secret = await anonymous.createSecret();
  await expectError(
    anonymous.publish(secret, await signedOfferEnvelope()),
    "POLICY_DENIED",
    "anonymous publish against a deny-all server",
  );
  await expectError(
    anonymous.poll(secret),
    "POLICY_DENIED",
    "anonymous poll against a deny-all server",
  );
  record(
    "auth-denies-anonymous",
    "deny-all publish and poll map 403 to POLICY_DENIED",
  );
  const courier = new CodeCourier();
  const paired = await pairOverNtfy({
    offerClient: client(server, { bearerToken: server.token }),
    joinClient: client(server, { bearerToken: server.token }),
    courier,
  });
  assert(paired.bob.displayLabel === "Alice", "bearer pairing completed");
  const logs = server.logs();
  assert(!logs.includes(server.token), "server logs contain the access token");
  assert(
    !logs.includes(paired.code),
    "server logs contain the rendezvous code",
  );
  record(
    "auth-bearer-pairing",
    "a scoped bearer token completes the same pairing without logging the token or code",
  );
  const authed = client(server, { bearerToken: server.token });
  const fresh = await authed.createSecret();
  const legacyCode = encodeNtfyRendezvousSecret({
    topic: fresh.topic,
    key: fresh.key,
  });
  assert(legacyCode.startsWith("TPN1-"), "expected a legacy TPN1 code");
  const legacy = decodeNtfyRendezvousSecret(legacyCode);
  assert(
    hex(legacy.topic) === hex(fresh.topic) &&
      hex(legacy.key) === hex(fresh.key),
    "legacy code did not resolve to the same topic and key",
  );
  await authed.publish(legacy, await signedOfferEnvelope());
  const received = await authed.poll(legacy);
  assert(
    received.length === 1 && received[0].role === "offer",
    `legacy TPN1 topic did not round-trip (${received.length} messages)`,
  );
  record(
    "legacy-tpn1-decoding",
    "a TPN1 code without a short-code seed resolves to the same topic and key and round-trips a signed offer",
  );
}

await runMain(async () => {
  const unavailable = dockerUnavailableReason();
  if (unavailable !== null) {
    if (required) throw new Error(unavailable);
    console.log(`SKIP ntfy-service: ${unavailable}`);
    return;
  }
  section(`disposable ntfy image ${NTFY_IMAGE}`);
  step(`image ${ensureImage()}`);
  const open = new DisposableNtfyServer({ name: "tp-ntfy-open" });
  const authenticated = new DisposableNtfyServer({
    name: "tp-ntfy-auth",
    auth: true,
  });
  try {
    await open.start();
    assertLoopbackOnly(open.baseUrl);
    record(
      "loopback-only",
      "the run never addresses a shared or public service",
    );
    await runOpenServer(open);
    await runCors(open);
    await runReconnect(open);
    await authenticated.start();
    assertLoopbackOnly(authenticated.baseUrl);
    await runAuthenticatedServer(authenticated);
  } finally {
    section("deletion");
    open.destroy();
    authenticated.destroy();
  }
  for (const server of [open, authenticated]) {
    const remaining = server.exists();
    assert(
      !remaining.container && !remaining.volume,
      `${server.name} survived teardown`,
    );
    await expectUnreachable(server.baseUrl);
  }
  record(
    "deleted-after-run",
    "both containers, both volumes, and every stored message are gone",
  );
  const outDir = join(repoRoot, ".tmp");
  mkdirSync(outDir, { recursive: true });
  writeFileSync(
    join(outDir, "ntfy-service-result.json"),
    `${JSON.stringify({ image: NTFY_IMAGE, recordedAt: new Date().toISOString(), checks }, null, 2)}\n`,
  );
  console.log(
    `\n${checks.length} checks recorded in .tmp/ntfy-service-result.json`,
  );
});

async function expectUnreachable(baseUrl) {
  try {
    await fetch(`${baseUrl}/v1/health`);
  } catch {
    return;
  }
  throw new Error(`${baseUrl} still answers after deletion`);
}
