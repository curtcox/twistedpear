import { describe, expect, it } from "vitest";
import { Identity, NodeCryptoProvider } from "@twistedpear/reticulum-ts";
import {
  createLinkedDeviceId,
  decodeLinkedDeviceCertificate,
  deriveLinkedDeviceIdentity,
  encodeLinkedDeviceCertificate,
  linkedDeviceAnnounceAspects,
  signLinkedDeviceCertificate,
  verifyLinkedDeviceCertificate
} from "../src/linked-device.js";

const provider = new NodeCryptoProvider();

describe("linked device identities", () => {
  it("derives stable, distinct network identities under one account", () => {
    const account = new Identity(provider);
    const firstId = "01".repeat(16);
    const secondId = "02".repeat(16);
    const first = deriveLinkedDeviceIdentity(provider, account, firstId);
    const firstAgain = deriveLinkedDeviceIdentity(provider, account, firstId);
    const second = deriveLinkedDeviceIdentity(provider, account, secondId);
    expect(first.getPrivateKey()).toEqual(firstAgain.getPrivateKey());
    expect(first.hash).not.toEqual(account.hash);
    expect(second.hash).not.toEqual(first.hash);
  });

  it("signs a compact root-certified device announce", () => {
    const account = new Identity(provider);
    const deviceId = createLinkedDeviceId(provider);
    const device = deriveLinkedDeviceIdentity(provider, account, deviceId);
    const certificate = signLinkedDeviceCertificate(account, device, {
      deviceId,
      label: "Curt's phone",
      createdAt: 1_752_000_000_000
    });
    const encoded = encodeLinkedDeviceCertificate(certificate);
    expect(encoded.length).toBeLessThanOrEqual(383);
    const decoded = decodeLinkedDeviceCertificate(encoded);
    expect(decoded).toEqual(certificate);
    expect(verifyLinkedDeviceCertificate(provider, decoded)).toBe(true);
    expect(linkedDeviceAnnounceAspects(provider, certificate.accountPublicKey)[0]).toBe("linked-device");
  });

  it("rejects a relabelled or mismatched certificate", () => {
    const account = new Identity(provider);
    const deviceId = createLinkedDeviceId(provider);
    const device = deriveLinkedDeviceIdentity(provider, account, deviceId);
    const certificate = signLinkedDeviceCertificate(account, device, { deviceId, label: "Laptop", createdAt: 10 });
    expect(verifyLinkedDeviceCertificate(provider, { ...certificate, label: "Phone" })).toBe(false);
  });
});
