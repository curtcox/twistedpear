import { describe, expect, it, vi } from "vitest";
import {
  formatLocalhostBindRefusal,
  probeLocalhostBind,
} from "../../scripts/checks/localhost-bind.mjs";

describe("localhost bind preflight", () => {
  it("checks TCP and UDP before allowing the socket-bearing suite", async () => {
    const tcp = vi.fn().mockResolvedValue(undefined);
    const udp = vi.fn().mockResolvedValue(undefined);

    await expect(probeLocalhostBind({ tcp, udp })).resolves.toEqual({
      ok: true,
    });
    expect(tcp).toHaveBeenCalledOnce();
    expect(udp).toHaveBeenCalledOnce();
  });

  it("stops immediately when TCP binding is unavailable", async () => {
    const udp = vi.fn();
    const result = await probeLocalhostBind({
      tcp: vi.fn().mockRejectedValue(new Error("listen EPERM")),
      udp,
    });

    expect(result).toEqual({
      ok: false,
      protocol: "TCP",
      message: "listen EPERM",
    });
    expect(udp).not.toHaveBeenCalled();
    expect(formatLocalhostBindRefusal(result)).toMatch(
      /REFUSE unit-tests: localhost TCP bind is unavailable.*EPERM/s,
    );
  });

  it("identifies a UDP-only restriction", async () => {
    await expect(
      probeLocalhostBind({
        tcp: vi.fn().mockResolvedValue(undefined),
        udp: vi.fn().mockRejectedValue(new Error("bind EACCES")),
      }),
    ).resolves.toMatchObject({
      ok: false,
      protocol: "UDP",
      message: "bind EACCES",
    });
  });
});
