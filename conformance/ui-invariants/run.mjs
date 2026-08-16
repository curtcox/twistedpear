#!/usr/bin/env node
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import {
  desktopHostMock,
  startStaticServer,
} from "../docs/capture-reader-guide-ui-lib.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const renderer = join(root, "apps/host-desktop/src/renderer/index.html");
const artifact = join(root, "artifacts/ui-invariants/ui-invariants.json");
const checks = [];

function record(name, ok, detail = null) {
  checks.push({ name, ok, detail });
  if (!ok) throw new Error(`${name}${detail ? `: ${detail}` : ""}`);
}

const server = await startStaticServer(dirname(renderer));
const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 800 },
  });
  page.on("pageerror", (error) =>
    console.error(`ui-invariants page: ${error.message}`),
  );
  page.on("console", (message) => {
    if (message.type() === "error")
      console.error(`ui-invariants console: ${message.text()}`);
  });
  await page.addInitScript(desktopHostMock, {
    emitName: "__TP_TEST_EMIT__",
    messagesName: "__TP_TEST_MESSAGES__",
  });
  await page.goto(server.url, { waitUntil: "load" });
  await page.waitForFunction(
    () => globalThis.__TP_RENDERER_LISTENING__ === true,
    undefined,
    { timeout: 5_000 },
  );

  await page.evaluate(() =>
    globalThis.__TP_TEST_EMIT__({
      type: "install-review",
      token: "install-token",
      appId: "field-log",
      version: "1.2.3",
      trusted: false,
      trustedLabel: null,
      publisherPublicKey: "publisher-0123456789abcdef",
      capabilities: [
        { id: "storage:kv", description: "Save observations", granted: true },
        {
          id: "location",
          description: "Read current location",
          granted: false,
        },
      ],
    }),
  );
  const dialog = page.locator("#host-modal");
  record(
    "untrusted publisher is explicit",
    (await dialog.textContent()).includes("UNTRUSTED publisher"),
  );
  record(
    "publisher identity is visible",
    (await dialog.textContent()).includes("publisher-0123456789abcdef"),
  );
  record(
    "capability rationale is visible",
    (await dialog.textContent()).includes("Save observations"),
  );
  record(
    "host dialog is outside mini-app content",
    await page
      .locator("#widget-root #host-modal")
      .count()
      .then((count) => count === 0),
  );
  await dialog.getByRole("button", { name: "Cancel" }).click();
  record(
    "denial reaches only the host",
    await page.evaluate(() =>
      globalThis.__TP_TEST_MESSAGES__.some(
        (message) =>
          message.type === "install-confirm" &&
          message.token === "install-token" &&
          message.accept === false,
      ),
    ),
  );

  await page.evaluate(() => {
    globalThis.__TP_TEST_EMIT__({
      type: "installed",
      packages: [
        {
          appId: "field-log",
          version: "1.2.3",
          publisherPublicKey: "publisher-0123456789abcdef",
          capabilities: ["storage:kv", "location"],
        },
      ],
    });
    globalThis.__TP_TEST_EMIT__({
      type: "miniapp-runtime",
      runtime: {
        appId: "field-log",
        version: "1.2.3",
        state: "running",
        widgetTree: null,
      },
    });
  });
  record(
    "running app is unmistakably app content",
    (await page.locator(".miniapp-toolbar").isVisible()) &&
      (await page
        .locator("body")
        .evaluate((body) => body.classList.contains("miniapp-running"))) &&
      (await page.locator(".miniapp-toolbar").textContent()).includes(
        "Running mini-app",
      ),
  );
  await page.getByRole("button", { name: "Trust & capabilities" }).click();
  record(
    "trust details are reachable in one interaction",
    (await page
      .getByRole("button", { name: "Return to running mini-app" })
      .isVisible()) &&
      (await page.evaluate(() =>
        globalThis.__TP_TEST_MESSAGES__.some(
          (message) =>
            message.type === "get-grants" && message.appId === "field-log",
        ),
      )),
  );
  await page.evaluate(() =>
    globalThis.__TP_TEST_EMIT__({
      type: "grants",
      appId: "field-log",
      capabilities: [
        {
          id: "storage:kv",
          description: "Save observations",
          declared: true,
          granted: true,
        },
        {
          id: "location",
          description: "Read current location",
          declared: true,
          granted: true,
        },
      ],
    }),
  );
  const grants = page.locator("#grants-panel");
  record(
    "grant view names the publisher",
    (await grants.textContent()).includes("publisher-0123456789abcdef"),
  );
  await grants.locator('input[data-capability-id="location"]').uncheck();
  record(
    "revocation request is sent without restart",
    await page.evaluate(() =>
      globalThis.__TP_TEST_MESSAGES__.some(
        (message) =>
          message.type === "set-grants" &&
          message.appId === "field-log" &&
          !message.grantedCapabilities.includes("location"),
      ),
    ),
  );
  await page.evaluate(() =>
    globalThis.__TP_TEST_EMIT__({
      type: "grants",
      appId: "field-log",
      capabilities: [
        {
          id: "storage:kv",
          description: "Save observations",
          declared: true,
          granted: true,
        },
        {
          id: "location",
          description: "Read current location",
          declared: true,
          granted: false,
        },
      ],
    }),
  );
  record(
    "host-confirmed revocation renders without restart",
    !(await grants.locator('input[data-capability-id="location"]').isChecked()),
  );
  await page
    .getByRole("button", { name: "Return to running mini-app" })
    .click();
  record(
    "running app is reachable again without relaunch",
    (await page.locator(".miniapp-toolbar").isVisible()) &&
      !(await page.evaluate(() =>
        globalThis.__TP_TEST_MESSAGES__.some(
          (message) => message.type === "launch-miniapp",
        ),
      )),
  );
  await page.close();
} finally {
  await browser.close();
  await server.close();
}

mkdirSync(dirname(artifact), { recursive: true });
writeFileSync(
  artifact,
  `${JSON.stringify(
    {
      version: 1,
      generatedAt: new Date().toISOString(),
      surface: "desktop-host",
      checks,
    },
    null,
    2,
  )}\n`,
);
console.log(`ui-invariants: PASS; ${checks.length} behavioral checks.`);
