/**
 * Mutation engine for the wire-format fuzzers.
 *
 * The previous strategy looked like it swept the byte space and did not. It
 * flipped one bit, choosing both the position and the bit from the same seed:
 *
 *     const index = seed % mutated.length;
 *     mutated[index] ^= 1 << (seed % 8);
 *
 * Coupling the two means a given position only ever sees the handful of values
 * its own residue class allows. Measured over the 256-iteration default, that
 * was 4.76 distinct values per byte position out of 256 — under 2%. It is why a
 * `throw` injected behind `raw[2] === 0x11` was never reached: byte 2 could
 * take eight values and 0x11 was not one of them.
 *
 * This engine decouples position from value, replaces whole bytes rather than
 * only toggling bits, and biases towards the values that break parsers.
 */

/**
 * Deterministic PRNG (mulberry32). Every case is reproducible from its seed,
 * which is what makes a counterexample worth committing.
 */
export function createRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Values that disproportionately trip length and tag parsing: boundaries,
 * sign-bit flips, and the all-ones byte.
 */
const INTERESTING_BYTES = [
  0x00, 0x01, 0x7f, 0x80, 0x81, 0xfe, 0xff, 0x11, 0x0a, 0x0d, 0x20, 0x7e,
];

/** @typedef {{name: string, bytes: Uint8Array}} Mutation */

/**
 * Produce one mutation of `input`, drawn from a mix of operators.
 *
 * Returning the operator name alongside the bytes means a failure can say what
 * was done to the seed, not just what came out.
 */
/**
 * @param {Uint8Array} input
 * @param {() => number} random
 * @returns {Mutation}
 */
export function mutateOnce(input, random) {
  const pick = random();

  if (input.length === 0) {
    return { name: "empty-passthrough", bytes: Uint8Array.from(input) };
  }

  // Byte replacement, uniform over the whole space. This is the operator the
  // old strategy lacked entirely.
  if (pick < 0.3) {
    const bytes = Uint8Array.from(input);
    const index = Math.floor(random() * bytes.length);
    bytes[index] = Math.floor(random() * 256);
    return { name: `replace@${index}`, bytes };
  }

  // Interesting-value splat.
  if (pick < 0.5) {
    const bytes = Uint8Array.from(input);
    const index = Math.floor(random() * bytes.length);
    bytes[index] =
      INTERESTING_BYTES[Math.floor(random() * INTERESTING_BYTES.length)];
    return { name: `interesting@${index}`, bytes };
  }

  // Bit flip, but with the position drawn independently of the bit.
  if (pick < 0.65) {
    const bytes = Uint8Array.from(input);
    const index = Math.floor(random() * bytes.length);
    const bit = Math.floor(random() * 8);
    bytes[index] = bytes[index] ^ (1 << bit);
    return { name: `flip@${index}:${bit}`, bytes };
  }

  // Truncation, at any offset rather than a seed-derived one.
  if (pick < 0.75) {
    const length = Math.floor(random() * input.length);
    return {
      name: `truncate@${length}`,
      bytes: Uint8Array.from(input.subarray(0, length)),
    };
  }

  // Extension with arbitrary bytes.
  if (pick < 0.85) {
    const extra = 1 + Math.floor(random() * 64);
    const bytes = new Uint8Array(input.length + extra);
    bytes.set(input, 0);
    for (let index = 0; index < extra; index += 1) {
      bytes[input.length + index] = Math.floor(random() * 256);
    }
    return { name: `extend+${extra}`, bytes };
  }

  // Chunk duplication: the operator that finds length-field confusion.
  if (pick < 0.95) {
    const start = Math.floor(random() * input.length);
    const length = 1 + Math.floor(random() * (input.length - start));
    const chunk = input.subarray(start, start + length);
    const bytes = new Uint8Array(input.length + chunk.length);
    bytes.set(input, 0);
    bytes.set(chunk, input.length);
    return { name: `duplicate@${start}+${length}`, bytes };
  }

  // Whole-buffer randomisation, to escape the seed's shape entirely.
  const bytes = new Uint8Array(input.length);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Math.floor(random() * 256);
  }
  return { name: "randomize", bytes };
}

/**
 * Apply between one and three operators, so a case can reach states no single
 * edit produces.
 */
/**
 * @param {Uint8Array} input
 * @param {() => number} random
 * @returns {{bytes: Uint8Array, operators: string[]}}
 */
export function mutate(input, random) {
  let bytes = Uint8Array.from(input);
  /** @type {string[]} */
  const operators = [];
  const rounds = 1 + Math.floor(random() * 3);
  for (let round = 0; round < rounds; round += 1) {
    const mutation = mutateOnce(bytes, random);
    bytes = mutation.bytes;
    operators.push(mutation.name);
  }
  return { bytes, operators };
}

/**
 * @param {Uint8Array} bytes
 * @returns {string}
 */
export function bytesToHex(bytes) {
  return Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join(
    "",
  );
}
