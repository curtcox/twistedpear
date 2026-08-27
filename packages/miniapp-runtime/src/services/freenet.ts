import {
  requestHostConfirmation,
  type HostConfirmationChannel,
  type ConfirmationEffects,
} from "../confirm.js";
import { createNodeConfirmationEffects } from "./confirmation-effects.js";

export class FreenetBrokerServiceError extends Error {
  constructor(
    readonly code:
      "FREENET_UNCONFIGURED" | "FREENET_BAD_REQUEST" | "FREENET_KEY_DENIED",
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

const defaultConfirmationEffects = createNodeConfirmationEffects();

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
  private readonly writtenKeys = new Map<string, Set<string>>();

  constructor(
    private readonly backend: FreenetContractBackend,
    private readonly confirmationChannel: HostConfirmationChannel | undefined,
    private readonly readAllowlist: ReadonlySet<string> = new Set(),
    private readonly confirmationEffects: ConfirmationEffects = defaultConfirmationEffects,
  ) {}

  async get(
    context: { appId: string },
    payload: { keyHex: unknown },
  ): Promise<{ keyHex: string; stateHex: string } | null> {
    const keyHex = requireHex("keyHex", payload.keyHex);
    this.assertReadable(context.appId, keyHex);
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
      this.confirmationEffects,
    );
    const result = await this.backend.put({ wasmHex, parametersHex, stateHex });
    this.keysFor(context.appId).add(result.keyHex);
    return result;
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
      this.confirmationEffects,
    );
    await this.backend.update({ keyHex, codeHashHex, stateHex });
    this.keysFor(context.appId).add(keyHex);
    return { updated: true };
  }

  private keysFor(appId: string): Set<string> {
    const existing = this.writtenKeys.get(appId);
    if (existing !== undefined) return existing;
    const created = new Set<string>();
    this.writtenKeys.set(appId, created);
    return created;
  }

  private assertReadable(appId: string, keyHex: string): void {
    if (this.readAllowlist.has(keyHex) || this.keysFor(appId).has(keyHex)) {
      return;
    }
    throw new FreenetBrokerServiceError(
      "FREENET_KEY_DENIED",
      "Freenet reads are limited to keys this app published or the host allowlisted",
    );
  }
}
