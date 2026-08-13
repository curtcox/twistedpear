import { xchacha20poly1305 } from "@noble/ciphers/chacha.js";
import { sha256 } from "@noble/hashes/sha2.js";
import {
  decodePeerInvitation,
  decodePeerInvitationText,
  encodePeerInvitationText,
  type PeerInvitationRole,
} from "@twistedpear/protocol";
import type {
  AcceptOptions,
  DiscoveryAvailability,
  DiscoveryEvent,
  DiscoverySession,
  OfferOptions,
  PeerDiscoveryAdapter,
} from "./types.js";
import { PeerDiscoveryError } from "./errors.js";
import { PeerReplayCache } from "./replay-cache.js";

const SECRET_PREFIX = "TPN1-";
const SHORT_SECRET_PREFIX = "TPN2-";
const PACKET_MAGIC = new Uint8Array([0x54, 0x50, 0x4e, 0x31]);
const SECRET_BYTES = 48;
const SHORT_SECRET_BYTES = 16;
const SECRET_CHECKSUM_BYTES = 4;
const MESSAGE_ID_BYTES = 16;
const NONCE_BYTES = 24;
const HEADER_BYTES = 4 + 1 + MESSAGE_ID_BYTES + 8 + NONCE_BYTES;
const MAX_NTFY_PACKET_BYTES = 20_000;
const MAX_NTFY_RESPONSE_BYTES = 256_000;

export interface NtfyRendezvousSecret {
  readonly topic: Uint8Array;
  readonly key: Uint8Array;
  readonly codeSeed?: Uint8Array;
}
export interface NtfyRendezvousMessage {
  readonly id: Uint8Array;
  readonly role: PeerInvitationRole;
  readonly expiresAt: number;
  readonly envelope: Uint8Array;
}
export interface NtfyClientConfig {
  readonly baseUrl: string;
  readonly bearerToken?: string;
  readonly fetch?: typeof fetch;
  readonly entropy: (length: number) => Promise<Uint8Array>;
  readonly now?: () => number;
}
export interface NtfyRendezvousEffect {
  createSecret(): Promise<NtfyRendezvousSecret>;
  publish(secret: NtfyRendezvousSecret, envelope: Uint8Array): Promise<void>;
  poll(
    secret: NtfyRendezvousSecret,
  ): Promise<ReadonlyArray<NtfyRendezvousMessage>>;
}
export interface NtfySecretChannel {
  availability(): Promise<DiscoveryAvailability>;
  presentCode(
    session: DiscoverySession,
    code: string,
    options: OfferOptions,
  ): Promise<void>;
  requestCode(
    session: DiscoverySession,
    options: AcceptOptions,
  ): Promise<string>;
  cancel(sessionId: string): Promise<void>;
}
export interface NtfyDiscoveryAdapterOptions {
  readonly client: NtfyRendezvousEffect;
  readonly channel: NtfySecretChannel;
  readonly createSessionId: () => string;
  readonly now?: () => number;
  readonly pollIntervalMs?: number;
}

function concat(parts: ReadonlyArray<Uint8Array>): Uint8Array {
  const size = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}
