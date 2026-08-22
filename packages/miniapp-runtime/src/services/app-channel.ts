import {
  requestHostConfirmation,
  type HostConfirmationChannel,
} from "../confirm.js";
import { createNodeConfirmationEffects } from "./confirmation-effects.js";

const APP_CHANNEL_MAX_PAYLOAD_BYTES = 16 * 1024;
const APP_CHANNEL_MAX_INBOX = 32;

const APP_ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,63}$/;

type AppChannelErrorCode =
  | "CHANNEL_BAD_REQUEST"
  | "CHANNEL_SELF"
  | "CHANNEL_PEER_NOT_RUNNING"
  | "CHANNEL_AMBIGUOUS_PEER"
  | "CHANNEL_NOT_GRANTED"
  | "CHANNEL_PAYLOAD_TOO_LARGE"
  | "CHANNEL_INBOX_FULL";

class AppChannelError extends Error {
  constructor(
    readonly code: AppChannelErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "AppChannelError";
  }
}

export interface AppChannelPeer {
  readonly appId: string;
  readonly publisherPublicKey: string;
}

export interface AppChannelMessage {
  readonly id: string;
  readonly from: AppChannelPeer;
  readonly payload: string;
  readonly sentAt: number;
}

export type AppChannelResolveResult = AppChannelPeer | null | "ambiguous";

export interface AppChannelHost {
  resolvePeer(
    appId: string,
    publisherPublicKey?: string,
  ): AppChannelResolveResult;
  now(): number;
}

const confirmationEffects = createNodeConfirmationEffects();

function identityKey(peer: AppChannelPeer): string {
  return `${peer.publisherPublicKey}\n${peer.appId}`;
}

function consentKey(from: AppChannelPeer, to: AppChannelPeer): string {
  return `${identityKey(from)}\0${identityKey(to)}`;
}

function parsePeer(
  payload: unknown,
  field: string,
): { appId: string; publisherPublicKey?: string } {
  const value = payload as {
    appId?: unknown;
    publisherPublicKey?: unknown;
  } | null;
  if (value === null || typeof value !== "object") {
    throw new AppChannelError(
      "CHANNEL_BAD_REQUEST",
      `Expected ${field} to name a mini-app.`,
    );
  }
  if (typeof value.appId !== "string" || !APP_ID_PATTERN.test(value.appId)) {
    throw new AppChannelError(
      "CHANNEL_BAD_REQUEST",
      "Destination app id must be lowercase alphanumeric/dashes.",
    );
  }
  if (
    value.publisherPublicKey !== undefined &&
    (typeof value.publisherPublicKey !== "string" ||
      value.publisherPublicKey.length === 0)
  ) {
    throw new AppChannelError(
      "CHANNEL_BAD_REQUEST",
      "Destination publisher public key must be a non-empty string.",
    );
  }
  return {
    appId: value.appId,
    ...(typeof value.publisherPublicKey === "string"
      ? { publisherPublicKey: value.publisherPublicKey }
      : {}),
  };
}

function parsePayload(value: unknown): string {
  if (typeof value !== "string") {
    throw new AppChannelError(
      "CHANNEL_BAD_REQUEST",
      "Channel payload must be a string.",
    );
  }
  const bytes = new TextEncoder().encode(value).length;
  if (bytes > APP_CHANNEL_MAX_PAYLOAD_BYTES) {
    throw new AppChannelError(
      "CHANNEL_PAYLOAD_TOO_LARGE",
      `Channel payload exceeds ${APP_CHANNEL_MAX_PAYLOAD_BYTES} bytes.`,
    );
  }
  return value;
}

export class AppChannelService {
  private readonly consents = new Map<string, AppChannelPeer>();
  private readonly inboxes = new Map<string, AppChannelMessage[]>();
  private readonly watchers = new Map<string, Set<(message: AppChannelMessage) => void>>();
  private nextMessageId = 0;

  constructor(
    private readonly host: AppChannelHost,
    private readonly confirmationChannel: HostConfirmationChannel | undefined,
  ) {}

  async open(
    caller: AppChannelPeer,
    payload: unknown,
  ): Promise<{ destination: AppChannelPeer }> {
    const destination = this.requireRunningPeer(caller, payload);
    await requestHostConfirmation(
      this.confirmationChannel,
      {
        kind: "app-channel",
        appId: caller.appId,
        publisherPublicKey: caller.publisherPublicKey,
        summary: {
          destination: destination.appId,
          destinationPublisher: destination.publisherPublicKey,
          note: "This app may send messages to the named mini-app. The other app must grant the same channel separately. Shared storage is not included.",
        },
      },
      confirmationEffects,
    );
    this.consents.set(consentKey(caller, destination), destination);
    return { destination };
  }

