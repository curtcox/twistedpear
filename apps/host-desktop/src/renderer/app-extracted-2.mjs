export function renderTrustListImpl(__scope, entries) {
  if (!__scope.trustList) {
    return;
  }
  __scope.trustList.replaceChildren(
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
        __scope.host?.send({
          type: "trust-remove",
          publisherPublicKey: entry.publisherPublicKey,
        });
      });
      item.append(label, key, remove);
      return item;
    }),
  );
  if (entries.length === 0) {
    const empty = document.createElement("li");
    empty.className = "muted";
    empty.textContent = "No trusted publishers yet";
    __scope.trustList.replaceChildren(empty);
  }
}

export function renderOwnIdentityImpl(__scope, identity256t) {
  if (!__scope.trustIdentityView) {
    return;
  }
  __scope.trustIdentityView.replaceChildren();
  if (!identity256t) {
    __scope.trustIdentityView.textContent =
      "No host identity yet — start the node first.";
    return;
  }
  const qrFactory = globalThis.qrcode;
  if (typeof qrFactory === "function") {
    try {
      const qr = qrFactory(0, "M");
      qr.addData(identity256t);
      qr.make();
      const svgHost = document.createElement("div");
      svgHost.innerHTML = qr.createSvgTag({
        cellSize: 4,
        margin: 8,
        scalable: true,
      });
      const svg = svgHost.firstElementChild;
      if (svg !== null) {
        svg.setAttribute("width", "192");
        svg.setAttribute("height", "192");
        svg.classList.add("widget-qr-svg");
        __scope.trustIdentityView.appendChild(svg);
      }
    } catch {
      // string fallback below
    }
  }
  const text = document.createElement("p");
  text.className = "widget-qr-value";
  text.textContent = identity256t;
  __scope.trustIdentityView.appendChild(text);
}

export function renderLimitsImpl(__scope, limits) {
  if (__scope.limitsApp) {
    __scope.limitsApp.textContent = `Limits for ${limits.appId}`;
  }
  if (__scope.limitRate) {
    __scope.limitRate.value = String(limits.maxMessagesPerSecond);
  }
  if (__scope.limitKv) {
    __scope.limitKv.value =
      limits.kvQuotaBytes === null ? "" : String(limits.kvQuotaBytes);
  }
  if (__scope.limitMemory) {
    __scope.limitMemory.value =
      limits.memoryBytes === null ? "" : String(limits.memoryBytes);
  }
  if (__scope.limitsNote) {
    __scope.limitsNote.textContent = limits.memoryPendingRestart
      ? "Memory limit change takes effect at next launch."
      : "";
  }
}

export function appendLogImpl(__scope, line) {
  __scope.logEl.textContent = `${__scope.logEl.textContent}${line}\n`.slice(
    -8000,
  );
  __scope.logEl.scrollTop = __scope.logEl.scrollHeight;
}

