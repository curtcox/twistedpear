#!/usr/bin/env node
// @ts-nocheck
/**
 * Chromium web-host peer process: loads the static web host, mounts the
 * cross-device / WebRTC harness bridge, and (optionally) dials the peer
 * control server so `webrtc-gui-call` can drive the page like desktop.
 */
import { createConnection } from "node:net";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { chromium } from "playwright";
import { CONTROL_PORT } from "./state.mjs";

const args = new Map(
  process.argv.slice(2).map((arg) => {
    const at = arg.indexOf("=");
    return [arg.slice(2, at), arg.slice(at + 1)];
  })
);
const url = args.get("url");
const readyPath = args.get("ready");
const cdpPort = Number(args.get("cdp"));
const label = args.get("label") ?? "web";
const userDataDir = args.get("user-data-dir");
const controlHost = args.get("control-host") ?? "127.0.0.1";
const controlPort = Number(args.get("control-port") ?? CONTROL_PORT);
const attachControl = args.get("control") !== "0";

if (!url || !readyPath || !Number.isFinite(cdpPort)) {
  throw new Error("web peer requires --url, --ready, and --cdp");
}

const launchOptions = {
  headless: process.env.CROSS_DEVICE_HEADED !== "1",
  args: [
    `--remote-debugging-port=${cdpPort}`,
    "--use-fake-device-for-media-stream",
    "--use-fake-ui-for-media-stream"
  ]
};

const browser = userDataDir
  ? null
  : await chromium.launch(launchOptions);
if (userDataDir) {
  mkdirSync(userDataDir, { recursive: true });
}
const context = userDataDir
  ? await chromium.launchPersistentContext(userDataDir, launchOptions)
  : await browser.newContext();
const page = context.pages()[0] ?? (await context.newPage());
page.on("console", (message) => console.log(`browser:${message.type()}: ${message.text()}`));
page.on("pageerror", (error) => console.error(`browser:pageerror: ${error.message}`));
await page.goto(url, { waitUntil: "load", timeout: 60_000 });
await page.waitForFunction(() => globalThis.__TP_CROSS_DEVICE__ !== undefined, undefined, {
  timeout: 60_000
});
const body = page.locator("body");
if ((await body.getByText("Identity: none", { exact: true }).count()) > 0) {
  await page.getByTestId("create-identity").click();
}
const gatewaySwitch = page.getByTestId("ws-gateway-switch");
if ((await gatewaySwitch.getAttribute("aria-checked")) !== "true") await gatewaySwitch.click();
await page.getByText("Gateway link: online", { exact: true }).waitFor({ timeout: 60_000 });

async function harnessCommand(cmd, payload = {}, timeoutMs = 120_000) {
  return page.evaluate(
    async ({ cmd, payload, timeoutMs }) => {
      const bridge = globalThis.__TP_CROSS_DEVICE__;
      if (bridge === undefined) throw new Error("__TP_CROSS_DEVICE__ is not mounted");
      const timer = new Promise((_, reject) => {
        setTimeout(() => reject(new Error(`harness ${cmd} timed out`)), timeoutMs);
      });
      return Promise.race([bridge.command(cmd, payload), timer]);
    },
    { cmd, payload, timeoutMs }
  );
}

async function waitForLxmf(timeoutMs = 60_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const info = await harnessCommand("harness-info", {}, 15_000);
    if (typeof info?.lxmfAddress === "string" && info.lxmfAddress.length > 0) {
      return info;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("web peer never published an LXMF delivery address");
}

const info = await waitForLxmf();
mkdirSync(dirname(readyPath), { recursive: true });
writeFileSync(
  readyPath,
  `${JSON.stringify({
    url,
    gateway: "online",
    cdpPort,
    label,
    lxmfAddress: info.lxmfAddress,
    identityHash: info.identityHash
  })}\n`
);
console.log(`web-peer ${label}: ready lxmf ${String(info.lxmfAddress).slice(0, 12)}…`);

/** @type {import("node:net").Socket | null} */
let controlSocket = null;
let controlBuffer = "";
let controlStopped = false;

function writeControl(frame) {
  if (controlSocket === null || controlSocket.destroyed) return;
  controlSocket.write(`${JSON.stringify(frame)}\n`);
}

async function handleControlRequest(frame) {
  const id = frame.id;
  const cmd = frame.cmd;
  try {
    if (cmd === "info" || cmd === "status") {
      const live = await harnessCommand("harness-info", {}, 15_000);
      writeControl({
        id,
        ok: true,
        status: {
          label,
          platform: "web",
          identityHash: live.identityHash,
          lxmfAddress: live.lxmfAddress,
          linkOnline: live.linkOnline
        },
        ...(cmd === "info"
          ? {
              label,
              platform: "web",
              identityHash: live.identityHash,
              lxmfAddress: live.lxmfAddress
            }
          : {})
      });
      return;
    }
    if (cmd === "peers" || cmd === "inbox" || cmd === "realtime-inbox" || cmd === "call-inbox" || cmd === "link-state") {
      writeControl({ id, ok: true, peers: [], inbox: [], readiness: [], probes: [] });
      return;
    }
    const { id: _id, cmd: requestCmd, ...rest } = frame;
    const result = await harnessCommand(requestCmd, rest, 120_000);
    writeControl({ id, ok: true, ...result });
  } catch (error) {
    writeControl({
      id,
      ok: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

function attachControlBridge() {
  if (!attachControl) return;
  const dial = () => {
    if (controlStopped) return;
    const socket = createConnection({ host: controlHost, port: controlPort });
    controlSocket = socket;
    controlBuffer = "";
    socket.setNoDelay(true);
    socket.on("connect", () => {
      writeControl({
        event: "hello",
        label,
        platform: "web",
        identityHash: info.identityHash,
        lxmfAddress: info.lxmfAddress
      });
      console.log(`web-peer ${label}: control attached as ${label}`);
    });
    socket.on("data", (chunk) => {
      controlBuffer += chunk.toString("utf8");
      let newline = controlBuffer.indexOf("\n");
      while (newline >= 0) {
        const line = controlBuffer.slice(0, newline).trim();
        controlBuffer = controlBuffer.slice(newline + 1);
        newline = controlBuffer.indexOf("\n");
        if (line === "") continue;
        let frame;
        try {
          frame = JSON.parse(line);
        } catch {
          continue;
        }
        if (typeof frame.id === "number" && typeof frame.cmd === "string") {
          void handleControlRequest(frame);
        }
      }
    });
    const retry = () => {
      controlSocket = null;
      if (controlStopped) return;
      setTimeout(dial, 1_000);
    };
    socket.on("close", retry);
    socket.on("error", () => {
      socket.destroy();
    });
  };
  dial();
}

attachControlBridge();

const stop = async () => {
  controlStopped = true;
  try {
    controlSocket?.destroy();
  } catch {
    /* ignore */
  }
  await context.close().catch(() => {});
  await browser?.close().catch(() => {});
  process.exit(0);
};
process.once("SIGTERM", () => void stop());
process.once("SIGINT", () => void stop());
await new Promise(() => {});
