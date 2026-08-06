/**
 * Globals @noble/* and PureCryptoProvider expect on Bare (no node:util).
 * Register a no-op unhandledRejection listener first so Bare does not abort.
 */
try {
  Bare.on("unhandledRejection", (reason) => {
    const detail =
      reason instanceof Error
        ? `${reason.name}: ${reason.message}\n${reason.stack ?? ""}`
        : String(reason);
    console.error("[bare] unhandledRejection", detail);
    try {
      BareKit.IPC.write(
        Buffer.from(
          `${JSON.stringify({ type: "log", line: `unhandledRejection: ${detail}` })}\n`,
        ),
      );
    } catch {
      // swallow
    }
  });
  Bare.on("uncaughtException", (err) => {
    const detail =
      err instanceof Error
        ? `${err.name}: ${err.message}\n${err.stack ?? ""}`
        : String(err);
    console.error("[bare] uncaughtException", detail);
    try {
      BareKit.IPC.write(
        Buffer.from(
          `${JSON.stringify({ type: "log", line: `uncaughtException: ${detail}` })}\n`,
        ),
      );
    } catch {
      // swallow
    }
  });
} catch {
  // Bare may be unavailable outside the worklet runtime.
}

const cryptoShim = {
  getRandomValues(array) {
    for (let index = 0; index < array.length; index += 1) {
      array[index] = (Math.random() * 256) | 0;
    }

    return array;
  },
  subtle: {},
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
          throw new RangeError(
            "bare TextEncoder shim supports Latin-1 input only",
          );
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
