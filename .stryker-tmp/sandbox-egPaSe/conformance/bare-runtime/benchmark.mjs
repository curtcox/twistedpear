#!/usr/bin/env node
// @ts-nocheck
/**
 * Bare-runtime crypto benchmark (Phase 2 M1).
 *
 * Run: bare conformance/bare-runtime/benchmark.mjs
 * Node baseline: node conformance/bare-runtime/benchmark-node.mjs
 */

import { PureCryptoProvider } from "../../packages/reticulum-ts/dist/crypto/pure.js";
import { rnsHkdf } from "../../packages/reticulum-ts/dist/crypto/hkdf.js";
import { Identity } from "../../packages/reticulum-ts/dist/identity.js";
import { bareRuntime } from "../../packages/reticulum-ts/dist/runtime/bare/runtime.js";

const ITERATIONS = Number.parseInt(process.env.BENCHMARK_ITERATIONS ?? "200", 10);

function nowMs() {
  if (typeof performance !== "undefined" && typeof performance.now === "function") {
    return performance.now();
  }

  return Date.now();
}

function benchmark(name, fn) {
  const started = nowMs();
  for (let index = 0; index < ITERATIONS; index += 1) {
    fn();
  }
  const elapsedMs = nowMs() - started;
  const opsPerSec = Math.round((ITERATIONS / elapsedMs) * 1000);
  return { name, elapsedMs, opsPerSec, iterations: ITERATIONS };
}

function runCryptoBenchmarks(provider) {
  const identity = new Identity(provider);
  const peerPrivate = provider.randomBytes(32);
  const peerPublic = provider.x25519PublicFromPrivate(peerPrivate);
  const privateKey = identity.getPrivateKey().subarray(0, 32);
  const payload = new Uint8Array(512);
  for (let index = 0; index < payload.length; index += 1) {
    payload[index] = index & 0xff;
  }

  const linkId = identity.hash.slice(0, 16);
  const shared = provider.x25519SharedSecret(privateKey, peerPublic);
  const derived = rnsHkdf(provider, 64, shared, linkId, null);
  const sigKey = identity.getPrivateKey().subarray(32);

  return [
    benchmark("x25519-keygen", () => {
      const ephemeral = provider.randomBytes(32);
      provider.x25519PublicFromPrivate(ephemeral);
    }),
    benchmark("x25519-shared-secret", () => {
      provider.x25519SharedSecret(privateKey, peerPublic);
    }),
    benchmark("hkdf-link-key", () => {
      rnsHkdf(provider, 64, shared, linkId, null);
    }),
    benchmark("aes-256-cbc-encrypt-512", () => {
      provider.aes256CbcEncrypt(payload, derived.slice(0, 32), derived.slice(32, 48));
    }),
    benchmark("ed25519-sign-64", () => {
      provider.ed25519Sign(sigKey, payload.slice(0, 64));
    }),
    benchmark("sha256-resource-chunk", () => {
      provider.sha256(payload);
    })
  ];
}

async function main() {
  const provider = new PureCryptoProvider();
  const runtime = bareRuntime({ storePath: ".bare-benchmark-store" });

  await runtime.store.set("benchmark", new Uint8Array([1]));

  const results = runCryptoBenchmarks(provider);
  const summary = {
    runtime: "bare",
    provider: "pure",
    iterations: ITERATIONS,
    results
  };

  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error);
  throw error;
});
