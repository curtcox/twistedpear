#!/usr/bin/env node
/**
 * Shared Reticulum TCP slice against the docker leaf-echo Python peer.
 * Used by bare-device and ios-sim conformance lanes.
 */

import { hexToBytes } from "../../../packages/reticulum-ts/dist/crypto/bytes.js";
import { PureCryptoProvider } from "../../../packages/reticulum-ts/dist/crypto/pure.js";
import { DestinationDirection, DestinationType } from "../../../packages/reticulum-ts/dist/destination.js";
import { DestinationProofStrategy } from "../../../packages/reticulum-ts/dist/registered-destination.js";
import { Identity } from "../../../packages/reticulum-ts/dist/identity.js";
import { bareRuntime } from "../../../packages/reticulum-ts/dist/runtime/bare/runtime.js";
import { Reticulum } from "../../../packages/reticulum-ts/dist/reticulum.js";
import {
  INTEROP_HOST,
  LEAF_ECHO_PORT,
  bytesToAscii,
  loadIdentityVectors,
  repoRoot,
  sleep,
  waitForInterfaceOnline,
  waitForReceipt,
  waitForPath
} from "./helpers.mjs";

export async function runBareTcpSlice(options = {}) {
  const {
    label = "tcp-slice",
    storePath = `${repoRoot}/.tcp-slice-store`
  } = options;

  const vectors = loadIdentityVectors();
  const aliceEntry = vectors.identities.find((entry) => entry.name === "alice");
  const bobEntry = vectors.identities.find((entry) => entry.name === "bob");
  if (aliceEntry === undefined || bobEntry === undefined) {
    throw new Error("Missing alice/bob identity vectors");
  }

  const provider = new PureCryptoProvider();
  const runtime = bareRuntime({ storePath });
  const reticulum = Reticulum.create({ provider, runtime });
  reticulum.start();

  const iface = await reticulum.addTcpClientInterface({
    name: `${label}-peer`,
    targetHost: INTEROP_HOST,
    targetPort: LEAF_ECHO_PORT
  });
  await waitForInterfaceOnline(iface);

  const aliceIdentity = Identity.fromBytes(provider, hexToBytes(aliceEntry.privateKeyHex));
  const bobIdentity = Identity.fromBytes(provider, hexToBytes(bobEntry.privateKeyHex));
  if (aliceIdentity === null || bobIdentity === null) {
    throw new Error("Failed to load interop identities");
  }

  const aliceIn = reticulum.registerDestination({
    provider,
    identity: aliceIdentity,
    direction: DestinationDirection.IN,
    type: DestinationType.SINGLE,
    appName: "example",
    aspects: ["echo"]
  });
  aliceIn.setProofStrategy(DestinationProofStrategy.PROVE_ALL);

  const bobOut = reticulum.registerDestination({
    provider,
    identity: bobIdentity,
    direction: DestinationDirection.OUT,
    type: DestinationType.SINGLE,
    appName: "example",
    aspects: ["echo"]
  });

  await aliceIn.announce();
  await waitForPath(reticulum, bobOut.hash);

  const received = new Map();
  aliceIn.setPacketCallback((data) => {
    received.set(bytesToAscii(data), data);
  });

  const payload = new TextEncoder().encode(`${label}-ping`);
  const receipt = await bobOut.send(payload, { createReceipt: true });
  await waitForReceipt(receipt);

  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    if (received.has(`${label}-ping`) && received.has("hello from python leaf echo")) {
      break;
    }

    await sleep(100);
  }

  if (!received.has(`${label}-ping`)) {
    throw new Error(`${label}: outbound echo was not received`);
  }

  if (!received.has("hello from python leaf echo")) {
    throw new Error(`${label}: Python greeting was not received (reverse direction)`);
  }

  await iface.close();
  reticulum.stop();
}
