export interface NotifyPostRequest {
  readonly title: string;
  readonly body: string;
  readonly event: string;
  readonly tag?: string;
}

export interface HostNotification {
  readonly id: string;
  readonly appId: string;
  readonly publisherPublicKey: string;
  readonly title: string;
  readonly body: string;
  readonly event: string;
  readonly tag?: string;
  readonly at: number;
  readonly attributed: true;
}

export class NotifyServiceError extends Error {
  constructor(
    readonly code:
      "NOTIFY_DISABLED" | "NOTIFY_RATE_LIMITED" | "NOTIFY_BAD_REQUEST",
    message: string,
  ) {
    super(message);
    this.name = "NotifyServiceError";
  }
}

/** Per-host token bucket: small burst, low sustained rate. */
const NOTIFY_BURST = 3;
const NOTIFY_REFILL_MS = 10_000;
const NOTIFY_HISTORY_LIMIT = 50;
const MAX_TITLE = 80;
const MAX_BODY = 240;
const MAX_EVENT = 64;
const MAX_TAG = 64;

export class NotifyService {
  private tokens = NOTIFY_BURST;
  private lastRefillAt: number;
  private readonly disabled = new Set<string>();
  private readonly records: HostNotification[] = [];
  private nextId = 0;

  constructor(private readonly now: () => number) {
    this.lastRefillAt = now();
  }

  setEnabled(appId: string, enabled: boolean): void {
    if (enabled) this.disabled.delete(appId);
    else this.disabled.add(appId);
  }

  isEnabled(appId: string): boolean {
    return !this.disabled.has(appId);
  }

  history(): ReadonlyArray<HostNotification> {
    return [...this.records];
  }

  get(id: string): HostNotification | undefined {
    return this.records.find((entry) => entry.id === id);
  }

  post(
    appId: string,
    publisherPublicKey: string,
    request: NotifyPostRequest,
  ): HostNotification {
    const title = boundString(request.title, MAX_TITLE, "title");
    const body = boundString(request.body, MAX_BODY, "body");
    const event = boundString(request.event, MAX_EVENT, "event");
    const tag =
      request.tag === undefined
        ? undefined
        : boundString(request.tag, MAX_TAG, "tag");
    if (!this.isEnabled(appId)) {
      throw new NotifyServiceError(
        "NOTIFY_DISABLED",
        "Notifications are disabled for this app.",
      );
    }
    this.refill();
    if (this.tokens < 1) {
      throw new NotifyServiceError(
        "NOTIFY_RATE_LIMITED",
        "Notification rate ceiling reached.",
      );
    }
    this.tokens -= 1;
    const record: HostNotification = {
      id: `notify-${this.now()}-${this.nextId++}`,
      appId,
      publisherPublicKey,
      title,
      body,
      event,
      at: this.now(),
      attributed: true,
      ...(tag === undefined ? {} : { tag }),
    };
    this.records.push(record);
    if (this.records.length > NOTIFY_HISTORY_LIMIT) {
      this.records.shift();
    }
    return record;
  }

  private refill(): void {
    const elapsed = this.now() - this.lastRefillAt;
    if (elapsed < NOTIFY_REFILL_MS) return;
    const gained = Math.floor(elapsed / NOTIFY_REFILL_MS);
    this.tokens = Math.min(NOTIFY_BURST, this.tokens + gained);
    this.lastRefillAt += gained * NOTIFY_REFILL_MS;
  }
}

function boundString(value: unknown, max: number, field: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new NotifyServiceError(
      "NOTIFY_BAD_REQUEST",
      `Notification ${field} must be a non-empty string.`,
    );
  }
  if (value.length > max) {
    throw new NotifyServiceError(
      "NOTIFY_BAD_REQUEST",
      `Notification ${field} exceeds ${max} characters.`,
    );
  }
  return value;
}
