#!/usr/bin/env node
/**
 * BareCryptoProvider benchmark (Phase 2 M1).
 * Compares sodium-native curve ops vs pure @noble on the same host runtime.
 */

import { createRequire } from "node:module";
import { BareCryptoProvider } from "../../packages/reticulum-ts/dist/crypto/bare.js";
import { PureCryptoProvider } from "../../packages/reticulum-ts/dist/crypto/pure.js";
import { rnsHkdf } from "../../packages/reticulum-ts/dist/crypto/hkdf.js";
import { Identity } from "../../packages/reticulum-ts/dist/identity.js";

// Bare exposes CommonJS-style require globally. Supply the same loader when
// this provider benchmark is executed under Node in CI.
globalThis.require ??= createRequire(import.meta.url);

const ITERATIONS = Number.parseInt(globalThis.process?.env?.BENCHMARK_ITERATIONS ?? "200", 10);
const MIN_DURATION_MS = Number.parseInt(globalThis.process?.env?.BENCHMARK_MIN_DURATION_MS ?? "250", 10);

function benchmark(name, fn) {
  const warmupIterations = Math.min(50, ITERATIONS);
  for (let index = 0; index < warmupIterations; index += 1) {
    fn();
  }

  const started = Date.now();
  let iterations = 0;
  let elapsedMs = 0;
  do {
    for (let index = 0; index < ITERATIONS; index += 1) {
      fn();
    }
    iterations += ITERATIONS;
    elapsedMs = Date.now() - started;
  } while (elapsedMs < MIN_DURATION_MS);

  const opsPerSec = Math.round((iterations / elapsedMs) * 1000);
  return { name, elapsedMs, opsPerSec, iterations };
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
  const bareProvider = new BareCryptoProvider();
  const pureProvider = new PureCryptoProvider();

  console.log(
    JSON.stringify(
      {
        runtime: "bare-crypto-provider",
        iterations: ITERATIONS,
        results: {
          bare: runCryptoBenchmarks(bareProvider),
          pure: runCryptoBenchmarks(pureProvider)
        }
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  throw error;
});
