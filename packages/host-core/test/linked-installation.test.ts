import { describe, expect, it } from "vitest";
import { Identity, NodeCryptoProvider } from "@twistedpear/reticulum-ts";
import {
  LINKED_INSTALLATION_ANNOUNCE_ASPECT,
  LINKED_INSTALLATION_MAGIC,
  createLinkedInstallationId,
  decodeLinkedInstallationCertificate,
  deriveLinkedInstallationIdentity,
  encodeLinkedInstallationCertificate,
  linkedInstallationAnnounceAspects,
  signLinkedInstallationCertificate,
  verifyLinkedInstallationCertificate,
} from "../src/linked-installation.js";

const provider = new NodeCryptoProvider();

describe("linked installation identities", () => {
  it("derives stable, distinct network identities under one account", () => {
    const account = new Identity(provider);
    const firstId = "01".repeat(16);
    const secondId = "02".repeat(16);
    const first = deriveLinkedInstallationIdentity(provider, account, firstId);
    const firstAgain = deriveLinkedInstallationIdentity(
      provider,
      account,
      firstId,
    );
    const second = deriveLinkedInstallationIdentity(
      provider,
      account,
      secondId,
    );
    expect(first.getPrivateKey()).toEqual(firstAgain.getPrivateKey());
    expect(first.hash).not.toEqual(account.hash);
    expect(second.hash).not.toEqual(first.hash);
  });

  it("keeps the account identity out of every installation identity", () => {
    const account = new Identity(provider);
    const other = new Identity(provider);
    const id = createLinkedInstallationId(provider);
    const installation = deriveLinkedInstallationIdentity(
      provider,
      account,
      id,
    );
    // The account key is the user; the installation key is one machine. Neither
    // may be recoverable from, or equal to, the other on the wire.
    expect(installation.getPublicKey()).not.toEqual(account.getPublicKey());
    expect(installation.getPrivateKey()).not.toEqual(account.getPrivateKey());
    // The same installation id under a different account is a different machine.
    expect(
      deriveLinkedInstallationIdentity(provider, other, id).hash,
    ).not.toEqual(installation.hash);
  });

  it("produces a derived identity that can actually sign", () => {
    // Regression: zeroing the HKDF output after Identity.fromBytes left an
    // identity with a correct public key and unverifiable signatures, so a
    // linked installation could never authenticate itself.
    const account = new Identity(provider);
    const installation = deriveLinkedInstallationIdentity(
      provider,
      account,
      createLinkedInstallationId(provider),
    );
    const message = new TextEncoder().encode("installation speaking");
    expect(installation.validate(installation.sign(message), message)).toBe(
      true,
    );
  });

  it("signs a compact root-certified installation announce", () => {
    const account = new Identity(provider);
    const installationId = createLinkedInstallationId(provider);
    const installation = deriveLinkedInstallationIdentity(
      provider,
      account,
      installationId,
    );
    const certificate = signLinkedInstallationCertificate(
      account,
      installation,
      {
        installationId,
        label: "Curt's phone",
        createdAt: 1_752_000_000_000,
      },
    );
    const encoded = encodeLinkedInstallationCertificate(certificate);
    expect(encoded.length).toBeLessThanOrEqual(383);
    const decoded = decodeLinkedInstallationCertificate(encoded);
    expect(decoded).toEqual(certificate);
    expect(verifyLinkedInstallationCertificate(provider, decoded)).toBe(true);
    expect(
      linkedInstallationAnnounceAspects(
        provider,
        certificate.accountPublicKey,
      )[0],
    ).toBe("linked-device");
  });

  it("rejects a relabelled or mismatched certificate", () => {
    const account = new Identity(provider);
    const installationId = createLinkedInstallationId(provider);
    const installation = deriveLinkedInstallationIdentity(
      provider,
      account,
      installationId,
    );
    const certificate = signLinkedInstallationCertificate(
      account,
      installation,
      {
        installationId,
        label: "Laptop",
        createdAt: 10,
      },
    );
    expect(
      verifyLinkedInstallationCertificate(provider, {
        ...certificate,
        label: "Phone",
      }),
    ).toBe(false);
  });

  it("refuses a certificate another account tries to claim", () => {
    const account = new Identity(provider);
    const attacker = new Identity(provider);
    const installationId = createLinkedInstallationId(provider);
    const installation = deriveLinkedInstallationIdentity(
      provider,
      account,
      installationId,
    );
    const certificate = signLinkedInstallationCertificate(
      account,
      installation,
      { installationId, label: "Laptop", createdAt: 10 },
    );
    // Only the account that signed may vouch for an installation; a transport
    // or bootstrap operator cannot graft a machine onto someone else's account.
    expect(
      verifyLinkedInstallationCertificate(provider, {
        ...certificate,
        accountPublicKey: Buffer.from(attacker.getPublicKey()).toString("hex"),
      }),
    ).toBe(false);
  });

  it("keeps the wire format unchanged by the installation rename", () => {
    // The identifiers moved from "device" to "installation"; the bytes did not.
    expect([...LINKED_INSTALLATION_MAGIC]).toEqual([
      0x54, 0x50, 0x44, 0x56, 0x01,
    ]);
    expect(LINKED_INSTALLATION_ANNOUNCE_ASPECT).toBe("linked-device");
  });
});
