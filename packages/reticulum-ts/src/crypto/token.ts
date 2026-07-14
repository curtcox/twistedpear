import {
  TOKEN_IV_SIZE,
  TOKEN_OVERHEAD,
  initialPackTokenFrameState,
  initialSplitTokenFrameState,
  isValidTokenIvLength,
  packTokenFrameRawFromActions,
  pkcs7Pad,
  pkcs7Unpad,
  shouldAcceptTokenFrame,
  shouldRejectPackTokenFrame,
  shouldUsePackTokenFrame,
  shouldUseSplitTokenFrame,
  splitTokenKey,
  stepPackTokenFrameWithActions,
  stepSplitTokenFrameWithActions,
  tokenFrameFieldsFromActions,
  tokenHmacMatches,
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
    const parts = splitTokenKey(key);
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
    if (!shouldUseSplitTokenFrame(stepped.actions) || !shouldAcceptTokenFrame(frame !== null)) {
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
    if (!isValidTokenIvLength(iv.length)) {
      throw new Error(`Token IV must be ${TOKEN_IV_SIZE} bytes`);
    }

    const ciphertext =
      this.mode === "aes256"
        ? this.provider.aes256CbcEncrypt(pkcs7Pad(data), this.encryptionKey, iv)
        : this.provider.aes128CbcEncrypt(pkcs7Pad(data), this.encryptionKey, iv);
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
    if (!shouldUseSplitTokenFrame(stepped.actions) || !shouldAcceptTokenFrame(frame !== null)) {
      throw new Error("Token HMAC was invalid");
    }

    try {
      const decrypted =
        this.mode === "aes256"
          ? this.provider.aes256CbcDecrypt(frame!.ciphertext, this.encryptionKey, frame!.iv)
          : this.provider.aes128CbcDecrypt(frame!.ciphertext, this.encryptionKey, frame!.iv);
      return pkcs7Unpad(decrypted);
    } catch {
      throw new Error("Could not decrypt token");
    }
  }
}
