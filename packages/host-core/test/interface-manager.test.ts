import { describe, expect, it } from "vitest";
import {
  NodeCryptoProvider,
  nodeRuntime,
  type PacketInterface,
  type Reticulum,
} from "@twistedpear/reticulum-ts";
import { SimulatedOpticalChannel } from "@twistedpear/reticulum-interfaces";
import { InterfaceManager } from "../src/interface-manager.js";
import { defaultHostConfig } from "../src/types.js";

function reticulumRegistry(): {
  readonly reticulum: Reticulum;
  readonly interfaces: PacketInterface[];
} {
  const interfaces: PacketInterface[] = [];
  const observers = new Set<() => void>();
  const reticulum = {
    setTransportEnabled() {},
    registerInterface(iface: PacketInterface) {
      interfaces.push(iface);
      for (const observer of observers) observer();
    },
    unregisterInterface(iface: PacketInterface) {
      const index = interfaces.indexOf(iface);
      if (index >= 0) interfaces.splice(index, 1);
      for (const observer of observers) observer();
    },
    listInterfaces() {
      return [...interfaces];
    },
    observeInterfaces(observer: () => void) {
      observers.add(observer);
      return () => observers.delete(observer);
    },
  } as unknown as Reticulum;
  return { reticulum, interfaces };
}

describe("InterfaceManager lifecycle", () => {
  it("unregisters replaced and stopped interfaces from Reticulum", async () => {
    const provider = new NodeCryptoProvider();
    const registry = reticulumRegistry();
    const manager = new InterfaceManager({
      reticulum: registry.reticulum,
      provider,
      runtime: nodeRuntime(),
      effects: {
        optical: {
          async createChannel() {
            return new SimulatedOpticalChannel();
          },
        },
      },
    });
    const config = defaultHostConfig({
      roles: {
        transport: false,
        seeder: false,
        propagation: false,
        attachRnsd: null,
      },
      interfaces: {
        auto: { enabled: false },
        optical: { enabled: true, direction: "both" },
      },
    });

    await manager.start(config);
    expect(registry.interfaces).toHaveLength(1);
    expect(manager.list()).toHaveLength(10);
    expect(manager.list().find((entry) => entry.kind === "ntfy")).toMatchObject(
      {
        enabled: false,
        online: false,
        bitrate: 10_000,
      },
    );
    const original = registry.interfaces[0];

    await manager.setDirection("optical", "rx");
    expect(registry.interfaces).toHaveLength(1);
    expect(registry.interfaces[0]).not.toBe(original);
    expect(registry.interfaces[0]?.incoming).toBe(true);
    expect(registry.interfaces[0]?.outgoing).toBe(false);

    await manager.stop();
    expect(registry.interfaces).toHaveLength(0);
  });

  it("persists hot changes and keeps generated ntfy credentials stable", async () => {
    const provider = new NodeCryptoProvider();
    const registry = reticulumRegistry();
    const persisted = [] as ReturnType<typeof defaultHostConfig>[];
    const manager = new InterfaceManager({
      reticulum: registry.reticulum,
      provider,
      runtime: nodeRuntime(),
      onConfigChange(config) {
        persisted.push(config);
      },
    });
    const config = defaultHostConfig({
      roles: {
        transport: false,
        seeder: false,
        propagation: false,
        attachRnsd: null,
      },
      interfaces: { auto: { enabled: false } },
    });

    await manager.start(config);
    expect(persisted).toHaveLength(0);
    await manager.enable("ntfy", {
      baseUrl: "https://example.invalid",
      direction: "tx",
    });

    expect(persisted).toHaveLength(1);
    expect(persisted[0]?.interfaces.ntfy.topic).toMatch(/^[0-9a-f]{16}$/);
    expect(persisted[0]?.interfaces.ntfy.secret).toMatch(/^[0-9a-f]{32}$/);
    await manager.stop();
  });
});
