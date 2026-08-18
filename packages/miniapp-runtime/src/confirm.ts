export type ConfirmationKind =
  | "package"
  | "publish"
  | "install"
  | "preview"
  | "trust-import"
  | "device-session"
  | "device-stream"
  | "device-remote-grant"
  | "freenet-update"
  | "app-channel";

export interface ConfirmationRequest {
  readonly token: string;
  readonly kind: ConfirmationKind;
  readonly appId: string;
  readonly publisherPublicKey: string;
  readonly summary: Readonly<Record<string, string>>;
}

export interface ConfirmationResult {
  readonly approved: boolean;
  readonly detail?: unknown;
}

export interface HostConfirmationChannel {
  confirm(request: ConfirmationRequest): Promise<ConfirmationResult>;
}

/** Effects injected by adapters — protocol code never touches entropy or timers. */
export interface ConfirmationEffects {
  readonly randomBytes: (length: number) => Uint8Array;
  readonly delay: (ms: number) => Promise<void>;
  readonly now?: () => number;
  readonly limiter?: ConfirmationRateLimiter;
}

export class ConfirmationError extends Error {
  constructor(
    readonly code:
      | "CONFIRMATION_UNAVAILABLE"
      | "CONFIRMATION_DENIED"
      | "CONFIRMATION_TIMEOUT"
      | "CONFIRMATION_RATE_LIMITED",
    message: string,
  ) {
    super(message);
    this.name = "ConfirmationError";
  }
}

export const DEFAULT_CONFIRMATION_TIMEOUT_MS = 60_000;
export const DEFAULT_CONFIRMATION_RATE_MAX = 3;
export const DEFAULT_CONFIRMATION_RATE_WINDOW_MS = 10_000;

export class ConfirmationRateLimiter {
  private readonly stamps = new Map<string, number[]>();

  constructor(
    readonly max: number = DEFAULT_CONFIRMATION_RATE_MAX,
    readonly windowMs: number = DEFAULT_CONFIRMATION_RATE_WINDOW_MS,
  ) {}

  assert(appId: string, now: number): void {
    const cutoff = now - this.windowMs;
    const kept = (this.stamps.get(appId) ?? []).filter(
      (stamp) => stamp > cutoff,
    );
    if (kept.length >= this.max) {
      throw new ConfirmationError(
        "CONFIRMATION_RATE_LIMITED",
        `Confirmation rate for "${appId}" exceeds ${this.max} per ${this.windowMs}ms.`,
      );
    }
    kept.push(now);
    this.stamps.set(appId, kept);
  }
}

const CONTROL_CHARS = /[\u0000-\u001F\u007F\u202A-\u202E\u2066-\u2069]/g;

export function sanitizeConfirmationSummary(
  summary: Readonly<Record<string, string>>,
): Readonly<Record<string, string>> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(summary)) {
    out[key] = value.replace(CONTROL_CHARS, " ").replace(/\s+/g, " ").trim();
  }
  return out;
}

export function generateConfirmationToken(
  randomBytes: (length: number) => Uint8Array,
): string {
  const bytes = randomBytes(16);
  return Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join(
    "",
  );
}

export async function requestHostConfirmation(
  channel: HostConfirmationChannel | undefined,
  request: Omit<ConfirmationRequest, "token">,
  effects: ConfirmationEffects,
  timeoutMs = DEFAULT_CONFIRMATION_TIMEOUT_MS,
): Promise<ConfirmationResult> {
  if (channel === undefined) {
    throw new ConfirmationError(
      "CONFIRMATION_UNAVAILABLE",
      `No confirmation channel is configured; "${request.kind}" was denied.`,
    );
  }

  const now = effects.now;
  if (now !== undefined && effects.limiter !== undefined) {
    effects.limiter.assert(request.appId, now());
  }

  const tokenized: ConfirmationRequest = {
    ...request,
    summary: sanitizeConfirmationSummary(request.summary),
    token: generateConfirmationToken(effects.randomBytes),
  };
  const timeout = effects
    .delay(timeoutMs)
    .then((): ConfirmationResult => ({ approved: false, detail: "timeout" }));
  const result = await Promise.race([channel.confirm(tokenized), timeout]);
  if (!result.approved) {
    throw new ConfirmationError(
      result.detail === "timeout"
        ? "CONFIRMATION_TIMEOUT"
        : "CONFIRMATION_DENIED",
      `The user did not approve "${request.kind}" for app "${request.appId}".`,
    );
  }

  return result;
}
