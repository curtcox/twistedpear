#!/usr/bin/env node
import { writeFileSync } from "node:fs";
import { chromium } from "playwright";

const args = new Map(process.argv.slice(2).map((arg) => {
  const at = arg.indexOf("=");
  return [arg.slice(2, at), arg.slice(at + 1)];
}));
const url = args.get("url");
const readyPath = args.get("ready");
const cdpPort = Number(args.get("cdp"));
if (!url || !readyPath || !Number.isFinite(cdpPort)) throw new Error("web peer requires --url, --ready, and --cdp");

const browser = await chromium.launch({
  headless: process.env.CROSS_DEVICE_HEADED !== "1",
  args: [`--remote-debugging-port=${cdpPort}`]
});
const page = await browser.newPage();
page.on("console", (message) => console.log(`browser:${message.type()}: ${message.text()}`));
page.on("pageerror", (error) => console.error(`browser:pageerror: ${error.message}`));
await page.goto(url, { waitUntil: "load", timeout: 60_000 });
await page.waitForFunction(() => globalThis.__TP_CROSS_DEVICE__ !== undefined, undefined, { timeout: 60_000 });
const body = page.locator("body");
if ((await body.getByText("Identity: none", { exact: true }).count()) > 0) {
  await page.getByTestId("create-identity").click();
}
const gatewaySwitch = page.getByTestId("ws-gateway-switch");
if ((await gatewaySwitch.getAttribute("aria-checked")) !== "true") await gatewaySwitch.click();
await page.getByText("Gateway link: online", { exact: true }).waitFor({ timeout: 60_000 });
writeFileSync(readyPath, `${JSON.stringify({ url, gateway: "online", cdpPort })}\n`);

const stop = async () => { await browser.close().catch(() => {}); process.exit(0); };
process.once("SIGTERM", () => void stop());
process.once("SIGINT", () => void stop());
await new Promise(() => {});
