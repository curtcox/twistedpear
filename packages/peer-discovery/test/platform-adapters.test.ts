import { describe, expect, it } from "vitest";
import {
  BluetoothPeerDiscoveryAdapter,
  createUnsupportedWebBluetoothChannel,
  LocalPeerToPeerDiscoveryAdapter,
  UnavailablePeerDiscoveryAdapter,
} from "../src/index.js";

describe("platform-specific discovery diagnostics", () => {
  it("accurately reports ordinary web Bluetooth as unsupported without effects", async () => {
    const adapter = new BluetoothPeerDiscoveryAdapter({
      channel: createUnsupportedWebBluetoothChannel(),
      createSessionId: () => "unused",
    });
    await expect(adapter.availability()).resolves.toEqual({
      state: "unsupported",
      reason: expect.stringContaining("peripheral"),
    });
  });

  it("keeps the future Local Peer-to-Peer API feature-detected and disabled", async () => {
    await expect(
      new LocalPeerToPeerDiscoveryAdapter(() => false).availability(),
    ).resolves.toMatchObject({ state: "unsupported" });
    await expect(
      new LocalPeerToPeerDiscoveryAdapter(() => true).availability(),
    ).resolves.toMatchObject({ state: "policy-disabled" });
  });
  it("keeps known unavailable mechanisms visible and non-selectable", async () => {
    const adapter = new UnavailablePeerDiscoveryAdapter("audio", {
      state: "policy-disabled",
      reason: "Audio modem is disabled",
    });
    await expect(adapter.availability()).resolves.toMatchObject({
      state: "policy-disabled",
    });
    const iterator = adapter.offer(new Uint8Array(), { timeoutMs: 1_000 });
    await expect(iterator.next()).rejects.toThrow(/disabled/);
  });
});
