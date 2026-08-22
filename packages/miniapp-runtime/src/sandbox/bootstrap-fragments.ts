/**
 * Shared worker-side snippets spliced into the three sandbox bootstraps.
 * `post` is `parentPort.postMessage` or `self.postMessage`.
 */

export function appErrorFragment(post: string): string {
  return `function reportAppError(phase, error, extra) {
  var err = error instanceof Error ? error : new Error(String(error));
  var payload = { type: "app-error", phase: phase, message: err.message || String(error) };
  if (typeof err.stack === "string") payload.stack = err.stack;
  if (extra) {
    if (typeof extra.event === "string") payload.event = extra.event;
    if (typeof extra.nodeId === "string") payload.nodeId = extra.nodeId;
  }
  ${post}(payload);
}
function dispatchUiEvent(message) {
  if (message.type !== "ui-event" || uiEventHandler === null) return;
  void Promise.resolve(uiEventHandler({ nodeId: message.nodeId, event: message.event, value: message.value })).catch(function (error) {
    reportAppError("ui-event", error, { event: message.event, nodeId: message.nodeId });
  });
}
`;
}

export function consoleShimFragment(post: string): string {
  return `function formatLogArg(value) {
  if (typeof value === "string") return value;
  if (value instanceof Error) return value.stack || value.message;
  try { return JSON.stringify(value); } catch (e) { return String(value); }
}
function reportLog(level, args) {
  var message = Array.prototype.map.call(args, formatLogArg).join(" ");
  if (message.length > 4096) message = message.slice(0, 4096);
  ${post}({ type: "app-log", level: level, message: message });
}
globalThis.console = {
  log: function () { reportLog("log", arguments); },
  info: function () { reportLog("info", arguments); },
  warn: function () { reportLog("warn", arguments); },
  error: function () { reportLog("error", arguments); },
  debug: function () { reportLog("debug", arguments); }
};
`;
}

/** Hide host/Node globals the SPEC-SDK appendix forbids. */
export function forbiddenGlobalsFragment(): string {
  return `var sandboxExit = (typeof process !== "undefined" && process && typeof process.exit === "function")
  ? process.exit.bind(process)
  : function () {};
["process", "require", "module", "fetch", "XMLHttpRequest"].forEach(function (name) {
  try {
    Object.defineProperty(globalThis, name, {
      configurable: true,
      enumerable: false,
      writable: true,
      value: undefined,
    });
  } catch (e) {
    try { globalThis[name] = undefined; } catch (e2) {}
  }
});
`;
}

export function pushHandlerFragment(): string {
  return `let lxmfMessageHandler = null;
let announceEventHandler = null;
let channelMessageHandler = null;
function dispatchPush(message) {
  var handler = null;
  var payload = null;
  if (message.type === "lxmf-message") { handler = lxmfMessageHandler; payload = message.message; }
  else if (message.type === "announce-event") { handler = announceEventHandler; payload = message.event; }
  else if (message.type === "channel-message") { handler = channelMessageHandler; payload = message.message; }
  if (handler === null || payload === undefined) return false;
  void Promise.resolve(handler(payload)).catch(function (error) {
    reportAppError("ui-event", error, { event: message.type });
  });
  return true;
}
`;
}
