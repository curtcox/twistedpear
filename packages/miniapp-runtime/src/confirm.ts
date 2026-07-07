export type ConfirmationKind = "package" | "publish" | "install" | "preview" | "trust-import";

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

export class ConfirmationError extends Error {
  constructor(
    readonly code: "CONFIRMATION_UNAVAILABLE" | "CONFIRMATION_DENIED" | "CONFIRMATION_TIMEOUT",
    message: string
  ) {
    super(message);
    this.name = "ConfirmationError";
  }
}

export const DEFAULT_CONFIRMATION_TIMEOUT_MS = 60_000;

export function generateConfirmationToken(): string {
  const bytes = new Uint8Array(16);
  const cryptoApi = (globalThis as { crypto?: { getRandomValues?: (array: Uint8Array) => Uint8Array } }).crypto;
  if (cryptoApi?.getRandomValues !== undefined) {
    cryptoApi.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }

  return Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
}

export async function requestHostConfirmation(
  channel: HostConfirmationChannel | undefined,
  request: Omit<ConfirmationRequest, "token">,
  timeoutMs = DEFAULT_CONFIRMATION_TIMEOUT_MS
): Promise<ConfirmationResult> {
  if (channel === undefined) {
    throw new ConfirmationError(
      "CONFIRMATION_UNAVAILABLE",
      `No confirmation channel is configured; "${request.kind}" was denied.`
    );
  }

  const tokenized: ConfirmationRequest = { ...request, token: generateConfirmationToken() };
  const timeout = new Promise<ConfirmationResult>((resolve) => {
    setTimeout(() => resolve({ approved: false, detail: "timeout" }), timeoutMs);
  });
  const result = await Promise.race([channel.confirm(tokenized), timeout]);
  if (!result.approved) {
    throw new ConfirmationError(
      result.detail === "timeout" ? "CONFIRMATION_TIMEOUT" : "CONFIRMATION_DENIED",
      `The user did not approve "${request.kind}" for app "${request.appId}".`
    );
  }

  return result;
}
