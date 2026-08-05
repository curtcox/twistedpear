/**
 * @noble/* crypto resolver — avoids node:crypto on Bare.
 */
const cryptoShim = {
  getRandomValues(array) {
    for (let index = 0; index < array.length; index += 1) {
      array[index] = (Math.random() * 256) | 0;
    }

    return array;
  },
  subtle: {},
};

const resolved = globalThis.crypto ?? cryptoShim;
if (globalThis.crypto === undefined) {
  globalThis.crypto = resolved;
}

export const crypto = resolved;
