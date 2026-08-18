import {
  assertCapabilityAllowed,
  type MiniappCapability,
} from "./capabilities.js";

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

export type BrokerHandler = (
  request: BrokerRequest,
  context: BrokerContext,
) => Promise<unknown> | unknown;

export interface BrokerOptions {
  readonly maxMessageBytes?: number;
  readonly maxMessagesPerSecond?: number;
  readonly now: () => number;
  readonly audit?: (entry: BrokerAuditEntry) => void;
  /** Test/negative-control switch; production callers must leave this enabled. */
  readonly enforceCapabilities?: boolean;
}

/**
 * Why a dispatch ended the way it did.
 *
 * `allowed` alone cannot say this: a call whose capability check passed and
 * whose handler then threw is not a refusal, and reporting it as one sends
 * whoever reads the audit looking at grants for a fault that lies in the
 * backend. `allowed` keeps its old meaning — the capability check passed and
 * the call counted as an access — so grant projections are unaffected.
 */
type BrokerAuditOutcome = "allowed" | "denied" | "failed";

export interface BrokerAuditEntry {
  readonly appId: string;
  readonly namespace: string;
  readonly method: string;
  readonly capability: string | null;
  readonly allowed: boolean;
  readonly outcome: BrokerAuditOutcome;
  readonly at: number;
  /** Destination the call named, when the method is offer-scoped egress. */
  readonly target?: string;
  /** Present on `denied` and `failed`. */
  readonly error?: {
    readonly code: string;
    readonly message: string;
  };
}

interface RateBucket {
  windowStartedAt: number;
  count: number;
}

export class BrokerError extends Error {
  constructor(
    readonly code:
      | "UNKNOWN_METHOD"
      | "MESSAGE_TOO_LARGE"
      | "RATE_LIMITED"
      | "CAPABILITY_MISMATCH",
    message: string,
  ) {
    super(message);
    this.name = "BrokerError";
  }
}

export class MiniappBroker {
  private readonly handlers = new Map<
    string,
    { capability: MiniappCapability | null; handler: BrokerHandler }
  >();
  private readonly buckets = new Map<string, RateBucket>();
  private readonly rateOverrides = new Map<string, number>();

  constructor(private readonly options: BrokerOptions) {}

  setRateLimit(appId: string, maxMessagesPerSecond: number | null): void {
    if (maxMessagesPerSecond === null) {
      this.rateOverrides.delete(appId);
      return;
    }

    if (!Number.isFinite(maxMessagesPerSecond) || maxMessagesPerSecond < 1) {
      throw new RangeError(`Invalid rate limit: ${maxMessagesPerSecond}`);
    }

    this.rateOverrides.set(appId, Math.floor(maxMessagesPerSecond));
  }

  getRateLimit(appId: string): number {
    return (
      this.rateOverrides.get(appId) ?? this.options.maxMessagesPerSecond ?? 128
    );
  }

  register(
    namespace: string,
    method: string,
    capability: MiniappCapability | null,
    handler: BrokerHandler,
  ): void {
    this.handlers.set(`${namespace}.${method}`, { capability, handler });
  }

  capabilityFor(
    namespace: string,
    method: string,
  ): MiniappCapability | null | undefined {
    return this.handlers.get(`${namespace}.${method}`)?.capability;
  }

  async dispatch(
    request: BrokerRequest,
    context: BrokerContext,
  ): Promise<BrokerResponse> {
    let capabilityAllowed = false;
    try {
      this.enforceMessageLimits(request, context);
      const registered = this.requireHandler(request);
      this.assertRequestCapability(request, registered.capability);
      this.enforceRegisteredCapability(registered.capability, context);
      capabilityAllowed = true;
      this.auditDispatch(request, context, {
        capability: registered.capability,
        allowed: true,
        outcome: "allowed",
      });
      const result = await registered.handler(request, context);
      return { id: request.id, ok: true, result };
    } catch (error) {
      return this.failDispatch(request, context, capabilityAllowed, error);
    }
  }

