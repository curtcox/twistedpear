/**
 * W4 WebSerial RNode spike: bring RNodeInterface online via mocked navigator.serial.
 */

import { installMockWebSerial } from "./mock-serial.mjs";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function encodeMessage(message) {
  return `${JSON.stringify(message)}\n`;
}

function decodeMessages(buffer) {
  const messages = [];
  let remainder = buffer;

  while (true) {
    const newline = remainder.indexOf("\n");
    if (newline < 0) {
      break;
    }

    const line = remainder.slice(0, newline).trim();
    remainder = remainder.slice(newline + 1);
    if (line.length === 0) {
      continue;
    }

    try {
      messages.push(JSON.parse(line));
    } catch {
      // Ignore malformed lines.
    }
  }

  return { messages, remainder };
}

function bytesToHex(bytes) {
  return Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join(
    "",
  );
}

function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  }

  return bytes;
}

async function main() {
  globalThis.__WEB_RNODE__ = { status: "starting" };
  const mockPort = installMockWebSerial();
  let writer = null;
  let reader = null;
  let readLoopActive = false;

  async function readLoop() {
    if (mockPort.readable === null || mockPort.readable === undefined) {
      return;
    }

    readLoopActive = true;
    reader = mockPort.readable.getReader();
    try {
      while (readLoopActive) {
        const { value, done } = await reader.read();
        if (done) {
          break;
        }

        if (value !== undefined && value.length > 0) {
          sendToWorker({ type: "serial-data", dataHex: bytesToHex(value) });
        }
      }
    } finally {
      reader.releaseLock();
      reader = null;
    }
  }

  async function openMockPort() {
    await mockPort.open({ baudRate: 115_200 });
    writer = mockPort.writable.getWriter();
    sendToWorker({ type: "serial-connect", deviceName: "webserial-mock" });
    void readLoop();
  }

  async function closeMockPort() {
    readLoopActive = false;
    if (reader !== null) {
      await reader.cancel().catch(() => {});
    }

    if (writer !== null) {
      await writer.close().catch(() => {});
      writer = null;
    }

    await mockPort.close().catch(() => {});
    sendToWorker({ type: "serial-disconnect" });
  }

  const worker = new Worker("./web-core.worker.js", { type: "module" });
  let buffer = "";
  let latestStatus = null;

  function sendToWorker(message) {
    worker.postMessage({ channel: "host-ipc", data: encodeMessage(message) });
  }

  worker.onmessage = async (event) => {
    if (event.data?.channel !== "ipc") {
      return;
    }

    const chunk = typeof event.data.data === "string" ? event.data.data : "";
    const decoded = decodeMessages(`${buffer}${chunk}`);
    buffer = decoded.remainder;

    for (const message of decoded.messages) {
      if (message.type === "status") {
        latestStatus = message.status;
        continue;
      }

      if (message.type === "serial-web-start") {
        await openMockPort();
        continue;
      }

      if (message.type === "serial-stop") {
        await closeMockPort();
        continue;
      }

      if (message.type === "serial-write") {
        if (writer === null) {
          throw new Error("mock serial writer unavailable");
        }

        await writer.write(hexToBytes(message.dataHex));
      }
    }
  };

  sendToWorker({
    type: "start",
    gatewayUrl: "ws://127.0.0.1:9",
    identityPassphrase: "web-rnode-browser-test",
  });
  sendToWorker({ type: "create-identity" });
  sendToWorker({
    type: "set-interfaces",
    tcp: false,
    auto: false,
    ble: false,
    rnode: true,
  });

  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (
      latestStatus?.rnodeConnected === true &&
      latestStatus?.onlineInterfaces >= 1
    ) {
      break;
    }

    await sleep(200);
  }

  if (latestStatus?.rnodeConnected !== true) {
    throw new Error(
      `RNode serial did not connect: ${JSON.stringify(latestStatus)}`,
    );
  }

  if (latestStatus.onlineInterfaces < 1) {
    throw new Error(
      `RNode interface did not come online: ${JSON.stringify(latestStatus)}`,
    );
  }

  globalThis.__WEB_RNODE__ = {
    status: "done",
    rnodeConnected: latestStatus.rnodeConnected,
    rnodeDeviceName: latestStatus.rnodeDeviceName,
    onlineInterfaces: latestStatus.onlineInterfaces,
  };
}

main().catch((error) => {
  globalThis.__WEB_RNODE__ = {
    status: "error",
    message: error instanceof Error ? error.message : String(error),
  };
});
