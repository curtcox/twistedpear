import { createSocket } from "node:dgram";
import { createServer } from "node:net";

function probeTcpBind() {
  const server = createServer();
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      server.close((error) =>
        error === undefined ? resolve() : reject(error),
      );
    });
  });
}

function probeUdpBind() {
  const socket = createSocket("udp4");
  return new Promise((resolve, reject) => {
    socket.once("error", reject);
    socket.bind(0, "127.0.0.1", () => {
      socket.close(resolve);
    });
  });
}

export async function probeLocalhostBind({
  tcp = probeTcpBind,
  udp = probeUdpBind,
} = {}) {
  for (const [protocol, probe] of [
    ["TCP", tcp],
    ["UDP", udp],
  ]) {
    try {
      await probe();
    } catch (error) {
      return {
        ok: false,
        protocol,
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }
  return { ok: true };
}

export function formatLocalhostBindRefusal(result) {
  return [
    `REFUSE unit-tests: localhost ${result.protocol} bind is unavailable — ${result.message}`,
    "The broad unit suite includes TCP, UDP, HTTP, and WebSocket tests.",
    "Run it in an execution environment that permits localhost binding; waiting for per-test timeouts cannot produce valid evidence.",
  ].join("\n");
}
