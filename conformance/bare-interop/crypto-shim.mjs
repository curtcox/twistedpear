/**
 * Minimal Web Crypto surface for @noble/* on Bare (no native addons).
 * Interop tests use pinned identity vectors; getRandomValues covers ephemeral nonces.
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
