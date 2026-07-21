import { renderWidgetTree } from "./widgets.js";

const statusGrid = document.querySelector("#status-grid");
const catalogList = document.querySelector("#catalog-list");
const installedList = document.querySelector("#installed-list");
const grantsPanel = document.querySelector("#grants-panel");
const logEl = document.querySelector("#log");
const widgetRoot = document.querySelector("#widget-root");
const miniappTitle = document.querySelector("#miniapp-title");
const closeMiniapp = document.querySelector("#close-miniapp");
const previewRoot = document.querySelector("#preview-root");
const stopPreview = document.querySelector("#stop-preview");
const install256tInput = document.querySelector("#install-256t-input");
const install256t = document.querySelector("#install-256t");

const modalOverlay = document.querySelector("#host-modal-overlay");
const modalEl = document.querySelector("#host-modal");
const limitsApp = document.querySelector("#limits-app");
const limitRate = document.querySelector("#limit-rate");
const limitKv = document.querySelector("#limit-kv");
const limitMemory = document.querySelector("#limit-memory");
const limitsNote = document.querySelector("#limits-note");
const limitsApply = document.querySelector("#limits-apply");
const forceQuit = document.querySelector("#force-quit");

const trustList = document.querySelector("#trust-list");
const trustIdentityInput = document.querySelector("#trust-identity-input");
const trustLabelInput = document.querySelector("#trust-label-input");
const trustAdd = document.querySelector("#trust-add");
const trustShow = document.querySelector("#trust-show");
const trustIdentityView = document.querySelector("#trust-identity-view");

const settingDeveloper = document.querySelector("#setting-developer");
const settingAiUrl = document.querySelector("#setting-ai-url");
const settingAiKey = document.querySelector("#setting-ai-key");
const settingAiModel = document.querySelector("#setting-ai-model");
const settingPropagation = document.querySelector("#setting-propagation");
const settingTcp = document.querySelector("#setting-tcp");
const settingAuto = document.querySelector("#setting-auto");
const settingRnodePort = document.querySelector("#setting-rnode-port");
const identityCurrent = document.querySelector("#identity-current");
const identityNext = document.querySelector("#identity-next");
const identityConfirm = document.querySelector("#identity-confirm");
const identityWordsFirst = document.querySelector("#identity-words-first");
const identityWordsSecond = document.querySelector("#identity-words-second");
const identityResult = document.querySelector("#identity-result");

/** @type {import("@twistedpear/host-core/protocol").CatalogEntryView[]} */
let catalogEntries = [];
/** @type {import("@twistedpear/host-core/protocol").InstalledPackageView[]} */
let installedPackages = [];
/** @type {string | null} */
let selectedAppId = null;
/** @type {string | null} */
let runningAppId = null;
/** @type {Map<string, {resolve: (content: string) => void, reject: (error: Error) => void}>} */
const pendingWorkspaceReads = new Map();
let workspaceReadCounter = 0;
const requestedAppId = new URLSearchParams(window.location.search).get("app");
let requestedAppLaunchStarted = false;
let requestedAppLaunchTimer = null;

function resetRequestedAppLaunch() {
  if (requestedAppLaunchTimer !== null) {
    clearTimeout(requestedAppLaunchTimer);
    requestedAppLaunchTimer = null;
  }
  requestedAppLaunchStarted = false;
}

function scheduleRequestedAppLaunch(pkg) {
  requestedAppLaunchStarted = true;
  requestedAppLaunchTimer = setTimeout(() => {
    requestedAppLaunchTimer = null;
    selectedAppId = pkg.appId;
    host.send({ type: "launch-miniapp", appId: pkg.appId });
    if (pkg.publisherPublicKey && pkg.capabilities) {
      host.send({
        type: "get-grants",
        appId: pkg.appId,
        publisherPublicKey: pkg.publisherPublicKey,
        declaredCapabilities: pkg.capabilities
      });
    }
  }, 250);
}

function readWorkspaceDocument(documentId) {
  return new Promise((resolve, reject) => {
    const token = `ws-${workspaceReadCounter++}`;
    const timer = setTimeout(() => {
      pendingWorkspaceReads.delete(token);
      reject(new Error("Workspace read timed out"));
    }, 10_000);
    pendingWorkspaceReads.set(token, {
      resolve: (content) => {
        clearTimeout(timer);
        resolve(content);
      },
      reject: (error) => {
        clearTimeout(timer);
        reject(error);
      }
    });
    host?.send({ type: "workspace-read", token, documentId });
  });
}

