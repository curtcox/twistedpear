import { Socket } from "bare-ws";

function arrayBufferCopy(data) {
  const bytes =
    data instanceof Uint8Array
      ? data
      : data instanceof ArrayBuffer
        ? new Uint8Array(data)
        : new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  return bytes.slice().buffer;
}

/**
 * The Freenet TypeScript SDK expects the small WHATWG WebSocket subset used by
 * browsers and `ws`. Bare's supported `bare-ws` module is a Duplex stream, so
 * this adapter translates only that audited subset rather than emulating the
 * full browser API.
 */
export class BareWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  CONNECTING = BareWebSocket.CONNECTING;
  OPEN = BareWebSocket.OPEN;
  CLOSING = BareWebSocket.CLOSING;
  CLOSED = BareWebSocket.CLOSED;

  binaryType = "arraybuffer";
  bufferedAmount = 0;
  extensions = "";
  protocol = "";
  readyState = BareWebSocket.CONNECTING;
  onopen = null;
  onmessage = null;
  onclose = null;
  onerror = null;

  #socket;
  #listeners = new Map();
  #lastError = null;

  constructor(url) {
    this.url = String(url);
    this.#socket = new Socket(this.url);
    this.#socket.on("open", () => {
      this.readyState = BareWebSocket.OPEN;
      this.#dispatch("open", { type: "open", target: this });
    });
    this.#socket.on("data", (data) => {
      const copied = arrayBufferCopy(data);
      this.#dispatch("message", {
        type: "message",
        target: this,
        data:
          this.binaryType === "arraybuffer"
            ? copied
            : new Uint8Array(copied)
      });
    });
    this.#socket.on("error", (error) => {
      this.#lastError = error;
      this.#dispatch("error", { type: "error", target: this, error });
    });
    this.#socket.on("close", () => {
      this.readyState = BareWebSocket.CLOSED;
      this.#dispatch("close", {
        type: "close",
        target: this,
        code: 1006,
        reason: this.#lastError?.message ?? "",
        wasClean: false
      });
    });
  }

  addEventListener(type, listener) {
    let listeners = this.#listeners.get(type);
    if (listeners === undefined) {
      listeners = new Set();
      this.#listeners.set(type, listeners);
    }
    listeners.add(listener);
  }

  removeEventListener(type, listener) {
    this.#listeners.get(type)?.delete(listener);
  }

  send(data) {
    if (this.readyState !== BareWebSocket.OPEN) {
      throw new Error("Bare WebSocket is not open");
    }
    if (typeof data === "string") {
      this.#socket.write(data);
      return;
    }
    const bytes =
      data instanceof Uint8Array
        ? data
        : new Uint8Array(data.buffer ?? data, data.byteOffset ?? 0, data.byteLength);
    this.#socket.write(Buffer.from(bytes));
  }

  close() {
    if (
      this.readyState === BareWebSocket.CLOSING ||
      this.readyState === BareWebSocket.CLOSED
    ) {
      return;
    }
    this.readyState = BareWebSocket.CLOSING;
    this.#socket.end();
  }

  #dispatch(type, event) {
    const propertyListener = this[`on${type}`];
    if (typeof propertyListener === "function") {
      propertyListener.call(this, event);
    }
    for (const listener of this.#listeners.get(type) ?? []) {
      if (typeof listener === "function") {
        listener.call(this, event);
      } else {
        listener.handleEvent(event);
      }
    }
  }
}

export function installBareWebSocketGlobal() {
  globalThis.WebSocket = BareWebSocket;
}
