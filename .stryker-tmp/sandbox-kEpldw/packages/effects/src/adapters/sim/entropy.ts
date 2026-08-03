// @ts-nocheck
function stryNS_9fa48() {
  var g = typeof globalThis === 'object' && globalThis && globalThis.Math === Math && globalThis || new Function("return this")();
  var ns = g.__stryker__ || (g.__stryker__ = {});
  if (ns.activeMutant === undefined && g.process && g.process.env && g.process.env.__STRYKER_ACTIVE_MUTANT__) {
    ns.activeMutant = g.process.env.__STRYKER_ACTIVE_MUTANT__;
  }
  function retrieveNS() {
    return ns;
  }
  stryNS_9fa48 = retrieveNS;
  return retrieveNS();
}
stryNS_9fa48();
function stryCov_9fa48() {
  var ns = stryNS_9fa48();
  var cov = ns.mutantCoverage || (ns.mutantCoverage = {
    static: {},
    perTest: {}
  });
  function cover() {
    var c = cov.static;
    if (ns.currentTestId) {
      c = cov.perTest[ns.currentTestId] = cov.perTest[ns.currentTestId] || {};
    }
    var a = arguments;
    for (var i = 0; i < a.length; i++) {
      c[a[i]] = (c[a[i]] || 0) + 1;
    }
  }
  stryCov_9fa48 = cover;
  cover.apply(null, arguments);
}
function stryMutAct_9fa48(id) {
  var ns = stryNS_9fa48();
  function isActive(id) {
    if (ns.activeMutant === id) {
      if (ns.hitCount !== void 0 && ++ns.hitCount > ns.hitLimit) {
        throw new Error('Stryker: Hit count limit reached (' + ns.hitCount + ')');
      }
      return true;
    }
    return false;
  }
  stryMutAct_9fa48 = isActive;
  return isActive(id);
}
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
    if (stryMutAct_9fa48("427")) {
      {}
    } else {
      stryCov_9fa48("427");
      if (stryMutAct_9fa48("430") ? typeof seed !== "number" : stryMutAct_9fa48("429") ? false : stryMutAct_9fa48("428") ? true : (stryCov_9fa48("428", "429", "430"), typeof seed === (stryMutAct_9fa48("431") ? "" : (stryCov_9fa48("431"), "number")))) {
        if (stryMutAct_9fa48("432")) {
          {}
        } else {
          stryCov_9fa48("432");
          // SplitMix32 expansion of a single u32 seed into four state words.
          let z = seed >>> 0;
          const next = (): number => {
            if (stryMutAct_9fa48("433")) {
              {}
            } else {
              stryCov_9fa48("433");
              z = (stryMutAct_9fa48("434") ? z - 0x9e3779b9 : (stryCov_9fa48("434"), z + 0x9e3779b9)) >>> 0;
              let t = z;
              t = Math.imul(t ^ t >>> 16, 0x85ebca6b);
              t = Math.imul(t ^ t >>> 13, 0xc2b2ae35);
              return (t ^ t >>> 16) >>> 0;
            }
          };
          this.s0 = next();
          this.s1 = next();
          this.s2 = next();
          this.s3 = next();
        }
      } else {
        if (stryMutAct_9fa48("435")) {
          {}
        } else {
          stryCov_9fa48("435");
          if (stryMutAct_9fa48("439") ? seed.length >= 16 : stryMutAct_9fa48("438") ? seed.length <= 16 : stryMutAct_9fa48("437") ? false : stryMutAct_9fa48("436") ? true : (stryCov_9fa48("436", "437", "438", "439"), seed.length < 16)) {
            if (stryMutAct_9fa48("440")) {
              {}
            } else {
              stryCov_9fa48("440");
              throw new Error(stryMutAct_9fa48("441") ? "" : (stryCov_9fa48("441"), "Xoshiro128StarStar seed must be at least 16 bytes"));
            }
          }
          const view = new DataView(seed.buffer, seed.byteOffset, seed.byteLength);
          this.s0 = view.getUint32(0, stryMutAct_9fa48("442") ? false : (stryCov_9fa48("442"), true));
          this.s1 = view.getUint32(4, stryMutAct_9fa48("443") ? false : (stryCov_9fa48("443"), true));
          this.s2 = view.getUint32(8, stryMutAct_9fa48("444") ? false : (stryCov_9fa48("444"), true));
          this.s3 = view.getUint32(12, stryMutAct_9fa48("445") ? false : (stryCov_9fa48("445"), true));
        }
      }
      if (stryMutAct_9fa48("448") ? (this.s0 | this.s1 | this.s2 | this.s3) !== 0 : stryMutAct_9fa48("447") ? false : stryMutAct_9fa48("446") ? true : (stryCov_9fa48("446", "447", "448"), (this.s0 | this.s1 | this.s2 | this.s3) === 0)) {
        if (stryMutAct_9fa48("449")) {
          {}
        } else {
          stryCov_9fa48("449");
          this.s0 = 0x9e3779b9;
          this.s1 = 0x6c078965;
          this.s2 = 0x243f6a88;
          this.s3 = 0xb7e15162;
        }
      }
    }
  }
  private nextU32(): number {
    if (stryMutAct_9fa48("450")) {
      {}
    } else {
      stryCov_9fa48("450");
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
  }
  randomBytes(length: number): Uint8Array {
    if (stryMutAct_9fa48("451")) {
      {}
    } else {
      stryCov_9fa48("451");
      const out = new Uint8Array(length);
      for (let i = 0; stryMutAct_9fa48("454") ? i >= length : stryMutAct_9fa48("453") ? i <= length : stryMutAct_9fa48("452") ? false : (stryCov_9fa48("452", "453", "454"), i < length); stryMutAct_9fa48("455") ? i -= 4 : (stryCov_9fa48("455"), i += 4)) {
        if (stryMutAct_9fa48("456")) {
          {}
        } else {
          stryCov_9fa48("456");
          const n = this.nextU32();
          out[i] = n & 0xff;
          if (stryMutAct_9fa48("460") ? i + 1 >= length : stryMutAct_9fa48("459") ? i + 1 <= length : stryMutAct_9fa48("458") ? false : stryMutAct_9fa48("457") ? true : (stryCov_9fa48("457", "458", "459", "460"), (stryMutAct_9fa48("461") ? i - 1 : (stryCov_9fa48("461"), i + 1)) < length)) out[stryMutAct_9fa48("462") ? i - 1 : (stryCov_9fa48("462"), i + 1)] = n >>> 8 & 0xff;
          if (stryMutAct_9fa48("466") ? i + 2 >= length : stryMutAct_9fa48("465") ? i + 2 <= length : stryMutAct_9fa48("464") ? false : stryMutAct_9fa48("463") ? true : (stryCov_9fa48("463", "464", "465", "466"), (stryMutAct_9fa48("467") ? i - 2 : (stryCov_9fa48("467"), i + 2)) < length)) out[stryMutAct_9fa48("468") ? i - 2 : (stryCov_9fa48("468"), i + 2)] = n >>> 16 & 0xff;
          if (stryMutAct_9fa48("472") ? i + 3 >= length : stryMutAct_9fa48("471") ? i + 3 <= length : stryMutAct_9fa48("470") ? false : stryMutAct_9fa48("469") ? true : (stryCov_9fa48("469", "470", "471", "472"), (stryMutAct_9fa48("473") ? i - 3 : (stryCov_9fa48("473"), i + 3)) < length)) out[stryMutAct_9fa48("474") ? i - 3 : (stryCov_9fa48("474"), i + 3)] = n >>> 24 & 0xff;
        }
      }
      return out;
    }
  }
}
function rotl(x: number, k: number): number {
  if (stryMutAct_9fa48("475")) {
    {}
  } else {
    stryCov_9fa48("475");
    return (x << k | x >>> (stryMutAct_9fa48("476") ? 32 + k : (stryCov_9fa48("476"), 32 - k))) >>> 0;
  }
}