function equal(left: Uint8Array, right: Uint8Array): boolean {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1)
    difference |= (left[index] ?? 0) ^ (right[index] ?? 0);
  return difference === 0;
}
function hex(bytes: Uint8Array): string {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
function base64url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}
function unbase64url(text: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]+$/.test(text))
    throw new PeerDiscoveryError(
      "INVALID_INVITATION",
      "Invalid ntfy rendezvous code",
    );
  const padded = text
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(Math.ceil(text.length / 4) * 4, "=");
  let binary: string;
  try {
    binary = atob(padded);
  } catch {
    throw new PeerDiscoveryError(
      "INVALID_INVITATION",
      "Invalid ntfy rendezvous code",
    );
  }
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}
function deriveShortSecret(seed: Uint8Array): NtfyRendezvousSecret {
  if (seed.length !== SHORT_SECRET_BYTES)
    throw new Error("ntfy short code requires a 16-byte seed");
  const topic = sha256(
    concat([new TextEncoder().encode("twistedpear/ntfy/topic/v2"), seed]),
  ).subarray(0, 16);
  const key = sha256(
    concat([new TextEncoder().encode("twistedpear/ntfy/key/v2"), seed]),
  );
  return { topic, key, codeSeed: seed.slice() };
}
async function withNtfyPromiseBudget<T>(
  source: Promise<T>,
  options: OfferOptions,
  cancel: () => Promise<void>,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let abortListener: (() => void) | undefined;
  const budget = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(
      () =>
        reject(new PeerDiscoveryError("TIMEOUT", "Peer discovery timed out")),
      options.timeoutMs,
    );
    if (options.signal !== undefined) {
      abortListener = () =>
        reject(new PeerDiscoveryError("CANCELLED", "Peer discovery cancelled"));
      if (options.signal.aborted) abortListener();
      else
        options.signal.addEventListener("abort", abortListener, { once: true });
    }
  });
  try {
    return await Promise.race([source, budget]);
  } catch (error) {
    await cancel();
    throw error;
  } finally {
    if (timer !== undefined) clearTimeout(timer);
    if (options.signal !== undefined && abortListener !== undefined)
      options.signal.removeEventListener("abort", abortListener);
  }
}

export function encodeNtfyRendezvousSecret(
  secret: NtfyRendezvousSecret,
): string {
  if (secret.topic.length !== 16 || secret.key.length !== 32)
    throw new Error("ntfy secret requires a 16-byte topic and 32-byte key");
  if (secret.codeSeed !== undefined) {
    const derived = deriveShortSecret(secret.codeSeed);
    if (!equal(derived.topic, secret.topic) || !equal(derived.key, secret.key))
      throw new Error("ntfy short-code seed does not match its topic and key");
    return `${SHORT_SECRET_PREFIX}${encodePeerInvitationText(secret.codeSeed)}`;
  }
  const body = concat([secret.topic, secret.key]);
  return `${SECRET_PREFIX}${base64url(concat([body, sha256(body).subarray(0, SECRET_CHECKSUM_BYTES)]))}`;
}

export function decodeNtfyRendezvousSecret(code: string): NtfyRendezvousSecret {
  const normalized = code.trim();
  if (normalized.startsWith(SHORT_SECRET_PREFIX)) {
    let seed: Uint8Array;
    try {
      seed = decodePeerInvitationText(
        normalized.slice(SHORT_SECRET_PREFIX.length),
      );
    } catch {
      throw new PeerDiscoveryError(
        "INVALID_INVITATION",
        "Invalid ntfy short code or checksum",
      );
    }
    if (seed.length !== SHORT_SECRET_BYTES)
      throw new PeerDiscoveryError(
        "INVALID_INVITATION",
        "Invalid ntfy short code length",
      );
    return deriveShortSecret(seed);
  }
  if (!normalized.startsWith(SECRET_PREFIX))
    throw new PeerDiscoveryError(
      "INVALID_INVITATION",
      "Unknown ntfy rendezvous code version",
    );
  const bytes = unbase64url(normalized.slice(SECRET_PREFIX.length));
  if (bytes.length !== SECRET_BYTES + SECRET_CHECKSUM_BYTES)
    throw new PeerDiscoveryError(
      "INVALID_INVITATION",
      "Invalid ntfy rendezvous code length",
    );
  const body = bytes.subarray(0, SECRET_BYTES);
  if (
    !equal(
      bytes.subarray(SECRET_BYTES),
      sha256(body).subarray(0, SECRET_CHECKSUM_BYTES),
    )
  )
    throw new PeerDiscoveryError(
      "INVALID_INVITATION",
      "ntfy rendezvous checksum mismatch",
    );
  return { topic: body.slice(0, 16), key: body.slice(16, 48) };
}

