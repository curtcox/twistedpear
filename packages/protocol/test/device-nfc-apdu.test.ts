import { describe, expect, it } from "vitest";
import {
  PAYMENT_AID_BLOCKLIST,
  assertAidAllowed,
  isPaymentAidBlocked,
  validateActuatorCommand
} from "../src/index.js";

describe("NFC payment AID blocklist", () => {
  it("blocks Visa / Mastercard / PPSE AIDs", () => {
    expect(isPaymentAidBlocked("A0000000031010")).toBe(true);
    expect(isPaymentAidBlocked("a0 00 00 00 04 10 10")).toBe(true);
    expect(isPaymentAidBlocked(PAYMENT_AID_BLOCKLIST[PAYMENT_AID_BLOCKLIST.length - 1]!)).toBe(true);
    expect(() => assertAidAllowed("A0000000031010")).toThrow(/Payment applet/);
  });

  it("allows non-payment AIDs through actuator validation", () => {
    expect(
      validateActuatorCommand({
        kind: "nfc",
        action: "apdu",
        aid: "F001020304",
        apdu: "00A4040000"
      }).normalized
    ).toMatchObject({ action: "apdu", aid: "F001020304" });
  });
});
