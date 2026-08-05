import { describe, expect, it } from "vitest";
import {
  Identity,
  NodeCryptoProvider,
  PipeInterface,
  Reticulum,
  hexToBytes,
  nodeRuntime,
} from "@twistedpear/reticulum-ts";
import {
  LXMessage,
  LXMessageMethod,
  LXMFRouter,
  PropagationClient,
  PropagationNodeStore,
  PropagationTransferState,
  MultipartPropagationReceiver,
  createPropagationDestination,
  sendMultipartPropagation,
} from "../src/index.js";
import { msgpackUnpackPropagationEnvelope } from "../src/msgpack.js";

const provider = new NodeCryptoProvider();
const runtime = nodeRuntime();

const ALICE_KEY =
  "0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f202122232425262728292a2b2c2d2e2f303132333435363738393a3b3c3d3e3f40";
const BOB_KEY =
  "4142434445464748494a4b4c4d4e4f505152535455565758595a5b5c5d5e5f606162636465666768696a6b6c6d6e6f707172737475767778797a7b7c7d7e7f80";

function loadIdentity(privateKeyHex: string): Identity {
  const identity = Identity.fromBytes(provider, hexToBytes(privateKeyHex));
  if (identity === null) {
    throw new Error("Could not load identity");
  }

  return identity;
}

async function connectLxmfPeers(): Promise<{
  aliceRouter: LXMFRouter;
  bobRouter: LXMFRouter;
  aliceDelivery: ReturnType<LXMFRouter["registerDeliveryIdentity"]>;
  bob: Identity;
}> {
  const alice = loadIdentity(ALICE_KEY);
  const bob = loadIdentity(BOB_KEY);

  const aliceReticulum = Reticulum.create({ provider, runtime });
  const bobReticulum = Reticulum.create({ provider, runtime });
  aliceReticulum.start();
  bobReticulum.start();

  const [leftPipe, rightPipe] = PipeInterface.pair(provider);
  aliceReticulum.registerInterface(leftPipe);
  bobReticulum.registerInterface(rightPipe);

  const aliceRouter = new LXMFRouter({ reticulum: aliceReticulum, provider });
  const bobRouter = new LXMFRouter({ reticulum: bobReticulum, provider });
  const aliceDelivery = aliceRouter.registerDeliveryIdentity(alice);
  const bobDelivery = bobRouter.registerDeliveryIdentity(bob);

  await aliceDelivery.announce();
  await bobDelivery.announce();
  await new Promise((resolve) => setTimeout(resolve, 20));

  return { aliceRouter, bobRouter, aliceDelivery, bob };
}

