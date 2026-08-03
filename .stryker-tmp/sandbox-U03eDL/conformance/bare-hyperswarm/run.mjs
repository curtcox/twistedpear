#!/usr/bin/env node
// @ts-nocheck
/**
 * Hyperswarm-on-Bare smoke (Phase 2 M0 / spike S4).
 * Verify-only: two local peers discover and exchange bytes under the Bare CLI.
 */

import Hyperswarm from "hyperswarm";
import b4a from "b4a";

const topic = b4a.from("a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6a7b8c9d0e1f2a3b4c5d6a7b8c9d0e1f2", "hex");

async function main() {
  const server = new Hyperswarm();
  const client = new Hyperswarm();

  const payload = b4a.from("hyperswarm-bare-smoke-ok");
  const received = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("hyperswarm client timed out")), 30_000);
    client.on("connection", (socket) => {
      socket.on("error", () => {
        // Ignore teardown races after the payload is received.
      });
      socket.once("data", (data) => {
        clearTimeout(timer);
        resolve(b4a.toString(data));
      });
    });
  });

  server.on("connection", (socket) => {
    socket.on("error", () => {
      // Ignore teardown races after the payload is sent.
    });
    socket.end(payload);
  });

  const discovery = server.join(topic, { server: true, client: false });
  await discovery.flushed();

  client.join(topic, { server: false, client: true });
  await client.flush();

  const echoed = await received;
  if (echoed !== b4a.toString(payload)) {
    throw new Error(`Unexpected hyperswarm payload: ${echoed}`);
  }

  await Promise.allSettled([client.destroy(), server.destroy()]);
  console.log("bare-hyperswarm: peer exchange passed");
}

main().catch((error) => {
  console.error(error);
  throw error;
});
