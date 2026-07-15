import {
  TOKEN_IV_SIZE,
  TOKEN_OVERHEAD,
  initialAcceptTokenFrameState,
  initialPackPkcs7State,
  initialPackTokenFrameState,
  initialSplitTokenFrameState,
  initialSplitTokenKeyState,
  initialTokenIvLengthValidState,
  initialUnpackPkcs7State,
  packTokenFrameRawFromActions,
  pkcs7PadRawFromActions,
  pkcs7UnpadRawFromActions,
  shouldAcceptTokenFrameNow,
  shouldAcceptTokenIvLength,
  shouldRejectPackTokenFrame,
  shouldRejectPkcs7Unpad,
  shouldRejectSplitTokenKey,
  shouldUsePackTokenFrame,
  shouldUsePkcs7Pad,
  shouldUsePkcs7Unpad,
  shouldUseSplitTokenFrame,
  shouldUseSplitTokenKey,
  stepAcceptTokenFrameWithActions,
  stepPackTokenFrameWithActions,
  stepPkcs7PadWithActions,
  stepPkcs7UnpadWithActions,
  stepSplitTokenFrameWithActions,
  stepSplitTokenKeyWithActions,
  stepTokenIvLengthValidWithActions,
  tokenFrameFieldsFromActions,
  tokenHmacMatches,
  tokenKeyFieldsFromActions,
  tokenSignedMaterial
} from "@twistedpear/protocol";
import type { CryptoProvider } from "./provider.js";
import type { Entropy } from "../runtime/runtime.js";

/** Mirrors RNS/Cryptography/Token.py */
export { TOKEN_OVERHEAD };

export interface TokenEncryptOptions {
  readonly iv?: Uint8Array;
  /** Preferred entropy when `iv` is omitted. */
  readonly entropy?: Entropy;
}

export class Token {
  private readonly mode: "aes128" | "aes256";
  private readonly signingKey: Uint8Array;
  private readonly encryptionKey: Uint8Array;

  constructor(
    private readonly provider: CryptoProvider,
    key: Uint8Array
  ) {
    const stepped = stepSplitTokenKeyWithActions(initialSplitTokenKeyState(), {
      kind: "token-framing/split-key-gate",
      key
    });
    const parts = tokenKeyFieldsFromActions(stepped.actions);
    if (
      shouldRejectSplitTokenKey(stepped.actions) ||
      !shouldUseSplitTokenKey(stepped.actions) ||
      parts === null
    ) {
      throw new Error(`Token key must be 32 or 64 bytes, not ${key.length}`);
    }
    this.mode = parts.mode;
    this.signingKey = parts.signingKey;
    this.encryptionKey = parts.encryptionKey;
  }

  static generateKey(provider: CryptoProvider, entropy?: Entropy): Uint8Array {
    return entropy !== undefined ? entropy.randomBytes(32) : provider.randomBytes(32);
  }

  verifyHmac(token: Uint8Array): boolean {
    const stepped = stepSplitTokenFrameWithActions(initialSplitTokenFrameState(), {
      kind: "token-framing/split-gate",
      token
    });
    const frame = tokenFrameFieldsFromActions(stepped.actions);
    const acceptStepped = stepAcceptTokenFrameWithActions(initialAcceptTokenFrameState(), {
      kind: "token-framing/accept-frame-gate",
      framePresent: frame !== null
    });
    if (!shouldUseSplitTokenFrame(stepped.actions) || !shouldAcceptTokenFrameNow(acceptStepped.actions)) {
      throw new Error(`Cannot verify HMAC on token of only ${token.length} bytes`);
    }

    const expectedHmac = this.provider.hmacSha256(this.signingKey, frame!.signedMaterial);
    return tokenHmacMatches(frame!.hmac, expectedHmac);
  }

