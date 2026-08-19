/**
 * Capture authoring-guide images from DevStudio, the CLI, and host chrome.
 */
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { spawn, spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import {
  launchCookbookApp,
  repoRoot,
  rendererHtml,
  startStaticServer,
  waitForTree,
} from "./capture-reader-guide-ui-lib.mjs";

const HELLO_SOURCE = `import { ui } from "@twistedpear/miniapp-sdk";

await ui.render({
  root: {
    id: "root",
    type: "view",
    style: { padding: 16, gap: 12 },
    children: [
      { id: "title", type: "text", props: { value: "Hello from DevStudio" }, style: { fontSize: 20, fontWeight: "bold" } },
      { id: "body", type: "text", props: { value: "This app was built inside a mini-app." } }
    ]
  }
});
`;

const HELLO_DOCUMENTS = { "hello-app/bundle.js": HELLO_SOURCE };

async function paintMiniapp(
  page,
  rendererServer,
  { title, tree, documents, scrollTo },
) {
  await page.goto(rendererServer.url, { waitUntil: "load" });
  await page.evaluate(
    async ({ title, tree, documents, widgetsUrl, scrollTo }) => {
      document.body.classList.add("miniapp-running");
      document.querySelector("header h1").textContent = "TwistedPear Host";
      document.querySelector("#subtitle").textContent =
        "Desktop always-on peer · Documentation identity";
      document.querySelector("#miniapp-title").textContent = title;
      const { renderWidgetTree } = await import(widgetsUrl);
      renderWidgetTree(tree, document.querySelector("#widget-root"), undefined, {
        readDocument: async (documentId) => documents[documentId] ?? "",
      });
      await new Promise((resolve) => setTimeout(resolve, 50));
      if (typeof scrollTo === "string" && scrollTo.length > 0) {
        const match = [...document.querySelectorAll("button, .widget-qr, p")]
          .reverse()
          .find((node) => node.textContent?.includes(scrollTo));
        (match ?? document.querySelector(scrollTo))?.scrollIntoView({
          block: "center",
        });
      }
    },
    {
      title,
      tree,
      documents,
      scrollTo,
      widgetsUrl: `${rendererServer.url}widgets.js`,
    },
  );
}

async function capturePage(browser, rendererServer, file, options) {
  const output = join(repoRoot, file);
  mkdirSync(dirname(output), { recursive: true });
  const page = await browser.newPage({
    viewport: { width: 1280, height: 800 },
  });
  try {
    await paintMiniapp(page, rendererServer, options);
    await page.screenshot({ path: output, fullPage: false });
  } finally {
    await page.close();
  }
  console.log(`reader-guide capture written to ${output}`);
}

export async function captureComposite(browser, scene) {
  const output = join(repoRoot, scene.file);
  mkdirSync(dirname(output), { recursive: true });
  const tiles = scene.tiles.map((tile) => ({
    ...tile,
    src:
      tile.image === undefined
        ? null
        : `data:image/png;base64,${readFileSync(
            tile.image.startsWith("/") ? tile.image : join(repoRoot, tile.image),
          ).toString("base64")}`,
  }));
  const page = await browser.newPage({
    viewport: { width: 1280, height: 800 },
  });
  try {
    await page.setContent(`<!doctype html><meta charset="utf-8"><style>
      *{box-sizing:border-box}body{margin:0;background:#09111a;color:#eef5ff;font:14px ui-monospace,monospace;padding:24px}
      h1{margin:0 0 8px;font-size:28px;font-family:system-ui}.subtitle{color:#9fb0c3;margin-bottom:18px;font-family:system-ui}
      .grid{display:grid;grid-template-columns:repeat(${scene.columns},1fr);gap:14px;height:690px}
      .tile{min-width:0;overflow:hidden;border:1px solid #33475a;border-radius:14px;background:#101b26;display:flex;flex-direction:column}
      .tile img{width:100%;height:calc(100% - 38px);object-fit:cover;object-position:left top}
      .label{height:38px;padding:10px 12px;color:#cfe2f5;font-weight:700;background:#142333;font-family:system-ui}
      .fixture{padding:22px;white-space:pre-wrap;line-height:1.45;color:#d7e6f5;height:100%;overflow:hidden}
    </style><h1>${scene.title}</h1><div class="subtitle">${scene.subtitle}</div><div class="grid">
      ${tiles
        .map(
          (tile) =>
            `<section class="tile">${tile.src === null ? `<pre class="fixture">${tile.html}</pre>` : `<img alt="" src="${tile.src}">`}<div class="label">${tile.label}</div></section>`,
        )
        .join("")}
    </div>`);
    await page.screenshot({ path: output, fullPage: false });
  } finally {
    await page.close();
  }
  console.log(`reader-guide composite written to ${output}`);
}

export async function captureTerminal(browser, file, command, outputText) {
  const output = join(repoRoot, file);
  mkdirSync(dirname(output), { recursive: true });
  const page = await browser.newPage({
    viewport: { width: 1280, height: 800 },
  });
  try {
    await page.setContent(`<!doctype html><meta charset="utf-8"><style>
      *{box-sizing:border-box}body{margin:0;background:#0d1117;color:#e6edf3;font:15px ui-monospace,SFMono-Regular,Menlo,monospace}
      main{padding:36px 48px} .prompt{color:#7ee787} .cmd{color:#e6edf3} pre{white-space:pre-wrap;line-height:1.5;max-width:100ch}
    </style><main><pre><span class="prompt">$</span> <span class="cmd">${command}</span>
${outputText.replaceAll("<", "&lt;")}
<span class="prompt">$</span></pre></main>`);
    await page.screenshot({ path: output, fullPage: false });
  } finally {
    await page.close();
  }
  console.log(`reader-guide capture written to ${output}`);
}

function runTp(args, cwd, extraEnv = {}) {
  const bin = join(repoRoot, "packages/cli/dist/bin/tp.js");
  const result = spawnSync(process.execPath, [bin, ...args], {
    cwd,
    encoding: "utf8",
    env: {
      ...process.env,
      TP_IDENTITY_PASSPHRASE: "documentation-passphrase",
      ...extraEnv,
    },
  });
  if (result.status !== 0) {
    throw new Error(
      `tp ${args.join(" ")} failed: ${result.stderr || result.stdout}`,
    );
  }
  return (result.stdout ?? "").trim();
}

async function captureCliShots(browser) {
  const scratch = mkdtempSync(join(tmpdir(), "tp-authors-cli-"));
  try {
    const initOut = runTp(["init"], scratch);
    await captureTerminal(browser, "authors/images/03-tp-init.png", "tp init", initOut);
    runTp(["create", "hello", "my-app"], scratch);
    const ready = await new Promise((resolve, reject) => {
      const child = spawn(
        process.execPath,
        [join(repoRoot, "packages/cli/dist/bin/tp.js"), "dev", "my-app"],
        {
          cwd: scratch,
          env: {
            ...process.env,
            TP_IDENTITY_PASSPHRASE: "documentation-passphrase",
          },
        },
      );
      let combined = "";
      const timer = setTimeout(() => {
        child.kill("SIGTERM");
        reject(new Error(`tp dev produced no ready line: ${combined}`));
      }, 20_000);
      const onData = (chunk) => {
        combined += String(chunk);
        if (combined.includes("Dev side-load ready")) {
          clearTimeout(timer);
          child.stdout?.off("data", onData);
          child.stderr?.off("data", onData);
          const lines = combined
            .split("\n")
            .map((line) => line.trimEnd())
            .filter((line) => line.length > 0)
            .slice(0, 3)
            .join("\n");
          child.kill("SIGTERM");
          resolve(lines);
        }
      };
      child.stdout?.on("data", onData);
      child.stderr?.on("data", onData);
      child.on("error", reject);
    });
    await captureComposite(browser, {
      file: "authors/images/03-dev-sideload.png",
      title: "Developer side-load",
      subtitle: "tp dev beside a host running the unsigned app",
      columns: 2,
      tiles: [
        {
          label: "tp dev",
          html: `$ tp dev my-app\n${ready.replaceAll("<", "&lt;")}`,
        },
        {
          label: "Host · DEV badge",
          image: "cookbook/images/01-dev-install.png",
        },
      ],
    });
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

async function captureDevStudio(browser, captureSection) {
  if (captureSection !== "all" && captureSection !== "authors") return;
  const rendererServer = await startStaticServer(dirname(rendererHtml));
  const host = await launchCookbookApp(
    "devstudio",
    async () => {},
    async () => {},
    { appDir: join(repoRoot, "apps/devstudio"), launchTimeoutMs: 20_000 },
  );
  try {
    await host.handleUiEvent("new-project", "ds.newproject");
    const created = await waitForTree(host, "Created project", 15_000);
    await capturePage(browser, rendererServer, "authors/images/02-new-project.png", {
      title: "DevStudio",
      tree: created,
      documents: HELLO_DOCUMENTS,
    });

    await host.handleUiEvent(
      "ai-prompt",
      "ds.aiprompt",
      "add a reset button that sets taps back to zero",
    );
    await host.handleUiEvent("ai-run", "ds.airun");
    const proposal = await waitForTree(host, "AI proposal", 20_000);
    await capturePage(browser, rendererServer, "authors/images/02-ai-edit.png", {
      title: "DevStudio",
      tree: proposal,
      documents: HELLO_DOCUMENTS,
      scrollTo: "Apply AI edit",
    });

    await host.handleUiEvent("package", "ds.package");
    const packaged = await waitForTree(host, "Packaged", 15_000);
    await capturePage(browser, rendererServer, "authors/images/02-package-256t.png", {
      title: "DevStudio",
      tree: packaged,
      documents: HELLO_DOCUMENTS,
      scrollTo: "Publish to other users",
    });

    await host.handleUiEvent("publish", "ds.publish");
    const published = await waitForTree(host, "Published", 15_000);
    await capturePage(browser, rendererServer, "authors/images/09-publish-result.png", {
      title: "DevStudio",
      tree: published,
      documents: HELLO_DOCUMENTS,
      scrollTo: "Published v",
    });

    const previewTree = {
      root: {
        id: "root",
        type: "view",
        style: { padding: 16, gap: 12 },
        children: [
          {
            id: "title",
            type: "text",
            props: { value: "Hello from DevStudio" },
            style: { fontSize: 20, fontWeight: "bold" },
          },
          {
            id: "body",
            type: "text",
            props: { value: "This app was built inside a mini-app." },
          },
        ],
      },
    };
    const studioShot = join(tmpdir(), "tp-devstudio-editor.png");
    const previewShot = join(tmpdir(), "tp-devstudio-preview.png");
    const page = await browser.newPage({
      viewport: { width: 1280, height: 800 },
    });
    try {
      await paintMiniapp(page, rendererServer, {
        title: "DevStudio",
        tree: created,
        documents: HELLO_DOCUMENTS,
      });
      await page.screenshot({ path: studioShot, fullPage: false });
      await paintMiniapp(page, rendererServer, {
        title: "Preview · hello-app",
        tree: previewTree,
        documents: {},
      });
      await page.screenshot({ path: previewShot, fullPage: false });
    } finally {
      await page.close();
    }
    await captureComposite(browser, {
      file: "authors/images/00-hero-devstudio.png",
      title: "DevStudio",
      subtitle: "Editor on the left, live preview on the right",
      columns: 2,
      tiles: [
        { label: "Editor", image: studioShot },
        { label: "Live preview", image: previewShot },
      ],
    });
  } finally {
    await host.stop();
    await rendererServer.close();
  }
}

export async function runAuthorCaptures(browser, captureSection) {
  if (captureSection !== "all" && captureSection !== "authors") return;
  await captureDevStudio(browser, captureSection);
  await captureCliShots(browser);
}
