import { describe, expect, it } from "vitest";
import { parseDevLinkFlags } from "../src/commands/dev-link-flags.js";
import {
  applyLinkProfile,
  LINK_PROFILES,
  mountApp,
} from "@twistedpear/miniapp-test";

describe("link profiles", () => {
  it("parses tp dev flags", () => {
    expect(
      parseDevLinkFlags(["app", "--link", "lora", "--loss", "20"]),
    ).toEqual({ link: "lora", loss: 0.2, peerOffline: false });
    expect(parseDevLinkFlags(["app", "--peer-offline"]).peerOffline).toBe(true);
  });

  it("degrades the lora profile through the harness", async () => {
    const handle = await mountApp({
      manifest: {
        name: "link-app",
        version: "1.0.0",
        entry: "bundle.js",
        capabilities: [],
        publisherPublicKey: "publisher",
      },
      bundle: new TextEncoder().encode(`
await sdk.ui.render({
  root: { id: "root", type: "text", props: { value: "ok" } }
});
`),
      link: "lora",
    });
    try {
      const profile = await applyLinkProfile(handle, "lora");
      expect(profile.bitrate).toBe(LINK_PROFILES.lora.bitrate);
      expect(profile.latencyMs).toBeGreaterThan(LINK_PROFILES.lan.latencyMs);
    } finally {
      await handle.close();
    }
  });
});
