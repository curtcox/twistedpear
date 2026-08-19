/**
 * Browser-shaped `Worker` on Bare.Thread. The mini-app sandbox talks through
 * `postMessage` / `onmessage`; Bare threads only take a startup `data` payload,
 * so each worker gets a pair of SharedArrayBuffer slots for JSON messages.
 */

const SLOT_HEADER_BYTES = 8;
const SLOT_CAPACITY = 32 * 1024;

export function createMessageSlot() {
  return new SharedArrayBuffer(SLOT_HEADER_BYTES + SLOT_CAPACITY);
}

export function tryWriteSlot(slot, value) {
  const meta = new Int32Array(slot, 0, 2);
  if (Atomics.compareExchange(meta, 0, 0, 1) !== 0) {
    return false;
  }
  const json = JSON.stringify(value);
  const bytes = new TextEncoder().encode(json);
  if (bytes.byteLength > SLOT_CAPACITY) {
    Atomics.store(meta, 0, 0);
    Atomics.notify(meta, 0);
    throw new Error(
      `Bare Worker mailbox overflow (${bytes.byteLength} > ${SLOT_CAPACITY})`,
    );
  }
  new Uint8Array(slot, SLOT_HEADER_BYTES, bytes.byteLength).set(bytes);
  Atomics.store(meta, 1, bytes.byteLength);
  Atomics.store(meta, 0, 2);
  Atomics.notify(meta, 0);
  return true;
}

export function tryReadSlot(slot) {
  const meta = new Int32Array(slot, 0, 2);
  if (Atomics.load(meta, 0) !== 2) {
    return null;
  }
  const length = Atomics.load(meta, 1);
  const json = new TextDecoder().decode(
    new Uint8Array(slot, SLOT_HEADER_BYTES, length),
  );
  Atomics.store(meta, 1, 0);
  Atomics.store(meta, 0, 0);
  Atomics.notify(meta, 0);
  return JSON.parse(json);
}

export function decodeWorkerSource(source) {
  const text = String(source);
  const prefix = "data:text/javascript,";
  if (text.startsWith(prefix)) {
    return decodeURIComponent(text.slice(prefix.length));
  }
  throw new Error(`unsupported Bare Worker source ${text.slice(0, 64)}`);
}

function wrapWorkerSource(appSource) {
  return `if (typeof TextEncoder !== "function") {
  globalThis.TextEncoder = class {
    encode(input = "") {
      const str = String(input);
      const out = new Uint8Array(str.length);
      for (let i = 0; i < str.length; i++) out[i] = str.charCodeAt(i) & 0xff;
      return out;
    }
  };
}
if (typeof TextDecoder !== "function") {
  globalThis.TextDecoder = class {
    decode(input = new Uint8Array()) {
      let out = "";
      for (const byte of input) out += String.fromCharCode(byte);
      return out;
    }
  };
}
const __tpData = Bare.Thread.self.data;
const workerData = __tpData.workerData;
const self = {
  postMessage(data) {
    const json = JSON.stringify(data);
    const bytes = new TextEncoder().encode(json);
    const meta = new Int32Array(__tpData.toHost, 0, 2);
    while (Atomics.compareExchange(meta, 0, 0, 1) !== 0) {
      Atomics.wait(meta, 0, Atomics.load(meta, 0));
    }
    if (bytes.byteLength > ${SLOT_CAPACITY}) {
      Atomics.store(meta, 0, 0);
      Atomics.notify(meta, 0);
      throw new Error("Bare Worker mailbox overflow");
    }
    new Uint8Array(__tpData.toHost, ${SLOT_HEADER_BYTES}, bytes.byteLength).set(bytes);
    Atomics.store(meta, 1, bytes.byteLength);
    Atomics.store(meta, 0, 2);
    Atomics.notify(meta, 0);
  },
  close() { Bare.exit(0); },
  onmessage: null
};
globalThis.self = self;
globalThis.workerData = workerData;
${appSource}
(function __tpPump() {
  const meta = new Int32Array(__tpData.toWorker, 0, 2);
  if (Atomics.load(meta, 0) === 2) {
    const length = Atomics.load(meta, 1);
    const json = new TextDecoder().decode(
      new Uint8Array(__tpData.toWorker, ${SLOT_HEADER_BYTES}, length)
    );
    Atomics.store(meta, 1, 0);
    Atomics.store(meta, 0, 0);
    Atomics.notify(meta, 0);
    if (typeof self.onmessage === "function") {
      self.onmessage({ data: JSON.parse(json) });
    }
  }
  setTimeout(__tpPump, 5);
})();
`;
}

function createBareThreadWorker(Thread) {
  return class BareThreadWorker {
    constructor(source, options = {}) {
      this.onmessage = null;
      this._outbox = [];
      this._toWorker = createMessageSlot();
      this._toHost = createMessageSlot();
      this._timer = setInterval(() => this._tick(), 5);
      this._thread = new Thread("/tp-sandbox-worker.js", {
        source: wrapWorkerSource(decodeWorkerSource(source)),
        data: {
          toWorker: this._toWorker,
          toHost: this._toHost,
          workerData: options.data ?? null,
        },
      });
    }

    postMessage(data) {
      this._outbox.push(data);
      this._tick();
    }

    terminate() {
      if (this._timer !== null) {
        clearInterval(this._timer);
        this._timer = null;
      }
      this._thread.terminate();
    }

    _tick() {
      while (
        this._outbox.length > 0 &&
        tryWriteSlot(this._toWorker, this._outbox[0])
      ) {
        this._outbox.shift();
      }
      let message = tryReadSlot(this._toHost);
      while (message !== null) {
        if (typeof this.onmessage === "function") {
          this.onmessage({ data: message });
        }
        message = tryReadSlot(this._toHost);
      }
    }
  };
}

export function installBareWorkerPolyfill(globals = globalThis) {
  if (typeof globals.Worker === "function") {
    return false;
  }
  const Thread = globals.Bare?.Thread;
  if (typeof Thread !== "function") {
    return false;
  }
  if (typeof globals.SharedArrayBuffer !== "function") {
    return false;
  }
  globals.Worker = createBareThreadWorker(Thread);
  return true;
}
