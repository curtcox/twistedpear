import { renderWidgetTree } from "./widgets.js";

const statusGrid = document.querySelector("#status-grid");
const catalogList = document.querySelector("#catalog-list");
const installedList = document.querySelector("#installed-list");
const grantsPanel = document.querySelector("#grants-panel");
const logEl = document.querySelector("#log");
const widgetRoot = document.querySelector("#widget-root");

const settingDeveloper = document.querySelector("#setting-developer");
const settingTcp = document.querySelector("#setting-tcp");
const settingAuto = document.querySelector("#setting-auto");
const settingRnodePort = document.querySelector("#setting-rnode-port");

/** @type {import("@twistedpear/host-core/protocol").CatalogEntryView[]} */
let catalogEntries = [];
/** @type {import("@twistedpear/host-core/protocol").InstalledPackageView[]} */
let installedPackages = [];
/** @type {string | null} */
let selectedAppId = null;

function appendLog(line) {
  logEl.textContent = `${logEl.textContent}${line}\n`.slice(-8000);
  logEl.scrollTop = logEl.scrollHeight;
}

function formatBytes(bytes) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KiB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MiB`;
}

function renderStatus(status) {
  if (!statusGrid || !status) {
    return;
  }

  const rows = [
    ["Running", String(status.running)],
    ["Identity", status.identityHash ?? "—"],
    ["TCP", String(status.tcpEnabled)],
    ["Auto", String(status.autoEnabled)],
    ["RNode", String(status.rnodeEnabled)],
    ["Link online", String(status.linkOnline)],
    ["Auto peers", String(status.autoPeers)],
    ["Online interfaces", String(status.onlineInterfaces)],
    ["Preferred", status.preferredInterface ?? "—"],
    ["Announces", String(status.announcesSeen)],
    ["Catalog", String(status.catalogEntries)],
    ["Installed", String(status.installedPackages)],
    ["Storage used", formatBytes(status.storageUsedBytes ?? 0)],
    ["Developer mode", String(status.developerMode ?? false)],
    ["Mini-app running", String(status.miniappRunning ?? false)]
  ];

  statusGrid.replaceChildren(
    ...rows.flatMap(([label, value]) => {
      const dt = document.createElement("dt");
      dt.textContent = label;
      const dd = document.createElement("dd");
      dd.textContent = value;
      return [dt, dd];
    })
  );
}

function renderCatalog() {
  if (!catalogList) {
    return;
  }

  catalogList.replaceChildren(
    ...catalogEntries.map((entry) => {
      const item = document.createElement("li");
      item.className = "item-row";
      item.innerHTML = `<strong>${entry.name}</strong> v${entry.version} <span class="muted">${formatBytes(entry.packageSize)}</span>`;

      const install = document.createElement("button");
      install.textContent = "Install";
      install.addEventListener("click", () => {
        host?.send({ type: "install-app", appId: entry.appId });
        appendLog(`Installing ${entry.name}…`);
      });
      item.appendChild(install);
      return item;
    })
  );

  if (catalogEntries.length === 0) {
    const empty = document.createElement("li");
    empty.className = "muted";
    empty.textContent = "No catalog entries yet";
    catalogList.replaceChildren(empty);
  }
}

function renderInstalled() {
  if (!installedList) {
    return;
  }

  installedList.replaceChildren(
    ...installedPackages.map((pkg) => {
      const item = document.createElement("li");
      item.className = "item-row";
      item.innerHTML = `<strong>${pkg.appId}</strong> v${pkg.version}`;

      const launch = document.createElement("button");
      launch.textContent = "Launch";
      launch.addEventListener("click", () => {
        selectedAppId = pkg.appId;
        host?.send({ type: "launch-miniapp", appId: pkg.appId });
        if (pkg.publisherPublicKey && pkg.capabilities) {
          host?.send({
            type: "get-grants",
            appId: pkg.appId,
            publisherPublicKey: pkg.publisherPublicKey,
            declaredCapabilities: pkg.capabilities
          });
        }
      });

      const grants = document.createElement("button");
      grants.textContent = "Grants";
      grants.addEventListener("click", () => {
        selectedAppId = pkg.appId;
        if (pkg.publisherPublicKey && pkg.capabilities) {
          host?.send({
            type: "get-grants",
            appId: pkg.appId,
            publisherPublicKey: pkg.publisherPublicKey,
            declaredCapabilities: pkg.capabilities
          });
        }
      });

      item.append(launch, grants);

      if (pkg.rollbackAvailable) {
        const rollback = document.createElement("button");
        rollback.textContent = "Rollback";
        rollback.addEventListener("click", () => {
          host?.send({ type: "rollback-package", appId: pkg.appId });
        });
        item.appendChild(rollback);
      }

      return item;
    })
  );

  if (installedPackages.length === 0) {
    const empty = document.createElement("li");
    empty.className = "muted";
    empty.textContent = "No installed packages";
    installedList.replaceChildren(empty);
  }
}

function renderGrants(appId, capabilities) {
  if (!grantsPanel) {
    return;
  }

  grantsPanel.replaceChildren();
  const heading = document.createElement("p");
  heading.textContent = appId ? `Capabilities for ${appId}` : "Select an installed app";
  grantsPanel.appendChild(heading);

  for (const capability of capabilities) {
    const label = document.createElement("label");
    label.className = "grant-row";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = capability.granted;
    input.disabled = !capability.declared;
    input.addEventListener("change", () => {
      const grantedCapabilities = [...grantsPanel.querySelectorAll(".grant-row input")]
        .filter((checkbox) => checkbox.checked)
        .map((checkbox) => checkbox.dataset.capabilityId)
        .filter((id) => typeof id === "string");
      const pkg = installedPackages.find((entry) => entry.appId === appId);
      if (pkg?.publisherPublicKey && pkg.capabilities) {
        host?.send({
          type: "set-grants",
          appId,
          publisherPublicKey: pkg.publisherPublicKey,
          declaredCapabilities: pkg.capabilities,
          grantedCapabilities
        });
      }
    });
    input.dataset.capabilityId = capability.id;

    const text = document.createElement("span");
    text.textContent = capability.description || capability.id;
    label.append(input, text);
    grantsPanel.appendChild(label);
  }
}

function applyInterfaceSettings() {
  const rnodePort = settingRnodePort?.value.trim() ?? "";
  host?.send({
    type: "set-interfaces",
    tcp: settingTcp?.checked ?? false,
    auto: settingAuto?.checked ?? false,
    ble: false,
    rnode: rnodePort.length > 0,
    rnodePortPath: rnodePort.length > 0 ? rnodePort : null
  });
}

const host = window.twistedPearHost;
if (!host) {
  appendLog("Preload bridge unavailable");
} else {
  void host.getStatus().then(renderStatus);
  host.send({ type: "list-catalog" });
  host.send({ type: "list-installed" });

  settingDeveloper?.addEventListener("change", () => {
    host.send({ type: "set-developer-mode", enabled: settingDeveloper.checked });
  });

  for (const element of [settingTcp, settingAuto, settingRnodePort]) {
    element?.addEventListener("change", applyInterfaceSettings);
  }

  host.onWorkletMessage((message) => {
    if (message.type === "status") {
      renderStatus(message.status);
      if (settingDeveloper) {
        settingDeveloper.checked = Boolean(message.status.developerMode);
      }
    }

    if (message.type === "log") {
      appendLog(message.line);
    }

    if (message.type === "catalog") {
      catalogEntries = message.entries;
      renderCatalog();
    }

    if (message.type === "installed") {
      installedPackages = message.packages;
      renderInstalled();
    }

    if (message.type === "install-progress") {
      appendLog(`Install ${message.progress.appId}: ${message.progress.phase}`);
      if (message.progress.phase === "complete") {
        host.send({ type: "list-installed" });
      }
    }

    if (message.type === "grants") {
      selectedAppId = message.appId;
      renderGrants(message.appId, message.capabilities);
    }

    if (message.type === "miniapp-runtime") {
      renderWidgetTree(message.runtime.widgetTree, widgetRoot, (nodeId, event, value) => {
        host.send({ type: "miniapp-ui-event", nodeId, event, value });
      });
    }
  });

  host.onWorkletExit((detail) => {
    appendLog(`Worklet exited (code=${detail.code}, signal=${detail.signal ?? "none"})`);
  });
}

renderCatalog();
renderInstalled();
renderGrants(null, []);