function closeHostModal() {
  if (modalOverlay) {
    modalOverlay.hidden = true;
  }
  modalEl?.replaceChildren();
}

/**
 * Host-chrome modal. Lives outside #widget-root so a mini-app widget tree can
 * never draw or dismiss it; identity fields come from the worklet message.
 */
function showHostModal({ title, fingerprint, rows = [], capabilities = null, confirmLabel, onDone }) {
  if (!modalOverlay || !modalEl) {
    onDone(false, null);
    return;
  }

  modalEl.replaceChildren();
  const heading = document.createElement("h3");
  heading.textContent = title;
  modalEl.appendChild(heading);

  if (fingerprint) {
    const fp = document.createElement("p");
    fp.className = "fingerprint";
    fp.textContent = `Publisher key: ${fingerprint}`;
    modalEl.appendChild(fp);
  }

  for (const [label, value] of rows) {
    const row = document.createElement("p");
    row.innerHTML = `<span class="muted">${label}:</span> `;
    row.appendChild(document.createTextNode(String(value)));
    modalEl.appendChild(row);
  }

  /** @type {HTMLInputElement[]} */
  const capabilityInputs = [];
  if (capabilities !== null) {
    for (const capability of capabilities) {
      const label = document.createElement("label");
      label.className = "grant-row";
      const input = document.createElement("input");
      input.type = "checkbox";
      input.checked = capability.granted;
      input.dataset.capabilityId = capability.id;
      capabilityInputs.push(input);
      const text = document.createElement("span");
      text.textContent = `${capability.id} — ${capability.description || ""}`;
      label.append(input, text);
      modalEl.appendChild(label);
    }
  }

  const actions = document.createElement("div");
  actions.className = "modal-actions";
  const cancel = document.createElement("button");
  cancel.textContent = "Cancel";
  cancel.addEventListener("click", () => {
    closeHostModal();
    onDone(false, null);
  });
  const approve = document.createElement("button");
  approve.className = "primary";
  approve.textContent = confirmLabel;
  const refreshApproveState = () => {
    approve.disabled =
      capabilities !== null &&
      capabilityInputs.length > 0 &&
      capabilityInputs.every((input) => !input.checked);
  };
  for (const input of capabilityInputs) {
    input.addEventListener("change", refreshApproveState);
  }
  approve.addEventListener("click", () => {
    const grants = capabilityInputs
      .filter((input) => input.checked)
      .map((input) => input.dataset.capabilityId)
      .filter((id) => typeof id === "string");
    closeHostModal();
    onDone(true, capabilities === null ? null : grants);
  });
  actions.append(cancel, approve);
  modalEl.appendChild(actions);
  refreshApproveState();
  modalOverlay.hidden = false;
}

function renderTrustList(entries) {
  if (!trustList) {
    return;
  }

  trustList.replaceChildren(
    ...entries.map((entry) => {
      const item = document.createElement("li");
      item.className = "item-row";
      const label = document.createElement("strong");
      label.textContent = entry.label;
      const key = document.createElement("span");
      key.className = "muted";
      key.textContent = `${entry.publisherPublicKey.slice(0, 16)}…`;
      const remove = document.createElement("button");
      remove.textContent = "Remove";
      remove.addEventListener("click", () => {
        host?.send({ type: "trust-remove", publisherPublicKey: entry.publisherPublicKey });
      });
      item.append(label, key, remove);
      return item;
    })
  );

  if (entries.length === 0) {
    const empty = document.createElement("li");
    empty.className = "muted";
    empty.textContent = "No trusted publishers yet";
    trustList.replaceChildren(empty);
  }
}

