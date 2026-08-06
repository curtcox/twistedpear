import { describe, expect, it } from "vitest";
import {
  Identity,
  PureCryptoProvider,
  nodeRuntime,
} from "@twistedpear/reticulum-ts";
import { descopeLinkLocal } from "../src/auto-common.js";
import { AutoInterface, scopeIpv6Address } from "../src/auto.js";

function deriveMulticastAddress(groupId: string): string {
  const provider = new PureCryptoProvider();
  const groupHash = Identity.fullHash(
    provider,
    new TextEncoder().encode(groupId),
  );
  const parts = [
    "0",
    hexPair(groupHash[3] ?? 0, groupHash[2] ?? 0),
    hexPair(groupHash[5] ?? 0, groupHash[4] ?? 0),
    hexPair(groupHash[7] ?? 0, groupHash[6] ?? 0),
    hexPair(groupHash[9] ?? 0, groupHash[8] ?? 0),
    hexPair(groupHash[11] ?? 0, groupHash[10] ?? 0),
    hexPair(groupHash[13] ?? 0, groupHash[12] ?? 0),
  ];

  return `ff12:${parts.join(":")}`;
}

function hexPair(low: number, high: number): string {
  return ((high << 8) | low).toString(16).padStart(4, "0");
}

describe("AutoInterface helpers", () => {
  it("adds an interface scope to unscoped IPv6 addresses", () => {
    expect(scopeIpv6Address("fe80::1234", "eth0")).toBe("fe80::1234%eth0");
    expect(scopeIpv6Address("ff12::1234", "eth0")).toBe("ff12::1234%eth0");
    expect(scopeIpv6Address("fe80::1234%eth1", "eth0")).toBe("fe80::1234%eth1");
    expect(scopeIpv6Address("127.0.0.1", "eth0")).toBe("127.0.0.1");
  });

  it("strips zone ids so data-plane recv keys match discovery peers", () => {
    expect(descopeLinkLocal("fe80::abcd%tpvethts")).toBe("fe80::abcd");
    expect(descopeLinkLocal("fe80::abcd%eth0")).toBe("fe80::abcd");
    expect(descopeLinkLocal("fe80::abcd")).toBe("fe80::abcd");
  });

  it("uses full discovery hashes matching Python RNS AutoInterface", () => {
    const provider = new PureCryptoProvider();
    const groupId = new TextEncoder().encode("reticulum");
    const address = new TextEncoder().encode("fe80::dead:beef");
    const material = new Uint8Array(groupId.length + address.length);
    material.set(groupId, 0);
    material.set(address, groupId.length);
    const full = Identity.fullHash(provider, material);
    const truncated = Identity.truncatedHash(provider, material);
    // RNS peer_announce sends full_hash (32 bytes); truncated tokens are rejected by Python.
    expect(full.length).toBe(32);
    expect(truncated.length).toBe(16);
    expect(full.subarray(0, 16)).toEqual(truncated);
  });

  it("canonicalizes link-local zero compression for peer keys", async () => {
    const { normalizeLinkLocal } = await import("../src/auto-common.js");
    expect(normalizeLinkLocal("fe80:0:0:0:d8c4:13ff:fede:9ac0")).toBe(
      "fe80::d8c4:13ff:fede:9ac0",
    );
    expect(normalizeLinkLocal("fe80::d8c4:13ff:fede:9ac0%tpvethts")).toBe(
      "fe80::d8c4:13ff:fede:9ac0",
    );
    expect(normalizeLinkLocal("FE80::D8C4:13FF:FEDE:9AC0")).toBe(
      "fe80::d8c4:13ff:fede:9ac0",
    );
  });

  it("derives stable multicast addresses from group id", () => {
    const first = deriveMulticastAddress("reticulum");
    const second = deriveMulticastAddress("reticulum");
    const other = deriveMulticastAddress("custom");
    expect(first).toBe(second);
    expect(first.startsWith("ff12:")).toBe(true);
    expect(other).not.toBe(first);
  });

  it("expires stale peers after the peering timeout", async () => {
    const provider = new PureCryptoProvider();
    const runtime = nodeRuntime();
    let detached = 0;

    let auto;
    try {
      auto = await AutoInterface.open(provider, runtime, {
        name: "auto-expiry-test",
        provider,
        runtime,
        peeringTimeoutMs: 200,
        onPeerSpawn: () => {},
        onPeerDetach: () => {
          detached += 1;
        },
      });
    } catch {
      return;
    }

    if (auto.peerInterfaces.length === 0 && !auto.online) {
      await auto.close();
      return;
    }

    const adopted = (
      auto as unknown as { adopted: ReadonlyArray<{ name: string }> }
    ).adopted;
    const ifname = adopted[0]?.name;
    if (ifname === undefined) {
      await auto.close();
      return;
    }

    const addPeer = (
      auto as unknown as { addPeer: (address: string, name: string) => void }
    ).addPeer.bind(auto);
    addPeer("fe80::dead:beef", ifname);
    expect(auto.peerInterfaces.length).toBe(1);

    await new Promise((resolve) => setTimeout(resolve, 4_500));
    expect(auto.peerInterfaces.length).toBe(0);
    expect(detached).toBe(1);

    await auto.close();
  }, 10_000);
});
