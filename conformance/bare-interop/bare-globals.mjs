/**
 * Globals @noble/* and PureCryptoProvider expect on Bare (no node:util).
 */
const cryptoShim = {
  getRandomValues(array) {
    for (let index = 0; index < array.length; index += 1) {
      array[index] = (Math.random() * 256) | 0;
    }

    return array;
  },
  subtle: {}
};

if (globalThis.crypto === undefined) {
  globalThis.crypto = cryptoShim;
}

if (globalThis.TextEncoder === undefined) {
  globalThis.TextEncoder = class TextEncoder {
    encode(input = "") {
      const str = String(input);
      const out = new Uint8Array(str.length);
      for (let index = 0; index < str.length; index += 1) {
        const code = str.charCodeAt(index);
        if (code > 0xff) {
          throw new RangeError("bare TextEncoder shim supports Latin-1 input only");
        }
        out[index] = code;
      }
      return out;
    }
  };
}

if (globalThis.TextDecoder === undefined) {
  globalThis.TextDecoder = class TextDecoder {
    decode(input = new Uint8Array()) {
      let out = "";
      for (const byte of input) {
        out += String.fromCharCode(byte);
      }
      return out;
    }
  };
}
