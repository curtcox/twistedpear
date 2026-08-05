#!/usr/bin/env node
/**
 * Serial/RNode load smoke (Phase 6 M5): exercises RNodeInterface over a simulated
 * serial pipe (Bare-equivalent path) and verifies the Node `serialport` module loads.
 * Real USB hardware remains device-gated (STATUS-HARDWARE).
 */

import {
  PureCryptoProvider,
  Reticulum,
  nodeRuntime,
} from "../../packages/reticulum-ts/dist/index.js";
import {
  createKissDecodeState,
  decodeKissFrames,
  encodeKissFrame,
  KISS_CMD_DETECT,
  KISS_CMD_RADIO_STATE,
  KISS_DETECT_RESP,
  KISS_RADIO_STATE_ON,
  RNodeInterface,
} from "../../packages/reticulum-interfaces/dist/index.js";
import { serialportAvailable } from "../../packages/reticulum-interfaces/dist/serial-node.js";

const LOAD_ITERATIONS = Number.parseInt(
  process.env.SERIAL_LOAD_ITERATIONS ?? "64",
  10,
);

class SimulatedRNodePipe {
  connected = false;
  bytesIn = 0;
  bytesOut = 0;
  events = {};
  decodeState = createKissDecodeState();

  get stats() {
    return {
      bytesIn: this.bytesIn,
      bytesOut: this.bytesOut,
      connected: this.connected,
    };
  }

  setEvents(events) {
    this.events = events;
  }

  async open() {
    this.connected = true;
    this.events.onConnect?.();
  }

  async close() {
    this.connected = false;
    this.events.onDisconnect?.();
  }

  async write(data) {
    this.bytesOut += data.length;
    const decoded = decodeKissFrames(data, this.decodeState);
    this.decodeState = decoded.state;

    for (const frame of decoded.frames) {
      if (frame.command === KISS_CMD_DETECT) {
        this.reply(
          encodeKissFrame(KISS_CMD_DETECT, Uint8Array.from([KISS_DETECT_RESP])),
        );
      } else if (frame.command === KISS_CMD_RADIO_STATE) {
        this.reply(
          encodeKissFrame(
            KISS_CMD_RADIO_STATE,
            Uint8Array.from([KISS_RADIO_STATE_ON]),
          ),
        );
      }
    }
  }

  reply(data) {
    this.bytesIn += data.length;
    this.events.onData?.(data);
  }
}

async function runSimulatedRNodeLoad(provider, runtime) {
  const reticulum = Reticulum.create({ provider, runtime });
  reticulum.start();

  const pipe = new SimulatedRNodePipe();
  const iface = await RNodeInterface.open(provider, {
    name: "rnode-load",
    provider,
    runtime,
    pipe,
  });
  reticulum.registerInterface(iface);

  for (let iteration = 0; iteration < LOAD_ITERATIONS; iteration += 1) {
    if (!iface.online) {
      throw new Error(`RNode interface offline at iteration ${iteration}`);
    }

    await sleep(5);
  }

  await iface.close();
  await reticulum.stop();
  console.log(
    `serialport-load: ${LOAD_ITERATIONS} simulated RNode keepalive iterations passed`,
  );
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const provider = new PureCryptoProvider();
  const runtime = nodeRuntime();

  await runSimulatedRNodeLoad(provider, runtime);

  const available = await serialportAvailable();
  if (!available) {
    throw new Error("serialport module failed to load in Node context");
  }

  console.log("serialport-load: Node serialport import OK");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
