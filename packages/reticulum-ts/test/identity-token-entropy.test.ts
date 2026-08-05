import { describe, expect, it } from "vitest";
import {
  Identity,
  NodeCryptoProvider,
  Token,
  type Entropy,
} from "../src/index.js";

class ScriptedEntropy implements Entropy {
  private offset = 0;
  constructor(private readonly stream: Uint8Array) {}
  randomBytes(length: number): Uint8Array {
    const end = this.offset + length;
    if (end > this.stream.length) {
      throw new Error("ScriptedEntropy exhausted");
    }
    const slice = this.stream.subarray(this.offset, end);
    this.offset = end;
    return Uint8Array.from(slice);
  }
}

describe("Identity/Token entropy injection", () => {
  it("creates identical identities from the same keygen entropy", () => {
    const provider = new NodeCryptoProvider();
    const stream = new Uint8Array(64).map((_, i) => (i * 11 + 5) & 0xff);

    const a = new Identity(provider, { entropy: new ScriptedEntropy(stream) });
    const b = new Identity(provider, { entropy: new ScriptedEntropy(stream) });
    expect([...a.getPrivateKey()]).toEqual([...b.getPrivateKey()]);
    expect([...a.hash]).toEqual([...b.hash]);
  });

  it("encrypts deterministically when ephemeral key and token IV come from entropy", () => {
    const provider = new NodeCryptoProvider();
    const identitySeed = new Uint8Array(64).map((_, i) => (i * 3 + 1) & 0xff);
    const identity = Identity.fromBytes(provider, identitySeed)!;
    const plaintext = new TextEncoder().encode("hello sans-io");
    const stream = new Uint8Array(48).map((_, i) => (i * 17 + 9) & 0xff);

    const a = identity.encrypt(plaintext, {
      entropy: new ScriptedEntropy(stream),
    });
    const b = identity.encrypt(plaintext, {
      entropy: new ScriptedEntropy(stream),
    });
    expect([...a]).toEqual([...b]);
  });

  it("Token.encrypt uses injected entropy for the IV", () => {
    const provider = new NodeCryptoProvider();
    const key = new Uint8Array(32).map((_, i) => i + 1);
    const token = new Token(provider, key);
    const ivStream = new Uint8Array(16).map((_, i) => 200 - i);
    const plaintext = new Uint8Array([1, 2, 3, 4]);

    const a = token.encrypt(plaintext, {
      entropy: new ScriptedEntropy(ivStream),
    });
    const b = token.encrypt(plaintext, {
      entropy: new ScriptedEntropy(ivStream),
    });
    expect([...a]).toEqual([...b]);
    expect([...a.subarray(0, 16)]).toEqual([...ivStream]);
  });
});