describe("LXMFRouter delivery", () => {
  it("delivers opportunistic messages over PipeInterface", async () => {
    const { aliceRouter, bobRouter, aliceDelivery, bob } =
      await connectLxmfPeers();

    const received = new Promise<string>((resolve) => {
      bobRouter.onDelivery((message) => resolve(message.contentAsString()));
    });

    const bobOut = bobRouter.createOutboundDestination(bob);
    await aliceRouter.packAndSend({
      destination: bobOut,
      source: aliceDelivery,
      title: "Ping",
      content: "Opportunistic hello",
      desiredMethod: LXMessageMethod.OPPORTUNISTIC,
      deferStamp: true,
      timestamp: 1700000001,
    });

    await expect(received).resolves.toBe("Opportunistic hello");
  });

  it("delivers direct link messages over PipeInterface", async () => {
    const { aliceRouter, bobRouter, aliceDelivery, bob } =
      await connectLxmfPeers();

    const received = new Promise<string>((resolve) => {
      bobRouter.onDelivery((message) => resolve(message.contentAsString()));
    });

    const bobOut = bobRouter.createOutboundDestination(bob);
    await aliceRouter.packAndSend({
      destination: bobOut,
      source: aliceDelivery,
      title: "Ping",
      content: "Direct hello",
      desiredMethod: LXMessageMethod.DIRECT,
      deferStamp: true,
      timestamp: 1700000002,
    });

    await expect(received).resolves.toBe("Direct hello");
  });

  it("enforces block policy before invoking the receive callback", async () => {
    const { aliceRouter, bobRouter, aliceDelivery, bob } =
      await connectLxmfPeers();
    let delivered = false;
    bobRouter.setInboundModeration(() => "block");
    bobRouter.onDelivery(() => {
      delivered = true;
    });

    await aliceRouter.packAndSend({
      destination: bobRouter.createOutboundDestination(bob),
      source: aliceDelivery,
      content: "blocked",
      desiredMethod: LXMessageMethod.OPPORTUNISTIC,
      deferStamp: true,
      timestamp: 1700000003,
    });
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(delivered).toBe(false);
  });

  it("delivers muted messages with notifications suppressed", async () => {
    const { aliceRouter, bobRouter, aliceDelivery, bob } =
      await connectLxmfPeers();
    bobRouter.setInboundModeration(() => "mute");
    const context = new Promise<{ disposition: string; notify: boolean }>(
      (resolve) => {
        bobRouter.onDelivery((_message, delivery) => resolve(delivery));
      },
    );

    await aliceRouter.packAndSend({
      destination: bobRouter.createOutboundDestination(bob),
      source: aliceDelivery,
      content: "quiet",
      desiredMethod: LXMessageMethod.OPPORTUNISTIC,
      deferStamp: true,
      timestamp: 1700000004,
    });
    await expect(context).resolves.toEqual({
      disposition: "mute",
      notify: false,
    });
  });

  it("reassembles out-of-order-safe multipart messages from propagation", async () => {
    const nodeIdentity = new Identity(provider);
    const alice = loadIdentity(ALICE_KEY);
    const bob = loadIdentity(BOB_KEY);

    const aliceReticulum = Reticulum.create({ provider, runtime });
    const nodeReticulum = Reticulum.create({ provider, runtime });
    const bobReticulum = Reticulum.create({ provider, runtime });
    aliceReticulum.start();
    nodeReticulum.start();
    bobReticulum.start();

    const [alicePipe, nodeLeftPipe] = PipeInterface.pair(provider);
    const [nodeRightPipe, bobPipe] = PipeInterface.pair(provider);
    aliceReticulum.registerInterface(alicePipe);
    nodeReticulum.registerInterface(nodeLeftPipe);
    nodeReticulum.registerInterface(nodeRightPipe);
    bobReticulum.registerInterface(bobPipe);

    const aliceRouter = new LXMFRouter({ reticulum: aliceReticulum, provider });
    const nodeRouter = new LXMFRouter({ reticulum: nodeReticulum, provider });
    const bobRouter = new LXMFRouter({ reticulum: bobReticulum, provider });

    const aliceDelivery = aliceRouter.registerDeliveryIdentity(alice);
    nodeRouter.registerDeliveryIdentity(nodeIdentity);
    const bobDelivery = bobRouter.registerDeliveryIdentity(bob);
    const nodePropagation = createPropagationDestination(
      provider,
      nodeReticulum,
      nodeIdentity,
    );

    const store = new PropagationNodeStore(provider);
    store.registerHandlers(nodePropagation);

    await aliceDelivery.announce();
    await nodePropagation.announce();
    await bobDelivery.announce();
    await new Promise((resolve) => setTimeout(resolve, 20));

    aliceRouter.setOutboundPropagationNode(nodePropagation.hash);

    const bobOut = aliceRouter.createOutboundDestination(bob);
    const largeContent = new TextEncoder().encode("multipart ".repeat(8));
    const transfer = await sendMultipartPropagation({
      router: aliceRouter,
      destination: bobOut,
      source: aliceDelivery,
      title: "Offline",
      content: largeContent,
      now: () => 1700000004,
    });
    expect(transfer.chunkCount).toBeGreaterThan(1);

    await new Promise((resolve) => setTimeout(resolve, 50));

    const messages: LXMessage[] = [];
    for (let index = 0; index < transfer.chunkCount; index += 1) {
      const client = new PropagationClient({ router: bobRouter, provider });
      client.setPropagationNode(nodePropagation.hash);
      const result = await client.syncMessages(1);
      expect(result.state).toBe(PropagationTransferState.COMPLETE);
      messages.push(...result.messages);
    }
    expect(messages).toHaveLength(transfer.chunkCount);

    const receiver = new MultipartPropagationReceiver(provider);
    const received = messages
      .slice()
      .reverse()
      .map((message) => receiver.ingest(message))
      .find((part) => part.complete);
    expect(received?.content).toEqual(largeContent);
  }, 20_000);

  it("discovers propagation nodes from lxmf.propagation announces", async () => {
    const nodeIdentity = new Identity(provider);
    const alice = loadIdentity(ALICE_KEY);

    const aliceReticulum = Reticulum.create({ provider, runtime });
    const nodeReticulum = Reticulum.create({ provider, runtime });
    aliceReticulum.start();
    nodeReticulum.start();

    const [alicePipe, nodePipe] = PipeInterface.pair(provider);
    aliceReticulum.registerInterface(alicePipe);
    nodeReticulum.registerInterface(nodePipe);

    const aliceRouter = new LXMFRouter({ reticulum: aliceReticulum, provider });
    aliceRouter.registerDeliveryIdentity(alice);
    const nodePropagation = createPropagationDestination(
      provider,
      nodeReticulum,
      nodeIdentity,
    );

    const discovered = new Promise<string>((resolve) => {
      aliceRouter.watchPropagationNodes((destinationHash) => {
        resolve(Buffer.from(destinationHash).toString("hex"));
      });
    });

    await nodePropagation.announce();
    await expect(discovered).resolves.toBe(nodePropagation.hexhash);
    expect(
      Buffer.from(aliceRouter.outboundPropagationNodeHash!).toString("hex"),
    ).toBe(nodePropagation.hexhash);
  });
});

