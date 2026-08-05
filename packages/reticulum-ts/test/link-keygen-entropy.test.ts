import { describe, expect, it } from "vitest";
import {
  DestinationDirection,
  DestinationType,
  Identity,
  NodeCryptoProvider,
  PipeInterface,
  Reticulum,
  type Entropy,
  nodeRuntime
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

describe("Link keygen entropy injection", () => {
  it("produces identical initiator link ids from the same explicit entropy", () => {
    const provider = new NodeCryptoProvider();
    const runtime = nodeRuntime();
    const entropy = new Uint8Array(64).map((_, i) => (i * 13 + 7) & 0xff);

    const run = () => {
      const left = Reticulum.create({ provider, runtime });
      const right = Reticulum.create({ provider, runtime });
      left.start();
      right.start();
      const [leftPipe, rightPipe] = PipeInterface.pair(provider);
      left.registerInterface(leftPipe);
      right.registerInterface(rightPipe);

      const identitySeed = new Uint8Array(64).map((_, i) => (i * 17 + 3) & 0xff);
      const identity = Identity.fromBytes(provider, identitySeed);
      expect(identity).not.toBeNull();

      const rightIn = right.registerDestination({
        provider,
        identity: identity!,
        direction: DestinationDirection.IN,
        type: DestinationType.SINGLE,
        appName: "entropy",
        aspects: ["peer"]
      });

      const leftOut = left.registerDestination({
        provider,
        identity: rightIn.identity,
        direction: DestinationDirection.OUT,
        type: DestinationType.SINGLE,
        appName: "entropy",
        aspects: ["peer"]
      });

      const link = leftOut.requestLink(undefined, { entropy });
      return [...link.linkId];
    };

    expect(run()).toEqual(run());
  });

  it("uses Runtime.entropy when link options omit entropy", () => {
    const provider = new NodeCryptoProvider();
    // 64 bytes for transport identity keygen + 64 for initiator link keys.
    const stream = new Uint8Array(128).map((_, i) => (i * 29 + 11) & 0xff);

    const run = () => {
      const runtime = nodeRuntime({ entropy: new ScriptedEntropy(stream) });
      const left = Reticulum.create({ provider, runtime });
      const right = Reticulum.create({ provider, runtime: nodeRuntime() });
      left.start();
      right.start();
      const [leftPipe, rightPipe] = PipeInterface.pair(provider);
      left.registerInterface(leftPipe);
      right.registerInterface(rightPipe);

      const identitySeed = new Uint8Array(64).map((_, i) => (i * 19 + 5) & 0xff);
      const identity = Identity.fromBytes(provider, identitySeed);
      expect(identity).not.toBeNull();

      const rightIn = right.registerDestination({
        provider,
        identity: identity!,
        direction: DestinationDirection.IN,
        type: DestinationType.SINGLE,
        appName: "runtime-entropy",
        aspects: ["peer"]
      });

      const leftOut = left.registerDestination({
        provider,
        identity: rightIn.identity,
        direction: DestinationDirection.OUT,
        type: DestinationType.SINGLE,
        appName: "runtime-entropy",
        aspects: ["peer"]
      });

      return [...leftOut.requestLink().linkId];
    };

    expect(run()).toEqual(run());
  });
});
