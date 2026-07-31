import { connect } from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import { startControlServer } from "../../scripts/peers/control-server.mjs";

const cleanups = [];

afterEach(async () => {
  for (const cleanup of cleanups.reverse()) {
    await cleanup();
  }
  cleanups.length = 0;
});

function agentSocket(port, label = "node2") {
  const socket = connect({ host: "127.0.0.1", port });
  socket.setEncoding("utf8");
  socket.write(
    `${JSON.stringify({
      event: "hello",
      label,
      platform: "test",
      identityHash: "11".repeat(16),
      lxmfAddress: "22".repeat(16)
    })}\n`
  );
  return socket;
}

describe("local multi-peer control server", () => {
  it("attaches an agent and correlates a command response", async () => {
    const control = await startControlServer({ host: "127.0.0.1", port: 0 });
    cleanups.push(() => control.close());
    const socket = agentSocket(control.port);
    cleanups.push(() => socket.destroy());

    const agent = await control.waitForAgent("node2", 1_000);
    expect(agent.platform).toBe("test");

    let buffer = "";
    socket.on("data", (chunk) => {
      buffer += chunk;
      const newline = buffer.indexOf("\n");
      if (newline < 0) {
        return;
      }
      const request = JSON.parse(buffer.slice(0, newline));
      socket.write(`${JSON.stringify({ id: request.id, ok: true, peers: [] })}\n`);
    });

    await expect(control.peers("node2")).resolves.toEqual([]);
  });

  it("rejects a pending command as soon as its agent disconnects", async () => {
    const control = await startControlServer({ host: "127.0.0.1", port: 0 });
    cleanups.push(() => control.close());
    const socket = agentSocket(control.port);
    await control.waitForAgent("node2", 1_000);

    const pending = control.request("node2", { cmd: "status" }, 10_000);
    socket.destroy();

    await expect(pending).rejects.toThrow("disconnected while answering status");
  });

  it("settles attach waiters when the server closes", async () => {
    const control = await startControlServer({ host: "127.0.0.1", port: 0 });
    const pending = control.waitForAgent("missing", 10_000);
    await control.close();

    await expect(pending).rejects.toThrow("closed before peer attached");
  });
});
