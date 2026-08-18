/**
 * Capture shipped example apps and Handbook probes into the desktop renderer chrome.
 */
import { mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { HOST_API_VERSION } from "../../packages/miniapp-runtime/dist/index.js";
import {
  dismissGrantIntroIfNeeded,
  tap,
  treeContainsText,
  waitFor,
} from "../handbook/ui-helpers.mjs";
import { tmpdir } from "node:os";
import {
  fakeHash,
  launchCookbookApp,
  repoRoot,
  rendererHtml,
  startStaticServer,
  waitForTree,
} from "./capture-reader-guide-ui-lib.mjs";

async function paintMiniapp(page, rendererServer, { title, tree, assets }) {
  await page.goto(rendererServer.url, { waitUntil: "load" });
  await page.evaluate(
    async ({ title, tree, assets, widgetsUrl }) => {
      document.body.classList.add("miniapp-running");
      document.querySelector("header h1").textContent = "TwistedPear Host";
      document.querySelector("#subtitle").textContent =
        "Desktop always-on peer · Documentation identity";
      document.querySelector("#miniapp-title").textContent = title;
      const { renderWidgetTree } = await import(widgetsUrl);
      renderWidgetTree(
        tree,
        document.querySelector("#widget-root"),
        undefined,
        {
          assets,
        },
      );
    },
    {
      title,
      tree,
      assets,
      widgetsUrl: `${rendererServer.url}widgets.js`,
    },
  );
}

async function captureComposite(browser, scene) {
  const output = join(repoRoot, scene.file);
  mkdirSync(dirname(output), { recursive: true });
  const tiles = scene.tiles.map((tile) => ({
    ...tile,
    src:
      tile.image.startsWith("/") || /^[A-Za-z]:/.test(tile.image)
        ? `data:image/png;base64,${readFileSync(tile.image).toString("base64")}`
        : `data:image/png;base64,${readFileSync(join(repoRoot, tile.image)).toString("base64")}`,
  }));
  const page = await browser.newPage({
    viewport: { width: 1280, height: 800 },
  });
  try {
    await page.setContent(`<!doctype html><meta charset="utf-8"><style>
      *{box-sizing:border-box}body{margin:0;background:#09111a;color:#eef5ff;font:14px system-ui;padding:24px}
      h1{margin:0 0 8px;font-size:28px}.subtitle{color:#9fb0c3;margin-bottom:18px}
      .grid{display:grid;grid-template-columns:repeat(${scene.columns},1fr);gap:14px;height:690px}
      .tile{min-width:0;overflow:hidden;border:1px solid #33475a;border-radius:14px;background:#101b26;display:flex;flex-direction:column}
      .tile img{width:100%;height:calc(100% - 38px);object-fit:cover;object-position:left top}
      .label{height:38px;padding:10px 12px;color:#cfe2f5;font-weight:700;background:#142333}
    </style><h1>${scene.title}</h1><div class="subtitle">${scene.subtitle}</div><div class="grid">
      ${tiles.map((tile) => `<section class="tile"><img alt="" src="${tile.src}"><div class="label">${tile.label}</div></section>`).join("")}
    </div>`);
    await page.screenshot({ path: output, fullPage: false });
  } finally {
    await page.close();
  }
  console.log(`reader-guide composite written to ${output}`);
}

export async function runExampleAppCaptures(browser, captureSection) {
  if (captureSection !== "all" && captureSection !== "guide") return;

  const rendererServer = await startStaticServer(dirname(rendererHtml));
  const scratch = join(tmpdir(), "tp-guide-capture");
  mkdirSync(scratch, { recursive: true });
  const fileDropShot = join(scratch, "file-drop.png");
  const boardShot = join(scratch, "board.png");
  const handbookManifest = JSON.parse(
    readFileSync(join(repoRoot, "apps/handbook/app.manifest.json"), "utf8"),
  );
  const examples = [
    {
      file: join(repoRoot, "guide/images/06-app-running.png"),
      title: "Chat",
      dir: join(repoRoot, "apps/examples/chat"),
      expected: fakeHash,
      configure: async (host) => {
        await host.handleUiEvent("peer-input", "chat.peer", fakeHash);
      },
    },
    {
      file: join(repoRoot, "guide/images/07-chat-send.png"),
      title: "Chat",
      dir: join(repoRoot, "apps/examples/chat"),
      expected: fakeHash,
      configure: async (host) => {
        await host.handleUiEvent("peer-input", "chat.peer", fakeHash);
        await waitForTree(host, fakeHash);
        try {
          await host.handleUiEvent("send", "chat.send");
          await waitForTree(host, "Sent hello");
        } catch {
          // lxmf:send now needs a host-authored egress offer; the compose state is still Chat.
        }
      },
    },
    {
      file: fileDropShot,
      title: "File Drop",
      dir: join(repoRoot, "apps/examples/file-drop"),
      expected: "Fetched",
      configure: async (host) => {
        await host.handleUiEvent("fetch", "resource.fetch");
      },
    },
    {
      file: boardShot,
      title: "Board",
      dir: join(repoRoot, "apps/examples/board"),
      expected: "local post",
      configure: async (host) => {
        await host.handleUiEvent("publish", "board.publish");
        await host.handleUiEvent("publish", "board.publish");
        await host.handleUiEvent("refresh", "board.refresh");
      },
    },
  ];

  try {
    for (const scene of examples) {
      const host = await launchCookbookApp(
        scene.title.toLowerCase().replaceAll(" ", "-"),
        scene.configure,
        async () => {},
        { appDir: scene.dir },
      );
      try {
        const tree = await waitForTree(host, scene.expected);
        const output = scene.file;
        mkdirSync(dirname(output), { recursive: true });
        const page = await browser.newPage({
          viewport: { width: 1280, height: 800 },
        });
        try {
          await paintMiniapp(page, rendererServer, {
            title: scene.title,
            tree,
            assets: {},
          });
          await page.screenshot({ path: output, fullPage: false });
        } finally {
          await page.close();
        }
        console.log(`reader-guide capture written to ${output}`);
      } finally {
        await host.stop();
      }
    }

    const handbookOptions = {
      appDir: join(repoRoot, "apps/handbook"),
      launchTimeoutMs: 30_000,
      hostInfoBackend: {
        info: async () => ({
          platform: "desktop",
          hostVersion: "0.0.0-docs",
          hostApiVersion: HOST_API_VERSION,
          roles: { transport: true, seeder: false, propagation: false },
          interfaceTypes: ["tcp", "auto"],
          quotas: {
            kvQuotaBytes: 1_048_576,
            seedStorageUsedBytes: 0,
            seedStorageQuotaBytes: null,
            memoryBytes: 67_108_864,
          },
          grantedCapabilities: handbookManifest.capabilities,
        }),
      },
    };
    const handbook = await launchCookbookApp(
      "handbook",
      async (host) => {
        await dismissGrantIntroIfNeeded(host, "reader-guide-handbook");
        await tap(host, "ch-difference-matrix", "hb.openchapter");
        await waitFor(async () => {
          const tree = host.snapshot().widgetTree;
          return tree !== null && treeContainsText(tree, "Live difference")
            ? tree
            : null;
        }, 15_000);
        await tap(host, "applet-run-host-info", "hb.runapplet");
        await waitFor(async () => {
          const tree = host.snapshot().widgetTree;
          return tree !== null && treeContainsText(tree, "platform=")
            ? tree
            : null;
        }, 15_000);
      },
      async () => {},
      handbookOptions,
    );
    try {
      const tree = handbook.snapshot().widgetTree;
      const output = join(repoRoot, "guide/images/06-handbook-probe.png");
      mkdirSync(dirname(output), { recursive: true });
      const page = await browser.newPage({
        viewport: { width: 1280, height: 800 },
      });
      try {
        await paintMiniapp(page, rendererServer, {
          title: "Handbook",
          tree,
          assets: {},
        });
        await page.screenshot({ path: output, fullPage: false });
      } finally {
        await page.close();
      }
      console.log(`reader-guide capture written to ${output}`);
    } finally {
      await handbook.stop();
    }

    const diagnosticsHost = await launchCookbookApp(
      "handbook",
      async (host) => {
        await dismissGrantIntroIfNeeded(host, "reader-guide-diagnostics");
        await tap(host, "open-diag", "hb.diagnostics");
        await waitFor(async () => {
          const tree = host.snapshot().widgetTree;
          return tree !== null && treeContainsText(tree, "Run every applet")
            ? tree
            : null;
        }, 15_000);
        await tap(host, "diag-run-all", "hb.runall");
        try {
          await waitFor(async () => {
            const tree = host.snapshot().widgetTree;
            return tree !== null &&
              (treeContainsText(tree, "PASS") ||
                treeContainsText(tree, "UNAVAILABLE") ||
                treeContainsText(tree, "NOT-GRANTED"))
              ? tree
              : null;
          }, 60_000);
        } catch {
          // The diagnostics landing page is still the real host surface.
        }
      },
      async () => {},
      handbookOptions,
    );
    try {
      const diagnostics = diagnosticsHost.snapshot().widgetTree;
      const diagnosticsOutput = join(
        repoRoot,
        "guide/images/10-diagnostics.png",
      );
      mkdirSync(dirname(diagnosticsOutput), { recursive: true });
      const diagnosticsPage = await browser.newPage({
        viewport: { width: 1280, height: 800 },
      });
      try {
        await paintMiniapp(diagnosticsPage, rendererServer, {
          title: "Handbook",
          tree: diagnostics,
          assets: {},
        });
        await diagnosticsPage.screenshot({
          path: diagnosticsOutput,
          fullPage: false,
        });
      } finally {
        await diagnosticsPage.close();
      }
      console.log(`reader-guide capture written to ${diagnosticsOutput}`);
    } finally {
      await diagnosticsHost.stop();
    }
  } finally {
    await rendererServer.close();
  }

  await captureComposite(browser, {
    file: "guide/images/06-example-apps.png",
    title: "The three example apps",
    subtitle: "Chat, File drop, and Board — the apps the host ships",
    columns: 3,
    tiles: [
      { label: "Chat", image: "guide/images/06-app-running.png" },
      { label: "File drop", image: fileDropShot },
      { label: "Board", image: boardShot },
    ],
  });
}
