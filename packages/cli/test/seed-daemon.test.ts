import { describe, expect, it, vi } from "vitest";

const resolveHostConfig = vi.fn((options: unknown) => ({
  resolved: true,
  options,
}));
const runNodeHost = vi.fn(async () => {});

vi.mock("@twistedpear/host-core", () => ({
  resolveHostConfig,
  runNodeHost,
}));

const { runSeeder } = await import("../src/seed/daemon.js");

describe("runSeeder", () => {
  it("wires transport/propagation/status options into the resolved config", async () => {
    await runSeeder({
      cwd: "/tmp/seed",
      stateDir: "/tmp/seed/state",
      transport: true,
      propagation: true,
      statusEndpoint: true,
      identityPassphrase: "pass",
    });

    expect(resolveHostConfig).toHaveBeenCalledWith({
      dataDir: "/tmp/seed/state",
      overrides: {
        roles: {
          transport: true,
          seeder: true,
          propagation: true,
          attachRnsd: null,
        },
        interfaces: {
          tcp: { enabled: false, mode: "client" },
          auto: { enabled: true, multicast: true, bonjour: true },
          websocket: { enabled: false },
          i2p: { enabled: false },
          rnode: { enabled: false },
        },
        statusEndpoint: true,
      },
    });
    expect(runNodeHost).toHaveBeenCalledWith({
      config: { resolved: true, options: expect.anything() },
      identityPassphrase: "pass",
    });
  });

  it("attaching rnsd disables transport and auto, and switches TCP to client mode", async () => {
    await runSeeder({
      cwd: "/tmp/seed",
      stateDir: "/tmp/seed/state",
      transport: true,
      attachRnsd: "10.0.0.5:4242",
      identityPassphrase: "pass",
    });

    const overrides = resolveHostConfig.mock.calls.at(-1)?.[0] as {
      overrides: {
        roles: { transport: boolean; attachRnsd: unknown };
        interfaces: { tcp: unknown; auto: unknown };
      };
    };
    expect(overrides.overrides.roles.transport).toBe(false);
    expect(overrides.overrides.roles.attachRnsd).toEqual({
      host: "10.0.0.5",
      port: 4242,
    });
    expect(overrides.overrides.interfaces.tcp).toEqual({
      enabled: true,
      mode: "client",
      targetHost: "10.0.0.5",
      targetPort: 4242,
    });
    expect(overrides.overrides.interfaces.auto).toEqual({
      enabled: false,
      multicast: true,
      bonjour: true,
    });
  });

  it("defaults propagation and statusEndpoint to false when omitted", async () => {
    await runSeeder({
      cwd: "/tmp/seed",
      stateDir: "/tmp/seed/state",
      transport: false,
      identityPassphrase: "pass",
    });

    const overrides = resolveHostConfig.mock.calls.at(-1)?.[0] as {
      overrides: { roles: { propagation: boolean }; statusEndpoint: boolean };
    };
    expect(overrides.overrides.roles.propagation).toBe(false);
    expect(overrides.overrides.statusEndpoint).toBe(false);
  });

  it("rejects a malformed rnsd attach address", async () => {
    await expect(
      runSeeder({
        cwd: "/tmp/seed",
        stateDir: "/tmp/seed/state",
        transport: false,
        attachRnsd: "not-a-valid-address",
        identityPassphrase: "pass",
      }),
    ).rejects.toThrow(/Invalid rnsd attach address/);
  });
});
