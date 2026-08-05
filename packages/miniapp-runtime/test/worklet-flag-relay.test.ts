import { describe, expect, it } from "vitest";
import { createWorkletFlagRelayService } from "../src/services/worklet-flag-relay.js";
import type { WorkletFlagRelaySnapshot } from "../src/services/worklet-flag-relay.js";

describe("createWorkletFlagRelayService", () => {
  it("reports flags and routes mutations through the real host control callbacks", async () => {
    const flags: WorkletFlagRelaySnapshot = {
      tcpEnabled: true,
      autoEnabled: false,
      bleEnabled: false,
      rnodeEnabled: false,
      tcpOnline: true,
      autoOnline: false,
      bleOnline: false,
      rnodeOnline: false
    };
    let applied = 0;
    const targets: Array<{ host: string; port: number }> = [];
    const modes: string[] = [];
    const directions: Array<{ kind: string; direction: string }> = [];
    const service = createWorkletFlagRelayService({
      initialMode: "transport-node",
      getFlags: () => flags,
      setFlags(patch) {
        Object.assign(flags, patch);
      },
      async applyInterfaceConfig() {
        applied += 1;
      },
      setTcpTarget(host, port) {
        targets.push({ host, port });
      },
      setMode(mode) {
        modes.push(mode);
      },
      setDirection(kind, direction) {
        directions.push({ kind, direction });
      },
      setPolicy() {
        // The host callback is the forwarding-policy boundary.
      }
    });

    expect(service.status()).toMatchObject({ mode: "transport-node", onlineCount: 1 });
    expect(service.list().find((entry) => entry.kind === "tcp")).toMatchObject({
      enabled: true,
      online: true
    });

    await service.enable("auto");
    expect(flags.autoEnabled).toBe(true);
    expect(applied).toBe(1);

    await service.enable("tcp", { targetHost: "10.0.0.2", targetPort: 4242 });
    expect(targets).toEqual([{ host: "10.0.0.2", port: 4242 }]);

    await service.setMode("off");
    expect(service.status().mode).toBe("off");
    expect(flags.tcpEnabled).toBe(true);
    expect(flags.autoEnabled).toBe(true);
    expect(modes).toEqual(["off"]);
    expect(applied).toBe(2);

    await service.setDirection("tcp", "rx");
    expect(directions).toEqual([{ kind: "tcp", direction: "rx" }]);

    const diagnostics = await service.diagnostics();
    expect(diagnostics.find((entry) => entry.kind === "ntfy")?.state).toBe("unsupported");
  });

  it("rejects status-only mutations and unsupported interface kinds", async () => {
    const flags: WorkletFlagRelaySnapshot = {
      tcpEnabled: false,
      autoEnabled: false,
      bleEnabled: false,
      rnodeEnabled: false
    };
    const service = createWorkletFlagRelayService({
      getFlags: () => flags,
      setFlags(patch) { Object.assign(flags, patch); },
      async applyInterfaceConfig() {}
    });

    await expect(service.setMode("bridge")).rejects.toMatchObject({ code: "RELAY_UNSUPPORTED" });
    await expect(service.setDirection("tcp", "rx")).rejects.toMatchObject({ code: "RELAY_UNSUPPORTED" });
    await expect(service.enable("ntfy")).rejects.toMatchObject({ code: "RELAY_UNSUPPORTED" });
    await expect(service.setPolicy({ allow: { tcp: { auto: false } } })).rejects.toMatchObject({ code: "RELAY_UNSUPPORTED" });
  });
});