  private requireHandler(request: BrokerRequest): {
    capability: MiniappCapability | null;
    handler: BrokerHandler;
  } {
    const registered = this.handlers.get(
      `${request.namespace}.${request.method}`,
    );
    if (registered === undefined) {
      throw new BrokerError(
        "UNKNOWN_METHOD",
        `Unknown broker method ${request.namespace}.${request.method}`,
      );
    }
    return registered;
  }

  private assertRequestCapability(
    request: BrokerRequest,
    capability: MiniappCapability | null,
  ): void {
    if (request.capability !== undefined && request.capability !== capability) {
      throw new BrokerError(
        "CAPABILITY_MISMATCH",
        `Broker capability mismatch for ${request.namespace}.${request.method}`,
      );
    }
  }

  private enforceRegisteredCapability(
    capability: MiniappCapability | null,
    context: BrokerContext,
  ): void {
    if (capability !== null && this.options.enforceCapabilities !== false) {
      assertCapabilityAllowed({
        capability,
        declared: context.declaredCapabilities,
        granted: context.grantedCapabilities,
      });
    }
  }

  private auditDispatch(
    request: BrokerRequest,
    context: BrokerContext,
    entry: {
      capability: MiniappCapability | string | null;
      allowed: boolean;
      outcome: BrokerAuditOutcome;
      error?: BrokerAuditEntry["error"];
    },
  ): void {
    const target = egressTargetFromRequest(request);
    this.options.audit?.({
      appId: context.appId,
      namespace: request.namespace,
      method: request.method,
      capability: entry.capability,
      allowed: entry.allowed,
      outcome: entry.outcome,
      at: this.now(),
      ...(entry.error === undefined ? {} : { error: entry.error }),
      ...(target === undefined ? {} : { target }),
    });
  }

  private failDispatch(
    request: BrokerRequest,
    context: BrokerContext,
    capabilityAllowed: boolean,
    error: unknown,
  ): BrokerResponse {
    const detail = brokerErrorDetail(error);
    this.auditDispatch(request, context, {
      capability: request.capability ?? null,
      allowed: false,
      outcome: capabilityAllowed ? "failed" : "denied",
      error: detail,
    });
    return { id: request.id, ok: false, error: detail };
  }

  private enforceMessageLimits(
    request: BrokerRequest,
    context: BrokerContext,
  ): void {
    const maxBytes = this.options.maxMessageBytes ?? 256 * 1024;
    const encodedBytes = new TextEncoder().encode(
      JSON.stringify(request),
    ).length;
    if (encodedBytes > maxBytes) {
      throw new BrokerError(
        "MESSAGE_TOO_LARGE",
        `Broker message exceeds ${maxBytes} bytes`,
      );
    }

    const maxRate = this.getRateLimit(context.appId);
    const now = this.now();
    const bucket = this.buckets.get(context.appId);
    if (bucket === undefined || now - bucket.windowStartedAt >= 1_000) {
      this.buckets.set(context.appId, { windowStartedAt: now, count: 1 });
      return;
    }

    bucket.count += 1;
    if (bucket.count > maxRate) {
      throw new BrokerError(
        "RATE_LIMITED",
        `Broker message rate exceeds ${maxRate}/s`,
      );
    }
  }

  private now(): number {
    return this.options.now();
  }
}

function egressTargetFromRequest(request: BrokerRequest): string | undefined {
  const payload = request.payload;
  if (payload === undefined || typeof payload !== "object" || payload === null) {
    return undefined;
  }
  if (request.namespace === "lxmf" && request.method === "send") {
    const to = (payload as { to?: unknown }).to;
    return typeof to === "string" ? to : undefined;
  }
  if (request.namespace === "links" && request.method === "probe") {
    const peer = (payload as { peer?: unknown }).peer;
    if (typeof peer === "string") return peer;
    if (
      typeof peer === "object" &&
      peer !== null &&
      "id" in peer &&
      typeof peer.id === "string"
    ) {
      return peer.id;
    }
  }
  return undefined;
}

function brokerErrorDetail(error: unknown): {
  readonly code: string;
  readonly message: string;
} {
  return {
    code:
      error instanceof Error && "code" in error
        ? String(error.code)
        : "BROKER_ERROR",
    message: error instanceof Error ? error.message : "Broker dispatch failed",
  };
}
