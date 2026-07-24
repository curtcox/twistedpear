/**
 * MulticastBridge for the Bare worklet — UDP6 lives in the RN host native module;
 * this adapter forwards operations over bare-kit IPC.
 */

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

function emit(message) {
  BareKit.IPC.write(Buffer.from(`${JSON.stringify(message)}\n`));
}

export function createIpcMulticastBridge() {
  /** @type {import("@twistedpear/reticulum-interfaces").MulticastBridgeEvents} */
  let events = {};
  /** @type {ReadonlyArray<import("@twistedpear/reticulum-interfaces").MulticastNetworkInfo>} */
  let interfaces = [];
  let started = false;

  const bridge = {
    get interfaces() {
      return interfaces;
    },

    setEvents(next) {
      events = next;
    },

    async start() {
      if (started) {
        return;
      }

      emit({ type: "multicast-start" });
      started = true;
    },

    async stop() {
      if (!started) {
        return;
      }

      emit({ type: "multicast-stop" });
      started = false;
      interfaces = [];
    },

    async joinGroup(ifname, groupAddress, port) {
      emit({ type: "multicast-join", ifname, groupAddress, port });
    },

    async bindPort(ifname, port) {
      emit({ type: "multicast-bind", ifname, port });
    },

    async send(ifname, groupAddress, port, data) {
      emit({ type: "multicast-send", ifname, groupAddress, port, dataHex: bytesToHex(data) });
    },

    async sendUnicast(ifname, targetAddress, port, data) {
      emit({ type: "multicast-unicast", ifname, targetAddress, port, dataHex: bytesToHex(data) });
    },

    handleHostMessage(message) {
      if (message.type === "multicast-packet") {
        events.onPacket?.(
          message.ifname,
          hexToBytes(message.dataHex),
          message.sourceAddress,
          message.port
        );
        return;
      }

      if (message.type === "multicast-interfaces") {
        interfaces = message.interfaces;
        events.onNetworkChange?.(message.interfaces);
      }
    }
  };

  return bridge;
}
