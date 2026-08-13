import {
  requestHostConfirmation,
  type ConfirmationEffects,
  type HostConfirmationChannel,
} from "../confirm.js";

export class FreenetBrokerServiceError extends Error {
  constructor(
    readonly code: "FREENET_UNCONFIGURED" | "FREENET_BAD_REQUEST",
    message: string,
  ) {
    super(message);
    this.name = "FreenetBrokerServiceError";
  }
}

/**
 * Host-provided Freenet contract adapter. Lives outside Sans-IO protocol roots;
 * the broker only forwards validated byte payloads.
 */
export interface FreenetContractBackend {
  get(keyHex: string): Promise<{ keyHex: string; stateHex: string } | null>;
  put(options: {
    readonly wasmHex: string;
    readonly parametersHex: string;
    readonly stateHex: string;
  }): Promise<{ keyHex: string }>;
  update(options: {
    readonly keyHex: string;
    readonly codeHashHex: string;
    readonly stateHex: string;
  }): Promise<void>;
}

function nodeConfirmationEffects(): ConfirmationEffects {
  return {
    randomBytes(length: number): Uint8Array {
      const bytes = new Uint8Array(length);
      const c = globalThis.crypto as Crypto | undefined;
      if (typeof c?.getRandomValues !== "function") {
        throw new Error(
          "crypto.getRandomValues is required for confirmation tokens",
        );
      }
      c.getRandomValues(bytes);
      return bytes;
    },
    delay(ms: number): Promise<void> {
      return new Promise((resolve) => setTimeout(resolve, ms));
    },
  };
}

const confirmationEffects = nodeConfirmationEffects();

function requireHex(label: string, value: unknown): string {
  if (
    typeof value !== "string" ||
    !/^[0-9a-fA-F]*$/.test(value) ||
    value.length % 2 !== 0
  ) {
    throw new FreenetBrokerServiceError(
      "FREENET_BAD_REQUEST",
      `${label} must be even-length hex`,
    );
  }
  return value.toLowerCase();
}

export class FreenetBrokerService {
  constructor(
    private readonly backend: FreenetContractBackend,
    private readonly confirmationChannel: HostConfirmationChannel | undefined,
  ) {}

  async get(payload: {
    keyHex: unknown;
  }): Promise<{ keyHex: string; stateHex: string } | null> {
    const keyHex = requireHex("keyHex", payload.keyHex);
    return this.backend.get(keyHex);
  }

  async put(
    context: { appId: string; publisherPublicKey: string },
    payload: { wasmHex: unknown; parametersHex: unknown; stateHex: unknown },
  ): Promise<{ keyHex: string }> {
    const wasmHex = requireHex("wasmHex", payload.wasmHex);
    const parametersHex = requireHex("parametersHex", payload.parametersHex);
    const stateHex = requireHex("stateHex", payload.stateHex);
    await requestHostConfirmation(
      this.confirmationChannel,
      {
        kind: "freenet-update",
        appId: context.appId,
        publisherPublicKey: context.publisherPublicKey,
        summary: {
          operation: "put",
          parametersBytes: String(parametersHex.length / 2),
          stateBytes: String(stateHex.length / 2),
          note: "Updates are published to a global network and cannot be recalled.",
        },
      },
      confirmationEffects,
    );
    return this.backend.put({ wasmHex, parametersHex, stateHex });
  }

  async update(
    context: { appId: string; publisherPublicKey: string },
    payload: { keyHex: unknown; codeHashHex: unknown; stateHex: unknown },
  ): Promise<{ updated: true }> {
    const keyHex = requireHex("keyHex", payload.keyHex);
    const codeHashHex = requireHex("codeHashHex", payload.codeHashHex);
    const stateHex = requireHex("stateHex", payload.stateHex);
    await requestHostConfirmation(
      this.confirmationChannel,
      {
        kind: "freenet-update",
        appId: context.appId,
        publisherPublicKey: context.publisherPublicKey,
        summary: {
          operation: "update",
          keyHex,
          stateBytes: String(stateHex.length / 2),
          note: "Updates are published to a global network and cannot be recalled.",
        },
      },
      confirmationEffects,
    );
    await this.backend.update({ keyHex, codeHashHex, stateHex });
    return { updated: true };
  }
}
