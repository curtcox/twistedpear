#!/usr/bin/env node
/**
 * Bare smoke runner for reticulum-ts pure crypto/packet core (M2).
 *
 * Runs outside Vitest so the same assertions can execute under the Bare runtime.
 * Uses only the PureCryptoProvider path — no node:crypto or sodium-native.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Announce } from "../../packages/reticulum-ts/dist/announce.js";
import {
  Destination,
  DestinationDirection,
  DestinationType,
} from "../../packages/reticulum-ts/dist/destination.js";
import {
  bytesToHex,
  hexToBytes,
} from "../../packages/reticulum-ts/dist/crypto/bytes.js";
import { PureCryptoProvider } from "../../packages/reticulum-ts/dist/crypto/pure.js";
import { Token } from "../../packages/reticulum-ts/dist/crypto/token.js";
import { Identity } from "../../packages/reticulum-ts/dist/identity.js";
import { Packet } from "../../packages/reticulum-ts/dist/packet.js";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");
const provider = new PureCryptoProvider();

function loadJson(relativePath) {
  return JSON.parse(readFileSync(join(repoRoot, relativePath), "utf8"));
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertEqualHex(actual, expectedHex, label) {
  assert(
    bytesToHex(actual) === expectedHex,
    `${label}: expected ${expectedHex}, got ${bytesToHex(actual)}`,
  );
}

function runCryptoSmoke() {
  const crypto = loadJson("conformance/vectors/crypto.json");

  for (const vector of crypto.sha256.slice(0, 3)) {
    assertEqualHex(
      provider.sha256(hexToBytes(vector.inputHex)),
      vector.digestHex,
      "sha256",
    );
  }

  for (const vector of crypto.hmacSha256.slice(0, 2)) {
    assertEqualHex(
      provider.hmacSha256(
        hexToBytes(vector.keyHex),
        hexToBytes(vector.inputHex),
      ),
      vector.digestHex,
      "hmacSha256",
    );
  }

  for (const vector of crypto.hkdfSha256.slice(0, 2)) {
    assertEqualHex(
      provider.hkdf({
        hash: "sha256",
        keyMaterial: hexToBytes(vector.keyMaterialHex),
        salt: hexToBytes(vector.saltHex),
        info: hexToBytes(vector.infoHex),
        length: vector.length,
      }),
      vector.outputHex,
      "hkdf",
    );
  }
}

function runIdentitySmoke() {
  const identity = loadJson("conformance/vectors/identity.json");

  const alice = identity.identities.find((entry) => entry.name === "alice");
  assert(alice !== undefined, "missing alice identity vector");

  const loaded = Identity.fromBytes(provider, hexToBytes(alice.privateKeyHex));
  assert(loaded !== null, "failed to load alice identity");
  assertEqualHex(loaded.getPublicKey(), alice.publicKeyHex, "alice public key");
  assertEqualHex(loaded.hash, alice.identityHashHex, "alice identity hash");

  const tokenVector = identity.token[0];
  const token = new Token(provider, hexToBytes(tokenVector.keyHex));
  assertEqualHex(
    token.encrypt(hexToBytes(tokenVector.plaintextHex), {
      iv: hexToBytes(tokenVector.ivHex),
    }),
    tokenVector.ciphertextHex,
    "token encrypt",
  );

  const signatureVector = identity.signatures[0];
  assert(
    loaded.validate(
      hexToBytes(signatureVector.signatureHex),
      hexToBytes(signatureVector.messageHex),
    ),
    "signature validate",
  );
}

function runPacketSmoke() {
  const packetVectors = loadJson("conformance/vectors/packet.json");

  for (const vector of packetVectors.packets.slice(0, 4)) {
    const packet = Packet.decode(provider, hexToBytes(vector.rawHex));
    assert(packet !== null, `failed to decode packet ${vector.name}`);
    assertEqualHex(packet.hash(), vector.packetHashHex, `${vector.name} hash`);
    assert(
      bytesToHex(packet.destinationHash) === vector.destinationHashHex,
      `${vector.name} destination hash`,
    );
  }

  for (const vector of packetVectors.announces) {
    const packet = Packet.decode(provider, hexToBytes(vector.rawHex));
    assert(packet !== null, `failed to decode announce ${vector.name}`);
    assert(
      Announce.validate(provider, packet),
      `announce validation failed for ${vector.name}`,
    );
    const parsed = Announce.parse(packet);
    assert(parsed !== null, `failed to parse announce ${vector.name}`);
    assert(
      bytesToHex(parsed.signature) === vector.signatureHex,
      `${vector.name} signature`,
    );
  }
}

function runDestinationSmoke() {
  const packetVectors = loadJson("conformance/vectors/packet.json");

  for (const vector of packetVectors.destinations.slice(0, 3)) {
    const destination = new Destination(provider, {
      identity: hexToBytes(vector.identityHashHex),
      direction: DestinationDirection.OUT,
      type: DestinationType.SINGLE,
      appName: vector.appName,
      aspects: vector.aspects,
    });
    assert(
      bytesToHex(destination.nameHash) === vector.nameHashHex,
      `${vector.name} name hash`,
    );
    assert(
      destination.hexhash === vector.destinationHashHex,
      `${vector.name} destination hash`,
    );
  }
}

function main() {
  runCryptoSmoke();
  runIdentitySmoke();
  runDestinationSmoke();
  runPacketSmoke();
  console.log("bare-smoke: all checks passed (pure provider)");
}

main();
