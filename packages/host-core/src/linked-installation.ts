/**
 * Account-to-installation certificates for linked mode.
 *
 * Naming: "installation" here means one TwistedPear host on one of the user's
 * machines — the thing a user calls "my phone". It is deliberately *not* called
 * a device, because `device` throughout the runtime means a peripheral (camera,
 * microphone, sensor) behind `device:<class>:<tier>` capabilities and the Device
 * Manager. Confusing the two would confuse a user identity boundary with a
 * hardware one.
 *
 * Wire values keep the original spelling: the `TPDV\x01` magic, the HKDF salt,
 * and the `linked-device` announce aspect are unchanged so this format stays
 * byte-compatible with what is already documented and tested. Only the
 * TypeScript identifiers moved.
 */
import {
  Identity,
  bytesToHex,
  equalBytes,
  type CryptoProvider,
} from "@twistedpear/reticulum-ts";

export const LINKED_INSTALLATION_MAGIC = new Uint8Array([
  0x54, 0x50, 0x44, 0x56, 0x01,
]); // TPDV\x01
export const LINKED_INSTALLATION_ID_BYTES = 16;
export const LINKED_INSTALLATION_MAX_LABEL_BYTES = 64;
export const LINKED_INSTALLATION_MAX_CERTIFICATE_BYTES = 383;

/** On-wire announce aspect for linked-mode installation certificates. */
export const LINKED_INSTALLATION_ANNOUNCE_ASPECT = "linked-device";

export interface LinkedInstallationCertificate {
  readonly formatVersion: 1;
  readonly accountPublicKey: string;
  readonly installationId: string;
  readonly installationPublicKey: string;
  readonly label: string;
  readonly createdAt: number;
  readonly signature: string;
}

function concat(...parts: ReadonlyArray<Uint8Array>): Uint8Array {
  const out = new Uint8Array(
    parts.reduce((total, part) => total + part.length, 0),
  );
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

function encodeUint64(value: number): Uint8Array {
  if (!Number.isSafeInteger(value) || value < 0)
    throw new Error("createdAt must be a non-negative safe integer");
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
  if (!Number.isSafeInteger(value))
    throw new Error("linked-installation timestamp is out of range");
  return value;
}

function certificatePayload(
  certificate: Omit<LinkedInstallationCertificate, "signature">,
): Uint8Array {
  const accountPublicKey = hexBytes(
    certificate.accountPublicKey,
    64,
    "account public key",
  );
  const installationId = hexBytes(
    certificate.installationId,
    LINKED_INSTALLATION_ID_BYTES,
    "installation id",
  );
  const installationPublicKey = hexBytes(
    certificate.installationPublicKey,
    64,
    "installation public key",
  );
  const label = new TextEncoder().encode(
    certificate.label.normalize("NFKC").trim(),
  );
  if (
    label.length === 0 ||
    label.length > LINKED_INSTALLATION_MAX_LABEL_BYTES
  ) {
    throw new Error(
      `Installation label must be 1-${LINKED_INSTALLATION_MAX_LABEL_BYTES} UTF-8 bytes`,
    );
  }
  return concat(
    LINKED_INSTALLATION_MAGIC,
    accountPublicKey,
    installationId,
    installationPublicKey,
    encodeUint64(certificate.createdAt),
    new Uint8Array([label.length]),
    label,
  );
}

function hexBytes(hex: string, length: number, name: string): Uint8Array {
  if (!new RegExp(`^[0-9a-f]{${length * 2}}$`, "i").test(hex))
    throw new Error(`Invalid ${name}`);
  return Uint8Array.from({ length }, (_, index) =>
    Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16),
  );
}

export function createLinkedInstallationId(provider: CryptoProvider): string {
  return bytesToHex(provider.randomBytes(LINKED_INSTALLATION_ID_BYTES));
}

/** Derives a distinct Reticulum identity without registering the shared account key on-network. */
export function deriveLinkedInstallationIdentity(
  provider: CryptoProvider,
  accountIdentity: Identity,
  installationId: string,
): Identity {
  const privateKey = accountIdentity.getPrivateKey();
  try {
    const derived = provider.hkdf({
      hash: "sha256",
      keyMaterial: privateKey,
      salt: new TextEncoder().encode("TwistedPear linked device identity v1"),
      info: hexBytes(
        installationId,
        LINKED_INSTALLATION_ID_BYTES,
        "installation id",
      ),
      length: 64,
    });
    // Do not zero `derived`: Identity.fromBytes keeps the caller's buffer as
    // its signing key, so wiping it leaves an identity whose public key still
    // looks right but whose signatures no longer verify.
    const identity = Identity.fromBytes(provider, derived);
    if (identity === null)
      throw new Error("Could not derive linked installation identity");
    return identity;
  } finally {
    privateKey.fill(0);
  }
}

