import { describe, expect, it } from "vitest";
import {
  DestinationAllowPolicyCode,
  canAcceptDestinationLinkRequest,
  canAnnounceDestination,
  canDestinationSend,
  isValidDestinationRequestPath,
  planDestinationRequestAllow
} from "../src/destination-allow.js";
import { LinkRequestReceiptStatus } from "../src/link-request-receipt.js";

describe("destination allow policy", () => {
  it("allows ALL and LIST matches", () => {
    const hash = new Uint8Array([1, 2, 3]);
    expect(
      planDestinationRequestAllow({
        allow: DestinationAllowPolicyCode.ALLOW_ALL,
        allowedList: [],
        remoteIdentityHash: null
      })
    ).toBe(true);
    expect(
      planDestinationRequestAllow({
        allow: DestinationAllowPolicyCode.ALLOW_NONE,
        allowedList: [hash],
        remoteIdentityHash: hash
      })
    ).toBe(false);
    expect(
      planDestinationRequestAllow({
        allow: DestinationAllowPolicyCode.ALLOW_LIST,
        allowedList: [hash],
        remoteIdentityHash: hash
      })
    ).toBe(true);
    expect(
      planDestinationRequestAllow({
        allow: DestinationAllowPolicyCode.ALLOW_LIST,
        allowedList: [hash],
        remoteIdentityHash: new Uint8Array([9, 9, 9])
      })
    ).toBe(false);
  });

  it("rejects empty request-handler paths", () => {
    expect(isValidDestinationRequestPath("")).toBe(false);
    expect(isValidDestinationRequestPath("/echo")).toBe(true);
  });

  it("accepts inbound link requests only when enabled and IN", () => {
    expect(
      canAcceptDestinationLinkRequest({ acceptLinkRequests: true, directionIn: true })
    ).toBe(true);
    expect(
      canAcceptDestinationLinkRequest({ acceptLinkRequests: false, directionIn: true })
    ).toBe(false);
    expect(
      canAcceptDestinationLinkRequest({ acceptLinkRequests: true, directionIn: false })
    ).toBe(false);
  });

  it("allows announces only for IN SINGLE destinations", () => {
    expect(canAnnounceDestination({ typeSingle: true, directionIn: true })).toBe(true);
    expect(canAnnounceDestination({ typeSingle: false, directionIn: true })).toBe(false);
    expect(canAnnounceDestination({ typeSingle: true, directionIn: false })).toBe(false);
  });

  it("allows sends only for OUT destinations", () => {
    expect(canDestinationSend(true)).toBe(true);
    expect(canDestinationSend(false)).toBe(false);
  });
});

describe("link request receipt status", () => {
  it("exposes receipt status codes", () => {
    expect(LinkRequestReceiptStatus.SENT).toBe(0x01);
    expect(LinkRequestReceiptStatus.READY).toBe(0x04);
  });
});
