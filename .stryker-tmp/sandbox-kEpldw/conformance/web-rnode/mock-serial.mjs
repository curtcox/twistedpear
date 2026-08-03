/**
 * Inject a simulated Web Serial port that answers RNode KISS probes.
 */
// @ts-nocheck


import {
  KISS_CMD_DETECT,
  KISS_CMD_RADIO_STATE,
  KISS_DETECT_RESP,
  KISS_RADIO_STATE_ON,
  createKissDecodeState,
  decodeKissFrames,
  encodeKissFrame
} from "../../packages/reticulum-interfaces/dist/rnode/kiss.js";

class MockSerialPort {
  readableController = null;
  writableController = null;
  opened = false;
  decodeState = createKissDecodeState();

  readable = new ReadableStream({
    start: (controller) => {
      this.readableController = controller;
    }
  });

  writable = new WritableStream({
    write: (chunk) => {
      this.handleWrite(chunk);
    }
  });

  async open() {
    this.opened = true;
  }

  async close() {
    this.opened = false;
    this.readableController?.close();
  }

  handleWrite(chunk) {
    const decoded = decodeKissFrames(chunk, this.decodeState);
    this.decodeState = decoded.state;

    for (const frame of decoded.frames) {
      if (frame.command === KISS_CMD_DETECT) {
        this.reply(encodeKissFrame(KISS_CMD_DETECT, Uint8Array.from([KISS_DETECT_RESP])));
      } else if (frame.command === KISS_CMD_RADIO_STATE) {
        this.reply(encodeKissFrame(KISS_CMD_RADIO_STATE, Uint8Array.from([KISS_RADIO_STATE_ON])));
      }
    }
  }

  reply(data) {
    this.readableController?.enqueue(data);
  }
}

export function installMockWebSerial() {
  const port = new MockSerialPort();

  Object.defineProperty(globalThis.navigator, "serial", {
    configurable: true,
    value: {
      async requestPort() {
        return port;
      }
    }
  });

  return port;
}
