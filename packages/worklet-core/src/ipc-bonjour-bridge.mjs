#!/usr/bin/env node
/**
 * Bonjour IPC bridge for the Bare worklet — mDNS lives in the RN host native module.
 */

function emit(message) {
  BareKit.IPC.write(Buffer.from(`${JSON.stringify(message)}\n`));
}

export function createIpcBonjourBridge() {
  /** @type {ReadonlyArray<import("@twistedpear/reticulum-interfaces").MulticastNetworkInfo>} */
  let interfaces = [];
  let started = false;

  const bridge = {
    get interfaces() {
      return interfaces;
    },

    async start() {
      if (started) {
        return;
      }

      emit({ type: "bonjour-start" });
      started = true;
    },

    async stop() {
      if (!started) {
        return;
      }

      emit({ type: "bonjour-stop" });
      started = false;
      interfaces = [];
    },

    async advertise(ifname, address, port) {
      emit({ type: "bonjour-advertise", ifname, address, port });
    },

    handleHostMessage(message) {
      if (message.type === "bonjour-interfaces") {
        interfaces = message.interfaces;
      }
    },
  };

  return bridge;
}
