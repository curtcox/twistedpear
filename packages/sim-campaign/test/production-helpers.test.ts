import {
  LinkHandshakePhase,
  initialLinkHandshakeState,
} from "@twistedpear/protocol";
import { describe, expect, it } from "vitest";
import {
  handshakeAgreementViolation,
  measureContainment,
  type CampaignNodeState,
} from "../src/scenarios-production-helpers.js";

describe("production helper oracles", () => {
  it("rejects a containment snapshot on the wrong topology", () => {
    const kernel = {
      getNodeState: () => ({ role: "probe", sent: false }),
    };
    expect(() => measureContainment(kernel as never, "lan")).toThrow(
      /invalid production scenario topology/,
    );
  });

  it("flags handshake peers that derived different session keys", () => {
    const established = (key: Uint8Array): CampaignNodeState => ({
      role: "handshake",
      handshake: {
        ...initialLinkHandshakeState({ role: "initiator", peerId: "peer" }),
        phase: LinkHandshakePhase.ESTABLISHED,
        sessionKey: key,
      },
    });
    expect(handshakeAgreementViolation(new Map())).toBeNull();
    expect(
      handshakeAgreementViolation(
        new Map([
          ["a", established(new Uint8Array([1]))],
          ["b", established(new Uint8Array([1]))],
        ]),
      ),
    ).toBeNull();
    expect(
      handshakeAgreementViolation(
        new Map([
          ["a", established(new Uint8Array([1]))],
          ["b", established(new Uint8Array([2]))],
        ]),
      ),
    ).toMatchObject({ oracle: "link-handshake-agreement" });
  });
});
