/** Injectable filesystem + XHR environment for Guida's library runner. */

export type GuidaXhrCtor = new () => GuidaXhrLike;

export interface GuidaXhrLike {
  status: number;
  response: ArrayBuffer | string | null;
  responseText: string;
  responseType: string;
  onload: (() => void) | null;
  onerror: ((err?: unknown) => void) | null;
  ontimeout: (() => void) | null;
  open(method: string, url: string): void;
  setRequestHeader(key: string, value: string): void;
  getAllResponseHeaders(): string;
  send(body?: unknown): void;
}

export interface GuidaFsConfig {
  XMLHttpRequest: new () => GuidaXhrLike;
  writeFile: (
    path: string,
    data: string | Uint8Array,
  ) => Promise<void>;
  readFile: (path: string) => Promise<Uint8Array>;
  readDirectory: (path: string) => Promise<{ files: string[] }>;
  createDirectory: (path: string) => Promise<void>;
  details: (
    path: string,
  ) => Promise<{ type: "file" | "directory"; createdAt: number }>;
  getCurrentDirectory: () => Promise<string>;
  homedir: () => Promise<string>;
  env: Readonly<Record<string, string | undefined>>;
}

export function utf8(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

/** Uint8Array that stringifies as UTF-8 — Guida's runner passes readFile results through XHR as text. */
export class FileBytes extends Uint8Array {
  override toString(): string {
    return utf8(this);
  }
}

export function bytesOf(data: string | Uint8Array): FileBytes {
  const raw = typeof data === "string" ? new TextEncoder().encode(data) : data;
  return new FileBytes(raw);
}

export function byteLengthOf(text: string): number {
  return new TextEncoder().encode(text).byteLength;
}
