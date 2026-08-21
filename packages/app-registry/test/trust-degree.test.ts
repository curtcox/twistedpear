import { describe, expect, it } from "vitest";
import {
  Identity,
  NodeCryptoProvider,
  bytesToHex,
} from "@twistedpear/reticulum-ts";
import {
  TRUST_DEGREE_RANK,
  TrustStore,
  trustDegreeFromSource,
} from "../src/index.js";

const provider = new NodeCryptoProvider();

class MemoryStore {
  readonly values = new Map<string, Uint8Array>();

  async get(key: string): Promise<Uint8Array | null> {
    return this.values.get(key) ?? null;
  }

  async set(key: string, value: Uint8Array): Promise<void> {
    this.values.set(key, value);
  }

  async delete(key: string): Promise<void> {
    this.values.delete(key);
  }
}

describe("publisher trust degree", () => {
  it("maps acquisition source onto the degree the evaluator will gate on", () => {
    expect(trustDegreeFromSource("qr")).toBe("direct");
    expect(trustDegreeFromSource("manual")).toBe("direct");
    expect(trustDegreeFromSource("paste")).toBe("imported");
    expect(trustDegreeFromSource("introduced")).toBe("introduced");
    expect(TRUST_DEGREE_RANK.direct).toBeGreaterThan(
      TRUST_DEGREE_RANK.imported,
    );
    expect(TRUST_DEGREE_RANK.imported).toBe(TRUST_DEGREE_RANK.introduced);
  });

  it("lets a lure reach imported and refuses it as direct", async () => {
    const store = new TrustStore(new MemoryStore());
    const pasted = bytesToHex(new Identity(provider).getPublicKey());
    const scanned = bytesToHex(new Identity(provider).getPublicKey());
    await store.add({
      publisherPublicKey: pasted,
      label: "lure",
      addedAt: 1,
      source: "paste",
    });
    await store.add({
      publisherPublicKey: scanned,
      label: "in person",
      addedAt: 1,
      source: "qr",
    });

    expect(await store.degreeOf(pasted)).toBe("imported");
    expect(await store.isTrusted(pasted)).toBe(true);
    expect(await store.isTrusted(pasted, "imported")).toBe(true);
    expect(await store.isTrusted(pasted, "direct")).toBe(false);

    expect(await store.degreeOf(scanned)).toBe("direct");
    expect(await store.isTrusted(scanned, "imported")).toBe(true);
    expect(await store.isTrusted(scanned, "direct")).toBe(true);
    expect(await store.degreeOf("missing")).toBeNull();
  });
});
