/**
 * Runtime-controls helpers for lifecycle chip, app-error, and the diagnostics
 * pane. App-authored text is always tagged so chrome never presents it as
 * host assurance.
 */

export function formatLifecycleChip(state) {
  const label =
    typeof state === "string" && state.length > 0 ? state : "stopped";
  return { state: label, label };
}

export function formatAppError(error) {
  if (error === null || error === undefined) {
    return null;
  }
  const phase = typeof error.phase === "string" ? error.phase : "bundle";
  const message = typeof error.message === "string" ? error.message : "";
  const event = typeof error.event === "string" ? ` · ${error.event}` : "";
  return {
    badge: "app-authored",
    text: `${phase}${event}: ${message}`,
  };
}

export function formatDiagnosticsLines(snapshot) {
  const entries = Array.isArray(snapshot?.entries) ? snapshot.entries : [];
  const dropped = Number(snapshot?.dropped ?? 0);
  const lines = entries.map((entry) => {
    const level = typeof entry.level === "string" ? entry.level : "log";
    const message = typeof entry.message === "string" ? entry.message : "";
    return `[app] ${level}: ${message}`;
  });
  return {
    badge: "app-authored",
    dropped,
    text: lines.join("\n"),
  };
}

export function formatNotifications(runtime) {
  const items = Array.isArray(runtime?.notifications)
    ? runtime.notifications
    : [];
  const enabled = runtime?.notifyEnabled !== false;
  return {
    badge: "app-authored",
    enabled,
    items: items.map((item) => ({
      id: String(item.id ?? ""),
      appId: String(item.appId ?? ""),
      title: String(item.title ?? ""),
      body: String(item.body ?? ""),
    })),
  };
}

export function renderDiagnosticsPanel(elements, runtime) {
  const chip = formatLifecycleChip(runtime?.state);
  if (elements.lifecycleChip) {
    elements.lifecycleChip.textContent = chip.label;
    elements.lifecycleChip.dataset.state = chip.state;
  }
  const error = formatAppError(runtime?.lastAppError);
  if (elements.appError) {
    if (error === null) {
      elements.appError.hidden = true;
      elements.appError.textContent = "";
      delete elements.appError.dataset.authored;
    } else {
      elements.appError.hidden = false;
      elements.appError.dataset.authored = "true";
      elements.appError.textContent = `App error (${error.badge}): ${error.text}`;
    }
  }
  const logs = formatDiagnosticsLines(runtime?.diagnostics);
  if (elements.appDiagnostics) {
    elements.appDiagnostics.dataset.authored = "true";
    const dropped =
      logs.dropped > 0 ? `\n(${logs.dropped} older lines dropped)` : "";
    elements.appDiagnostics.textContent = logs.text + dropped;
  }
  const notifications = formatNotifications(runtime);
  if (elements.notifyEnabled) {
    elements.notifyEnabled.checked = notifications.enabled;
  }
  if (elements.notifyHistory) {
    elements.notifyHistory.dataset.authored = "true";
    const canDom =
      typeof elements.notifyHistory.appendChild === "function" &&
      typeof globalThis.document?.createElement === "function";
    if (!canDom) {
      elements.notifyHistory.textContent = notifications.items
        .map((item) => `${item.appId}: ${item.title} — ${item.body}`)
        .join("\n");
    } else {
      elements.notifyHistory.replaceChildren();
      for (const item of notifications.items) {
        const row = document.createElement("button");
        row.type = "button";
        row.dataset.authored = "true";
        row.dataset.notifyId = item.id;
        row.textContent = `${item.appId}: ${item.title} — ${item.body}`;
        elements.notifyHistory.appendChild(row);
      }
    }
  }
}

export function bindNotifyPanel(elements, send, runningAppId) {
  elements.notifyEnabled?.addEventListener("change", () => {
    const appId = runningAppId();
    if (appId === null) return;
    send({
      type: "set-notify-enabled",
      appId,
      enabled: elements.notifyEnabled.checked,
    });
  });
  elements.notifyHistory?.addEventListener("click", (event) => {
    const id = event.target?.dataset?.notifyId;
    if (typeof id !== "string" || id.length === 0) return;
    send({ type: "tap-notification", id });
  });
}
