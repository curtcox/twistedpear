import { describe, expect, it } from "vitest";
import { resolveRelayNodeFlags } from "../src/commands/index.js";

describe("resolveRelayNodeFlags", () => {
  it("configures repeated interface flags and ntfy fields", () => {
    expect(
      resolveRelayNodeFlags([
        "--relay-mode",
        "bridge",
        "--enable",
        "ntfy",
        "--enable",
        "bluetooth",
        "--direction",
        "rx",
        "--ntfy-server",
        "https://push.example",
        "--ntfy-topic",
        "relay-topic",
        "--ntfy-secret",
        "shared-secret",
      ]),
    ).toEqual({
      relay: { mode: "bridge" },
      interfaces: {
        ntfy: {
          enabled: true,
          direction: "rx",
          relay: true,
          baseUrl: "https://push.example",
          topic: "relay-topic",
          secret: "shared-secret",
        },
        bluetooth: { enabled: true, direction: "rx", relay: true },
      },
    });
  });

  it("supports explicit disable and adapter-specific setup", () => {
    expect(
      resolveRelayNodeFlags([
        "--disable",
        "auto",
        "--rnode-port",
        "/dev/ttyUSB0",
        "--i2p-peer",
        "peer-destination",
      ]),
    ).toMatchObject({
      interfaces: {
        auto: { enabled: false },
        rnode: { enabled: true, portPath: "/dev/ttyUSB0" },
        i2p: { enabled: true, peerDestination: "peer-destination" },
      },
    });
  });

  it("rejects invalid modes, directions, kinds, and missing values", () => {
    expect(() => resolveRelayNodeFlags(["--relay-mode", "yes"])).toThrow(
      /relay-mode/,
    );
    expect(() => resolveRelayNodeFlags(["--direction", "sideways"])).toThrow(
      /direction/,
    );
    expect(() => resolveRelayNodeFlags(["--enable", "carrier-pigeon"])).toThrow(
      /Unknown/,
    );
    expect(() => resolveRelayNodeFlags(["--enable"])).toThrow(
      /requires a value/,
    );
  });
});
