#!/usr/bin/env node
/**
 * Bonjour discovery interop: Node runtime ⇄ Bare runtime (Phase 5 M3 CI tier).
 * Peers discover each other via BonjourDiscoveryProvider; the linked multicast
 * bridge forwards unicast UDP on the AutoInterface data port.
 */

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { PureCryptoProvider } from "../../packages/reticulum-ts/dist/crypto/pure.js";
import { bareRuntime } from "../../packages/reticulum-ts/dist/runtime/bare/runtime.js";
import { nodeRuntime } from "../../packages/reticulum-ts/dist/runtime/node/runtime.js";
import { Reticulum } from "../../packages/reticulum-ts/dist/reticulum.js";
import { AutoInterfaceBridge } from "../../packages/reticulum-interfaces/dist/auto-bridge.js";
import { AUTO_DEFAULT_DATA_PORT } from "../../packages/reticulum-interfaces/dist/auto.js";
import { BonjourDiscoveryProvider } from "../../packages/reticulum-interfaces/dist/bonjour.js";
import {
  createLinkedBonjourBridge,
  createLinkedMulticastBridge,
  linkBonjourBridges,
  linkMulticastBridges,
} from "./linked-bridge.mjs";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * @param {object} options
 * @param {import("../../packages/reticulum-ts/dist/runtime/runtime.js").Runtime} options.runtime
 * @param {ReturnType<typeof createLinkedMulticastBridge>} options.bridge
 * @param {ReturnType<typeof createLinkedBonjourBridge>} options.bonjourBridge
 * @param {string} options.label
 */
async function openBonjourPeer({ runtime, bridge, bonjourBridge, label }) {
  const provider = new PureCryptoProvider();
  const reticulum = Reticulum.create({ provider, runtime });
  reticulum.start();

  const bonjour = new BonjourDiscoveryProvider(bonjourBridge);
  /** @type {import("../../packages/reticulum-interfaces/dist/auto-discovery.js").DiscoveryPeer[]} */
  const pendingPeers = [];

  bonjour.setEvents({
    onPeer: (peer) => {
      pendingPeers.push(peer);
    },
  });

  await bonjour.start();

  const auto = await AutoInterfaceBridge.open(provider, {
    name: label,
    provider,
    runtime,
    bridge,
    onAdvertiseInterface: async (iface) => {
      await bonjour.advertise(
        iface.name,
        iface.linkLocalAddress,
        AUTO_DEFAULT_DATA_PORT,
      );
    },
    onPeerSpawn: (peer) => {
      reticulum.registerInterface(peer);
    },
    onPeerDetach: (peer) => {
      reticulum.unregisterInterface(peer);
    },
  });

  bonjour.setEvents({
    onPeer: (peer) => {
      auto.notifyPeerDiscovered(peer.address, peer.ifname);
    },
  });

  for (const peer of pendingPeers) {
    auto.notifyPeerDiscovered(peer.address, peer.ifname);
  }

  return { provider, reticulum, auto, bonjour, bridge };
}

export async function runBonjourInterop() {
  const bareStore = mkdtempSync(join(tmpdir(), "tp-bonjour-interop-"));
  const bridgeA = createLinkedMulticastBridge("fe80::1");
  const bridgeB = createLinkedMulticastBridge("fe80::2");
  linkMulticastBridges(bridgeA, bridgeB);

  const bonjourA = createLinkedBonjourBridge("fe80::1");
  const bonjourB = createLinkedBonjourBridge("fe80::2");
  linkBonjourBridges(bonjourA, bonjourB);

  const nodePeer = await openBonjourPeer({
    runtime: nodeRuntime(),
    bridge: bridgeA,
    bonjourBridge: bonjourA,
    label: "bonjour-node",
  });

  const barePeer = await openBonjourPeer({
    runtime: bareRuntime({ storePath: bareStore }),
    bridge: bridgeB,
    bonjourBridge: bonjourB,
    label: "bonjour-bare",
  });

  await nodePeer.auto.advertiseDiscovery();
  await barePeer.auto.advertiseDiscovery();
  await sleep(500);

  try {
    await sleep(500);

    if (
      nodePeer.auto.peerInterfaces.length !== 1 ||
      barePeer.auto.peerInterfaces.length !== 1
    ) {
      throw new Error(
        `Bonjour interop: expected one peer per side (node=${nodePeer.auto.peerInterfaces.length}, bare=${barePeer.auto.peerInterfaces.length})`,
      );
    }

    if (nodePeer.auto.peerInterfaces[0]?.peerAddress !== "fe80::2") {
      throw new Error(
        `Bonjour interop: node peer address mismatch (${nodePeer.auto.peerInterfaces[0]?.peerAddress})`,
      );
    }

    if (barePeer.auto.peerInterfaces[0]?.peerAddress !== "fe80::1") {
      throw new Error(
        `Bonjour interop: bare peer address mismatch (${barePeer.auto.peerInterfaces[0]?.peerAddress})`,
      );
    }

    console.log(
      "[bonjour-interop] Node ⇄ Bare Bonjour discovery + unicast peer spawn passed",
    );
  } finally {
    await nodePeer.bonjour.stop();
    await barePeer.bonjour.stop();
    await nodePeer.auto.close();
    await barePeer.auto.close();
    nodePeer.reticulum.stop();
    barePeer.reticulum.stop();
    rmSync(bareStore, { recursive: true, force: true });
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  runBonjourInterop().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