export function encryptNtfyRendezvousMessage(
  secret: NtfyRendezvousSecret,
  envelope: Uint8Array,
  messageId: Uint8Array,
  nonce: Uint8Array,
  now = Date.now(),
): Uint8Array {
  const invitation = decodePeerInvitation(envelope, now);
  if (messageId.length !== MESSAGE_ID_BYTES || nonce.length !== NONCE_BYTES)
    throw new Error("Invalid ntfy message id or nonce length");
  const header = new Uint8Array(HEADER_BYTES);
  header.set(PACKET_MAGIC, 0);
  header[4] = invitation.role === "offer" ? 0 : 1;
  header.set(messageId, 5);
  new DataView(header.buffer).setBigUint64(
    21,
    BigInt(invitation.expiresAt),
    false,
  );
  header.set(nonce, 29);
  const ciphertext = xchacha20poly1305(secret.key, nonce, header).encrypt(
    envelope,
  );
  const packet = concat([header, ciphertext]);
  if (packet.length > MAX_NTFY_PACKET_BYTES)
    throw new PeerDiscoveryError(
      "QUOTA_EXCEEDED",
      "Encrypted ntfy rendezvous message exceeds size budget",
    );
  return packet;
}

export function decryptNtfyRendezvousMessage(
  secret: NtfyRendezvousSecret,
  packet: Uint8Array,
  now = Date.now(),
): NtfyRendezvousMessage {
  if (
    packet.length < HEADER_BYTES + 16 ||
    packet.length > MAX_NTFY_PACKET_BYTES ||
    !equal(packet.subarray(0, 4), PACKET_MAGIC)
  )
    throw new PeerDiscoveryError(
      "INVALID_INVITATION",
      "Malformed ntfy rendezvous message",
    );
  const roleByte = packet[4];
  if (roleByte !== 0 && roleByte !== 1)
    throw new PeerDiscoveryError(
      "INVALID_INVITATION",
      "Invalid ntfy rendezvous role",
    );
  const expiresAt = Number(
    new DataView(packet.buffer, packet.byteOffset, HEADER_BYTES).getBigUint64(
      21,
      false,
    ),
  );
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= now)
    throw new PeerDiscoveryError(
      "INVALID_INVITATION",
      "Expired ntfy rendezvous message",
    );
  const nonce = packet.subarray(29, HEADER_BYTES);
  let envelope: Uint8Array;
  try {
    envelope = xchacha20poly1305(
      secret.key,
      nonce,
      packet.subarray(0, HEADER_BYTES),
    ).decrypt(packet.subarray(HEADER_BYTES));
  } catch {
    throw new PeerDiscoveryError(
      "INVALID_INVITATION",
      "ntfy rendezvous authentication failed",
    );
  }
  const invitation = decodePeerInvitation(envelope, now);
  const role = roleByte === 0 ? "offer" : "answer";
  if (invitation.role !== role || invitation.expiresAt !== expiresAt)
    throw new PeerDiscoveryError(
      "INVALID_INVITATION",
      "ntfy rendezvous metadata does not match its invitation",
    );
  return { id: packet.slice(5, 21), role, expiresAt, envelope };
}

