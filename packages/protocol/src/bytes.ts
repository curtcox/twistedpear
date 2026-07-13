/**
 * Pure shared byte-array helpers used by protocol leaves.
 */

export function concatByteArrays(...parts: ReadonlyArray<Uint8Array>): Uint8Array {
  const length = parts.reduce((total, part) => total + part.length, 0);
  const output = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }
  return output;
}

export function assembleByteArrays(parts: ReadonlyArray<Uint8Array>): Uint8Array {
  return concatByteArrays(...parts);
}
