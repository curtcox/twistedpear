/**
 * Main-thread Web Serial relay for RNodeInterface (Phase W4 stretch).
 * The core worker cannot access navigator.serial; the port lives here.
 */

import type {
  HostToWorkletMessage,
  WorkletToHostMessage,
} from "../worklet/protocol";

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join(
    "",
  );
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  }

  return bytes;
}

export function webSerialSupported(): boolean {
  return typeof navigator !== "undefined" && "serial" in navigator;
}

export function createWebSerialRelay(
  sendToWorker: (message: HostToWorkletMessage) => void,
) {
  let port: SerialPort | null = null;
  let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  let readLoopActive = false;
  let writer: WritableStreamDefaultWriter<Uint8Array> | null = null;

  async function readLoop(): Promise<void> {
    if (port?.readable === null || port?.readable === undefined) {
      return;
    }

    readLoopActive = true;
    const activeReader = port.readable.getReader();
    reader = activeReader;

    try {
      while (readLoopActive) {
        const { value, done } = await activeReader.read();
        if (done) {
          break;
        }

        if (value !== undefined && value.length > 0) {
          sendToWorker({ type: "serial-data", dataHex: bytesToHex(value) });
        }
      }
    } catch (error) {
      sendToWorker({
        type: "serial-error",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      activeReader.releaseLock();
      reader = null;
    }
  }

  async function openPort(
    baudRate: number,
    requestPort: () => Promise<SerialPort>,
  ): Promise<void> {
    if (port !== null) {
      return;
    }

    port = await requestPort();
    await port.open({ baudRate });
    writer = port.writable?.getWriter() ?? null;
    sendToWorker({ type: "serial-connect", deviceName: "webserial" });
    void readLoop();
  }

  async function closePort(): Promise<void> {
    readLoopActive = false;

    if (reader !== null) {
      await reader.cancel().catch(() => {});
      reader.releaseLock();
      reader = null;
    }

    if (writer !== null) {
      await writer.close().catch(() => {});
      writer = null;
    }

    if (port !== null) {
      await port.close().catch(() => {});
      port = null;
      sendToWorker({ type: "serial-disconnect" });
    }
  }

  return {
    async requestPortAndOpen(baudRate: number): Promise<void> {
      if (!webSerialSupported()) {
        throw new Error("Web Serial API is unavailable in this browser");
      }

      await openPort(baudRate, () => navigator.serial.requestPort());
    },

    async handleWorkerMessage(message: WorkletToHostMessage): Promise<void> {
      if (message.type === "serial-web-start") {
        await openPort(message.baudRate, () => navigator.serial.requestPort());
        return;
      }

      if (message.type === "serial-stop") {
        await closePort();
        return;
      }

      if (message.type === "serial-write") {
        if (writer === null) {
          throw new Error("Web Serial port is not open");
        }

        await writer.write(hexToBytes(message.dataHex));
      }
    },

    isSerialMessage(message: WorkletToHostMessage): boolean {
      return (
        message.type === "serial-web-start" ||
        message.type === "serial-stop" ||
        message.type === "serial-write"
      );
    },

    async dispose(): Promise<void> {
      await closePort();
    },
  };
}
