/**
 * SerialPipe for the web core worker — Web Serial lives on the main thread.
 */

const DEFAULT_BAUD_RATE = 115_200;

function bytesToHex(bytes) {
  return [...bytes].map((value) => value.toString(16).padStart(2, "0")).join("");
}

function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  }

  return bytes;
}

/**
 * @param {(message: object) => void} emitHostMessage
 * @param {number} [baudRate]
 */
export function createWebSerialPipe(emitHostMessage, baudRate = DEFAULT_BAUD_RATE) {
  let events = {};
  let openState = false;
  let connected = false;
  let bytesIn = 0;
  let bytesOut = 0;

  const pipe = {
    get connected() {
      return connected;
    },

    get stats() {
      return { bytesIn, bytesOut, connected };
    },

    setEvents(next) {
      events = next;
    },

    async open() {
      if (openState) {
        return;
      }

      emitHostMessage({ type: "serial-web-start", baudRate });
      openState = true;
    },

    async close() {
      if (!openState) {
        return;
      }

      emitHostMessage({ type: "serial-stop" });
      openState = false;
      connected = false;
    },

    async write(data) {
      emitHostMessage({ type: "serial-write", dataHex: bytesToHex(data) });
      bytesOut += data.length;
    },

    handleHostMessage(message) {
      if (message.type === "serial-data") {
        const data = hexToBytes(message.dataHex);
        bytesIn += data.length;
        events.onData?.(data);
        return;
      }

      if (message.type === "serial-connect") {
        connected = true;
        events.onConnect?.();
        return;
      }

      if (message.type === "serial-disconnect") {
        connected = false;
        events.onDisconnect?.();
        return;
      }

      if (message.type === "serial-error") {
        events.onError?.(new Error(message.message));
      }
    }
  };

  return pipe;
}
