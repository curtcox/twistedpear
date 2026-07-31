/**
 * Control server for the peer test agents.
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

  const resolveWaiters = (label) => {
    const list = waiters.get(label);
    if (list === undefined) {
      return;
    }
    waiters.delete(label);
    for (const resolve of list) {
      resolve(agents.get(label));
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
            attachedAt: Date.now()
          });
          resolveWaiters(label);
          onAttach(agents.get(label));
          continue;
        }
        if (typeof frame.id === "number") {
          const settle = pending.get(frame.id);
          if (settle !== undefined) {
            pending.delete(frame.id);
            settle(frame);
          }
        }
      }
    });

    const drop = () => {
      if (label !== null && agents.get(label)?.socket === socket) {
        agents.delete(label);
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

  const request = (label, payload, timeoutMs = 20_000) => {
    const agent = agents.get(label);
    if (agent === undefined) {
      return Promise.reject(new Error(`peer ${label} is not attached`));
    }
    const id = nextId++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(new Error(`peer ${label} did not answer ${payload.cmd} within ${timeoutMs}ms`));
      }, timeoutMs);
      pending.set(id, (frame) => {
        clearTimeout(timer);
        if (frame.ok === false) {
          reject(new Error(`peer ${label} rejected ${payload.cmd}: ${frame.error}`));
          return;
        }
        resolve(frame);
      });
      agent.socket.write(`${JSON.stringify({ id, ...payload })}\n`);
    });
  };

  return {
    port,
    labels: () => [...agents.keys()],
    agent: (label) => agents.get(label) ?? null,
    agents: () => [...agents.values()].map(({ socket, ...rest }) => rest),
    /** Resolves once `label` has checked in, or rejects on timeout. */
    waitForAgent(label, timeoutMs = 60_000) {
      const existing = agents.get(label);
      if (existing !== undefined) {
        return Promise.resolve(existing);
      }
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          const list = waiters.get(label) ?? [];
          waiters.set(
            label,
            list.filter((entry) => entry !== wrapped)
          );
          reject(new Error(`peer ${label} never attached to the control server`));
        }, timeoutMs);
        const wrapped = (agent) => {
          clearTimeout(timer);
          resolve(agent);
        };
        waiters.set(label, [...(waiters.get(label) ?? []), wrapped]);
      });
    },
    request,
    info: (label) => request(label, { cmd: "info" }),
    peers: (label) => request(label, { cmd: "peers" }).then((frame) => frame.peers ?? []),
    inbox: (label) => request(label, { cmd: "inbox" }).then((frame) => frame.inbox ?? []),
    status: (label) => request(label, { cmd: "status" }).then((frame) => frame.status),
    announce: (label) => request(label, { cmd: "announce" }),
    send: (label, toLxmfAddress, nonce) => request(label, { cmd: "send", toLxmfAddress, nonce }),
    async close() {
      for (const agent of agents.values()) {
        agent.socket.destroy();
      }
      agents.clear();
      await new Promise((resolve) => server.close(() => resolve()));
    }
  };
}
