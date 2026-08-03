// @ts-nocheck
import type { SerialPipe, SerialPipeEvents, PipeStats } from "./pipes.js";

export interface SerialNodePipeOptions {
  readonly path: string;
  readonly baudRate?: number;
}

/** Desktop SerialPipe over the `serialport` package (optional native dependency). */
export function createSerialNodePipe(options: SerialNodePipeOptions): SerialPipe {
  let connected = false;
  let bytesIn = 0;
  let bytesOut = 0;
  let events: SerialPipeEvents = {};
  let port: {
    readonly open: () => Promise<void>;
    readonly close: () => Promise<void>;
    readonly write: (data: Uint8Array) => Promise<void>;
    readonly on: (event: string, listener: (...args: unknown[]) => void) => void;
  } | null = null;

  const stats: PipeStats = {
    get bytesIn() {
      return bytesIn;
    },
    get bytesOut() {
      return bytesOut;
    },
    get connected() {
      return connected;
    }
  };

  return {
    get connected() {
      return connected;
    },

    get stats() {
      return stats;
    },

    setEvents(next) {
      events = next;
    },

    async open() {
      if (port !== null) {
        return;
      }

      const { SerialPort } = await import("serialport");
      const instance = new SerialPort({
        path: options.path,
        baudRate: options.baudRate ?? 115_200,
        autoOpen: false
      });

      port = {
        open: () =>
          new Promise<void>((resolve, reject) => {
            instance.open((error) => (error ? reject(error) : resolve()));
          }),
        close: () =>
          new Promise<void>((resolve, reject) => {
            instance.close((error) => (error ? reject(error) : resolve()));
          }),
        write: (data) =>
          new Promise<void>((resolve, reject) => {
            instance.write(Buffer.from(data), (error) => {
              if (error) {
                reject(error);
                return;
              }

              bytesOut += data.length;
              resolve();
            });
          }),
        on: (event, listener) => {
          instance.on(event, listener);
        }
      };

      port.on("data", (chunk: unknown) => {
        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as ArrayBuffer);
        bytesIn += buffer.length;
        events.onData?.(new Uint8Array(buffer));
      });

      port.on("open", () => {
        connected = true;
        events.onConnect?.();
      });

      port.on("close", () => {
        connected = false;
        events.onDisconnect?.();
      });

      port.on("error", (error: unknown) => {
        events.onError?.(error instanceof Error ? error : new Error(String(error)));
      });

      await port.open();
    },

    async close() {
      if (port === null) {
        return;
      }

      await port.close();
      port = null;
      connected = false;
    },

    async write(data) {
      if (port === null) {
        throw new Error("Serial port is not open");
      }

      await port.write(data);
    }
  };
}

export async function serialportAvailable(): Promise<boolean> {
  try {
    await import("serialport");
    return true;
  } catch {
    return false;
  }
}