  send(caller: AppChannelPeer, payload: unknown): { id: string } {
    const request = payload as { payload?: unknown } | null;
    const destination = this.requireRunningPeer(caller, payload);
    this.assertMutualConsent(caller, destination);
    const body = parsePayload(request?.payload);
    const inboxKey = identityKey(destination);
    const inbox = this.inboxes.get(inboxKey) ?? [];
    if (inbox.length >= APP_CHANNEL_MAX_INBOX) {
      throw new AppChannelError(
        "CHANNEL_INBOX_FULL",
        `Destination inbox already holds ${APP_CHANNEL_MAX_INBOX} messages.`,
      );
    }
    const id = `channel-${this.host.now()}-${this.nextMessageId++}`;
    inbox.push({
      id,
      from: caller,
      payload: body,
      sentAt: this.host.now(),
    });
    this.inboxes.set(inboxKey, inbox);
    const delivered = inbox[inbox.length - 1]!;
    for (const handler of this.watchers.get(inboxKey) ?? []) {
      handler(delivered);
    }
    return { id };
  }

  watch(
    peer: AppChannelPeer,
    handler: (message: AppChannelMessage) => void,
  ): () => void {
    const key = identityKey(peer);
    const bucket = this.watchers.get(key) ?? new Set();
    bucket.add(handler);
    this.watchers.set(key, bucket);
    return () => {
      bucket.delete(handler);
      if (bucket.size === 0) this.watchers.delete(key);
    };
  }

  receive(caller: AppChannelPeer): ReadonlyArray<AppChannelMessage> {
    const key = identityKey(caller);
    const inbox = this.inboxes.get(key) ?? [];
    this.inboxes.delete(key);
    return inbox;
  }

  close(caller: AppChannelPeer, payload: unknown): { closed: true } {
    const named = parsePeer(payload, "destination");
    const destination = this.findConsentedPeer(caller, named);
    if (destination !== null) {
      this.consents.delete(consentKey(caller, destination));
    }
    return { closed: true };
  }

  peers(caller: AppChannelPeer): ReadonlyArray<AppChannelPeer> {
    const ready: AppChannelPeer[] = [];
    const fromKey = identityKey(caller);
    for (const [key, destination] of this.consents) {
      if (!key.startsWith(`${fromKey}\0`)) continue;
      const running = this.host.resolvePeer(
        destination.appId,
        destination.publisherPublicKey,
      );
      if (running === null || running === "ambiguous") continue;
      if (!this.consents.has(consentKey(running, caller))) continue;
      ready.push(running);
    }
    return ready;
  }

  dropInbox(peer: AppChannelPeer): void {
    this.inboxes.delete(identityKey(peer));
  }

  dropApp(peer: AppChannelPeer): void {
    const key = identityKey(peer);
    this.inboxes.delete(key);
    this.watchers.delete(key);
    for (const consent of [...this.consents.keys()]) {
      if (consent.startsWith(`${key}\0`) || consent.endsWith(`\0${key}`)) {
        this.consents.delete(consent);
      }
    }
  }

  private findConsentedPeer(
    caller: AppChannelPeer,
    named: { appId: string; publisherPublicKey?: string },
  ): AppChannelPeer | null {
    if (named.publisherPublicKey !== undefined) {
      return {
        appId: named.appId,
        publisherPublicKey: named.publisherPublicKey,
      };
    }
    const matches: AppChannelPeer[] = [];
    const fromKey = identityKey(caller);
    for (const [key, destination] of this.consents) {
      if (!key.startsWith(`${fromKey}\0`)) continue;
      if (destination.appId === named.appId) matches.push(destination);
    }
    if (matches.length > 1) {
      throw new AppChannelError(
        "CHANNEL_AMBIGUOUS_PEER",
        `Multiple channel grants match "${named.appId}"; include publisherPublicKey.`,
      );
    }
    return matches[0] ?? null;
  }

  private requireRunningPeer(
    caller: AppChannelPeer,
    payload: unknown,
  ): AppChannelPeer {
    const named = parsePeer(payload, "destination");
    const resolved = this.host.resolvePeer(
      named.appId,
      named.publisherPublicKey,
    );
    if (resolved === "ambiguous") {
      throw new AppChannelError(
        "CHANNEL_AMBIGUOUS_PEER",
        `Multiple running apps are named "${named.appId}"; include publisherPublicKey.`,
      );
    }
    if (resolved === null) {
      throw new AppChannelError(
        "CHANNEL_PEER_NOT_RUNNING",
        `Mini-app "${named.appId}" is not running.`,
      );
    }
    if (
      resolved.appId === caller.appId &&
      resolved.publisherPublicKey === caller.publisherPublicKey
    ) {
      throw new AppChannelError(
        "CHANNEL_SELF",
        "A mini-app cannot open a channel to itself.",
      );
    }
    return resolved;
  }

  private assertMutualConsent(
    caller: AppChannelPeer,
    destination: AppChannelPeer,
  ): void {
    if (
      !this.consents.has(consentKey(caller, destination)) ||
      !this.consents.has(consentKey(destination, caller))
    ) {
      throw new AppChannelError(
        "CHANNEL_NOT_GRANTED",
        `No mutually granted channel between "${caller.appId}" and "${destination.appId}".`,
      );
    }
  }
}