export class NtfyRendezvousClient {
  private readonly fetchEffect: typeof fetch;
  private readonly baseUrl: URL;
  private readonly replay = new PeerReplayCache();
  constructor(private readonly config: NtfyClientConfig) {
    this.fetchEffect = config.fetch ?? globalThis.fetch;
    this.baseUrl = new URL(config.baseUrl);
    if (
      this.baseUrl.protocol !== "https:" &&
      !(
        this.baseUrl.protocol === "http:" &&
        ["localhost", "127.0.0.1", "::1"].includes(this.baseUrl.hostname)
      )
    )
      throw new Error(
        "ntfy base URL must use HTTPS (HTTP is allowed only for local tests)",
      );
  }
  async createSecret(): Promise<NtfyRendezvousSecret> {
    const seed = await this.config.entropy(SHORT_SECRET_BYTES);
    if (seed.length !== SHORT_SECRET_BYTES)
      throw new Error(
        "Entropy provider returned an invalid ntfy short-code seed",
      );
    return deriveShortSecret(seed);
  }
  async publish(
    secret: NtfyRendezvousSecret,
    envelope: Uint8Array,
  ): Promise<void> {
    const [id, nonce] = await Promise.all([
      this.config.entropy(MESSAGE_ID_BYTES),
      this.config.entropy(NONCE_BYTES),
    ]);
    const packet = encryptNtfyRendezvousMessage(
      secret,
      envelope,
      id,
      nonce,
      this.now(),
    );
    const response = await this.request(this.topicUrl(secret), {
      method: "POST",
      headers: this.headers({
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      }),
      body: base64url(packet),
    });
    if (!response.ok)
      throw new PeerDiscoveryError(
        response.status === 401 || response.status === 403
          ? "POLICY_DENIED"
          : "UNAVAILABLE",
        `ntfy publish failed (${response.status})`,
      );
  }
  async poll(
    secret: NtfyRendezvousSecret,
  ): Promise<ReadonlyArray<NtfyRendezvousMessage>> {
    const url = new URL(
      `${hex(secret.topic)}/json`,
      this.baseUrl.href.endsWith("/")
        ? this.baseUrl
        : new URL(`${this.baseUrl.href}/`),
    );
    url.searchParams.set("poll", "1");
    const response = await this.request(url, {
      method: "GET",
      headers: this.headers({
        Accept: "application/x-ndjson",
        "Cache-Control": "no-store",
      }),
    });
    if (!response.ok)
      throw new PeerDiscoveryError(
        response.status === 401 || response.status === 403
          ? "POLICY_DENIED"
          : "UNAVAILABLE",
        `ntfy poll failed (${response.status})`,
      );
    const declared = Number(response.headers.get("content-length") ?? "0");
    if (declared > MAX_NTFY_RESPONSE_BYTES)
      throw new PeerDiscoveryError(
        "QUOTA_EXCEEDED",
        "ntfy response exceeds size budget",
      );
    const text = await response.text();
    if (text.length > MAX_NTFY_RESPONSE_BYTES)
      throw new PeerDiscoveryError(
        "QUOTA_EXCEEDED",
        "ntfy response exceeds size budget",
      );
    const messages: NtfyRendezvousMessage[] = [];
    for (const line of text.split("\n")) {
      if (!line.trim()) continue;
      let event: unknown;
      try {
        event = JSON.parse(line);
      } catch {
        continue;
      }
      const message =
        typeof event === "object" && event !== null && "message" in event
          ? (event as { message?: unknown }).message
          : undefined;
      if (typeof message !== "string") continue;
      let decoded: NtfyRendezvousMessage;
      try {
        decoded = decryptNtfyRendezvousMessage(
          secret,
          unbase64url(message),
          this.now(),
        );
      } catch {
        continue;
      }
      if (
        this.replay.acceptOnce(hex(decoded.id), decoded.expiresAt, this.now())
      )
        messages.push(decoded);
    }
    return messages;
  }
  /** A browser CORS rejection, TLS failure, or offline host must stay an actionable adapter error. */
  private async request(url: URL, init: RequestInit): Promise<Response> {
    try {
      return await this.fetchEffect(url, init);
    } catch {
      throw new PeerDiscoveryError(
        "UNAVAILABLE",
        "ntfy rendezvous server is unreachable; check the server URL, TLS certificate, and cross-origin policy",
      );
    }
  }
  private topicUrl(secret: NtfyRendezvousSecret): URL {
    return new URL(
      hex(secret.topic),
      this.baseUrl.href.endsWith("/")
        ? this.baseUrl
        : new URL(`${this.baseUrl.href}/`),
    );
  }
  private headers(extra: Record<string, string>): Headers {
    const headers = new Headers(extra);
    if (this.config.bearerToken)
      headers.set("Authorization", `Bearer ${this.config.bearerToken}`);
    return headers;
  }
  private now(): number {
    return this.config.now?.() ?? Date.now();
  }
}

