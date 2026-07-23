import { xchacha20poly1305 } from "@noble/ciphers/chacha.js";
import { sha256 } from "@noble/hashes/sha256.js";
import type { CryptoProvider } from "@twistedpear/reticulum-ts";
import { Packet, RawPacketInterface, type ReticulumInterfaceOptions } from "@twistedpear/reticulum-ts";

const NTFY_MESSAGE_HEADER_BYTES = 1 + 24;
const NTFY_AUTH_TAG_BYTES = 16;
const MAX_NTFY_MESSAGE_BYTES = 20_000;
const DEFAULT_POLL_INTERVAL_MS = 1_000;

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

function base64url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function unbase64url(text: string): Uint8Array {
  const padded = text.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(text.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

export interface NtfyPacketInterfaceOptions extends ReticulumInterfaceOptions {
  readonly provider: CryptoProvider;
  readonly baseUrl: string;
  readonly topic: string;
  readonly secret: string;
  readonly bearerToken?: string;
  readonly pollIntervalMs?: number;
  readonly fetch?: typeof fetch;
}

export class NtfyPacketInterface extends RawPacketInterface {
  private readonly key: Uint8Array;
  private readonly fetchEffect: typeof fetch;
  private readonly topicUrl: string;
  private readonly pollIntervalMs: number;
  private readonly provider: CryptoProvider;
  private readonly ntfyOptions: NtfyPacketInterfaceOptions;
  private abortController: AbortController | null = null;
  private pollTask: Promise<void> | null = null;
  private isClosed = false;

  constructor(provider: CryptoProvider, options: NtfyPacketInterfaceOptions) {
    super({
      ...options,
      name: options.name ?? "host-ntfy",
      mtu: options.mtu ?? MAX_NTFY_MESSAGE_BYTES - NTFY_MESSAGE_HEADER_BYTES - NTFY_AUTH_TAG_BYTES - 64
    });
    this.provider = provider;
    this.ntfyOptions = options;
    this.key = sha256(new TextEncoder().encode(options.secret));
    this.fetchEffect = options.fetch ?? globalThis.fetch;
    this.topicUrl = `${options.baseUrl.replace(/\/$/, "")}/${encodeURIComponent(options.topic)}`;
    this.pollIntervalMs = options.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
  }

  async start(): Promise<void> {
    if (this.isClosed) return;
    this.online = true;
    this.abortController = new AbortController();
    this.pollTask = this.runPollLoop();
  }

  protected decodePacket(frame: Uint8Array): Packet | null {
    return Packet.decode(this.ntfyOptions.provider, frame);
  }

  protected override async writeBytes(bytes: Uint8Array): Promise<void> {
    const nonce = this.provider.randomBytes(24);
    const header = new Uint8Array(NTFY_MESSAGE_HEADER_BYTES);
    header[0] = 0x01;
    header.set(nonce, 1);
    const ciphertext = xchacha20poly1305(this.key, nonce, header).encrypt(bytes);
    const body = base64url(concat([header, ciphertext]));
    const response = await this.fetchEffect(this.topicUrl, {
      method: "POST",
      headers: this.headers({ "Content-Type": "text/plain; charset=utf-8" }),
      body,
      signal: this.abortController?.signal ?? null
    });
    if (!response.ok) {
      throw new Error(`ntfy publish failed (${response.status})`);
    }
  }

  protected override async closeInterface(): Promise<void> {
    this.isClosed = true;
    this.online = false;
    this.abortController?.abort();
    if (this.pollTask !== null) {
      try {
        await this.pollTask;
      } catch {
        // ignore
      }
      this.pollTask = null;
    }
  }

  private async runPollLoop(): Promise<void> {
    while (!this.isClosed && this.abortController !== null) {
      try {
        await this.pollOnce();
      } catch (error) {
        if (this.isClosed) return;
        await this.sleep(this.pollIntervalMs);
      }
    }
  }

  private async pollOnce(): Promise<void> {
    const url = new URL(this.topicUrl);
    url.searchParams.set("poll", "1");
    const response = await this.fetchEffect(url, {
      method: "GET",
      headers: this.headers({ Accept: "application/x-ndjson" }),
      signal: this.abortController?.signal ?? null
    });
    if (!response.ok) {
      throw new Error(`ntfy poll failed (${response.status})`);
    }
    const text = await response.text();
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      let event: unknown;
      try {
        event = JSON.parse(trimmed);
      } catch {
        continue;
      }
      const message =
        typeof event === "object" && event !== null && "message" in event
          ? (event as { message?: unknown }).message
          : undefined;
      if (typeof message !== "string") continue;
      const decrypted = this.tryDecrypt(unbase64url(message));
      if (decrypted !== null) {
        this.receiveBytes(decrypted);
      }
    }
  }

  private tryDecrypt(packet: Uint8Array): Uint8Array | null {
    if (packet.length < NTFY_MESSAGE_HEADER_BYTES + NTFY_AUTH_TAG_BYTES) return null;
    const version = packet[0];
    if (version !== 0x01) return null;
    const nonce = packet.subarray(1, NTFY_MESSAGE_HEADER_BYTES);
    const header = packet.subarray(0, NTFY_MESSAGE_HEADER_BYTES);
    const ciphertext = packet.subarray(NTFY_MESSAGE_HEADER_BYTES);
    try {
      return xchacha20poly1305(this.key, nonce, header).decrypt(ciphertext);
    } catch {
      return null;
    }
  }

  private headers(extra: Record<string, string>): Headers {
    const headers = new Headers(extra);
    if (this.ntfyOptions.bearerToken) {
      headers.set("Authorization", `Bearer ${this.ntfyOptions.bearerToken}`);
    }
    return headers;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
