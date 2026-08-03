#!/usr/bin/env node
// @ts-nocheck
/**
 * Bare runtime adapter smoke (Phase 2 M1).
 * Must run under the Bare CLI: `bare conformance/bare-runtime/run.mjs`
 */

import { bareRuntime } from "../../packages/reticulum-ts/dist/runtime/bare/runtime.js";

async function main() {
  const runtime = bareRuntime({ storePath: ".bare-runtime-smoke-store" });

  const key = "smoke-key";
  const value = Uint8Array.from([98, 97, 114, 101, 45, 102, 115]);
  await runtime.store.set(key, value);
  const loaded = await runtime.store.get(key);
  if (loaded === undefined || loaded.length !== value.length) {
    throw new Error("bare-fs store smoke failed");
  }

  for (let index = 0; index < value.length; index += 1) {
    if (loaded[index] !== value[index]) {
      throw new Error("bare-fs store smoke failed");
    }
  }

  await runtime.store.delete(key);
  if ((await runtime.store.get(key)) !== undefined) {
    throw new Error("bare-fs delete smoke failed");
  }

  console.log("bare-runtime: fs checks passed");

  const listener = await runtime.tcp.listen({ host: "127.0.0.1", port: 29_717 });
  let accepted = false;
  const acceptTask = (async () => {
    for await (const connection of listener.accept()) {
      accepted = true;
      await connection.close();
      break;
    }
  })();

  const client = await runtime.tcp.connect({ host: "127.0.0.1", port: 29_717, connectTimeoutMs: 5_000 });
  await client.write(Uint8Array.from([1]));
  await client.close();

  await Promise.race([
    acceptTask,
    new Promise((_, reject) => setTimeout(() => reject(new Error("tcp accept timeout")), 5_000))
  ]);
  await listener.close();

  if (!accepted) {
    throw new Error("bare-tcp accept smoke failed");
  }

  console.log("bare-runtime: tcp checks passed");

  const udpSocket = await runtime.udp.bind("127.0.0.1", 29_718);
  const udpPort = udpSocket.address.port;
  const sender = await runtime.udp.bind("127.0.0.1", 29_719);
  const datagram = Uint8Array.from([117, 100, 112, 45, 101, 99, 104, 111]);
  const receiveTask = (async () => {
    for await (const packet of udpSocket.packets) {
      if (packet.data.length === datagram.length) {
        return packet;
      }
    }
    return null;
  })();

  await sender.send(datagram, "127.0.0.1", udpPort);
  const echoed = await Promise.race([
    receiveTask,
    new Promise((_, reject) => setTimeout(() => reject(new Error("udp smoke timeout")), 5_000))
  ]);

  if (echoed === null || echoed.data.length !== datagram.length) {
    throw new Error("bare-udp smoke failed");
  }

  await sender.close();
  await udpSocket.close();
  console.log("bare-runtime: udp checks passed");
}

main().catch((error) => {
  console.error(error);
  throw error;
});
