/**
 * NFC APDU payment AID blocklist — enforced in the driver, not by the app.
 * Rejects well-known EMV / payment applet AIDs.
 */

export class NfcPaymentAidError extends Error {
  constructor(
    readonly code: "PAYMENT_AID_BLOCKED",
    message: string,
    readonly aid: string,
  ) {
    super(message);
    this.name = "NfcPaymentAidError";
  }
}

/** Normalized uppercase hex without spaces or separators. */
export const PAYMENT_AID_BLOCKLIST: ReadonlyArray<string> = [
  "A0000000031010", // Visa
  "A0000000032010", // Visa Electron
  "A0000000041010", // Mastercard
  "A0000000043060", // Mastercard Maestro
  "A00000002501", // Amex
  "A0000001523010", // Discover
  "A0000000651010", // JCB
  "A000000333010101", // UnionPay
  "A0000002771010", // Interac
  "325041592E5359532E4444463031", // PPSE directory
];

export function normalizeAid(aid: string): string {
  return aid.replace(/[^0-9a-fA-F]/g, "").toUpperCase();
}

export function isPaymentAidBlocked(aid: string): boolean {
  const normalized = normalizeAid(aid);
  if (normalized.length < 10) return false;
  return PAYMENT_AID_BLOCKLIST.some(
    (blocked) => normalized === blocked || normalized.startsWith(blocked),
  );
}

export function assertAidAllowed(aid: string): string {
  const normalized = normalizeAid(aid);
  if (
    normalized.length < 10 ||
    normalized.length > 32 ||
    normalized.length % 2 !== 0
  ) {
    throw new NfcPaymentAidError(
      "PAYMENT_AID_BLOCKED",
      "Invalid AID encoding.",
      aid,
    );
  }
  if (isPaymentAidBlocked(normalized)) {
    throw new NfcPaymentAidError(
      "PAYMENT_AID_BLOCKED",
      "Payment applet AIDs are blocklisted; use the OS payment sheet.",
      normalized,
    );
  }
  return normalized;
}

export interface NfcApduCommand {
  readonly kind: "nfc";
  readonly action: "apdu";
  readonly aid: string;
  readonly apdu: string;
}

export function validateNfcApduCommand(
  command: NfcApduCommand,
): NfcApduCommand {
  const aid = assertAidAllowed(command.aid);
  if (
    typeof command.apdu !== "string" ||
    command.apdu.length < 2 ||
    command.apdu.length > 1024
  ) {
    throw new NfcPaymentAidError(
      "PAYMENT_AID_BLOCKED",
      "Invalid APDU payload length.",
      aid,
    );
  }
  return { kind: "nfc", action: "apdu", aid, apdu: command.apdu };
}
