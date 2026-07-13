import { describe, expect, it } from "vitest";
import {
  DestinationAllowPolicyCode,
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
});

describe("link request receipt status", () => {
  it("exposes receipt status codes", () => {
    expect(LinkRequestReceiptStatus.SENT).toBe(0x01);
    expect(LinkRequestReceiptStatus.READY).toBe(0x04);
  });
});
