/** Mirrors RNS/Cryptography/PKCS7.py */

const BLOCK_SIZE = 16;

export function pkcs7Pad(data: Uint8Array, blockSize = BLOCK_SIZE): Uint8Array {
  const remainder = data.length % blockSize;
  const paddingLength = blockSize - remainder;
  const padded = new Uint8Array(data.length + paddingLength);
  padded.set(data);
  padded.fill(paddingLength, data.length);
  return padded;
}

export function pkcs7Unpad(data: Uint8Array, blockSize = BLOCK_SIZE): Uint8Array {
  if (data.length === 0) {
    throw new Error("Cannot unpad empty data");
  }

  const paddingLength = data[data.length - 1]!;
  if (paddingLength > blockSize || paddingLength === 0) {
    throw new Error(`Cannot unpad, invalid padding length of ${paddingLength} bytes`);
  }

  return data.subarray(0, data.length - paddingLength);
}