export function formatBytesImpl(__scope, bytes) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KiB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MiB`;
}

export function renderStatusImpl(__scope, status) {
  if (!__scope.statusGrid || !status) {
    return;
  }
  if (__scope.settingRelayMode && status.relayMode)
    __scope.settingRelayMode.value = status.relayMode;
  for (const [element, kind] of [
    [__scope.settingTcpDirection, "tcp"],
    [__scope.settingAutoDirection, "auto"],
    [__scope.settingRnodeDirection, "rnode"],
  ]) {
    const direction = status.relayDirections?.[kind];
    if (element && direction) element.value = direction;
  }
  if (__scope.relayInterfaceTable && Array.isArray(status.relayInterfaces)) {
    __scope.relayInterfaceTable.replaceChildren(
      ...status.relayInterfaces.map((entry) => {
        const row = document.createElement("p");
        row.textContent = `${entry.kind}: ${entry.supported ? (entry.enabled ? (entry.online ? "online" : "offline") : "disabled") : "unsupported"} · ${entry.direction.toUpperCase()} · ${entry.bitrate ?? "—"} bps · ↓${__scope.formatBytes(entry.bytesIn)} ↑${__scope.formatBytes(entry.bytesOut)}`;
        return row;
      }),
    );
  }
  const rows = [
    ["Running", String(status.running)],
    ["Identity", status.identityHash ?? "—"],
    ["Transport", String(status.transportEnabled ?? false)],
    ["TCP", String(status.tcpEnabled)],
    ["Auto", String(status.autoEnabled)],
    ["RNode", String(status.rnodeEnabled)],
    ["Freenet", String(status.freenetEnabled ?? false)],
    ["Freenet configured", String(status.freenetConfigured ?? false)],
    ["Freenet URL", status.freenetUrl ?? "—"],
    ["Freenet HDLC", String(status.freenetInterfaceEnabled ?? false)],
    ["Freenet HDLC online", String(status.freenetInterfaceOnline ?? false)],
    ["Propagation", String(status.propagationEnabled ?? false)],
    ["Link online", String(status.linkOnline)],
    ["Auto peers", String(status.autoPeers)],
    ["Online interfaces", String(status.onlineInterfaces)],
    ["Path table", String(status.pathTableCount ?? 0)],
    ["Active links", String(status.activeLinkCount ?? 0)],
    ["Bandwidth in", __scope.formatBytes(status.bandwidthBytesIn ?? 0)],
    ["Bandwidth out", __scope.formatBytes(status.bandwidthBytesOut ?? 0)],
    ["Preferred", status.preferredInterface ?? "—"],
    ["Announces", String(status.announcesSeen)],
    [
      "Propagation store",
      __scope.formatBytes(status.propagationStoreBytes ?? 0),
    ],
    ["Propagation msgs", String(status.propagationMessageCount ?? 0)],
    ["Catalog", String(status.catalogEntries)],
    ["Installed", String(status.installedPackages)],
    ["Storage used", __scope.formatBytes(status.storageUsedBytes ?? 0)],
    ["Developer mode", String(status.developerMode ?? false)],
    ["Mini-app running", String(status.miniappRunning ?? false)],
  ];
  __scope.statusGrid.replaceChildren(
    ...rows.flatMap(([label, value]) => {
      const dt = document.createElement("dt");
      dt.textContent = label;
      const dd = document.createElement("dd");
      dd.textContent = value;
      return [dt, dd];
    }),
  );
}

export function renderCatalogImpl(__scope) {
  if (!__scope.catalogList) {
    return;
  }
  __scope.catalogList.replaceChildren(
    ...__scope.catalogEntries.map((entry) => {
      const item = document.createElement("li");
      item.className = "item-row";
      item.innerHTML = `<strong>${entry.name}</strong> v${entry.version} <span class="muted">${__scope.formatBytes(entry.packageSize)}</span>`;
      const install = document.createElement("button");
      install.textContent = "Install";
      install.addEventListener("click", () => {
        __scope.host?.send({ type: "install-app", appId: entry.appId });
        __scope.appendLog(`Installing ${entry.name}…`);
      });
      item.appendChild(install);
      return item;
    }),
  );
  if (__scope.catalogEntries.length === 0) {
    const empty = document.createElement("li");
    empty.className = "muted";
    empty.textContent = "No catalog entries yet";
    __scope.catalogList.replaceChildren(empty);
  }
}

export function renderInstalledImpl(__scope) {
  if (!__scope.installedList) {
    return;
  }
  __scope.installedList.replaceChildren(
    ...__scope.installedPackages.map((pkg) => {
      const item = document.createElement("li");
      item.className = "item-row";
      item.innerHTML = `<strong>${pkg.appId}</strong> v${pkg.version}`;
      const launch = document.createElement("button");
      launch.textContent = "Launch";
      launch.addEventListener("click", () => {
        __scope.selectedAppId = pkg.appId;
        __scope.host?.send({ type: "launch-miniapp", appId: pkg.appId });
        if (pkg.publisherPublicKey && pkg.capabilities) {
          __scope.host?.send({
            type: "get-grants",
            appId: pkg.appId,
            publisherPublicKey: pkg.publisherPublicKey,
            declaredCapabilities: pkg.capabilities,
          });
        }
      });
      const grants = document.createElement("button");
      grants.textContent = "Grants";
      grants.addEventListener("click", () => {
        __scope.selectedAppId = pkg.appId;
        if (pkg.publisherPublicKey && pkg.capabilities) {
          __scope.host?.send({
            type: "get-grants",
            appId: pkg.appId,
            publisherPublicKey: pkg.publisherPublicKey,
            declaredCapabilities: pkg.capabilities,
          });
        }
      });
      item.append(launch, grants);
      if (pkg.rollbackAvailable) {
        const rollback = document.createElement("button");
        rollback.textContent = "Rollback";
        rollback.addEventListener("click", () => {
          __scope.host?.send({ type: "rollback-package", appId: pkg.appId });
        });
        item.appendChild(rollback);
      }
      return item;
    }),
  );
  if (__scope.installedPackages.length === 0) {
    const empty = document.createElement("li");
    empty.className = "muted";
    empty.textContent = "No installed packages";
    __scope.installedList.replaceChildren(empty);
  }
}

export function renderGrantsImpl(__scope, appId, capabilities) {
  if (!__scope.grantsPanel) {
    return;
  }
  __scope.grantsPanel.replaceChildren();
  const heading = document.createElement("p");
  const pkg = __scope.installedPackages.find((entry) => entry.appId === appId);
  heading.textContent = appId
    ? `Capabilities for ${appId}`
    : "Select an installed app";
  __scope.grantsPanel.appendChild(heading);
  if (pkg?.publisherPublicKey) {
    const publisher = document.createElement("p");
    publisher.className = "fingerprint";
    publisher.textContent = `Publisher key: ${pkg.publisherPublicKey}`;
    __scope.grantsPanel.appendChild(publisher);
  }
  for (const capability of capabilities) {
    const label = document.createElement("label");
    label.className = "grant-row";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = capability.granted;
    input.disabled = !capability.declared;
    input.addEventListener("change", () => {
      const grantedCapabilities = [
        ...__scope.grantsPanel.querySelectorAll(".grant-row input"),
      ]
        .filter((checkbox) => checkbox.checked)
        .map((checkbox) => checkbox.dataset.capabilityId)
        .filter((id) => typeof id === "string");
      if (pkg?.publisherPublicKey && pkg.capabilities) {
        __scope.host?.send({
          type: "set-grants",
          appId,
          publisherPublicKey: pkg.publisherPublicKey,
          declaredCapabilities: pkg.capabilities,
          grantedCapabilities,
        });
      }
    });
    input.dataset.capabilityId = capability.id;
    const text = document.createElement("span");
    text.textContent = capability.description || capability.id;
    label.append(input, text);
    __scope.grantsPanel.appendChild(label);
  }
}

export function applyInterfaceSettingsImpl(__scope) {
  const rnodePort = __scope.settingRnodePort?.value.trim() ?? "";
  __scope.host?.send({
    type: "set-interfaces",
    tcp: __scope.settingTcp?.checked ?? false,
    auto: __scope.settingAuto?.checked ?? false,
    ble: false,
    rnode: rnodePort.length > 0,
    rnodePortPath: rnodePort.length > 0 ? rnodePort : null,
  });
}
