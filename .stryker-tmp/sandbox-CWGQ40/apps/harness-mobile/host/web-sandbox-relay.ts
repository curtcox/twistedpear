/**
 * Main-thread relay for WebSandboxBackend (Phase W2).
 * The core worker cannot access document; sandbox iframes run here.
 */
// @ts-nocheck


import { WebSandboxBackend } from "@twistedpear/miniapp-runtime/sandbox/web";
import {
  encodeJsonWireValue,
  reviveJsonWireValue
} from "@twistedpear/miniapp-runtime";
import type { HostToWorkletMessage, WorkletToHostMessage } from "../worklet/protocol";

function hexToBytes(hex: string): Uint8Array {
  const normalized = hex.length % 2 === 0 ? hex : `0${hex}`;
  const bytes = new Uint8Array(normalized.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(normalized.slice(index * 2, index * 2 + 2), 16);
  }

  return bytes;
}

interface ActiveSandbox {
  readonly backend: WebSandboxBackend;
  readonly instance: Awaited<ReturnType<WebSandboxBackend["spawn"]>>;
}

export function createWebSandboxRelay(sendToWorker: (message: HostToWorkletMessage) => void) {
  const instances = new Map<string, ActiveSandbox>();
  const pendingBrokers = new Map<string, { resolve: (value: unknown) => void; reject: (error: Error) => void }>();

  async function handleWorkerMessage(message: WorkletToHostMessage): Promise<void> {
    if (message.type === "sandbox-spawn") {
      const backend = new WebSandboxBackend();
      try {
        const instance = await backend.spawn({
          appId: message.appId,
          version: message.version,
          entryPath: message.entryPath,
          bundle: hexToBytes(message.bundleHex),
          brokerEndpoint: {
            request: async (request) =>
              new Promise((resolve, reject) => {
                const requestId = `broker-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
                pendingBrokers.set(requestId, { resolve, reject });
                sendToWorker({
                  type: "sandbox-broker-request",
                  requestId,
                  instanceId: message.instanceId,
                  request: encodeJsonWireValue(request)
                });
              })
          }
        });

        instances.set(message.instanceId, { backend, instance });
        sendToWorker({
          type: "sandbox-spawned",
          requestId: message.requestId,
          instanceId: message.instanceId
        });
      } catch (error) {
        sendToWorker({
          type: "sandbox-spawn-failed",
          requestId: message.requestId,
          message: error instanceof Error ? error.message : String(error)
        });
      }

      return;
    }

    if (message.type === "sandbox-post") {
      const active = instances.get(message.instanceId);
      await active?.instance.postMessage(message.payload);
      return;
    }

    if (message.type === "sandbox-ping") {
      const active = instances.get(message.instanceId);
      const alive = active === undefined ? false : await active.instance.ping(message.timeoutMs);
      sendToWorker({
        type: "sandbox-ping-result",
        requestId: message.requestId,
        alive
      });
      return;
    }

    if (message.type === "sandbox-kill") {
      const active = instances.get(message.instanceId);
      if (active !== undefined) {
        await active.instance.kill(message.reason);
        instances.delete(message.instanceId);
      }

      return;
    }

    if (message.type === "sandbox-broker-response") {
      const waiter = pendingBrokers.get(message.requestId);
      if (waiter === undefined) {
        return;
      }

      pendingBrokers.delete(message.requestId);
      waiter.resolve(reviveJsonWireValue(message.response));
    }
  }

  return {
    handleWorkerMessage,
    dispose() {
      for (const [instanceId, active] of instances) {
        void active.instance.kill("relay-dispose");
        instances.delete(instanceId);
      }

      pendingBrokers.clear();
    }
  };
}
