import { describe, expect, it } from "vitest";
import { createWorkletFlagRelayService } from "../src/services/worklet-flag-relay.js";
import type { WorkletFlagRelaySnapshot } from "../src/services/worklet-flag-relay.js";

describe("createWorkletFlagRelayService", () => {
  it("reports flags, enables/disables interfaces, and turns mode off", async () => {
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
    expect(flags.tcpEnabled).toBe(false);
    expect(flags.autoEnabled).toBe(false);
    expect(applied).toBe(3);

    const diagnostics = await service.diagnostics();
    expect(diagnostics.find((entry) => entry.kind === "ntfy")?.state).toBe("unsupported");
  });
});