describe("PropagationClient sync", () => {
  it("downloads queued messages from a propagation node over PipeInterface", async () => {
    const nodeIdentity = new Identity(provider);
    const clientIdentity = loadIdentity(ALICE_KEY);

    const nodeReticulum = Reticulum.create({ provider, runtime });
    const clientReticulum = Reticulum.create({ provider, runtime });
    nodeReticulum.start();
    clientReticulum.start();

    const [nodePipe, clientPipe] = PipeInterface.pair(provider);
    nodeReticulum.registerInterface(nodePipe);
    clientReticulum.registerInterface(clientPipe);

    const nodeRouter = new LXMFRouter({ reticulum: nodeReticulum, provider });
    const clientRouter = new LXMFRouter({
      reticulum: clientReticulum,
      provider,
    });
    const nodeDelivery = nodeRouter.registerDeliveryIdentity(nodeIdentity);
    const clientDelivery =
      clientRouter.registerDeliveryIdentity(clientIdentity);
    const nodePropagation = createPropagationDestination(
      provider,
      nodeReticulum,
      nodeIdentity,
    );

    const store = new PropagationNodeStore(provider);
    store.registerHandlers(nodePropagation);

    await nodeDelivery.announce();
    await nodePropagation.announce();
    await clientDelivery.announce();
    await new Promise((resolve) => setTimeout(resolve, 20));

    const clientOut = clientRouter.createOutboundDestination(clientIdentity);
    const packed = LXMessage.pack({
      provider,
      destination: clientOut,
      source: nodeDelivery,
      title: "Offline",
      content: "Queued for propagation",
      desiredMethod: LXMessageMethod.PROPAGATED,
      deferStamp: true,
      timestamp: 1700000003,
    });
    const [queuedMessage] = msgpackUnpackPropagationEnvelope(
      packed.propagationPacked!,
    );
    if (queuedMessage === undefined) {
      throw new Error("Missing propagation payload");
    }
    store.storePropagationData(queuedMessage);

    const client = new PropagationClient({ router: clientRouter, provider });
    client.setPropagationNode(nodePropagation.hash);

    const delivered = new Promise<string>((resolve) => {
      clientRouter.onDelivery((message) => resolve(message.contentAsString()));
    });

    const result = await client.syncMessages();
    expect(result.state).toBe(PropagationTransferState.COMPLETE);
    await expect(delivered).resolves.toBe("Queued for propagation");
  });
});
