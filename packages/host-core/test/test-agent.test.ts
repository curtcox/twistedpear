import { createServer, type Server, type Socket } from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import {
  Identity,
  NodeCryptoProvider,
  PipeInterface,
  Reticulum,
  nodeRuntime
} from "@twistedpear/reticulum-ts";
import { mountTestAgent, type TestAgentSession } from "../src/test-agent.js";

const provider = new NodeCryptoProvider();
const runtime = nodeRuntime();

interface ControlServer {
  readonly port: number;
  /** Resolves with the `hello` frame for the named peer. */
  hello(label: string): Promise<Record<string, unknown>>;
  request(label: string, payload: Record<string, unknown>): Promise<Record<string, unknown>>;
  close(): Promise<void>;
}

/**
 * Minimal stand-in for `scripts/peers/control-server.mjs`: accepts agent
 * connections, keys them by the label in their hello frame, and correlates
 * request/response by id.
 */
async function startControlServer(): Promise<ControlServer> {
  const sockets = new Map<string, Socket>();
  const hellos = new Map<string, Record<string, unknown>>();
  const helloWaiters = new Map<string, (frame: Record<string, unknown>) => void>();
  const pending = new Map<number, (frame: Record<string, unknown>) => void>();
  let nextId = 1;

  const server: Server = createServer((socket) => {
    let buffer = "";
    socket.on("data", (chunk) => {
      buffer += chunk.toString("utf8");
      let newline = buffer.indexOf("\n");
      while (newline >= 0) {
        const line = buffer.slice(0, newline).trim();
        buffer = buffer.slice(newline + 1);
        newline = buffer.indexOf("\n");
        if (line === "") {
          continue;
        }
        const frame = JSON.parse(line) as Record<string, unknown>;
        if (frame.event === "hello") {
          const label = String(frame.label);
          sockets.set(label, socket);
          hellos.set(label, frame);
          helloWaiters.get(label)?.(frame);
          helloWaiters.delete(label);
          continue;
        }
        if (typeof frame.id === "number") {
          pending.get(frame.id)?.(frame);
          pending.delete(frame.id);
        }
      }
    });
    socket.on("error", () => {});
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
  const address = server.address();
  if (address === null || typeof address === "string") {
    throw new Error("control server failed to bind");
  }

  return {
    port: address.port,
    hello(label) {
      const existing = hellos.get(label);
      if (existing !== undefined) {
        return Promise.resolve(existing);
      }
      return new Promise((resolve) => helloWaiters.set(label, resolve));
    },
    async request(label, payload) {
      const socket = sockets.get(label);
      if (socket === undefined) {
        throw new Error(`no agent connected for ${label}`);
      }
      const id = nextId++;
      const response = new Promise<Record<string, unknown>>((resolve) => pending.set(id, resolve));
      socket.write(`${JSON.stringify({ id, ...payload })}\n`);
      return response;
    },
    async close() {
      for (const socket of sockets.values()) {
        socket.destroy();
      }
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  };
}

function waitFor(predicate: () => boolean, timeoutMs = 5_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const poll = (): void => {
      if (predicate()) {
        resolve();
        return;
      }
      if (Date.now() > deadline) {
        reject(new Error("timed out waiting for condition"));
        return;
      }
      setTimeout(poll, 20);
    };
    poll();
  });
}

describe("peer test agent", () => {
  const cleanups: Array<() => Promise<void> | void> = [];

  afterEach(async () => {
    for (const cleanup of cleanups.reverse()) {
      await cleanup();
    }
    cleanups.length = 0;
  });

  /**
   * Announce ingress is rate limited to one per five seconds per destination
   * (`DEFAULT_ANNOUNCE_RATE_TARGET`), so a second announce fired immediately
   * after mount is dropped. Agents that mount after a peer's first announce
   * therefore converge on the periodic re-announce, which is exactly what the
   * real environment relies on when peers start at different times.
   */
  const ANNOUNCE_INTERVAL_MS = 6_000;
  const CONVERGE_TIMEOUT_MS = 20_000;

  async function twoAgents(control: ControlServer): Promise<[TestAgentSession, TestAgentSession]> {
    const left = Reticulum.create({ provider, runtime });
    const right = Reticulum.create({ provider, runtime });
    left.start();
    right.start();
    const [leftPipe, rightPipe] = PipeInterface.pair(provider, { name: "left" }, { name: "right" });
    left.registerInterface(leftPipe);
    right.registerInterface(rightPipe);

    const leftAgent = await mountTestAgent({
      reticulum: left,
      provider,
      identity: new Identity(provider),
      label: "left",
      platform: "test",
      controlHost: "127.0.0.1",
      controlPort: control.port,
      announceIntervalMs: ANNOUNCE_INTERVAL_MS,
      handleCommand: async (request) => ({ echoedCommand: request.cmd, value: request.value })
    });
    const rightAgent = await mountTestAgent({
      reticulum: right,
      provider,
      identity: new Identity(provider),
      label: "right",
      platform: "test",
      controlHost: "127.0.0.1",
      controlPort: control.port,
      announceIntervalMs: ANNOUNCE_INTERVAL_MS
    });

    cleanups.push(async () => {
      await leftAgent.stop();
      await rightAgent.stop();
      left.stop();
      right.stop();
    });

    return [leftAgent, rightAgent];
  }

  it("discovers the peer announce and round-trips a probe", async () => {
    const control = await startControlServer();
    cleanups.push(() => control.close());
    const [leftAgent, rightAgent] = await twoAgents(control);

    await waitFor(
      () => leftAgent.peers().some((peer) => peer.destinationHash === rightAgent.lxmfAddress),
      CONVERGE_TIMEOUT_MS
    );
    await waitFor(
      () => rightAgent.peers().some((peer) => peer.destinationHash === leftAgent.lxmfAddress),
      CONVERGE_TIMEOUT_MS
    );

    await leftAgent.send(rightAgent.lxmfAddress, "n1");

    await waitFor(() => rightAgent.inbox().some((entry) => entry.nonce === "n1" && entry.kind === "probe"));
    await waitFor(() => leftAgent.inbox().some((entry) => entry.nonce === "n1" && entry.kind === "echo"));
  }, CONVERGE_TIMEOUT_MS + 10_000);

  it("serves info, peers, and send over the control channel", async () => {
    const control = await startControlServer();
    cleanups.push(() => control.close());
    const [leftAgent, rightAgent] = await twoAgents(control);

    const hello = await control.hello("left");
    expect(hello.lxmfAddress).toBe(leftAgent.lxmfAddress);
    expect(hello.platform).toBe("test");

    await control.hello("right");
    await waitFor(() => leftAgent.peers().length > 0, CONVERGE_TIMEOUT_MS);

    const info = await control.request("right", { cmd: "info" });
    expect(info.ok).toBe(true);
    expect(info.lxmfAddress).toBe(rightAgent.lxmfAddress);

    const extended = await control.request("left", { cmd: "project.create", value: 7 });
    expect(extended).toMatchObject({ ok: true, echoedCommand: "project.create", value: 7 });

    const sent = await control.request("left", {
      cmd: "send",
      toLxmfAddress: rightAgent.lxmfAddress,
      nonce: "n2"
    });
    expect(sent.ok).toBe(true);

    await waitFor(() => rightAgent.inbox().some((entry) => entry.nonce === "n2"));

    const inbox = (await control.request("right", { cmd: "inbox" })) as {
      ok: boolean;
      inbox: Array<{ nonce: string; kind: string }>;
    };
    expect(inbox.ok).toBe(true);
    expect(inbox.inbox.some((entry) => entry.nonce === "n2" && entry.kind === "probe")).toBe(true);

    const status = (await control.request("left", { cmd: "status" })) as {
      status: { peerCount: number; label: string };
    };
    expect(status.status.label).toBe("left");
    expect(status.status.peerCount).toBeGreaterThan(0);
  }, CONVERGE_TIMEOUT_MS + 10_000);

  it("reports an error for an undiscovered target", async () => {
    const control = await startControlServer();
    cleanups.push(() => control.close());
    await twoAgents(control);
    await control.hello("left");

    const response = await control.request("left", {
      cmd: "send",
      toLxmfAddress: "00112233445566778899aabbccddeeff",
      nonce: "n3"
    });
    expect(response.ok).toBe(false);
    expect(String(response.error)).toContain("not discovered");
  });
});
