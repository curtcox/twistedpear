import { renderWidgetTree } from "./widgets.js";

const statusGrid = document.querySelector("#status-grid");
const logEl = document.querySelector("#log");
const widgetRoot = document.querySelector("#widget-root");

function appendLog(line) {
  logEl.textContent = `${logEl.textContent}${line}\n`.slice(-8000);
  logEl.scrollTop = logEl.scrollHeight;
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
    ["Link online", String(status.linkOnline)],
    ["Auto peers", String(status.autoPeers)],
    ["Announces", String(status.announcesSeen)],
    ["Catalog", String(status.catalogEntries)],
    ["Installed", String(status.installedPackages)]
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

const host = window.twistedPearHost;
if (!host) {
  appendLog("Preload bridge unavailable");
} else {
  void host.getStatus().then(renderStatus);

  host.onWorkletMessage((message) => {
    if (message.type === "status") {
      renderStatus(message.status);
    }

    if (message.type === "log") {
      appendLog(message.line);
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
