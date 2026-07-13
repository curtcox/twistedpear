import { describe, expect, it } from "vitest";
import {
  DestinationDirection,
  DestinationType,
  Identity,
  NodeCryptoProvider,
  PipeInterface,
  Reticulum,
  nodeRuntime
} from "../src/index.js";

describe("Link keygen entropy injection", () => {
  it("produces identical initiator link ids from the same entropy", () => {
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

      // Fixed identity so destination hash is stable across runs.
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
});
