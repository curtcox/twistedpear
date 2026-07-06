import { assertCapabilityAllowed, type MiniappCapability } from "./capabilities.js";

export interface BrokerRequest {
  readonly id: string;
  readonly namespace: string;
  readonly method: string;
  readonly capability?: string;
  readonly payload?: unknown;
  readonly sentAt?: number;
}

export interface BrokerResponse {
  readonly id: string;
  readonly ok: boolean;
  readonly result?: unknown;
  readonly error?: {
    readonly code: string;
    readonly message: string;
  };
}

export interface BrokerContext {
  readonly appId: string;
  readonly publisherPublicKey: string;
  readonly declaredCapabilities: ReadonlyArray<string>;
  readonly grantedCapabilities: ReadonlyArray<string>;
}

export type BrokerHandler = (request: BrokerRequest, context: BrokerContext) => Promise<unknown> | unknown;

export interface BrokerOptions {
  readonly maxMessageBytes?: number;
  readonly maxMessagesPerSecond?: number;
  readonly now?: () => number;
  readonly audit?: (entry: BrokerAuditEntry) => void;
}

export interface BrokerAuditEntry {
  readonly appId: string;
  readonly namespace: string;
  readonly method: string;
  readonly capability: string | null;
  readonly allowed: boolean;
  readonly at: number;
}

interface RateBucket {
  windowStartedAt: number;
  count: number;
}

export class BrokerError extends Error {
  constructor(readonly code: "UNKNOWN_METHOD" | "MESSAGE_TOO_LARGE" | "RATE_LIMITED", message: string) {
    super(message);
    this.name = "BrokerError";
  }
}

export class MiniappBroker {
  private readonly handlers = new Map<string, { capability: MiniappCapability | null; handler: BrokerHandler }>();
  private readonly buckets = new Map<string, RateBucket>();

  constructor(private readonly options: BrokerOptions = {}) {}

  register(namespace: string, method: string, capability: MiniappCapability | null, handler: BrokerHandler): void {
    this.handlers.set(`${namespace}.${method}`, { capability, handler });
  }

  async dispatch(request: BrokerRequest, context: BrokerContext): Promise<BrokerResponse> {
    try {
      this.enforceMessageLimits(request, context);
      const registered = this.handlers.get(`${request.namespace}.${request.method}`);
      if (registered === undefined) {
        throw new BrokerError("UNKNOWN_METHOD", `Unknown broker method ${request.namespace}.${request.method}`);
      }

      const capability = request.capability ?? registered.capability;
      if (capability !== null) {
        assertCapabilityAllowed({
          capability,
          declared: context.declaredCapabilities,
          granted: context.grantedCapabilities
        });
      }

      this.options.audit?.({
        appId: context.appId,
        namespace: request.namespace,
        method: request.method,
        capability,
        allowed: true,
        at: this.now()
      });

      const result = await registered.handler(request, context);
      return { id: request.id, ok: true, result };
    } catch (error) {
      this.options.audit?.({
        appId: context.appId,
        namespace: request.namespace,
        method: request.method,
        capability: request.capability ?? null,
        allowed: false,
        at: this.now()
      });

      return {
        id: request.id,
        ok: false,
        error: {
          code: error instanceof Error && "code" in error ? String(error.code) : "BROKER_ERROR",
          message: error instanceof Error ? error.message : "Broker dispatch failed"
        }
      };
    }
  }

  private enforceMessageLimits(request: BrokerRequest, context: BrokerContext): void {
    const maxBytes = this.options.maxMessageBytes ?? 256 * 1024;
    const encodedBytes = new TextEncoder().encode(JSON.stringify(request)).length;
    if (encodedBytes > maxBytes) {
      throw new BrokerError("MESSAGE_TOO_LARGE", `Broker message exceeds ${maxBytes} bytes`);
    }

    const maxRate = this.options.maxMessagesPerSecond ?? 128;
    const now = this.now();
    const bucket = this.buckets.get(context.appId);
    if (bucket === undefined || now - bucket.windowStartedAt >= 1_000) {
      this.buckets.set(context.appId, { windowStartedAt: now, count: 1 });
      return;
    }

    bucket.count += 1;
    if (bucket.count > maxRate) {
      throw new BrokerError("RATE_LIMITED", `Broker message rate exceeds ${maxRate}/s`);
    }
  }

  private now(): number {
    return this.options.now?.() ?? Date.now();
  }
}