function renderOwnIdentity(identity256t) {
  if (!trustIdentityView) {
    return;
  }

  trustIdentityView.replaceChildren();
  if (!identity256t) {
    trustIdentityView.textContent = "No host identity yet — start the node first.";
    return;
  }

  const qrFactory = globalThis.qrcode;
  if (typeof qrFactory === "function") {
    try {
      const qr = qrFactory(0, "M");
      qr.addData(identity256t);
      qr.make();
      const svgHost = document.createElement("div");
      svgHost.innerHTML = qr.createSvgTag({ cellSize: 4, margin: 8, scalable: true });
      const svg = svgHost.firstElementChild;
      if (svg !== null) {
        svg.setAttribute("width", "192");
        svg.setAttribute("height", "192");
        svg.classList.add("widget-qr-svg");
        trustIdentityView.appendChild(svg);
      }
    } catch {
      // string fallback below
    }
  }

  const text = document.createElement("p");
  text.className = "widget-qr-value";
  text.textContent = identity256t;
  trustIdentityView.appendChild(text);
}

function renderLimits(limits) {
  if (limitsApp) {
    limitsApp.textContent = `Limits for ${limits.appId}`;
  }
  if (limitRate) {
    limitRate.value = String(limits.maxMessagesPerSecond);
  }
  if (limitKv) {
    limitKv.value = limits.kvQuotaBytes === null ? "" : String(limits.kvQuotaBytes);
  }
  if (limitMemory) {
    limitMemory.value = limits.memoryBytes === null ? "" : String(limits.memoryBytes);
  }
  if (limitsNote) {
    limitsNote.textContent = limits.memoryPendingRestart
      ? "Memory limit change takes effect at next launch."
      : "";
  }
}

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
    ["Transport", String(status.transportEnabled ?? false)],
    ["TCP", String(status.tcpEnabled)],
    ["Auto", String(status.autoEnabled)],
    ["RNode", String(status.rnodeEnabled)],
    ["Propagation", String(status.propagationEnabled ?? false)],
    ["Link online", String(status.linkOnline)],
    ["Auto peers", String(status.autoPeers)],
    ["Online interfaces", String(status.onlineInterfaces)],
    ["Path table", String(status.pathTableCount ?? 0)],
    ["Active links", String(status.activeLinkCount ?? 0)],
    ["Bandwidth in", formatBytes(status.bandwidthBytesIn ?? 0)],
    ["Bandwidth out", formatBytes(status.bandwidthBytesOut ?? 0)],
    ["Preferred", status.preferredInterface ?? "—"],
    ["Announces", String(status.announcesSeen)],
    ["Propagation store", formatBytes(status.propagationStoreBytes ?? 0)],
    ["Propagation msgs", String(status.propagationMessageCount ?? 0)],
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
  settingDeveloper?.addEventListener("change", () => {
    host.send({ type: "set-developer-mode", enabled: settingDeveloper.checked });
  });

  settingPropagation?.addEventListener("change", () => {
    host.send({ type: "set-propagation", enabled: settingPropagation.checked });
  });

  for (const element of [settingTcp, settingAuto, settingRnodePort]) {
    element?.addEventListener("change", applyInterfaceSettings);
  }

  const applyAiSettings = () => {
    const config = {
      baseUrl: settingAiUrl?.value.trim() ?? "",
      apiKey: settingAiKey?.value.trim() ?? "",
      model: settingAiModel?.value.trim() ?? ""
    };
    localStorage.setItem("tp-ai-config", JSON.stringify({ baseUrl: config.baseUrl, model: config.model }));
    host.send({ type: "set-ai-config", config: config.baseUrl && config.apiKey ? config : null });
  };

  try {
    const savedAi = JSON.parse(localStorage.getItem("tp-ai-config") ?? "{}");
    if (settingAiUrl && savedAi.baseUrl) {
      settingAiUrl.value = savedAi.baseUrl;
    }
    if (settingAiModel && savedAi.model) {
      settingAiModel.value = savedAi.model;
    }
  } catch {
    // ignore malformed saved settings
  }

  for (const element of [settingAiUrl, settingAiKey, settingAiModel]) {
    element?.addEventListener("change", applyAiSettings);
  }

  host.onWorkletMessage((message) => {
    if (message.type === "status") {
      renderStatus(message.status);
      if (settingDeveloper) {
        settingDeveloper.checked = Boolean(message.status.developerMode);
      }
      if (settingPropagation) {
        settingPropagation.checked = Boolean(message.status.propagationEnabled);
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
      if (!requestedAppLaunchStarted && requestedAppId !== null) {
        const requestedPackage = installedPackages.find((pkg) => pkg.appId === requestedAppId);
        if (requestedPackage !== undefined) {
          scheduleRequestedAppLaunch(requestedPackage);
        }
      }
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
      if (message.slot === "preview") {
        if (previewRoot) {
          renderWidgetTree(message.runtime?.widgetTree ?? null, previewRoot, (nodeId, event, value) => {
            host.send({ type: "miniapp-ui-event", slot: "preview", nodeId, event, value });
          });
        }
      } else {
        runningAppId = message.runtime.appId;
        if (runningAppId === requestedAppId) {
          requestedAppLaunchTimer = null;
        }
        document.body.classList.toggle("miniapp-running", runningAppId !== null);
        if (miniappTitle) {
          miniappTitle.textContent = runningAppId ?? "Mini-app";
        }
        if (runningAppId !== null) {
          host.send({ type: "get-limits", appId: runningAppId });
        }
        renderWidgetTree(
          message.runtime.widgetTree,
          widgetRoot,
          (nodeId, event, value) => {
            host.send({ type: "miniapp-ui-event", nodeId, event, value });
          },
          { readDocument: readWorkspaceDocument }
        );
      }
    }

    if (message.type === "install-review") {
      showHostModal({
        title: message.trusted
          ? `Install ${message.appId} v${message.version} from trusted publisher "${message.trustedLabel ?? "?"}"?`
          : `Install ${message.appId} v${message.version} from UNTRUSTED publisher?`,
        fingerprint: message.publisherPublicKey,
        rows: [["Capabilities requested", message.capabilities.length]],
        capabilities: message.capabilities,
        confirmLabel: "Install",
        onDone: (accept, grants) => {
          host.send({ type: "install-confirm", token: message.token, accept, grants });
        }
      });
    }

    if (message.type === "install-256t-result") {
      appendLog(
        message.ok
          ? `Installed ${message.appId} v${message.version} (trusted: ${message.trusted})`
          : `256t install failed: ${message.error}`
      );
      if (message.ok) {
        host.send({ type: "list-installed" });
      }
    }

    if (message.type === "workspace-file") {
      const waiter = pendingWorkspaceReads.get(message.token);
      pendingWorkspaceReads.delete(message.token);
      if (waiter) {
        if (message.error) {
          waiter.reject(new Error(message.error));
        } else {
          waiter.resolve(message.content);
        }
      }
    }

    if (message.type === "confirm-request") {
      const kindTitles = {
        package: "Package and sign an app?",
        publish: "Publish an app to other users?",
        install: "Install an app?",
        "trust-import": "Trust a new publisher?"
      };
      showHostModal({
        title: kindTitles[message.kind] ?? `Confirm ${message.kind}?`,
        fingerprint: message.publisherPublicKey,
        rows: [["Requested by", message.appId], ...Object.entries(message.summary ?? {})],
        confirmLabel: "Approve",
        onDone: (approved) => {
          host.send({ type: "confirm-response", token: message.token, approved });
        }
      });
    }

    if (message.type === "launch-review") {
      if (requestedAppId !== null && message.appId === requestedAppId) {
        host.send({
          type: "launch-confirm",
          token: message.token,
          accept: true,
          grants: message.capabilities.map((capability) => capability.id)
        });
        return;
      }

      showHostModal({
        title: `Run ${message.appId} v${message.version}?`,
        fingerprint: message.publisherPublicKey,
        rows: [["Capabilities requested", message.capabilities.length]],
        capabilities: message.capabilities,
        confirmLabel: "Run",
        onDone: (accept, grants) => {
          host.send({ type: "launch-confirm", token: message.token, accept, grants });
        }
      });
    }

    if (message.type === "limits") {
      renderLimits(message.limits);
    }

    if (message.type === "trust") {
      renderTrustList(message.entries);
    }

    if (message.type === "trust-identity") {
      renderOwnIdentity(message.identity256t);
    }

    if (message.type === "identity-locked") {
      if (identityResult) identityResult.textContent = message.creating
        ? "Create a passphrase of at least 12 characters to start."
        : message.legacy ? "Set a passphrase to encrypt and migrate this legacy identity." : "Identity locked.";
    }

    if (message.type === "identity-operation") {
      if (identityResult) identityResult.textContent = message.ok
        ? `${message.operation} complete${message.identityHash ? ` (${message.identityHash.slice(0, 12)})` : ""}`
        : message.error ?? `${message.operation} failed`;
      if (message.ok && message.backupHex) void host.saveIdentityBackup(message.backupHex);
      if (message.ok && message.first && message.second) {
        void host.setIdentityContentProtection(true);
        identityWordsFirst.value = message.first;
        identityWordsSecond.value = message.second;
      }
    }
  });

  host.send({ type: "trust-list" });

  trustAdd?.addEventListener("click", () => {
    const identityString = trustIdentityInput?.value.trim() ?? "";
    if (identityString.length === 0) {
      appendLog("Paste a 94-character identity string first");
      return;
    }

    host.send({
      type: "trust-add",
      identityString,
      label: trustLabelInput?.value.trim() || "Unnamed publisher"
    });
    if (trustIdentityInput) {
      trustIdentityInput.value = "";
    }
  });

  trustShow?.addEventListener("click", () => {
    host.send({ type: "trust-show" });
  });

  document.querySelector("#identity-unlock")?.addEventListener("click", () => {
    host.send({ type: "identity-unlock", passphrase: identityCurrent.value, confirmation: identityConfirm.value });
  });
  document.querySelector("#identity-export")?.addEventListener("click", () => {
    if (identityNext.value !== identityConfirm.value) return appendLog("Backup passphrases do not match");
    host.send({ type: "identity-export", currentPassphrase: identityCurrent.value, backupPassphrase: identityNext.value });
  });
  document.querySelector("#identity-import")?.addEventListener("click", async () => {
    if (identityNext.value !== identityConfirm.value) return appendLog("Vault passphrases do not match");
    const backupHex = await host.openIdentityBackup();
    if (backupHex) host.send({ type: "identity-import", backupHex, backupPassphrase: identityCurrent.value, vaultPassphrase: identityNext.value });
  });
  document.querySelector("#identity-recovery-show")?.addEventListener("click", () => {
    host.send({ type: "identity-recovery-show", currentPassphrase: identityCurrent.value });
  });
  document.querySelector("#identity-recovery-import")?.addEventListener("click", () => {
    if (identityNext.value !== identityConfirm.value) return appendLog("Vault passphrases do not match");
    host.send({ type: "identity-recovery-import", first: identityWordsFirst.value.trim(), second: identityWordsSecond.value.trim(), vaultPassphrase: identityNext.value });
    void host.setIdentityContentProtection(false);
  });
  document.querySelector("#identity-change")?.addEventListener("click", () => {
    if (identityNext.value !== identityConfirm.value) return appendLog("New passphrases do not match");
    host.send({ type: "identity-change-passphrase", currentPassphrase: identityCurrent.value, nextPassphrase: identityNext.value });
  });

  limitsApply?.addEventListener("click", () => {
    const appId = runningAppId ?? selectedAppId;
    if (appId === null) {
      appendLog("No mini-app selected for limits");
      return;
    }

    const limits = {};
    if (limitRate?.value) {
      limits.maxMessagesPerSecond = Number(limitRate.value);
    }
    limits.kvQuotaBytes = limitKv?.value ? Number(limitKv.value) : null;
    limits.memoryBytes = limitMemory?.value ? Number(limitMemory.value) : null;
    host.send({ type: "set-limits", appId, limits });
  });

  forceQuit?.addEventListener("click", () => {
    host.send({ type: "stop-miniapp", reason: "user-forced" });
    appendLog("Force quit requested");
  });

  closeMiniapp?.addEventListener("click", () => {
    host.send({ type: "stop-miniapp", reason: "user-returned-to-host" });
  });

  stopPreview?.addEventListener("click", () => {
    host.send({ type: "stop-preview-miniapp" });
  });

  install256t?.addEventListener("click", () => {
    const t256 = install256tInput?.value.trim() ?? "";
    if (t256.length !== 94) {
      appendLog("Paste a 94-character 256t string first");
      return;
    }

    host.send({ type: "install-from-256t", t256 });
    appendLog("Resolving 256t id…");
  });

  host.onWorkletExit((detail) => {
    if (requestedAppId !== null && runningAppId !== requestedAppId) {
      resetRequestedAppLaunch();
    }
    appendLog(`Worklet exited (code=${detail.code}, signal=${detail.signal ?? "none"})`);
  });

  void host.getStatus().then(renderStatus);
  host.send({ type: "list-catalog" });
  host.send({ type: "list-installed" });
}

renderCatalog();
renderInstalled();
renderGrants(null, []);
