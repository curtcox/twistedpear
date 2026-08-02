import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createDesktopPeerChrome } from "../../apps/host-desktop/worklet/peer-chrome.mjs";
import { readModuleSource } from "./worklet-source.mjs";

describe("desktop peer chrome", () => {
  it("routes full manual codes and peer confirmation through trusted request/reply messages", async () => {
    const seen = [];
    let next = 0;
    const chrome = createDesktopPeerChrome({
      createToken: () => `token-${next++}`,
      send: (message) => seen.push(message),
      async requestReply(message) {
        seen.push(message);
        if (message.type === "peer-manual-present" && message.expectsResponse) return { accepted: true, code: "answer-code" };
        if (message.type === "peer-confirm-request") return { approved: true };
        return { accepted: true };
      }
    });

    const answers = [];
    for await (const code of chrome.manual.offer({ id: "session", kind: "manual" }, "offer-code", { timeoutMs: 1_000 })) answers.push(code);
    expect(answers).toEqual(["answer-code"]);
    await expect(chrome.confirm(
      { displayLabel: "Peer", fingerprint: "fp", matchingWords: ["pear", "safe", "link"], dataPlane: "reticulum" },
      { service: "chat", purpose: "Exchange messages", timeoutMs: 1_000 }
    )).resolves.toBe(true);
    expect(seen.map((message) => message.type)).toEqual(["peer-manual-present", "peer-confirm-request"]);
  });

  it("reports QR availability without requesting camera permission", async () => {
    const chrome = createDesktopPeerChrome({
      createToken: () => "token",
      send() {},
      async requestReply(message) {
        expect(message.type).toBe("peer-qr-availability");
        return { availability: { state: "permission-required", reason: "Camera permission is required" } };
      }
    });
    await expect(chrome.qr.availability()).resolves.toMatchObject({ state: "permission-required" });
  });

  it("reports audio availability without requesting microphone permission", async () => {
    const chrome = createDesktopPeerChrome({
      createToken: () => "token",
      send() {},
      async requestReply(message) {
        expect(message.type).toBe("peer-audio-availability");
        return { availability: { state: "permission-required", reason: "Microphone permission is required" } };
      }
    });
    await expect(chrome.audio.availability()).resolves.toMatchObject({ state: "permission-required" });
  });

  it("routes ntfy secret exchange through trusted chrome with the configured server disclosure", async () => {
    const seen = [];
    let next = 0;
    const chrome = createDesktopPeerChrome({
      createToken: () => `token-${next++}`,
      send() {},
      ntfyServer: "https://rendezvous.example/",
      async requestReply(message) {
        seen.push(message);
        if (message.type === "peer-ntfy-availability") return { availability: { state: "available" } };
        if (message.type === "peer-ntfy-enter") return { accepted: true, code: "TPN1-secret" };
        return { accepted: true };
      }
    });
    await expect(chrome.ntfy.availability()).resolves.toMatchObject({ state: "available" });
    await expect(chrome.ntfy.presentCode({ id: "offer", kind: "ntfy" }, "TPN1-offer", { timeoutMs: 1_000 })).resolves.toBeUndefined();
    await expect(chrome.ntfy.requestCode({ service: "chat", timeoutMs: 1_000 })).resolves.toEqual({ session: { id: "token-2", kind: "ntfy" }, code: "TPN1-secret" });
    expect(seen.map(({ type }) => type)).toEqual(["peer-ntfy-availability", "peer-ntfy-present", "peer-ntfy-enter"]);
    expect(seen[1]).toMatchObject({ server: "https://rendezvous.example/", code: "TPN1-offer" });
  });

  it("keeps confirmation and permission prompts in host chrome outside the mini-app widget root", () => {
    const html = readFileSync("apps/host-desktop/src/renderer/index.html", "utf8");
    const renderer = readModuleSource("apps/host-desktop/src/renderer/app.js");
    expect(html.indexOf('id="host-modal-overlay"')).toBeGreaterThan(html.indexOf('id="widget-root"'));
    expect(renderer).toContain('message.type === "peer-confirm-request"');
    expect(renderer).toContain('startCamera.addEventListener("click"');
    expect(renderer).toContain("navigator.mediaDevices.getUserMedia");
    expect(renderer).toContain("PCM never crosses into the mini-app");
    expect(renderer).toContain("Peer label (untrusted claim)");
    expect(renderer).toContain("Matching words");
    expect(renderer).toContain("invitation contents are end-to-end encrypted");
    const main = readFileSync("apps/host-desktop/src/main/index.ts", "utf8");
    expect(main).toContain('headers.delete("authorization")');
    expect(main).toContain('headers.set("Authorization", `Bearer ${config.token}`)');
  });

  it("keeps Peer Link on the public broker API and exposes host diagnostics", () => {
    const source = readFileSync("apps/peer-link/bundle.js", "utf8");
    const manifest = JSON.parse(readFileSync("apps/peer-link/app.manifest.json", "utf8"));
    expect(source).toContain('from "@twistedpear/miniapp-sdk"');
    expect(source).toContain("peers.diagnostics()");
    expect(source).not.toMatch(/peer-discovery|BarcodeDetector|getUserMedia|RTCPeerConnection|Bluetooth|ntfy/i);
    expect(manifest.capabilities).toEqual(["peer:connect"]);
  });
});
