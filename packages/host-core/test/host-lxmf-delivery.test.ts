import { afterEach, describe, expect, it } from "vitest";
import {
  Identity,
  NodeCryptoProvider,
  PipeInterface,
  Reticulum,
  nodeRuntime
} from "@twistedpear/reticulum-ts";
import { encodeSessionInviteEnvelope } from "@twistedpear/protocol";
import { LXMessageMethod } from "@twistedpear/lxmf-ts";
import {
  createHostLxmfDelivery,
  type HostLxmfDeliverySession
} from "../src/host-lxmf-delivery.js";
import { sessionInviteContent, SESSION_INVITE_TITLE, type DeliveredSessionInvite } from "../src/session-invite-carrier.js";

const provider = new NodeCryptoProvider();
const runtime = nodeRuntime();

async function waitFor(predicate: () => boolean, timeoutMs = 20_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    if (predicate()) return;
    if (Date.now() > deadline) throw new Error("timed out waiting for condition");
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
}

describe("createHostLxmfDelivery", () => {
  const sessions: HostLxmfDeliverySession[] = [];
  const cleanups: Array<() => Promise<void> | void> = [];

  afterEach(async () => {
    while (sessions.length > 0) {
      await sessions.pop()!.stop();
    }
    for (const cleanup of cleanups.reverse()) {
      await cleanup();
    }
    cleanups.length = 0;
  });

  it("registers a delivery destination and announces it", async () => {
    const left = Reticulum.create({ provider, runtime });
    left.start();
    cleanups.push(() => left.stop());
    const delivery = await createHostLxmfDelivery({
      reticulum: left,
      provider,
      identity: new Identity(provider),
      announceIntervalMs: 0,
      receiveSessionInvite: async () => {},
      isInvitableApp: (appId) => appId === "line-check"
    });
    sessions.push(delivery);
    expect(delivery.lxmfAddress).toMatch(/^[0-9a-f]{32}$/);
    expect(delivery.identityHash).toMatch(/^[0-9a-f]{32}$/);
  });

  it("raises a verified invite from a peer that announced", async () => {
    const left = Reticulum.create({ provider, runtime });
    const right = Reticulum.create({ provider, runtime });
    left.start();
    right.start();
    const [leftPipe, rightPipe] = PipeInterface.pair(provider, { name: "left" }, { name: "right" });
    left.registerInterface(leftPipe);
    right.registerInterface(rightPipe);
    cleanups.push(() => {
      left.stop();
      right.stop();
    });

    const raised: DeliveredSessionInvite[] = [];
    const observed: DeliveredSessionInvite[] = [];
    const leftIdentity = new Identity(provider);
    const rightIdentity = new Identity(provider);
    const leftDelivery = await createHostLxmfDelivery({
      reticulum: left,
      provider,
      identity: leftIdentity,
      announceIntervalMs: 6_000,
      receiveSessionInvite: async (invite) => {
        raised.push(invite);
      },
      isInvitableApp: (appId) => appId === "line-check"
    });
    sessions.push(leftDelivery);
    leftDelivery.onInvite((invite) => observed.push(invite));

    const rightDelivery = await createHostLxmfDelivery({
      reticulum: right,
      provider,
      identity: rightIdentity,
      announceIntervalMs: 6_000,
      receiveSessionInvite: async () => {},
      isInvitableApp: () => false
    });
    sessions.push(rightDelivery);

    await waitFor(() =>
      leftDelivery.peers().some((peer) => peer.destinationHash === rightDelivery.lxmfAddress)
    );

    const envelope = encodeSessionInviteEnvelope({
      id: "invite-host-1",
      appId: "line-check",
      requestedClasses: ["microphone"],
      expiresAt: Date.now() + 120_000
    });
    await rightDelivery.router.packAndSend({
      destination: rightDelivery.router.createOutboundDestination(leftIdentity),
      source: rightDelivery.delivery,
      title: SESSION_INVITE_TITLE,
      content: sessionInviteContent(envelope),
      desiredMethod: LXMessageMethod.OPPORTUNISTIC,
      deferStamp: true
    });

    await waitFor(() => raised.length === 1);
    expect(observed).toHaveLength(1);
    expect(raised[0]?.appId).toBe("line-check");
    expect(raised[0]?.verified).toBe(true);
    expect(raised[0]?.verifiedPeerLabel.startsWith("peer ")).toBe(true);
    expect(raised[0]?.id.endsWith("invite-host-1")).toBe(true);
    expect(observed[0]).toEqual(raised[0]);
  });
});
