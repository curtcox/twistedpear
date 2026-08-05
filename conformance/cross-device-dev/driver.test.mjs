import { describe, expect, it } from "vitest";
import { encode256t } from "@twistedpear/cas-256t";
import { PureCryptoProvider } from "@twistedpear/reticulum-ts";
import { createCrossDeviceTestDriver } from "../../packages/worklet-core/src/cross-device-test-driver.mjs";

describe("cross-device test driver integrity commands", () => {
  it("reads source CAS bytes and refuses a flipped target archive", async () => {
    const provider = new PureCryptoProvider();
    const archive = new Uint8Array(96).fill(0x2a);
    const t256 = encode256t(archive, (bytes) => provider.sha512(bytes));
    const driver = createCrossDeviceTestDriver({
      miniappHost: () => { throw new Error("host should not be reached"); },
      casStore: () => ({ get: async (id) => id === t256 ? archive : null }),
      sha512: (bytes) => provider.sha512(bytes)
    });

    const source = await driver({ cmd: "cas.read", t256 });
    expect(source.size).toBe(archive.length);
    const corrupted = Uint8Array.from(archive);
    corrupted[48] ^= 1;
    await expect(driver({
      cmd: "negative.verify",
      t256,
      archiveHex: Buffer.from(corrupted).toString("hex")
    })).resolves.toEqual({ refused: true, stage: "sha512", codeExecuted: false });
  });

  it("does not describe valid bytes as a negative refusal", async () => {
    const provider = new PureCryptoProvider();
    const archive = new Uint8Array(80).fill(0x17);
    const t256 = encode256t(archive, (bytes) => provider.sha512(bytes));
    const driver = createCrossDeviceTestDriver({
      miniappHost: () => { throw new Error("host should not be reached"); },
      casStore: () => ({ get: async () => archive }),
      sha512: (bytes) => provider.sha512(bytes)
    });
    await expect(driver({
      cmd: "negative.verify",
      t256,
      archiveHex: Buffer.from(archive).toString("hex")
    })).rejects.toThrow("unexpectedly matched");
  });
});
