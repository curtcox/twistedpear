#!/usr/bin/env node
import { NodeCryptoProvider, Reticulum, nodeRuntime } from "../../packages/reticulum-ts/dist/index.js";
import {
  LXMFRouter,
  PropagationClient,
  PropagationServer,
  createPropagationDestination
} from "../../packages/lxmf-ts/dist/index.js";
import { interopReady, withComposeService, LXMF_ECHO_PORT } from "../scenarios/ts/harness.mjs";

if (!interopReady()) {
  console.log("propagation-interop: skipped (set INTEROP=1 with docker)");
  process.exit(0);
}

const provider = new NodeCryptoProvider();
const runtime = nodeRuntime();

await withComposeService("lxmf-echo", LXMF_ECHO_PORT, async () => {
  const reticulum = Reticulum.create({ provider, runtime });
  reticulum.start();

  const identity = new (await import("../../packages/reticulum-ts/dist/identity.js")).Identity(provider);
  const server = new PropagationServer(provider);
  const destination = createPropagationDestination(provider, reticulum, identity);
  server.registerHandlers(destination);
  await destination.announce();

  const router = new LXMFRouter({ reticulum, provider });
  router.registerDeliveryIdentity(identity);

  const client = new PropagationClient({ router, provider });
  client.setPropagationNode(destination.hash);
  const result = await client.syncMessages(10);
  if (result.state !== "complete" && result.state !== "idle") {
    throw new Error(`propagation sync failed: ${result.state}`);
  }

  await reticulum.stop();
});

console.log("propagation-interop: passed");
