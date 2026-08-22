import { callHost } from "./rpc.js";

export async function randomBytes(n: number): Promise<Uint8Array> {
  return (await callHost("crypto", "randomBytes", { n })) as Uint8Array;
}

export async function hash(
  alg: "sha256" | "sha512",
  bytes: Uint8Array,
): Promise<Uint8Array> {
  return (await callHost("crypto", "hash", { alg, bytes })) as Uint8Array;
}

export async function hmac(
  alg: "sha256",
  key: Uint8Array,
  bytes: Uint8Array,
): Promise<Uint8Array> {
  return (await callHost("crypto", "hmac", { alg, key, bytes })) as Uint8Array;
}

export async function timingSafeEqual(
  a: Uint8Array,
  b: Uint8Array,
): Promise<boolean> {
  return (await callHost("crypto", "timingSafeEqual", { a, b })) as boolean;
}
