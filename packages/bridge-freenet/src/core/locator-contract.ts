import {
  decodeCasLocator,
  encodeCasLocator,
  type CasLocator,
} from "@twistedpear/cas-256t";

const LOCATOR_STATE_MAGIC = new Uint8Array([0x54, 0x50, 0x46, 0x4c, 0x01]); // TPFL\x01
const HEADER_BYTES = LOCATOR_STATE_MAGIC.length + 2 + 4;

export interface FreenetLocatorState {
  readonly locator: CasLocator;
  readonly archiveBytes: Uint8Array;
}

function equalPrefix(bytes: Uint8Array, prefix: Uint8Array): boolean {
  return prefix.every((value, index) => bytes[index] === value);
}

export function encodeFreenetLocatorState(
  value: FreenetLocatorState,
): Uint8Array {
  const locatorBytes = encodeCasLocator(value.locator);
  if (locatorBytes.length > 0xffff) {
    throw new Error("Freenet locator exceeds 65535 bytes");
  }
  if (value.archiveBytes.length > 0xffff_ffff) {
    throw new Error("Freenet package exceeds 4 GiB");
  }

  const out = new Uint8Array(
    HEADER_BYTES + locatorBytes.length + value.archiveBytes.length,
  );
  out.set(LOCATOR_STATE_MAGIC);
  const view = new DataView(out.buffer, out.byteOffset, out.byteLength);
  view.setUint16(LOCATOR_STATE_MAGIC.length, locatorBytes.length, false);
  view.setUint32(
    LOCATOR_STATE_MAGIC.length + 2,
    value.archiveBytes.length,
    false,
  );
  out.set(locatorBytes, HEADER_BYTES);
  out.set(value.archiveBytes, HEADER_BYTES + locatorBytes.length);
  return out;
}

export function decodeFreenetLocatorState(
  bytes: Uint8Array,
): FreenetLocatorState {
  if (bytes.length < HEADER_BYTES || !equalPrefix(bytes, LOCATOR_STATE_MAGIC)) {
    throw new Error("Invalid Freenet locator state magic");
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const locatorLength = view.getUint16(LOCATOR_STATE_MAGIC.length, false);
  const archiveLength = view.getUint32(LOCATOR_STATE_MAGIC.length + 2, false);
  if (HEADER_BYTES + locatorLength + archiveLength !== bytes.length) {
    throw new Error("Invalid Freenet locator state length");
  }

  const locator = decodeCasLocator(
    bytes.subarray(HEADER_BYTES, HEADER_BYTES + locatorLength),
  );
  const archiveBytes = Uint8Array.from(
    bytes.subarray(HEADER_BYTES + locatorLength),
  );
  return { locator, archiveBytes };
}

export function locatorContractParameters(t256: string): Uint8Array {
  const parameters = new TextEncoder().encode(t256);
  if (parameters.length !== 94) {
    throw new Error("Freenet locator contract requires a 94-byte 256t id");
  }
  return parameters;
}
