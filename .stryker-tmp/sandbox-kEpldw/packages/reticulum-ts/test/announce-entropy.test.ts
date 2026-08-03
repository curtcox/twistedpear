// @ts-nocheck
import { describe, expect, it } from "vitest";
import {
  Announce,
  ANNOUNCE_RANDOM_HASH_SIZE,
  Destination,
  DestinationDirection,
  DestinationType,
  Identity,
  NodeCryptoProvider,
  type Entropy
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

describe("Announce entropy injection", () => {
  it("uses Runtime-style entropy for the announce random hash", () => {
    const provider = new NodeCryptoProvider();
    const identitySeed = new Uint8Array(64).map((_, i) => (i * 3 + 1) & 0xff);
    const identity = Identity.fromBytes(provider, identitySeed);
    expect(identity).not.toBeNull();

    const destination = new Destination(provider, {
      identity: identity!,
      direction: DestinationDirection.IN,
      type: DestinationType.SINGLE,
      appName: "example",
      aspects: ["announce"]
    });

    const expected = new Uint8Array(ANNOUNCE_RANDOM_HASH_SIZE).map((_, i) => (i * 7 + 2) & 0xff);
    const packet = Announce.buildPacket(provider, destination, {
      entropy: new ScriptedEntropy(expected)
    });
    const parsed = Announce.parse(packet);
    expect(parsed).not.toBeNull();
    expect([...parsed!.randomHash]).toEqual([...expected]);
  });
});