export function signLinkedInstallationCertificate(
  accountIdentity: Identity,
  installationIdentity: Identity,
  options: {
    readonly installationId: string;
    readonly label: string;
    readonly createdAt: number;
  },
): LinkedInstallationCertificate {
  const unsigned: Omit<LinkedInstallationCertificate, "signature"> = {
    formatVersion: 1,
    accountPublicKey: bytesToHex(accountIdentity.getPublicKey()),
    installationId: options.installationId.toLowerCase(),
    installationPublicKey: bytesToHex(installationIdentity.getPublicKey()),
    label: options.label.normalize("NFKC").trim(),
    createdAt: options.createdAt,
  };
  return {
    ...unsigned,
    signature: bytesToHex(accountIdentity.sign(certificatePayload(unsigned))),
  };
}

/**
 * A certificate as *received*, before anything about it is believed.
 *
 * `formatVersion` is whatever the peer sent rather than the literal `1`, so the
 * version check in `verifyLinkedInstallationCertificate` is a real runtime guard
 * on untrusted input instead of a tautology the type system already decided.
 */
type UnverifiedLinkedInstallationCertificate = Omit<
  LinkedInstallationCertificate,
  "formatVersion"
> & { readonly formatVersion: number };

export function verifyLinkedInstallationCertificate(
  provider: CryptoProvider,
  certificate: UnverifiedLinkedInstallationCertificate,
): boolean {
  try {
    const { signature, formatVersion, ...rest } = certificate;
    if (formatVersion !== 1) return false;
    const account = Identity.fromPublicKey(
      provider,
      hexBytes(certificate.accountPublicKey, 64, "account public key"),
    );
    if (account === null) return false;
    return account.validate(
      hexBytes(signature, 64, "signature"),
      certificatePayload({ ...rest, formatVersion }),
    );
  } catch {
    return false;
  }
}

export function encodeLinkedInstallationCertificate(
  certificate: LinkedInstallationCertificate,
): Uint8Array {
  const bytes = concat(
    certificatePayload(certificate),
    hexBytes(certificate.signature, 64, "signature"),
  );
  if (bytes.length > LINKED_INSTALLATION_MAX_CERTIFICATE_BYTES)
    throw new Error("Linked-installation certificate exceeds announce budget");
  return bytes;
}

export function decodeLinkedInstallationCertificate(
  bytes: Uint8Array,
): LinkedInstallationCertificate {
  if (
    bytes.length <
    LINKED_INSTALLATION_MAGIC.length + 64 + 16 + 64 + 8 + 1 + 64
  )
    throw new Error("Linked-installation certificate is too short");
  if (
    !equalBytes(
      bytes.subarray(0, LINKED_INSTALLATION_MAGIC.length),
      LINKED_INSTALLATION_MAGIC,
    )
  )
    throw new Error("Linked-installation certificate magic mismatch");
  let offset = LINKED_INSTALLATION_MAGIC.length;
  const accountPublicKey = bytesToHex(bytes.subarray(offset, offset + 64));
  offset += 64;
  const installationId = bytesToHex(bytes.subarray(offset, offset + 16));
  offset += 16;
  const installationPublicKey = bytesToHex(bytes.subarray(offset, offset + 64));
  offset += 64;
  const createdAt = decodeUint64(bytes.subarray(offset, offset + 8));
  offset += 8;
  const labelLength = bytes[offset++]!;
  if (
    labelLength === 0 ||
    labelLength > LINKED_INSTALLATION_MAX_LABEL_BYTES ||
    offset + labelLength + 64 !== bytes.length
  ) {
    throw new Error("Linked-installation certificate length is invalid");
  }
  const label = new TextDecoder("utf-8", { fatal: true }).decode(
    bytes.subarray(offset, offset + labelLength),
  );
  offset += labelLength;
  const signature = bytesToHex(bytes.subarray(offset, offset + 64));
  return {
    formatVersion: 1,
    accountPublicKey,
    installationId,
    installationPublicKey,
    label,
    createdAt,
    signature,
  };
}

export function linkedInstallationAnnounceAspects(
  provider: CryptoProvider,
  accountPublicKey: string,
): [string, string] {
  return [
    LINKED_INSTALLATION_ANNOUNCE_ASPECT,
    bytesToHex(
      provider
        .sha256(hexBytes(accountPublicKey, 64, "account public key"))
        .slice(0, 8),
    ),
  ];
}
