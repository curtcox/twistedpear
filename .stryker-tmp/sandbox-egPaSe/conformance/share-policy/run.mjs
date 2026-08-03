#!/usr/bin/env node
// @ts-nocheck
/**
 * Trusted-chrome probe for the outbound share policy (G8) and the host-delivered
 * call invitation (G9), driven through the real desktop renderer.
 *
 * The renderer is a plain page fed by the preload bridge, so Playwright stubs
 * only the bridge and then exercises the shipping `renderDeviceState` /
 * `renderSessionInvites` code paths. What is asserted here is the chrome
 * contract the plan requires: the indicator is present while sharing, stopping
 * is one interaction away, expiry is visible, a restart with no re-consent
 * shows nothing, accepting an invitation is the only thing that launches an
 * app, and after accept the chrome can show a live call, an honest degradation,
 * and one-click kill plus share revoke.
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { startStaticServer } from "../../scripts/static-server.mjs";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");
const rendererRoot = join(repoRoot, "apps/host-desktop/src/renderer");

const SHARE_OFFER = {
  id: "offer-1",
  appId: "line-check",
  displayLabel: "Ana",
  classId: "microphone",
  tierId: "pcm",
  maxRung: "16k-opus",
  expiresAt: 0
};

const INVITE = {
  id: "invite-1",
  appId: "line-check",
  peer: { id: "peer-a" },
  verifiedPeerLabel: "Ana",
  requestedClasses: ["microphone"],
  receivedAt: 0,
  expiresAt: 0,
  phase: "pending"
};

function deviceState(overrides = {}) {
  return {
    type: "device-state",
    inventory: [],
    diagnostics: [],
    sessions: [],
    indicators: [],
    disabledClasses: [],
    remoteAcquisitionEnabled: false,
    shareOffers: [],
    ...overrides
  };
}

function fail(message) {
  throw new Error(`share-policy: ${message}`);
}

async function openRenderer(browser, url) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") pageErrors.push(message.text()); });
  await page.addInitScript(() => {
    globalThis.__sentToHost = [];
    let listener = null;
    globalThis.twistedPearHost = {
      send: (message) => globalThis.__sentToHost.push(message),
      onWorkletMessage: (handler) => {
        listener = handler;
        return () => {
          listener = null;
        };
      },
      onWorkletExit: () => () => {},
      deliver: (message) => listener?.(message),
      async getStatus() {
        return { running: false, linkOnline: false, announcesSeen: 0 };
      },
      async getNtfyStatus() {
        return { configured: false };
      },
      async saveModerationReport() {},
      frozenApi: {}
    };
  });
  // The shared static server maps "/" to page.html; the renderer is index.html.
  await page.goto(new URL("index.html", url).href, { waitUntil: "load" });
  return { page, pageErrors };
}

async function deliver(page, message) {
  await page.evaluate((payload) => globalThis.twistedPearHost.deliver(payload), message);
}

async function sent(page) {
  return page.evaluate(() => globalThis.__sentToHost);
}

let server = null;
let browser = null;
try {
  server = await startStaticServer(rendererRoot);
  browser = await chromium.launch({ headless: true });
  const { page, pageErrors } = await openRenderer(browser, server.url);

  const banner = page.locator("#device-active-banner");
  const inviteBanner = page.locator("#session-invite-banner");

  // Nothing shared yet: no indicator at all.
  await deliver(page, deviceState());
  if (await banner.isVisible()) fail("the sharing indicator was visible with no active share");

  // Grant: a live offer must name the peer, the class, and its expiry, and must
  // put a stop control one interaction away.
  const expiresAt = Date.now() + 15 * 60_000;
  await deliver(page, deviceState({ shareOffers: [{ ...SHARE_OFFER, expiresAt }] }));
  await banner.waitFor({ state: "visible", timeout: 5_000 });
  const text = (await banner.innerText()).replace(/\s+/g, " ");
  for (const needle of ["line-check", "Ana", "microphone", "Stop sharing"]) {
    if (!text.includes(needle)) fail(`the sharing indicator omitted ${needle}: ${text}`);
  }
  if (!text.includes(new Date(expiresAt).toLocaleTimeString())) {
    fail(`the sharing indicator omitted the expiry time: ${text}`);
  }

  // Revoke: the chrome button must ask the host, not the app.
  await banner.getByRole("button", { name: "Stop sharing" }).click();
  const revoke = (await sent(page)).filter((message) => message.type === "device-revoke-share");
  if (revoke.length !== 1 || revoke[0].appId !== "line-check" || revoke[0].id !== "offer-1") {
    fail(`revoke did not send one device-revoke-share for the offer: ${JSON.stringify(revoke)}`);
  }

  // Expiry / revocation clears the indicator.
  await deliver(page, deviceState());
  await banner.waitFor({ state: "hidden", timeout: 5_000 });

  // Restart with no re-consent: a fresh page shows nothing until the host says
  // otherwise, so a sensitive offer cannot survive a restart in the chrome.
  const restarted = await openRenderer(browser, server.url);
  await deliver(restarted.page, deviceState());
  if (await restarted.page.locator("#device-active-banner").isVisible()) {
    fail("a sharing indicator survived a host restart without re-consent");
  }
  await restarted.page.close();

  // Invitation chrome: verified peer and requested classes, decline sends no launch.
  await deliver(page, { type: "session-invites", invites: [{ ...INVITE, expiresAt: Date.now() + 60_000 }] });
  await inviteBanner.waitFor({ state: "visible", timeout: 5_000 });
  const inviteText = (await inviteBanner.innerText()).replace(/\s+/g, " ");
  for (const needle of ["Ana", "microphone", "line-check", "Accept", "Decline"]) {
    if (!inviteText.includes(needle)) fail(`the invitation omitted ${needle}: ${inviteText}`);
  }
  await inviteBanner.getByRole("button", { name: "Decline" }).click();
  await deliver(page, { type: "session-invites", invites: [{ ...INVITE, phase: "declined" }] });
  await inviteBanner.waitFor({ state: "hidden", timeout: 5_000 });

  await deliver(page, { type: "session-invites", invites: [{ ...INVITE, expiresAt: Date.now() + 60_000 }] });
  await inviteBanner.getByRole("button", { name: "Accept" }).click();
  const invited = (await sent(page)).filter((message) => message.type.startsWith("session-invite-"));
  if (invited.length !== 2 || invited[0].type !== "session-invite-decline" || invited[1].type !== "session-invite-accept") {
    fail(`invitation chrome sent ${JSON.stringify(invited)}`);
  }
  if ((await sent(page)).some((message) => message.type === "launch-miniapp")) {
    fail("the renderer launched a mini-app directly instead of letting the host do it");
  }

  // Invite → accept → call → degrade → revoke: after the host launches the app,
  // chrome must show the live session, reflect an honest rung drop, and let the
  // user kill the call and revoke the standing share in one interaction each.
  await deliver(page, { type: "session-invites", invites: [] });
  await inviteBanner.waitFor({ state: "hidden", timeout: 5_000 });
  const callExpiresAt = Date.now() + 10 * 60_000;
  await deliver(
    page,
    deviceState({
      indicators: [
        {
          handle: "session-call-1",
          appId: "line-check",
          class: "microphone",
          tier: "pcm",
          consentClass: "sensitive",
          purpose: "call with Ana",
          destination: "peer-a"
        }
      ],
      shareOffers: [{ ...SHARE_OFFER, expiresAt: callExpiresAt }]
    })
  );
  await banner.waitFor({ state: "visible", timeout: 5_000 });
  let callText = (await banner.innerText()).replace(/\s+/g, " ");
  for (const needle of ["line-check", "microphone", "pcm", "call with Ana", "Stop", "Stop sharing", "Ana"]) {
    if (!callText.includes(needle)) fail(`active call chrome omitted ${needle}: ${callText}`);
  }

  await deliver(
    page,
    deviceState({
      indicators: [
        {
          handle: "session-call-1",
          appId: "line-check",
          class: "microphone",
          tier: "derived",
          consentClass: "sensitive",
          purpose: "link dropped to audio events only",
          destination: "peer-a"
        }
      ],
      shareOffers: [{ ...SHARE_OFFER, expiresAt: callExpiresAt }]
    })
  );
  callText = (await banner.innerText()).replace(/\s+/g, " ");
  for (const needle of ["derived", "link dropped to audio events only"]) {
    if (!callText.includes(needle)) fail(`degraded call chrome omitted ${needle}: ${callText}`);
  }

  await banner.getByRole("button", { name: "Stop", exact: true }).click();
  const killed = (await sent(page)).filter((message) => message.type === "device-kill-session");
  if (killed.length !== 1 || killed[0].handle !== "session-call-1") {
    fail(`call stop did not send one device-kill-session: ${JSON.stringify(killed)}`);
  }
  await banner.getByRole("button", { name: "Stop sharing" }).click();
  const callRevoke = (await sent(page)).filter((message) => message.type === "device-revoke-share");
  if (callRevoke.length < 2 || callRevoke.at(-1)?.id !== "offer-1") {
    fail(`call revoke did not send device-revoke-share for the offer: ${JSON.stringify(callRevoke)}`);
  }
  await deliver(page, deviceState());
  await banner.waitFor({ state: "hidden", timeout: 5_000 });

  if (pageErrors.length > 0) fail(`renderer raised ${pageErrors.join("; ")}`);
  console.log("share-policy: grant, revoke, expiry, restart, indicator, invite accept/decline, invite→call→degrade→revoke passed");
} catch (error) {
  console.error(`share-policy: failed — ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
} finally {
  await browser?.close();
  await server?.close();
}
