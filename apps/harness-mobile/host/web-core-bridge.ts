/**
 * Expo web replacement for react-native-bare-kit Worklet IPC (Phase W1).
 */

import { decodeMessages, encodeMessage, type HostToWorkletMessage, type WorkletToHostMessage } from "../worklet/protocol";

const WORKER_URL = "/web-core.worker.js";

type IpcListener = (data: Uint8Array) => void;

export class WebCoreWorklet {
  private worker: Worker | null = null;
  private ipcBuffer = "";
  private readonly ipcListeners = new Set<IpcListener>();

  readonly IPC = {
    on: (event: "data", listener: IpcListener) => {
      if (event !== "data") {
        return;
      }

      this.ipcListeners.add(listener);
    },
    write: (data: Uint8Array) => {
      if (this.worker === null) {
        return;
      }

      this.worker.postMessage({
        channel: "host-ipc",
        data: new TextDecoder().decode(data)
      });
    }
  };

  start(_bundlePath: string, _bundle?: unknown): void {
    if (this.worker !== null) {
      return;
    }

    this.worker = new Worker(WORKER_URL, { type: "module" });
    this.ipcBuffer = "";
    this.worker.onmessage = (event) => {
      if (event.data?.channel !== "ipc") {
        return;
      }

      const chunk = typeof event.data.data === "string" ? event.data.data : "";
      const listeners = Array.from(this.ipcListeners);
      for (const listener of listeners) {
        listener(new TextEncoder().encode(chunk));
      }
    };
  }

  terminate(): void {
    this.worker?.terminate();
    this.worker = null;
    this.ipcListeners.clear();
  }
}

export function createWebCoreBridge() {
  const worklet = new WebCoreWorklet();
  let buffer = "";
  let onMessage: ((message: WorkletToHostMessage) => void) | null = null;

  worklet.IPC.on("data", (data) => {
    const decoded = decodeMessages(`${buffer}${new TextDecoder().decode(data)}`);
    buffer = decoded.remainder;
    for (const message of decoded.messages) {
      onMessage?.(message);
    }
  });

  return {
    worklet,
    setMessageHandler(handler: (message: WorkletToHostMessage) => void) {
      onMessage = handler;
    },
    send(message: HostToWorkletMessage) {
      worklet.IPC.write(new TextEncoder().encode(encodeMessage(message)));
    },
    stop() {
      worklet.terminate();
      buffer = "";
    }
  };
}