  encrypt(data: Uint8Array, options: TokenEncryptOptions = {}): Uint8Array {
    if (!(data instanceof Uint8Array)) {
      throw new TypeError("Token plaintext input must be bytes");
    }

    const iv =
      options.iv ??
      (options.entropy !== undefined
        ? options.entropy.randomBytes(TOKEN_IV_SIZE)
        : this.provider.randomBytes(TOKEN_IV_SIZE));
    const ivLengthStepped = stepTokenIvLengthValidWithActions(initialTokenIvLengthValidState(), {
      kind: "token-framing/iv-length-valid-gate",
      length: iv.length
    });
    if (!shouldAcceptTokenIvLength(ivLengthStepped.actions)) {
      throw new Error(`Token IV must be ${TOKEN_IV_SIZE} bytes`);
    }

    const padStepped = stepPkcs7PadWithActions(initialPackPkcs7State(), {
      kind: "pkcs7/pad-gate",
      data
    });
    if (!shouldUsePkcs7Pad(padStepped.actions)) {
      throw new Error("Could not pad token plaintext");
    }
    const padded = pkcs7PadRawFromActions(padStepped.actions);
    if (padded === null) {
      throw new Error("Could not pad token plaintext");
    }

    const ciphertext =
      this.mode === "aes256"
        ? this.provider.aes256CbcEncrypt(padded, this.encryptionKey, iv)
        : this.provider.aes128CbcEncrypt(padded, this.encryptionKey, iv);
    const signedParts = tokenSignedMaterial(iv, ciphertext);
    const hmac = this.provider.hmacSha256(this.signingKey, signedParts);
    const stepped = stepPackTokenFrameWithActions(initialPackTokenFrameState(), {
      kind: "token-framing/pack-gate",
      iv,
      ciphertext,
      hmac
    });
    if (shouldRejectPackTokenFrame(stepped.actions) || !shouldUsePackTokenFrame(stepped.actions)) {
      throw new Error(`Token IV must be ${TOKEN_IV_SIZE} bytes`);
    }
    const packed = packTokenFrameRawFromActions(stepped.actions);
    if (packed === null) {
      throw new Error(`Token IV must be ${TOKEN_IV_SIZE} bytes`);
    }
    return packed;
  }

  decrypt(token: Uint8Array): Uint8Array {
    if (!(token instanceof Uint8Array)) {
      throw new TypeError("Token must be bytes");
    }

    if (!this.verifyHmac(token)) {
      throw new Error("Token HMAC was invalid");
    }

    const stepped = stepSplitTokenFrameWithActions(initialSplitTokenFrameState(), {
      kind: "token-framing/split-gate",
      token
    });
    const frame = tokenFrameFieldsFromActions(stepped.actions);
    const acceptStepped = stepAcceptTokenFrameWithActions(initialAcceptTokenFrameState(), {
      kind: "token-framing/accept-frame-gate",
      framePresent: frame !== null
    });
    if (!shouldUseSplitTokenFrame(stepped.actions) || !shouldAcceptTokenFrameNow(acceptStepped.actions)) {
      throw new Error("Token HMAC was invalid");
    }

    try {
      const decrypted =
        this.mode === "aes256"
          ? this.provider.aes256CbcDecrypt(frame!.ciphertext, this.encryptionKey, frame!.iv)
          : this.provider.aes128CbcDecrypt(frame!.ciphertext, this.encryptionKey, frame!.iv);
      const unpadStepped = stepPkcs7UnpadWithActions(initialUnpackPkcs7State(), {
        kind: "pkcs7/unpad-gate",
        data: decrypted
      });
      if (shouldRejectPkcs7Unpad(unpadStepped.actions) || !shouldUsePkcs7Unpad(unpadStepped.actions)) {
        throw new Error("Could not decrypt token");
      }
      const plaintext = pkcs7UnpadRawFromActions(unpadStepped.actions);
      if (plaintext === null) {
        throw new Error("Could not decrypt token");
      }
      return plaintext;
    } catch {
      throw new Error("Could not decrypt token");
    }
  }
}
