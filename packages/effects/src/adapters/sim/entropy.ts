import type { Entropy } from "../../types.js";

/**
 * xoshiro128** PRNG — deterministic, seedable, no OS entropy.
 * @see https://prng.di.unimi.it/
 */
export class Xoshiro128StarStar implements Entropy {
  private s0: number;
  private s1: number;
  private s2: number;
  private s3: number;

  constructor(seed: number | Uint8Array) {
    if (typeof seed === "number") {
      // SplitMix32 expansion of a single u32 seed into four state words.
      let z = seed >>> 0;
      const next = (): number => {
        z = (z + 0x9e3779b9) >>> 0;
        let t = z;
        t = Math.imul(t ^ (t >>> 16), 0x85ebca6b);
        t = Math.imul(t ^ (t >>> 13), 0xc2b2ae35);
        return (t ^ (t >>> 16)) >>> 0;
      };
      this.s0 = next();
      this.s1 = next();
      this.s2 = next();
      this.s3 = next();
    } else {
      if (seed.length < 16) {
        throw new Error("Xoshiro128StarStar seed must be at least 16 bytes");
      }
      const view = new DataView(seed.buffer, seed.byteOffset, seed.byteLength);
      this.s0 = view.getUint32(0, true);
      this.s1 = view.getUint32(4, true);
      this.s2 = view.getUint32(8, true);
      this.s3 = view.getUint32(12, true);
    }

    if ((this.s0 | this.s1 | this.s2 | this.s3) === 0) {
      this.s0 = 0x9e3779b9;
      this.s1 = 0x6c078965;
      this.s2 = 0x243f6a88;
      this.s3 = 0xb7e15162;
    }
  }

  private nextU32(): number {
    const result = Math.imul(rotl(Math.imul(this.s1, 5), 7), 9) >>> 0;
    const t = this.s1 << 9;
    this.s2 ^= this.s0;
    this.s3 ^= this.s1;
    this.s1 ^= this.s2;
    this.s0 ^= this.s3;
    this.s2 ^= t;
    this.s3 = rotl(this.s3, 11);
    return result;
  }

  randomBytes(length: number): Uint8Array {
    const out = new Uint8Array(length);
    for (let i = 0; i < length; i += 4) {
      const n = this.nextU32();
      out[i] = n & 0xff;
      if (i + 1 < length) out[i + 1] = (n >>> 8) & 0xff;
      if (i + 2 < length) out[i + 2] = (n >>> 16) & 0xff;
      if (i + 3 < length) out[i + 3] = (n >>> 24) & 0xff;
    }
    return out;
  }
}

function rotl(x: number, k: number): number {
  return ((x << k) | (x >>> (32 - k))) >>> 0;
}
