import type { GuidaXhrLike } from "./fs-config.js";

/** Shared XHR shell. Fetch vs offline-seed subclasses fill in send(). */
export class GuidaXhrBase implements GuidaXhrLike {
  status = 0;
  response: ArrayBuffer | string | null = null;
  responseText = "";
  responseType = "";
  onload: (() => void) | null = null;
  onerror: ((err?: unknown) => void) | null = null;
  ontimeout: (() => void) | null = null;
  protected method = "GET";
  protected url = "";

  open(method: string, url: string): void {
    this.method = method;
    this.url = url;
  }

  setRequestHeader(_key: string, _value: string): void {}

  getAllResponseHeaders(): string {
    return "";
  }

  send(_body?: unknown): void {
    throw new Error("GuidaXhrBase.send must be implemented");
  }
}
