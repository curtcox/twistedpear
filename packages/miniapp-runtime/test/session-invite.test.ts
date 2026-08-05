import { describe, expect, it, vi } from "vitest";
import { SessionInviteService } from "../src/index.js";

describe("host session invites", () => {
  it("notifies in chrome and launches app code only after acceptance", async () => {
    const notify = vi.fn(async () => undefined);
    const launchForeground = vi.fn(async () => undefined);
    const service = new SessionInviteService({ notify, launchForeground }, () => 100);
    await service.receive({
      id: "invite-1",
      appId: "line-check",
      peer: { id: "peer-a" },
      verifiedPeerLabel: "Ana",
      requestedClasses: ["microphone"],
      expiresAt: 1_000,
      verified: true
    });
    expect(notify).toHaveBeenCalledOnce();
    expect(launchForeground).not.toHaveBeenCalled();
    await service.accept("invite-1");
    expect(launchForeground).toHaveBeenCalledWith("line-check", "invite-1");
  });

  it("declines without launching", async () => {
    const launchForeground = vi.fn(async () => undefined);
    const service = new SessionInviteService({ notify: async () => undefined, launchForeground }, () => 100);
    await service.receive({
      id: "invite-2",
      appId: "line-check",
      peer: { id: "peer-b" },
      verifiedPeerLabel: "Ben",
      requestedClasses: ["camera"],
      expiresAt: 1_000,
      verified: true
    });
    service.decline("invite-2");
    expect(launchForeground).not.toHaveBeenCalled();
    expect(service.list()[0]?.phase).toBe("declined");
  });

  it("rejects unverified, expired, and replayed network invites", async () => {
    const service = new SessionInviteService({ notify: async () => undefined, launchForeground: async () => undefined }, () => 100);
    const input = {
      id: "invite-3",
      appId: "line-check",
      peer: { id: "peer-c" },
      verifiedPeerLabel: "Cam",
      requestedClasses: ["microphone"] as const,
      expiresAt: 1_000
    };
    await expect(service.receive({ ...input, verified: false })).rejects.toThrow(/verified/);
    await service.receive({ ...input, verified: true });
    await expect(service.receive({ ...input, verified: true })).rejects.toThrow(/replay/);
    await expect(service.receive({ ...input, id: "expired", expiresAt: 99, verified: true })).rejects.toThrow(/unavailable/);
  });
});
