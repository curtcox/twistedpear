/* global Buffer */
/**
 * SerialPipe for the Bare worklet — USB serial lives in the host native layer
 * (Electron main or RN native module); this adapter forwards byte I/O over BareKit IPC.
 */

const DEFAULT_BAUD_RATE = 115_200;

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
 * @param {{ portPath?: string, deviceId?: number, baudRate?: number }} options
 *   Platform pipe identity: desktop passes `portPath`, mobile passes `deviceId`.
 */
export function createIpcSerialBridge(options) {
  const baudRate = options.baudRate ?? DEFAULT_BAUD_RATE;
  const portPath = options.portPath;
  const deviceId = options.deviceId;

  /** @type {import("@twistedpear/reticulum-interfaces").SerialPipeEvents} */
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

      /** @type {{ type: "serial-start", baudRate: number, portPath?: string, deviceId?: number }} */
      const start = { type: "serial-start", baudRate };
      if (portPath != null) {
        start.portPath = portPath;
      }
      if (deviceId != null) {
        start.deviceId = deviceId;
      }
      emit(start);
      openState = true;
    },

    async close() {
      if (!openState) {
        return;
      }

      emit({ type: "serial-stop" });
      openState = false;
      connected = false;
    },

    async write(data) {
      emit({ type: "serial-write", dataHex: bytesToHex(data) });
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
    },
  };

  return pipe;
}
