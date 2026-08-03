// @ts-nocheck
import {
  Identity,
  bytesToHex,
  equalBytes,
  type CryptoProvider
} from "@twistedpear/reticulum-ts";

export const LINKED_DEVICE_MAGIC = new Uint8Array([0x54, 0x50, 0x44, 0x56, 0x01]); // TPDV\x01
export const LINKED_DEVICE_ID_BYTES = 16;
export const LINKED_DEVICE_MAX_LABEL_BYTES = 64;
export const LINKED_DEVICE_MAX_CERTIFICATE_BYTES = 383;

export interface LinkedDeviceCertificate {
  readonly formatVersion: 1;
  readonly accountPublicKey: string;
  readonly deviceId: string;
  readonly devicePublicKey: string;
  readonly label: string;
  readonly createdAt: number;
  readonly signature: string;
}

function concat(...parts: ReadonlyArray<Uint8Array>): Uint8Array {
  const out = new Uint8Array(parts.reduce((total, part) => total + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

function encodeUint64(value: number): Uint8Array {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error("createdAt must be a non-negative safe integer");
  const out = new Uint8Array(8);
  let remaining = value;
  for (let index = 7; index >= 0; index -= 1) {
    out[index] = remaining % 256;
    remaining = Math.floor(remaining / 256);
  }
  return out;
}

function decodeUint64(bytes: Uint8Array): number {
  let value = 0;
  for (const byte of bytes) value = value * 256 + byte;
  if (!Number.isSafeInteger(value)) throw new Error("linked-device timestamp is out of range");
  return value;
}

function certificatePayload(certificate: Omit<LinkedDeviceCertificate, "signature">): Uint8Array {
  const accountPublicKey = hexBytes(certificate.accountPublicKey, 64, "account public key");
  const deviceId = hexBytes(certificate.deviceId, LINKED_DEVICE_ID_BYTES, "device id");
  const devicePublicKey = hexBytes(certificate.devicePublicKey, 64, "device public key");
  const label = new TextEncoder().encode(certificate.label.normalize("NFKC").trim());
  if (label.length === 0 || label.length > LINKED_DEVICE_MAX_LABEL_BYTES) {
    throw new Error(`Device label must be 1-${LINKED_DEVICE_MAX_LABEL_BYTES} UTF-8 bytes`);
  }
  return concat(
    LINKED_DEVICE_MAGIC,
    accountPublicKey,
    deviceId,
    devicePublicKey,
    encodeUint64(certificate.createdAt),
    new Uint8Array([label.length]),
    label
  );
}

function hexBytes(hex: string, length: number, name: string): Uint8Array {
  if (!new RegExp(`^[0-9a-f]{${length * 2}}$`, "i").test(hex)) throw new Error(`Invalid ${name}`);
  return Uint8Array.from({ length }, (_, index) => Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16));
}

export function createLinkedDeviceId(provider: CryptoProvider): string {
  return bytesToHex(provider.randomBytes(LINKED_DEVICE_ID_BYTES));
}

/** Derives a distinct Reticulum identity without registering the shared account key on-network. */
export function deriveLinkedDeviceIdentity(
  provider: CryptoProvider,
  accountIdentity: Identity,
  deviceId: string
): Identity {
  const privateKey = accountIdentity.getPrivateKey();
  try {
    const derived = provider.hkdf({
      hash: "sha256",
      keyMaterial: privateKey,
      salt: new TextEncoder().encode("TwistedPear linked device identity v1"),
      info: hexBytes(deviceId, LINKED_DEVICE_ID_BYTES, "device id"),
      length: 64
    });
    const identity = Identity.fromBytes(provider, derived);
    derived.fill(0);
    if (identity === null) throw new Error("Could not derive linked device identity");
    return identity;
  } finally {
    privateKey.fill(0);
  }
}

export function signLinkedDeviceCertificate(
  accountIdentity: Identity,
  deviceIdentity: Identity,
  options: { readonly deviceId: string; readonly label: string; readonly createdAt: number }
): LinkedDeviceCertificate {
  const unsigned: Omit<LinkedDeviceCertificate, "signature"> = {
    formatVersion: 1,
    accountPublicKey: bytesToHex(accountIdentity.getPublicKey()),
    deviceId: options.deviceId.toLowerCase(),
    devicePublicKey: bytesToHex(deviceIdentity.getPublicKey()),
    label: options.label.normalize("NFKC").trim(),
    createdAt: options.createdAt
  };
  return { ...unsigned, signature: bytesToHex(accountIdentity.sign(certificatePayload(unsigned))) };
}

export function verifyLinkedDeviceCertificate(provider: CryptoProvider, certificate: LinkedDeviceCertificate): boolean {
  try {
    if (certificate.formatVersion !== 1) return false;
    const account = Identity.fromPublicKey(provider, hexBytes(certificate.accountPublicKey, 64, "account public key"));
    if (account === null) return false;
    const { signature, ...unsigned } = certificate;
    return account.validate(hexBytes(signature, 64, "signature"), certificatePayload(unsigned));
  } catch {
    return false;
  }
}

export function encodeLinkedDeviceCertificate(certificate: LinkedDeviceCertificate): Uint8Array {
  const bytes = concat(certificatePayload(certificate), hexBytes(certificate.signature, 64, "signature"));
  if (bytes.length > LINKED_DEVICE_MAX_CERTIFICATE_BYTES) throw new Error("Linked-device certificate exceeds announce budget");
  return bytes;
}

export function decodeLinkedDeviceCertificate(bytes: Uint8Array): LinkedDeviceCertificate {
  if (bytes.length < LINKED_DEVICE_MAGIC.length + 64 + 16 + 64 + 8 + 1 + 64) throw new Error("Linked-device certificate is too short");
  if (!equalBytes(bytes.subarray(0, LINKED_DEVICE_MAGIC.length), LINKED_DEVICE_MAGIC)) throw new Error("Linked-device certificate magic mismatch");
  let offset = LINKED_DEVICE_MAGIC.length;
  const accountPublicKey = bytesToHex(bytes.subarray(offset, offset + 64)); offset += 64;
  const deviceId = bytesToHex(bytes.subarray(offset, offset + 16)); offset += 16;
  const devicePublicKey = bytesToHex(bytes.subarray(offset, offset + 64)); offset += 64;
  const createdAt = decodeUint64(bytes.subarray(offset, offset + 8)); offset += 8;
  const labelLength = bytes[offset++]!;
  if (labelLength === 0 || labelLength > LINKED_DEVICE_MAX_LABEL_BYTES || offset + labelLength + 64 !== bytes.length) {
    throw new Error("Linked-device certificate length is invalid");
  }
  const label = new TextDecoder("utf-8", { fatal: true }).decode(bytes.subarray(offset, offset + labelLength));
  offset += labelLength;
  const signature = bytesToHex(bytes.subarray(offset, offset + 64));
  return { formatVersion: 1, accountPublicKey, deviceId, devicePublicKey, label, createdAt, signature };
}

export function linkedDeviceAnnounceAspects(provider: CryptoProvider, accountPublicKey: string): [string, string] {
  return ["linked-device", bytesToHex(provider.sha256(hexBytes(accountPublicKey, 64, "account public key")).slice(0, 8))];
}
