import { connect } from "node:net";
import { readFileSync, rmSync } from "node:fs";
import { afterEach, describe, expect, it } from "vitest";
import { startControlServer } from "../../scripts/peers/control-server.mjs";
import { writeObserveTape } from "../../scripts/peers/state.mjs";

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
      lxmfAddress: "22".repeat(16),
    })}\n`,
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
      socket.write(
        `${JSON.stringify({ id: request.id, ok: true, peers: [] })}\n`,
      );
    });

    await expect(control.peers("node2")).resolves.toEqual([]);
    socket.removeAllListeners("data");
    let commandBuffer = "";
    socket.on("data", (chunk) => {
      commandBuffer += chunk;
      const newline = commandBuffer.indexOf("\n");
      if (newline < 0) return;
      const request = JSON.parse(commandBuffer.slice(0, newline));
      socket.write(
        `${JSON.stringify({ id: request.id, ok: true, command: request.cmd })}\n`,
      );
    });
    await expect(
      control.command("node2", "project.create", { name: "hello" }),
    ).resolves.toMatchObject({ command: "project.create" });
  });

  it("rejects a pending command as soon as its agent disconnects", async () => {
    const control = await startControlServer({ host: "127.0.0.1", port: 0 });
    cleanups.push(() => control.close());
    const socket = agentSocket(control.port);
    await control.waitForAgent("node2", 1_000);

    const pending = control.request("node2", { cmd: "status" }, 10_000);
    socket.destroy();

    await expect(pending).rejects.toThrow(
      "disconnected while answering status",
    );
  });

  it("settles attach waiters when the server closes", async () => {
    const control = await startControlServer({ host: "127.0.0.1", port: 0 });
    const pending = control.waitForAgent("missing", 10_000);
    await control.close();

    await expect(pending).rejects.toThrow("closed before peer attached");
  });
});

describe("observe tape persistence", () => {
  it("writes a recorded-history envelope under the peers tapes dir", () => {
    const path = writeObserveTape(
      "hub",
      {
        history: {
          schema: "recorded-history",
          version: 1,
          entries: [{ t: 1, kind: "observe/drop" }],
        },
        dropCensus: {
          byReason: { "announce-rate-limit:rate_limited": 2 },
          byPeer: {},
        },
      },
      { now: new Date("2026-08-05T12:00:00.000Z") },
    );
    cleanups.push(() => rmSync(path, { force: true }));

    const parsed = JSON.parse(readFileSync(path, "utf8"));
    expect(path).toContain("hub-2026-08-05T12-00-00.000Z.json");
    expect(parsed).toMatchObject({
      label: "hub",
      capturedAt: "2026-08-05T12:00:00.000Z",
      dropCensus: { byReason: { "announce-rate-limit:rate_limited": 2 } },
      history: {
        schema: "recorded-history",
        version: 1,
        entries: [{ t: 1, kind: "observe/drop" }],
      },
    });
  });
});