export class NtfyPeerDiscoveryAdapter implements PeerDiscoveryAdapter {
  readonly kind = "ntfy" as const;
  private readonly secrets = new Map<string, NtfyRendezvousSecret>();
  private readonly cancelled = new Set<string>();
  constructor(private readonly options: NtfyDiscoveryAdapterOptions) {}
  availability(): Promise<DiscoveryAvailability> {
    return this.options.channel.availability();
  }
  async *offer(
    envelope: Uint8Array,
    options: OfferOptions,
  ): AsyncIterable<DiscoveryEvent> {
    const invitation = decodePeerInvitation(envelope, this.now());
    if (invitation.role !== "offer")
      throw new PeerDiscoveryError(
        "INVALID_INVITATION",
        "ntfy offer requires an offer envelope",
      );
    const session = {
      id: this.options.createSessionId(),
      kind: this.kind,
    } as const;
    const secret = await this.options.client.createSecret();
    this.secrets.set(session.id, secret);
    try {
      await withNtfyPromiseBudget(
        this.options.channel.presentCode(
          session,
          encodeNtfyRendezvousSecret(secret),
          options,
        ),
        options,
        () => this.cancel(session.id),
      );
      yield { kind: "ready", session };
      await this.options.client.publish(secret, envelope);
      for await (const message of this.wait(session, secret, options)) {
        if (message.role !== "answer") continue;
        yield { kind: "invitation", session, envelope: message.envelope };
        return;
      }
    } finally {
      this.secrets.delete(session.id);
      this.cancelled.delete(session.id);
    }
  }
  async *accept(options: AcceptOptions): AsyncIterable<DiscoveryEvent> {
    const session = {
      id: this.options.createSessionId(),
      kind: this.kind,
    } as const;
    const code = await withNtfyPromiseBudget(
      this.options.channel.requestCode(session, options),
      options,
      () => this.cancel(session.id),
    );
    const secret = decodeNtfyRendezvousSecret(code);
    this.secrets.set(session.id, secret);
    try {
      for await (const message of this.wait(session, secret, options)) {
        if (message.role !== "offer") continue;
        const invitation = decodePeerInvitation(message.envelope, this.now());
        if (invitation.service !== options.service)
          throw new PeerDiscoveryError(
            "INVALID_INVITATION",
            "ntfy invitation has the wrong service",
          );
        yield { kind: "invitation", session, envelope: message.envelope };
        return;
      }
    } finally {
      this.cancelled.delete(session.id);
    }
  }
  async answer(session: DiscoverySession, envelope: Uint8Array): Promise<void> {
    if (decodePeerInvitation(envelope, this.now()).role !== "answer")
      throw new PeerDiscoveryError(
        "INVALID_INVITATION",
        "ntfy answer requires an answer envelope",
      );
    const secret = this.secrets.get(session.id);
    if (secret === undefined)
      throw new PeerDiscoveryError(
        "NO_RETURN_CHANNEL",
        "ntfy rendezvous secret is no longer available",
      );
    await this.options.client.publish(secret, envelope);
    this.secrets.delete(session.id);
  }
  async cancel(sessionId: string): Promise<void> {
    this.cancelled.add(sessionId);
    this.secrets.delete(sessionId);
    await this.options.channel.cancel(sessionId);
  }
  private async *wait(
    session: DiscoverySession,
    secret: NtfyRendezvousSecret,
    options: OfferOptions,
  ): AsyncIterable<NtfyRendezvousMessage> {
    const deadline = this.now() + options.timeoutMs;
    let delay = this.options.pollIntervalMs ?? 250;
    while (this.now() < deadline) {
      if (options.signal?.aborted || this.cancelled.has(session.id))
        throw new PeerDiscoveryError("CANCELLED", "ntfy rendezvous cancelled");
      for (const message of await this.options.client.poll(secret))
        yield message;
      const remaining = deadline - this.now();
      if (remaining <= 0) break;
      await new Promise((resolve) =>
        setTimeout(resolve, Math.min(delay, remaining)),
      );
      delay = Math.min(Math.ceil(delay * 1.5), 3_000);
    }
    throw new PeerDiscoveryError("TIMEOUT", "ntfy rendezvous timed out");
  }
  private now(): number {
    return this.options.now?.() ?? Date.now();
  }
}
