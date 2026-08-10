import { describe, expect, it } from "vitest";
import { Identity, NodeCryptoProvider } from "@twistedpear/reticulum-ts";
import {
  createAppScopedIdentityBackend,
  deriveAppScopedIdentity,
} from "../src/app-scoped-identity.js";

const provider = new NodeCryptoProvider();
const publisher = "ab".repeat(64);
const otherPublisher = "cd".repeat(64);

describe("app-scoped identities", () => {
  it("gives one app on two installations two different identities", () => {
    const phone = new Identity(provider);
    const laptop = new Identity(provider);
    const onPhone = deriveAppScopedIdentity(provider, phone, "chat", publisher);
    const onLaptop = deriveAppScopedIdentity(
      provider,
      laptop,
      "chat",
      publisher,
    );
    // The user is the same person; the app must not be able to tell.
    expect(onPhone.hash).not.toEqual(onLaptop.hash);
    expect(onPhone.getPublicKey()).not.toEqual(onLaptop.getPublicKey());
  });

  it("is stable for the same app on the same installation", () => {
    const installation = new Identity(provider);
    expect(
      deriveAppScopedIdentity(
        provider,
        installation,
        "chat",
        publisher,
      ).getPrivateKey(),
    ).toEqual(
      deriveAppScopedIdentity(
        provider,
        installation,
        "chat",
        publisher,
      ).getPrivateKey(),
    );
  });

  it("separates apps, and separates publishers reusing an app id", () => {
    const installation = new Identity(provider);
    const chat = deriveAppScopedIdentity(
      provider,
      installation,
      "chat",
      publisher,
    );
    const board = deriveAppScopedIdentity(
      provider,
      installation,
      "board",
      publisher,
    );
    const impostor = deriveAppScopedIdentity(
      provider,
      installation,
      "chat",
      otherPublisher,
    );
    expect(chat.hash).not.toEqual(board.hash);
    expect(chat.hash).not.toEqual(impostor.hash);
  });

  it("never hands an app the installation identity itself", () => {
    const installation = new Identity(provider);
    const app = deriveAppScopedIdentity(
      provider,
      installation,
      "chat",
      publisher,
    );
    expect(app.hash).not.toEqual(installation.hash);
    expect(app.getPublicKey()).not.toEqual(installation.getPublicKey());
    expect(app.getPrivateKey()).not.toEqual(installation.getPrivateKey());
  });

  it("cannot be confused by an app id whose bytes straddle the publisher key", () => {
    const installation = new Identity(provider);
    // Length-prefixing, not separator-joining, is what makes these distinct.
    const left = deriveAppScopedIdentity(
      provider,
      installation,
      `a${publisher}`,
      publisher,
    );
    const right = deriveAppScopedIdentity(
      provider,
      installation,
      "a",
      publisher,
    );
    expect(left.hash).not.toEqual(right.hash);
  });

  describe("backend", () => {
    const installation = new Identity(provider);
    const backend = createAppScopedIdentityBackend({
      provider,
      getInstallationIdentity: async () => installation,
    });

    it("produces signatures that actually verify", async () => {
      const payload = new TextEncoder().encode("hello");
      const signature = await backend.sign("chat", publisher, payload);
      expect(await backend.verify("chat", publisher, payload, signature)).toBe(
        true,
      );
      // The old stub returned a constant; a real signature must not verify
      // under a different app, publisher, or payload.
      expect(await backend.verify("board", publisher, payload, signature)).toBe(
        false,
      );
      expect(
        await backend.verify("chat", otherPublisher, payload, signature),
      ).toBe(false);
      expect(
        await backend.verify(
          "chat",
          publisher,
          new TextEncoder().encode("hell0"),
          signature,
        ),
      ).toBe(false);
    });

    it("reports a stable hex destination hash", async () => {
      const hash = await backend.deriveDestinationHash("chat", publisher);
      expect(hash).toMatch(/^[0-9a-f]+$/);
      expect(await backend.deriveDestinationHash("chat", publisher)).toBe(hash);
      expect(await backend.deriveDestinationHash("board", publisher)).not.toBe(
        hash,
      );
    });

    it("refuses to sign before the node has an identity", async () => {
      const unstarted = createAppScopedIdentityBackend({
        provider,
        getInstallationIdentity: async () => null,
      });
      await expect(
        unstarted.sign("chat", publisher, new Uint8Array([1])),
      ).rejects.toThrow(/installation identity/i);
    });
  });
});
