// packages/host-core/dist/leaf-roles.js
var DEFAULT_WEB_LEAF_ROLES = {
  transport: false,
  seeder: false,
  propagation: false,
  attachRnsd: null
};
function assertWebLeafRoles(roles) {
  if (roles.transport || roles.seeder || roles.propagation || roles.attachRnsd !== null) {
    throw new Error("Web host roles must be leaf-only (no transport, seeder, propagation, or rnsd attach)");
  }
}

// node_modules/@noble/ciphers/esm/utils.js
function isBytes(a) {
  return a instanceof Uint8Array || ArrayBuffer.isView(a) && a.constructor.name === "Uint8Array";
}
function abytes(b, ...lengths) {
  if (!isBytes(b))
    throw new Error("Uint8Array expected");
  if (lengths.length > 0 && !lengths.includes(b.length))
    throw new Error("Uint8Array expected of length " + lengths + ", got length=" + b.length);
}
function u32(arr) {
  return new Uint32Array(arr.buffer, arr.byteOffset, Math.floor(arr.byteLength / 4));
}
function clean(...arrays) {
  for (let i = 0; i < arrays.length; i++) {
    arrays[i].fill(0);
  }
}
var isLE = /* @__PURE__ */ (() => new Uint8Array(new Uint32Array([287454020]).buffer)[0] === 68)();
function overlapBytes(a, b) {
  return a.buffer === b.buffer && // best we can do, may fail with an obscure Proxy
  a.byteOffset < b.byteOffset + b.byteLength && // a starts before b end
  b.byteOffset < a.byteOffset + a.byteLength;
}
function complexOverlapBytes(input, output) {
  if (overlapBytes(input, output) && input.byteOffset < output.byteOffset)
    throw new Error("complex overlap of input and output is not supported");
}
var wrapCipher = /* @__NO_SIDE_EFFECTS__ */ (params, constructor) => {
  function wrappedCipher(key, ...args) {
    abytes(key);
    if (!isLE)
      throw new Error("Non little-endian hardware is not yet supported");
    if (params.nonceLength !== void 0) {
      const nonce = args[0];
      if (!nonce)
        throw new Error("nonce / iv required");
      if (params.varSizeNonce)
        abytes(nonce);
      else
        abytes(nonce, params.nonceLength);
    }
    const tagl = params.tagLength;
    if (tagl && args[1] !== void 0) {
      abytes(args[1]);
    }
    const cipher = constructor(key, ...args);
    const checkOutput = (fnLength, output) => {
      if (output !== void 0) {
        if (fnLength !== 2)
          throw new Error("cipher output not supported");
        abytes(output);
      }
    };
    let called = false;
    const wrCipher = {
      encrypt(data, output) {
        if (called)
          throw new Error("cannot encrypt() twice with same key + nonce");
        called = true;
        abytes(data);
        checkOutput(cipher.encrypt.length, output);
        return cipher.encrypt(data, output);
      },
      decrypt(data, output) {
        abytes(data);
        if (tagl && data.length < tagl)
          throw new Error("invalid ciphertext length: smaller than tagLength=" + tagl);
        checkOutput(cipher.decrypt.length, output);
        return cipher.decrypt(data, output);
      }
    };
    return wrCipher;
  }
  Object.assign(wrappedCipher, params);
  return wrappedCipher;
};
function getOutput(expectedLength, out, onlyAligned = true) {
  if (out === void 0)
    return new Uint8Array(expectedLength);
  if (out.length !== expectedLength)
    throw new Error("invalid output length, expected " + expectedLength + ", got: " + out.length);
  if (onlyAligned && !isAligned32(out))
    throw new Error("invalid output, must be aligned");
  return out;
}
function isAligned32(bytes) {
  return bytes.byteOffset % 4 === 0;
}
function copyBytes(bytes) {
  return Uint8Array.from(bytes);
}

// node_modules/@noble/ciphers/esm/aes.js
var BLOCK_SIZE = 16;
var POLY = 283;
function mul2(n) {
  return n << 1 ^ POLY & -(n >> 7);
}
function mul(a, b) {
  let res = 0;
  for (; b > 0; b >>= 1) {
    res ^= a & -(b & 1);
    a = mul2(a);
  }
  return res;
}
var sbox = /* @__PURE__ */ (() => {
  const t = new Uint8Array(256);
  for (let i = 0, x = 1; i < 256; i++, x ^= mul2(x))
    t[i] = x;
  const box = new Uint8Array(256);
  box[0] = 99;
  for (let i = 0; i < 255; i++) {
    let x = t[255 - i];
    x |= x << 8;
    box[t[i]] = (x ^ x >> 4 ^ x >> 5 ^ x >> 6 ^ x >> 7 ^ 99) & 255;
  }
  clean(t);
  return box;
})();
var invSbox = /* @__PURE__ */ sbox.map((_, j) => sbox.indexOf(j));
var rotr32_8 = (n) => n << 24 | n >>> 8;
var rotl32_8 = (n) => n << 8 | n >>> 24;
function genTtable(sbox2, fn) {
  if (sbox2.length !== 256)
    throw new Error("Wrong sbox length");
  const T0 = new Uint32Array(256).map((_, j) => fn(sbox2[j]));
  const T1 = T0.map(rotl32_8);
  const T2 = T1.map(rotl32_8);
  const T3 = T2.map(rotl32_8);
  const T01 = new Uint32Array(256 * 256);
  const T23 = new Uint32Array(256 * 256);
  const sbox22 = new Uint16Array(256 * 256);
  for (let i = 0; i < 256; i++) {
    for (let j = 0; j < 256; j++) {
      const idx = i * 256 + j;
      T01[idx] = T0[i] ^ T1[j];
      T23[idx] = T2[i] ^ T3[j];
      sbox22[idx] = sbox2[i] << 8 | sbox2[j];
    }
  }
  return { sbox: sbox2, sbox2: sbox22, T0, T1, T2, T3, T01, T23 };
}
var tableEncoding = /* @__PURE__ */ genTtable(sbox, (s) => mul(s, 3) << 24 | s << 16 | s << 8 | mul(s, 2));
var tableDecoding = /* @__PURE__ */ genTtable(invSbox, (s) => mul(s, 11) << 24 | mul(s, 13) << 16 | mul(s, 9) << 8 | mul(s, 14));
var xPowers = /* @__PURE__ */ (() => {
  const p = new Uint8Array(16);
  for (let i = 0, x = 1; i < 16; i++, x = mul2(x))
    p[i] = x;
  return p;
})();
function expandKeyLE(key) {
  abytes(key);
  const len = key.length;
  if (![16, 24, 32].includes(len))
    throw new Error("aes: invalid key size, should be 16, 24 or 32, got " + len);
  const { sbox2 } = tableEncoding;
  const toClean = [];
  if (!isAligned32(key))
    toClean.push(key = copyBytes(key));
  const k32 = u32(key);
  const Nk = k32.length;
  const subByte = (n) => applySbox(sbox2, n, n, n, n);
  const xk = new Uint32Array(len + 28);
  xk.set(k32);
  for (let i = Nk; i < xk.length; i++) {
    let t = xk[i - 1];
    if (i % Nk === 0)
      t = subByte(rotr32_8(t)) ^ xPowers[i / Nk - 1];
    else if (Nk > 6 && i % Nk === 4)
      t = subByte(t);
    xk[i] = xk[i - Nk] ^ t;
  }
  clean(...toClean);
  return xk;
}
function expandKeyDecLE(key) {
  const encKey = expandKeyLE(key);
  const xk = encKey.slice();
  const Nk = encKey.length;
  const { sbox2 } = tableEncoding;
  const { T0, T1, T2, T3 } = tableDecoding;
  for (let i = 0; i < Nk; i += 4) {
    for (let j = 0; j < 4; j++)
      xk[i + j] = encKey[Nk - i - 4 + j];
  }
  clean(encKey);
  for (let i = 4; i < Nk - 4; i++) {
    const x = xk[i];
    const w = applySbox(sbox2, x, x, x, x);
    xk[i] = T0[w & 255] ^ T1[w >>> 8 & 255] ^ T2[w >>> 16 & 255] ^ T3[w >>> 24];
  }
  return xk;
}
function apply0123(T01, T23, s0, s1, s2, s3) {
  return T01[s0 << 8 & 65280 | s1 >>> 8 & 255] ^ T23[s2 >>> 8 & 65280 | s3 >>> 24 & 255];
}
function applySbox(sbox2, s0, s1, s2, s3) {
  return sbox2[s0 & 255 | s1 & 65280] | sbox2[s2 >>> 16 & 255 | s3 >>> 16 & 65280] << 16;
}
function encrypt(xk, s0, s1, s2, s3) {
  const { sbox2, T01, T23 } = tableEncoding;
  let k = 0;
  s0 ^= xk[k++], s1 ^= xk[k++], s2 ^= xk[k++], s3 ^= xk[k++];
  const rounds = xk.length / 4 - 2;
  for (let i = 0; i < rounds; i++) {
    const t02 = xk[k++] ^ apply0123(T01, T23, s0, s1, s2, s3);
    const t12 = xk[k++] ^ apply0123(T01, T23, s1, s2, s3, s0);
    const t22 = xk[k++] ^ apply0123(T01, T23, s2, s3, s0, s1);
    const t32 = xk[k++] ^ apply0123(T01, T23, s3, s0, s1, s2);
    s0 = t02, s1 = t12, s2 = t22, s3 = t32;
  }
  const t0 = xk[k++] ^ applySbox(sbox2, s0, s1, s2, s3);
  const t1 = xk[k++] ^ applySbox(sbox2, s1, s2, s3, s0);
  const t2 = xk[k++] ^ applySbox(sbox2, s2, s3, s0, s1);
  const t3 = xk[k++] ^ applySbox(sbox2, s3, s0, s1, s2);
  return { s0: t0, s1: t1, s2: t2, s3: t3 };
}
function decrypt(xk, s0, s1, s2, s3) {
  const { sbox2, T01, T23 } = tableDecoding;
  let k = 0;
  s0 ^= xk[k++], s1 ^= xk[k++], s2 ^= xk[k++], s3 ^= xk[k++];
  const rounds = xk.length / 4 - 2;
  for (let i = 0; i < rounds; i++) {
    const t02 = xk[k++] ^ apply0123(T01, T23, s0, s3, s2, s1);
    const t12 = xk[k++] ^ apply0123(T01, T23, s1, s0, s3, s2);
    const t22 = xk[k++] ^ apply0123(T01, T23, s2, s1, s0, s3);
    const t32 = xk[k++] ^ apply0123(T01, T23, s3, s2, s1, s0);
    s0 = t02, s1 = t12, s2 = t22, s3 = t32;
  }
  const t0 = xk[k++] ^ applySbox(sbox2, s0, s3, s2, s1);
  const t1 = xk[k++] ^ applySbox(sbox2, s1, s0, s3, s2);
  const t2 = xk[k++] ^ applySbox(sbox2, s2, s1, s0, s3);
  const t3 = xk[k++] ^ applySbox(sbox2, s3, s2, s1, s0);
  return { s0: t0, s1: t1, s2: t2, s3: t3 };
}
function validateBlockDecrypt(data) {
  abytes(data);
  if (data.length % BLOCK_SIZE !== 0) {
    throw new Error("aes-(cbc/ecb).decrypt ciphertext should consist of blocks with size " + BLOCK_SIZE);
  }
}
function validateBlockEncrypt(plaintext, pcks5, dst) {
  abytes(plaintext);
  let outLen = plaintext.length;
  const remaining = outLen % BLOCK_SIZE;
  if (!pcks5 && remaining !== 0)
    throw new Error("aec/(cbc-ecb): unpadded plaintext with disabled padding");
  if (!isAligned32(plaintext))
    plaintext = copyBytes(plaintext);
  const b = u32(plaintext);
  if (pcks5) {
    let left = BLOCK_SIZE - remaining;
    if (!left)
      left = BLOCK_SIZE;
    outLen = outLen + left;
  }
  dst = getOutput(outLen, dst);
  complexOverlapBytes(plaintext, dst);
  const o = u32(dst);
  return { b, o, out: dst };
}
function validatePCKS(data, pcks5) {
  if (!pcks5)
    return data;
  const len = data.length;
  if (!len)
    throw new Error("aes/pcks5: empty ciphertext not allowed");
  const lastByte = data[len - 1];
  if (lastByte <= 0 || lastByte > 16)
    throw new Error("aes/pcks5: wrong padding");
  const out = data.subarray(0, -lastByte);
  for (let i = 0; i < lastByte; i++)
    if (data[len - i - 1] !== lastByte)
      throw new Error("aes/pcks5: wrong padding");
  return out;
}
function padPCKS(left) {
  const tmp = new Uint8Array(16);
  const tmp32 = u32(tmp);
  tmp.set(left);
  const paddingByte = BLOCK_SIZE - left.length;
  for (let i = BLOCK_SIZE - paddingByte; i < BLOCK_SIZE; i++)
    tmp[i] = paddingByte;
  return tmp32;
}
var cbc = /* @__PURE__ */ wrapCipher({ blockSize: 16, nonceLength: 16 }, function aescbc(key, iv, opts = {}) {
  const pcks5 = !opts.disablePadding;
  return {
    encrypt(plaintext, dst) {
      const xk = expandKeyLE(key);
      const { b, o, out: _out } = validateBlockEncrypt(plaintext, pcks5, dst);
      let _iv = iv;
      const toClean = [xk];
      if (!isAligned32(_iv))
        toClean.push(_iv = copyBytes(_iv));
      const n32 = u32(_iv);
      let s0 = n32[0], s1 = n32[1], s2 = n32[2], s3 = n32[3];
      let i = 0;
      for (; i + 4 <= b.length; ) {
        s0 ^= b[i + 0], s1 ^= b[i + 1], s2 ^= b[i + 2], s3 ^= b[i + 3];
        ({ s0, s1, s2, s3 } = encrypt(xk, s0, s1, s2, s3));
        o[i++] = s0, o[i++] = s1, o[i++] = s2, o[i++] = s3;
      }
      if (pcks5) {
        const tmp32 = padPCKS(plaintext.subarray(i * 4));
        s0 ^= tmp32[0], s1 ^= tmp32[1], s2 ^= tmp32[2], s3 ^= tmp32[3];
        ({ s0, s1, s2, s3 } = encrypt(xk, s0, s1, s2, s3));
        o[i++] = s0, o[i++] = s1, o[i++] = s2, o[i++] = s3;
      }
      clean(...toClean);
      return _out;
    },
    decrypt(ciphertext, dst) {
      validateBlockDecrypt(ciphertext);
      const xk = expandKeyDecLE(key);
      let _iv = iv;
      const toClean = [xk];
      if (!isAligned32(_iv))
        toClean.push(_iv = copyBytes(_iv));
      const n32 = u32(_iv);
      dst = getOutput(ciphertext.length, dst);
      if (!isAligned32(ciphertext))
        toClean.push(ciphertext = copyBytes(ciphertext));
      complexOverlapBytes(ciphertext, dst);
      const b = u32(ciphertext);
      const o = u32(dst);
      let s0 = n32[0], s1 = n32[1], s2 = n32[2], s3 = n32[3];
      for (let i = 0; i + 4 <= b.length; ) {
        const ps0 = s0, ps1 = s1, ps2 = s2, ps3 = s3;
        s0 = b[i + 0], s1 = b[i + 1], s2 = b[i + 2], s3 = b[i + 3];
        const { s0: o0, s1: o1, s2: o2, s3: o3 } = decrypt(xk, s0, s1, s2, s3);
        o[i++] = o0 ^ ps0, o[i++] = o1 ^ ps1, o[i++] = o2 ^ ps2, o[i++] = o3 ^ ps3;
      }
      clean(...toClean);
      return validatePCKS(dst, pcks5);
    }
  };
});

// node_modules/@noble/hashes/esm/crypto.js
var crypto = typeof globalThis === "object" && "crypto" in globalThis ? globalThis.crypto : void 0;

// node_modules/@noble/hashes/esm/utils.js
function isBytes2(a) {
  return a instanceof Uint8Array || ArrayBuffer.isView(a) && a.constructor.name === "Uint8Array";
}
function anumber(n) {
  if (!Number.isSafeInteger(n) || n < 0)
    throw new Error("positive integer expected, got " + n);
}
function abytes2(b, ...lengths) {
  if (!isBytes2(b))
    throw new Error("Uint8Array expected");
  if (lengths.length > 0 && !lengths.includes(b.length))
    throw new Error("Uint8Array expected of length " + lengths + ", got length=" + b.length);
}
function ahash(h) {
  if (typeof h !== "function" || typeof h.create !== "function")
    throw new Error("Hash should be wrapped by utils.createHasher");
  anumber(h.outputLen);
  anumber(h.blockLen);
}
function aexists(instance, checkFinished = true) {
  if (instance.destroyed)
    throw new Error("Hash instance has been destroyed");
  if (checkFinished && instance.finished)
    throw new Error("Hash#digest() has already been called");
}
function aoutput(out, instance) {
  abytes2(out);
  const min = instance.outputLen;
  if (out.length < min) {
    throw new Error("digestInto() expects output buffer of length at least " + min);
  }
}
function clean2(...arrays) {
  for (let i = 0; i < arrays.length; i++) {
    arrays[i].fill(0);
  }
}
function createView2(arr) {
  return new DataView(arr.buffer, arr.byteOffset, arr.byteLength);
}
function rotr(word, shift) {
  return word << 32 - shift | word >>> shift;
}
var hasHexBuiltin = /* @__PURE__ */ (() => (
  // @ts-ignore
  typeof Uint8Array.from([]).toHex === "function" && typeof Uint8Array.fromHex === "function"
))();
var hexes = /* @__PURE__ */ Array.from({ length: 256 }, (_, i) => i.toString(16).padStart(2, "0"));
function bytesToHex(bytes) {
  abytes2(bytes);
  if (hasHexBuiltin)
    return bytes.toHex();
  let hex = "";
  for (let i = 0; i < bytes.length; i++) {
    hex += hexes[bytes[i]];
  }
  return hex;
}
var asciis = { _0: 48, _9: 57, A: 65, F: 70, a: 97, f: 102 };
function asciiToBase16(ch) {
  if (ch >= asciis._0 && ch <= asciis._9)
    return ch - asciis._0;
  if (ch >= asciis.A && ch <= asciis.F)
    return ch - (asciis.A - 10);
  if (ch >= asciis.a && ch <= asciis.f)
    return ch - (asciis.a - 10);
  return;
}
function hexToBytes(hex) {
  if (typeof hex !== "string")
    throw new Error("hex string expected, got " + typeof hex);
  if (hasHexBuiltin)
    return Uint8Array.fromHex(hex);
  const hl = hex.length;
  const al = hl / 2;
  if (hl % 2)
    throw new Error("hex string expected, got unpadded hex of length " + hl);
  const array = new Uint8Array(al);
  for (let ai = 0, hi = 0; ai < al; ai++, hi += 2) {
    const n1 = asciiToBase16(hex.charCodeAt(hi));
    const n2 = asciiToBase16(hex.charCodeAt(hi + 1));
    if (n1 === void 0 || n2 === void 0) {
      const char = hex[hi] + hex[hi + 1];
      throw new Error('hex string expected, got non-hex character "' + char + '" at index ' + hi);
    }
    array[ai] = n1 * 16 + n2;
  }
  return array;
}
function utf8ToBytes(str) {
  if (typeof str !== "string")
    throw new Error("string expected");
  return new Uint8Array(new TextEncoder().encode(str));
}
function toBytes(data) {
  if (typeof data === "string")
    data = utf8ToBytes(data);
  abytes2(data);
  return data;
}
function concatBytes2(...arrays) {
  let sum = 0;
  for (let i = 0; i < arrays.length; i++) {
    const a = arrays[i];
    abytes2(a);
    sum += a.length;
  }
  const res = new Uint8Array(sum);
  for (let i = 0, pad = 0; i < arrays.length; i++) {
    const a = arrays[i];
    res.set(a, pad);
    pad += a.length;
  }
  return res;
}
var Hash = class {
};
function createHasher(hashCons) {
  const hashC = (msg) => hashCons().update(toBytes(msg)).digest();
  const tmp = hashCons();
  hashC.outputLen = tmp.outputLen;
  hashC.blockLen = tmp.blockLen;
  hashC.create = () => hashCons();
  return hashC;
}
function randomBytes(bytesLength = 32) {
  if (crypto && typeof crypto.getRandomValues === "function") {
    return crypto.getRandomValues(new Uint8Array(bytesLength));
  }
  if (crypto && typeof crypto.randomBytes === "function") {
    return Uint8Array.from(crypto.randomBytes(bytesLength));
  }
  throw new Error("crypto.getRandomValues must be defined");
}

// node_modules/@noble/hashes/esm/_md.js
function setBigUint642(view, byteOffset, value, isLE2) {
  if (typeof view.setBigUint64 === "function")
    return view.setBigUint64(byteOffset, value, isLE2);
  const _32n2 = BigInt(32);
  const _u32_max = BigInt(4294967295);
  const wh = Number(value >> _32n2 & _u32_max);
  const wl = Number(value & _u32_max);
  const h = isLE2 ? 4 : 0;
  const l = isLE2 ? 0 : 4;
  view.setUint32(byteOffset + h, wh, isLE2);
  view.setUint32(byteOffset + l, wl, isLE2);
}
function Chi(a, b, c) {
  return a & b ^ ~a & c;
}
function Maj(a, b, c) {
  return a & b ^ a & c ^ b & c;
}
var HashMD = class extends Hash {
  constructor(blockLen, outputLen, padOffset, isLE2) {
    super();
    this.finished = false;
    this.length = 0;
    this.pos = 0;
    this.destroyed = false;
    this.blockLen = blockLen;
    this.outputLen = outputLen;
    this.padOffset = padOffset;
    this.isLE = isLE2;
    this.buffer = new Uint8Array(blockLen);
    this.view = createView2(this.buffer);
  }
  update(data) {
    aexists(this);
    data = toBytes(data);
    abytes2(data);
    const { view, buffer, blockLen } = this;
    const len = data.length;
    for (let pos = 0; pos < len; ) {
      const take = Math.min(blockLen - this.pos, len - pos);
      if (take === blockLen) {
        const dataView = createView2(data);
        for (; blockLen <= len - pos; pos += blockLen)
          this.process(dataView, pos);
        continue;
      }
      buffer.set(data.subarray(pos, pos + take), this.pos);
      this.pos += take;
      pos += take;
      if (this.pos === blockLen) {
        this.process(view, 0);
        this.pos = 0;
      }
    }
    this.length += data.length;
    this.roundClean();
    return this;
  }
  digestInto(out) {
    aexists(this);
    aoutput(out, this);
    this.finished = true;
    const { buffer, view, blockLen, isLE: isLE2 } = this;
    let { pos } = this;
    buffer[pos++] = 128;
    clean2(this.buffer.subarray(pos));
    if (this.padOffset > blockLen - pos) {
      this.process(view, 0);
      pos = 0;
    }
    for (let i = pos; i < blockLen; i++)
      buffer[i] = 0;
    setBigUint642(view, blockLen - 8, BigInt(this.length * 8), isLE2);
    this.process(view, 0);
    const oview = createView2(out);
    const len = this.outputLen;
    if (len % 4)
      throw new Error("_sha2: outputLen should be aligned to 32bit");
    const outLen = len / 4;
    const state = this.get();
    if (outLen > state.length)
      throw new Error("_sha2: outputLen bigger than state");
    for (let i = 0; i < outLen; i++)
      oview.setUint32(4 * i, state[i], isLE2);
  }
  digest() {
    const { buffer, outputLen } = this;
    this.digestInto(buffer);
    const res = buffer.slice(0, outputLen);
    this.destroy();
    return res;
  }
  _cloneInto(to) {
    to || (to = new this.constructor());
    to.set(...this.get());
    const { blockLen, buffer, length, finished, destroyed, pos } = this;
    to.destroyed = destroyed;
    to.finished = finished;
    to.length = length;
    to.pos = pos;
    if (length % blockLen)
      to.buffer.set(buffer);
    return to;
  }
  clone() {
    return this._cloneInto();
  }
};
var SHA256_IV = /* @__PURE__ */ Uint32Array.from([
  1779033703,
  3144134277,
  1013904242,
  2773480762,
  1359893119,
  2600822924,
  528734635,
  1541459225
]);
var SHA512_IV = /* @__PURE__ */ Uint32Array.from([
  1779033703,
  4089235720,
  3144134277,
  2227873595,
  1013904242,
  4271175723,
  2773480762,
  1595750129,
  1359893119,
  2917565137,
  2600822924,
  725511199,
  528734635,
  4215389547,
  1541459225,
  327033209
]);

// node_modules/@noble/hashes/esm/_u64.js
var U32_MASK64 = /* @__PURE__ */ BigInt(2 ** 32 - 1);
var _32n = /* @__PURE__ */ BigInt(32);
function fromBig(n, le = false) {
  if (le)
    return { h: Number(n & U32_MASK64), l: Number(n >> _32n & U32_MASK64) };
  return { h: Number(n >> _32n & U32_MASK64) | 0, l: Number(n & U32_MASK64) | 0 };
}
function split(lst, le = false) {
  const len = lst.length;
  let Ah = new Uint32Array(len);
  let Al = new Uint32Array(len);
  for (let i = 0; i < len; i++) {
    const { h, l } = fromBig(lst[i], le);
    [Ah[i], Al[i]] = [h, l];
  }
  return [Ah, Al];
}
var shrSH = (h, _l, s) => h >>> s;
var shrSL = (h, l, s) => h << 32 - s | l >>> s;
var rotrSH = (h, l, s) => h >>> s | l << 32 - s;
var rotrSL = (h, l, s) => h << 32 - s | l >>> s;
var rotrBH = (h, l, s) => h << 64 - s | l >>> s - 32;
var rotrBL = (h, l, s) => h >>> s - 32 | l << 64 - s;
function add(Ah, Al, Bh, Bl) {
  const l = (Al >>> 0) + (Bl >>> 0);
  return { h: Ah + Bh + (l / 2 ** 32 | 0) | 0, l: l | 0 };
}
var add3L = (Al, Bl, Cl) => (Al >>> 0) + (Bl >>> 0) + (Cl >>> 0);
var add3H = (low, Ah, Bh, Ch) => Ah + Bh + Ch + (low / 2 ** 32 | 0) | 0;
var add4L = (Al, Bl, Cl, Dl) => (Al >>> 0) + (Bl >>> 0) + (Cl >>> 0) + (Dl >>> 0);
var add4H = (low, Ah, Bh, Ch, Dh) => Ah + Bh + Ch + Dh + (low / 2 ** 32 | 0) | 0;
var add5L = (Al, Bl, Cl, Dl, El) => (Al >>> 0) + (Bl >>> 0) + (Cl >>> 0) + (Dl >>> 0) + (El >>> 0);
var add5H = (low, Ah, Bh, Ch, Dh, Eh) => Ah + Bh + Ch + Dh + Eh + (low / 2 ** 32 | 0) | 0;

// node_modules/@noble/hashes/esm/sha2.js
var SHA256_K = /* @__PURE__ */ Uint32Array.from([
  1116352408,
  1899447441,
  3049323471,
  3921009573,
  961987163,
  1508970993,
  2453635748,
  2870763221,
  3624381080,
  310598401,
  607225278,
  1426881987,
  1925078388,
  2162078206,
  2614888103,
  3248222580,
  3835390401,
  4022224774,
  264347078,
  604807628,
  770255983,
  1249150122,
  1555081692,
  1996064986,
  2554220882,
  2821834349,
  2952996808,
  3210313671,
  3336571891,
  3584528711,
  113926993,
  338241895,
  666307205,
  773529912,
  1294757372,
  1396182291,
  1695183700,
  1986661051,
  2177026350,
  2456956037,
  2730485921,
  2820302411,
  3259730800,
  3345764771,
  3516065817,
  3600352804,
  4094571909,
  275423344,
  430227734,
  506948616,
  659060556,
  883997877,
  958139571,
  1322822218,
  1537002063,
  1747873779,
  1955562222,
  2024104815,
  2227730452,
  2361852424,
  2428436474,
  2756734187,
  3204031479,
  3329325298
]);
var SHA256_W = /* @__PURE__ */ new Uint32Array(64);
var SHA256 = class extends HashMD {
  constructor(outputLen = 32) {
    super(64, outputLen, 8, false);
    this.A = SHA256_IV[0] | 0;
    this.B = SHA256_IV[1] | 0;
    this.C = SHA256_IV[2] | 0;
    this.D = SHA256_IV[3] | 0;
    this.E = SHA256_IV[4] | 0;
    this.F = SHA256_IV[5] | 0;
    this.G = SHA256_IV[6] | 0;
    this.H = SHA256_IV[7] | 0;
  }
  get() {
    const { A, B, C, D, E, F, G, H } = this;
    return [A, B, C, D, E, F, G, H];
  }
  // prettier-ignore
  set(A, B, C, D, E, F, G, H) {
    this.A = A | 0;
    this.B = B | 0;
    this.C = C | 0;
    this.D = D | 0;
    this.E = E | 0;
    this.F = F | 0;
    this.G = G | 0;
    this.H = H | 0;
  }
  process(view, offset) {
    for (let i = 0; i < 16; i++, offset += 4)
      SHA256_W[i] = view.getUint32(offset, false);
    for (let i = 16; i < 64; i++) {
      const W15 = SHA256_W[i - 15];
      const W2 = SHA256_W[i - 2];
      const s0 = rotr(W15, 7) ^ rotr(W15, 18) ^ W15 >>> 3;
      const s1 = rotr(W2, 17) ^ rotr(W2, 19) ^ W2 >>> 10;
      SHA256_W[i] = s1 + SHA256_W[i - 7] + s0 + SHA256_W[i - 16] | 0;
    }
    let { A, B, C, D, E, F, G, H } = this;
    for (let i = 0; i < 64; i++) {
      const sigma1 = rotr(E, 6) ^ rotr(E, 11) ^ rotr(E, 25);
      const T1 = H + sigma1 + Chi(E, F, G) + SHA256_K[i] + SHA256_W[i] | 0;
      const sigma0 = rotr(A, 2) ^ rotr(A, 13) ^ rotr(A, 22);
      const T2 = sigma0 + Maj(A, B, C) | 0;
      H = G;
      G = F;
      F = E;
      E = D + T1 | 0;
      D = C;
      C = B;
      B = A;
      A = T1 + T2 | 0;
    }
    A = A + this.A | 0;
    B = B + this.B | 0;
    C = C + this.C | 0;
    D = D + this.D | 0;
    E = E + this.E | 0;
    F = F + this.F | 0;
    G = G + this.G | 0;
    H = H + this.H | 0;
    this.set(A, B, C, D, E, F, G, H);
  }
  roundClean() {
    clean2(SHA256_W);
  }
  destroy() {
    this.set(0, 0, 0, 0, 0, 0, 0, 0);
    clean2(this.buffer);
  }
};
var K512 = /* @__PURE__ */ (() => split([
  "0x428a2f98d728ae22",
  "0x7137449123ef65cd",
  "0xb5c0fbcfec4d3b2f",
  "0xe9b5dba58189dbbc",
  "0x3956c25bf348b538",
  "0x59f111f1b605d019",
  "0x923f82a4af194f9b",
  "0xab1c5ed5da6d8118",
  "0xd807aa98a3030242",
  "0x12835b0145706fbe",
  "0x243185be4ee4b28c",
  "0x550c7dc3d5ffb4e2",
  "0x72be5d74f27b896f",
  "0x80deb1fe3b1696b1",
  "0x9bdc06a725c71235",
  "0xc19bf174cf692694",
  "0xe49b69c19ef14ad2",
  "0xefbe4786384f25e3",
  "0x0fc19dc68b8cd5b5",
  "0x240ca1cc77ac9c65",
  "0x2de92c6f592b0275",
  "0x4a7484aa6ea6e483",
  "0x5cb0a9dcbd41fbd4",
  "0x76f988da831153b5",
  "0x983e5152ee66dfab",
  "0xa831c66d2db43210",
  "0xb00327c898fb213f",
  "0xbf597fc7beef0ee4",
  "0xc6e00bf33da88fc2",
  "0xd5a79147930aa725",
  "0x06ca6351e003826f",
  "0x142929670a0e6e70",
  "0x27b70a8546d22ffc",
  "0x2e1b21385c26c926",
  "0x4d2c6dfc5ac42aed",
  "0x53380d139d95b3df",
  "0x650a73548baf63de",
  "0x766a0abb3c77b2a8",
  "0x81c2c92e47edaee6",
  "0x92722c851482353b",
  "0xa2bfe8a14cf10364",
  "0xa81a664bbc423001",
  "0xc24b8b70d0f89791",
  "0xc76c51a30654be30",
  "0xd192e819d6ef5218",
  "0xd69906245565a910",
  "0xf40e35855771202a",
  "0x106aa07032bbd1b8",
  "0x19a4c116b8d2d0c8",
  "0x1e376c085141ab53",
  "0x2748774cdf8eeb99",
  "0x34b0bcb5e19b48a8",
  "0x391c0cb3c5c95a63",
  "0x4ed8aa4ae3418acb",
  "0x5b9cca4f7763e373",
  "0x682e6ff3d6b2b8a3",
  "0x748f82ee5defb2fc",
  "0x78a5636f43172f60",
  "0x84c87814a1f0ab72",
  "0x8cc702081a6439ec",
  "0x90befffa23631e28",
  "0xa4506cebde82bde9",
  "0xbef9a3f7b2c67915",
  "0xc67178f2e372532b",
  "0xca273eceea26619c",
  "0xd186b8c721c0c207",
  "0xeada7dd6cde0eb1e",
  "0xf57d4f7fee6ed178",
  "0x06f067aa72176fba",
  "0x0a637dc5a2c898a6",
  "0x113f9804bef90dae",
  "0x1b710b35131c471b",
  "0x28db77f523047d84",
  "0x32caab7b40c72493",
  "0x3c9ebe0a15c9bebc",
  "0x431d67c49c100d4c",
  "0x4cc5d4becb3e42b6",
  "0x597f299cfc657e2a",
  "0x5fcb6fab3ad6faec",
  "0x6c44198c4a475817"
].map((n) => BigInt(n))))();
var SHA512_Kh = /* @__PURE__ */ (() => K512[0])();
var SHA512_Kl = /* @__PURE__ */ (() => K512[1])();
var SHA512_W_H = /* @__PURE__ */ new Uint32Array(80);
var SHA512_W_L = /* @__PURE__ */ new Uint32Array(80);
var SHA512 = class extends HashMD {
  constructor(outputLen = 64) {
    super(128, outputLen, 16, false);
    this.Ah = SHA512_IV[0] | 0;
    this.Al = SHA512_IV[1] | 0;
    this.Bh = SHA512_IV[2] | 0;
    this.Bl = SHA512_IV[3] | 0;
    this.Ch = SHA512_IV[4] | 0;
    this.Cl = SHA512_IV[5] | 0;
    this.Dh = SHA512_IV[6] | 0;
    this.Dl = SHA512_IV[7] | 0;
    this.Eh = SHA512_IV[8] | 0;
    this.El = SHA512_IV[9] | 0;
    this.Fh = SHA512_IV[10] | 0;
    this.Fl = SHA512_IV[11] | 0;
    this.Gh = SHA512_IV[12] | 0;
    this.Gl = SHA512_IV[13] | 0;
    this.Hh = SHA512_IV[14] | 0;
    this.Hl = SHA512_IV[15] | 0;
  }
  // prettier-ignore
  get() {
    const { Ah, Al, Bh, Bl, Ch, Cl, Dh, Dl, Eh, El, Fh, Fl, Gh, Gl, Hh, Hl } = this;
    return [Ah, Al, Bh, Bl, Ch, Cl, Dh, Dl, Eh, El, Fh, Fl, Gh, Gl, Hh, Hl];
  }
  // prettier-ignore
  set(Ah, Al, Bh, Bl, Ch, Cl, Dh, Dl, Eh, El, Fh, Fl, Gh, Gl, Hh, Hl) {
    this.Ah = Ah | 0;
    this.Al = Al | 0;
    this.Bh = Bh | 0;
    this.Bl = Bl | 0;
    this.Ch = Ch | 0;
    this.Cl = Cl | 0;
    this.Dh = Dh | 0;
    this.Dl = Dl | 0;
    this.Eh = Eh | 0;
    this.El = El | 0;
    this.Fh = Fh | 0;
    this.Fl = Fl | 0;
    this.Gh = Gh | 0;
    this.Gl = Gl | 0;
    this.Hh = Hh | 0;
    this.Hl = Hl | 0;
  }
  process(view, offset) {
    for (let i = 0; i < 16; i++, offset += 4) {
      SHA512_W_H[i] = view.getUint32(offset);
      SHA512_W_L[i] = view.getUint32(offset += 4);
    }
    for (let i = 16; i < 80; i++) {
      const W15h = SHA512_W_H[i - 15] | 0;
      const W15l = SHA512_W_L[i - 15] | 0;
      const s0h = rotrSH(W15h, W15l, 1) ^ rotrSH(W15h, W15l, 8) ^ shrSH(W15h, W15l, 7);
      const s0l = rotrSL(W15h, W15l, 1) ^ rotrSL(W15h, W15l, 8) ^ shrSL(W15h, W15l, 7);
      const W2h = SHA512_W_H[i - 2] | 0;
      const W2l = SHA512_W_L[i - 2] | 0;
      const s1h = rotrSH(W2h, W2l, 19) ^ rotrBH(W2h, W2l, 61) ^ shrSH(W2h, W2l, 6);
      const s1l = rotrSL(W2h, W2l, 19) ^ rotrBL(W2h, W2l, 61) ^ shrSL(W2h, W2l, 6);
      const SUMl = add4L(s0l, s1l, SHA512_W_L[i - 7], SHA512_W_L[i - 16]);
      const SUMh = add4H(SUMl, s0h, s1h, SHA512_W_H[i - 7], SHA512_W_H[i - 16]);
      SHA512_W_H[i] = SUMh | 0;
      SHA512_W_L[i] = SUMl | 0;
    }
    let { Ah, Al, Bh, Bl, Ch, Cl, Dh, Dl, Eh, El, Fh, Fl, Gh, Gl, Hh, Hl } = this;
    for (let i = 0; i < 80; i++) {
      const sigma1h = rotrSH(Eh, El, 14) ^ rotrSH(Eh, El, 18) ^ rotrBH(Eh, El, 41);
      const sigma1l = rotrSL(Eh, El, 14) ^ rotrSL(Eh, El, 18) ^ rotrBL(Eh, El, 41);
      const CHIh = Eh & Fh ^ ~Eh & Gh;
      const CHIl = El & Fl ^ ~El & Gl;
      const T1ll = add5L(Hl, sigma1l, CHIl, SHA512_Kl[i], SHA512_W_L[i]);
      const T1h = add5H(T1ll, Hh, sigma1h, CHIh, SHA512_Kh[i], SHA512_W_H[i]);
      const T1l = T1ll | 0;
      const sigma0h = rotrSH(Ah, Al, 28) ^ rotrBH(Ah, Al, 34) ^ rotrBH(Ah, Al, 39);
      const sigma0l = rotrSL(Ah, Al, 28) ^ rotrBL(Ah, Al, 34) ^ rotrBL(Ah, Al, 39);
      const MAJh = Ah & Bh ^ Ah & Ch ^ Bh & Ch;
      const MAJl = Al & Bl ^ Al & Cl ^ Bl & Cl;
      Hh = Gh | 0;
      Hl = Gl | 0;
      Gh = Fh | 0;
      Gl = Fl | 0;
      Fh = Eh | 0;
      Fl = El | 0;
      ({ h: Eh, l: El } = add(Dh | 0, Dl | 0, T1h | 0, T1l | 0));
      Dh = Ch | 0;
      Dl = Cl | 0;
      Ch = Bh | 0;
      Cl = Bl | 0;
      Bh = Ah | 0;
      Bl = Al | 0;
      const All = add3L(T1l, sigma0l, MAJl);
      Ah = add3H(All, T1h, sigma0h, MAJh);
      Al = All | 0;
    }
    ({ h: Ah, l: Al } = add(this.Ah | 0, this.Al | 0, Ah | 0, Al | 0));
    ({ h: Bh, l: Bl } = add(this.Bh | 0, this.Bl | 0, Bh | 0, Bl | 0));
    ({ h: Ch, l: Cl } = add(this.Ch | 0, this.Cl | 0, Ch | 0, Cl | 0));
    ({ h: Dh, l: Dl } = add(this.Dh | 0, this.Dl | 0, Dh | 0, Dl | 0));
    ({ h: Eh, l: El } = add(this.Eh | 0, this.El | 0, Eh | 0, El | 0));
    ({ h: Fh, l: Fl } = add(this.Fh | 0, this.Fl | 0, Fh | 0, Fl | 0));
    ({ h: Gh, l: Gl } = add(this.Gh | 0, this.Gl | 0, Gh | 0, Gl | 0));
    ({ h: Hh, l: Hl } = add(this.Hh | 0, this.Hl | 0, Hh | 0, Hl | 0));
    this.set(Ah, Al, Bh, Bl, Ch, Cl, Dh, Dl, Eh, El, Fh, Fl, Gh, Gl, Hh, Hl);
  }
  roundClean() {
    clean2(SHA512_W_H, SHA512_W_L);
  }
  destroy() {
    clean2(this.buffer);
    this.set(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
  }
};
var sha256 = /* @__PURE__ */ createHasher(() => new SHA256());
var sha512 = /* @__PURE__ */ createHasher(() => new SHA512());

// node_modules/@noble/curves/esm/utils.js
var _0n = /* @__PURE__ */ BigInt(0);
var _1n = /* @__PURE__ */ BigInt(1);
function _abool2(value, title = "") {
  if (typeof value !== "boolean") {
    const prefix = title && `"${title}"`;
    throw new Error(prefix + "expected boolean, got type=" + typeof value);
  }
  return value;
}
function _abytes2(value, length, title = "") {
  const bytes = isBytes2(value);
  const len = value?.length;
  const needsLen = length !== void 0;
  if (!bytes || needsLen && len !== length) {
    const prefix = title && `"${title}" `;
    const ofLen = needsLen ? ` of length ${length}` : "";
    const got = bytes ? `length=${len}` : `type=${typeof value}`;
    throw new Error(prefix + "expected Uint8Array" + ofLen + ", got " + got);
  }
  return value;
}
function hexToNumber(hex) {
  if (typeof hex !== "string")
    throw new Error("hex string expected, got " + typeof hex);
  return hex === "" ? _0n : BigInt("0x" + hex);
}
function bytesToNumberBE(bytes) {
  return hexToNumber(bytesToHex(bytes));
}
function bytesToNumberLE(bytes) {
  abytes2(bytes);
  return hexToNumber(bytesToHex(Uint8Array.from(bytes).reverse()));
}
function numberToBytesBE(n, len) {
  return hexToBytes(n.toString(16).padStart(len * 2, "0"));
}
function numberToBytesLE(n, len) {
  return numberToBytesBE(n, len).reverse();
}
function ensureBytes(title, hex, expectedLength) {
  let res;
  if (typeof hex === "string") {
    try {
      res = hexToBytes(hex);
    } catch (e) {
      throw new Error(title + " must be hex string or Uint8Array, cause: " + e);
    }
  } else if (isBytes2(hex)) {
    res = Uint8Array.from(hex);
  } else {
    throw new Error(title + " must be hex string or Uint8Array");
  }
  const len = res.length;
  if (typeof expectedLength === "number" && len !== expectedLength)
    throw new Error(title + " of length " + expectedLength + " expected, got " + len);
  return res;
}
function equalBytes2(a, b) {
  if (a.length !== b.length)
    return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++)
    diff |= a[i] ^ b[i];
  return diff === 0;
}
function copyBytes2(bytes) {
  return Uint8Array.from(bytes);
}
var isPosBig = (n) => typeof n === "bigint" && _0n <= n;
function inRange(n, min, max) {
  return isPosBig(n) && isPosBig(min) && isPosBig(max) && min <= n && n < max;
}
function aInRange(title, n, min, max) {
  if (!inRange(n, min, max))
    throw new Error("expected valid " + title + ": " + min + " <= n < " + max + ", got " + n);
}
function bitLen(n) {
  let len;
  for (len = 0; n > _0n; n >>= _1n, len += 1)
    ;
  return len;
}
var bitMask = (n) => (_1n << BigInt(n)) - _1n;
function _validateObject(object, fields, optFields = {}) {
  if (!object || typeof object !== "object")
    throw new Error("expected valid options object");
  function checkField(fieldName, expectedType, isOpt) {
    const val = object[fieldName];
    if (isOpt && val === void 0)
      return;
    const current = typeof val;
    if (current !== expectedType || val === null)
      throw new Error(`param "${fieldName}" is invalid: expected ${expectedType}, got ${current}`);
  }
  Object.entries(fields).forEach(([k, v]) => checkField(k, v, false));
  Object.entries(optFields).forEach(([k, v]) => checkField(k, v, true));
}
var notImplemented = () => {
  throw new Error("not implemented");
};
function memoized(fn) {
  const map = /* @__PURE__ */ new WeakMap();
  return (arg, ...args) => {
    const val = map.get(arg);
    if (val !== void 0)
      return val;
    const computed = fn(arg, ...args);
    map.set(arg, computed);
    return computed;
  };
}

// node_modules/@noble/curves/esm/abstract/modular.js
var _0n2 = BigInt(0);
var _1n2 = BigInt(1);
var _2n = /* @__PURE__ */ BigInt(2);
var _3n = /* @__PURE__ */ BigInt(3);
var _4n = /* @__PURE__ */ BigInt(4);
var _5n = /* @__PURE__ */ BigInt(5);
var _7n = /* @__PURE__ */ BigInt(7);
var _8n = /* @__PURE__ */ BigInt(8);
var _9n = /* @__PURE__ */ BigInt(9);
var _16n = /* @__PURE__ */ BigInt(16);
function mod(a, b) {
  const result = a % b;
  return result >= _0n2 ? result : b + result;
}
function pow2(x, power, modulo) {
  let res = x;
  while (power-- > _0n2) {
    res *= res;
    res %= modulo;
  }
  return res;
}
function invert(number, modulo) {
  if (number === _0n2)
    throw new Error("invert: expected non-zero number");
  if (modulo <= _0n2)
    throw new Error("invert: expected positive modulus, got " + modulo);
  let a = mod(number, modulo);
  let b = modulo;
  let x = _0n2, y = _1n2, u = _1n2, v = _0n2;
  while (a !== _0n2) {
    const q = b / a;
    const r = b % a;
    const m = x - u * q;
    const n = y - v * q;
    b = a, a = r, x = u, y = v, u = m, v = n;
  }
  const gcd = b;
  if (gcd !== _1n2)
    throw new Error("invert: does not exist");
  return mod(x, modulo);
}
function assertIsSquare(Fp2, root, n) {
  if (!Fp2.eql(Fp2.sqr(root), n))
    throw new Error("Cannot find square root");
}
function sqrt3mod4(Fp2, n) {
  const p1div4 = (Fp2.ORDER + _1n2) / _4n;
  const root = Fp2.pow(n, p1div4);
  assertIsSquare(Fp2, root, n);
  return root;
}
function sqrt5mod8(Fp2, n) {
  const p5div8 = (Fp2.ORDER - _5n) / _8n;
  const n2 = Fp2.mul(n, _2n);
  const v = Fp2.pow(n2, p5div8);
  const nv = Fp2.mul(n, v);
  const i = Fp2.mul(Fp2.mul(nv, _2n), v);
  const root = Fp2.mul(nv, Fp2.sub(i, Fp2.ONE));
  assertIsSquare(Fp2, root, n);
  return root;
}
function sqrt9mod16(P) {
  const Fp_ = Field(P);
  const tn = tonelliShanks(P);
  const c1 = tn(Fp_, Fp_.neg(Fp_.ONE));
  const c2 = tn(Fp_, c1);
  const c3 = tn(Fp_, Fp_.neg(c1));
  const c4 = (P + _7n) / _16n;
  return (Fp2, n) => {
    let tv1 = Fp2.pow(n, c4);
    let tv2 = Fp2.mul(tv1, c1);
    const tv3 = Fp2.mul(tv1, c2);
    const tv4 = Fp2.mul(tv1, c3);
    const e1 = Fp2.eql(Fp2.sqr(tv2), n);
    const e2 = Fp2.eql(Fp2.sqr(tv3), n);
    tv1 = Fp2.cmov(tv1, tv2, e1);
    tv2 = Fp2.cmov(tv4, tv3, e2);
    const e3 = Fp2.eql(Fp2.sqr(tv2), n);
    const root = Fp2.cmov(tv1, tv2, e3);
    assertIsSquare(Fp2, root, n);
    return root;
  };
}
function tonelliShanks(P) {
  if (P < _3n)
    throw new Error("sqrt is not defined for small field");
  let Q = P - _1n2;
  let S = 0;
  while (Q % _2n === _0n2) {
    Q /= _2n;
    S++;
  }
  let Z = _2n;
  const _Fp = Field(P);
  while (FpLegendre(_Fp, Z) === 1) {
    if (Z++ > 1e3)
      throw new Error("Cannot find square root: probably non-prime P");
  }
  if (S === 1)
    return sqrt3mod4;
  let cc = _Fp.pow(Z, Q);
  const Q1div2 = (Q + _1n2) / _2n;
  return function tonelliSlow(Fp2, n) {
    if (Fp2.is0(n))
      return n;
    if (FpLegendre(Fp2, n) !== 1)
      throw new Error("Cannot find square root");
    let M = S;
    let c = Fp2.mul(Fp2.ONE, cc);
    let t = Fp2.pow(n, Q);
    let R = Fp2.pow(n, Q1div2);
    while (!Fp2.eql(t, Fp2.ONE)) {
      if (Fp2.is0(t))
        return Fp2.ZERO;
      let i = 1;
      let t_tmp = Fp2.sqr(t);
      while (!Fp2.eql(t_tmp, Fp2.ONE)) {
        i++;
        t_tmp = Fp2.sqr(t_tmp);
        if (i === M)
          throw new Error("Cannot find square root");
      }
      const exponent = _1n2 << BigInt(M - i - 1);
      const b = Fp2.pow(c, exponent);
      M = i;
      c = Fp2.sqr(b);
      t = Fp2.mul(t, c);
      R = Fp2.mul(R, b);
    }
    return R;
  };
}
function FpSqrt(P) {
  if (P % _4n === _3n)
    return sqrt3mod4;
  if (P % _8n === _5n)
    return sqrt5mod8;
  if (P % _16n === _9n)
    return sqrt9mod16(P);
  return tonelliShanks(P);
}
var isNegativeLE = (num, modulo) => (mod(num, modulo) & _1n2) === _1n2;
var FIELD_FIELDS = [
  "create",
  "isValid",
  "is0",
  "neg",
  "inv",
  "sqrt",
  "sqr",
  "eql",
  "add",
  "sub",
  "mul",
  "pow",
  "div",
  "addN",
  "subN",
  "mulN",
  "sqrN"
];
function validateField(field) {
  const initial = {
    ORDER: "bigint",
    MASK: "bigint",
    BYTES: "number",
    BITS: "number"
  };
  const opts = FIELD_FIELDS.reduce((map, val) => {
    map[val] = "function";
    return map;
  }, initial);
  _validateObject(field, opts);
  return field;
}
function FpPow(Fp2, num, power) {
  if (power < _0n2)
    throw new Error("invalid exponent, negatives unsupported");
  if (power === _0n2)
    return Fp2.ONE;
  if (power === _1n2)
    return num;
  let p = Fp2.ONE;
  let d = num;
  while (power > _0n2) {
    if (power & _1n2)
      p = Fp2.mul(p, d);
    d = Fp2.sqr(d);
    power >>= _1n2;
  }
  return p;
}
function FpInvertBatch(Fp2, nums, passZero = false) {
  const inverted = new Array(nums.length).fill(passZero ? Fp2.ZERO : void 0);
  const multipliedAcc = nums.reduce((acc, num, i) => {
    if (Fp2.is0(num))
      return acc;
    inverted[i] = acc;
    return Fp2.mul(acc, num);
  }, Fp2.ONE);
  const invertedAcc = Fp2.inv(multipliedAcc);
  nums.reduceRight((acc, num, i) => {
    if (Fp2.is0(num))
      return acc;
    inverted[i] = Fp2.mul(acc, inverted[i]);
    return Fp2.mul(acc, num);
  }, invertedAcc);
  return inverted;
}
function FpLegendre(Fp2, n) {
  const p1mod2 = (Fp2.ORDER - _1n2) / _2n;
  const powered = Fp2.pow(n, p1mod2);
  const yes = Fp2.eql(powered, Fp2.ONE);
  const zero = Fp2.eql(powered, Fp2.ZERO);
  const no = Fp2.eql(powered, Fp2.neg(Fp2.ONE));
  if (!yes && !zero && !no)
    throw new Error("invalid Legendre symbol result");
  return yes ? 1 : zero ? 0 : -1;
}
function nLength(n, nBitLength) {
  if (nBitLength !== void 0)
    anumber(nBitLength);
  const _nBitLength = nBitLength !== void 0 ? nBitLength : n.toString(2).length;
  const nByteLength = Math.ceil(_nBitLength / 8);
  return { nBitLength: _nBitLength, nByteLength };
}
function Field(ORDER, bitLenOrOpts, isLE2 = false, opts = {}) {
  if (ORDER <= _0n2)
    throw new Error("invalid field: expected ORDER > 0, got " + ORDER);
  let _nbitLength = void 0;
  let _sqrt = void 0;
  let modFromBytes = false;
  let allowedLengths = void 0;
  if (typeof bitLenOrOpts === "object" && bitLenOrOpts != null) {
    if (opts.sqrt || isLE2)
      throw new Error("cannot specify opts in two arguments");
    const _opts = bitLenOrOpts;
    if (_opts.BITS)
      _nbitLength = _opts.BITS;
    if (_opts.sqrt)
      _sqrt = _opts.sqrt;
    if (typeof _opts.isLE === "boolean")
      isLE2 = _opts.isLE;
    if (typeof _opts.modFromBytes === "boolean")
      modFromBytes = _opts.modFromBytes;
    allowedLengths = _opts.allowedLengths;
  } else {
    if (typeof bitLenOrOpts === "number")
      _nbitLength = bitLenOrOpts;
    if (opts.sqrt)
      _sqrt = opts.sqrt;
  }
  const { nBitLength: BITS, nByteLength: BYTES } = nLength(ORDER, _nbitLength);
  if (BYTES > 2048)
    throw new Error("invalid field: expected ORDER of <= 2048 bytes");
  let sqrtP;
  const f = Object.freeze({
    ORDER,
    isLE: isLE2,
    BITS,
    BYTES,
    MASK: bitMask(BITS),
    ZERO: _0n2,
    ONE: _1n2,
    allowedLengths,
    create: (num) => mod(num, ORDER),
    isValid: (num) => {
      if (typeof num !== "bigint")
        throw new Error("invalid field element: expected bigint, got " + typeof num);
      return _0n2 <= num && num < ORDER;
    },
    is0: (num) => num === _0n2,
    // is valid and invertible
    isValidNot0: (num) => !f.is0(num) && f.isValid(num),
    isOdd: (num) => (num & _1n2) === _1n2,
    neg: (num) => mod(-num, ORDER),
    eql: (lhs, rhs) => lhs === rhs,
    sqr: (num) => mod(num * num, ORDER),
    add: (lhs, rhs) => mod(lhs + rhs, ORDER),
    sub: (lhs, rhs) => mod(lhs - rhs, ORDER),
    mul: (lhs, rhs) => mod(lhs * rhs, ORDER),
    pow: (num, power) => FpPow(f, num, power),
    div: (lhs, rhs) => mod(lhs * invert(rhs, ORDER), ORDER),
    // Same as above, but doesn't normalize
    sqrN: (num) => num * num,
    addN: (lhs, rhs) => lhs + rhs,
    subN: (lhs, rhs) => lhs - rhs,
    mulN: (lhs, rhs) => lhs * rhs,
    inv: (num) => invert(num, ORDER),
    sqrt: _sqrt || ((n) => {
      if (!sqrtP)
        sqrtP = FpSqrt(ORDER);
      return sqrtP(f, n);
    }),
    toBytes: (num) => isLE2 ? numberToBytesLE(num, BYTES) : numberToBytesBE(num, BYTES),
    fromBytes: (bytes, skipValidation = true) => {
      if (allowedLengths) {
        if (!allowedLengths.includes(bytes.length) || bytes.length > BYTES) {
          throw new Error("Field.fromBytes: expected " + allowedLengths + " bytes, got " + bytes.length);
        }
        const padded = new Uint8Array(BYTES);
        padded.set(bytes, isLE2 ? 0 : padded.length - bytes.length);
        bytes = padded;
      }
      if (bytes.length !== BYTES)
        throw new Error("Field.fromBytes: expected " + BYTES + " bytes, got " + bytes.length);
      let scalar = isLE2 ? bytesToNumberLE(bytes) : bytesToNumberBE(bytes);
      if (modFromBytes)
        scalar = mod(scalar, ORDER);
      if (!skipValidation) {
        if (!f.isValid(scalar))
          throw new Error("invalid field element: outside of range 0..ORDER");
      }
      return scalar;
    },
    // TODO: we don't need it here, move out to separate fn
    invertBatch: (lst) => FpInvertBatch(f, lst),
    // We can't move this out because Fp6, Fp12 implement it
    // and it's unclear what to return in there.
    cmov: (a, b, c) => c ? b : a
  });
  return Object.freeze(f);
}

// node_modules/@noble/curves/esm/abstract/curve.js
var _0n3 = BigInt(0);
var _1n3 = BigInt(1);
function negateCt(condition, item) {
  const neg = item.negate();
  return condition ? neg : item;
}
function normalizeZ(c, points) {
  const invertedZs = FpInvertBatch(c.Fp, points.map((p) => p.Z));
  return points.map((p, i) => c.fromAffine(p.toAffine(invertedZs[i])));
}
function validateW(W, bits) {
  if (!Number.isSafeInteger(W) || W <= 0 || W > bits)
    throw new Error("invalid window size, expected [1.." + bits + "], got W=" + W);
}
function calcWOpts(W, scalarBits) {
  validateW(W, scalarBits);
  const windows = Math.ceil(scalarBits / W) + 1;
  const windowSize = 2 ** (W - 1);
  const maxNumber = 2 ** W;
  const mask = bitMask(W);
  const shiftBy = BigInt(W);
  return { windows, windowSize, mask, maxNumber, shiftBy };
}
function calcOffsets(n, window, wOpts) {
  const { windowSize, mask, maxNumber, shiftBy } = wOpts;
  let wbits = Number(n & mask);
  let nextN = n >> shiftBy;
  if (wbits > windowSize) {
    wbits -= maxNumber;
    nextN += _1n3;
  }
  const offsetStart = window * windowSize;
  const offset = offsetStart + Math.abs(wbits) - 1;
  const isZero = wbits === 0;
  const isNeg = wbits < 0;
  const isNegF = window % 2 !== 0;
  const offsetF = offsetStart;
  return { nextN, offset, isZero, isNeg, isNegF, offsetF };
}
function validateMSMPoints(points, c) {
  if (!Array.isArray(points))
    throw new Error("array expected");
  points.forEach((p, i) => {
    if (!(p instanceof c))
      throw new Error("invalid point at index " + i);
  });
}
function validateMSMScalars(scalars, field) {
  if (!Array.isArray(scalars))
    throw new Error("array of scalars expected");
  scalars.forEach((s, i) => {
    if (!field.isValid(s))
      throw new Error("invalid scalar at index " + i);
  });
}
var pointPrecomputes = /* @__PURE__ */ new WeakMap();
var pointWindowSizes = /* @__PURE__ */ new WeakMap();
function getW(P) {
  return pointWindowSizes.get(P) || 1;
}
function assert0(n) {
  if (n !== _0n3)
    throw new Error("invalid wNAF");
}
var wNAF = class {
  // Parametrized with a given Point class (not individual point)
  constructor(Point, bits) {
    this.BASE = Point.BASE;
    this.ZERO = Point.ZERO;
    this.Fn = Point.Fn;
    this.bits = bits;
  }
  // non-const time multiplication ladder
  _unsafeLadder(elm, n, p = this.ZERO) {
    let d = elm;
    while (n > _0n3) {
      if (n & _1n3)
        p = p.add(d);
      d = d.double();
      n >>= _1n3;
    }
    return p;
  }
  /**
   * Creates a wNAF precomputation window. Used for caching.
   * Default window size is set by `utils.precompute()` and is equal to 8.
   * Number of precomputed points depends on the curve size:
   * 2^(𝑊−1) * (Math.ceil(𝑛 / 𝑊) + 1), where:
   * - 𝑊 is the window size
   * - 𝑛 is the bitlength of the curve order.
   * For a 256-bit curve and window size 8, the number of precomputed points is 128 * 33 = 4224.
   * @param point Point instance
   * @param W window size
   * @returns precomputed point tables flattened to a single array
   */
  precomputeWindow(point, W) {
    const { windows, windowSize } = calcWOpts(W, this.bits);
    const points = [];
    let p = point;
    let base = p;
    for (let window = 0; window < windows; window++) {
      base = p;
      points.push(base);
      for (let i = 1; i < windowSize; i++) {
        base = base.add(p);
        points.push(base);
      }
      p = base.double();
    }
    return points;
  }
  /**
   * Implements ec multiplication using precomputed tables and w-ary non-adjacent form.
   * More compact implementation:
   * https://github.com/paulmillr/noble-secp256k1/blob/47cb1669b6e506ad66b35fe7d76132ae97465da2/index.ts#L502-L541
   * @returns real and fake (for const-time) points
   */
  wNAF(W, precomputes, n) {
    if (!this.Fn.isValid(n))
      throw new Error("invalid scalar");
    let p = this.ZERO;
    let f = this.BASE;
    const wo = calcWOpts(W, this.bits);
    for (let window = 0; window < wo.windows; window++) {
      const { nextN, offset, isZero, isNeg, isNegF, offsetF } = calcOffsets(n, window, wo);
      n = nextN;
      if (isZero) {
        f = f.add(negateCt(isNegF, precomputes[offsetF]));
      } else {
        p = p.add(negateCt(isNeg, precomputes[offset]));
      }
    }
    assert0(n);
    return { p, f };
  }
  /**
   * Implements ec unsafe (non const-time) multiplication using precomputed tables and w-ary non-adjacent form.
   * @param acc accumulator point to add result of multiplication
   * @returns point
   */
  wNAFUnsafe(W, precomputes, n, acc = this.ZERO) {
    const wo = calcWOpts(W, this.bits);
    for (let window = 0; window < wo.windows; window++) {
      if (n === _0n3)
        break;
      const { nextN, offset, isZero, isNeg } = calcOffsets(n, window, wo);
      n = nextN;
      if (isZero) {
        continue;
      } else {
        const item = precomputes[offset];
        acc = acc.add(isNeg ? item.negate() : item);
      }
    }
    assert0(n);
    return acc;
  }
  getPrecomputes(W, point, transform) {
    let comp = pointPrecomputes.get(point);
    if (!comp) {
      comp = this.precomputeWindow(point, W);
      if (W !== 1) {
        if (typeof transform === "function")
          comp = transform(comp);
        pointPrecomputes.set(point, comp);
      }
    }
    return comp;
  }
  cached(point, scalar, transform) {
    const W = getW(point);
    return this.wNAF(W, this.getPrecomputes(W, point, transform), scalar);
  }
  unsafe(point, scalar, transform, prev) {
    const W = getW(point);
    if (W === 1)
      return this._unsafeLadder(point, scalar, prev);
    return this.wNAFUnsafe(W, this.getPrecomputes(W, point, transform), scalar, prev);
  }
  // We calculate precomputes for elliptic curve point multiplication
  // using windowed method. This specifies window size and
  // stores precomputed values. Usually only base point would be precomputed.
  createCache(P, W) {
    validateW(W, this.bits);
    pointWindowSizes.set(P, W);
    pointPrecomputes.delete(P);
  }
  hasCache(elm) {
    return getW(elm) !== 1;
  }
};
function pippenger(c, fieldN, points, scalars) {
  validateMSMPoints(points, c);
  validateMSMScalars(scalars, fieldN);
  const plength = points.length;
  const slength = scalars.length;
  if (plength !== slength)
    throw new Error("arrays of points and scalars must have equal length");
  const zero = c.ZERO;
  const wbits = bitLen(BigInt(plength));
  let windowSize = 1;
  if (wbits > 12)
    windowSize = wbits - 3;
  else if (wbits > 4)
    windowSize = wbits - 2;
  else if (wbits > 0)
    windowSize = 2;
  const MASK = bitMask(windowSize);
  const buckets = new Array(Number(MASK) + 1).fill(zero);
  const lastBits = Math.floor((fieldN.BITS - 1) / windowSize) * windowSize;
  let sum = zero;
  for (let i = lastBits; i >= 0; i -= windowSize) {
    buckets.fill(zero);
    for (let j = 0; j < slength; j++) {
      const scalar = scalars[j];
      const wbits2 = Number(scalar >> BigInt(i) & MASK);
      buckets[wbits2] = buckets[wbits2].add(points[j]);
    }
    let resI = zero;
    for (let j = buckets.length - 1, sumI = zero; j > 0; j--) {
      sumI = sumI.add(buckets[j]);
      resI = resI.add(sumI);
    }
    sum = sum.add(resI);
    if (i !== 0)
      for (let j = 0; j < windowSize; j++)
        sum = sum.double();
  }
  return sum;
}
function createField(order, field, isLE2) {
  if (field) {
    if (field.ORDER !== order)
      throw new Error("Field.ORDER must match order: Fp == p, Fn == n");
    validateField(field);
    return field;
  } else {
    return Field(order, { isLE: isLE2 });
  }
}
function _createCurveFields(type, CURVE, curveOpts = {}, FpFnLE) {
  if (FpFnLE === void 0)
    FpFnLE = type === "edwards";
  if (!CURVE || typeof CURVE !== "object")
    throw new Error(`expected valid ${type} CURVE object`);
  for (const p of ["p", "n", "h"]) {
    const val = CURVE[p];
    if (!(typeof val === "bigint" && val > _0n3))
      throw new Error(`CURVE.${p} must be positive bigint`);
  }
  const Fp2 = createField(CURVE.p, curveOpts.Fp, FpFnLE);
  const Fn2 = createField(CURVE.n, curveOpts.Fn, FpFnLE);
  const _b = type === "weierstrass" ? "b" : "d";
  const params = ["Gx", "Gy", "a", _b];
  for (const p of params) {
    if (!Fp2.isValid(CURVE[p]))
      throw new Error(`CURVE.${p} must be valid field element of CURVE.Fp`);
  }
  CURVE = Object.freeze(Object.assign({}, CURVE));
  return { CURVE, Fp: Fp2, Fn: Fn2 };
}

// node_modules/@noble/curves/esm/abstract/edwards.js
var _0n4 = BigInt(0);
var _1n4 = BigInt(1);
var _2n2 = BigInt(2);
var _8n2 = BigInt(8);
function isEdValidXY(Fp2, CURVE, x, y) {
  const x2 = Fp2.sqr(x);
  const y2 = Fp2.sqr(y);
  const left = Fp2.add(Fp2.mul(CURVE.a, x2), y2);
  const right = Fp2.add(Fp2.ONE, Fp2.mul(CURVE.d, Fp2.mul(x2, y2)));
  return Fp2.eql(left, right);
}
function edwards(params, extraOpts = {}) {
  const validated = _createCurveFields("edwards", params, extraOpts, extraOpts.FpFnLE);
  const { Fp: Fp2, Fn: Fn2 } = validated;
  let CURVE = validated.CURVE;
  const { h: cofactor } = CURVE;
  _validateObject(extraOpts, {}, { uvRatio: "function" });
  const MASK = _2n2 << BigInt(Fn2.BYTES * 8) - _1n4;
  const modP = (n) => Fp2.create(n);
  const uvRatio2 = extraOpts.uvRatio || ((u, v) => {
    try {
      return { isValid: true, value: Fp2.sqrt(Fp2.div(u, v)) };
    } catch (e) {
      return { isValid: false, value: _0n4 };
    }
  });
  if (!isEdValidXY(Fp2, CURVE, CURVE.Gx, CURVE.Gy))
    throw new Error("bad curve params: generator point");
  function acoord(title, n, banZero = false) {
    const min = banZero ? _1n4 : _0n4;
    aInRange("coordinate " + title, n, min, MASK);
    return n;
  }
  function aextpoint(other) {
    if (!(other instanceof Point))
      throw new Error("ExtendedPoint expected");
  }
  const toAffineMemo = memoized((p, iz) => {
    const { X, Y, Z } = p;
    const is0 = p.is0();
    if (iz == null)
      iz = is0 ? _8n2 : Fp2.inv(Z);
    const x = modP(X * iz);
    const y = modP(Y * iz);
    const zz = Fp2.mul(Z, iz);
    if (is0)
      return { x: _0n4, y: _1n4 };
    if (zz !== _1n4)
      throw new Error("invZ was invalid");
    return { x, y };
  });
  const assertValidMemo = memoized((p) => {
    const { a, d } = CURVE;
    if (p.is0())
      throw new Error("bad point: ZERO");
    const { X, Y, Z, T } = p;
    const X2 = modP(X * X);
    const Y2 = modP(Y * Y);
    const Z2 = modP(Z * Z);
    const Z4 = modP(Z2 * Z2);
    const aX2 = modP(X2 * a);
    const left = modP(Z2 * modP(aX2 + Y2));
    const right = modP(Z4 + modP(d * modP(X2 * Y2)));
    if (left !== right)
      throw new Error("bad point: equation left != right (1)");
    const XY = modP(X * Y);
    const ZT = modP(Z * T);
    if (XY !== ZT)
      throw new Error("bad point: equation left != right (2)");
    return true;
  });
  class Point {
    constructor(X, Y, Z, T) {
      this.X = acoord("x", X);
      this.Y = acoord("y", Y);
      this.Z = acoord("z", Z, true);
      this.T = acoord("t", T);
      Object.freeze(this);
    }
    static CURVE() {
      return CURVE;
    }
    static fromAffine(p) {
      if (p instanceof Point)
        throw new Error("extended point not allowed");
      const { x, y } = p || {};
      acoord("x", x);
      acoord("y", y);
      return new Point(x, y, _1n4, modP(x * y));
    }
    // Uses algo from RFC8032 5.1.3.
    static fromBytes(bytes, zip215 = false) {
      const len = Fp2.BYTES;
      const { a, d } = CURVE;
      bytes = copyBytes2(_abytes2(bytes, len, "point"));
      _abool2(zip215, "zip215");
      const normed = copyBytes2(bytes);
      const lastByte = bytes[len - 1];
      normed[len - 1] = lastByte & ~128;
      const y = bytesToNumberLE(normed);
      const max = zip215 ? MASK : Fp2.ORDER;
      aInRange("point.y", y, _0n4, max);
      const y2 = modP(y * y);
      const u = modP(y2 - _1n4);
      const v = modP(d * y2 - a);
      let { isValid, value: x } = uvRatio2(u, v);
      if (!isValid)
        throw new Error("bad point: invalid y coordinate");
      const isXOdd = (x & _1n4) === _1n4;
      const isLastByteOdd = (lastByte & 128) !== 0;
      if (!zip215 && x === _0n4 && isLastByteOdd)
        throw new Error("bad point: x=0 and x_0=1");
      if (isLastByteOdd !== isXOdd)
        x = modP(-x);
      return Point.fromAffine({ x, y });
    }
    static fromHex(bytes, zip215 = false) {
      return Point.fromBytes(ensureBytes("point", bytes), zip215);
    }
    get x() {
      return this.toAffine().x;
    }
    get y() {
      return this.toAffine().y;
    }
    precompute(windowSize = 8, isLazy = true) {
      wnaf.createCache(this, windowSize);
      if (!isLazy)
        this.multiply(_2n2);
      return this;
    }
    // Useful in fromAffine() - not for fromBytes(), which always created valid points.
    assertValidity() {
      assertValidMemo(this);
    }
    // Compare one point to another.
    equals(other) {
      aextpoint(other);
      const { X: X1, Y: Y1, Z: Z1 } = this;
      const { X: X2, Y: Y2, Z: Z2 } = other;
      const X1Z2 = modP(X1 * Z2);
      const X2Z1 = modP(X2 * Z1);
      const Y1Z2 = modP(Y1 * Z2);
      const Y2Z1 = modP(Y2 * Z1);
      return X1Z2 === X2Z1 && Y1Z2 === Y2Z1;
    }
    is0() {
      return this.equals(Point.ZERO);
    }
    negate() {
      return new Point(modP(-this.X), this.Y, this.Z, modP(-this.T));
    }
    // Fast algo for doubling Extended Point.
    // https://hyperelliptic.org/EFD/g1p/auto-twisted-extended.html#doubling-dbl-2008-hwcd
    // Cost: 4M + 4S + 1*a + 6add + 1*2.
    double() {
      const { a } = CURVE;
      const { X: X1, Y: Y1, Z: Z1 } = this;
      const A = modP(X1 * X1);
      const B = modP(Y1 * Y1);
      const C = modP(_2n2 * modP(Z1 * Z1));
      const D = modP(a * A);
      const x1y1 = X1 + Y1;
      const E = modP(modP(x1y1 * x1y1) - A - B);
      const G = D + B;
      const F = G - C;
      const H = D - B;
      const X3 = modP(E * F);
      const Y3 = modP(G * H);
      const T3 = modP(E * H);
      const Z3 = modP(F * G);
      return new Point(X3, Y3, Z3, T3);
    }
    // Fast algo for adding 2 Extended Points.
    // https://hyperelliptic.org/EFD/g1p/auto-twisted-extended.html#addition-add-2008-hwcd
    // Cost: 9M + 1*a + 1*d + 7add.
    add(other) {
      aextpoint(other);
      const { a, d } = CURVE;
      const { X: X1, Y: Y1, Z: Z1, T: T1 } = this;
      const { X: X2, Y: Y2, Z: Z2, T: T2 } = other;
      const A = modP(X1 * X2);
      const B = modP(Y1 * Y2);
      const C = modP(T1 * d * T2);
      const D = modP(Z1 * Z2);
      const E = modP((X1 + Y1) * (X2 + Y2) - A - B);
      const F = D - C;
      const G = D + C;
      const H = modP(B - a * A);
      const X3 = modP(E * F);
      const Y3 = modP(G * H);
      const T3 = modP(E * H);
      const Z3 = modP(F * G);
      return new Point(X3, Y3, Z3, T3);
    }
    subtract(other) {
      return this.add(other.negate());
    }
    // Constant-time multiplication.
    multiply(scalar) {
      if (!Fn2.isValidNot0(scalar))
        throw new Error("invalid scalar: expected 1 <= sc < curve.n");
      const { p, f } = wnaf.cached(this, scalar, (p2) => normalizeZ(Point, p2));
      return normalizeZ(Point, [p, f])[0];
    }
    // Non-constant-time multiplication. Uses double-and-add algorithm.
    // It's faster, but should only be used when you don't care about
    // an exposed private key e.g. sig verification.
    // Does NOT allow scalars higher than CURVE.n.
    // Accepts optional accumulator to merge with multiply (important for sparse scalars)
    multiplyUnsafe(scalar, acc = Point.ZERO) {
      if (!Fn2.isValid(scalar))
        throw new Error("invalid scalar: expected 0 <= sc < curve.n");
      if (scalar === _0n4)
        return Point.ZERO;
      if (this.is0() || scalar === _1n4)
        return this;
      return wnaf.unsafe(this, scalar, (p) => normalizeZ(Point, p), acc);
    }
    // Checks if point is of small order.
    // If you add something to small order point, you will have "dirty"
    // point with torsion component.
    // Multiplies point by cofactor and checks if the result is 0.
    isSmallOrder() {
      return this.multiplyUnsafe(cofactor).is0();
    }
    // Multiplies point by curve order and checks if the result is 0.
    // Returns `false` is the point is dirty.
    isTorsionFree() {
      return wnaf.unsafe(this, CURVE.n).is0();
    }
    // Converts Extended point to default (x, y) coordinates.
    // Can accept precomputed Z^-1 - for example, from invertBatch.
    toAffine(invertedZ) {
      return toAffineMemo(this, invertedZ);
    }
    clearCofactor() {
      if (cofactor === _1n4)
        return this;
      return this.multiplyUnsafe(cofactor);
    }
    toBytes() {
      const { x, y } = this.toAffine();
      const bytes = Fp2.toBytes(y);
      bytes[bytes.length - 1] |= x & _1n4 ? 128 : 0;
      return bytes;
    }
    toHex() {
      return bytesToHex(this.toBytes());
    }
    toString() {
      return `<Point ${this.is0() ? "ZERO" : this.toHex()}>`;
    }
    // TODO: remove
    get ex() {
      return this.X;
    }
    get ey() {
      return this.Y;
    }
    get ez() {
      return this.Z;
    }
    get et() {
      return this.T;
    }
    static normalizeZ(points) {
      return normalizeZ(Point, points);
    }
    static msm(points, scalars) {
      return pippenger(Point, Fn2, points, scalars);
    }
    _setWindowSize(windowSize) {
      this.precompute(windowSize);
    }
    toRawBytes() {
      return this.toBytes();
    }
  }
  Point.BASE = new Point(CURVE.Gx, CURVE.Gy, _1n4, modP(CURVE.Gx * CURVE.Gy));
  Point.ZERO = new Point(_0n4, _1n4, _1n4, _0n4);
  Point.Fp = Fp2;
  Point.Fn = Fn2;
  const wnaf = new wNAF(Point, Fn2.BITS);
  Point.BASE.precompute(8);
  return Point;
}
var PrimeEdwardsPoint = class {
  constructor(ep) {
    this.ep = ep;
  }
  // Static methods that must be implemented by subclasses
  static fromBytes(_bytes) {
    notImplemented();
  }
  static fromHex(_hex) {
    notImplemented();
  }
  get x() {
    return this.toAffine().x;
  }
  get y() {
    return this.toAffine().y;
  }
  // Common implementations
  clearCofactor() {
    return this;
  }
  assertValidity() {
    this.ep.assertValidity();
  }
  toAffine(invertedZ) {
    return this.ep.toAffine(invertedZ);
  }
  toHex() {
    return bytesToHex(this.toBytes());
  }
  toString() {
    return this.toHex();
  }
  isTorsionFree() {
    return true;
  }
  isSmallOrder() {
    return false;
  }
  add(other) {
    this.assertSame(other);
    return this.init(this.ep.add(other.ep));
  }
  subtract(other) {
    this.assertSame(other);
    return this.init(this.ep.subtract(other.ep));
  }
  multiply(scalar) {
    return this.init(this.ep.multiply(scalar));
  }
  multiplyUnsafe(scalar) {
    return this.init(this.ep.multiplyUnsafe(scalar));
  }
  double() {
    return this.init(this.ep.double());
  }
  negate() {
    return this.init(this.ep.negate());
  }
  precompute(windowSize, isLazy) {
    return this.init(this.ep.precompute(windowSize, isLazy));
  }
  /** @deprecated use `toBytes` */
  toRawBytes() {
    return this.toBytes();
  }
};
function eddsa(Point, cHash, eddsaOpts = {}) {
  if (typeof cHash !== "function")
    throw new Error('"hash" function param is required');
  _validateObject(eddsaOpts, {}, {
    adjustScalarBytes: "function",
    randomBytes: "function",
    domain: "function",
    prehash: "function",
    mapToCurve: "function"
  });
  const { prehash } = eddsaOpts;
  const { BASE, Fp: Fp2, Fn: Fn2 } = Point;
  const randomBytes2 = eddsaOpts.randomBytes || randomBytes;
  const adjustScalarBytes2 = eddsaOpts.adjustScalarBytes || ((bytes) => bytes);
  const domain = eddsaOpts.domain || ((data, ctx, phflag) => {
    _abool2(phflag, "phflag");
    if (ctx.length || phflag)
      throw new Error("Contexts/pre-hash are not supported");
    return data;
  });
  function modN_LE(hash) {
    return Fn2.create(bytesToNumberLE(hash));
  }
  function getPrivateScalar(key) {
    const len = lengths.secretKey;
    key = ensureBytes("private key", key, len);
    const hashed = ensureBytes("hashed private key", cHash(key), 2 * len);
    const head = adjustScalarBytes2(hashed.slice(0, len));
    const prefix = hashed.slice(len, 2 * len);
    const scalar = modN_LE(head);
    return { head, prefix, scalar };
  }
  function getExtendedPublicKey(secretKey) {
    const { head, prefix, scalar } = getPrivateScalar(secretKey);
    const point = BASE.multiply(scalar);
    const pointBytes = point.toBytes();
    return { head, prefix, scalar, point, pointBytes };
  }
  function getPublicKey(secretKey) {
    return getExtendedPublicKey(secretKey).pointBytes;
  }
  function hashDomainToScalar(context = Uint8Array.of(), ...msgs) {
    const msg = concatBytes2(...msgs);
    return modN_LE(cHash(domain(msg, ensureBytes("context", context), !!prehash)));
  }
  function sign(msg, secretKey, options = {}) {
    msg = ensureBytes("message", msg);
    if (prehash)
      msg = prehash(msg);
    const { prefix, scalar, pointBytes } = getExtendedPublicKey(secretKey);
    const r = hashDomainToScalar(options.context, prefix, msg);
    const R = BASE.multiply(r).toBytes();
    const k = hashDomainToScalar(options.context, R, pointBytes, msg);
    const s = Fn2.create(r + k * scalar);
    if (!Fn2.isValid(s))
      throw new Error("sign failed: invalid s");
    const rs = concatBytes2(R, Fn2.toBytes(s));
    return _abytes2(rs, lengths.signature, "result");
  }
  const verifyOpts = { zip215: true };
  function verify(sig, msg, publicKey, options = verifyOpts) {
    const { context, zip215 } = options;
    const len = lengths.signature;
    sig = ensureBytes("signature", sig, len);
    msg = ensureBytes("message", msg);
    publicKey = ensureBytes("publicKey", publicKey, lengths.publicKey);
    if (zip215 !== void 0)
      _abool2(zip215, "zip215");
    if (prehash)
      msg = prehash(msg);
    const mid = len / 2;
    const r = sig.subarray(0, mid);
    const s = bytesToNumberLE(sig.subarray(mid, len));
    let A, R, SB;
    try {
      A = Point.fromBytes(publicKey, zip215);
      R = Point.fromBytes(r, zip215);
      SB = BASE.multiplyUnsafe(s);
    } catch (error) {
      return false;
    }
    if (!zip215 && A.isSmallOrder())
      return false;
    const k = hashDomainToScalar(context, R.toBytes(), A.toBytes(), msg);
    const RkA = R.add(A.multiplyUnsafe(k));
    return RkA.subtract(SB).clearCofactor().is0();
  }
  const _size = Fp2.BYTES;
  const lengths = {
    secretKey: _size,
    publicKey: _size,
    signature: 2 * _size,
    seed: _size
  };
  function randomSecretKey(seed = randomBytes2(lengths.seed)) {
    return _abytes2(seed, lengths.seed, "seed");
  }
  function keygen(seed) {
    const secretKey = utils.randomSecretKey(seed);
    return { secretKey, publicKey: getPublicKey(secretKey) };
  }
  function isValidSecretKey(key) {
    return isBytes2(key) && key.length === Fn2.BYTES;
  }
  function isValidPublicKey(key, zip215) {
    try {
      return !!Point.fromBytes(key, zip215);
    } catch (error) {
      return false;
    }
  }
  const utils = {
    getExtendedPublicKey,
    randomSecretKey,
    isValidSecretKey,
    isValidPublicKey,
    /**
     * Converts ed public key to x public key. Uses formula:
     * - ed25519:
     *   - `(u, v) = ((1+y)/(1-y), sqrt(-486664)*u/x)`
     *   - `(x, y) = (sqrt(-486664)*u/v, (u-1)/(u+1))`
     * - ed448:
     *   - `(u, v) = ((y-1)/(y+1), sqrt(156324)*u/x)`
     *   - `(x, y) = (sqrt(156324)*u/v, (1+u)/(1-u))`
     */
    toMontgomery(publicKey) {
      const { y } = Point.fromBytes(publicKey);
      const size = lengths.publicKey;
      const is25519 = size === 32;
      if (!is25519 && size !== 57)
        throw new Error("only defined for 25519 and 448");
      const u = is25519 ? Fp2.div(_1n4 + y, _1n4 - y) : Fp2.div(y - _1n4, y + _1n4);
      return Fp2.toBytes(u);
    },
    toMontgomerySecret(secretKey) {
      const size = lengths.secretKey;
      _abytes2(secretKey, size);
      const hashed = cHash(secretKey.subarray(0, size));
      return adjustScalarBytes2(hashed).subarray(0, size);
    },
    /** @deprecated */
    randomPrivateKey: randomSecretKey,
    /** @deprecated */
    precompute(windowSize = 8, point = Point.BASE) {
      return point.precompute(windowSize, false);
    }
  };
  return Object.freeze({
    keygen,
    getPublicKey,
    sign,
    verify,
    utils,
    Point,
    lengths
  });
}
function _eddsa_legacy_opts_to_new(c) {
  const CURVE = {
    a: c.a,
    d: c.d,
    p: c.Fp.ORDER,
    n: c.n,
    h: c.h,
    Gx: c.Gx,
    Gy: c.Gy
  };
  const Fp2 = c.Fp;
  const Fn2 = Field(CURVE.n, c.nBitLength, true);
  const curveOpts = { Fp: Fp2, Fn: Fn2, uvRatio: c.uvRatio };
  const eddsaOpts = {
    randomBytes: c.randomBytes,
    adjustScalarBytes: c.adjustScalarBytes,
    domain: c.domain,
    prehash: c.prehash,
    mapToCurve: c.mapToCurve
  };
  return { CURVE, curveOpts, hash: c.hash, eddsaOpts };
}
function _eddsa_new_output_to_legacy(c, eddsa2) {
  const Point = eddsa2.Point;
  const legacy = Object.assign({}, eddsa2, {
    ExtendedPoint: Point,
    CURVE: c,
    nBitLength: Point.Fn.BITS,
    nByteLength: Point.Fn.BYTES
  });
  return legacy;
}
function twistedEdwards(c) {
  const { CURVE, curveOpts, hash, eddsaOpts } = _eddsa_legacy_opts_to_new(c);
  const Point = edwards(CURVE, curveOpts);
  const EDDSA = eddsa(Point, hash, eddsaOpts);
  return _eddsa_new_output_to_legacy(c, EDDSA);
}

// node_modules/@noble/curves/esm/abstract/montgomery.js
var _0n5 = BigInt(0);
var _1n5 = BigInt(1);
var _2n3 = BigInt(2);
function validateOpts(curve) {
  _validateObject(curve, {
    adjustScalarBytes: "function",
    powPminus2: "function"
  });
  return Object.freeze({ ...curve });
}
function montgomery(curveDef) {
  const CURVE = validateOpts(curveDef);
  const { P, type, adjustScalarBytes: adjustScalarBytes2, powPminus2, randomBytes: rand } = CURVE;
  const is25519 = type === "x25519";
  if (!is25519 && type !== "x448")
    throw new Error("invalid type");
  const randomBytes_ = rand || randomBytes;
  const montgomeryBits = is25519 ? 255 : 448;
  const fieldLen = is25519 ? 32 : 56;
  const Gu = is25519 ? BigInt(9) : BigInt(5);
  const a24 = is25519 ? BigInt(121665) : BigInt(39081);
  const minScalar = is25519 ? _2n3 ** BigInt(254) : _2n3 ** BigInt(447);
  const maxAdded = is25519 ? BigInt(8) * _2n3 ** BigInt(251) - _1n5 : BigInt(4) * _2n3 ** BigInt(445) - _1n5;
  const maxScalar = minScalar + maxAdded + _1n5;
  const modP = (n) => mod(n, P);
  const GuBytes = encodeU(Gu);
  function encodeU(u) {
    return numberToBytesLE(modP(u), fieldLen);
  }
  function decodeU(u) {
    const _u = ensureBytes("u coordinate", u, fieldLen);
    if (is25519)
      _u[31] &= 127;
    return modP(bytesToNumberLE(_u));
  }
  function decodeScalar(scalar) {
    return bytesToNumberLE(adjustScalarBytes2(ensureBytes("scalar", scalar, fieldLen)));
  }
  function scalarMult(scalar, u) {
    const pu = montgomeryLadder(decodeU(u), decodeScalar(scalar));
    if (pu === _0n5)
      throw new Error("invalid private or public key received");
    return encodeU(pu);
  }
  function scalarMultBase(scalar) {
    return scalarMult(scalar, GuBytes);
  }
  function cswap(swap, x_2, x_3) {
    const dummy = modP(swap * (x_2 - x_3));
    x_2 = modP(x_2 - dummy);
    x_3 = modP(x_3 + dummy);
    return { x_2, x_3 };
  }
  function montgomeryLadder(u, scalar) {
    aInRange("u", u, _0n5, P);
    aInRange("scalar", scalar, minScalar, maxScalar);
    const k = scalar;
    const x_1 = u;
    let x_2 = _1n5;
    let z_2 = _0n5;
    let x_3 = u;
    let z_3 = _1n5;
    let swap = _0n5;
    for (let t = BigInt(montgomeryBits - 1); t >= _0n5; t--) {
      const k_t = k >> t & _1n5;
      swap ^= k_t;
      ({ x_2, x_3 } = cswap(swap, x_2, x_3));
      ({ x_2: z_2, x_3: z_3 } = cswap(swap, z_2, z_3));
      swap = k_t;
      const A = x_2 + z_2;
      const AA = modP(A * A);
      const B = x_2 - z_2;
      const BB = modP(B * B);
      const E = AA - BB;
      const C = x_3 + z_3;
      const D = x_3 - z_3;
      const DA = modP(D * A);
      const CB = modP(C * B);
      const dacb = DA + CB;
      const da_cb = DA - CB;
      x_3 = modP(dacb * dacb);
      z_3 = modP(x_1 * modP(da_cb * da_cb));
      x_2 = modP(AA * BB);
      z_2 = modP(E * (AA + modP(a24 * E)));
    }
    ({ x_2, x_3 } = cswap(swap, x_2, x_3));
    ({ x_2: z_2, x_3: z_3 } = cswap(swap, z_2, z_3));
    const z2 = powPminus2(z_2);
    return modP(x_2 * z2);
  }
  const lengths = {
    secretKey: fieldLen,
    publicKey: fieldLen,
    seed: fieldLen
  };
  const randomSecretKey = (seed = randomBytes_(fieldLen)) => {
    abytes2(seed, lengths.seed);
    return seed;
  };
  function keygen(seed) {
    const secretKey = randomSecretKey(seed);
    return { secretKey, publicKey: scalarMultBase(secretKey) };
  }
  const utils = {
    randomSecretKey,
    randomPrivateKey: randomSecretKey
  };
  return {
    keygen,
    getSharedSecret: (secretKey, publicKey) => scalarMult(secretKey, publicKey),
    getPublicKey: (secretKey) => scalarMultBase(secretKey),
    scalarMult,
    scalarMultBase,
    utils,
    GuBytes: GuBytes.slice(),
    lengths
  };
}

// node_modules/@noble/curves/esm/ed25519.js
var _0n6 = /* @__PURE__ */ BigInt(0);
var _1n6 = BigInt(1);
var _2n4 = BigInt(2);
var _3n2 = BigInt(3);
var _5n2 = BigInt(5);
var _8n3 = BigInt(8);
var ed25519_CURVE_p = BigInt("0x7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffed");
var ed25519_CURVE = /* @__PURE__ */ (() => ({
  p: ed25519_CURVE_p,
  n: BigInt("0x1000000000000000000000000000000014def9dea2f79cd65812631a5cf5d3ed"),
  h: _8n3,
  a: BigInt("0x7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffec"),
  d: BigInt("0x52036cee2b6ffe738cc740797779e89800700a4d4141d8ab75eb4dca135978a3"),
  Gx: BigInt("0x216936d3cd6e53fec0a4e231fdd6dc5c692cc7609525a7b2c9562d608f25d51a"),
  Gy: BigInt("0x6666666666666666666666666666666666666666666666666666666666666658")
}))();
function ed25519_pow_2_252_3(x) {
  const _10n = BigInt(10), _20n = BigInt(20), _40n = BigInt(40), _80n = BigInt(80);
  const P = ed25519_CURVE_p;
  const x2 = x * x % P;
  const b2 = x2 * x % P;
  const b4 = pow2(b2, _2n4, P) * b2 % P;
  const b5 = pow2(b4, _1n6, P) * x % P;
  const b10 = pow2(b5, _5n2, P) * b5 % P;
  const b20 = pow2(b10, _10n, P) * b10 % P;
  const b40 = pow2(b20, _20n, P) * b20 % P;
  const b80 = pow2(b40, _40n, P) * b40 % P;
  const b160 = pow2(b80, _80n, P) * b80 % P;
  const b240 = pow2(b160, _80n, P) * b80 % P;
  const b250 = pow2(b240, _10n, P) * b10 % P;
  const pow_p_5_8 = pow2(b250, _2n4, P) * x % P;
  return { pow_p_5_8, b2 };
}
function adjustScalarBytes(bytes) {
  bytes[0] &= 248;
  bytes[31] &= 127;
  bytes[31] |= 64;
  return bytes;
}
var ED25519_SQRT_M1 = /* @__PURE__ */ BigInt("19681161376707505956807079304988542015446066515923890162744021073123829784752");
function uvRatio(u, v) {
  const P = ed25519_CURVE_p;
  const v3 = mod(v * v * v, P);
  const v7 = mod(v3 * v3 * v, P);
  const pow = ed25519_pow_2_252_3(u * v7).pow_p_5_8;
  let x = mod(u * v3 * pow, P);
  const vx2 = mod(v * x * x, P);
  const root1 = x;
  const root2 = mod(x * ED25519_SQRT_M1, P);
  const useRoot1 = vx2 === u;
  const useRoot2 = vx2 === mod(-u, P);
  const noRoot = vx2 === mod(-u * ED25519_SQRT_M1, P);
  if (useRoot1)
    x = root1;
  if (useRoot2 || noRoot)
    x = root2;
  if (isNegativeLE(x, P))
    x = mod(-x, P);
  return { isValid: useRoot1 || useRoot2, value: x };
}
var Fp = /* @__PURE__ */ (() => Field(ed25519_CURVE.p, { isLE: true }))();
var Fn = /* @__PURE__ */ (() => Field(ed25519_CURVE.n, { isLE: true }))();
var ed25519Defaults = /* @__PURE__ */ (() => ({
  ...ed25519_CURVE,
  Fp,
  hash: sha512,
  adjustScalarBytes,
  // dom2
  // Ratio of u to v. Allows us to combine inversion and square root. Uses algo from RFC8032 5.1.3.
  // Constant-time, u/√v
  uvRatio
}))();
var ed25519 = /* @__PURE__ */ (() => twistedEdwards(ed25519Defaults))();
var x25519 = /* @__PURE__ */ (() => {
  const P = Fp.ORDER;
  return montgomery({
    P,
    type: "x25519",
    powPminus2: (x) => {
      const { pow_p_5_8, b2 } = ed25519_pow_2_252_3(x);
      return mod(pow2(pow_p_5_8, _3n2, P) * b2, P);
    },
    adjustScalarBytes
  });
})();
var SQRT_M1 = ED25519_SQRT_M1;
var SQRT_AD_MINUS_ONE = /* @__PURE__ */ BigInt("25063068953384623474111414158702152701244531502492656460079210482610430750235");
var INVSQRT_A_MINUS_D = /* @__PURE__ */ BigInt("54469307008909316920995813868745141605393597292927456921205312896311721017578");
var ONE_MINUS_D_SQ = /* @__PURE__ */ BigInt("1159843021668779879193775521855586647937357759715417654439879720876111806838");
var D_MINUS_ONE_SQ = /* @__PURE__ */ BigInt("40440834346308536858101042469323190826248399146238708352240133220865137265952");
var invertSqrt = (number) => uvRatio(_1n6, number);
var MAX_255B = /* @__PURE__ */ BigInt("0x7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");
var bytes255ToNumberLE = (bytes) => ed25519.Point.Fp.create(bytesToNumberLE(bytes) & MAX_255B);
function calcElligatorRistrettoMap(r0) {
  const { d } = ed25519_CURVE;
  const P = ed25519_CURVE_p;
  const mod2 = (n) => Fp.create(n);
  const r = mod2(SQRT_M1 * r0 * r0);
  const Ns = mod2((r + _1n6) * ONE_MINUS_D_SQ);
  let c = BigInt(-1);
  const D = mod2((c - d * r) * mod2(r + d));
  let { isValid: Ns_D_is_sq, value: s } = uvRatio(Ns, D);
  let s_ = mod2(s * r0);
  if (!isNegativeLE(s_, P))
    s_ = mod2(-s_);
  if (!Ns_D_is_sq)
    s = s_;
  if (!Ns_D_is_sq)
    c = r;
  const Nt = mod2(c * (r - _1n6) * D_MINUS_ONE_SQ - D);
  const s2 = s * s;
  const W0 = mod2((s + s) * D);
  const W1 = mod2(Nt * SQRT_AD_MINUS_ONE);
  const W2 = mod2(_1n6 - s2);
  const W3 = mod2(_1n6 + s2);
  return new ed25519.Point(mod2(W0 * W3), mod2(W2 * W1), mod2(W1 * W3), mod2(W0 * W2));
}
function ristretto255_map(bytes) {
  abytes2(bytes, 64);
  const r1 = bytes255ToNumberLE(bytes.subarray(0, 32));
  const R1 = calcElligatorRistrettoMap(r1);
  const r2 = bytes255ToNumberLE(bytes.subarray(32, 64));
  const R2 = calcElligatorRistrettoMap(r2);
  return new _RistrettoPoint(R1.add(R2));
}
var _RistrettoPoint = class __RistrettoPoint extends PrimeEdwardsPoint {
  constructor(ep) {
    super(ep);
  }
  static fromAffine(ap) {
    return new __RistrettoPoint(ed25519.Point.fromAffine(ap));
  }
  assertSame(other) {
    if (!(other instanceof __RistrettoPoint))
      throw new Error("RistrettoPoint expected");
  }
  init(ep) {
    return new __RistrettoPoint(ep);
  }
  /** @deprecated use `import { ristretto255_hasher } from '@noble/curves/ed25519.js';` */
  static hashToCurve(hex) {
    return ristretto255_map(ensureBytes("ristrettoHash", hex, 64));
  }
  static fromBytes(bytes) {
    abytes2(bytes, 32);
    const { a, d } = ed25519_CURVE;
    const P = ed25519_CURVE_p;
    const mod2 = (n) => Fp.create(n);
    const s = bytes255ToNumberLE(bytes);
    if (!equalBytes2(Fp.toBytes(s), bytes) || isNegativeLE(s, P))
      throw new Error("invalid ristretto255 encoding 1");
    const s2 = mod2(s * s);
    const u1 = mod2(_1n6 + a * s2);
    const u2 = mod2(_1n6 - a * s2);
    const u1_2 = mod2(u1 * u1);
    const u2_2 = mod2(u2 * u2);
    const v = mod2(a * d * u1_2 - u2_2);
    const { isValid, value: I } = invertSqrt(mod2(v * u2_2));
    const Dx = mod2(I * u2);
    const Dy = mod2(I * Dx * v);
    let x = mod2((s + s) * Dx);
    if (isNegativeLE(x, P))
      x = mod2(-x);
    const y = mod2(u1 * Dy);
    const t = mod2(x * y);
    if (!isValid || isNegativeLE(t, P) || y === _0n6)
      throw new Error("invalid ristretto255 encoding 2");
    return new __RistrettoPoint(new ed25519.Point(x, y, _1n6, t));
  }
  /**
   * Converts ristretto-encoded string to ristretto point.
   * Described in [RFC9496](https://www.rfc-editor.org/rfc/rfc9496#name-decode).
   * @param hex Ristretto-encoded 32 bytes. Not every 32-byte string is valid ristretto encoding
   */
  static fromHex(hex) {
    return __RistrettoPoint.fromBytes(ensureBytes("ristrettoHex", hex, 32));
  }
  static msm(points, scalars) {
    return pippenger(__RistrettoPoint, ed25519.Point.Fn, points, scalars);
  }
  /**
   * Encodes ristretto point to Uint8Array.
   * Described in [RFC9496](https://www.rfc-editor.org/rfc/rfc9496#name-encode).
   */
  toBytes() {
    let { X, Y, Z, T } = this.ep;
    const P = ed25519_CURVE_p;
    const mod2 = (n) => Fp.create(n);
    const u1 = mod2(mod2(Z + Y) * mod2(Z - Y));
    const u2 = mod2(X * Y);
    const u2sq = mod2(u2 * u2);
    const { value: invsqrt } = invertSqrt(mod2(u1 * u2sq));
    const D1 = mod2(invsqrt * u1);
    const D2 = mod2(invsqrt * u2);
    const zInv = mod2(D1 * D2 * T);
    let D;
    if (isNegativeLE(T * zInv, P)) {
      let _x = mod2(Y * SQRT_M1);
      let _y = mod2(X * SQRT_M1);
      X = _x;
      Y = _y;
      D = mod2(D1 * INVSQRT_A_MINUS_D);
    } else {
      D = D2;
    }
    if (isNegativeLE(X * zInv, P))
      Y = mod2(-Y);
    let s = mod2((Z - Y) * D);
    if (isNegativeLE(s, P))
      s = mod2(-s);
    return Fp.toBytes(s);
  }
  /**
   * Compares two Ristretto points.
   * Described in [RFC9496](https://www.rfc-editor.org/rfc/rfc9496#name-equals).
   */
  equals(other) {
    this.assertSame(other);
    const { X: X1, Y: Y1 } = this.ep;
    const { X: X2, Y: Y2 } = other.ep;
    const mod2 = (n) => Fp.create(n);
    const one = mod2(X1 * Y2) === mod2(Y1 * X2);
    const two = mod2(Y1 * Y2) === mod2(X1 * X2);
    return one || two;
  }
  is0() {
    return this.equals(__RistrettoPoint.ZERO);
  }
};
_RistrettoPoint.BASE = /* @__PURE__ */ (() => new _RistrettoPoint(ed25519.Point.BASE))();
_RistrettoPoint.ZERO = /* @__PURE__ */ (() => new _RistrettoPoint(ed25519.Point.ZERO))();
_RistrettoPoint.Fp = /* @__PURE__ */ (() => Fp)();
_RistrettoPoint.Fn = /* @__PURE__ */ (() => Fn)();

// node_modules/@noble/hashes/esm/hmac.js
var HMAC = class extends Hash {
  constructor(hash, _key) {
    super();
    this.finished = false;
    this.destroyed = false;
    ahash(hash);
    const key = toBytes(_key);
    this.iHash = hash.create();
    if (typeof this.iHash.update !== "function")
      throw new Error("Expected instance of class which extends utils.Hash");
    this.blockLen = this.iHash.blockLen;
    this.outputLen = this.iHash.outputLen;
    const blockLen = this.blockLen;
    const pad = new Uint8Array(blockLen);
    pad.set(key.length > blockLen ? hash.create().update(key).digest() : key);
    for (let i = 0; i < pad.length; i++)
      pad[i] ^= 54;
    this.iHash.update(pad);
    this.oHash = hash.create();
    for (let i = 0; i < pad.length; i++)
      pad[i] ^= 54 ^ 92;
    this.oHash.update(pad);
    clean2(pad);
  }
  update(buf) {
    aexists(this);
    this.iHash.update(buf);
    return this;
  }
  digestInto(out) {
    aexists(this);
    abytes2(out, this.outputLen);
    this.finished = true;
    this.iHash.digestInto(out);
    this.oHash.update(out);
    this.oHash.digestInto(out);
    this.destroy();
  }
  digest() {
    const out = new Uint8Array(this.oHash.outputLen);
    this.digestInto(out);
    return out;
  }
  _cloneInto(to) {
    to || (to = Object.create(Object.getPrototypeOf(this), {}));
    const { oHash, iHash, finished, destroyed, blockLen, outputLen } = this;
    to = to;
    to.finished = finished;
    to.destroyed = destroyed;
    to.blockLen = blockLen;
    to.outputLen = outputLen;
    to.oHash = oHash._cloneInto(to.oHash);
    to.iHash = iHash._cloneInto(to.iHash);
    return to;
  }
  clone() {
    return this._cloneInto();
  }
  destroy() {
    this.destroyed = true;
    this.oHash.destroy();
    this.iHash.destroy();
  }
};
var hmac = (hash, key, message) => new HMAC(hash, key).update(message).digest();
hmac.create = (hash, key) => new HMAC(hash, key);

// node_modules/@noble/hashes/esm/hkdf.js
function extract(hash, ikm, salt) {
  ahash(hash);
  if (salt === void 0)
    salt = new Uint8Array(hash.outputLen);
  return hmac(hash, toBytes(salt), toBytes(ikm));
}
var HKDF_COUNTER = /* @__PURE__ */ Uint8Array.from([0]);
var EMPTY_BUFFER = /* @__PURE__ */ Uint8Array.of();
function expand(hash, prk, info, length = 32) {
  ahash(hash);
  anumber(length);
  const olen = hash.outputLen;
  if (length > 255 * olen)
    throw new Error("Length should be <= 255*HashLen");
  const blocks = Math.ceil(length / olen);
  if (info === void 0)
    info = EMPTY_BUFFER;
  const okm = new Uint8Array(blocks * olen);
  const HMAC2 = hmac.create(hash, prk);
  const HMACTmp = HMAC2._cloneInto();
  const T = new Uint8Array(HMAC2.outputLen);
  for (let counter = 0; counter < blocks; counter++) {
    HKDF_COUNTER[0] = counter + 1;
    HMACTmp.update(counter === 0 ? EMPTY_BUFFER : T).update(info).update(HKDF_COUNTER).digestInto(T);
    okm.set(T, olen * counter);
    HMAC2._cloneInto(HMACTmp);
  }
  HMAC2.destroy();
  HMACTmp.destroy();
  clean2(T, HKDF_COUNTER);
  return okm.slice(0, length);
}
var hkdf = (hash, ikm, salt, info, length) => expand(hash, extract(hash, ikm, salt), info, length);

// node_modules/@noble/hashes/esm/sha256.js
var sha2562 = sha256;

// node_modules/@noble/hashes/esm/sha512.js
var sha5122 = sha512;

// packages/reticulum-ts/dist/crypto/pure.js
var PureCryptoProvider = class {
  name = "pure";
  randomBytes(length) {
    return randomBytes(length);
  }
  sha256(data) {
    return sha2562(data);
  }
  sha512(data) {
    return sha5122(data);
  }
  hmacSha256(key, data) {
    return hmac(sha2562, key, data);
  }
  hkdf(input) {
    if (input.hash !== "sha256") {
      throw new Error(`Unsupported HKDF hash: ${input.hash}`);
    }
    return hkdf(sha2562, input.keyMaterial, input.salt, input.info, input.length);
  }
  x25519PublicFromPrivate(privateKey) {
    return x25519.getPublicKey(privateKey);
  }
  x25519SharedSecret(privateKey, publicKey) {
    return x25519.getSharedSecret(privateKey, publicKey);
  }
  ed25519PublicFromPrivate(privateKey) {
    return ed25519.getPublicKey(privateKey);
  }
  ed25519Sign(privateKey, message) {
    return ed25519.sign(message, privateKey);
  }
  ed25519Verify(publicKey, message, signature) {
    return ed25519.verify(signature, message, publicKey);
  }
  aes128CbcEncrypt(plaintext, key, iv) {
    return cbc(key, iv, { disablePadding: true }).encrypt(plaintext);
  }
  aes128CbcDecrypt(ciphertext, key, iv) {
    return cbc(key, iv, { disablePadding: true }).decrypt(ciphertext);
  }
  aes256CbcEncrypt(plaintext, key, iv) {
    return cbc(key, iv, { disablePadding: true }).encrypt(plaintext);
  }
  aes256CbcDecrypt(ciphertext, key, iv) {
    return cbc(key, iv, { disablePadding: true }).decrypt(ciphertext);
  }
};

// packages/reticulum-ts/dist/runtime/web/runtime.js
var WebTimer = class {
  id;
  constructor(id) {
    this.id = id;
  }
  cancel() {
    clearTimeout(this.id);
  }
};
var WebClock = class {
  now() {
    return Date.now();
  }
  setTimeout(callback, milliseconds) {
    return new WebTimer(setTimeout(callback, milliseconds));
  }
};
var IndexedDbKeyValueStore = class {
  storeName;
  ready;
  constructor(indexedDB, storeName) {
    this.storeName = storeName;
    this.ready = new Promise((resolve, reject) => {
      const request = indexedDB.open(storeName, 1);
      request.onupgradeneeded = (event) => {
        event.target?.result.createObjectStore("kv");
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error(`Failed to open IndexedDB store ${storeName}`));
    });
  }
  async get(key) {
    const result = await this.request((store) => store.get(key), "readonly");
    if (result === void 0) {
      return void 0;
    }
    return result instanceof Uint8Array ? Uint8Array.from(result) : new Uint8Array(result);
  }
  async set(key, value) {
    await this.request((store) => store.put(Uint8Array.from(value), key), "readwrite");
  }
  async delete(key) {
    await this.request((store) => store.delete(key), "readwrite");
  }
  async request(makeRequest, mode) {
    const database = await this.ready;
    const request = makeRequest(database.transaction("kv", mode).objectStore("kv"));
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed"));
    });
  }
};
var UnsupportedTcpFactory = class {
  async connect(_options) {
    throw new Error("TCP is unavailable in the web runtime; use WebSocketClientInterface");
  }
  async listen(_options) {
    throw new Error("TCP listen is unavailable in the web runtime");
  }
};
var UnsupportedUdpFactory = class {
  async bind(_host, _port) {
    throw new Error("UDP is unavailable in the web runtime");
  }
};
function webRuntime(options = {}) {
  const indexedDB = options.indexedDB ?? globalThis.indexedDB;
  if (indexedDB === void 0) {
    throw new Error("IndexedDB is required for the web runtime store");
  }
  return {
    clock: new WebClock(),
    store: new IndexedDbKeyValueStore(indexedDB, options.storeName ?? "twistedpear-reticulum"),
    tcp: new UnsupportedTcpFactory(),
    udp: new UnsupportedUdpFactory()
  };
}

// packages/reticulum-ts/dist/crypto/bytes.js
function bytesToHex2(bytes) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}
function hexToBytes2(hex) {
  if (hex.length % 2 !== 0) {
    throw new Error("Hex strings must contain an even number of characters");
  }
  const output = new Uint8Array(hex.length / 2);
  for (let index = 0; index < output.length; index += 1) {
    output[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  }
  return output;
}
function equalBytes3(left, right) {
  if (left.length !== right.length) {
    return false;
  }
  let diff = 0;
  for (let index = 0; index < left.length; index += 1) {
    diff |= left[index] ^ right[index];
  }
  return diff === 0;
}

// packages/reticulum-ts/dist/crypto/hkdf.js
function rnsHkdf(provider, length, deriveFrom, salt, context) {
  if (length < 1) {
    throw new Error("Invalid output key length");
  }
  if (deriveFrom.length === 0) {
    throw new Error("Cannot derive key from empty input material");
  }
  const effectiveSalt = salt === null || salt === void 0 || salt.length === 0 ? new Uint8Array(32) : salt;
  const effectiveContext = context ?? new Uint8Array(0);
  return provider.hkdf({
    hash: "sha256",
    keyMaterial: deriveFrom,
    salt: effectiveSalt,
    info: effectiveContext,
    length
  });
}

// packages/reticulum-ts/dist/crypto/pkcs7.js
var BLOCK_SIZE2 = 16;
function pkcs7Pad(data, blockSize = BLOCK_SIZE2) {
  const remainder = data.length % blockSize;
  const paddingLength = blockSize - remainder;
  const padded = new Uint8Array(data.length + paddingLength);
  padded.set(data);
  padded.fill(paddingLength, data.length);
  return padded;
}
function pkcs7Unpad(data, blockSize = BLOCK_SIZE2) {
  if (data.length === 0) {
    throw new Error("Cannot unpad empty data");
  }
  const paddingLength = data[data.length - 1];
  if (paddingLength > blockSize || paddingLength === 0) {
    throw new Error(`Cannot unpad, invalid padding length of ${paddingLength} bytes`);
  }
  return data.subarray(0, data.length - paddingLength);
}

// packages/reticulum-ts/dist/crypto/token.js
var Token = class {
  provider;
  mode;
  signingKey;
  encryptionKey;
  constructor(provider, key) {
    this.provider = provider;
    if (key.length === 32) {
      this.mode = "aes128";
      this.signingKey = key.subarray(0, 16);
      this.encryptionKey = key.subarray(16, 32);
    } else if (key.length === 64) {
      this.mode = "aes256";
      this.signingKey = key.subarray(0, 32);
      this.encryptionKey = key.subarray(32, 64);
    } else {
      throw new Error(`Token key must be 32 or 64 bytes, not ${key.length}`);
    }
  }
  static generateKey(provider) {
    return provider.randomBytes(32);
  }
  verifyHmac(token) {
    if (token.length <= 32) {
      throw new Error(`Cannot verify HMAC on token of only ${token.length} bytes`);
    }
    const receivedHmac = token.subarray(token.length - 32);
    const expectedHmac = this.provider.hmacSha256(this.signingKey, token.subarray(0, token.length - 32));
    if (receivedHmac.length !== expectedHmac.length) {
      return false;
    }
    let mismatch = 0;
    for (let index = 0; index < receivedHmac.length; index += 1) {
      mismatch |= (receivedHmac[index] ?? 0) ^ (expectedHmac[index] ?? 0);
    }
    return mismatch === 0;
  }
  encrypt(data, options = {}) {
    if (!(data instanceof Uint8Array)) {
      throw new TypeError("Token plaintext input must be bytes");
    }
    const iv = options.iv ?? this.provider.randomBytes(16);
    if (iv.length !== 16) {
      throw new Error("Token IV must be 16 bytes");
    }
    const ciphertext = this.mode === "aes256" ? this.provider.aes256CbcEncrypt(pkcs7Pad(data), this.encryptionKey, iv) : this.provider.aes128CbcEncrypt(pkcs7Pad(data), this.encryptionKey, iv);
    const signedParts = concatBytes3(iv, ciphertext);
    const hmac2 = this.provider.hmacSha256(this.signingKey, signedParts);
    return concatBytes3(signedParts, hmac2);
  }
  decrypt(token) {
    if (!(token instanceof Uint8Array)) {
      throw new TypeError("Token must be bytes");
    }
    if (!this.verifyHmac(token)) {
      throw new Error("Token HMAC was invalid");
    }
    const iv = token.subarray(0, 16);
    const ciphertext = token.subarray(16, token.length - 32);
    try {
      const decrypted = this.mode === "aes256" ? this.provider.aes256CbcDecrypt(ciphertext, this.encryptionKey, iv) : this.provider.aes128CbcDecrypt(ciphertext, this.encryptionKey, iv);
      const plaintext = pkcs7Unpad(decrypted);
      return plaintext;
    } catch {
      throw new Error("Could not decrypt token");
    }
  }
};
function concatBytes3(...parts) {
  const length = parts.reduce((total, part) => total + part.length, 0);
  const output = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }
  return output;
}

// packages/reticulum-ts/dist/identity.js
var IDENTITY_KEY_SIZE = 64;
var IDENTITY_HALF_KEY_SIZE = 32;
var TRUNCATED_HASH_LENGTH = 128;
var NAME_HASH_LENGTH = 80;
var RATCHET_SIZE = 256;
var RATCHET_EXPIRY_SECONDS = 60 * 60 * 24 * 30;
var Identity = class _Identity {
  provider;
  static knownRatchets = /* @__PURE__ */ new Map();
  static knownDestinations = /* @__PURE__ */ new Map();
  prvBytes = null;
  sigPrvBytes = null;
  pubBytes = null;
  sigPubBytes = null;
  identityHash = null;
  constructor(provider, createKeys = true) {
    this.provider = provider;
    if (createKeys) {
      this.createKeys();
    }
  }
  static fromBytes(provider, privateKeyBytes) {
    const identity = new _Identity(provider, false);
    return identity.loadPrivateKey(privateKeyBytes) ? identity : null;
  }
  static fromPublicKey(provider, publicKeyBytes) {
    const identity = new _Identity(provider, false);
    return identity.loadPublicKey(publicKeyBytes) ? identity : null;
  }
  static getRandomHash(provider) {
    return provider.randomBytes(TRUNCATED_HASH_LENGTH / 8);
  }
  static fullHash(provider, data) {
    return provider.sha256(data);
  }
  static truncatedHash(provider, data) {
    return _Identity.fullHash(provider, data).subarray(0, TRUNCATED_HASH_LENGTH / 8);
  }
  static ratchetPublicBytes(provider, ratchetPrivate) {
    return provider.x25519PublicFromPrivate(ratchetPrivate);
  }
  static ratchetId(provider, ratchetPublicBytes) {
    return _Identity.fullHash(provider, ratchetPublicBytes).subarray(0, NAME_HASH_LENGTH / 8);
  }
  static rememberRatchet(destinationHash, ratchet, store, receivedAt = Date.now() / 1e3) {
    const key = bytesToHex2(destinationHash);
    _Identity.knownRatchets.set(key, Uint8Array.from(ratchet));
    if (store !== void 0) {
      const payload = encodeRatchetRecord({ ratchet, received: receivedAt });
      void store.set(`ratchets/${key}`, payload);
    }
  }
  static async getRatchet(destinationHash, store, nowSeconds = Date.now() / 1e3) {
    const key = bytesToHex2(destinationHash);
    const cached = _Identity.knownRatchets.get(key);
    if (cached !== void 0) {
      return Uint8Array.from(cached);
    }
    if (store === void 0) {
      return null;
    }
    const stored = await store.get(`ratchets/${key}`);
    if (stored === void 0) {
      return null;
    }
    const record = decodeRatchetRecord(stored);
    if (nowSeconds >= record.received + RATCHET_EXPIRY_SECONDS || record.ratchet.length !== RATCHET_SIZE / 8) {
      return null;
    }
    _Identity.knownRatchets.set(key, Uint8Array.from(record.ratchet));
    return record.ratchet;
  }
  static rememberDestination(destinationHash, receivedFrom, publicKey, appData, timestamp = Date.now() / 1e3) {
    _Identity.knownDestinations.set(bytesToHex2(destinationHash), {
      timestamp,
      receivedFrom: Uint8Array.from(receivedFrom),
      publicKey: Uint8Array.from(publicKey),
      appData: appData === null ? null : Uint8Array.from(appData)
    });
  }
  static recall(provider, destinationHash) {
    const record = _Identity.knownDestinations.get(bytesToHex2(destinationHash));
    if (record === void 0) {
      return null;
    }
    const identity = new _Identity(provider, false);
    return identity.loadPublicKey(record.publicKey) ? identity : null;
  }
  static recallAppData(destinationHash) {
    const record = _Identity.knownDestinations.get(bytesToHex2(destinationHash));
    return record?.appData ?? null;
  }
  get hash() {
    if (this.identityHash === null) {
      throw new Error("Identity has no loaded key material");
    }
    return this.identityHash;
  }
  createKeys() {
    this.prvBytes = this.provider.randomBytes(IDENTITY_HALF_KEY_SIZE);
    this.sigPrvBytes = this.provider.randomBytes(IDENTITY_HALF_KEY_SIZE);
    this.updatePublicMaterial();
  }
  getPrivateKey() {
    this.requirePrivateKey();
    return concatBytes4(this.prvBytes, this.sigPrvBytes);
  }
  getPublicKey() {
    this.requirePublicKey();
    return concatBytes4(this.pubBytes, this.sigPubBytes);
  }
  loadPrivateKey(privateKeyBytes) {
    if (privateKeyBytes.length !== IDENTITY_KEY_SIZE) {
      return false;
    }
    this.prvBytes = privateKeyBytes.subarray(0, IDENTITY_HALF_KEY_SIZE);
    this.sigPrvBytes = privateKeyBytes.subarray(IDENTITY_HALF_KEY_SIZE);
    this.updatePublicMaterial();
    return true;
  }
  loadPublicKey(publicKeyBytes) {
    if (publicKeyBytes.length !== IDENTITY_KEY_SIZE) {
      return false;
    }
    this.prvBytes = null;
    this.sigPrvBytes = null;
    this.pubBytes = publicKeyBytes.subarray(0, IDENTITY_HALF_KEY_SIZE);
    this.sigPubBytes = publicKeyBytes.subarray(IDENTITY_HALF_KEY_SIZE);
    this.updateHashes();
    return true;
  }
  sign(message) {
    this.requirePrivateKey();
    return this.provider.ed25519Sign(this.sigPrvBytes, message);
  }
  validate(signature, message) {
    this.requirePublicKey();
    return this.provider.ed25519Verify(this.sigPubBytes, message, signature);
  }
  encrypt(plaintext, options = {}) {
    this.requirePublicKey();
    const ephemeralPrivateKey = options.ephemeralPrivateKey ?? this.provider.randomBytes(32);
    const ephemeralPublicBytes = this.provider.x25519PublicFromPrivate(ephemeralPrivateKey);
    const targetPublicKey = options.ratchetPublicKey === void 0 ? this.pubBytes : options.ratchetPublicKey;
    const sharedKey = this.provider.x25519SharedSecret(ephemeralPrivateKey, targetPublicKey);
    const derivedKey = rnsHkdf(this.provider, 32, sharedKey, this.hash, null);
    const token = new Token(this.provider, derivedKey);
    const ciphertext = token.encrypt(plaintext, options.tokenIv === void 0 ? {} : { iv: options.tokenIv });
    return concatBytes4(ephemeralPublicBytes, ciphertext);
  }
  decrypt(ciphertextToken, options = {}) {
    this.requirePrivateKey();
    if (ciphertextToken.length <= IDENTITY_HALF_KEY_SIZE) {
      return { plaintext: null, ratchetId: null };
    }
    const peerPublicBytes = ciphertextToken.subarray(0, IDENTITY_HALF_KEY_SIZE);
    const ciphertext = ciphertextToken.subarray(IDENTITY_HALF_KEY_SIZE);
    let plaintext = null;
    let ratchetId = null;
    if (options.ratchets !== void 0) {
      for (const ratchet of options.ratchets) {
        try {
          const ratchetPublicBytes = _Identity.ratchetPublicBytes(this.provider, ratchet);
          ratchetId = _Identity.ratchetId(this.provider, ratchetPublicBytes);
          const sharedKey = this.provider.x25519SharedSecret(ratchet, peerPublicBytes);
          const derivedKey = rnsHkdf(this.provider, 32, sharedKey, this.hash, null);
          plaintext = new Token(this.provider, derivedKey).decrypt(ciphertext);
          break;
        } catch {
          plaintext = null;
          ratchetId = null;
        }
      }
    }
    if (options.enforceRatchets === true && plaintext === null) {
      return { plaintext: null, ratchetId: null };
    }
    if (plaintext === null) {
      try {
        const sharedKey = this.provider.x25519SharedSecret(this.prvBytes, peerPublicBytes);
        const derivedKey = rnsHkdf(this.provider, 32, sharedKey, this.hash, null);
        plaintext = new Token(this.provider, derivedKey).decrypt(ciphertext);
        ratchetId = null;
      } catch {
        return { plaintext: null, ratchetId: null };
      }
    }
    return { plaintext, ratchetId };
  }
  prove(packetHash, proofDestinationHash, sendProof, useImplicitProof = true) {
    const signature = this.sign(packetHash);
    const proofData = useImplicitProof ? signature : concatBytes4(packetHash, signature);
    return sendProof(proofDestinationHash, proofData);
  }
  updatePublicMaterial() {
    this.pubBytes = this.provider.x25519PublicFromPrivate(this.prvBytes);
    this.sigPubBytes = this.provider.ed25519PublicFromPrivate(this.sigPrvBytes);
    this.updateHashes();
  }
  updateHashes() {
    this.identityHash = _Identity.truncatedHash(this.provider, this.getPublicKey());
  }
  requirePrivateKey() {
    if (this.prvBytes === null || this.sigPrvBytes === null) {
      throw new Error("Identity does not hold a private key");
    }
  }
  requirePublicKey() {
    if (this.pubBytes === null || this.sigPubBytes === null) {
      throw new Error("Identity does not hold a public key");
    }
  }
};
function concatBytes4(...parts) {
  const length = parts.reduce((total, part) => total + part.length, 0);
  const output = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }
  return output;
}
function encodeRatchetRecord(record) {
  const ratchetHex = bytesToHex2(record.ratchet);
  const json = JSON.stringify({ ratchet: ratchetHex, received: record.received });
  return new TextEncoder().encode(json);
}
function decodeRatchetRecord(bytes) {
  const parsed = JSON.parse(new TextDecoder().decode(bytes));
  return {
    ratchet: hexToRatchetBytes(parsed.ratchet),
    received: parsed.received
  };
}
function hexToRatchetBytes(hex) {
  if (hex.length % 2 !== 0) {
    throw new Error("Hex strings must contain an even number of characters");
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
}

// packages/reticulum-ts/dist/destination.js
var DestinationType = {
  SINGLE: 0,
  GROUP: 1,
  PLAIN: 2,
  LINK: 3
};
var DestinationDirection = {
  IN: 17,
  OUT: 18
};
var Destination = class _Destination {
  provider;
  identity;
  direction;
  type;
  appName;
  aspects;
  name;
  nameHash;
  hash;
  hexhash;
  constructor(provider, options) {
    this.provider = provider;
    validateNamePart(options.appName, "app name");
    for (const aspect of options.aspects ?? []) {
      validateNamePart(aspect, "aspect");
    }
    this.direction = options.direction;
    this.type = options.type;
    this.appName = options.appName;
    this.aspects = [...options.aspects ?? []];
    if (!isDestinationDirection(this.direction)) {
      throw new Error(`Unknown destination direction: ${this.direction}`);
    }
    if (!isDestinationType(this.type)) {
      throw new Error(`Unknown destination type: ${this.type}`);
    }
    if (this.type === DestinationType.PLAIN && options.identity != null) {
      throw new Error("PLAIN destinations cannot hold an identity");
    }
    if (this.type !== DestinationType.PLAIN && options.identity == null) {
      throw new Error("Non-PLAIN destinations require identity material");
    }
    this.identity = options.identity instanceof Identity ? options.identity : null;
    const identityHash = identityHashBytes(options.identity);
    this.name = _Destination.expandName(identityHash, this.appName, ...this.aspects);
    this.nameHash = _Destination.nameHash(this.provider, this.appName, ...this.aspects);
    this.hash = _Destination.hash(this.provider, identityHash, this.appName, ...this.aspects);
    this.hexhash = bytesToHex2(this.hash);
  }
  static expandName(identityHash, appName, ...aspects) {
    validateNamePart(appName, "app name");
    for (const aspect of aspects) {
      validateNamePart(aspect, "aspect");
    }
    let name = appName;
    for (const aspect of aspects) {
      name += `.${aspect}`;
    }
    if (identityHash !== null) {
      name += `.${bytesToHex2(identityHash)}`;
    }
    return name;
  }
  static nameHash(provider, appName, ...aspects) {
    const expanded = _Destination.expandName(null, appName, ...aspects);
    return Identity.fullHash(provider, new TextEncoder().encode(expanded)).subarray(0, NAME_HASH_LENGTH / 8);
  }
  static hash(provider, identity, appName, ...aspects) {
    const nameHash = _Destination.nameHash(provider, appName, ...aspects);
    const identityHash = identityHashBytes(identity);
    const material = identityHash === null ? nameHash : concatBytes5(nameHash, identityHash);
    return Identity.fullHash(provider, material).subarray(0, TRUNCATED_HASH_LENGTH / 8);
  }
};
function identityHashBytes(identity) {
  if (identity == null) {
    return null;
  }
  if (identity instanceof Identity) {
    return identity.hash;
  }
  if (identity.length !== TRUNCATED_HASH_LENGTH / 8) {
    throw new Error(`Identity hash must be ${TRUNCATED_HASH_LENGTH / 8} bytes`);
  }
  return identity;
}
function isDestinationType(value) {
  return value === DestinationType.SINGLE || value === DestinationType.GROUP || value === DestinationType.PLAIN || value === DestinationType.LINK;
}
function isDestinationDirection(value) {
  return value === DestinationDirection.IN || value === DestinationDirection.OUT;
}
function validateNamePart(value, label) {
  if (value.length === 0) {
    throw new Error(`Destination ${label} cannot be empty`);
  }
  if (value.includes(".")) {
    throw new Error(`Dots cannot be used in destination ${label}s`);
  }
}
function concatBytes5(...parts) {
  const length = parts.reduce((total, part) => total + part.length, 0);
  const output = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }
  return output;
}

// packages/reticulum-ts/dist/packet.js
var FULL_HASH_SIZE = 32;
var SIGNATURE_SIZE = 64;
var PacketType = {
  DATA: 0,
  ANNOUNCE: 1,
  LINKREQUEST: 2,
  PROOF: 3
};
var PacketHeaderType = {
  HEADER_1: 0,
  HEADER_2: 1
};
var PacketContext = {
  NONE: 0,
  RESOURCE: 1,
  RESOURCE_ADV: 2,
  RESOURCE_REQ: 3,
  RESOURCE_HMU: 4,
  RESOURCE_PRF: 5,
  RESOURCE_ICL: 6,
  RESOURCE_RCL: 7,
  CACHE_REQUEST: 8,
  REQUEST: 9,
  RESPONSE: 10,
  PATH_RESPONSE: 11,
  COMMAND: 12,
  COMMAND_STATUS: 13,
  CHANNEL: 14,
  KEEPALIVE: 250,
  LINKIDENTIFY: 251,
  LINKCLOSE: 252,
  LINKPROOF: 253,
  LRRTT: 254,
  LRPROOF: 255
};
var PacketContextFlag = {
  UNSET: 0,
  SET: 1
};
var TransportType = {
  BROADCAST: 0,
  TRANSPORT: 1
};
var Packet = class _Packet {
  provider;
  headerType;
  contextFlag;
  transportType;
  destinationType;
  packetType;
  hops;
  destinationHash;
  context;
  data;
  transportId;
  raw;
  constructor(provider, fields) {
    this.provider = provider;
    this.headerType = fields.headerType;
    this.contextFlag = fields.contextFlag;
    this.transportType = fields.transportType;
    this.destinationType = fields.destinationType;
    this.packetType = fields.packetType;
    this.hops = fields.hops;
    this.destinationHash = fields.destinationHash;
    this.context = fields.context;
    this.data = fields.data;
    this.transportId = fields.transportId;
    this.raw = fields.raw ?? _Packet.encodeRaw(fields);
  }
  static fromFields(provider, fields) {
    if (!isHeaderType(fields.headerType)) {
      throw new Error(`Unknown packet header type: ${fields.headerType}`);
    }
    if (!isContextFlag(fields.contextFlag ?? PacketContextFlag.UNSET)) {
      throw new Error(`Unknown packet context flag: ${fields.contextFlag}`);
    }
    if (!isTransportType(fields.transportType)) {
      throw new Error(`Unknown packet transport type: ${fields.transportType}`);
    }
    if (!isDestinationType2(fields.destinationType)) {
      throw new Error(`Unknown packet destination type: ${fields.destinationType}`);
    }
    if (!isPacketType(fields.packetType)) {
      throw new Error(`Unknown packet type: ${fields.packetType}`);
    }
    validateHash(fields.destinationHash, "destination hash");
    if (fields.headerType === PacketHeaderType.HEADER_2) {
      if (fields.transportId === void 0) {
        throw new Error("HEADER_2 packets require a transport ID");
      }
      validateHash(fields.transportId, "transport ID");
    }
    return new _Packet(provider, {
      headerType: fields.headerType,
      contextFlag: fields.contextFlag ?? PacketContextFlag.UNSET,
      transportType: fields.transportType,
      destinationType: fields.destinationType,
      packetType: fields.packetType,
      hops: fields.hops ?? 0,
      destinationHash: fields.destinationHash,
      context: fields.context ?? PacketContext.NONE,
      data: fields.data ?? new Uint8Array(),
      transportId: fields.transportId ?? null
    });
  }
  static decode(provider, raw) {
    try {
      if (raw.length < 2 + TRUNCATED_HASH_LENGTH / 8 + 1) {
        return null;
      }
      const flags = raw[0];
      const headerType = (flags & 64) >> 6;
      const contextFlag = (flags & 32) >> 5;
      const transportType = (flags & 16) >> 4;
      const destinationType = (flags & 12) >> 2;
      const packetType = flags & 3;
      const hops = raw[1];
      const hashLength = TRUNCATED_HASH_LENGTH / 8;
      if (!isHeaderType(headerType) || !isContextFlag(contextFlag) || !isTransportType(transportType) || !isDestinationType2(destinationType) || !isPacketType(packetType)) {
        return null;
      }
      if (headerType === PacketHeaderType.HEADER_2) {
        if (raw.length < 2 + hashLength * 2 + 1) {
          return null;
        }
        return new _Packet(provider, {
          headerType,
          contextFlag,
          transportType,
          destinationType,
          packetType,
          hops,
          transportId: raw.subarray(2, 2 + hashLength),
          destinationHash: raw.subarray(2 + hashLength, 2 + hashLength * 2),
          context: raw[2 + hashLength * 2],
          data: raw.subarray(3 + hashLength * 2),
          raw
        });
      }
      return new _Packet(provider, {
        headerType,
        contextFlag,
        transportType,
        destinationType,
        packetType,
        hops,
        transportId: null,
        destinationHash: raw.subarray(2, 2 + hashLength),
        context: raw[2 + hashLength],
        data: raw.subarray(3 + hashLength),
        raw
      });
    } catch {
      return null;
    }
  }
  packedFlags() {
    return this.headerType << 6 | this.contextFlag << 5 | this.transportType << 4 | this.destinationType << 2 | this.packetType;
  }
  hash() {
    return Identity.fullHash(this.provider, this.hashablePart());
  }
  truncatedHash() {
    return Identity.truncatedHash(this.provider, this.hashablePart());
  }
  proofDestinationHash() {
    return this.hash().subarray(0, TRUNCATED_HASH_LENGTH / 8);
  }
  createProof(identity, options = {}) {
    const packetHash = this.hash();
    const signature = identity.sign(packetHash);
    return options.explicit === false ? signature : concatBytes6(packetHash, signature);
  }
  validateProof(identity, proof) {
    const packetHash = this.hash();
    if (proof.length === FULL_HASH_SIZE + SIGNATURE_SIZE) {
      const proofHash = proof.subarray(0, FULL_HASH_SIZE);
      if (!equalBytes4(proofHash, packetHash)) {
        return false;
      }
      return identity.validate(proof.subarray(FULL_HASH_SIZE), packetHash);
    }
    if (proof.length === SIGNATURE_SIZE) {
      return identity.validate(proof, packetHash);
    }
    return false;
  }
  hashablePart() {
    const maskedFlags = new Uint8Array([this.raw[0] & 15]);
    if (this.headerType === PacketHeaderType.HEADER_2) {
      return concatBytes6(maskedFlags, this.raw.subarray(TRUNCATED_HASH_LENGTH / 8 + 2));
    }
    return concatBytes6(maskedFlags, this.raw.subarray(2));
  }
  static encodeRaw(fields) {
    const flags = fields.headerType << 6 | fields.contextFlag << 5 | fields.transportType << 4 | fields.destinationType << 2 | fields.packetType;
    const header = fields.headerType === PacketHeaderType.HEADER_2 ? concatBytes6(new Uint8Array([flags, fields.hops]), fields.transportId, fields.destinationHash) : concatBytes6(new Uint8Array([flags, fields.hops]), fields.destinationHash);
    return concatBytes6(header, new Uint8Array([fields.context]), fields.data);
  }
};
function validateHash(value, label) {
  if (value.length !== TRUNCATED_HASH_LENGTH / 8) {
    throw new Error(`${label} must be ${TRUNCATED_HASH_LENGTH / 8} bytes`);
  }
}
function isHeaderType(value) {
  return value === PacketHeaderType.HEADER_1 || value === PacketHeaderType.HEADER_2;
}
function isContextFlag(value) {
  return value === PacketContextFlag.UNSET || value === PacketContextFlag.SET;
}
function isTransportType(value) {
  return value === TransportType.BROADCAST || value === TransportType.TRANSPORT;
}
function isDestinationType2(value) {
  return value === DestinationType.SINGLE || value === DestinationType.GROUP || value === DestinationType.PLAIN || value === DestinationType.LINK;
}
function isPacketType(value) {
  return value === PacketType.DATA || value === PacketType.ANNOUNCE || value === PacketType.LINKREQUEST || value === PacketType.PROOF;
}
function equalBytes4(left, right) {
  if (left.length !== right.length) {
    return false;
  }
  let diff = 0;
  for (let index = 0; index < left.length; index += 1) {
    diff |= left[index] ^ right[index];
  }
  return diff === 0;
}
function concatBytes6(...parts) {
  const length = parts.reduce((total, part) => total + part.length, 0);
  const output = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }
  return output;
}

// packages/reticulum-ts/dist/interfaces/framing.js
var HDLC_FLAG = 126;
var HDLC_ESCAPE = 125;
var HDLC_ESCAPE_MASK = 32;
function encodeHdlcFrame(payload) {
  const output = [HDLC_FLAG];
  for (const byte of payload) {
    if (byte === HDLC_FLAG || byte === HDLC_ESCAPE) {
      output.push(HDLC_ESCAPE, byte ^ HDLC_ESCAPE_MASK);
    } else {
      output.push(byte);
    }
  }
  output.push(HDLC_FLAG);
  return Uint8Array.from(output);
}
function decodeHdlcFrames(input, state = {}) {
  const frames = [];
  const buffer = Array.from(state.buffer ?? new Uint8Array());
  let inEscape = state.inEscape ?? false;
  for (const byte of input) {
    if (inEscape) {
      buffer.push(byte ^ HDLC_ESCAPE_MASK);
      inEscape = false;
      continue;
    }
    if (byte === HDLC_ESCAPE) {
      inEscape = true;
      continue;
    }
    if (byte === HDLC_FLAG) {
      if (buffer.length > 0) {
        frames.push(Uint8Array.from(buffer));
        buffer.length = 0;
      }
      continue;
    }
    buffer.push(byte);
  }
  return {
    frames,
    buffer: Uint8Array.from(buffer),
    inEscape
  };
}

// packages/reticulum-ts/dist/interfaces/interface.js
var AbstractPacketInterface = class {
  name;
  mtu;
  bitrate;
  incoming;
  outgoing;
  online = false;
  queue = new AsyncPacketQueue();
  closed = false;
  constructor(options, incoming = true, outgoing = options.outgoing ?? true) {
    if (options.name.length === 0) {
      throw new Error("Interface name cannot be empty");
    }
    this.name = options.name;
    this.mtu = options.mtu ?? 500;
    this.bitrate = options.bitrate ?? null;
    this.incoming = incoming;
    this.outgoing = outgoing;
  }
  get packets() {
    return this.queue;
  }
  async send(packet) {
    if (this.closed) {
      throw new Error(`Interface ${this.name} is closed`);
    }
    if (!this.outgoing) {
      throw new Error(`Interface ${this.name} is not configured for outbound traffic`);
    }
    if (packet.raw.length > this.mtu) {
      throw new Error(`Packet exceeds interface MTU (${packet.raw.length} > ${this.mtu})`);
    }
    await this.writeBytes(this.encodeOutgoing(packet.raw));
  }
  async close() {
    if (this.closed) {
      return;
    }
    this.closed = true;
    this.online = false;
    this.queue.close();
    await this.closeInterface();
  }
  receiveBytes(bytes) {
    if (this.closed) {
      return;
    }
    for (const frame of this.decodeIncoming(bytes)) {
      const packet = this.decodePacket(frame);
      if (packet !== null) {
        this.queue.push(packet);
      }
    }
  }
};
var HdlcPacketInterface = class extends AbstractPacketInterface {
  decodeState = {};
  encodeOutgoing(raw) {
    return encodeHdlcFrame(raw);
  }
  decodeIncoming(bytes) {
    const decoded = decodeHdlcFrames(bytes, this.decodeState);
    this.decodeState = {
      buffer: decoded.buffer,
      inEscape: decoded.inEscape
    };
    return decoded.frames;
  }
};
var RawPacketInterface = class extends AbstractPacketInterface {
  encodeOutgoing(raw) {
    return raw;
  }
  decodeIncoming(bytes) {
    return bytes.length > 0 ? [bytes] : [];
  }
};
var AsyncPacketQueue = class {
  values = [];
  waiters = [];
  closed = false;
  push(packet) {
    const waiter = this.waiters.shift();
    if (waiter !== void 0) {
      waiter({ done: false, value: packet });
      return;
    }
    this.values.push(packet);
  }
  close() {
    if (this.closed) {
      return;
    }
    this.closed = true;
    for (const waiter of this.waiters.splice(0)) {
      waiter({ done: true, value: void 0 });
    }
  }
  [Symbol.asyncIterator]() {
    return {
      next: async () => {
        const value = this.values.shift();
        if (value !== void 0) {
          return { done: false, value };
        }
        if (this.closed) {
          return { done: true, value: void 0 };
        }
        return new Promise((resolve) => {
          this.waiters.push(resolve);
        });
      }
    };
  }
};

// packages/reticulum-ts/dist/interfaces/websocket-client.js
var WEBSOCKET_RECONNECT_WAIT_MS = 5e3;
var WEBSOCKET_INITIAL_CONNECT_TIMEOUT_MS = 5e3;
var WEBSOCKET_HW_MTU = 262144;
var WebSocketClientInterface = class _WebSocketClientInterface extends RawPacketInterface {
  provider;
  runtime;
  options;
  socket = null;
  reconnectTimer = null;
  reconnectAttempts = 0;
  detached = false;
  constructor(provider, runtime, options, connected = null) {
    super({ ...options, mtu: options.mtu ?? WEBSOCKET_HW_MTU }, true, options.outgoing ?? true);
    this.provider = provider;
    this.runtime = runtime;
    this.options = options;
    if (connected !== null) {
      this.attachSocket(connected);
    }
  }
  static async connect(provider, runtime, options) {
    const iface = new _WebSocketClientInterface(provider, runtime, options);
    await iface.initialConnect();
    return iface;
  }
  static fromSocket(provider, runtime, options, socket, outgoing) {
    return new _WebSocketClientInterface(provider, runtime, { ...options, outgoing }, socket);
  }
  async initialConnect() {
    const connected = await this.connectOnce();
    if (!connected) {
      this.scheduleReconnect();
    }
  }
  decodePacket(frame) {
    return Packet.decode(this.provider, frame);
  }
  async writeBytes(bytes) {
    if (this.socket === null || !this.online || this.socket.readyState !== 1) {
      throw new Error(`WebSocket interface ${this.name} is not connected`);
    }
    this.socket.send(bytes);
  }
  async closeInterface() {
    this.detached = true;
    this.reconnectTimer?.cancel();
    this.reconnectTimer = null;
    if (this.socket !== null) {
      this.socket.close();
      this.socket = null;
    }
  }
  async connectOnce() {
    try {
      const socket = await this.openSocket();
      this.attachSocket(socket);
      return true;
    } catch {
      this.online = false;
      return false;
    }
  }
  async openSocket() {
    const socket = this.createSocket();
    socket.binaryType = "arraybuffer";
    return new Promise((resolve, reject) => {
      let settled = false;
      const timer = this.runtime.clock.setTimeout(() => {
        settle(() => {
          socket.close();
          reject(new Error(`WebSocket connect timed out after ${this.connectTimeoutMs()}ms`));
        });
      }, this.connectTimeoutMs());
      const cleanup = () => {
        timer.cancel();
        socket.removeEventListener("open", onOpen);
        socket.removeEventListener("close", onFailure);
        socket.removeEventListener("error", onFailure);
      };
      const settle = (callback) => {
        if (settled) {
          return;
        }
        settled = true;
        cleanup();
        callback();
      };
      const onOpen = () => settle(() => resolve(socket));
      const onFailure = () => settle(() => reject(new Error(`WebSocket connect failed for ${this.options.url}`)));
      socket.addEventListener("open", onOpen);
      socket.addEventListener("close", onFailure);
      socket.addEventListener("error", onFailure);
    });
  }
  createSocket() {
    const factory = this.options.webSocketFactory ?? defaultWebSocketFactory;
    return factory(this.options.url, this.protocols());
  }
  protocols() {
    if (this.options.sharedToken === void 0) {
      return this.options.protocols;
    }
    const tokenProtocol = `tp-token.${this.options.sharedToken}`;
    if (this.options.protocols === void 0) {
      return tokenProtocol;
    }
    return typeof this.options.protocols === "string" ? [this.options.protocols, tokenProtocol] : [...this.options.protocols, tokenProtocol];
  }
  connectTimeoutMs() {
    return this.options.connectTimeoutMs ?? WEBSOCKET_INITIAL_CONNECT_TIMEOUT_MS;
  }
  attachSocket(socket) {
    this.socket = socket;
    this.online = true;
    this.reconnectAttempts = 0;
    socket.binaryType = "arraybuffer";
    socket.addEventListener("message", (event) => {
      void toUint8Array(event.data).then((bytes) => {
        if (bytes !== null) {
          this.receiveBytes(bytes);
        }
      });
    });
    socket.addEventListener("close", () => this.handleDisconnect());
    socket.addEventListener("error", () => this.handleDisconnect());
  }
  handleDisconnect() {
    if (this.detached) {
      return;
    }
    if (this.socket === null && !this.online) {
      return;
    }
    this.socket = null;
    this.online = false;
    this.scheduleReconnect();
  }
  scheduleReconnect() {
    if (this.detached) {
      return;
    }
    this.reconnectTimer?.cancel();
    this.reconnectTimer = this.runtime.clock.setTimeout(async () => {
      this.reconnectTimer = null;
      await this.reconnect();
    }, this.options.reconnectWaitMs ?? WEBSOCKET_RECONNECT_WAIT_MS);
  }
  async reconnect() {
    if (this.detached) {
      return;
    }
    this.reconnectAttempts += 1;
    const maxTries = this.options.maxReconnectTries ?? null;
    if (maxTries !== null && this.reconnectAttempts > maxTries) {
      await this.close();
      return;
    }
    const connected = await this.connectOnce();
    if (!connected) {
      this.scheduleReconnect();
    }
  }
};
function defaultWebSocketFactory(url, protocols) {
  if (globalThis.WebSocket === void 0) {
    throw new Error("No global WebSocket implementation is available");
  }
  return new globalThis.WebSocket(url, protocols);
}
async function toUint8Array(data) {
  if (data instanceof Uint8Array) {
    return Uint8Array.from(data);
  }
  if (data instanceof ArrayBuffer) {
    return new Uint8Array(data);
  }
  if (ArrayBuffer.isView(data)) {
    return new Uint8Array(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength));
  }
  if (data instanceof Blob) {
    return new Uint8Array(await data.arrayBuffer());
  }
  return null;
}

// packages/reticulum-ts/dist/interfaces/tcp.js
var TCP_RECONNECT_WAIT_MS = 5e3;
var TCP_INITIAL_CONNECT_TIMEOUT_MS = 5e3;
var TcpClientInterface = class _TcpClientInterface extends HdlcPacketInterface {
  provider;
  runtime;
  options;
  connected;
  connection = null;
  readTask = null;
  reconnectTimer = null;
  reconnectAttempts = 0;
  detached = false;
  constructor(provider, runtime, options, connected = null) {
    super(options, true, options.outgoing ?? (connected === null ? options.outgoing ?? true : options.outgoing ?? true));
    this.provider = provider;
    this.runtime = runtime;
    this.options = options;
    this.connected = connected;
  }
  static async connect(provider, runtime, options) {
    const iface = new _TcpClientInterface(provider, runtime, options);
    await iface.initialConnect();
    return iface;
  }
  static fromConnection(provider, runtime, options, connection, outgoing) {
    const iface = new _TcpClientInterface(provider, runtime, {
      ...options,
      targetHost: "0.0.0.0",
      targetPort: 0,
      outgoing
    }, connection);
    iface.attachConnection(connection);
    return iface;
  }
  async initialConnect() {
    if (this.connected !== null) {
      this.attachConnection(this.connected);
      return;
    }
    const connected = await this.connectOnce();
    if (!connected) {
      this.scheduleReconnect();
    }
  }
  decodePacket(frame) {
    return Packet.decode(this.provider, frame);
  }
  async writeBytes(bytes) {
    if (this.connection === null || !this.online) {
      throw new Error(`TCP interface ${this.name} is not connected`);
    }
    await this.connection.write(bytes);
  }
  async closeInterface() {
    this.detached = true;
    this.reconnectTimer?.cancel();
    this.reconnectTimer = null;
    if (this.connection !== null) {
      await this.connection.close();
      this.connection = null;
    }
  }
  attachConnection(connection) {
    this.connection = connection;
    this.online = true;
    this.reconnectAttempts = 0;
    this.readTask = this.readLoop(connection);
  }
  async connectOnce() {
    try {
      const connection = await this.runtime.tcp.connect({
        host: this.options.targetHost,
        port: this.options.targetPort,
        connectTimeoutMs: this.options.connectTimeoutMs ?? TCP_INITIAL_CONNECT_TIMEOUT_MS
      });
      this.attachConnection(connection);
      return true;
    } catch {
      this.online = false;
      return false;
    }
  }
  scheduleReconnect() {
    if (this.detached || this.connected !== null) {
      return;
    }
    this.reconnectTimer?.cancel();
    this.reconnectTimer = this.runtime.clock.setTimeout(async () => {
      this.reconnectTimer = null;
      await this.reconnect();
    }, this.options.reconnectWaitMs ?? TCP_RECONNECT_WAIT_MS);
  }
  async reconnect() {
    if (this.detached) {
      return;
    }
    this.reconnectAttempts += 1;
    const maxTries = this.options.maxReconnectTries ?? null;
    if (maxTries !== null && this.reconnectAttempts > maxTries) {
      await this.close();
      return;
    }
    const connected = await this.connectOnce();
    if (!connected) {
      this.scheduleReconnect();
    }
  }
  async readLoop(connection) {
    try {
      for await (const chunk of connection.readable) {
        this.receiveBytes(chunk);
      }
    } catch {
    } finally {
      this.online = false;
      if (!this.detached && this.connected === null) {
        this.scheduleReconnect();
      } else if (!this.detached) {
        await this.close();
      }
    }
  }
};
var TcpServerInterface = class {
  provider;
  runtime;
  options;
  name;
  incoming;
  outgoing;
  mtu;
  bitrate;
  online = false;
  listener = null;
  acceptTask = null;
  spawned = [];
  onSpawned = null;
  closed = false;
  listenAddress = null;
  constructor(provider, runtime, options) {
    this.provider = provider;
    this.runtime = runtime;
    this.options = options;
    this.name = options.name;
    this.incoming = true;
    this.outgoing = options.outgoing ?? true;
    this.mtu = options.mtu ?? 500;
    this.bitrate = options.bitrate ?? null;
  }
  setSpawnHandler(handler) {
    this.onSpawned = handler;
  }
  async start() {
    this.listener = await this.runtime.tcp.listen({
      host: this.options.listenHost,
      port: this.options.listenPort
    });
    this.listenAddress = this.listener.address;
    this.online = true;
    this.acceptTask = this.acceptLoop();
  }
  get address() {
    return this.listenAddress;
  }
  get clients() {
    return this.spawned;
  }
  async close() {
    if (this.closed) {
      return;
    }
    this.closed = true;
    this.online = false;
    for (const client of [...this.spawned]) {
      await client.close();
    }
    if (this.listener !== null) {
      await this.listener.close();
      this.listener = null;
    }
  }
  async acceptLoop() {
    if (this.listener === null) {
      return;
    }
    for await (const connection of this.listener.accept()) {
      if (this.closed) {
        await connection.close();
        continue;
      }
      const client = TcpClientInterface.fromConnection(this.provider, this.runtime, {
        name: `${this.name}:client`,
        provider: this.provider,
        runtime: this.runtime,
        mtu: this.mtu,
        bitrate: this.bitrate,
        outgoing: this.outgoing
      }, connection, this.outgoing);
      this.spawned.push(client);
      this.onSpawned?.(client);
    }
  }
};

// packages/reticulum-ts/dist/interfaces/udp.js
var UDP_HW_MTU = 1064;
var UdpInterface = class _UdpInterface extends RawPacketInterface {
  provider;
  runtime;
  options;
  socket = null;
  readTask = null;
  constructor(provider, runtime, options) {
    super({ ...options, mtu: options.mtu ?? UDP_HW_MTU }, true, options.outgoing ?? true);
    this.provider = provider;
    this.runtime = runtime;
    this.options = options;
  }
  static async open(provider, runtime, options) {
    const iface = new _UdpInterface(provider, runtime, options);
    await iface.start();
    return iface;
  }
  async start() {
    this.socket = await this.runtime.udp.bind(this.options.listenHost, this.options.listenPort);
    this.online = true;
    this.readTask = this.readLoop();
  }
  get address() {
    return this.socket?.address ?? null;
  }
  decodePacket(frame) {
    return Packet.decode(this.provider, frame);
  }
  async writeBytes(bytes) {
    if (this.socket === null) {
      throw new Error(`UDP interface ${this.name} is not bound`);
    }
    await this.socket.send(bytes, this.options.forwardHost, this.options.forwardPort);
  }
  async closeInterface() {
    if (this.socket !== null) {
      await this.socket.close();
      this.socket = null;
    }
  }
  async readLoop() {
    if (this.socket === null) {
      return;
    }
    for await (const datagram of this.socket.packets) {
      this.receiveBytes(datagram.data);
    }
  }
};

// packages/reticulum-ts/dist/interfaces/pipe.js
var PipeInterface = class _PipeInterface extends HdlcPacketInterface {
  provider;
  peer = null;
  constructor(provider, options) {
    super(options);
    this.provider = provider;
  }
  static pair(provider, left = { name: "pipe:left" }, right = { name: "pipe:right" }) {
    const leftInterface = new _PipeInterface(provider, { ...left, provider });
    const rightInterface = new _PipeInterface(provider, { ...right, provider });
    leftInterface.peer = rightInterface;
    rightInterface.peer = leftInterface;
    return [leftInterface, rightInterface];
  }
  decodePacket(frame) {
    return Packet.decode(this.provider, frame);
  }
  async writeBytes(bytes) {
    if (this.peer === null) {
      throw new Error(`Pipe interface ${this.name} is not connected`);
    }
    this.peer.receiveBytes(bytes);
  }
  async closeInterface() {
    this.peer = null;
  }
};

// packages/reticulum-ts/dist/announce.js
var ANNOUNCE_RANDOM_HASH_SIZE = 10;
var ANNOUNCE_SIGNATURE_SIZE = 64;
var Announce = class _Announce {
  static buildPacket(provider, destination, options = {}) {
    if (destination.type !== DestinationType.SINGLE) {
      throw new Error("Only SINGLE destinations can be announced");
    }
    if (destination.direction !== DestinationDirection.IN) {
      throw new Error("Only IN destinations can be announced");
    }
    if (destination.identity === null) {
      throw new Error("Announce destination must hold an identity");
    }
    const randomHash = options.randomHash ?? provider.randomBytes(ANNOUNCE_RANDOM_HASH_SIZE);
    if (randomHash.length !== ANNOUNCE_RANDOM_HASH_SIZE) {
      throw new Error(`Announce random hash must be ${ANNOUNCE_RANDOM_HASH_SIZE} bytes`);
    }
    if (options.ratchetPublicKey !== void 0 && options.ratchetPublicKey.length !== RATCHET_SIZE / 8) {
      throw new Error(`Announce ratchet public key must be ${RATCHET_SIZE / 8} bytes`);
    }
    const publicKey = destination.identity.getPublicKey();
    const ratchet = options.ratchetPublicKey ?? new Uint8Array();
    const appData = options.appData ?? new Uint8Array();
    const signedData = concatBytes7(destination.hash, publicKey, destination.nameHash, randomHash, ratchet, appData);
    const signature = destination.identity.sign(signedData);
    const data = concatBytes7(publicKey, destination.nameHash, randomHash, ratchet, signature, appData);
    return Packet.fromFields(provider, {
      headerType: 0,
      contextFlag: options.ratchetPublicKey === void 0 ? PacketContextFlag.UNSET : PacketContextFlag.SET,
      transportType: TransportType.BROADCAST,
      destinationType: DestinationType.SINGLE,
      packetType: PacketType.ANNOUNCE,
      destinationHash: destination.hash,
      context: options.pathResponse === true ? PacketContext.PATH_RESPONSE : PacketContext.NONE,
      data
    });
  }
  static parse(packet) {
    if (packet.packetType !== PacketType.ANNOUNCE) {
      return null;
    }
    const keySize = IDENTITY_KEY_SIZE;
    const nameHashSize = NAME_HASH_LENGTH / 8;
    const ratchetSize = RATCHET_SIZE / 8;
    const minimumLength = keySize + nameHashSize + ANNOUNCE_RANDOM_HASH_SIZE + ANNOUNCE_SIGNATURE_SIZE;
    const hasRatchet = packet.contextFlag === PacketContextFlag.SET;
    const ratchetLength = hasRatchet ? ratchetSize : 0;
    if (packet.data.length < minimumLength + ratchetLength) {
      return null;
    }
    let offset = 0;
    const publicKey = packet.data.subarray(offset, offset + keySize);
    offset += keySize;
    const nameHash = packet.data.subarray(offset, offset + nameHashSize);
    offset += nameHashSize;
    const randomHash = packet.data.subarray(offset, offset + ANNOUNCE_RANDOM_HASH_SIZE);
    offset += ANNOUNCE_RANDOM_HASH_SIZE;
    const ratchetPublicKey = hasRatchet ? packet.data.subarray(offset, offset + ratchetSize) : null;
    offset += ratchetLength;
    const signature = packet.data.subarray(offset, offset + ANNOUNCE_SIGNATURE_SIZE);
    offset += ANNOUNCE_SIGNATURE_SIZE;
    const appData = packet.data.length > offset ? packet.data.subarray(offset) : null;
    return {
      destinationHash: packet.destinationHash,
      publicKey,
      nameHash,
      randomHash,
      ratchetPublicKey,
      signature,
      appData
    };
  }
  static validate(provider, packet, onlyValidateSignature = false) {
    const parsed = _Announce.parse(packet);
    if (parsed === null) {
      return false;
    }
    const identity = new Identity(provider, false);
    if (!identity.loadPublicKey(parsed.publicKey)) {
      return false;
    }
    const ratchet = parsed.ratchetPublicKey ?? new Uint8Array();
    const appData = parsed.appData ?? new Uint8Array();
    const signedData = concatBytes7(parsed.destinationHash, parsed.publicKey, parsed.nameHash, parsed.randomHash, ratchet, appData);
    if (!identity.validate(parsed.signature, signedData)) {
      return false;
    }
    if (onlyValidateSignature) {
      return true;
    }
    const expectedHash = Identity.fullHash(provider, concatBytes7(parsed.nameHash, identity.hash)).subarray(0, TRUNCATED_HASH_LENGTH / 8);
    return equalBytes5(parsed.destinationHash, expectedHash);
  }
};
function concatBytes7(...parts) {
  const length = parts.reduce((total, part) => total + part.length, 0);
  const output = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }
  return output;
}
function equalBytes5(left, right) {
  if (left.length !== right.length) {
    return false;
  }
  let diff = 0;
  for (let index = 0; index < left.length; index += 1) {
    diff |= left[index] ^ right[index];
  }
  return diff === 0;
}

// packages/reticulum-ts/dist/packet-receipt.js
var PacketReceiptStatus = {
  FAILED: 0,
  SENT: 1,
  DELIVERED: 2,
  CULLED: 255
};
var EXPLICIT_PROOF_LENGTH = 32 + 64;
var IMPLICIT_PROOF_LENGTH = 64;
var PacketReceipt = class {
  packetHash;
  hash;
  truncatedHash;
  targetDestinationHash;
  sent = true;
  sentAt;
  proved = false;
  status = PacketReceiptStatus.SENT;
  concludedAt = null;
  proofPacket = null;
  timeout = null;
  callbacks = {};
  timeoutTimer = null;
  timeoutAt = null;
  constructor(packetHash, truncatedHash, targetDestinationHash, sentAt = Date.now() / 1e3) {
    this.packetHash = packetHash;
    this.hash = packetHash;
    this.truncatedHash = truncatedHash;
    this.targetDestinationHash = targetDestinationHash;
    this.sentAt = sentAt;
  }
  validateProof(proof, identity) {
    if (proof.length === EXPLICIT_PROOF_LENGTH) {
      const proofHash = proof.subarray(0, 32);
      const signature = proof.subarray(32);
      if (!equalBytes3(proofHash, this.hash)) {
        return false;
      }
      if (!identity.validate(signature, this.hash)) {
        return false;
      }
      this.status = PacketReceiptStatus.DELIVERED;
      this.proved = true;
      this.concludedAt = Date.now() / 1e3;
      this.callbacks.delivery?.(this);
      return true;
    }
    if (proof.length === IMPLICIT_PROOF_LENGTH) {
      if (!identity.validate(proof, this.hash)) {
        return false;
      }
      this.status = PacketReceiptStatus.DELIVERED;
      this.proved = true;
      this.concludedAt = Date.now() / 1e3;
      this.callbacks.delivery?.(this);
      return true;
    }
    return false;
  }
  validateProofPacket(proofPacket, identity) {
    if (proofPacket.packetType !== PacketType.PROOF) {
      return false;
    }
    return this.validateProof(proofPacket.data, identity);
  }
  getStatus() {
    return this.status;
  }
  setTimeout(seconds) {
    this.timeout = seconds;
    this.timeoutAt = Date.now() / 1e3 + seconds;
  }
  setTimeoutCallback(callback) {
    if (callback === null) {
      delete this.callbacks.timeout;
      return;
    }
    this.callbacks.timeout = callback;
  }
  setDeliveryCallback(callback) {
    if (callback === null) {
      delete this.callbacks.delivery;
      return;
    }
    this.callbacks.delivery = callback;
  }
  checkTimeout(nowSeconds = Date.now() / 1e3) {
    if (this.status === PacketReceiptStatus.DELIVERED || this.status === PacketReceiptStatus.FAILED) {
      return false;
    }
    if (this.timeoutAt !== null && nowSeconds >= this.timeoutAt) {
      this.status = PacketReceiptStatus.FAILED;
      this.concludedAt = nowSeconds;
      this.callbacks.timeout?.(this);
      return true;
    }
    return false;
  }
  cancelTimeoutTimer() {
    this.timeoutTimer?.cancel();
    this.timeoutTimer = null;
  }
};

// packages/reticulum-ts/dist/channel.js
var MessageState = {
  MSGSTATE_NEW: 0,
  MSGSTATE_SENT: 1,
  MSGSTATE_DELIVERED: 2,
  MSGSTATE_FAILED: 3
};
var ChannelExceptionType = {
  ME_NO_MSG_TYPE: 0,
  ME_INVALID_MSG_TYPE: 1,
  ME_NOT_REGISTERED: 2,
  ME_LINK_NOT_READY: 3,
  ME_ALREADY_SENT: 4,
  ME_TOO_BIG: 5
};
var ChannelException = class extends Error {
  type;
  constructor(type, message) {
    super(message);
    this.type = type;
  }
};
var Envelope = class {
  outlet;
  message;
  raw = null;
  packet = null;
  sequence;
  tries = 0;
  tracked = false;
  constructor(outlet, options) {
    this.outlet = outlet;
    this.message = options.message ?? null;
    this.raw = options.raw ?? null;
    this.sequence = options.sequence ?? 0;
  }
  pack() {
    if (this.message === null) {
      throw new ChannelException(ChannelExceptionType.ME_INVALID_MSG_TYPE, "Envelope has no message");
    }
    const data = this.message.pack();
    const header = new Uint8Array(6);
    const view = new DataView(header.buffer);
    view.setUint16(0, this.message.MSGTYPE, false);
    view.setUint16(2, this.sequence, false);
    view.setUint16(4, data.length, false);
    this.raw = concatBytes8(header, data);
    return this.raw;
  }
  unpack(factories) {
    if (this.raw === null) {
      throw new ChannelException(ChannelExceptionType.ME_INVALID_MSG_TYPE, "Envelope has no raw data");
    }
    const view = new DataView(this.raw.buffer, this.raw.byteOffset, this.raw.byteLength);
    const msgtype = view.getUint16(0, false);
    this.sequence = view.getUint16(2, false);
    const length = view.getUint16(4, false);
    const ctor = factories.get(msgtype);
    if (ctor === void 0) {
      throw new ChannelException(ChannelExceptionType.ME_NOT_REGISTERED, `Unknown channel MSGTYPE ${msgtype.toString(16)}`);
    }
    const message = new ctor();
    message.unpack(this.raw.subarray(6, 6 + length));
    return message;
  }
};
var Channel = class _Channel {
  outlet;
  static WINDOW = 2;
  static WINDOW_MIN = 2;
  static WINDOW_MIN_LIMIT_MEDIUM = 5;
  static WINDOW_MIN_LIMIT_FAST = 16;
  static WINDOW_MAX_SLOW = 5;
  static WINDOW_MAX_MEDIUM = 12;
  static WINDOW_MAX_FAST = 48;
  static WINDOW_MAX = _Channel.WINDOW_MAX_FAST;
  static FAST_RATE_THRESHOLD = 10;
  static RTT_FAST = 0.18;
  static RTT_MEDIUM = 0.75;
  static RTT_SLOW = 1.45;
  static WINDOW_FLEXIBILITY = 4;
  static SEQ_MAX = 65535;
  static SEQ_MODULUS = _Channel.SEQ_MAX + 1;
  txRing = [];
  rxRing = [];
  messageCallbacks = [];
  messageFactories = /* @__PURE__ */ new Map();
  nextSequence = 0;
  nextRxSequence = 0;
  maxTries = 5;
  fastRateRounds = 0;
  mediumRateRounds = 0;
  window;
  windowMax;
  windowMin;
  windowFlexibility;
  constructor(outlet) {
    this.outlet = outlet;
    if (outlet.rtt > _Channel.RTT_SLOW) {
      this.window = 1;
      this.windowMax = 1;
      this.windowMin = 1;
      this.windowFlexibility = 1;
    } else {
      this.window = _Channel.WINDOW;
      this.windowMax = _Channel.WINDOW_MAX_SLOW;
      this.windowMin = _Channel.WINDOW_MIN;
      this.windowFlexibility = _Channel.WINDOW_FLEXIBILITY;
    }
  }
  registerMessageType(messageClass, options = {}) {
    if (messageClass.MSGTYPE === void 0) {
      throw new ChannelException(ChannelExceptionType.ME_INVALID_MSG_TYPE, "Message class lacks MSGTYPE");
    }
    if (messageClass.MSGTYPE >= 61440 && options.isSystemType !== true) {
      throw new ChannelException(ChannelExceptionType.ME_INVALID_MSG_TYPE, "Message type is system-reserved");
    }
    this.messageFactories.set(messageClass.MSGTYPE, messageClass);
  }
  addMessageHandler(callback) {
    if (!this.messageCallbacks.includes(callback)) {
      this.messageCallbacks.push(callback);
    }
  }
  removeMessageHandler(callback) {
    const index = this.messageCallbacks.indexOf(callback);
    if (index >= 0) {
      this.messageCallbacks.splice(index, 1);
    }
  }
  get mdu() {
    const value = this.outlet.mdu - 6;
    return value > 65535 ? 65535 : value;
  }
  isReadyToSend() {
    if (!this.outlet.isUsable) {
      return false;
    }
    let outstanding = 0;
    for (const envelope of this.txRing) {
      if (envelope.packet === null) {
        outstanding += 1;
        continue;
      }
      if (this.outlet.getPacketState(envelope.packet) !== MessageState.MSGSTATE_DELIVERED) {
        outstanding += 1;
      }
    }
    return outstanding < this.window;
  }
  async send(message) {
    if (!this.isReadyToSend()) {
      throw new ChannelException(ChannelExceptionType.ME_LINK_NOT_READY, "Link is not ready");
    }
    const reservedSequence = this.nextSequence;
    const envelope = new Envelope(this.outlet, { message, sequence: reservedSequence });
    envelope.pack();
    if (envelope.raw !== null && envelope.raw.length > this.outlet.mdu) {
      throw new ChannelException(ChannelExceptionType.ME_TOO_BIG, `Packed message too big for packet: ${envelope.raw.length} > ${this.outlet.mdu}`);
    }
    this.nextSequence = (reservedSequence + 1) % _Channel.SEQ_MODULUS;
    const packet = await this.outlet.send(envelope.raw);
    if (packet === null || packet.raw.length === 0 || packet.receipt === null) {
      this.nextSequence = reservedSequence;
      throw new ChannelException(ChannelExceptionType.ME_LINK_NOT_READY, "Outlet did not transmit packet");
    }
    envelope.packet = packet;
    this.emplaceEnvelope(envelope, this.txRing);
    envelope.tries += 1;
    this.outlet.setPacketDeliveredCallback(packet, (deliveredPacket) => {
      this.packetDelivered(deliveredPacket);
    });
    this.outlet.setPacketTimeoutCallback(packet, (timedOutPacket) => {
      void this.packetTimeout(timedOutPacket);
    }, this.getPacketTimeoutTime(envelope.tries));
    this.updatePacketTimeouts();
    if (this.outlet.getPacketState(packet) === MessageState.MSGSTATE_DELIVERED) {
      this.packetDelivered(packet);
    }
    return envelope;
  }
  receive(raw) {
    const envelope = new Envelope(this.outlet, { raw: Uint8Array.from(raw) });
    const message = envelope.unpack(this.messageFactories);
    if (envelope.sequence < this.nextRxSequence) {
      const windowOverflow = (this.nextRxSequence + _Channel.WINDOW_MAX) % _Channel.SEQ_MODULUS;
      if (windowOverflow < this.nextRxSequence) {
        if (envelope.sequence > windowOverflow) {
          return;
        }
      } else {
        return;
      }
    }
    if (!this.emplaceEnvelope(envelope, this.rxRing)) {
      return;
    }
    const contiguous = [];
    for (const candidate of [...this.rxRing]) {
      if (candidate.sequence === this.nextRxSequence) {
        contiguous.push(candidate);
        this.nextRxSequence = (this.nextRxSequence + 1) % _Channel.SEQ_MODULUS;
      }
    }
    for (const candidate of contiguous) {
      const delivered = candidate.unpack(this.messageFactories);
      const index = this.rxRing.indexOf(candidate);
      if (index >= 0) {
        this.rxRing.splice(index, 1);
      }
      for (const callback of [...this.messageCallbacks]) {
        if (callback(delivered)) {
          break;
        }
      }
    }
  }
  shutdown() {
    this.messageCallbacks.length = 0;
    for (const envelope of this.txRing) {
      if (envelope.packet !== null) {
        this.outlet.setPacketTimeoutCallback(envelope.packet, null);
        this.outlet.setPacketDeliveredCallback(envelope.packet, null);
      }
    }
    this.txRing.length = 0;
    this.rxRing.length = 0;
  }
  emplaceEnvelope(envelope, ring) {
    for (const existing of ring) {
      if (envelope.sequence === existing.sequence) {
        return false;
      }
    }
    let inserted = false;
    for (let index = 0; index < ring.length; index += 1) {
      const existing = ring[index];
      if (envelope.sequence < existing.sequence && !(this.nextRxSequence - envelope.sequence > _Channel.SEQ_MAX / 2)) {
        ring.splice(index, 0, envelope);
        inserted = true;
        break;
      }
    }
    if (!inserted) {
      ring.push(envelope);
    }
    envelope.tracked = true;
    return true;
  }
  packetDelivered(packet) {
    this.packetTxOp(packet, () => true);
  }
  async packetTimeout(packet) {
    if (this.outlet.getPacketState(packet) === MessageState.MSGSTATE_DELIVERED) {
      return;
    }
    const targetId = this.outlet.getPacketId(packet);
    const envelope = this.txRing.find((candidate) => candidate.packet !== null && targetId !== null && this.outlet.getPacketId(candidate.packet) !== null && equalBytes3(this.outlet.getPacketId(candidate.packet), targetId));
    if (envelope === void 0) {
      return;
    }
    if (envelope.tries >= this.maxTries) {
      this.shutdown();
      this.outlet.timedOut();
      return;
    }
    envelope.tries += 1;
    if (envelope.packet !== null) {
      const resent = await this.outlet.resend(envelope.packet);
      if (resent !== null) {
        envelope.packet = resent;
      }
      this.outlet.setPacketDeliveredCallback(envelope.packet, (deliveredPacket) => {
        this.packetDelivered(deliveredPacket);
      });
      this.outlet.setPacketTimeoutCallback(envelope.packet, (timedOutPacket) => {
        void this.packetTimeout(timedOutPacket);
      }, this.getPacketTimeoutTime(envelope.tries));
      this.updatePacketTimeouts();
      if (this.outlet.getPacketState(envelope.packet) === MessageState.MSGSTATE_DELIVERED) {
        this.packetDelivered(envelope.packet);
      }
    }
    if (this.window > this.windowMin) {
      this.window -= 1;
    }
    if (this.windowMax > this.windowMin + this.windowFlexibility) {
      this.windowMax -= 1;
    }
  }
  packetTxOp(packet, op) {
    const targetId = this.outlet.getPacketId(packet);
    const envelope = this.txRing.find((candidate) => candidate.packet !== null && targetId !== null && this.outlet.getPacketId(candidate.packet) !== null && equalBytes3(this.outlet.getPacketId(candidate.packet), targetId));
    if (envelope === void 0 || !op(envelope)) {
      return;
    }
    envelope.tracked = false;
    const index = this.txRing.indexOf(envelope);
    if (index >= 0) {
      this.txRing.splice(index, 1);
    }
    if (this.window < this.windowMax) {
      this.window += 1;
    }
    if (this.outlet.rtt !== 0) {
      if (this.outlet.rtt > _Channel.RTT_FAST) {
        this.fastRateRounds = 0;
      }
      if (this.outlet.rtt > _Channel.RTT_MEDIUM) {
        this.mediumRateRounds = 0;
      } else {
        this.mediumRateRounds += 1;
        if (this.windowMax < _Channel.WINDOW_MAX_MEDIUM && this.mediumRateRounds === _Channel.FAST_RATE_THRESHOLD) {
          this.windowMax = _Channel.WINDOW_MAX_MEDIUM;
          this.windowMin = _Channel.WINDOW_MIN_LIMIT_MEDIUM;
        }
      }
      if (this.outlet.rtt <= _Channel.RTT_FAST) {
        this.fastRateRounds += 1;
        if (this.windowMax < _Channel.WINDOW_MAX_FAST && this.fastRateRounds === _Channel.FAST_RATE_THRESHOLD) {
          this.windowMax = _Channel.WINDOW_MAX_FAST;
          this.windowMin = _Channel.WINDOW_MIN_LIMIT_FAST;
        }
      }
    }
  }
  getPacketTimeoutTime(tries) {
    return Math.pow(1.5, tries - 1) * Math.max(this.outlet.rtt * 2.5, 0.025) * (this.txRing.length + 1.5);
  }
  updatePacketTimeouts() {
    for (const envelope of this.txRing) {
      const receipt = envelope.packet?.receipt;
      if (receipt === null || receipt === void 0) {
        continue;
      }
      const updatedTimeout = this.getPacketTimeoutTime(envelope.tries);
      if (receipt.timeout !== null && updatedTimeout > receipt.timeout) {
        receipt.setTimeout(updatedTimeout);
      }
    }
  }
};
var LinkChannelPacket = class {
  raw;
  receipt;
  constructor(raw, receipt) {
    this.raw = raw;
    this.receipt = receipt;
  }
};
var LinkChannelOutlet = class {
  link;
  constructor(link) {
    this.link = link;
  }
  get mdu() {
    return this.link.mdu;
  }
  get rtt() {
    return this.link.rtt ?? 0;
  }
  get isUsable() {
    return this.link.status === LinkStatus.ACTIVE;
  }
  async send(raw) {
    const result = await this.link.sendContext(PacketContext.CHANNEL, raw, { createReceipt: true });
    if (result === null) {
      return null;
    }
    return new LinkChannelPacket(result.raw, result.receipt);
  }
  async resend(packet) {
    const resent = await this.link.resendPacket(packet.raw, { createReceipt: true });
    if (resent === null) {
      return null;
    }
    return new LinkChannelPacket(resent.raw, resent.receipt);
  }
  getPacketState(packet) {
    if (packet.receipt === null) {
      return MessageState.MSGSTATE_FAILED;
    }
    const status = packet.receipt.getStatus();
    if (status === PacketReceiptStatus.SENT) {
      return MessageState.MSGSTATE_SENT;
    }
    if (status === PacketReceiptStatus.DELIVERED) {
      return MessageState.MSGSTATE_DELIVERED;
    }
    return MessageState.MSGSTATE_FAILED;
  }
  timedOut() {
    void this.link.teardown();
  }
  setPacketTimeoutCallback(packet, callback, timeout = null) {
    if (packet.receipt === null) {
      return;
    }
    if (timeout !== null) {
      packet.receipt.setTimeout(timeout);
    }
    packet.receipt.setTimeoutCallback(callback === null ? null : () => {
      callback(packet);
    });
  }
  setPacketDeliveredCallback(packet, callback) {
    if (packet.receipt === null) {
      return;
    }
    packet.receipt.setDeliveryCallback(callback === null ? null : () => {
      callback(packet);
    });
  }
  getPacketId(packet) {
    return packet.receipt?.hash ?? null;
  }
};
function concatBytes8(...parts) {
  const length = parts.reduce((total, part) => total + part.length, 0);
  const output = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }
  return output;
}

// packages/reticulum-ts/dist/link-request-receipt.js
var RequestReceiptStatus = {
  FAILED: 0,
  SENT: 1,
  DELIVERED: 2,
  RECEIVING: 3,
  READY: 4
};
var LinkRequestReceipt = class {
  link;
  requestId;
  hash;
  timeout;
  requestSize;
  callbacks;
  sentAt;
  packetReceipt;
  status = RequestReceiptStatus.SENT;
  response = null;
  progress = 0;
  concludedAt = null;
  startedAt = null;
  constructor(options) {
    this.link = options.link;
    this.requestId = options.requestId;
    this.hash = options.requestId;
    this.timeout = options.timeout;
    this.packetReceipt = options.packetReceipt ?? null;
    this.requestSize = options.requestSize ?? null;
    this.callbacks = options.callbacks ?? {};
    this.sentAt = Date.now() / 1e3;
    this.startedAt = this.sentAt;
    if (this.packetReceipt !== null) {
      this.attachPacketReceipt(this.packetReceipt);
    }
    this.link.registerPendingRequest(this);
  }
  attachPacketReceipt(packetReceipt) {
    this.packetReceipt = packetReceipt;
    packetReceipt.setTimeout(this.timeout);
    packetReceipt.setTimeoutCallback(() => {
      this.requestTimedOut();
    });
  }
  requestTimedOut() {
    if (this.status === RequestReceiptStatus.SENT || this.status === RequestReceiptStatus.DELIVERED) {
      this.status = RequestReceiptStatus.FAILED;
      this.concludedAt = Date.now() / 1e3;
      this.link.unregisterPendingRequest(this);
      this.callbacks.failed?.(this);
    }
  }
  responseReceived(response) {
    this.response = response;
    this.status = RequestReceiptStatus.READY;
    this.progress = 1;
    this.concludedAt = Date.now() / 1e3;
    this.link.unregisterPendingRequest(this);
    this.callbacks.response?.(this);
  }
  matchesRequestId(requestId) {
    return equalBytes3(this.requestId, requestId);
  }
};

// packages/reticulum-ts/dist/msgpack.js
function msgpackPackUInt(value) {
  if (value >= 0 && value <= 127) {
    return new Uint8Array([value]);
  }
  if (value <= 255) {
    return new Uint8Array([204, value]);
  }
  if (value <= 65535) {
    const output2 = new Uint8Array(3);
    output2[0] = 205;
    output2[1] = value >> 8 & 255;
    output2[2] = value & 255;
    return output2;
  }
  const output = new Uint8Array(5);
  output[0] = 206;
  output[1] = value >>> 24 & 255;
  output[2] = value >>> 16 & 255;
  output[3] = value >>> 8 & 255;
  output[4] = value & 255;
  return output;
}
function msgpackPackString(value) {
  const bytes = new TextEncoder().encode(value);
  if (bytes.length <= 31) {
    const output2 = new Uint8Array(1 + bytes.length);
    output2[0] = 160 | bytes.length;
    output2.set(bytes, 1);
    return output2;
  }
  const output = new Uint8Array(2 + bytes.length);
  output[0] = 217;
  output[1] = bytes.length;
  output.set(bytes, 2);
  return output;
}
function msgpackPackMap(entries) {
  if (entries.length > 15) {
    throw new Error("msgpackPackMap supports at most 15 entries");
  }
  const parts = entries.flatMap(([key, value]) => [msgpackPackString(key), value]);
  const body = concatBytes9(...parts);
  const output = new Uint8Array(1 + body.length);
  output[0] = 128 | entries.length;
  output.set(body, 1);
  return output;
}
function concatBytes9(...parts) {
  const length = parts.reduce((total, part) => total + part.length, 0);
  const output = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }
  return output;
}
function msgpackPackFloat(value) {
  const buffer = new ArrayBuffer(9);
  const view = new DataView(buffer);
  view.setUint8(0, 203);
  view.setFloat64(1, value, false);
  return new Uint8Array(buffer);
}
function msgpackPackBin(bytes) {
  const length = bytes.length;
  if (length <= 255) {
    const output2 = new Uint8Array(2 + length);
    output2[0] = 196;
    output2[1] = length;
    output2.set(bytes, 2);
    return output2;
  }
  const output = new Uint8Array(3 + length);
  output[0] = 197;
  output[1] = length >> 8 & 255;
  output[2] = length & 255;
  output.set(bytes, 3);
  return output;
}
function msgpackPackNil() {
  return new Uint8Array([192]);
}
function msgpackPackArray(items) {
  if (items.length > 15) {
    throw new Error("msgpackPackArray supports at most 15 items");
  }
  const output = new Uint8Array(1 + items.reduce((total, item) => total + item.length, 0));
  output[0] = 144 | items.length;
  let offset = 1;
  for (const item of items) {
    output.set(item, offset);
    offset += item.length;
  }
  return output;
}
function msgpackPackRequest(requestedAt, pathHash, data) {
  return msgpackPackArray([
    msgpackPackFloat(requestedAt),
    msgpackPackBin(pathHash),
    data === null ? msgpackPackNil() : msgpackPackBin(data)
  ]);
}
function msgpackPackResponse(requestId, response) {
  return msgpackPackArray([
    msgpackPackBin(requestId),
    response === null ? msgpackPackNil() : msgpackPackBin(response)
  ]);
}
function msgpackUnpack(bytes) {
  const [value] = msgpackUnpackAt(bytes, 0);
  return value;
}
function msgpackUnpackRequest(bytes) {
  const value = msgpackUnpack(bytes);
  if (value.type !== "array" || value.array === void 0 || value.array.length !== 3) {
    throw new Error("Invalid request payload");
  }
  const [requestedAtValue, pathHashValue, dataValue] = value.array;
  if (requestedAtValue === void 0 || pathHashValue === void 0 || dataValue === void 0 || requestedAtValue.type !== "float" || pathHashValue.type !== "bin" || pathHashValue.bin === void 0) {
    throw new Error("Invalid request payload fields");
  }
  const data = dataValue.type === "nil" ? null : dataValue.type === "bin" ? dataValue.bin ?? null : null;
  return [requestedAtValue.float ?? 0, Uint8Array.from(pathHashValue.bin), data === null ? null : Uint8Array.from(data)];
}
function msgpackUnpackResponse(bytes) {
  const value = msgpackUnpack(bytes);
  if (value.type !== "array" || value.array === void 0 || value.array.length !== 2) {
    throw new Error("Invalid response payload");
  }
  const [requestIdValue, responseValue] = value.array;
  if (requestIdValue === void 0 || responseValue === void 0 || requestIdValue.type !== "bin" || requestIdValue.bin === void 0) {
    throw new Error("Invalid response payload fields");
  }
  const response = responseValue.type === "nil" ? null : responseValue.type === "bin" ? responseValue.bin ?? null : null;
  return [
    Uint8Array.from(requestIdValue.bin),
    response === null ? null : Uint8Array.from(response)
  ];
}
function msgpackUnpackAt(bytes, offset) {
  const tag = bytes[offset];
  if (tag === void 0) {
    throw new Error("Unexpected end of msgpack input");
  }
  if (tag === 192) {
    return [{ type: "nil" }, offset + 1];
  }
  if (tag === 203) {
    const view = new DataView(bytes.buffer, bytes.byteOffset + offset, bytes.byteLength - offset);
    return [{ type: "float", float: view.getFloat64(1, false) }, offset + 9];
  }
  if (tag === 196) {
    const length = bytes[offset + 1];
    const bin = bytes.subarray(offset + 2, offset + 2 + length);
    return [{ type: "bin", bin: Uint8Array.from(bin) }, offset + 2 + length];
  }
  if (tag === 197) {
    const length = bytes[offset + 1] << 8 | bytes[offset + 2];
    const bin = bytes.subarray(offset + 3, offset + 3 + length);
    return [{ type: "bin", bin: Uint8Array.from(bin) }, offset + 3 + length];
  }
  if ((tag & 240) === 144) {
    const count = tag & 15;
    const array = [];
    let nextOffset = offset + 1;
    for (let index = 0; index < count; index += 1) {
      const [item, itemOffset] = msgpackUnpackAt(bytes, nextOffset);
      array.push(item);
      nextOffset = itemOffset;
    }
    return [{ type: "array", array }, nextOffset];
  }
  if ((tag & 240) === 128) {
    const count = tag & 15;
    const map = {};
    let nextOffset = offset + 1;
    for (let index = 0; index < count; index += 1) {
      const [keyValue, keyOffset] = msgpackUnpackAt(bytes, nextOffset);
      const [entryValue, entryOffset] = msgpackUnpackAt(bytes, keyOffset);
      if (keyValue.type === "string" && keyValue.string !== void 0) {
        map[keyValue.string] = entryValue;
      }
      nextOffset = entryOffset;
    }
    return [{ type: "map", map }, nextOffset];
  }
  if ((tag & 224) === 160) {
    const length = tag & 31;
    const stringBytes = bytes.subarray(offset + 1, offset + 1 + length);
    return [{ type: "string", string: new TextDecoder().decode(stringBytes) }, offset + 1 + length];
  }
  if (tag === 217) {
    const length = bytes[offset + 1];
    const stringBytes = bytes.subarray(offset + 2, offset + 2 + length);
    return [{ type: "string", string: new TextDecoder().decode(stringBytes) }, offset + 2 + length];
  }
  if (tag === 204) {
    return [{ type: "int", int: bytes[offset + 1] }, offset + 2];
  }
  if (tag === 205) {
    const value = bytes[offset + 1] << 8 | bytes[offset + 2];
    return [{ type: "int", int: value }, offset + 3];
  }
  if (tag === 206) {
    const view = new DataView(bytes.buffer, bytes.byteOffset + offset, bytes.byteLength - offset);
    return [{ type: "int", int: view.getUint32(1, false) }, offset + 5];
  }
  if (tag <= 127) {
    return [{ type: "int", int: tag }, offset + 1];
  }
  throw new Error(`Unsupported msgpack tag 0x${tag.toString(16)}`);
}

// packages/reticulum-ts/dist/transport/path.js
var TRANSPORT_APP_NAME = "rnstransport";
var PATH_REQUEST_TIMEOUT_SECONDS = 15;
var PATH_REQUEST_GRACE_MS = 400;
var PATH_REQUEST_MIN_INTERVAL = 20;
var TRUNCATED_HASH_BYTES = TRUNCATED_HASH_LENGTH / 8;
function pathRequestDestinationHash(provider) {
  return Destination.hash(provider, null, TRANSPORT_APP_NAME, "path", "request");
}
function buildPathRequestData(destinationHash, requestorTransportId, tag) {
  if (requestorTransportId === null) {
    return concatBytes10(destinationHash, tag);
  }
  return concatBytes10(destinationHash, requestorTransportId, tag);
}
function parsePathRequestData(data) {
  if (data.length < TRUNCATED_HASH_BYTES) {
    return null;
  }
  const destinationHash = data.subarray(0, TRUNCATED_HASH_BYTES);
  let requestorTransportId = null;
  let tag = null;
  if (data.length > TRUNCATED_HASH_BYTES * 2) {
    requestorTransportId = data.subarray(TRUNCATED_HASH_BYTES, TRUNCATED_HASH_BYTES * 2);
    tag = data.subarray(TRUNCATED_HASH_BYTES * 2);
  } else if (data.length > TRUNCATED_HASH_BYTES) {
    tag = data.subarray(TRUNCATED_HASH_BYTES);
  }
  if (tag !== null && tag.length > TRUNCATED_HASH_BYTES) {
    tag = tag.subarray(0, TRUNCATED_HASH_BYTES);
  }
  return { destinationHash, requestorTransportId, tag };
}
function pathRequestTagKey(destinationHash, tag) {
  return hashKey(destinationHash) + hashKey(tag);
}
function hashKey(bytes) {
  return bytesToHex2(bytes);
}
function concatBytes10(...parts) {
  const length = parts.reduce((total, part) => total + part.length, 0);
  const output = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }
  return output;
}
function shouldAnswerPathRequest(nextHop, requestorTransportId) {
  if (requestorTransportId === null) {
    return true;
  }
  return !equalBytes3(nextHop, requestorTransportId);
}

// packages/reticulum-ts/dist/transport/node.js
var PATHFINDER_MAX_HOPS = 128;
var PATHFINDER_EXPIRY_SECONDS = 60 * 60 * 24 * 7;
var TRUNCATED_HASH_BYTES2 = TRUNCATED_HASH_LENGTH / 8;
var DestinationProofStrategy = {
  PROVE_NONE: 33,
  PROVE_APP: 34,
  PROVE_ALL: 35
};
var LeafTransport = class {
  options;
  pathTable = /* @__PURE__ */ new Map();
  packetHashes = /* @__PURE__ */ new Set();
  receipts = [];
  destinations = [];
  announceHandlers = [];
  interfaces = [];
  interfaceTasks = /* @__PURE__ */ new Map();
  pendingLinks = [];
  activeLinks = [];
  useImplicitProof;
  transportEnabled;
  pathRequestHash;
  pathRequests = /* @__PURE__ */ new Map();
  discoveryPrTags = /* @__PURE__ */ new Set();
  bytesIn = 0;
  bytesOut = 0;
  constructor(options) {
    this.options = options;
    this.useImplicitProof = options.useImplicitProof ?? true;
    this.transportEnabled = options.transportEnabled ?? false;
    this.pathRequestHash = pathRequestDestinationHash(options.provider);
  }
  get clock() {
    return this.options.clock;
  }
  get transportIdentity() {
    return this.options.transportIdentity;
  }
  get provider() {
    return this.options.provider;
  }
  registerInterface(iface) {
    if (this.interfaces.includes(iface)) {
      return;
    }
    this.interfaces.push(iface);
    this.interfaceTasks.set(iface, (async () => {
      try {
        for await (const packet of iface.packets) {
          this.bytesIn += packet.raw.length;
          await this.inbound(packet, iface);
        }
      } catch {
      }
    })());
  }
  unregisterInterface(iface) {
    const index = this.interfaces.indexOf(iface);
    if (index >= 0) {
      this.interfaces.splice(index, 1);
    }
    this.interfaceTasks.delete(iface);
  }
  listInterfaces() {
    return [...this.interfaces];
  }
  registerDestination(destination) {
    if (!this.destinations.includes(destination)) {
      this.destinations.push(destination);
    }
  }
  registerAnnounceHandler(handler) {
    if (!this.announceHandlers.includes(handler)) {
      this.announceHandlers.push(handler);
    }
  }
  hasPath(destinationHash) {
    return this.pathTable.has(hashKey2(destinationHash));
  }
  hopsTo(destinationHash) {
    return this.pathTable.get(hashKey2(destinationHash))?.hops ?? null;
  }
  nextHopInterfaceMtu(destinationHash) {
    return this.pathTable.get(hashKey2(destinationHash))?.receivedInterface.mtu ?? null;
  }
  getPathEntry(destinationHash) {
    return this.pathTable.get(hashKey2(destinationHash));
  }
  get pathTableCount() {
    return this.pathTable.size;
  }
  get activeLinkCount() {
    return this.activeLinks.length;
  }
  get bandwidthBytesIn() {
    return this.bytesIn;
  }
  get bandwidthBytesOut() {
    return this.bytesOut;
  }
  requestPath(destinationHash, onInterface = null) {
    const key = hashKey2(destinationHash);
    const now = Date.now() / 1e3;
    const lastRequest = this.pathRequests.get(key) ?? 0;
    if (now - lastRequest < PATH_REQUEST_MIN_INTERVAL) {
      return;
    }
    const tag = Identity.getRandomHash(this.provider).subarray(0, TRUNCATED_HASH_BYTES2);
    const requestData = buildPathRequestData(destinationHash, this.transportEnabled ? this.transportIdentity.hash : null, tag);
    const packet = Packet.fromFields(this.provider, {
      headerType: PacketHeaderType.HEADER_1,
      transportType: TransportType.BROADCAST,
      destinationType: DestinationType.PLAIN,
      packetType: PacketType.DATA,
      destinationHash: this.pathRequestHash,
      context: PacketContext.NONE,
      data: requestData
    });
    void this.sendPacket(packet, { attachedInterface: onInterface });
    this.pathRequests.set(key, now);
  }
  async awaitPath(destinationHash, timeoutSeconds = PATH_REQUEST_TIMEOUT_SECONDS) {
    if (this.hasPath(destinationHash)) {
      return true;
    }
    this.requestPath(destinationHash);
    const deadline = Date.now() + timeoutSeconds * 1e3;
    while (Date.now() < deadline) {
      if (this.hasPath(destinationHash)) {
        return true;
      }
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    return this.hasPath(destinationHash);
  }
  registerLink(link) {
    if (link.initiator) {
      if (!this.pendingLinks.includes(link)) {
        this.pendingLinks.push(link);
      }
      return;
    }
    if (!this.activeLinks.includes(link)) {
      this.activeLinks.push(link);
    }
  }
  activateLink(link) {
    const index = this.pendingLinks.indexOf(link);
    if (index >= 0) {
      this.pendingLinks.splice(index, 1);
    }
    if (!this.activeLinks.includes(link)) {
      this.activeLinks.push(link);
    }
  }
  unregisterLink(link) {
    const pendingIndex = this.pendingLinks.indexOf(link);
    if (pendingIndex >= 0) {
      this.pendingLinks.splice(pendingIndex, 1);
    }
    const activeIndex = this.activeLinks.indexOf(link);
    if (activeIndex >= 0) {
      this.activeLinks.splice(activeIndex, 1);
    }
  }
  async transmit(iface, raw) {
    this.bytesOut += raw.length;
    const packet = Packet.decode(this.options.provider, raw);
    if (packet === null) {
      throw new Error("Cannot transmit invalid packet bytes");
    }
    await iface.send(packet);
  }
  async sendPacket(packet, options = {}) {
    let receipt = null;
    if (options.createReceipt === true) {
      receipt = new PacketReceipt(packet.hash(), packet.truncatedHash(), packet.destinationHash);
      this.receipts.push(receipt);
    }
    const sent = await this.outbound(packet, options.attachedInterface ?? null);
    if (!sent) {
      if (receipt !== null) {
        receipt.status = PacketReceiptStatus.FAILED;
        const index = this.receipts.indexOf(receipt);
        if (index >= 0) {
          this.receipts.splice(index, 1);
        }
      }
      return null;
    }
    return receipt;
  }
  async inbound(packet, iface) {
    const workingPacket = cloneWithHops(this.options.provider, packet, packet.hops + 1);
    if (!this.packetFilter(workingPacket)) {
      return;
    }
    this.packetHashes.add(hashKey2(workingPacket.hash()));
    if (workingPacket.packetType === PacketType.ANNOUNCE) {
      await this.handleAnnounce(workingPacket, iface);
      return;
    }
    if (workingPacket.packetType === PacketType.LINKREQUEST) {
      await this.handleLinkRequest(workingPacket, iface);
      return;
    }
    if (workingPacket.packetType === PacketType.DATA) {
      if (workingPacket.destinationType === DestinationType.LINK) {
        await this.handleLinkData(workingPacket, iface);
        return;
      }
      await this.handleData(workingPacket, iface);
      return;
    }
    if (workingPacket.packetType === PacketType.PROOF) {
      await this.handleProof(workingPacket, iface);
    }
  }
  async handleLinkRequest(packet, iface) {
    for (const destination of this.destinations) {
      if (equalBytes3(destination.hash, packet.destinationHash) && destination.type === packet.destinationType && destination.handleLinkRequest !== void 0) {
        destination.handleLinkRequest(packet, iface);
        return;
      }
    }
  }
  async handleLinkData(packet, iface) {
    for (const link of this.activeLinks) {
      if (equalBytes3(link.linkId, packet.destinationHash)) {
        await link.receive(packet, iface);
        return;
      }
    }
    for (const link of this.pendingLinks) {
      if (equalBytes3(link.linkId, packet.destinationHash)) {
        await link.receive(packet, iface);
        return;
      }
    }
  }
  async handleAnnounce(packet, iface) {
    if (!Announce.validate(this.options.provider, packet)) {
      return;
    }
    const parsed = Announce.parse(packet);
    if (parsed === null) {
      return;
    }
    const localDestination = this.destinations.find((entry2) => equalBytes3(entry2.hash, packet.destinationHash) && entry2.direction === DestinationDirection.IN);
    if (localDestination !== void 0) {
      return;
    }
    const receivedFrom = packet.transportId ?? packet.destinationHash;
    const randomBlob = parsed.randomHash;
    const existing = this.pathTable.get(hashKey2(packet.destinationHash));
    const announceEmitted = announceEmittedFromRandomBlob(randomBlob);
    let shouldAdd = false;
    if (existing === void 0) {
      shouldAdd = packet.hops < PATHFINDER_MAX_HOPS + 1;
    } else if (packet.hops <= existing.hops) {
      const pathTimebase = timebaseFromRandomBlobs(existing.randomBlobs);
      shouldAdd = !existing.randomBlobs.some((blob) => equalBytes3(blob, randomBlob)) && announceEmitted > pathTimebase;
    } else {
      const now2 = Date.now() / 1e3;
      if (now2 >= existing.expires) {
        shouldAdd = !existing.randomBlobs.some((blob) => equalBytes3(blob, randomBlob));
      }
    }
    if (!shouldAdd) {
      return;
    }
    const now = Date.now() / 1e3;
    const randomBlobs = [...existing?.randomBlobs ?? []];
    if (!randomBlobs.some((blob) => equalBytes3(blob, randomBlob))) {
      randomBlobs.push(randomBlob);
    }
    const entry = {
      timestamp: now,
      nextHop: Uint8Array.from(receivedFrom),
      hops: packet.hops,
      expires: now + PATHFINDER_EXPIRY_SECONDS,
      randomBlobs,
      receivedInterface: iface,
      packetHash: packet.hash(),
      announceRaw: Uint8Array.from(packet.raw)
    };
    this.pathTable.set(hashKey2(packet.destinationHash), entry);
    Identity.rememberDestination(packet.destinationHash, receivedFrom, parsed.publicKey, parsed.appData, now);
    const announcedIdentity = Identity.recall(this.options.provider, packet.destinationHash);
    if (announcedIdentity === null) {
      return;
    }
    for (const handler of this.announceHandlers) {
      if (packet.context === PacketContext.PATH_RESPONSE && handler.receivePathResponses !== true) {
        continue;
      }
      if (handler.aspectFilter != null) {
        const parts = handler.aspectFilter.split(".").filter((part) => part.length > 0);
        const appName = parts[0];
        const aspects = parts.slice(1);
        if (appName === void 0) {
          continue;
        }
        const expected = Destination.hash(this.options.provider, announcedIdentity, appName, ...aspects);
        if (!equalBytes3(packet.destinationHash, expected)) {
          continue;
        }
      }
      handler.receivedAnnounce({
        destinationHash: packet.destinationHash,
        announcedIdentity,
        appData: parsed.appData,
        announce: parsed,
        packet
      });
    }
  }
  async handleData(packet, iface) {
    if (packet.destinationType === DestinationType.PLAIN && equalBytes3(packet.destinationHash, this.pathRequestHash)) {
      await this.handlePathRequest(packet, iface);
      return;
    }
    const destination = this.destinations.find((entry) => equalBytes3(entry.hash, packet.destinationHash) && entry.type === packet.destinationType);
    if (destination === void 0) {
      return;
    }
    const plaintext = destination.decrypt(packet.data);
    if (plaintext === null) {
      return;
    }
    destination.dispatchPacket(plaintext, packet);
    if (destination.proofStrategy === DestinationProofStrategy.PROVE_ALL) {
      await this.sendProof(destination, packet, iface);
    } else if (destination.proofStrategy === DestinationProofStrategy.PROVE_APP && destination.shouldProve(packet)) {
      await this.sendProof(destination, packet, iface);
    }
  }
  async handleProof(packet, iface) {
    if (packet.context === PacketContext.LRPROOF) {
      for (const link of this.pendingLinks) {
        if (equalBytes3(link.linkId, packet.destinationHash) && link.hopsMatch(packet)) {
          await link.validateProof(packet, iface);
          return;
        }
      }
      return;
    }
    if (packet.context === PacketContext.RESOURCE_PRF) {
      for (const link of this.activeLinks) {
        if (equalBytes3(link.linkId, packet.destinationHash)) {
          await link.handleResourceProof(packet);
          return;
        }
      }
      return;
    }
    for (const receipt of [...this.receipts]) {
      if (!equalBytes3(packet.destinationHash, receipt.truncatedHash)) {
        continue;
      }
      const identity = Identity.recall(this.options.provider, receipt.targetDestinationHash);
      if (identity === null) {
        continue;
      }
      if (receipt.validateProofPacket(packet, identity)) {
        const index = this.receipts.indexOf(receipt);
        if (index >= 0) {
          this.receipts.splice(index, 1);
        }
      }
    }
  }
  async sendProof(destination, packet, iface) {
    if (destination.identity === null) {
      return;
    }
    const packetHash = packet.hash();
    await destination.identity.prove(packetHash, packet.proofDestinationHash(), async (proofDestinationHash, proofData) => {
      const proofPacket = Packet.fromFields(this.options.provider, {
        headerType: PacketHeaderType.HEADER_1,
        transportType: TransportType.BROADCAST,
        destinationType: DestinationType.SINGLE,
        packetType: PacketType.PROOF,
        destinationHash: proofDestinationHash,
        data: proofData
      });
      await this.outbound(proofPacket, iface);
    }, this.useImplicitProof);
  }
  async outbound(packet, attachedInterface) {
    const path = this.pathTable.get(hashKey2(packet.destinationHash));
    if (packet.packetType !== PacketType.ANNOUNCE && packet.destinationType !== DestinationType.PLAIN && packet.destinationType !== DestinationType.GROUP && path !== void 0) {
      if (path.hops > 1 && packet.headerType === PacketHeaderType.HEADER_1) {
        const wrapped = wrapTransportPacket(packet, path.nextHop);
        await this.transmit(path.receivedInterface, wrapped);
        return true;
      }
      if (path.hops <= 1) {
        await this.transmit(path.receivedInterface, packet.raw);
        return true;
      }
    }
    let sent = false;
    for (const iface of this.interfaces) {
      if (!iface.outgoing) {
        continue;
      }
      if (attachedInterface !== null && iface !== attachedInterface) {
        continue;
      }
      this.packetHashes.add(hashKey2(packet.hash()));
      await this.transmit(iface, packet.raw);
      sent = true;
    }
    return sent;
  }
  async handlePathRequest(packet, iface) {
    const parsed = parsePathRequestData(packet.data);
    if (parsed === null || parsed.tag === null) {
      return;
    }
    const tagKey = pathRequestTagKey(parsed.destinationHash, parsed.tag);
    if (this.discoveryPrTags.has(tagKey)) {
      return;
    }
    this.discoveryPrTags.add(tagKey);
    const localDestination = this.destinations.find((entry) => equalBytes3(entry.hash, parsed.destinationHash) && entry.direction === DestinationDirection.IN);
    if (localDestination?.answerPathRequest !== void 0) {
      await localDestination.answerPathRequest(iface);
      return;
    }
    if (!this.transportEnabled) {
      return;
    }
    const path = this.pathTable.get(hashKey2(parsed.destinationHash));
    if (path === void 0) {
      return;
    }
    if (!shouldAnswerPathRequest(path.nextHop, parsed.requestorTransportId)) {
      return;
    }
    await this.sendPathResponse(path, iface);
  }
  async sendPathResponse(path, iface) {
    await new Promise((resolve) => {
      this.clock.setTimeout(() => {
        void (async () => {
          const cached = Packet.decode(this.provider, path.announceRaw);
          if (cached === null) {
            resolve();
            return;
          }
          const response = buildPathResponseAnnounce(this.provider, cached, this.transportIdentity, path.hops);
          await this.outbound(response, iface);
          resolve();
        })();
      }, PATH_REQUEST_GRACE_MS);
    });
  }
  packetFilter(packet) {
    if (packet.transportId !== null && packet.packetType !== PacketType.ANNOUNCE) {
      if (!equalBytes3(packet.transportId, this.options.transportIdentity.hash)) {
        return false;
      }
    }
    const packetHash = hashKey2(packet.hash());
    if (!this.packetHashes.has(packetHash)) {
      return true;
    }
    return packet.packetType === PacketType.ANNOUNCE && packet.destinationType === DestinationType.SINGLE;
  }
};
function hashKey2(bytes) {
  return bytesToHex2(bytes);
}
function cloneWithHops(provider, packet, hops) {
  return Packet.fromFields(provider, {
    headerType: packet.headerType,
    contextFlag: packet.contextFlag,
    transportType: packet.transportType,
    destinationType: packet.destinationType,
    packetType: packet.packetType,
    hops,
    destinationHash: packet.destinationHash,
    context: packet.context,
    data: packet.data,
    ...packet.transportId === null ? {} : { transportId: packet.transportId }
  });
}
function announceEmittedFromRandomBlob(randomBlob) {
  if (randomBlob.length < 10) {
    return 0;
  }
  let value = 0;
  for (let index = 5; index < 10; index += 1) {
    value = value << 8 | randomBlob[index];
  }
  return value;
}
function timebaseFromRandomBlobs(randomBlobs) {
  let latest = 0;
  for (const blob of randomBlobs) {
    latest = Math.max(latest, announceEmittedFromRandomBlob(blob));
  }
  return latest;
}
function wrapTransportPacket(packet, nextHop) {
  const flags = PacketHeaderType.HEADER_2 << 6 | TransportType.TRANSPORT << 4 | packet.packedFlags() & 15;
  const header = new Uint8Array([flags, packet.hops]);
  const rest = packet.raw.subarray(2);
  const wrapped = new Uint8Array(header.length + nextHop.length + rest.length);
  wrapped.set(header, 0);
  wrapped.set(nextHop, header.length);
  wrapped.set(rest, header.length + nextHop.length);
  return wrapped;
}
function stripTransportHeaders(raw) {
  const flags = (raw[0] & 15 | PacketHeaderType.HEADER_1 << 6 | TransportType.BROADCAST << 4) & 255;
  const output = new Uint8Array(raw.length - TRUNCATED_HASH_BYTES2);
  output[0] = flags;
  output[1] = raw[1];
  output.set(raw.subarray(2 + TRUNCATED_HASH_BYTES2), 2);
  return output;
}
function relayTransportPacket(packet, remainingHops, nextHop) {
  if (remainingHops > 1) {
    const raw2 = new Uint8Array(packet.raw.length);
    raw2[0] = packet.raw[0];
    raw2[1] = packet.hops;
    raw2.set(nextHop, 2);
    raw2.set(packet.raw.subarray(2 + TRUNCATED_HASH_BYTES2), 2 + TRUNCATED_HASH_BYTES2);
    return raw2;
  }
  if (remainingHops === 1) {
    return stripTransportHeaders(packet.raw);
  }
  const raw = new Uint8Array(packet.raw.length - TRUNCATED_HASH_BYTES2);
  raw[0] = packet.raw[0];
  raw[1] = packet.hops;
  raw.set(packet.raw.subarray(2 + TRUNCATED_HASH_BYTES2), 2);
  return raw;
}
function buildTransportAnnounce(provider, source, transportIdentity, hops) {
  return Packet.fromFields(provider, {
    headerType: PacketHeaderType.HEADER_2,
    contextFlag: source.contextFlag,
    transportType: TransportType.TRANSPORT,
    destinationType: source.destinationType,
    packetType: PacketType.ANNOUNCE,
    hops,
    destinationHash: source.destinationHash,
    context: source.context,
    data: source.data,
    transportId: transportIdentity.hash
  });
}
function buildPathResponseAnnounce(provider, source, transportIdentity, hops) {
  return Packet.fromFields(provider, {
    headerType: PacketHeaderType.HEADER_2,
    contextFlag: source.contextFlag,
    transportType: TransportType.TRANSPORT,
    destinationType: source.destinationType,
    packetType: PacketType.ANNOUNCE,
    hops,
    destinationHash: source.destinationHash,
    context: PacketContext.PATH_RESPONSE,
    data: source.data,
    transportId: transportIdentity.hash
  });
}

// packages/reticulum-ts/dist/resource.js
var ResourceStatus = {
  NONE: 0,
  QUEUED: 1,
  ADVERTISED: 2,
  TRANSFERRING: 3,
  AWAITING_PROOF: 4,
  ASSEMBLING: 5,
  COMPLETE: 6,
  FAILED: 7,
  CORRUPT: 8,
  REJECTED: 0
};
var RESOURCE_WINDOW = 4;
var RESOURCE_WINDOW_MIN = 2;
var RESOURCE_WINDOW_MAX_SLOW = 10;
var RESOURCE_WINDOW_MAX_FAST = 75;
var RESOURCE_WINDOW_MAX = RESOURCE_WINDOW_MAX_FAST;
var RESOURCE_WINDOW_FLEXIBILITY = 4;
var RESOURCE_MAPHASH_LEN = 4;
var RESOURCE_RANDOM_HASH_SIZE = 4;
var RESOURCE_HASHMAP_IS_NOT_EXHAUSTED = 0;
var RESOURCE_HASHMAP_IS_EXHAUSTED = 255;
var RESOURCE_MAX_RETRIES = 16;
var RESOURCE_MAX_ADV_RETRIES = 4;
var RESOURCE_SENDER_GRACE_TIME = 10;
var RESOURCE_PROCESSING_GRACE = 1;
var ResourceAdvertisement = class _ResourceAdvertisement {
  static OVERHEAD = 134;
  static HASHMAP_MAX_LEN = Math.floor((383 - _ResourceAdvertisement.OVERHEAD) / RESOURCE_MAPHASH_LEN);
  t = 0;
  d = 0;
  n = 0;
  h = new Uint8Array(0);
  r = new Uint8Array(0);
  o = new Uint8Array(0);
  m = new Uint8Array(0);
  f = 0;
  i = 1;
  l = 1;
  q = null;
  e = false;
  c = false;
  s = false;
  u = false;
  p = false;
  x = false;
  static isRequest(plaintext) {
    try {
      const adv = _ResourceAdvertisement.unpack(plaintext);
      return adv.q !== null && adv.u;
    } catch {
      return false;
    }
  }
  static isResponse(plaintext) {
    try {
      const adv = _ResourceAdvertisement.unpack(plaintext);
      return adv.q !== null && adv.p;
    } catch {
      return false;
    }
  }
  static unpack(data) {
    const value = msgpackUnpack(data);
    if (value.type !== "map" || value.map === void 0) {
      throw new Error("Invalid resource advertisement");
    }
    const adv = new _ResourceAdvertisement();
    adv.t = readInt(value.map["t"]);
    adv.d = readInt(value.map["d"]);
    adv.n = readInt(value.map["n"]);
    adv.h = Uint8Array.from(readBin(value.map["h"]));
    adv.r = Uint8Array.from(readBin(value.map["r"]));
    adv.o = Uint8Array.from(readBin(value.map["o"]));
    adv.m = Uint8Array.from(readBin(value.map["m"]));
    adv.f = readInt(value.map["f"]);
    adv.i = readInt(value.map["i"]);
    adv.l = readInt(value.map["l"]);
    adv.q = readOptionalBin(value.map["q"]);
    if (adv.q !== null) {
      adv.q = Uint8Array.from(adv.q);
    }
    adv.e = (adv.f & 1) === 1;
    adv.c = (adv.f >> 1 & 1) === 1;
    adv.s = (adv.f >> 2 & 1) === 1;
    adv.u = (adv.f >> 3 & 1) === 1;
    adv.p = (adv.f >> 4 & 1) === 1;
    adv.x = (adv.f >> 5 & 1) === 1;
    return adv;
  }
  constructor(resource) {
    if (resource === void 0) {
      return;
    }
    this.t = resource.size;
    this.d = resource.totalSize;
    this.n = resource.totalParts;
    this.h = Uint8Array.from(resource.hash);
    this.r = Uint8Array.from(resource.randomHash);
    this.o = Uint8Array.from(resource.originalHash);
    this.m = Uint8Array.from(resource.hashmapBytes);
    this.c = resource.compressed;
    this.e = resource.encrypted;
    this.s = resource.split;
    this.x = resource.hasMetadata;
    this.i = resource.segmentIndex;
    this.l = resource.totalSegments;
    this.q = resource.requestId;
    this.u = resource.requestId !== null && !resource.isResponse;
    this.p = resource.requestId !== null && resource.isResponse;
    this.f = 0 | (this.x ? 1 << 5 : 0) | (this.p ? 1 << 4 : 0) | (this.u ? 1 << 3 : 0) | (this.s ? 1 << 2 : 0) | (this.c ? 1 << 1 : 0) | (this.e ? 1 : 0);
  }
  pack() {
    return msgpackPackMap([
      ["t", msgpackPackUInt(this.t)],
      ["d", msgpackPackUInt(this.d)],
      ["n", msgpackPackUInt(this.n)],
      ["h", msgpackPackBin(this.h)],
      ["r", msgpackPackBin(this.r)],
      ["o", msgpackPackBin(this.o)],
      ["i", msgpackPackUInt(this.i)],
      ["l", msgpackPackUInt(this.l)],
      ["q", this.q === null ? msgpackPackNil() : msgpackPackBin(this.q)],
      ["f", msgpackPackUInt(this.f)],
      ["m", msgpackPackBin(this.m)]
    ]);
  }
};
var Resource = class _Resource {
  link;
  initiator;
  hash;
  originalHash;
  randomHash;
  encrypted;
  compressed;
  split = false;
  hasMetadata = false;
  segmentIndex = 1;
  totalSegments = 1;
  requestId;
  isResponse;
  hashmapBytes;
  expectedProof;
  totalSize;
  sdu;
  size = 0;
  totalParts = 0;
  status = ResourceStatus.NONE;
  data = null;
  progress = 0;
  window = RESOURCE_WINDOW;
  windowMax = RESOURCE_WINDOW_MAX_SLOW;
  windowMin = RESOURCE_WINDOW_MIN;
  windowFlexibility = RESOURCE_WINDOW_FLEXIBILITY;
  eifr = null;
  provider;
  parts = [];
  receivedParts = [];
  hashmap = [];
  reqHashlist = /* @__PURE__ */ new Set();
  callbacks;
  timeout;
  retriesLeft = RESOURCE_MAX_RETRIES;
  advSent = 0;
  consecutiveCompletedHeight = -1;
  receivedCount = 0;
  outstandingParts = 0;
  waitingForHashmap = false;
  receiverMinConsecutiveHeight = 0;
  sentParts = 0;
  hashmapHeight = 0;
  assemblyStarted = false;
  watchdogTimer = null;
  startedTransferring = null;
  constructor(provider, link, options) {
    this.provider = provider;
    this.link = link;
    this.initiator = options.initiator;
    this.hash = options.hash;
    this.originalHash = options.originalHash;
    this.randomHash = options.randomHash;
    this.encrypted = options.encrypted;
    this.compressed = options.compressed;
    this.size = options.size;
    this.totalSize = options.totalSize;
    this.totalParts = options.totalParts;
    this.hashmapBytes = options.hashmapBytes;
    this.expectedProof = options.expectedProof;
    this.parts = options.parts;
    this.requestId = options.requestId ?? null;
    this.isResponse = options.isResponse ?? false;
    this.callbacks = options.callbacks ?? {};
    this.sdu = link.mdu;
    this.timeout = options.timeout ?? (link.rtt ?? 1) * link.trafficTimeoutFactor + RESOURCE_SENDER_GRACE_TIME;
  }
  static send(link, data, options = {}) {
    const provider = link.cryptoProvider;
    const randomHash = Identity.getRandomHash(provider).subarray(0, RESOURCE_RANDOM_HASH_SIZE);
    const payload = concatBytes11(randomHash, data);
    const encryptedPayload = link.encrypt(payload);
    const sdu = link.mdu;
    const totalParts = Math.ceil(encryptedPayload.length / sdu);
    const hashInput = concatBytes11(data, randomHash);
    const hash = Identity.fullHash(provider, hashInput);
    const expectedProof = Identity.fullHash(provider, concatBytes11(data, hash));
    const parts = [];
    let hashmapBytes = new Uint8Array(0);
    let collisionGuard = [];
    let hashmapOk = false;
    while (!hashmapOk) {
      hashmapOk = true;
      parts.length = 0;
      hashmapBytes = new Uint8Array(0);
      collisionGuard = [];
      for (let index = 0; index < totalParts; index += 1) {
        const partData = encryptedPayload.subarray(index * sdu, (index + 1) * sdu);
        const mapHash = Identity.fullHash(provider, concatBytes11(partData, randomHash)).subarray(0, RESOURCE_MAPHASH_LEN);
        if (collisionGuard.some((existing) => equalBytes3(existing, mapHash))) {
          hashmapOk = false;
          break;
        }
        collisionGuard.push(mapHash);
        if (collisionGuard.length > ResourceAdvertisement.HASHMAP_MAX_LEN * 2 + 10) {
          collisionGuard.shift();
        }
        const packet = Packet.fromFields(provider, {
          headerType: PacketHeaderType.HEADER_1,
          transportType: TransportType.BROADCAST,
          destinationType: DestinationType.LINK,
          packetType: PacketType.DATA,
          destinationHash: link.linkId,
          context: PacketContext.RESOURCE,
          data: partData
        });
        parts.push({
          data: partData,
          mapHash: Uint8Array.from(mapHash),
          raw: packet.raw,
          sent: false
        });
        hashmapBytes = Uint8Array.from(concatBytes11(hashmapBytes, Uint8Array.from(mapHash)));
      }
    }
    const resource = new _Resource(provider, link, {
      initiator: true,
      hash,
      originalHash: hash,
      randomHash,
      encrypted: true,
      compressed: false,
      size: encryptedPayload.length,
      totalSize: data.length,
      totalParts,
      hashmapBytes,
      expectedProof,
      parts,
      callbacks: {
        ...options.callback === void 0 ? {} : { callback: options.callback },
        ...options.progressCallback === void 0 ? {} : { progressCallback: options.progressCallback }
      },
      ...options.timeout === void 0 ? {} : { timeout: options.timeout }
    });
    if (options.advertise !== false) {
      void resource.advertise();
    }
    return resource;
  }
  static accept(link, plaintext, packet, options = {}) {
    try {
      const adv = ResourceAdvertisement.unpack(plaintext);
      const provider = link.cryptoProvider;
      if (link.incomingResources.some((resource2) => equalBytes3(resource2.hash, adv.h))) {
        return null;
      }
      const resource = new _Resource(provider, link, {
        initiator: false,
        hash: adv.h,
        originalHash: adv.o,
        randomHash: adv.r,
        encrypted: adv.e,
        compressed: adv.c,
        size: adv.t,
        totalSize: adv.d,
        totalParts: adv.n,
        hashmapBytes: adv.m,
        expectedProof: new Uint8Array(0),
        parts: [],
        requestId: adv.q,
        isResponse: adv.p,
        callbacks: {
          ...options.callback === void 0 ? {} : { callback: options.callback },
          ...options.progressCallback === void 0 ? {} : { progressCallback: options.progressCallback }
        }
      });
      resource.status = ResourceStatus.TRANSFERRING;
      resource.receivedParts.length = adv.n;
      resource.receivedParts.fill(null);
      resource.hashmap = new Array(adv.n).fill(null);
      resource.startedTransferring = Date.now() / 1e3;
      resource.hashmapUpdate(0, adv.m);
      link.registerIncomingResource(resource);
      resource.startWatchdog();
      return resource;
    } catch {
      return null;
    }
  }
  static reject(link, plaintext) {
    try {
      const adv = ResourceAdvertisement.unpack(plaintext);
      void link.sendContext(PacketContext.RESOURCE_RCL, adv.h);
    } catch {
    }
  }
  static readRequestHash(requestData) {
    const wantsMoreHashmap = requestData[0] === RESOURCE_HASHMAP_IS_EXHAUSTED;
    const pad = wantsMoreHashmap ? 1 + RESOURCE_MAPHASH_LEN : 1;
    return requestData.subarray(pad, pad + 32);
  }
  getTransferSize() {
    return this.size;
  }
  getDataSize() {
    return this.totalSize;
  }
  getParts() {
    return this.totalParts;
  }
  isComplete() {
    return this.status === ResourceStatus.COMPLETE;
  }
  async advertise() {
    while (!this.link.readyForNewResource()) {
      this.status = ResourceStatus.QUEUED;
      await sleep(250);
    }
    const packed = new ResourceAdvertisement(this).pack();
    this.status = ResourceStatus.ADVERTISED;
    this.advSent = Date.now() / 1e3;
    this.startedTransferring = this.advSent;
    this.retriesLeft = RESOURCE_MAX_ADV_RETRIES;
    this.link.registerOutgoingResource(this);
    await this.link.sendContext(PacketContext.RESOURCE_ADV, packed);
    this.startWatchdog();
  }
  hasSeenRequest(packet) {
    const key = bytesToHex3(packet.raw);
    return this.reqHashlist.has(key);
  }
  trackRequest(packet) {
    this.reqHashlist.add(bytesToHex3(packet.raw));
  }
  async handleRequest(requestData) {
    if (this.status === ResourceStatus.FAILED) {
      return;
    }
    this.status = ResourceStatus.TRANSFERRING;
    this.retriesLeft = RESOURCE_MAX_RETRIES;
    this.startWatchdog();
    const wantsMoreHashmap = requestData[0] === RESOURCE_HASHMAP_IS_EXHAUSTED;
    const pad = wantsMoreHashmap ? 1 + RESOURCE_MAPHASH_LEN : 1;
    const requestedHashes = requestData.subarray(pad + 32);
    const mapHashes = [];
    for (let index = 0; index < requestedHashes.length; index += RESOURCE_MAPHASH_LEN) {
      mapHashes.push(requestedHashes.subarray(index, index + RESOURCE_MAPHASH_LEN));
    }
    const searchStart = this.receiverMinConsecutiveHeight;
    const searchScope = this.parts.slice(searchStart, searchStart + ResourceAdvertisement.HASHMAP_MAX_LEN * 2 + RESOURCE_WINDOW_MAX);
    for (const part of searchScope) {
      if (mapHashes.some((mapHash) => equalBytes3(mapHash, part.mapHash))) {
        if (!part.sent) {
          await this.link.sendResourcePart(part.data);
          part.sent = true;
          this.sentParts += 1;
        } else {
          await this.link.resendPacket(part.raw);
        }
      }
    }
    if (wantsMoreHashmap) {
      const lastMapHash = requestData.subarray(1, 1 + RESOURCE_MAPHASH_LEN);
      let partIndex = this.receiverMinConsecutiveHeight;
      for (const part of this.parts.slice(partIndex, partIndex + ResourceAdvertisement.HASHMAP_MAX_LEN * 2)) {
        partIndex += 1;
        if (equalBytes3(part.mapHash, lastMapHash)) {
          break;
        }
      }
      this.receiverMinConsecutiveHeight = Math.max(partIndex - 1 - RESOURCE_WINDOW_MAX, 0);
      const segment = Math.floor(partIndex / ResourceAdvertisement.HASHMAP_MAX_LEN);
      const hashmapStart = segment * ResourceAdvertisement.HASHMAP_MAX_LEN;
      const hashmapEnd = Math.min((segment + 1) * ResourceAdvertisement.HASHMAP_MAX_LEN, this.parts.length);
      let hashmap = new Uint8Array(0);
      for (let index = hashmapStart; index < hashmapEnd; index += 1) {
        const part = this.parts[index];
        if (part !== void 0) {
          hashmap = Uint8Array.from(concatBytes11(hashmap, part.mapHash));
        }
      }
      const update = msgpackPackArray2([msgpackPackUInt(segment), msgpackPackBin(hashmap)]);
      await this.link.sendContext(PacketContext.RESOURCE_HMU, concatBytes11(this.hash, update));
    }
    if (this.sentParts === this.totalParts) {
      this.status = ResourceStatus.AWAITING_PROOF;
    }
  }
  hashmapUpdatePacket(plaintext) {
    if (this.status === ResourceStatus.FAILED) {
      return;
    }
    const updateBytes = plaintext.subarray(32);
    const update = msgpackUnpack(updateBytes);
    if (update.type !== "array" || update.array === void 0 || update.array.length !== 2) {
      return;
    }
    const segment = readInt(update.array[0]);
    const hashmap = readBin(update.array[1]);
    this.hashmapUpdate(segment, hashmap);
  }
  hashmapUpdate(segment, hashmap) {
    if (this.status === ResourceStatus.FAILED) {
      return;
    }
    this.status = ResourceStatus.TRANSFERRING;
    const hashes = hashmap.length / RESOURCE_MAPHASH_LEN;
    for (let index = 0; index < hashes; index += 1) {
      const slot = index + segment * ResourceAdvertisement.HASHMAP_MAX_LEN;
      if (this.hashmap[slot] === null) {
        this.hashmapHeight += 1;
        this.hashmap[slot] = Uint8Array.from(hashmap.subarray(index * RESOURCE_MAPHASH_LEN, (index + 1) * RESOURCE_MAPHASH_LEN));
      }
    }
    this.waitingForHashmap = false;
    void this.requestNext();
  }
  receivePart(packet) {
    if (this.status === ResourceStatus.FAILED || this.status === ResourceStatus.COMPLETE) {
      return;
    }
    const partData = packet.data;
    const partHash = Identity.fullHash(this.provider, concatBytes11(partData, this.randomHash)).subarray(0, RESOURCE_MAPHASH_LEN);
    let index = Math.max(this.consecutiveCompletedHeight + 1, 0);
    const searchEnd = Math.min(index + this.window, this.hashmap.length);
    for (; index < searchEnd; index += 1) {
      const mapHash = this.hashmap[index];
      if (mapHash !== null && mapHash !== void 0 && equalBytes3(mapHash, partHash) && this.receivedParts[index] === null) {
        this.receivedParts[index] = Uint8Array.from(partData);
        this.receivedCount += 1;
        this.outstandingParts -= 1;
        if (index === this.consecutiveCompletedHeight + 1) {
          this.consecutiveCompletedHeight = index;
        }
        let cursor = this.consecutiveCompletedHeight + 1;
        while (cursor < this.receivedParts.length && this.receivedParts[cursor] !== null) {
          this.consecutiveCompletedHeight = cursor;
          cursor += 1;
        }
        this.progress = this.receivedCount / this.totalParts;
        this.callbacks.progressCallback?.(this);
        break;
      }
    }
    if (this.receivedCount === this.totalParts && !this.assemblyStarted) {
      this.assemblyStarted = true;
      void this.assemble();
    } else if (this.outstandingParts === 0) {
      void this.requestNext();
    }
  }
  async requestNext() {
    if (this.status === ResourceStatus.FAILED || this.waitingForHashmap) {
      return;
    }
    this.outstandingParts = 0;
    let hashmapExhausted = RESOURCE_HASHMAP_IS_NOT_EXHAUSTED;
    let requestedHashes = new Uint8Array(0);
    let index = 0;
    let partNumber = this.consecutiveCompletedHeight + 1;
    const searchStart = partNumber;
    for (const part of this.receivedParts.slice(searchStart, searchStart + this.window)) {
      if (part === null) {
        const mapHash = this.hashmap[partNumber];
        if (mapHash !== null && mapHash !== void 0) {
          requestedHashes = Uint8Array.from(concatBytes11(requestedHashes, mapHash));
          this.outstandingParts += 1;
          index += 1;
        } else {
          hashmapExhausted = RESOURCE_HASHMAP_IS_EXHAUSTED;
          break;
        }
      }
      partNumber += 1;
      if (index >= this.window || hashmapExhausted === RESOURCE_HASHMAP_IS_EXHAUSTED) {
        break;
      }
    }
    let requestPrefix = new Uint8Array([hashmapExhausted]);
    if (hashmapExhausted === RESOURCE_HASHMAP_IS_EXHAUSTED) {
      const lastMapHash = this.hashmap[this.hashmapHeight - 1];
      if (lastMapHash !== null && lastMapHash !== void 0) {
        requestPrefix = Uint8Array.from(concatBytes11(requestPrefix, lastMapHash));
        this.waitingForHashmap = true;
      }
    }
    const requestData = concatBytes11(requestPrefix, this.hash, requestedHashes);
    await this.link.sendContext(PacketContext.RESOURCE_REQ, requestData);
  }
  async assemble() {
    if (this.status === ResourceStatus.FAILED) {
      return;
    }
    try {
      this.status = ResourceStatus.ASSEMBLING;
      const stream = concatBytes11(...this.receivedParts.map((part) => part));
      const decrypted = this.link.decrypt(stream);
      if (decrypted === null) {
        this.status = ResourceStatus.CORRUPT;
        this.cancel();
        return;
      }
      const payload = decrypted.subarray(RESOURCE_RANDOM_HASH_SIZE);
      const calculatedHash = Identity.fullHash(this.provider, concatBytes11(payload, this.randomHash));
      if (!equalBytes3(calculatedHash, this.hash)) {
        this.status = ResourceStatus.CORRUPT;
        this.cancel();
        return;
      }
      this.data = payload;
      this.status = ResourceStatus.COMPLETE;
      this.progress = 1;
      await this.prove();
      this.link.resourceConcluded(this);
      this.callbacks.callback?.(this);
    } catch {
      this.status = ResourceStatus.CORRUPT;
      this.cancel();
    }
  }
  async prove() {
    if (this.data === null) {
      return;
    }
    const proof = Identity.fullHash(this.provider, concatBytes11(this.data, this.hash));
    const proofData = concatBytes11(this.hash, proof);
    await this.link.sendProof(PacketContext.RESOURCE_PRF, proofData);
  }
  validateProof(proofData) {
    if (this.status === ResourceStatus.FAILED) {
      return;
    }
    if (proofData.length === 64 && equalBytes3(proofData.subarray(32), this.expectedProof)) {
      this.status = ResourceStatus.COMPLETE;
      this.progress = 1;
      this.link.resourceConcluded(this);
      this.callbacks.callback?.(this);
    }
  }
  cancel() {
    this.status = ResourceStatus.FAILED;
    this.stopWatchdog();
    this.link.resourceConcluded(this);
  }
  startWatchdog() {
    this.stopWatchdog();
    this.scheduleWatchdog(250);
  }
  stopWatchdog() {
    this.watchdogTimer?.cancel();
    this.watchdogTimer = null;
  }
  scheduleWatchdog(delayMs) {
    this.watchdogTimer?.cancel();
    this.watchdogTimer = this.link.linkTransport.clock.setTimeout(() => {
      void this.watchdogTick();
    }, delayMs);
  }
  async watchdogTick() {
    if (this.status === ResourceStatus.COMPLETE || this.status === ResourceStatus.FAILED) {
      return;
    }
    const now = Date.now() / 1e3;
    if (this.status === ResourceStatus.ADVERTISED) {
      if (now >= this.advSent + this.timeout + RESOURCE_PROCESSING_GRACE) {
        if (this.retriesLeft <= 0) {
          this.cancel();
          return;
        }
        this.retriesLeft -= 1;
        await this.advertise();
      }
      this.scheduleWatchdog(250);
      return;
    }
    if (this.status === ResourceStatus.TRANSFERRING && !this.initiator) {
      if (this.outstandingParts === 0 && this.receivedCount < this.totalParts) {
        await this.requestNext();
      }
      this.scheduleWatchdog(250);
    }
  }
};
function readInt(value) {
  if (value === void 0) {
    throw new Error("Missing msgpack int");
  }
  if (value.type === "int") {
    return value.int ?? 0;
  }
  throw new Error("Expected msgpack int");
}
function readBin(value) {
  if (value === void 0 || value.type !== "bin" || value.bin === void 0) {
    throw new Error("Expected msgpack bin");
  }
  return Uint8Array.from(value.bin);
}
function readOptionalBin(value) {
  if (value === void 0 || value.type === "nil") {
    return null;
  }
  return readBin(value);
}
function msgpackPackArray2(items) {
  if (items.length > 15) {
    throw new Error("msgpackPackArray supports at most 15 items");
  }
  const body = concatBytes11(...items);
  const output = new Uint8Array(1 + body.length);
  output[0] = 144 | items.length;
  output.set(body, 1);
  return output;
}
function concatBytes11(...parts) {
  const length = parts.reduce((total, part) => total + part.length, 0);
  const output = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) {
    output.set(new Uint8Array(part), offset);
    offset += part.length;
  }
  return output;
}
function bytesToHex3(bytes) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// packages/reticulum-ts/dist/link.js
var LinkMode = {
  MODE_AES128_CBC: 0,
  MODE_AES256_CBC: 1,
  MODE_AES256_GCM: 2
};
var LINK_MODE_DEFAULT = LinkMode.MODE_AES256_CBC;
var LINK_ENABLED_MODES = [LinkMode.MODE_AES256_CBC];
var LINK_MTU_BYTEMASK = 2097151;
var LINK_MODE_BYTEMASK = 224;
var LINK_ECPUB_SIZE = 64;
var LINK_KEY_SIZE = 32;
var LINK_MTU_SIZE = 3;
var LINK_SIGNATURE_SIZE = 64;
var LINK_KEEPALIVE = 360;
var LINK_KEEPALIVE_MIN = 5;
var LINK_KEEPALIVE_MAX_RTT = 1.75;
var LINK_STALE_FACTOR = 2;
var LINK_STALE_GRACE = 5;
var LINK_TRAFFIC_TIMEOUT_FACTOR = 6;
var LINK_KEEPALIVE_TIMEOUT_FACTOR = 4;
var LINK_WATCHDOG_MAX_SLEEP_MS = 5e3;
var LINK_ESTABLISHMENT_TIMEOUT_PER_HOP = 6;
var LINK_RESPONSE_MAX_GRACE_TIME = 5;
var LinkStatus = {
  PENDING: 0,
  HANDSHAKE: 1,
  ACTIVE: 2,
  STALE: 3,
  CLOSED: 4
};
var LinkTeardownReason = {
  TIMEOUT: 1,
  INITIATOR_CLOSED: 2,
  DESTINATION_CLOSED: 3
};
var LinkResourceStrategy = {
  ACCEPT_NONE: 0,
  ACCEPT_ALL: 1,
  ACCEPT_APP: 2
};
var Link = class _Link {
  type = DestinationType.LINK;
  callbacks;
  initiator;
  owner;
  destination;
  linkId;
  hash;
  status = LinkStatus.PENDING;
  rtt = null;
  mtu = RETICULUM_MTU;
  mdu = 0;
  expectedHops = null;
  attachedInterface = null;
  establishmentCost = 0;
  requestTime = 0;
  activatedAt = null;
  lastInbound = 0;
  lastOutbound = 0;
  lastKeepalive = 0;
  lastData = 0;
  keepalive = LINK_KEEPALIVE;
  staleTime = LINK_KEEPALIVE * LINK_STALE_FACTOR;
  establishmentTimeout = LINK_ESTABLISHMENT_TIMEOUT_PER_HOP + LINK_KEEPALIVE;
  teardownReason = null;
  remoteIdentity = null;
  mode = LINK_MODE_DEFAULT;
  resourceStrategy = LinkResourceStrategy.ACCEPT_ALL;
  outgoingResourcesList = [];
  incomingResourcesList = [];
  provider;
  transport;
  clock;
  pendingRequests = [];
  privateKey = null;
  publicKeyBytes = null;
  peerPublicKeyBytes = null;
  peerSignaturePublicKeyBytes = null;
  derivedKey = null;
  token = null;
  channel = null;
  watchdogTimer = null;
  constructor(provider, transport, clock, options) {
    this.provider = provider;
    this.transport = transport;
    this.clock = clock;
    this.initiator = options.initiator;
    this.owner = options.owner;
    this.destination = options.destination;
    this.callbacks = options.callbacks ?? {};
  }
  static request(options) {
    const destination = options.destination;
    if (destination.direction !== DestinationDirection.OUT || destination.type !== DestinationType.SINGLE) {
      throw new Error("Links can only be established to OUT SINGLE destinations");
    }
    const provider = destination.cryptoProvider;
    const link = new _Link(provider, options.transport, options.transport.clock, {
      initiator: true,
      owner: null,
      destination,
      ...options.callbacks === void 0 ? {} : { callbacks: options.callbacks }
    });
    link.privateKey = provider.randomBytes(LINK_KEY_SIZE);
    const signaturePrivateKey = provider.randomBytes(LINK_KEY_SIZE);
    link.publicKeyBytes = provider.x25519PublicFromPrivate(link.privateKey);
    const signaturePublicKeyBytes = provider.ed25519PublicFromPrivate(signaturePrivateKey);
    link.expectedHops = options.transport.hopsTo(destination.hash);
    link.requestTime = Date.now() / 1e3;
    link.establishmentTimeout = LINK_ESTABLISHMENT_TIMEOUT_PER_HOP * Math.max(1, link.expectedHops ?? 1) + LINK_KEEPALIVE;
    let mtu = RETICULUM_MTU;
    if (options.linkMtuDiscovery !== false) {
      const nextHopMtu = options.transport.nextHopInterfaceMtu(destination.hash);
      if (nextHopMtu !== null) {
        mtu = nextHopMtu;
      }
    }
    link.mtu = mtu;
    link.mode = LINK_MODE_DEFAULT;
    link.updateMdu();
    const requestData = concatBytes12(link.publicKeyBytes, signaturePublicKeyBytes, _Link.signallingBytes(mtu, link.mode));
    const packet = Packet.fromFields(provider, {
      headerType: PacketHeaderType.HEADER_1,
      transportType: TransportType.BROADCAST,
      destinationType: DestinationType.SINGLE,
      packetType: PacketType.LINKREQUEST,
      destinationHash: destination.hash,
      context: PacketContext.NONE,
      data: requestData
    });
    link.setLinkId(packet);
    link.establishmentCost += packet.raw.length;
    options.transport.registerLink(link);
    link.startWatchdog();
    void options.transport.sendPacket(packet).then(() => {
      link.hadOutbound(false);
    });
    return link;
  }
  static validateRequest(owner, transport, packet, iface) {
    const data = packet.data;
    if (data.length !== LINK_ECPUB_SIZE && data.length !== LINK_ECPUB_SIZE + LINK_MTU_SIZE) {
      return null;
    }
    if (owner.identity === null) {
      return null;
    }
    try {
      const provider = owner.cryptoProvider;
      const link = new _Link(provider, transport, transport.clock, {
        initiator: false,
        owner,
        destination: null
      });
      link.privateKey = provider.randomBytes(LINK_KEY_SIZE);
      link.publicKeyBytes = provider.x25519PublicFromPrivate(link.privateKey);
      link.loadPeer(data.subarray(0, LINK_ECPUB_SIZE / 2), data.subarray(LINK_ECPUB_SIZE / 2, LINK_ECPUB_SIZE));
      link.setLinkId(packet);
      if (data.length === LINK_ECPUB_SIZE + LINK_MTU_SIZE) {
        link.mtu = _Link.mtuFromLrPacket(packet) ?? RETICULUM_MTU;
      }
      link.mode = _Link.modeFromLrPacket(packet);
      if (!LINK_ENABLED_MODES.includes(link.mode)) {
        return null;
      }
      link.updateMdu();
      link.attachedInterface = iface;
      link.establishmentCost += packet.raw.length;
      link.handshake();
      link.requestTime = Date.now() / 1e3;
      link.lastInbound = link.requestTime;
      link.establishmentTimeout = LINK_ESTABLISHMENT_TIMEOUT_PER_HOP * Math.max(1, packet.hops) + LINK_KEEPALIVE;
      transport.registerLink(link);
      link.startWatchdog();
      void link.prove();
      return link;
    } catch {
      return null;
    }
  }
  static linkIdFromLrPacket(provider, packet) {
    let hashablePart = packet.hashablePart();
    if (packet.data.length > LINK_ECPUB_SIZE) {
      const diff = packet.data.length - LINK_ECPUB_SIZE;
      hashablePart = hashablePart.subarray(0, hashablePart.length - diff);
    }
    return Identity.truncatedHash(provider, hashablePart);
  }
  static signallingBytes(mtu, mode) {
    if (!LINK_ENABLED_MODES.includes(mode)) {
      throw new Error(`Requested link mode ${mode} is not enabled`);
    }
    const signallingValue = (mtu & LINK_MTU_BYTEMASK) + ((mode << 5 & LINK_MODE_BYTEMASK) << 16);
    const buffer = new ArrayBuffer(4);
    const view = new DataView(buffer);
    view.setUint32(0, signallingValue, false);
    return new Uint8Array(buffer).subarray(1);
  }
  static modeFromLrPacket(packet) {
    if (packet.data.length > LINK_ECPUB_SIZE) {
      return (packet.data[LINK_ECPUB_SIZE] & LINK_MODE_BYTEMASK) >> 5;
    }
    return LINK_MODE_DEFAULT;
  }
  static modeFromLpPacket(packet) {
    const base = LINK_SIGNATURE_SIZE + LINK_ECPUB_SIZE / 2;
    if (packet.data.length > base) {
      return (packet.data[base] & LINK_MODE_BYTEMASK) >> 5;
    }
    return LINK_MODE_DEFAULT;
  }
  static mtuBytes(mtu) {
    const value = mtu & 16777215;
    return new Uint8Array([value >> 16 & 255, value >> 8 & 255, value & 255]);
  }
  static mtuFromLrPacket(packet) {
    if (packet.data.length !== LINK_ECPUB_SIZE + LINK_MTU_SIZE) {
      return null;
    }
    const offset = LINK_ECPUB_SIZE;
    return (packet.data[offset] << 16 | packet.data[offset + 1] << 8 | packet.data[offset + 2]) & LINK_MTU_BYTEMASK;
  }
  static mtuFromLpPacket(packet) {
    const base = LINK_SIGNATURE_SIZE + LINK_ECPUB_SIZE / 2;
    if (packet.data.length !== base + LINK_MTU_SIZE) {
      return null;
    }
    const mtuBytes = packet.data.subarray(base, base + LINK_MTU_SIZE);
    return (mtuBytes[0] << 16 | mtuBytes[1] << 8 | mtuBytes[2]) & LINK_MTU_BYTEMASK;
  }
  setLinkId(packet) {
    this.linkId = _Link.linkIdFromLrPacket(this.provider, packet);
    this.hash = this.linkId;
  }
  loadPeer(peerPublicKey, peerSignaturePublicKey) {
    this.peerPublicKeyBytes = Uint8Array.from(peerPublicKey);
    this.peerSignaturePublicKeyBytes = Uint8Array.from(peerSignaturePublicKey);
  }
  handshake() {
    if (this.status !== LinkStatus.PENDING || this.privateKey === null || this.peerPublicKeyBytes === null) {
      throw new Error("Invalid link state for handshake");
    }
    this.status = LinkStatus.HANDSHAKE;
    const sharedKey = this.provider.x25519SharedSecret(this.privateKey, this.peerPublicKeyBytes);
    const derivedKeyLength = this.mode === LinkMode.MODE_AES256_CBC ? 64 : 32;
    this.derivedKey = rnsHkdf(this.provider, derivedKeyLength, sharedKey, this.linkId, null);
  }
  async prove() {
    if (this.owner === null || this.publicKeyBytes === null || this.owner.identity === null) {
      throw new Error("Responder link is missing owner or key material");
    }
    const signallingBytes = _Link.signallingBytes(this.mtu, this.mode);
    const ownerSigPublicKey = this.owner.identity.getPublicKey().subarray(LINK_ECPUB_SIZE / 2, LINK_ECPUB_SIZE);
    const signedData = concatBytes12(this.linkId, this.publicKeyBytes, ownerSigPublicKey, signallingBytes);
    const signature = this.owner.identity.sign(signedData);
    const proofData = concatBytes12(signature, this.publicKeyBytes, signallingBytes);
    const proofPacket = Packet.fromFields(this.provider, {
      headerType: PacketHeaderType.HEADER_1,
      transportType: TransportType.BROADCAST,
      destinationType: DestinationType.LINK,
      packetType: PacketType.PROOF,
      destinationHash: this.linkId,
      context: PacketContext.LRPROOF,
      data: proofData
    });
    this.establishmentCost += proofPacket.raw.length;
    await this.transport.sendPacket(proofPacket, {
      attachedInterface: this.attachedInterface
    });
    this.hadOutbound(false);
  }
  async validateProof(packet, iface) {
    if (this.status !== LinkStatus.PENDING || !this.initiator || this.destination === null) {
      return;
    }
    try {
      const mode = _Link.modeFromLpPacket(packet);
      if (mode !== this.mode) {
        throw new Error(`Invalid link mode ${mode} in link request proof`);
      }
      let proofData = packet.data;
      let signallingBytes = new Uint8Array(0);
      let confirmedMtu = null;
      if (proofData.length === LINK_SIGNATURE_SIZE + LINK_ECPUB_SIZE / 2 + LINK_MTU_SIZE) {
        confirmedMtu = _Link.mtuFromLpPacket(packet);
        signallingBytes = Uint8Array.from(_Link.signallingBytes(confirmedMtu ?? RETICULUM_MTU, mode));
        proofData = proofData.subarray(0, LINK_SIGNATURE_SIZE + LINK_ECPUB_SIZE / 2);
      }
      if (proofData.length !== LINK_SIGNATURE_SIZE + LINK_ECPUB_SIZE / 2) {
        throw new Error("Invalid link proof size");
      }
      const peerPublicKey = proofData.subarray(LINK_SIGNATURE_SIZE, LINK_SIGNATURE_SIZE + LINK_ECPUB_SIZE / 2);
      const peerSignaturePublicKey = this.destination.identity.getPublicKey().subarray(LINK_ECPUB_SIZE / 2, LINK_ECPUB_SIZE);
      this.loadPeer(peerPublicKey, peerSignaturePublicKey);
      this.handshake();
      const signedData = concatBytes12(this.linkId, this.peerPublicKeyBytes, peerSignaturePublicKey, signallingBytes);
      const signature = proofData.subarray(0, LINK_SIGNATURE_SIZE);
      if (!this.destination.identity.validate(signature, signedData)) {
        throw new Error("Invalid link proof signature");
      }
      this.rtt = Date.now() / 1e3 - this.requestTime;
      this.attachedInterface = iface;
      this.mtu = confirmedMtu ?? RETICULUM_MTU;
      this.updateMdu();
      this.updateKeepalive();
      this.status = LinkStatus.ACTIVE;
      this.activatedAt = Date.now() / 1e3;
      this.establishmentCost += packet.raw.length;
      this.transport.activateLink(this);
      const rttPacket = Packet.fromFields(this.provider, {
        headerType: PacketHeaderType.HEADER_1,
        transportType: TransportType.BROADCAST,
        destinationType: DestinationType.LINK,
        packetType: PacketType.DATA,
        destinationHash: this.linkId,
        context: PacketContext.LRRTT,
        data: this.encrypt(msgpackEncodeFloat(this.rtt))
      });
      await this.transport.sendPacket(rttPacket, { attachedInterface: this.attachedInterface });
      this.hadOutbound(false);
      this.callbacks.linkEstablished?.(this);
    } catch {
      this.status = LinkStatus.CLOSED;
    }
  }
  async handleRttPacket(packet) {
    if (this.initiator || this.status === LinkStatus.CLOSED) {
      return;
    }
    try {
      const measuredRtt = Date.now() / 1e3 - this.requestTime;
      const plaintext = this.decrypt(packet.data);
      if (plaintext === null) {
        throw new Error("Could not decrypt RTT packet");
      }
      const remoteRtt = msgpackDecodeFloat(plaintext);
      this.rtt = Math.max(measuredRtt, remoteRtt);
      this.updateKeepalive();
      this.status = LinkStatus.ACTIVE;
      this.activatedAt = Date.now() / 1e3;
      this.callbacks.linkEstablished?.(this);
    } catch {
      await this.teardown();
    }
  }
  async receive(packet, iface) {
    if (this.status === LinkStatus.CLOSED) {
      return;
    }
    if (this.initiator && packet.context === PacketContext.KEEPALIVE && packet.data.length === 1 && packet.data[0] === 255) {
      return;
    }
    if (this.attachedInterface !== null && iface !== this.attachedInterface) {
      return;
    }
    this.lastInbound = Date.now() / 1e3;
    if (packet.context !== PacketContext.KEEPALIVE) {
      this.lastData = this.lastInbound;
    }
    if (this.status === LinkStatus.STALE) {
      this.status = LinkStatus.ACTIVE;
    }
    if (packet.packetType !== PacketType.DATA) {
      return;
    }
    if (packet.context === PacketContext.LRRTT) {
      await this.handleRttPacket(packet);
      return;
    }
    if (packet.context === PacketContext.KEEPALIVE) {
      if (!this.initiator && packet.data.length === 1 && packet.data[0] === 255) {
        await this.sendKeepaliveReply();
      }
      return;
    }
    if (packet.context === PacketContext.LINKCLOSE) {
      await this.handleTeardownPacket(packet);
      return;
    }
    if (packet.context === PacketContext.LINKIDENTIFY) {
      await this.handleIdentifyPacket(packet);
      return;
    }
    if (packet.context === PacketContext.REQUEST) {
      await this.handleRequestPacket(packet);
      return;
    }
    if (packet.context === PacketContext.RESPONSE) {
      await this.handleResponsePacket(packet);
      return;
    }
    if (packet.context === PacketContext.CHANNEL) {
      await this.handleChannelPacket(packet);
      return;
    }
    if (packet.context === PacketContext.RESOURCE_ADV) {
      await this.handleResourceAdvertisementPacket(packet);
      return;
    }
    if (packet.context === PacketContext.RESOURCE_REQ) {
      await this.handleResourceRequestPacket(packet);
      return;
    }
    if (packet.context === PacketContext.RESOURCE_HMU) {
      await this.handleResourceHashmapUpdatePacket(packet);
      return;
    }
    if (packet.context === PacketContext.RESOURCE_ICL) {
      await this.handleResourceCancelPacket(packet, true);
      return;
    }
    if (packet.context === PacketContext.RESOURCE_RCL) {
      await this.handleResourceCancelPacket(packet, false);
      return;
    }
    if (packet.context === PacketContext.RESOURCE) {
      await this.handleResourcePartPacket(packet);
      return;
    }
    if (packet.context === PacketContext.NONE) {
      const plaintext = this.decrypt(packet.data);
      if (plaintext !== null) {
        this.callbacks.packet?.(plaintext, packet);
      }
    }
  }
  identify(identity) {
    if (!this.initiator || this.status !== LinkStatus.ACTIVE || identity === null) {
      return;
    }
    const signedData = concatBytes12(this.linkId, identity.getPublicKey());
    const signature = identity.sign(signedData);
    const proofData = concatBytes12(identity.getPublicKey(), signature);
    void this.sendContext(PacketContext.LINKIDENTIFY, proofData);
  }
  getRemoteIdentity() {
    return this.remoteIdentity;
  }
  get cryptoProvider() {
    return this.provider;
  }
  get linkTransport() {
    return this.transport;
  }
  get incomingResources() {
    return this.incomingResourcesList;
  }
  get outgoingResources() {
    return this.outgoingResourcesList;
  }
  async sendProof(context, data) {
    const packet = Packet.fromFields(this.provider, {
      headerType: PacketHeaderType.HEADER_1,
      transportType: TransportType.BROADCAST,
      destinationType: DestinationType.LINK,
      packetType: PacketType.PROOF,
      destinationHash: this.linkId,
      context,
      data
    });
    await this.transport.sendPacket(packet, { attachedInterface: this.attachedInterface });
  }
  async request(path, data = null, options = {}) {
    if (this.status !== LinkStatus.ACTIVE || this.rtt === null) {
      return false;
    }
    const pathHash = Identity.truncatedHash(this.provider, new TextEncoder().encode(path));
    const packedRequest = msgpackPackRequest(Date.now() / 1e3, pathHash, data);
    const timeout = options.timeout ?? this.rtt * LINK_TRAFFIC_TIMEOUT_FACTOR + LINK_RESPONSE_MAX_GRACE_TIME * 1.125;
    if (packedRequest.length > this.mdu) {
      return false;
    }
    const packet = Packet.fromFields(this.provider, {
      headerType: PacketHeaderType.HEADER_1,
      transportType: TransportType.BROADCAST,
      destinationType: DestinationType.LINK,
      packetType: PacketType.DATA,
      destinationHash: this.linkId,
      context: PacketContext.REQUEST,
      data: this.encrypt(packedRequest)
    });
    const pending = new LinkRequestReceipt({
      link: this,
      requestId: packet.truncatedHash(),
      timeout,
      requestSize: packedRequest.length,
      callbacks: {
        ...options.response === void 0 ? {} : { response: options.response },
        ...options.failed === void 0 ? {} : { failed: options.failed }
      }
    });
    const sentReceipt = await this.transport.sendPacket(packet, {
      attachedInterface: this.attachedInterface,
      createReceipt: true
    });
    this.hadOutbound(false);
    if (sentReceipt === null) {
      this.unregisterPendingRequest(pending);
      return false;
    }
    pending.attachPacketReceipt(sentReceipt);
    return pending;
  }
  getChannel() {
    if (this.channel === null) {
      this.channel = new Channel(new LinkChannelOutlet(this));
    }
    return this.channel;
  }
  readyForNewResource() {
    return this.outgoingResourcesList.length === 0;
  }
  registerOutgoingResource(resource) {
    if (!this.outgoingResourcesList.includes(resource)) {
      this.outgoingResourcesList.push(resource);
    }
  }
  registerIncomingResource(resource) {
    if (!this.incomingResourcesList.includes(resource)) {
      this.incomingResourcesList.push(resource);
    }
  }
  hasIncomingResource(resource) {
    return this.incomingResourcesList.some((incoming) => equalBytes3(incoming.hash, resource.hash));
  }
  resourceConcluded(resource) {
    const outgoingIndex = this.outgoingResourcesList.indexOf(resource);
    if (outgoingIndex >= 0) {
      this.outgoingResourcesList.splice(outgoingIndex, 1);
    }
    const incomingIndex = this.incomingResourcesList.indexOf(resource);
    if (incomingIndex >= 0) {
      this.incomingResourcesList.splice(incomingIndex, 1);
    }
  }
  setResourceStrategy(strategy) {
    this.resourceStrategy = strategy;
  }
  get trafficTimeoutFactor() {
    return LINK_TRAFFIC_TIMEOUT_FACTOR;
  }
  registerPendingRequest(receipt) {
    if (!this.pendingRequests.includes(receipt)) {
      this.pendingRequests.push(receipt);
    }
  }
  unregisterPendingRequest(receipt) {
    const index = this.pendingRequests.indexOf(receipt);
    if (index >= 0) {
      this.pendingRequests.splice(index, 1);
    }
  }
  encrypt(plaintext) {
    return this.tokenInstance().encrypt(plaintext);
  }
  decrypt(ciphertext) {
    try {
      return this.tokenInstance().decrypt(ciphertext);
    } catch {
      return null;
    }
  }
  async send(data) {
    await this.sendContext(PacketContext.NONE, data);
  }
  async sendContext(context, data, options = {}) {
    if (this.status !== LinkStatus.ACTIVE) {
      throw new Error("Cannot send on inactive link");
    }
    const payload = options.encrypt === false ? data : this.encrypt(data);
    const packet = Packet.fromFields(this.provider, {
      headerType: PacketHeaderType.HEADER_1,
      transportType: TransportType.BROADCAST,
      destinationType: DestinationType.LINK,
      packetType: PacketType.DATA,
      destinationHash: this.linkId,
      context,
      data: payload
    });
    const receipt = await this.transport.sendPacket(packet, {
      attachedInterface: this.attachedInterface,
      createReceipt: options.createReceipt ?? false
    });
    this.hadOutbound(context === PacketContext.KEEPALIVE);
    return { raw: packet.raw, receipt };
  }
  async sendResourcePart(data) {
    await this.sendContext(PacketContext.RESOURCE, data, { encrypt: false });
  }
  async resendPacket(raw, options = {}) {
    const packet = Packet.decode(this.provider, raw);
    if (packet === null || this.attachedInterface === null) {
      return null;
    }
    const receipt = await this.transport.sendPacket(packet, {
      attachedInterface: this.attachedInterface,
      createReceipt: options.createReceipt ?? false
    });
    return { raw, receipt };
  }
  async teardown() {
    if (this.status === LinkStatus.PENDING || this.status === LinkStatus.CLOSED) {
      this.close();
      return;
    }
    await this.sendTeardownPacket();
    this.teardownReason = this.initiator ? LinkTeardownReason.INITIATOR_CLOSED : LinkTeardownReason.DESTINATION_CLOSED;
    this.close();
  }
  close() {
    this.stopWatchdog();
    this.status = LinkStatus.CLOSED;
    this.privateKey = null;
    this.publicKeyBytes = null;
    this.derivedKey = null;
    this.token = null;
    this.channel?.shutdown();
    this.channel = null;
    for (const resource of [...this.incomingResourcesList, ...this.outgoingResourcesList]) {
      resource.cancel();
    }
    this.incomingResourcesList.length = 0;
    this.outgoingResourcesList.length = 0;
    this.transport.unregisterLink(this);
    this.callbacks.linkClosed?.(this);
  }
  updateMdu() {
    const headerMax = 18;
    const ifacMin = 0;
    const blockSize = 16;
    this.mdu = Math.floor((this.mtu - ifacMin - headerMax - 48) / blockSize) * blockSize - 1;
  }
  hadOutbound(isKeepalive = false) {
    const now = Date.now() / 1e3;
    this.lastOutbound = now;
    this.lastInbound = now;
    if (isKeepalive) {
      this.lastKeepalive = now;
    } else {
      this.lastData = now;
    }
  }
  hopsMatch(packet) {
    if (this.expectedHops === null) {
      return true;
    }
    return packet.hops === this.expectedHops || this.expectedHops === PATHFINDER_MAX_HOPS;
  }
  async handleIdentifyPacket(packet) {
    if (this.initiator) {
      return;
    }
    const plaintext = this.decrypt(packet.data);
    if (plaintext === null || plaintext.length !== IDENTITY_KEY_SIZE + LINK_SIGNATURE_SIZE) {
      return;
    }
    const publicKey = plaintext.subarray(0, IDENTITY_KEY_SIZE);
    const signature = plaintext.subarray(IDENTITY_KEY_SIZE, IDENTITY_KEY_SIZE + LINK_SIGNATURE_SIZE);
    const identity = Identity.fromPublicKey(this.provider, publicKey);
    if (identity === null) {
      return;
    }
    const signedData = concatBytes12(this.linkId, publicKey);
    if (!identity.validate(signature, signedData)) {
      return;
    }
    this.remoteIdentity = identity;
    this.callbacks.remoteIdentified?.(this, identity);
  }
  async handleRequestPacket(packet) {
    const requestId = packet.truncatedHash();
    const plaintext = this.decrypt(packet.data);
    if (plaintext === null) {
      return;
    }
    try {
      const [requestedAt, pathHash, requestData] = msgpackUnpackRequest(plaintext);
      const handlerDestination = this.owner ?? this.destination;
      if (handlerDestination === null) {
        return;
      }
      const handler = handlerDestination.getRequestHandler(pathHash);
      if (handler === void 0) {
        return;
      }
      let allowed = false;
      if (handler.allow !== DestinationAllowPolicy.ALLOW_NONE) {
        if (handler.allow === DestinationAllowPolicy.ALLOW_LIST) {
          allowed = this.remoteIdentity !== null && handler.allowedList.some((entry) => equalBytes3(entry, this.remoteIdentity.hash));
        } else if (handler.allow === DestinationAllowPolicy.ALLOW_ALL) {
          allowed = true;
        }
      }
      if (!allowed) {
        return;
      }
      const response = await handler.responseGenerator(handler.path, requestData, requestId, this.linkId, this.remoteIdentity, requestedAt);
      if (response === null) {
        return;
      }
      const packedResponse = msgpackPackResponse(requestId, response);
      if (packedResponse.length <= this.mdu) {
        await this.sendContext(PacketContext.RESPONSE, packedResponse);
      }
    } catch {
    }
  }
  async handleResponsePacket(packet) {
    const plaintext = this.decrypt(packet.data);
    if (plaintext === null) {
      return;
    }
    try {
      const [requestId, responseData] = msgpackUnpackResponse(plaintext);
      for (const pendingRequest of [...this.pendingRequests]) {
        if (pendingRequest.matchesRequestId(requestId)) {
          pendingRequest.responseReceived(responseData);
          return;
        }
      }
    } catch {
    }
  }
  async handleChannelPacket(packet) {
    const plaintext = this.decrypt(packet.data);
    if (plaintext === null) {
      return;
    }
    this.getChannel().receive(plaintext);
  }
  async handleResourceAdvertisementPacket(packet) {
    const plaintext = this.decrypt(packet.data);
    if (plaintext === null) {
      return;
    }
    if (ResourceAdvertisement.isRequest(plaintext)) {
      Resource.accept(this, plaintext, packet, {
        callback: (resource) => this.callbacks.resourceConcluded?.(resource)
      });
      return;
    }
    if (this.resourceStrategy === LinkResourceStrategy.ACCEPT_NONE) {
      return;
    }
    if (this.resourceStrategy === LinkResourceStrategy.ACCEPT_APP) {
      try {
        const advertisement = ResourceAdvertisement.unpack(plaintext);
        if (this.callbacks.resource?.(advertisement) !== true) {
          Resource.reject(this, plaintext);
          return;
        }
      } catch {
        return;
      }
    }
    Resource.accept(this, plaintext, packet, {
      callback: (resource) => this.callbacks.resourceConcluded?.(resource)
    });
  }
  async handleResourceRequestPacket(packet) {
    const plaintext = this.decrypt(packet.data);
    if (plaintext === null) {
      return;
    }
    const resourceHash = Resource.readRequestHash(plaintext);
    for (const resource of this.outgoingResourcesList) {
      if (equalBytes3(resource.hash, resourceHash) && !resource.hasSeenRequest(packet)) {
        resource.trackRequest(packet);
        await resource.handleRequest(plaintext);
        return;
      }
    }
  }
  async handleResourceHashmapUpdatePacket(packet) {
    const plaintext = this.decrypt(packet.data);
    if (plaintext === null) {
      return;
    }
    const resourceHash = plaintext.subarray(0, 32);
    for (const resource of this.incomingResourcesList) {
      if (equalBytes3(resource.hash, resourceHash)) {
        resource.hashmapUpdatePacket(plaintext);
        return;
      }
    }
  }
  async handleResourceCancelPacket(packet, incoming) {
    const plaintext = this.decrypt(packet.data);
    if (plaintext === null) {
      return;
    }
    const resources = incoming ? this.incomingResourcesList : this.outgoingResourcesList;
    for (const resource of resources) {
      if (equalBytes3(resource.hash, plaintext.subarray(0, 32))) {
        resource.cancel();
        return;
      }
    }
  }
  async handleResourceProof(packet) {
    const resourceHash = packet.data.subarray(0, 32);
    for (const resource of this.outgoingResourcesList) {
      if (equalBytes3(resource.hash, resourceHash)) {
        resource.validateProof(packet.data);
        return;
      }
    }
  }
  async handleResourcePartPacket(packet) {
    for (const resource of this.incomingResourcesList) {
      resource.receivePart(packet);
    }
  }
  async handleTeardownPacket(packet) {
    const plaintext = this.decrypt(packet.data);
    if (plaintext === null || !equalLinkId(plaintext, this.linkId)) {
      return;
    }
    this.teardownReason = this.initiator ? LinkTeardownReason.DESTINATION_CLOSED : LinkTeardownReason.INITIATOR_CLOSED;
    this.close();
  }
  async sendTeardownPacket() {
    await this.sendContext(PacketContext.LINKCLOSE, this.linkId);
  }
  async sendKeepalive() {
    await this.sendContext(PacketContext.KEEPALIVE, new Uint8Array([255]));
  }
  async sendKeepaliveReply() {
    await this.sendContext(PacketContext.KEEPALIVE, new Uint8Array([254]));
  }
  updateKeepalive() {
    if (this.rtt === null) {
      return;
    }
    this.keepalive = Math.max(Math.min(this.rtt * (LINK_KEEPALIVE / LINK_KEEPALIVE_MAX_RTT), LINK_KEEPALIVE), LINK_KEEPALIVE_MIN);
    this.staleTime = this.keepalive * LINK_STALE_FACTOR;
  }
  startWatchdog() {
    this.scheduleWatchdog(25);
  }
  stopWatchdog() {
    this.watchdogTimer?.cancel();
    this.watchdogTimer = null;
  }
  scheduleWatchdog(delayMs) {
    this.watchdogTimer?.cancel();
    this.watchdogTimer = this.clock.setTimeout(() => {
      this.watchdogTick();
    }, delayMs);
  }
  watchdogTick() {
    if (this.status === LinkStatus.CLOSED) {
      return;
    }
    const now = Date.now() / 1e3;
    if (this.status === LinkStatus.PENDING || this.status === LinkStatus.HANDSHAKE) {
      if (now >= this.requestTime + this.establishmentTimeout) {
        this.teardownReason = LinkTeardownReason.TIMEOUT;
        this.close();
        return;
      }
      this.scheduleWatchdog(Math.max((this.requestTime + this.establishmentTimeout - now) * 1e3, 25));
      return;
    }
    if (this.status === LinkStatus.ACTIVE || this.status === LinkStatus.STALE) {
      const activatedAt = this.activatedAt ?? 0;
      const lastInbound = Math.max(this.lastInbound, activatedAt);
      if (this.status === LinkStatus.STALE) {
        void this.sendTeardownPacket();
        this.teardownReason = LinkTeardownReason.TIMEOUT;
        this.close();
        return;
      }
      if (now >= lastInbound + this.keepalive) {
        if (this.initiator && now >= this.lastKeepalive + this.keepalive) {
          void this.sendKeepalive();
        }
        if (now >= lastInbound + this.staleTime) {
          this.status = LinkStatus.STALE;
          this.scheduleWatchdog(Math.max((this.rtt ?? 0.025) * LINK_KEEPALIVE_TIMEOUT_FACTOR * 1e3 + LINK_STALE_GRACE * 1e3, 25));
          return;
        }
        this.scheduleWatchdog(Math.min(this.keepalive * 1e3, LINK_WATCHDOG_MAX_SLEEP_MS));
        return;
      }
      this.scheduleWatchdog(Math.min(Math.max((lastInbound + this.keepalive - now) * 1e3, 25), LINK_WATCHDOG_MAX_SLEEP_MS));
    }
  }
  tokenInstance() {
    if (this.derivedKey === null) {
      throw new Error("Link has no derived key");
    }
    if (this.token === null) {
      this.token = new Token(this.provider, this.derivedKey);
    }
    return this.token;
  }
};
function concatBytes12(...parts) {
  const length = parts.reduce((total, part) => total + part.length, 0);
  const output = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) {
    output.set(new Uint8Array(part), offset);
    offset += part.length;
  }
  return output;
}
function msgpackEncodeFloat(value) {
  const buffer = new ArrayBuffer(9);
  const view = new DataView(buffer);
  view.setUint8(0, 203);
  view.setFloat64(1, value, false);
  return new Uint8Array(buffer);
}
function msgpackDecodeFloat(bytes) {
  if (bytes.length >= 9 && bytes[0] === 203) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    return view.getFloat64(1, false);
  }
  if (bytes.length >= 5 && bytes[0] === 202) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    return view.getFloat32(1, false);
  }
  throw new Error("Expected msgpack float");
}
function equalLinkId(left, right) {
  return equalBytes3(left, right);
}

// packages/reticulum-ts/dist/registered-destination.js
var DestinationAllowPolicy = {
  ALLOW_NONE: 0,
  ALLOW_ALL: 1,
  ALLOW_LIST: 2
};
var RegisteredDestination = class extends Destination {
  cryptoProvider;
  packetCallback = null;
  linkEstablishedCallback = null;
  proofRequestedCallback = null;
  proofStrategy = DestinationProofStrategy.PROVE_NONE;
  acceptLinkRequests = true;
  links = [];
  requestHandlers = /* @__PURE__ */ new Map();
  transport = null;
  get activeLinks() {
    return this.links;
  }
  constructor(options) {
    super(options.provider, options);
    this.cryptoProvider = options.provider;
  }
  attachTransport(transport) {
    this.transport = transport;
    transport.registerDestination(this);
  }
  setPacketCallback(callback) {
    this.packetCallback = callback;
  }
  setLinkEstablishedCallback(callback) {
    this.linkEstablishedCallback = callback;
  }
  setProofRequestedCallback(callback) {
    this.proofRequestedCallback = callback;
  }
  setProofStrategy(strategy) {
    this.proofStrategy = strategy;
  }
  setAcceptLinkRequests(accept) {
    this.acceptLinkRequests = accept;
  }
  registerRequestHandler(path, responseGenerator, allow = DestinationAllowPolicy.ALLOW_NONE, allowedList = []) {
    if (path.length === 0) {
      throw new Error("Invalid path specified");
    }
    const pathHash = Identity.truncatedHash(this.cryptoProvider, new TextEncoder().encode(path));
    this.requestHandlers.set(bytesToHex2(pathHash), {
      path,
      pathHash,
      responseGenerator,
      allow,
      allowedList
    });
  }
  deregisterRequestHandler(path) {
    const pathHash = Identity.truncatedHash(this.cryptoProvider, new TextEncoder().encode(path));
    return this.requestHandlers.delete(bytesToHex2(pathHash));
  }
  getRequestHandler(pathHash) {
    return this.requestHandlers.get(bytesToHex2(pathHash));
  }
  requestLink(callbacks) {
    if (this.transport === null) {
      throw new Error("Destination is not attached to a Reticulum instance");
    }
    return Link.request({
      destination: this,
      transport: this.transport,
      ...callbacks === void 0 ? {} : { callbacks }
    });
  }
  handleLinkRequest(packet, iface) {
    if (!this.acceptLinkRequests || this.direction !== DestinationDirection.IN) {
      return;
    }
    const link = Link.validateRequest(this, this.transport, packet, iface);
    if (link !== null) {
      if (this.linkEstablishedCallback !== null) {
        const callback = this.linkEstablishedCallback;
        const existing = link.callbacks.linkEstablished;
        link.callbacks.linkEstablished = (establishedLink) => {
          existing?.(establishedLink);
          callback(establishedLink);
        };
      }
      this.links.push(link);
    }
  }
  dispatchPacket(data, packet) {
    this.packetCallback?.(data, packet);
  }
  shouldProve(packet) {
    if (this.proofRequestedCallback === null) {
      return false;
    }
    return this.proofRequestedCallback(packet);
  }
  decrypt(ciphertext) {
    if (this.type === DestinationType.PLAIN) {
      return ciphertext;
    }
    if (this.identity === null) {
      return null;
    }
    return this.identity.decrypt(ciphertext).plaintext;
  }
  async announce(options = {}) {
    if (this.transport === null) {
      throw new Error("Destination is not attached to a Reticulum instance");
    }
    if (this.type !== DestinationType.SINGLE || this.direction !== DestinationDirection.IN) {
      throw new Error("Only IN SINGLE destinations can be announced");
    }
    if (this.identity === null) {
      throw new Error("Announce destination must hold an identity");
    }
    const packet = Announce.buildPacket(this.cryptoProvider, this, {
      ...options.appData === void 0 ? {} : { appData: options.appData },
      ...options.pathResponse === true ? { pathResponse: true } : {}
    });
    await this.transport.sendPacket(packet, {
      attachedInterface: options.attachedInterface ?? null
    });
  }
  async answerPathRequest(iface) {
    await this.announce({ pathResponse: true, attachedInterface: iface });
  }
  async send(data, options = {}) {
    if (this.transport === null) {
      throw new Error("Destination is not attached to a Reticulum instance");
    }
    if (this.direction !== DestinationDirection.OUT) {
      throw new Error("Only OUT destinations can send packets");
    }
    const ciphertext = this.type === DestinationType.PLAIN ? data : this.identity?.encrypt(data) ?? null;
    if (ciphertext === null) {
      throw new Error("Destination cannot encrypt outbound data");
    }
    const packet = Packet.fromFields(this.cryptoProvider, {
      headerType: PacketHeaderType.HEADER_1,
      transportType: TransportType.BROADCAST,
      destinationType: this.type,
      packetType: PacketType.DATA,
      destinationHash: this.hash,
      context: PacketContext.NONE,
      data: ciphertext
    });
    return this.transport.sendPacket(packet, {
      createReceipt: options.createReceipt ?? false,
      attachedInterface: options.attachedInterface ?? null
    });
  }
};

// packages/reticulum-ts/dist/transport/rate.js
var MAX_RATE_TIMESTAMPS = 16;
var DEFAULT_RATE_TARGET = 0.2;
var DEFAULT_RATE_GRACE = 2;
var DEFAULT_RATE_PENALTY = 60;
var AnnounceRateLimiter = class {
  table = /* @__PURE__ */ new Map();
  rateTarget;
  rateGrace;
  ratePenalty;
  constructor(options = {}) {
    this.rateTarget = options.rateTarget ?? DEFAULT_RATE_TARGET;
    this.rateGrace = options.rateGrace ?? DEFAULT_RATE_GRACE;
    this.ratePenalty = options.ratePenalty ?? DEFAULT_RATE_PENALTY;
  }
  isBlocked(destinationKey, now = Date.now() / 1e3) {
    const entry = this.table.get(destinationKey);
    if (entry === void 0) {
      return false;
    }
    return now <= entry.blockedUntil;
  }
  record(destinationKey, now = Date.now() / 1e3) {
    let entry = this.table.get(destinationKey);
    if (entry === void 0) {
      entry = { last: now, rateViolations: 0, blockedUntil: 0, timestamps: [now] };
      this.table.set(destinationKey, entry);
      return false;
    }
    entry.timestamps.push(now);
    while (entry.timestamps.length > MAX_RATE_TIMESTAMPS) {
      entry.timestamps.shift();
    }
    if (now <= entry.blockedUntil) {
      return true;
    }
    const currentRate = now - entry.last;
    if (currentRate < this.rateTarget) {
      entry.rateViolations += 1;
    } else {
      entry.rateViolations = Math.max(0, entry.rateViolations - 1);
    }
    if (entry.rateViolations > this.rateGrace) {
      entry.blockedUntil = entry.last + this.rateTarget + this.ratePenalty;
      return true;
    }
    entry.last = now;
    return false;
  }
};

// packages/reticulum-ts/dist/transport/transport.js
var REVERSE_TIMEOUT_SECONDS = 8 * 60;
var TransportNode = class extends LeafTransport {
  linkTable = /* @__PURE__ */ new Map();
  reverseTable = /* @__PURE__ */ new Map();
  announceRateLimiter;
  discoveryPathRequests = /* @__PURE__ */ new Map();
  constructor(options) {
    super({ ...options, transportEnabled: true });
    this.announceRateLimiter = options.announceRateLimiter ?? new AnnounceRateLimiter();
  }
  async inbound(packet, iface) {
    const workingPacket = cloneWithHops(this.provider, packet, packet.hops + 1);
    if (!this.shouldAcceptPacket(workingPacket)) {
      return;
    }
    const rememberHash = !this.shouldDeferPacketHash(workingPacket);
    if (rememberHash) {
      this.packetHashes.add(hashKey2(workingPacket.hash()));
    }
    if (await this.relayTransportPacket(workingPacket, iface)) {
      if (!rememberHash) {
        this.packetHashes.add(hashKey2(workingPacket.hash()));
      }
      return;
    }
    if (await this.relayLinkPacket(workingPacket, iface)) {
      if (!rememberHash) {
        this.packetHashes.add(hashKey2(workingPacket.hash()));
      }
      return;
    }
    if (await this.relayReversePacket(workingPacket, iface)) {
      return;
    }
    if (!rememberHash) {
      this.packetHashes.add(hashKey2(workingPacket.hash()));
    }
    if (workingPacket.packetType === PacketType.ANNOUNCE) {
      await this.handleAnnounce(workingPacket, iface);
      return;
    }
    if (workingPacket.packetType === PacketType.LINKREQUEST) {
      await this.handleLinkRequest(workingPacket, iface);
      return;
    }
    if (workingPacket.packetType === PacketType.DATA) {
      if (workingPacket.destinationType === DestinationType.LINK) {
        await this.handleLinkData(workingPacket, iface);
        return;
      }
      await this.handleData(workingPacket, iface);
      return;
    }
    if (workingPacket.packetType === PacketType.PROOF) {
      await this.handleProof(workingPacket, iface);
    }
  }
  async handleAnnounce(packet, iface) {
    const destinationKey = hashKey2(packet.destinationHash);
    if (packet.context !== PacketContext.PATH_RESPONSE && this.announceRateLimiter.isBlocked(destinationKey)) {
      return;
    }
    if (packet.context !== PacketContext.PATH_RESPONSE) {
      this.announceRateLimiter.record(destinationKey);
    }
    await super.handleAnnounce(packet, iface);
    await this.fulfillDiscoveryPathRequest(packet, iface);
    await this.rebroadcastAnnounce(packet, iface);
  }
  async handlePathRequest(packet, iface) {
    const parsed = parsePathRequestData(packet.data);
    if (parsed === null || parsed.tag === null) {
      return;
    }
    const tagKey = pathRequestTagKey(parsed.destinationHash, parsed.tag);
    if (this.discoveryPrTags.has(tagKey)) {
      return;
    }
    this.discoveryPrTags.add(tagKey);
    const localDestination = this.destinations.find((entry) => equalBytes3(entry.hash, parsed.destinationHash) && entry.direction === DestinationDirection.IN);
    if (localDestination?.answerPathRequest !== void 0) {
      await localDestination.answerPathRequest(iface);
      return;
    }
    const path = this.pathTable.get(hashKey2(parsed.destinationHash));
    if (path !== void 0) {
      if (!shouldAnswerPathRequest(path.nextHop, parsed.requestorTransportId)) {
        return;
      }
      await this.sendPathResponse(path, iface);
      return;
    }
    if (this.discoveryPathRequests.has(hashKey2(parsed.destinationHash))) {
      return;
    }
    this.discoveryPathRequests.set(hashKey2(parsed.destinationHash), {
      timeout: Date.now() / 1e3 + PATH_REQUEST_TIMEOUT_SECONDS,
      requestingInterface: iface
    });
    for (const outbound of this.interfaces) {
      if (!outbound.outgoing || outbound === iface) {
        continue;
      }
      this.forwardPathRequest(parsed.destinationHash, parsed.tag, outbound);
    }
  }
  shouldAcceptPacket(packet) {
    if (this.packetFilter(packet)) {
      return true;
    }
    if (packet.packetType === PacketType.ANNOUNCE && packet.transportType === TransportType.TRANSPORT && packet.transportId !== null && !equalBytes3(packet.transportId, this.transportIdentity.hash)) {
      return !this.packetHashes.has(hashKey2(packet.hash()));
    }
    return false;
  }
  shouldDeferPacketHash(packet) {
    if (packet.packetType === PacketType.PROOF && packet.context === PacketContext.LRPROOF) {
      return true;
    }
    const linkId = hashKey2(packet.destinationHash);
    return this.linkTable.has(linkId);
  }
  async relayTransportPacket(packet, iface) {
    if (packet.transportId === null || packet.packetType === PacketType.ANNOUNCE || !equalBytes3(packet.transportId, this.transportIdentity.hash)) {
      return false;
    }
    const path = this.getPathEntry(packet.destinationHash);
    if (path === void 0) {
      return false;
    }
    const relayed = relayTransportPacket(packet, path.hops, path.nextHop);
    const outboundInterface = path.receivedInterface;
    if (packet.packetType === PacketType.LINKREQUEST) {
      const linkId = Link.linkIdFromLrPacket(this.provider, packet);
      this.linkTable.set(hashKey2(linkId), {
        timestamp: Date.now() / 1e3,
        nextHop: path.nextHop,
        outboundInterface,
        remainingHops: path.hops,
        receivedInterface: iface,
        takenHops: packet.hops,
        destinationHash: packet.destinationHash
      });
    } else if (packet.packetType !== PacketType.PROOF || packet.context !== PacketContext.LRPROOF) {
      this.reverseTable.set(hashKey2(packet.truncatedHash()), {
        receivedInterface: iface,
        outboundInterface,
        timestamp: Date.now() / 1e3
      });
    }
    await this.transmit(outboundInterface, relayed);
    this.touchPathEntry(packet.destinationHash);
    return true;
  }
  async relayLinkPacket(packet, iface) {
    if (packet.packetType === PacketType.ANNOUNCE || packet.packetType === PacketType.LINKREQUEST) {
      return false;
    }
    const entry = this.linkTable.get(hashKey2(packet.destinationHash));
    if (entry === void 0) {
      return false;
    }
    let outboundInterface = null;
    if (entry.outboundInterface === entry.receivedInterface) {
      if (packet.hops === entry.remainingHops || packet.hops === entry.takenHops) {
        outboundInterface = entry.outboundInterface;
      }
    } else if (iface === entry.outboundInterface && packet.hops === entry.remainingHops) {
      outboundInterface = entry.receivedInterface;
    } else if (iface === entry.receivedInterface && packet.hops === entry.takenHops) {
      outboundInterface = entry.outboundInterface;
    }
    if (outboundInterface === null) {
      return false;
    }
    const relayed = new Uint8Array(packet.raw.length);
    relayed[0] = packet.raw[0];
    relayed[1] = packet.hops;
    relayed.set(packet.raw.subarray(2), 2);
    await this.transmit(outboundInterface, relayed);
    return true;
  }
  async relayReversePacket(packet, iface) {
    if (packet.packetType !== PacketType.PROOF) {
      return false;
    }
    const entry = this.reverseTable.get(hashKey2(packet.destinationHash));
    if (entry === void 0) {
      return false;
    }
    if (iface !== entry.outboundInterface) {
      return false;
    }
    const relayed = new Uint8Array(packet.raw.length);
    relayed[0] = packet.raw[0];
    relayed[1] = packet.hops;
    relayed.set(packet.raw.subarray(2), 2);
    await this.transmit(entry.receivedInterface, relayed);
    return true;
  }
  async rebroadcastAnnounce(packet, iface) {
    if (packet.context === PacketContext.PATH_RESPONSE) {
      return;
    }
    const rebroadcast = buildTransportAnnounce(this.provider, packet, this.transportIdentity, packet.hops);
    for (const outbound of this.interfaces) {
      if (!outbound.outgoing || outbound === iface) {
        continue;
      }
      this.packetHashes.add(hashKey2(rebroadcast.hash()));
      await this.transmit(outbound, rebroadcast.raw);
    }
  }
  async fulfillDiscoveryPathRequest(packet, iface) {
    const destinationKey = hashKey2(packet.destinationHash);
    const pending = this.discoveryPathRequests.get(destinationKey);
    if (pending === void 0) {
      return;
    }
    this.discoveryPathRequests.delete(destinationKey);
    const response = buildPathResponseAnnounce(this.provider, packet, this.transportIdentity, packet.hops);
    await this.transmit(pending.requestingInterface, response.raw);
  }
  forwardPathRequest(destinationHash, tag, iface) {
    const requestData = buildPathRequestData(destinationHash, this.transportIdentity.hash, tag);
    const packet = Packet.fromFields(this.provider, {
      headerType: PacketHeaderType.HEADER_1,
      transportType: TransportType.BROADCAST,
      destinationType: DestinationType.PLAIN,
      packetType: PacketType.DATA,
      destinationHash: this.pathRequestHash,
      context: PacketContext.NONE,
      data: requestData
    });
    void this.transmit(iface, packet.raw);
  }
  touchPathEntry(destinationHash) {
    const key = hashKey2(destinationHash);
    const existing = this.pathTable.get(key);
    if (existing === void 0) {
      return;
    }
    const updated = {
      ...existing,
      timestamp: Date.now() / 1e3
    };
    this.pathTable.set(key, updated);
  }
};

// packages/reticulum-ts/dist/reticulum.js
var RETICULUM_MTU = 500;
var Reticulum = class _Reticulum {
  provider;
  runtime;
  transportIdentity;
  transport;
  started = false;
  constructor(options) {
    this.provider = options.provider;
    this.runtime = options.runtime;
    this.transportIdentity = options.transportIdentity ?? new Identity(options.provider);
    const transportOptions = {
      provider: options.provider,
      transportIdentity: this.transportIdentity,
      clock: options.runtime.clock,
      ...options.useImplicitProof === void 0 ? {} : { useImplicitProof: options.useImplicitProof }
    };
    this.transport = options.transportEnabled === true ? new TransportNode({ ...transportOptions, transportEnabled: true }) : new LeafTransport(transportOptions);
  }
  static create(options) {
    return new _Reticulum(options);
  }
  start() {
    this.started = true;
  }
  stop() {
    this.started = false;
  }
  get isStarted() {
    return this.started;
  }
  registerDestination(options) {
    const destination = new RegisteredDestination(options);
    destination.attachTransport(this.transport);
    return destination;
  }
  registerAnnounceHandler(handler) {
    this.transport.registerAnnounceHandler(handler);
  }
  registerInterface(iface) {
    this.transport.registerInterface(iface);
  }
  unregisterInterface(iface) {
    this.transport.unregisterInterface(iface);
  }
  async addPipeInterface(options) {
    const iface = new PipeInterface(this.provider, { ...options, provider: this.provider });
    this.registerInterface(iface);
    return iface;
  }
  async addTcpClientInterface(options) {
    const iface = await TcpClientInterface.connect(this.provider, this.runtime, {
      ...options,
      provider: this.provider,
      runtime: this.runtime
    });
    this.registerInterface(iface);
    return iface;
  }
  async addTcpServerInterface(options) {
    const server = new TcpServerInterface(this.provider, this.runtime, {
      ...options,
      provider: this.provider,
      runtime: this.runtime
    });
    server.setSpawnHandler((client) => {
      this.registerInterface(client);
    });
    await server.start();
    return server;
  }
  async addUdpInterface(options) {
    const iface = await UdpInterface.open(this.provider, this.runtime, {
      ...options,
      provider: this.provider,
      runtime: this.runtime
    });
    this.registerInterface(iface);
    return iface;
  }
  hasPath(destinationHash) {
    return this.transport.hasPath(destinationHash);
  }
  get pathTableCount() {
    return this.transport.pathTableCount;
  }
  get activeLinkCount() {
    return this.transport.activeLinkCount;
  }
  get bandwidthBytesIn() {
    return this.transport.bandwidthBytesIn;
  }
  get bandwidthBytesOut() {
    return this.transport.bandwidthBytesOut;
  }
  hopsTo(destinationHash) {
    return this.transport.hopsTo(destinationHash);
  }
  requestPath(destinationHash, onInterface) {
    this.transport.requestPath(destinationHash, onInterface ?? null);
  }
  async awaitPath(destinationHash, timeoutSeconds) {
    return this.transport.awaitPath(destinationHash, timeoutSeconds ?? PATH_REQUEST_TIMEOUT_SECONDS);
  }
  get isTransportEnabled() {
    return this.transport instanceof TransportNode;
  }
  listInterfaces() {
    return this.transport.listInterfaces();
  }
};

// packages/reticulum-ts/dist/web-identity.js
var IDENTITY_DB_VERSION = 1;
var IDENTITY_OBJECT_STORE = "identity";
var IDENTITY_RECORD_KEY = "private-key";
var SALT_BYTES = 16;
var IV_BYTES = 12;
var PBKDF2_ITERATIONS = 1e5;
async function loadOrCreateWebIdentity(provider, options) {
  const store = await openIdentityStore(options);
  const encrypted = await store.get(IDENTITY_RECORD_KEY);
  if (encrypted === void 0) {
    const identity2 = new Identity(provider);
    await persistWebIdentity(identity2, options);
    return identity2;
  }
  const privateKey = await decryptPrivateKey(encrypted, options);
  const identity = Identity.fromBytes(provider, privateKey);
  if (identity === null) {
    throw new Error("Stored web identity could not be decrypted or parsed");
  }
  return identity;
}
async function persistWebIdentity(identity, options) {
  const store = await openIdentityStore(options);
  const encrypted = await encryptPrivateKey(identity.getPrivateKey(), options);
  await store.set(IDENTITY_RECORD_KEY, encrypted);
}
async function encryptPrivateKey(privateKey, options) {
  const subtle = requireSubtle(options);
  const salt = cryptoRandomBytes(SALT_BYTES);
  const iv = cryptoRandomBytes(IV_BYTES);
  const key = await deriveKey(subtle, options.passphrase, salt);
  const ciphertext = new Uint8Array(await subtle.encrypt({ name: "AES-GCM", iv }, key, Uint8Array.from(privateKey)));
  const packed = new Uint8Array(SALT_BYTES + IV_BYTES + ciphertext.length);
  packed.set(salt, 0);
  packed.set(iv, SALT_BYTES);
  packed.set(ciphertext, SALT_BYTES + IV_BYTES);
  return packed;
}
async function decryptPrivateKey(packed, options) {
  if (packed.length < SALT_BYTES + IV_BYTES + 16) {
    throw new Error("Stored web identity record is truncated");
  }
  const subtle = requireSubtle(options);
  const salt = packed.subarray(0, SALT_BYTES);
  const iv = packed.subarray(SALT_BYTES, SALT_BYTES + IV_BYTES);
  const ciphertext = packed.subarray(SALT_BYTES + IV_BYTES);
  const key = await deriveKey(subtle, options.passphrase, salt);
  const plaintext = new Uint8Array(await subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext));
  return plaintext;
}
async function deriveKey(subtle, passphrase, salt) {
  const baseKey = await subtle.importKey("raw", new TextEncoder().encode(passphrase), "PBKDF2", false, ["deriveKey"]);
  return subtle.deriveKey({
    name: "PBKDF2",
    salt,
    iterations: PBKDF2_ITERATIONS,
    hash: "SHA-256"
  }, baseKey, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}
async function openIdentityStore(options) {
  const indexedDB = options.indexedDB ?? globalThis.indexedDB;
  if (indexedDB === void 0) {
    throw new Error("IndexedDB is required for web identity storage");
  }
  const database = await new Promise((resolve, reject) => {
    const request = indexedDB.open(options.storeName ?? "twistedpear-web-identity", IDENTITY_DB_VERSION);
    request.onupgradeneeded = (event) => {
      event.target?.result.createObjectStore(IDENTITY_OBJECT_STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Failed to open web identity database"));
  });
  return {
    async get(key) {
      const request = database.transaction(IDENTITY_OBJECT_STORE, "readonly").objectStore(IDENTITY_OBJECT_STORE).get(key);
      const value = await requestToPromise(request);
      if (value === void 0) {
        return void 0;
      }
      return value instanceof Uint8Array ? Uint8Array.from(value) : new Uint8Array(value);
    },
    async set(key, value) {
      const request = database.transaction(IDENTITY_OBJECT_STORE, "readwrite").objectStore(IDENTITY_OBJECT_STORE).put(Uint8Array.from(value), key);
      await requestToPromise(request);
    },
    async delete(key) {
      const request = database.transaction(IDENTITY_OBJECT_STORE, "readwrite").objectStore(IDENTITY_OBJECT_STORE).delete(key);
      await requestToPromise(request);
    }
  };
}
function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed"));
  });
}
function requireSubtle(options) {
  const subtle = options.subtle ?? globalThis.crypto?.subtle;
  if (subtle === void 0) {
    throw new Error("WebCrypto subtle is required for web identity encryption");
  }
  return subtle;
}
function cryptoRandomBytes(length) {
  const bytes = new Uint8Array(length);
  const cryptoApi = globalThis.crypto;
  if (cryptoApi?.getRandomValues === void 0) {
    throw new Error("crypto.getRandomValues is required for web identity encryption");
  }
  cryptoApi.getRandomValues(bytes);
  return bytes;
}

// packages/app-registry/dist/manifest.js
var PACKAGE_FORMAT_VERSION = 1;
var MANIFEST_SIGNING_FIELDS = [
  "formatVersion",
  "name",
  "version",
  "entry",
  "capabilities",
  "icon",
  "minHostApi",
  "files",
  "driveKey",
  "publisherPublicKey"
];
var SEMVER_RE = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/;
function isValidSemver(version) {
  return SEMVER_RE.test(version);
}
function compareSemver(left, right) {
  if (!isValidSemver(left) || !isValidSemver(right)) {
    throw new Error(`Invalid semver: ${left} or ${right}`);
  }
  const parse = (value) => {
    const match = SEMVER_RE.exec(value);
    if (match === null) {
      throw new Error(`Invalid semver: ${value}`);
    }
    return [
      Number(match[1]),
      Number(match[2]),
      Number(match[3]),
      match[4] ?? "",
      match[5] ?? ""
    ];
  };
  const [lMajor, lMinor, lPatch, lPre, lBuild] = parse(left);
  const [rMajor, rMinor, rPatch, rPre, rBuild] = parse(right);
  if (lMajor !== rMajor) {
    return lMajor - rMajor;
  }
  if (lMinor !== rMinor) {
    return lMinor - rMinor;
  }
  if (lPatch !== rPatch) {
    return lPatch - rPatch;
  }
  if (lPre === "" && rPre !== "") {
    return 1;
  }
  if (lPre !== "" && rPre === "") {
    return -1;
  }
  if (lPre !== rPre) {
    return lPre < rPre ? -1 : 1;
  }
  if (lBuild !== rBuild) {
    return lBuild < rBuild ? -1 : 1;
  }
  return 0;
}
function canonicalizeJson(value) {
  if (value === null || typeof value !== "object") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((entry) => canonicalizeJson(entry));
  }
  const record = value;
  const sortedKeys = Object.keys(record).sort();
  const result = {};
  for (const key of sortedKeys) {
    result[key] = canonicalizeJson(record[key]);
  }
  return result;
}
function serializeCanonicalJson(value) {
  return JSON.stringify(canonicalizeJson(value));
}
function manifestSigningPayload(manifest) {
  const payload = {};
  for (const field of MANIFEST_SIGNING_FIELDS) {
    payload[field] = manifest[field];
  }
  return new TextEncoder().encode(serializeCanonicalJson(payload));
}
function validateManifestStructure(manifest) {
  if (manifest.formatVersion !== PACKAGE_FORMAT_VERSION) {
    throw new Error(`Unsupported format version: ${manifest.formatVersion}`);
  }
  if (manifest.name.length === 0 || manifest.name.length > 128) {
    throw new Error("Manifest name must be 1\u2013128 characters");
  }
  if (!isValidSemver(manifest.version)) {
    throw new Error(`Invalid semver version: ${manifest.version}`);
  }
  if (!isValidSemver(manifest.minHostApi)) {
    throw new Error(`Invalid minHostApi semver: ${manifest.minHostApi}`);
  }
  if (manifest.entry.length === 0) {
    throw new Error("Manifest entry point is required");
  }
  if (manifest.files.length === 0) {
    throw new Error("Manifest must list at least one file");
  }
  const paths = /* @__PURE__ */ new Set();
  for (const file of manifest.files) {
    if (paths.has(file.path)) {
      throw new Error(`Duplicate manifest file path: ${file.path}`);
    }
    paths.add(file.path);
    if (!/^[a-zA-Z0-9._/-]+$/.test(file.path) || file.path.includes("..")) {
      throw new Error(`Invalid manifest file path: ${file.path}`);
    }
    if (file.sha256.length !== 64 || !/^[0-9a-f]+$/.test(file.sha256)) {
      throw new Error(`Invalid SHA-256 for ${file.path}`);
    }
    if (file.size < 0 || !Number.isInteger(file.size)) {
      throw new Error(`Invalid file size for ${file.path}`);
    }
  }
  if (!paths.has(manifest.entry)) {
    throw new Error("Manifest entry point must appear in files table");
  }
  if (manifest.icon !== null && !paths.has(manifest.icon)) {
    throw new Error("Manifest icon must appear in files table");
  }
  if (manifest.driveKey.length !== 64 || !/^[0-9a-f]+$/.test(manifest.driveKey)) {
    throw new Error("Invalid driveKey hex");
  }
  if (manifest.publisherPublicKey.length !== 128 || !/^[0-9a-f]+$/.test(manifest.publisherPublicKey)) {
    throw new Error("Invalid publisherPublicKey hex");
  }
}
function manifestPublisherKeyBytes(manifest) {
  return hexToBytes2(manifest.publisherPublicKey);
}
function manifestSignatureBytes(manifest) {
  return hexToBytes2(manifest.signature);
}

// packages/app-registry/dist/signing.js
function verifyManifestSignature(provider, manifest) {
  try {
    const { signature: _signature2, ...unsigned2 } = manifest;
    validateManifestStructure(unsigned2);
  } catch {
    return false;
  }
  const { signature: _signature, ...unsigned } = manifest;
  const payload = manifestSigningPayload(unsigned);
  const signatureBytes = manifestSignatureBytes(manifest);
  const publisherKey = manifestPublisherKeyBytes(unsigned);
  const identity = Identity.fromPublicKey(provider, publisherKey);
  if (identity === null) {
    return false;
  }
  return identity.validate(signatureBytes, payload);
}

// packages/app-registry/dist/package.js
var PACKAGE_MAGIC = new Uint8Array([84, 80, 75, 71, 1]);
var PackageError = class extends Error {
  code;
  constructor(code, message) {
    super(message);
    this.code = code;
    this.name = "PackageError";
  }
};
function readU32Be(bytes, offset) {
  if (offset + 4 > bytes.length) {
    throw new PackageError("TRUNCATED", "Archive truncated reading u32");
  }
  return (bytes[offset] << 24 | bytes[offset + 1] << 16 | bytes[offset + 2] << 8 | bytes[offset + 3]) >>> 0;
}
function unpackPackage(provider, archiveBytes) {
  if (archiveBytes.length < PACKAGE_MAGIC.length + 4) {
    throw new PackageError("TRUNCATED", "Archive too short");
  }
  if (!equalBytes3(archiveBytes.subarray(0, PACKAGE_MAGIC.length), PACKAGE_MAGIC)) {
    throw new PackageError("INVALID_MAGIC", "Invalid package magic bytes");
  }
  let offset = PACKAGE_MAGIC.length;
  const manifestLength = readU32Be(archiveBytes, offset);
  offset += 4;
  if (offset + manifestLength > archiveBytes.length) {
    throw new PackageError("TRUNCATED", "Archive truncated at manifest");
  }
  const manifestText = new TextDecoder().decode(archiveBytes.subarray(offset, offset + manifestLength));
  offset += manifestLength;
  let manifest;
  try {
    manifest = JSON.parse(manifestText);
    const { signature: _signature, ...unsigned } = manifest;
    validateManifestStructure(unsigned);
  } catch (error) {
    throw new PackageError("MANIFEST_INVALID", error instanceof Error ? error.message : "Invalid manifest");
  }
  const files = /* @__PURE__ */ new Map();
  const sortedPaths = manifest.files.map((entry) => entry.path).sort((left, right) => left.localeCompare(right));
  for (const path of sortedPaths) {
    if (offset + 4 > archiveBytes.length) {
      throw new PackageError("TRUNCATED", `Archive truncated before file ${path}`);
    }
    const pathLength = readU32Be(archiveBytes, offset);
    offset += 4;
    if (offset + pathLength + 4 > archiveBytes.length) {
      throw new PackageError("TRUNCATED", `Archive truncated at file path ${path}`);
    }
    const pathText = new TextDecoder().decode(archiveBytes.subarray(offset, offset + pathLength));
    offset += pathLength;
    if (pathText !== path) {
      throw new PackageError("MANIFEST_INVALID", `Archive file order mismatch: expected ${path}, got ${pathText}`);
    }
    const contentLength = readU32Be(archiveBytes, offset);
    offset += 4;
    if (offset + contentLength > archiveBytes.length) {
      throw new PackageError("TRUNCATED", `Archive truncated at file ${path}`);
    }
    files.set(path, archiveBytes.subarray(offset, offset + contentLength));
    offset += contentLength;
  }
  if (offset + 4 > archiveBytes.length) {
    throw new PackageError("TRUNCATED", "Archive truncated at signature block");
  }
  const signatureLength = readU32Be(archiveBytes, offset);
  offset += 4;
  if (offset + signatureLength !== archiveBytes.length) {
    throw new PackageError("TRUNCATED", "Archive trailing bytes after signature block");
  }
  const signatureBytes = archiveBytes.subarray(offset, offset + signatureLength);
  if (bytesToHex2(signatureBytes) !== manifest.signature) {
    throw new PackageError("SIGNATURE_INVALID", "Archive signature block does not match manifest");
  }
  for (const entry of manifest.files) {
    const content = files.get(entry.path);
    if (content === void 0) {
      throw new PackageError("MANIFEST_INVALID", `Manifest file missing from archive: ${entry.path}`);
    }
    const hash = bytesToHex2(provider.sha256(content));
    if (hash !== entry.sha256) {
      throw new PackageError("FILE_HASH_MISMATCH", `File hash mismatch for ${entry.path}`);
    }
  }
  if (!verifyManifestSignature(provider, manifest)) {
    throw new PackageError("SIGNATURE_INVALID", "Manifest signature verification failed");
  }
  return {
    manifest,
    files,
    packageHash: bytesToHex2(provider.sha256(archiveBytes)),
    archiveBytes
  };
}
function verifyPackage(provider, archiveBytes, options = {}) {
  const result = unpackPackage(provider, archiveBytes);
  if (options.expectedPublisherKey !== void 0) {
    const publisherKey = hexToBytes2(result.manifest.publisherPublicKey);
    if (!equalBytes3(publisherKey, options.expectedPublisherKey)) {
      throw new PackageError("WRONG_KEY", "Publisher public key does not match expected key");
    }
  }
  if (options.minVersion !== void 0) {
    if (compareSemver(result.manifest.version, options.minVersion) < 0) {
      throw new PackageError("DOWNGRADE", `Package version ${result.manifest.version} is older than minimum ${options.minVersion}`);
    }
  }
  if (options.hostApiVersion !== void 0) {
    if (compareSemver(options.hostApiVersion, result.manifest.minHostApi) < 0) {
      throw new PackageError("MIN_HOST_API", `Host API ${options.hostApiVersion} does not satisfy minHostApi ${result.manifest.minHostApi}`);
    }
  }
  return result;
}

// packages/app-registry/dist/announce.js
function appDestinationName(provider, publisherPublicKeyHex, appName) {
  const publisherHash = provider.sha256(hexToBytes2(publisherPublicKeyHex)).slice(0, 8);
  const nameHash = provider.sha256(new TextEncoder().encode(appName)).slice(0, 8);
  return `tp.app.${bytesToHex2(publisherHash)}.${bytesToHex2(nameHash)}`;
}
var APP_ANNOUNCE_MAGIC = new Uint8Array([84, 80, 65, 68, 1]);

// packages/app-registry/dist/catalog.js
var DEFAULT_CATALOG_ENTRY_TTL_MS = 7 * 24 * 60 * 60 * 1e3;
function installedPackageKey(appId, version) {
  return `installed:${appId}:${version}`;
}
var InstalledPackageStore = class {
  quotaBytes;
  usedBytes;
  packages = /* @__PURE__ */ new Map();
  versionsByApp = /* @__PURE__ */ new Map();
  activeVersions = /* @__PURE__ */ new Map();
  constructor(quotaBytes, usedBytes = 0) {
    this.quotaBytes = quotaBytes;
    this.usedBytes = usedBytes;
  }
  list() {
    return [...this.packages.values()].sort((left, right) => right.installedAt - left.installedAt);
  }
  get(appId, version) {
    return this.packages.get(installedPackageKey(appId, version)) ?? null;
  }
  activeVersion(appId) {
    return this.activeVersions.get(appId) ?? this.latestVersion(appId);
  }
  latestVersion(appId) {
    const versions = this.versionsByApp.get(appId);
    if (versions === void 0 || versions.length === 0) {
      return null;
    }
    return versions[versions.length - 1] ?? null;
  }
  previousVersion(appId) {
    const versions = this.versionsByApp.get(appId);
    if (versions === void 0 || versions.length < 2) {
      return null;
    }
    return versions[versions.length - 2] ?? null;
  }
  canInstall(sizeBytes) {
    return this.usedBytes + sizeBytes <= this.quotaBytes;
  }
  storageUsedBytes() {
    return this.usedBytes;
  }
  install(record, sizeBytes) {
    const key = installedPackageKey(record.appId, record.version);
    const existing = this.packages.get(key);
    if (existing !== void 0) {
      return;
    }
    while (!this.canInstall(sizeBytes) && this.packages.size > 0) {
      this.evictOldest();
    }
    if (!this.canInstall(sizeBytes)) {
      throw new Error("Storage quota exceeded");
    }
    this.packages.set(key, record);
    this.usedBytes += sizeBytes;
    const versions = this.versionsByApp.get(record.appId) ?? [];
    versions.push(record.version);
    versions.sort(compareSemver);
    this.versionsByApp.set(record.appId, versions);
    this.activeVersions.set(record.appId, record.version);
  }
  rollback(appId) {
    const previous = this.previousVersion(appId);
    if (previous === null) {
      return null;
    }
    this.activeVersions.set(appId, previous);
    return previous;
  }
  remove(appId, version, sizeBytes) {
    const key = installedPackageKey(appId, version);
    const existing = this.packages.get(key);
    if (existing === void 0) {
      return false;
    }
    this.packages.delete(key);
    this.usedBytes = Math.max(0, this.usedBytes - sizeBytes);
    const versions = (this.versionsByApp.get(appId) ?? []).filter((entry) => entry !== version);
    if (versions.length === 0) {
      this.versionsByApp.delete(appId);
      this.activeVersions.delete(appId);
    } else {
      this.versionsByApp.set(appId, versions);
      const active = this.activeVersions.get(appId);
      if (active === version) {
        this.activeVersions.set(appId, versions[versions.length - 1] ?? version);
      }
    }
    return true;
  }
  evictOldest() {
    let oldest = null;
    for (const record of this.packages.values()) {
      if (oldest === null || record.installedAt < oldest.installedAt) {
        oldest = record;
      }
    }
    if (oldest !== null) {
      this.remove(oldest.appId, oldest.version, 0);
    }
  }
  async save(store) {
    await store.set("installed-packages", new TextEncoder().encode(JSON.stringify({
      packages: [...this.packages.entries()],
      versionsByApp: [...this.versionsByApp.entries()],
      activeVersions: [...this.activeVersions.entries()],
      usedBytes: this.usedBytes
    })));
  }
  async load(store) {
    const raw = await store.get("installed-packages");
    if (raw === null || raw === void 0) {
      return;
    }
    const payload = JSON.parse(new TextDecoder().decode(raw));
    this.packages.clear();
    this.versionsByApp.clear();
    this.activeVersions.clear();
    for (const [key, value] of payload.packages) {
      this.packages.set(key, value);
    }
    for (const [key, value] of payload.versionsByApp) {
      this.versionsByApp.set(key, value);
    }
    for (const [key, value] of payload.activeVersions ?? []) {
      this.activeVersions.set(key, value);
    }
    this.usedBytes = payload.usedBytes;
  }
};

// packages/cas-256t/dist/codec.js
var T256_ID_LENGTH = 94;
var T256_LENGTH_PREFIX_CHARS = 8;
var T256_INLINE_MAX_BYTES = 64;
var T256_MAX_CONTENT_BYTES = 2 ** 48 - 1;
var ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
var CHAR_TO_VALUE = new Map([...ALPHABET].map((char, index) => [char, index]));
var T256Error = class extends Error {
  code;
  constructor(code, message) {
    super(message);
    this.code = code;
    this.name = "T256Error";
  }
};
function base64UrlEncode(bytes) {
  let out = "";
  for (let index = 0; index < bytes.length; index += 3) {
    const b0 = bytes[index];
    const b1 = index + 1 < bytes.length ? bytes[index + 1] : 0;
    const b2 = index + 2 < bytes.length ? bytes[index + 2] : 0;
    out += ALPHABET[b0 >> 2];
    out += ALPHABET[(b0 & 3) << 4 | b1 >> 4];
    if (index + 1 < bytes.length) {
      out += ALPHABET[(b1 & 15) << 2 | b2 >> 6];
    }
    if (index + 2 < bytes.length) {
      out += ALPHABET[b2 & 63];
    }
  }
  return out;
}
function base64UrlDecode(text, expectedBytes) {
  const out = new Uint8Array(expectedBytes);
  let outIndex = 0;
  let buffer = 0;
  let bits = 0;
  for (const char of text) {
    const value = CHAR_TO_VALUE.get(char);
    if (value === void 0) {
      throw new T256Error("INVALID_ID", `Invalid base64url character: ${char}`);
    }
    buffer = buffer << 6 | value;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      if (outIndex < expectedBytes) {
        out[outIndex] = buffer >> bits & 255;
        outIndex += 1;
      }
    }
  }
  if (outIndex !== expectedBytes) {
    throw new T256Error("INVALID_ID", `Expected ${expectedBytes} bytes, decoded ${outIndex}`);
  }
  if (bits > 0 && (buffer & (1 << bits) - 1) !== 0) {
    throw new T256Error("INVALID_ID", "Non-canonical base64url tail bits");
  }
  return out;
}
function encodeLengthPrefix(length) {
  const bytes = new Uint8Array(6);
  let remaining = length;
  for (let index = 5; index >= 0; index -= 1) {
    bytes[index] = remaining % 256;
    remaining = Math.floor(remaining / 256);
  }
  return base64UrlEncode(bytes);
}
function encode256tParts(length, field) {
  if (!Number.isInteger(length) || length < 0 || length > T256_MAX_CONTENT_BYTES) {
    throw new T256Error("CONTENT_TOO_LARGE", `Content length out of range: ${length}`);
  }
  if (field.length !== 64) {
    throw new T256Error("INVALID_ID", `256t field must be 64 bytes, got ${field.length}`);
  }
  return `${encodeLengthPrefix(length)}${base64UrlEncode(field)}`;
}
function encode256t(content, sha5123) {
  if (content.length <= T256_INLINE_MAX_BYTES) {
    const field = new Uint8Array(64);
    field.set(content, 0);
    return encode256tParts(content.length, field);
  }
  const digest = sha5123(content);
  if (digest.length !== 64) {
    throw new T256Error("INVALID_ID", "sha512 function must return 64 bytes");
  }
  return encode256tParts(content.length, digest);
}
function decode256t(id) {
  if (typeof id !== "string" || id.length !== T256_ID_LENGTH) {
    throw new T256Error("INVALID_ID", `256t id must be ${T256_ID_LENGTH} characters`);
  }
  const lengthBytes = base64UrlDecode(id.slice(0, T256_LENGTH_PREFIX_CHARS), 6);
  let length = 0;
  for (const byte of lengthBytes) {
    length = length * 256 + byte;
  }
  const field = base64UrlDecode(id.slice(T256_LENGTH_PREFIX_CHARS), 64);
  if (length <= T256_INLINE_MAX_BYTES) {
    for (let index = length; index < 64; index += 1) {
      if (field[index] !== 0) {
        throw new T256Error("INVALID_ID", "Inline 256t content has non-zero padding");
      }
    }
    return { length, inline: field.slice(0, length), sha512: null };
  }
  return { length, inline: null, sha512: field };
}
function verify256t(id, content, sha5123) {
  let decoded;
  try {
    decoded = decode256t(id);
  } catch {
    return false;
  }
  if (decoded.length !== content.length) {
    return false;
  }
  if (decoded.inline !== null) {
    return equalBytes6(decoded.inline, content);
  }
  return decoded.sha512 !== null && equalBytes6(decoded.sha512, sha5123(content));
}
function equalBytes6(a, b) {
  if (a.length !== b.length) {
    return false;
  }
  let diff = 0;
  for (let index = 0; index < a.length; index += 1) {
    diff |= a[index] ^ b[index];
  }
  return diff === 0;
}

// packages/cas-256t/dist/store.js
var CasQuotaError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "CasQuotaError";
  }
};
var KEY_PREFIX = "cas:";
var CasStore = class {
  backend;
  sha512;
  maxBlobBytes;
  maxTotalBytes;
  constructor(backend, sha5123, options = {}) {
    this.backend = backend;
    this.sha512 = sha5123;
    this.maxBlobBytes = options.maxBlobBytes ?? 16 * 1024 * 1024;
    this.maxTotalBytes = options.maxTotalBytes ?? 256 * 1024 * 1024;
  }
  async put(content) {
    const id = encode256t(content, this.sha512);
    const decoded = decode256t(id);
    if (decoded.inline !== null) {
      return id;
    }
    if (content.length > this.maxBlobBytes) {
      throw new CasQuotaError(`CAS blob exceeds ${this.maxBlobBytes} bytes`);
    }
    const key = this.key(id);
    if (await this.backend.get(key) !== null) {
      return id;
    }
    const keys = await this.backend.list(KEY_PREFIX);
    let total = content.length;
    for (const existing of keys) {
      total += (await this.backend.get(existing))?.length ?? 0;
    }
    if (total > this.maxTotalBytes) {
      throw new CasQuotaError(`CAS store exceeds ${this.maxTotalBytes} bytes`);
    }
    await this.backend.set(key, content);
    return id;
  }
  async get(id) {
    const decoded = decode256t(id);
    if (decoded.inline !== null) {
      return decoded.inline;
    }
    const stored = await this.backend.get(this.key(id));
    if (stored === null) {
      return null;
    }
    if (!verify256t(id, stored, this.sha512)) {
      throw new T256Error("HASH_MISMATCH", "Stored CAS content does not match its 256t id");
    }
    return stored;
  }
  async has(id) {
    const decoded = decode256t(id);
    if (decoded.inline !== null) {
      return true;
    }
    return await this.backend.get(this.key(id)) !== null;
  }
  async delete(id) {
    const decoded = decode256t(id);
    if (decoded.inline !== null) {
      return;
    }
    await this.backend.delete(this.key(id));
  }
  key(id) {
    const hex = [...decode256t(id).sha512].map((byte) => byte.toString(16).padStart(2, "0")).join("");
    return `${KEY_PREFIX}${hex}`;
  }
};

// packages/cas-256t/dist/locator.js
var CAS_LOCATOR_MAGIC = new Uint8Array([84, 80, 67, 76, 1]);

// packages/bridge-hyper/dist/resource-server.js
var RESOURCE_PROTOCOL_VERSION = 1;
function encodeRequest(request) {
  return new TextEncoder().encode(JSON.stringify({ v: RESOURCE_PROTOCOL_VERSION, ...request }));
}
async function sendPackageResourceRequest(link, request, options = {}) {
  const timeoutMs = options.timeoutMs ?? 12e4;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("package resource request timed out")), timeoutMs);
    link.callbacks.resourceConcluded = (resource) => {
      clearTimeout(timer);
      resolve(resource.data ?? new Uint8Array(0));
    };
    void link.send(encodeRequest(request));
  });
}
function parseListResponse(bytes) {
  const parsed = JSON.parse(new TextDecoder().decode(bytes));
  return parsed.versions;
}

// packages/host-core/dist/fetch-plane-resource.js
function createResourceFetchPlane(options) {
  return {
    async fetchPackage(provider, request) {
      return fetchPackageResource(provider, options.reticulum, request);
    }
  };
}
async function fetchPackageResource(provider, reticulum, request) {
  request.onProgress?.({
    path: "resource",
    bytesReceived: 0,
    totalBytes: request.entry.packageSize,
    phase: "starting"
  });
  if (request.signal?.aborted) {
    throw new Error("fetch aborted");
  }
  const link = await openPublisherLink(provider, reticulum, request.entry);
  try {
    const archiveBytes = await sendPackageResourceRequest(link, { type: "fetch", version: request.version }, { timeoutMs: 12e4 });
    request.onProgress?.({
      path: "resource",
      bytesReceived: archiveBytes.length,
      totalBytes: archiveBytes.length,
      phase: "verifying"
    });
    const verified = unpackPackage(provider, archiveBytes);
    if (verified.packageHash !== request.entry.packageHash) {
      throw new Error("Package hash mismatch after resource fetch");
    }
    request.onProgress?.({
      path: "resource",
      bytesReceived: archiveBytes.length,
      totalBytes: archiveBytes.length,
      phase: "complete"
    });
    return {
      path: "resource",
      archiveBytes,
      packageHash: verified.packageHash
    };
  } finally {
    await link.teardown();
  }
}
async function listResourceVersions(provider, reticulum, entry) {
  const link = await openPublisherLink(provider, reticulum, entry);
  try {
    const response = await sendPackageResourceRequest(link, { type: "list" });
    return parseListResponse(response);
  } finally {
    await link.teardown();
  }
}
async function openPublisherLink(provider, reticulum, entry) {
  const publisherKey = hexToBytes2(entry.publisherPublicKey);
  const publisherIdentity = Identity.fromPublicKey(provider, publisherKey);
  if (publisherIdentity === null) {
    throw new Error("Invalid publisher public key");
  }
  const destinationName = appDestinationName(provider, entry.publisherPublicKey, entry.name);
  const parts = destinationName.split(".");
  const appName = parts[0] ?? "tp";
  const aspects = parts.slice(1);
  const out = reticulum.registerDestination({
    provider,
    identity: publisherIdentity,
    direction: DestinationDirection.OUT,
    type: DestinationType.SINGLE,
    appName,
    aspects
  });
  const link = out.requestLink({});
  return waitForActiveLink(link);
}
async function waitForActiveLink(link) {
  const started = Date.now();
  while (Date.now() - started < 3e4) {
    if (link.status === LinkStatus.ACTIVE) {
      return link;
    }
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error("link did not become active");
}

// packages/lxmf-ts/dist/constants.js
var APP_NAME = "lxmf";
var LXMessageState = {
  GENERATING: 0,
  OUTBOUND: 1,
  SENDING: 2,
  SENT: 4,
  DELIVERED: 8,
  REJECTED: 253,
  CANCELLED: 254,
  FAILED: 255
};
var LXMessageRepresentation = {
  UNKNOWN: 0,
  PACKET: 1,
  RESOURCE: 2
};
var LXMessageMethod = {
  OPPORTUNISTIC: 1,
  DIRECT: 2,
  PROPAGATED: 3,
  PAPER: 5
};
var LXMessageUnverifiedReason = {
  SOURCE_UNKNOWN: 1,
  SIGNATURE_INVALID: 2
};
var DESTINATION_LENGTH = 16;
var SIGNATURE_LENGTH = 64;
var TIMESTAMP_SIZE = 8;
var STRUCT_OVERHEAD = 8;
var LXMF_OVERHEAD = 2 * DESTINATION_LENGTH + SIGNATURE_LENGTH + TIMESTAMP_SIZE + STRUCT_OVERHEAD;

// packages/lxmf-ts/dist/msgpack.js
function concatBytes13(...parts) {
  const length = parts.reduce((total, part) => total + part.length, 0);
  const output = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }
  return output;
}
function msgpackPackFloat64(value) {
  const buffer = new ArrayBuffer(9);
  const view = new DataView(buffer);
  view.setUint8(0, 203);
  view.setFloat64(1, value, false);
  return new Uint8Array(buffer);
}
function msgpackPackBin2(bytes) {
  const length = bytes.length;
  if (length <= 255) {
    const output2 = new Uint8Array(2 + length);
    output2[0] = 196;
    output2[1] = length;
    output2.set(bytes, 2);
    return output2;
  }
  const output = new Uint8Array(3 + length);
  output[0] = 197;
  output[1] = length >> 8 & 255;
  output[2] = length & 255;
  output.set(bytes, 3);
  return output;
}
function msgpackPackUInt2(value) {
  if (value >= 0 && value <= 127) {
    return new Uint8Array([value]);
  }
  if (value <= 255) {
    return new Uint8Array([204, value]);
  }
  if (value <= 65535) {
    const output2 = new Uint8Array(3);
    output2[0] = 205;
    output2[1] = value >> 8 & 255;
    output2[2] = value & 255;
    return output2;
  }
  const output = new Uint8Array(5);
  output[0] = 206;
  output[1] = value >>> 24 & 255;
  output[2] = value >>> 16 & 255;
  output[3] = value >>> 8 & 255;
  output[4] = value & 255;
  return output;
}
function msgpackPackArray3(items) {
  if (items.length > 15) {
    throw new Error("msgpackPackArray supports at most 15 items");
  }
  const output = new Uint8Array(1 + items.reduce((total, item) => total + item.length, 0));
  output[0] = 144 | items.length;
  let offset = 1;
  for (const item of items) {
    output.set(item, offset);
    offset += item.length;
  }
  return output;
}
function msgpackPackFields(fields) {
  const entries = Object.entries(fields);
  if (entries.length > 15) {
    throw new Error("msgpackPackFields supports at most 15 entries");
  }
  const parts = entries.flatMap(([key, value]) => [
    msgpackPackUInt2(Number.parseInt(key, 10)),
    msgpackPackBin2(value)
  ]);
  const body = concatBytes13(...parts);
  const output = new Uint8Array(1 + body.length);
  output[0] = 128 | entries.length;
  output.set(body, 1);
  return output;
}
function msgpackPackLxmPayload(timestamp, title, content, fields, stamp) {
  const items = [
    msgpackPackFloat64(timestamp),
    msgpackPackBin2(title),
    msgpackPackBin2(content),
    msgpackPackFields(fields)
  ];
  if (stamp !== void 0 && stamp !== null) {
    items.push(msgpackPackBin2(stamp));
  }
  return msgpackPackArray3(items);
}
function msgpackUnpack2(bytes) {
  const [value] = msgpackUnpackAt2(bytes, 0);
  return value;
}
function msgpackUnpackLxmPayload(bytes) {
  const value = msgpackUnpack2(bytes);
  if (value.type !== "array" || value.array === void 0 || value.array.length < 4) {
    throw new Error("Invalid LXMF payload");
  }
  const [timestampValue, titleValue, contentValue, fieldsValue, stampValue] = value.array;
  if (timestampValue === void 0 || titleValue === void 0 || contentValue === void 0 || fieldsValue === void 0 || timestampValue.type !== "float" || titleValue.type !== "bin" || titleValue.bin === void 0 || contentValue.type !== "bin" || contentValue.bin === void 0 || fieldsValue.type !== "map") {
    throw new Error("Invalid LXMF payload fields");
  }
  const fields = {};
  if (fieldsValue.map !== void 0) {
    for (const [key, entryValue] of fieldsValue.map) {
      if (entryValue.type === "bin" && entryValue.bin !== void 0) {
        fields[key] = Uint8Array.from(entryValue.bin);
      }
    }
  }
  const stamp = stampValue === void 0 || stampValue.type === "nil" ? null : stampValue.type === "bin" && stampValue.bin !== void 0 ? Uint8Array.from(stampValue.bin) : null;
  return {
    timestamp: timestampValue.float ?? 0,
    title: Uint8Array.from(titleValue.bin),
    content: Uint8Array.from(contentValue.bin),
    fields,
    stamp
  };
}
function msgpackUnpackAt2(bytes, offset) {
  const tag = bytes[offset];
  if (tag === void 0) {
    throw new Error("Unexpected end of msgpack input");
  }
  if (tag === 192) {
    return [{ type: "nil" }, offset + 1];
  }
  if (tag === 203) {
    const view = new DataView(bytes.buffer, bytes.byteOffset + offset, bytes.byteLength - offset);
    return [{ type: "float", float: view.getFloat64(1, false) }, offset + 9];
  }
  if (tag === 196) {
    const length = bytes[offset + 1];
    const bin = bytes.subarray(offset + 2, offset + 2 + length);
    return [{ type: "bin", bin: Uint8Array.from(bin) }, offset + 2 + length];
  }
  if (tag === 197) {
    const length = bytes[offset + 1] << 8 | bytes[offset + 2];
    const bin = bytes.subarray(offset + 3, offset + 3 + length);
    return [{ type: "bin", bin: Uint8Array.from(bin) }, offset + 3 + length];
  }
  if ((tag & 240) === 144) {
    const count = tag & 15;
    const array = [];
    let nextOffset = offset + 1;
    for (let index = 0; index < count; index += 1) {
      const [item, itemOffset] = msgpackUnpackAt2(bytes, nextOffset);
      array.push(item);
      nextOffset = itemOffset;
    }
    return [{ type: "array", array }, nextOffset];
  }
  if ((tag & 240) === 128) {
    const count = tag & 15;
    const map = /* @__PURE__ */ new Map();
    let nextOffset = offset + 1;
    for (let index = 0; index < count; index += 1) {
      const [keyValue, keyOffset] = msgpackUnpackAt2(bytes, nextOffset);
      const [entryValue, entryOffset] = msgpackUnpackAt2(bytes, keyOffset);
      if (keyValue.type === "int" && keyValue.int !== void 0) {
        map.set(keyValue.int, entryValue);
      }
      nextOffset = entryOffset;
    }
    return [{ type: "map", map }, nextOffset];
  }
  if (tag === 204) {
    return [{ type: "int", int: bytes[offset + 1] }, offset + 2];
  }
  if (tag === 205) {
    const value = bytes[offset + 1] << 8 | bytes[offset + 2];
    return [{ type: "int", int: value }, offset + 3];
  }
  if (tag === 206) {
    const view = new DataView(bytes.buffer, bytes.byteOffset + offset, bytes.byteLength - offset);
    return [{ type: "int", int: view.getUint32(1, false) }, offset + 5];
  }
  if (tag <= 127) {
    return [{ type: "int", int: tag }, offset + 1];
  }
  throw new Error(`Unsupported msgpack tag 0x${tag.toString(16)}`);
}
function msgpackPackPropagationEnvelope(timestamp, messages) {
  return msgpackPackArray3([
    msgpackPackFloat64(timestamp),
    msgpackPackArray3(messages.map((message) => msgpackPackBin2(message)))
  ]);
}

// packages/lxmf-ts/dist/message.js
var ENCRYPTED_PACKET_MDU = 391;
var ENCRYPTED_PACKET_MAX_CONTENT = ENCRYPTED_PACKET_MDU - (2 * DESTINATION_LENGTH + SIGNATURE_LENGTH + TIMESTAMP_SIZE + STRUCT_OVERHEAD) + DESTINATION_LENGTH;
var LINK_PACKET_MDU = 431;
var LINK_PACKET_MAX_CONTENT = LINK_PACKET_MDU - (2 * DESTINATION_LENGTH + SIGNATURE_LENGTH + TIMESTAMP_SIZE + STRUCT_OVERHEAD);
var LXMessage = class _LXMessage {
  destinationHash;
  sourceHash;
  title;
  content;
  fields;
  timestamp = null;
  signature = null;
  hash = null;
  packed = null;
  propagationPacked = null;
  transientId = null;
  stamp = null;
  state = LXMessageState.GENERATING;
  method = LXMessageMethod.DIRECT;
  desiredMethod = LXMessageMethod.DIRECT;
  representation = LXMessageRepresentation.UNKNOWN;
  incoming = false;
  signatureValidated = false;
  unverifiedReason = null;
  progress = 0;
  destination;
  source;
  constructor(options) {
    this.destination = options.destination ?? null;
    this.source = options.source ?? null;
    this.destinationHash = options.destinationHash ?? options.destination?.hash ?? new Uint8Array(DESTINATION_LENGTH);
    this.sourceHash = options.sourceHash ?? options.source?.hash ?? new Uint8Array(DESTINATION_LENGTH);
    this.title = encodeTextOrBytes(options.title ?? "");
    this.content = encodeTextOrBytes(options.content ?? "");
    this.fields = options.fields ?? {};
    this.desiredMethod = options.desiredMethod ?? LXMessageMethod.DIRECT;
  }
  static pack(options) {
    if (options.destination.direction !== DestinationDirection.OUT) {
      throw new Error("LXMessage destination must be OUT");
    }
    if (options.source.direction !== DestinationDirection.IN || options.source.identity === null) {
      throw new Error("LXMessage source must be IN with identity");
    }
    const message = new _LXMessage({
      destination: options.destination,
      source: options.source,
      ...options.title === void 0 ? {} : { title: options.title },
      ...options.content === void 0 ? {} : { content: options.content },
      ...options.fields === void 0 ? {} : { fields: options.fields },
      desiredMethod: options.desiredMethod ?? LXMessageMethod.DIRECT
    });
    message.timestamp = options.timestamp ?? Date.now() / 1e3;
    message.pack(options.provider, {
      ...options.stamp === void 0 ? {} : { stamp: options.stamp },
      ...options.deferStamp === void 0 ? {} : { deferStamp: options.deferStamp }
    });
    return message;
  }
  static unpackFromBytes(lxmfBytes, options) {
    if (lxmfBytes.length < 2 * DESTINATION_LENGTH + SIGNATURE_LENGTH + 1) {
      throw new Error("LXMF bytes too short");
    }
    const destinationHash = lxmfBytes.subarray(0, DESTINATION_LENGTH);
    const sourceHash = lxmfBytes.subarray(DESTINATION_LENGTH, 2 * DESTINATION_LENGTH);
    const signature = lxmfBytes.subarray(2 * DESTINATION_LENGTH, 2 * DESTINATION_LENGTH + SIGNATURE_LENGTH);
    const { timestamp, title, content, fields, stamp } = msgpackUnpackLxmPayload(lxmfBytes.subarray(2 * DESTINATION_LENGTH + SIGNATURE_LENGTH));
    const payloadWithoutStamp = msgpackPackLxmPayload(timestamp, title, content, fields);
    const hashedPart = concatBytes14(destinationHash, sourceHash, payloadWithoutStamp);
    const messageHash = Identity.fullHash(options.provider, hashedPart);
    const signedPart = concatBytes14(hashedPart, messageHash);
    const sourceIdentity = options.sourceIdentity ?? Identity.recall(options.provider, sourceHash);
    const destinationIdentity = Identity.recall(options.provider, destinationHash);
    const message = new _LXMessage({
      destination: destinationIdentity === null ? null : new Destination(options.provider, {
        identity: destinationIdentity,
        direction: DestinationDirection.OUT,
        type: DestinationType.SINGLE,
        appName: APP_NAME,
        aspects: ["delivery"]
      }),
      source: sourceIdentity === null ? null : new Destination(options.provider, {
        identity: sourceIdentity,
        direction: DestinationDirection.IN,
        type: DestinationType.SINGLE,
        appName: APP_NAME,
        aspects: ["delivery"]
      }),
      destinationHash,
      sourceHash,
      title,
      content,
      fields,
      desiredMethod: options.originalMethod ?? null
    });
    message.hash = messageHash;
    message.signature = Uint8Array.from(signature);
    message.stamp = stamp;
    message.timestamp = timestamp;
    message.packed = Uint8Array.from(lxmfBytes);
    message.incoming = true;
    if (sourceIdentity !== null) {
      message.signatureValidated = sourceIdentity.validate(signature, signedPart);
      if (!message.signatureValidated) {
        message.unverifiedReason = LXMessageUnverifiedReason.SIGNATURE_INVALID;
      }
    } else {
      message.signatureValidated = false;
      message.unverifiedReason = LXMessageUnverifiedReason.SOURCE_UNKNOWN;
    }
    return message;
  }
  pack(provider, options = {}) {
    if (this.packed !== null) {
      throw new Error("LXMessage is already packed");
    }
    if (this.destination === null || this.source === null || this.source.identity === null) {
      throw new Error("LXMessage requires destination and source destinations to pack");
    }
    if (this.timestamp === null) {
      this.timestamp = Date.now() / 1e3;
    }
    const payloadCore = msgpackPackLxmPayload(this.timestamp, this.title, this.content, this.fields);
    const hashedPart = concatBytes14(this.destination.hash, this.source.hash, payloadCore);
    this.hash = Identity.fullHash(provider, hashedPart);
    let stamp = null;
    if (options.deferStamp !== true) {
      stamp = options.stamp ?? null;
    }
    const payload = msgpackPackLxmPayload(this.timestamp, this.title, this.content, this.fields, stamp);
    const signedPart = concatBytes14(hashedPart, this.hash);
    this.signature = this.source.identity.sign(signedPart);
    this.signatureValidated = true;
    this.stamp = stamp;
    this.packed = concatBytes14(this.destination.hash, this.source.hash, this.signature, payload);
    this.selectDeliveryParameters(provider);
  }
  titleAsString() {
    return new TextDecoder().decode(this.title);
  }
  contentAsString() {
    return new TextDecoder().decode(this.content);
  }
  opportunisticPayload() {
    if (this.packed === null) {
      throw new Error("LXMessage must be packed before extracting opportunistic payload");
    }
    return this.packed.subarray(DESTINATION_LENGTH);
  }
  selectDeliveryParameters(provider) {
    if (this.packed === null) {
      return;
    }
    const desiredMethod = this.desiredMethod ?? LXMessageMethod.DIRECT;
    const payload = this.packed.subarray(2 * DESTINATION_LENGTH + SIGNATURE_LENGTH);
    const contentSize = payload.length - TIMESTAMP_SIZE - STRUCT_OVERHEAD;
    if (desiredMethod === LXMessageMethod.OPPORTUNISTIC) {
      if (contentSize > ENCRYPTED_PACKET_MAX_CONTENT) {
        throw new TypeError(`Opportunistic LXMF content of length ${contentSize} exceeds single-packet limit ${ENCRYPTED_PACKET_MAX_CONTENT}`);
      }
      this.method = LXMessageMethod.OPPORTUNISTIC;
      this.representation = LXMessageRepresentation.PACKET;
      return;
    }
    if (desiredMethod === LXMessageMethod.DIRECT) {
      this.method = LXMessageMethod.DIRECT;
      this.representation = contentSize <= LINK_PACKET_MAX_CONTENT ? LXMessageRepresentation.PACKET : LXMessageRepresentation.RESOURCE;
      return;
    }
    if (desiredMethod === LXMessageMethod.PROPAGATED) {
      if (this.destination === null || this.destination.identity === null) {
        throw new Error("PROPAGATED LXMF requires destination identity");
      }
      const encryptedPayload = this.destination.identity.encrypt(this.packed.subarray(DESTINATION_LENGTH));
      const lxmfData = concatBytes14(this.destination.hash, encryptedPayload);
      this.transientId = Identity.fullHash(provider, lxmfData);
      this.propagationPacked = msgpackPackPropagationEnvelope(this.timestamp ?? Date.now() / 1e3, [lxmfData]);
      const propagationSize = this.propagationPacked.length;
      if (propagationSize > LINK_PACKET_MAX_CONTENT) {
        this.method = LXMessageMethod.PROPAGATED;
        this.representation = LXMessageRepresentation.RESOURCE;
        return;
      }
      this.method = LXMessageMethod.PROPAGATED;
      this.representation = LXMessageRepresentation.PACKET;
    }
  }
};
function encodeTextOrBytes(value) {
  return typeof value === "string" ? new TextEncoder().encode(value) : Uint8Array.from(value);
}
function concatBytes14(...parts) {
  const length = parts.reduce((total, part) => total + part.length, 0);
  const output = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }
  return output;
}
function rememberMessage(seen, message) {
  if (message.hash === null) {
    return;
  }
  seen.add(bytesToHex2(message.hash));
}

// packages/lxmf-ts/dist/router.js
var LXMFRouter = class {
  reticulum;
  provider;
  deliveryDestination = null;
  deliveryCallback = null;
  directLinks = /* @__PURE__ */ new Map();
  seenMessages = /* @__PURE__ */ new Set();
  outboundPropagationNode = null;
  outboundPropagationLink = null;
  constructor(options) {
    this.reticulum = options.reticulum;
    this.provider = options.provider;
  }
  registerDeliveryIdentity(identity) {
    if (this.deliveryDestination !== null) {
      throw new Error("Only one delivery identity is supported per LXMF router instance");
    }
    const destination = this.reticulum.registerDestination({
      provider: this.provider,
      identity,
      direction: DestinationDirection.IN,
      type: DestinationType.SINGLE,
      appName: APP_NAME,
      aspects: ["delivery"]
    });
    destination.setPacketCallback((data, packet) => {
      this.handleDeliveryPacket(data, packet, LXMessageMethod.OPPORTUNISTIC);
    });
    destination.setLinkEstablishedCallback((link) => {
      this.handleDeliveryLink(link);
    });
    destination.setProofStrategy(DestinationProofStrategy.PROVE_ALL);
    destination.setAcceptLinkRequests(true);
    this.deliveryDestination = destination;
    return destination;
  }
  get deliveryIdentity() {
    return this.deliveryDestination?.identity ?? null;
  }
  get deliveryDestinationHash() {
    return this.deliveryDestination?.hash ?? null;
  }
  onDelivery(callback) {
    this.deliveryCallback = callback;
  }
  setOutboundPropagationNode(destinationHash) {
    this.outboundPropagationNode = Uint8Array.from(destinationHash);
    if (this.outboundPropagationLink !== null) {
      this.outboundPropagationLink.teardown();
      this.outboundPropagationLink = null;
    }
  }
  get outboundPropagationNodeHash() {
    return this.outboundPropagationNode;
  }
  watchPropagationNodes(callback) {
    this.reticulum.registerAnnounceHandler({
      aspectFilter: `${APP_NAME}.propagation`,
      receivedAnnounce: (info) => {
        this.setOutboundPropagationNode(info.destinationHash);
        callback?.(info.destinationHash);
      }
    });
  }
  createOutboundDestination(recipientIdentity) {
    return new Destination(this.provider, {
      identity: recipientIdentity,
      direction: DestinationDirection.OUT,
      type: DestinationType.SINGLE,
      appName: APP_NAME,
      aspects: ["delivery"]
    });
  }
  async send(message) {
    if (message.packed === null) {
      throw new Error("LXMessage must be packed before sending");
    }
    message.state = LXMessageState.OUTBOUND;
    if (message.method === LXMessageMethod.OPPORTUNISTIC) {
      await this.sendOpportunistic(message);
      return;
    }
    if (message.method === LXMessageMethod.DIRECT) {
      await this.sendDirect(message);
      return;
    }
    if (message.method === LXMessageMethod.PROPAGATED) {
      await this.sendPropagated(message);
      return;
    }
    throw new Error(`Unsupported LXMF delivery method: ${message.method}`);
  }
  packAndSend(options) {
    const message = LXMessage.pack({ provider: this.provider, ...options });
    return this.send(message);
  }
  async sendOpportunistic(message) {
    const destination = message.destination;
    if (destination === null) {
      throw new Error("Opportunistic LXMF requires destination");
    }
    const outbound = this.reticulum.registerDestination({
      provider: this.provider,
      identity: destination.identity,
      direction: DestinationDirection.OUT,
      type: DestinationType.SINGLE,
      appName: APP_NAME,
      aspects: ["delivery"]
    });
    const receipt = await outbound.send(message.opportunisticPayload(), { createReceipt: true });
    if (receipt === null) {
      message.state = LXMessageState.FAILED;
      return;
    }
    message.state = LXMessageState.SENT;
    message.progress = 0.5;
    await pollDeliveryReceipt(receipt);
    if (receipt.status === PacketReceiptStatus.DELIVERED) {
      message.state = LXMessageState.DELIVERED;
      message.progress = 1;
    }
  }
  async sendDirect(message) {
    const destination = message.destination;
    if (destination === null || destination.identity === null) {
      throw new Error("Direct LXMF requires destination");
    }
    if (message.packed === null) {
      throw new Error("Direct LXMF requires packed message");
    }
    const recipientIdentity = destination.identity;
    const destinationKey = bytesToHex2(destination.hash);
    let link = this.directLinks.get(destinationKey) ?? null;
    if (link === null || link.status !== LinkStatus.ACTIVE) {
      const outbound = this.reticulum.registerDestination({
        provider: this.provider,
        identity: recipientIdentity,
        direction: DestinationDirection.OUT,
        type: DestinationType.SINGLE,
        appName: APP_NAME,
        aspects: ["delivery"]
      });
      link = await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error("Direct LXMF link timeout")), 5e3);
        outbound.requestLink({
          linkEstablished(establishLink) {
            clearTimeout(timer);
            resolve(establishLink);
          }
        });
      });
      this.directLinks.set(destinationKey, link);
      this.handleDeliveryLink(link);
    }
    message.state = LXMessageState.SENDING;
    await link.send(message.packed);
    message.state = LXMessageState.DELIVERED;
    message.progress = 1;
  }
  async sendPropagated(message) {
    if (this.outboundPropagationNode === null) {
      throw new Error("No outbound propagation node configured");
    }
    if (message.propagationPacked === null) {
      throw new Error("PROPAGATED LXMF requires propagationPacked");
    }
    if (message.representation !== LXMessageRepresentation.PACKET) {
      throw new Error("Large propagated LXMF via resource is not implemented");
    }
    const link = await this.ensureOutboundPropagationLink();
    message.state = LXMessageState.SENDING;
    const result = await link.sendContext(PacketContext.NONE, message.propagationPacked, {
      createReceipt: true
    });
    message.progress = 0.5;
    if (result.receipt !== null) {
      await pollDeliveryReceipt(result.receipt);
      if (result.receipt.status === PacketReceiptStatus.DELIVERED) {
        message.state = LXMessageState.SENT;
        message.progress = 1;
        return;
      }
    }
    message.state = LXMessageState.FAILED;
  }
  async ensureOutboundPropagationLink() {
    if (this.outboundPropagationLink !== null && this.outboundPropagationLink.status === LinkStatus.ACTIVE) {
      return this.outboundPropagationLink;
    }
    if (this.outboundPropagationNode === null) {
      throw new Error("No outbound propagation node configured");
    }
    const nodeIdentity = Identity.recall(this.provider, this.outboundPropagationNode);
    if (nodeIdentity === null) {
      throw new Error("Propagation node identity is unknown");
    }
    const outbound = this.reticulum.registerDestination({
      provider: this.provider,
      identity: nodeIdentity,
      direction: DestinationDirection.OUT,
      type: DestinationType.SINGLE,
      appName: APP_NAME,
      aspects: ["propagation"]
    });
    const link = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("Propagation link timeout")), 5e3);
      outbound.requestLink({
        linkEstablished(establishLink) {
          clearTimeout(timer);
          resolve(establishLink);
        }
      });
    });
    this.outboundPropagationLink = link;
    return link;
  }
  handleDeliveryPacket(data, packet, method) {
    const lxmfData = method === LXMessageMethod.OPPORTUNISTIC ? concatBytes15(packet.destinationHash, data) : data;
    return this.deliver(lxmfData, method);
  }
  handleDeliveryLink(link) {
    link.callbacks.packet = (data) => {
      this.deliver(data, LXMessageMethod.DIRECT);
    };
  }
  deliver(lxmfData, method = LXMessageMethod.DIRECT) {
    const message = this.unpackDeliverable(lxmfData, method);
    if (message === null) {
      return false;
    }
    this.deliveryCallback?.(message);
    return true;
  }
  /** Mirrors LXMF/LXMRouter.lxmf_propagation local-delivery branch. */
  handlePropagationData(lxmfData) {
    if (lxmfData.length < DESTINATION_LENGTH) {
      return null;
    }
    const destinationHash = lxmfData.subarray(0, DESTINATION_LENGTH);
    const deliveryDestination = this.deliveryDestination;
    if (deliveryDestination === null || !equalBytes3(deliveryDestination.hash, destinationHash)) {
      return null;
    }
    const decrypted = deliveryDestination.decrypt(lxmfData.subarray(DESTINATION_LENGTH));
    if (decrypted === null) {
      return null;
    }
    const deliveryData = concatBytes15(destinationHash, decrypted);
    const message = this.unpackDeliverable(deliveryData, LXMessageMethod.PROPAGATED);
    if (message !== null) {
      this.deliveryCallback?.(message);
    }
    return message;
  }
  trackDirectLink(destinationHash, link) {
    this.directLinks.set(bytesToHex2(destinationHash), link);
    this.handleDeliveryLink(link);
  }
  unpackDeliverable(lxmfData, method) {
    try {
      const message = LXMessage.unpackFromBytes(lxmfData, {
        provider: this.provider,
        originalMethod: method
      });
      if (!message.signatureValidated) {
        return null;
      }
      if (message.hash !== null) {
        const key = bytesToHex2(message.hash);
        if (this.seenMessages.has(key)) {
          return null;
        }
        rememberMessage(this.seenMessages, message);
      }
      message.method = method;
      message.state = LXMessageState.DELIVERED;
      return message;
    } catch {
      return null;
    }
  }
};
function concatBytes15(...parts) {
  const length = parts.reduce((total, part) => total + part.length, 0);
  const output = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }
  return output;
}
async function pollDeliveryReceipt(receipt, timeoutMs = 500) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (receipt.status === PacketReceiptStatus.DELIVERED || receipt.status === PacketReceiptStatus.FAILED) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

// packages/lxmf-ts/dist/propagation-server.js
var DEFAULT_PROPAGATION_QUOTAS = {
  maxBytes: 256 * 1024 * 1024,
  maxMessages: 1e4,
  maxMessageBytes: 1e6,
  perClientRequestsPerMinute: 120
};

// packages/host-core/dist/web-leaf-host.js
async function createWebLeafHost(options) {
  assertWebLeafRoles(DEFAULT_WEB_LEAF_ROLES);
  const provider = options.provider ?? new PureCryptoProvider();
  const runtime = options.runtime ?? webRuntime(options.identity);
  const reticulum = Reticulum.create({ provider, runtime });
  reticulum.start();
  const identity = await loadOrCreateWebIdentity(provider, options.identity);
  const startedAt = Date.now();
  const wsClient = await WebSocketClientInterface.connect(provider, runtime, {
    name: "web-leaf-ws",
    provider,
    runtime,
    url: options.gatewayUrl,
    ...options.sharedToken === void 0 ? {} : { sharedToken: options.sharedToken }
  });
  reticulum.registerInterface(wsClient);
  const lxmf = new LXMFRouter({ reticulum, provider });
  const fetchPlane = options.fetchPlane ?? createResourceFetchPlane({
    reticulum,
    provider
  });
  const buildStatus = () => {
    const interfaces = reticulum.listInterfaces();
    const linkOnline = interfaces.some((iface) => iface.online);
    return {
      running: true,
      uptimeMs: Date.now() - startedAt,
      identityHash: bytesToHex2(identity.hash),
      identityPersisted: true,
      gatewayUrl: options.gatewayUrl,
      linkOnline,
      onlineInterfaces: interfaces.filter((iface) => iface.online).length,
      pathTableCount: reticulum.pathTableCount,
      activeLinkCount: reticulum.activeLinkCount,
      bandwidthBytesOut: reticulum.bandwidthBytesOut,
      bandwidthBytesIn: reticulum.bandwidthBytesIn
    };
  };
  return {
    reticulum,
    identity,
    lxmf,
    fetchPlane,
    getStatus: buildStatus,
    async stop() {
      await wsClient.close();
      await reticulum.stop();
    }
  };
}

// packages/host-core/dist/web-package-storage.js
var DEFAULT_DB_NAME = "twistedpear-web-packages";
var DEFAULT_PACKAGE_QUOTA_BYTES = 64 * 1024 * 1024;
var DEFAULT_HOST_API_VERSION = "0.1.0";
var KV_OBJECT_STORE = "kv";
var IndexedDbBlobStore = class {
  dbName;
  ready;
  constructor(indexedDB, dbName) {
    this.dbName = dbName;
    this.ready = new Promise((resolve, reject) => {
      const request = indexedDB.open(dbName, 1);
      request.onupgradeneeded = (event) => {
        event.target?.result.createObjectStore(KV_OBJECT_STORE);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error(`Failed to open IndexedDB ${dbName}`));
    });
  }
  async get(key) {
    const result = await this.request((store) => store.get(key), "readonly");
    if (result === void 0) {
      return null;
    }
    return result instanceof Uint8Array ? Uint8Array.from(result) : new Uint8Array(result);
  }
  async set(key, value) {
    await this.request((store) => store.put(Uint8Array.from(value), key), "readwrite");
  }
  async delete(key) {
    await this.request((store) => store.delete(key), "readwrite");
  }
  async list(prefix) {
    const keys = await this.request((store) => store.getAllKeys(), "readonly");
    return keys.filter((key) => key.startsWith(prefix));
  }
  async request(makeRequest, mode) {
    const database = await this.ready;
    const request = makeRequest(database.transaction(KV_OBJECT_STORE, mode).objectStore(KV_OBJECT_STORE));
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed"));
    });
  }
};
var IndexedDbArchiveStore = class {
  kv;
  archivePrefix = "archive:";
  constructor(kv) {
    this.kv = kv;
  }
  async write(path, bytes) {
    await this.kv.set(this.key(path), bytes);
  }
  async read(path) {
    return this.kv.get(this.key(path));
  }
  key(path) {
    return `${this.archivePrefix}${path}`;
  }
};
var OpfsArchiveStore = class {
  root;
  constructor(root) {
    this.root = root;
  }
  async write(path, bytes) {
    const segments = path.split("/").filter((segment) => segment.length > 0);
    const fileName = segments.pop();
    if (fileName === void 0) {
      throw new Error(`Invalid archive path: ${path}`);
    }
    let directory = this.root;
    for (const segment of segments) {
      directory = await directory.getDirectoryHandle(segment, { create: true });
    }
    const fileHandle = await directory.getFileHandle(fileName, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(bytes);
    await writable.close();
  }
  async read(path) {
    try {
      const segments = path.split("/").filter((segment) => segment.length > 0);
      const fileName = segments.pop();
      if (fileName === void 0) {
        return null;
      }
      let directory = this.root;
      for (const segment of segments) {
        directory = await directory.getDirectoryHandle(segment);
      }
      const fileHandle = await directory.getFileHandle(fileName);
      const file = await fileHandle.getFile();
      return new Uint8Array(await file.arrayBuffer());
    } catch {
      return null;
    }
  }
};
function packageArchivePath(appId, version) {
  return `packages/${appId}/${version}.tpkg`;
}
function resolveBrowserStorage(options) {
  return options.storage ?? globalThis.navigator?.storage;
}
function resolveIndexedDb(options) {
  const indexedDB = options.indexedDB ?? globalThis.indexedDB;
  if (indexedDB === void 0) {
    throw new Error("IndexedDB is required for web package storage");
  }
  return indexedDB;
}
async function createArchiveStore(options, kv) {
  const storage = resolveBrowserStorage(options);
  if (storage?.getDirectory !== void 0) {
    try {
      const root = await storage.getDirectory();
      return { store: new OpfsArchiveStore(root), backend: "opfs" };
    } catch {
    }
  }
  return { store: new IndexedDbArchiveStore(kv), backend: "indexeddb" };
}
function catalogKeyValueAdapter(kv) {
  return {
    async get(key) {
      const value = await kv.get(key);
      return value ?? void 0;
    },
    async set(key, value) {
      await kv.set(key, value);
    },
    async delete(key) {
      await kv.delete(key);
    }
  };
}
var WebPackageStorage = class {
  archiveBackend;
  provider;
  hostApiVersion;
  installedStore;
  casStore;
  archiveStore;
  storage;
  catalogKv;
  constructor(options, kv, archive, installedStore) {
    this.provider = options.provider ?? new PureCryptoProvider();
    this.hostApiVersion = options.hostApiVersion ?? DEFAULT_HOST_API_VERSION;
    this.installedStore = installedStore;
    this.archiveStore = archive.store;
    this.archiveBackend = archive.backend;
    this.storage = resolveBrowserStorage(options);
    this.catalogKv = catalogKeyValueAdapter(kv);
    this.casStore = new CasStore(kv, (data) => this.provider.sha512(data));
  }
  async installArchive(archiveBytes) {
    const verified = verifyPackage(this.provider, archiveBytes, {
      hostApiVersion: this.hostApiVersion
    });
    const appId = verified.manifest.name;
    const version = verified.manifest.version;
    const archivePath = packageArchivePath(appId, version);
    const existing = this.installedStore.get(appId, version);
    if (existing !== null) {
      const stored = await this.archiveStore.read(archivePath);
      if (stored !== null && stored.length === archiveBytes.length) {
        return {
          appId,
          version,
          packageHash: existing.packageHash,
          t256: encode256t(archiveBytes, (data) => this.provider.sha512(data)),
          archivePath,
          archiveBytes: stored.length
        };
      }
    }
    const t256 = await this.casStore.put(archiveBytes);
    await this.archiveStore.write(archivePath, archiveBytes);
    this.installedStore.install({
      appId,
      version,
      packageHash: verified.packageHash,
      installedAt: Date.now(),
      manifest: verified.manifest,
      archivePath
    }, archiveBytes.length);
    await this.installedStore.save(this.catalogKv);
    return {
      appId,
      version,
      packageHash: verified.packageHash,
      t256,
      archivePath,
      archiveBytes: archiveBytes.length
    };
  }
  async readArchive(appId, version) {
    const record = this.installedStore.get(appId, version);
    if (record === null) {
      return null;
    }
    return this.archiveStore.read(record.archivePath);
  }
  listInstalled() {
    return this.installedStore.list();
  }
  activeVersion(appId) {
    return this.installedStore.activeVersion(appId);
  }
  getPackageUsedBytes() {
    return this.installedStore.storageUsedBytes();
  }
  async getQuotaInfo() {
    const estimate = await this.storage?.estimate?.() ?? {};
    const persisted = await this.storage?.persisted?.() ?? false;
    return {
      usageBytes: estimate.usage ?? null,
      quotaBytes: estimate.quota ?? null,
      persisted,
      packageUsedBytes: this.getPackageUsedBytes(),
      packageQuotaBytes: this.installedStore.quotaBytes,
      archiveBackend: this.archiveBackend
    };
  }
  async requestPersistence() {
    if (this.storage?.persist === void 0) {
      return false;
    }
    return this.storage.persist();
  }
};
async function createWebPackageStorage(options = {}) {
  const dbName = options.dbName ?? DEFAULT_DB_NAME;
  const kv = new IndexedDbBlobStore(resolveIndexedDb(options), dbName);
  const archive = await createArchiveStore(options, kv);
  const installedStore = new InstalledPackageStore(options.packageQuotaBytes ?? DEFAULT_PACKAGE_QUOTA_BYTES);
  await installedStore.load(catalogKeyValueAdapter(kv));
  return new WebPackageStorage(options, kv, archive, installedStore);
}
async function resetWebPackageStorage(options = {}) {
  const dbName = options.dbName ?? DEFAULT_DB_NAME;
  const indexedDB = resolveIndexedDb(options);
  await new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(dbName);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error("Failed to delete web package DB"));
  });
}
export {
  DEFAULT_WEB_LEAF_ROLES,
  assertWebLeafRoles,
  createResourceFetchPlane,
  createWebLeafHost,
  createWebPackageStorage,
  listResourceVersions,
  resetWebPackageStorage
};
/*! Bundled license information:

@noble/ciphers/esm/utils.js:
  (*! noble-ciphers - MIT License (c) 2023 Paul Miller (paulmillr.com) *)

@noble/hashes/esm/utils.js:
  (*! noble-hashes - MIT License (c) 2022 Paul Miller (paulmillr.com) *)

@noble/curves/esm/utils.js:
  (*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) *)

@noble/curves/esm/abstract/modular.js:
  (*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) *)

@noble/curves/esm/abstract/curve.js:
  (*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) *)

@noble/curves/esm/abstract/edwards.js:
  (*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) *)

@noble/curves/esm/abstract/montgomery.js:
  (*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) *)

@noble/curves/esm/ed25519.js:
  (*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) *)
*/
