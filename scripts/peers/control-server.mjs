/**
 * Control server for peer control agents.
 *
 * Agents (see `packages/host-core/src/test-agent.ts`) dial in and identify
 * themselves with a `hello` frame; this side issues commands and correlates
 * responses by id. Shared by `npm run peers -- status` and the
 * `conformance/local-multipeer` suite — whichever process happens to hold the
 * port. Agents reconnect on a short retry loop, so handing the port from one
 * to the other just works.
 */
import { createServer } from "node:net";
import { CONTROL_PORT } from "./state.mjs";

export async function startControlServer(options = {}) {
  const port = options.port ?? CONTROL_PORT;
  const host = options.host ?? "0.0.0.0";
  const onAttach = options.onAttach ?? (() => {});

  const agents = new Map();
  const waiters = new Map();
  const pending = new Map();
  let nextId = 1;
  let closed = false;

  const resolveWaiters = (label) => {
    const list = waiters.get(label);
    if (list === undefined) {
      return;
    }
    waiters.delete(label);
    for (const waiter of list) {
      clearTimeout(waiter.timer);
      waiter.resolve(agents.get(label));
    }
  };

  const server = createServer((socket) => {
    socket.setNoDelay(true);
    let buffer = "";
    let label = null;

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
        let frame;
        try {
          frame = JSON.parse(line);
        } catch {
          continue;
        }
        if (frame.event === "hello") {
          label = String(frame.label);
          const previous = agents.get(label);
          if (previous !== undefined && previous.socket !== socket) {
            previous.socket.destroy();
          }
          agents.set(label, {
            label,
            platform: frame.platform,
            identityHash: frame.identityHash,
            lxmfAddress: frame.lxmfAddress,
            socket,
            attachedAt: Date.now(),
          });
          resolveWaiters(label);
          onAttach(agents.get(label));
          continue;
        }
        if (typeof frame.id === "number") {
          const request = pending.get(frame.id);
          // A stale/replaced connection must not be able to settle a request
          // issued to the current connection for the same label.
          if (request !== undefined && request.socket === socket) {
            pending.delete(frame.id);
            request.settle(frame);
          }
        }
      }
    });

    const drop = () => {
      if (label !== null && agents.get(label)?.socket === socket) {
        agents.delete(label);
      }
      for (const [id, request] of pending) {
        if (request.socket !== socket) {
          continue;
        }
        pending.delete(id);
        request.reject(
          new Error(
            `peer ${request.label} disconnected while answering ${request.cmd}`,
          ),
        );
      }
    };
    socket.on("close", drop);
    socket.on("error", drop);
  });

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => {
      server.removeListener("error", reject);
      resolve();
    });
  });
  const address = server.address();
  const boundPort =
    address !== null && typeof address !== "string" ? address.port : port;

  const request = (label, payload, timeoutMs = 20_000) => {
    if (closed) {
      return Promise.reject(new Error("control server is closed"));
    }
    const agent = agents.get(label);
    if (agent === undefined) {
      return Promise.reject(new Error(`peer ${label} is not attached`));
    }
    const id = nextId++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(
          new Error(
            `peer ${label} did not answer ${payload.cmd} within ${timeoutMs}ms`,
          ),
        );
      }, timeoutMs);
      pending.set(id, {
        label,
        cmd: payload.cmd,
        socket: agent.socket,
        reject(error) {
          clearTimeout(timer);
          reject(error);
        },
        settle(frame) {
          clearTimeout(timer);
          if (frame.ok === false) {
            reject(
              new Error(
                `peer ${label} rejected ${payload.cmd}: ${frame.error}`,
              ),
            );
            return;
          }
          resolve(frame);
        },
      });
      agent.socket.write(`${JSON.stringify({ id, ...payload })}\n`, (error) => {
        if (error === null || error === undefined) {
          return;
        }
        const active = pending.get(id);
        if (active !== undefined) {
          pending.delete(id);
          active.reject(error);
        }
      });
    });
  };

  return {
    port: boundPort,
    labels: () => [...agents.keys()],
    agent: (label) => agents.get(label) ?? null,
    agents: () =>
      [...agents.values()].map((agent) => {
        const rest = { ...agent };
        delete rest.socket;
        return rest;
      }),
    /** Resolves once `label` has checked in, or rejects on timeout. */
    waitForAgent(label, timeoutMs = 60_000) {
      if (closed) {
        return Promise.reject(new Error("control server is closed"));
      }
      const existing = agents.get(label);
      if (existing !== undefined) {
        return Promise.resolve(existing);
      }
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          const list = waiters.get(label) ?? [];
          const remaining = list.filter((entry) => entry !== waiter);
          if (remaining.length === 0) {
            waiters.delete(label);
          } else {
            waiters.set(label, remaining);
          }
          reject(
            new Error(`peer ${label} never attached to the control server`),
          );
        }, timeoutMs);
        const waiter = { resolve, reject, timer };
        waiters.set(label, [...(waiters.get(label) ?? []), waiter]);
      });
    },
    request,
    info: (label) => request(label, { cmd: "info" }),
    peers: (label) =>
      request(label, { cmd: "peers" }).then((frame) => frame.peers ?? []),
    inbox: (label) =>
      request(label, { cmd: "inbox" }).then((frame) => frame.inbox ?? []),
    status: (label) =>
      request(label, { cmd: "status" }).then((frame) => frame.status),
    announce: (label) => request(label, { cmd: "announce" }),
    announceBurst: (label, count = 16) =>
      request(label, { cmd: "announce-burst", count }).then((frame) => ({
        sent: frame.sent ?? 0,
        failed: frame.failed ?? 0,
      })),
    send: (label, toLxmfAddress, nonce) =>
      request(label, { cmd: "send", toLxmfAddress, nonce }),
    realtimeInbox: (label) =>
      request(label, { cmd: "realtime-inbox" }).then(
        (frame) => frame.inbox ?? [],
      ),
    sendRealtime: (label, toLxmfAddress, nonce, payloadHex) =>
      request(label, {
        cmd: "send-realtime",
        toLxmfAddress,
        nonce,
        payloadHex,
      }),
    callInbox: (label) =>
      request(label, { cmd: "call-inbox" }).then((frame) => frame.inbox ?? []),
    acceptInvite: (label, inviteId) =>
      request(label, { cmd: "accept-invite", inviteId }),
    sendCall: (label, inviteId, nonce, payloadHex) =>
      request(label, { cmd: "send-call", inviteId, nonce, payloadHex }),
    linkState: (label) =>
      request(label, { cmd: "link-state" }).then((frame) => ({
        readiness: frame.readiness ?? [],
        probes: frame.probes ?? [],
        dropCensus: frame.dropCensus ?? { byReason: {}, byPeer: {} },
      })),
    requestReadiness: (label, toLxmfAddress) =>
      request(label, { cmd: "request-readiness", toLxmfAddress }),
    linkProbe: (label, toLxmfAddress, budgetBytes) =>
      request(label, { cmd: "link-probe", toLxmfAddress, budgetBytes }),
    inviteState: (label) =>
      request(label, { cmd: "invite-state" }).then(
        (frame) => frame.invites ?? [],
      ),
    sendInvite: (label, toLxmfAddress, appId, requestedClasses) =>
      request(label, {
        cmd: "send-invite",
        toLxmfAddress,
        appId,
        requestedClasses,
      }),
    observeSnapshot: (label) =>
      request(label, { cmd: "observe-snapshot" }).then((frame) => ({
        history: frame.history,
        dropCensus: frame.dropCensus ?? { byReason: {}, byPeer: {} },
      })),
    subscribeObserve: (label) =>
      request(label, { cmd: "subscribe", domain: "observe" }),
    unsubscribeObserve: (label) =>
      request(label, { cmd: "unsubscribe", domain: "observe" }),
    command: (label, cmd, payload = {}, timeoutMs) =>
      request(label, { cmd, ...payload }, timeoutMs),
    async close() {
      if (closed) {
        return;
      }
      closed = true;
      for (const list of waiters.values()) {
        for (const waiter of list) {
          clearTimeout(waiter.timer);
          waiter.reject(
            new Error("control server closed before peer attached"),
          );
        }
      }
      waiters.clear();
      for (const [id, request] of pending) {
        pending.delete(id);
        request.reject(new Error("control server closed before peer answered"));
      }
      for (const agent of agents.values()) {
        agent.socket.destroy();
      }
      agents.clear();
      await new Promise((resolve) => server.close(() => resolve()));
    },
  };
}
