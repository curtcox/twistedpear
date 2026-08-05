import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { RETICULUM_COMMUNITY_NETWORK } from "../../packages/host-core/dist/community-network.js";
import { readModuleSource } from "./worklet-source.mjs";

describe("community network bootstrap surfaces", () => {
  it("is opt-in and visible in desktop and mobile host chrome", () => {
    const desktopHtml = readFileSync("apps/host-desktop/src/renderer/index.html", "utf8");
    const desktopMain = readFileSync("apps/host-desktop/src/main/index.ts", "utf8");
    const mobile = readModuleSource("apps/harness-mobile/App.tsx");

    expect(desktopHtml).toContain('id="join-community-network"');
    expect(desktopHtml).not.toContain('id="setting-tcp" checked');
    expect(desktopMain).toContain("tcp: false");
    expect(mobile).toContain('testID="join-community-network"');
    expect(mobile).toContain("Public transport operators can observe your IP address");
  });

  it("ships redundant community-operated endpoints without treating them as trust roots", () => {
    expect(RETICULUM_COMMUNITY_NETWORK.endpoints.length).toBeGreaterThan(1);
    expect(RETICULUM_COMMUNITY_NETWORK.description).toMatch(/community/i);
    expect(RETICULUM_COMMUNITY_NETWORK.privacyNotice).toMatch(/not guaranteed/i);
  });
});
