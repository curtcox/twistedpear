import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * G9: a call invitation is host chrome, not app code. Every shipping host must
 * show the verified peer and the requested classes, and must have a decline
 * path that launches nothing.
 */
const surfaces = [
  { name: "desktop renderer", path: "apps/host-desktop/src/renderer/app.js" },
  { name: "mobile harness", path: "apps/harness-mobile/App.tsx" },
  { name: "web harness", path: "apps/harness-mobile/App.web.tsx" }
];

describe("session invite chrome", () => {
  for (const surface of surfaces) {
    it(`${surface.name} renders the verified peer, both actions, and no app-side accept`, () => {
      const source = readFileSync(surface.path, "utf8");
      expect(source).toContain("session-invite-accept");
      expect(source).toContain("session-invite-decline");
      expect(source).toContain("verifiedPeerLabel");
      expect(source).toContain("requestedClasses");
      // Only pending invitations may be actionable.
      expect(source).toContain('phase === "pending"');
    });
  }

  it("routes accept and decline through the worklet host, never the sandbox", () => {
    for (const entry of [
      "apps/host-desktop/worklet/entry.mjs",
      "apps/harness-mobile/worklet/entry.mjs",
      "apps/harness-mobile/worklet/web-entry.mjs"
    ]) {
      const source = readFileSync(entry, "utf8");
      expect(source, entry).toContain('message.type === "session-invite-accept"');
      expect(source, entry).toContain('message.type === "session-invite-decline"');
      expect(source, entry).toContain("acceptSessionInvite");
      expect(source, entry).toContain("declineSessionInvite");
      // Foreground launch is the host's, and only the host's, to perform.
      expect(source, entry).toContain("launchInstalledApp");
    }
  });

  it("only brings an app forward from the invite service's accept path", () => {
    for (const host of [
      "packages/worklet-core/src/miniapp-host.mjs",
      "packages/worklet-core/src/web-miniapp-host.mjs"
    ]) {
      const source = readFileSync(host, "utf8");
      expect(source, host).toContain("new SessionInviteService(");
      expect(source, host).toContain("launchForeground");
      expect(source, host).toContain("options.launchInstalledApp");
    }
  });
});
