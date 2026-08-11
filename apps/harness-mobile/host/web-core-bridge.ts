/**
 * Expo web replacement for react-native-bare-kit Worklet IPC (Phase W1).
 */

import {
  decodeMessages,
  encodeMessage,
  type HostToWorkletMessage,
  type WorkletToHostMessage,
} from "../worklet/protocol";
import { createWebSandboxRelay } from "./web-sandbox-relay";
import { createWebSerialRelay } from "./web-serial-relay";

const WORKER_URL = "/web-core.worker.js";

type IpcListener = (data: Uint8Array) => void;

class WebCoreWorklet {
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
        data: new TextDecoder().decode(data),
      });
    },
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
  const sandboxRelay = createWebSandboxRelay((message) => {
    worklet.IPC.write(new TextEncoder().encode(encodeMessage(message)));
  });
  const serialRelay = createWebSerialRelay((message) => {
    worklet.IPC.write(new TextEncoder().encode(encodeMessage(message)));
  });

  worklet.IPC.on("data", (data) => {
    const decoded = decodeMessages(
      `${buffer}${new TextDecoder().decode(data)}`,
    );
    buffer = decoded.remainder;
    for (const message of decoded.messages) {
      if (
        message.type === "sandbox-spawn" ||
        message.type === "sandbox-post" ||
        message.type === "sandbox-ping" ||
        message.type === "sandbox-kill" ||
        message.type === "sandbox-broker-response"
      ) {
        void sandboxRelay.handleWorkerMessage(message);
        continue;
      }

      if (serialRelay.isSerialMessage(message)) {
        void serialRelay.handleWorkerMessage(message).catch((error) => {
          worklet.IPC.write(
            new TextEncoder().encode(
              encodeMessage({
                type: "serial-error",
                message: error instanceof Error ? error.message : String(error),
              }),
            ),
          );
        });
        continue;
      }

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
    async requestWebSerialPort(baudRate = 115_200) {
      await serialRelay.requestPortAndOpen(baudRate);
    },
    stop() {
      void serialRelay.dispose();
      sandboxRelay.dispose();
      worklet.terminate();
      buffer = "";
    },
  };
}
