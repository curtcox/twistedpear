/* global Buffer */
/**
 * BlePipe for the Bare worklet — GATT lives in the RN host native module;
 * this adapter forwards byte I/O over bare-kit IPC.
 */

const DEFAULT_MTU = 247;

function bytesToHex(bytes) {
  return [...bytes]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  }

  return bytes;
}

function emit(message) {
  BareKit.IPC.write(Buffer.from(`${JSON.stringify(message)}\n`));
}

/**
 * @param {Uint8Array} identityHash 16-byte Reticulum identity hash for the control beacon
 */
export function createIpcBleBridge(identityHash) {
  /** @type {import("@twistedpear/reticulum-interfaces").BlePipeEvents} */
  let events = {};
  let started = false;
  let connected = false;
  let mtu = DEFAULT_MTU;
  let bytesIn = 0;
  let bytesOut = 0;

  const pipe = {
    get mtu() {
      return mtu;
    },

    get connected() {
      return connected;
    },

    get stats() {
      return { bytesIn, bytesOut, connected };
    },

    setEvents(next) {
      events = next;
    },

    async start() {
      if (started) {
        return;
      }

      emit({ type: "ble-start", identityHashHex: bytesToHex(identityHash) });
      started = true;
    },

    async stop() {
      if (!started) {
        return;
      }

      emit({ type: "ble-stop" });
      started = false;
      connected = false;
      mtu = DEFAULT_MTU;
    },

    async write(data) {
      emit({ type: "ble-write", dataHex: bytesToHex(data) });
      bytesOut += data.length;
    },

    handleHostMessage(message) {
      if (message.type === "ble-data") {
        const data = hexToBytes(message.dataHex);
        bytesIn += data.length;
        events.onData?.(data);
        return;
      }

      if (message.type === "ble-connect") {
        connected = true;
        mtu = message.mtu;
        events.onConnect?.();
        return;
      }

      if (message.type === "ble-disconnect") {
        connected = false;
        events.onDisconnect?.();
        return;
      }

      if (message.type === "ble-error") {
        events.onError?.(new Error(message.message));
      }
    },
  };

  return pipe;
}
