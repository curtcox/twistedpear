import {
  isDiagnosticsLevel,
  type AppErrorPhase,
  type AppErrorReport,
  type DiagnosticsLevel,
} from "../diagnostics.js";

const PHASES: ReadonlySet<string> = new Set([
  "bundle",
  "ui-event",
  "lifecycle",
]);

interface SandboxAppErrorMessage {
  readonly type: "app-error";
  readonly phase?: string;
  readonly message?: unknown;
  readonly stack?: unknown;
  readonly event?: unknown;
  readonly nodeId?: unknown;
}

interface SandboxAppLogMessage {
  readonly type: "app-log";
  readonly level?: unknown;
  readonly message?: unknown;
}

export interface SandboxAppMessageHandlers {
  readonly onAppError?: (report: AppErrorReport) => void;
  readonly onAppLog?: (level: DiagnosticsLevel, message: string) => void;
  setLastError(message: string): void;
  setLastAppError(report: AppErrorReport): void;
  setAlive(alive: boolean): void;
}

function parseAppError(data: SandboxAppErrorMessage): AppErrorReport {
  const phase: AppErrorPhase = PHASES.has(String(data.phase))
    ? (data.phase as AppErrorPhase)
    : "bundle";
  const report: AppErrorReport = {
    phase,
    message:
      typeof data.message === "string" && data.message.length > 0
        ? data.message
        : "app-error",
  };
  if (typeof data.stack === "string" && data.stack.length > 0) {
    Object.assign(report, { stack: data.stack });
  }
  if (typeof data.event === "string" && data.event.length > 0) {
    Object.assign(report, { event: data.event });
  }
  if (typeof data.nodeId === "string" && data.nodeId.length > 0) {
    Object.assign(report, { nodeId: data.nodeId });
  }
  return report;
}

function handleAppErrorMessage(
  data: SandboxAppErrorMessage,
  handlers: SandboxAppMessageHandlers,
): void {
  const report = parseAppError(data);
  handlers.setLastError(report.message);
  handlers.setLastAppError(report);
  handlers.onAppError?.(report);
  if (report.phase === "bundle") {
    handlers.setAlive(false);
  }
}

function handleAppLogMessage(
  data: SandboxAppLogMessage,
  handlers: SandboxAppMessageHandlers,
): void {
  const level = isDiagnosticsLevel(String(data.level))
    ? (data.level as DiagnosticsLevel)
    : "log";
  const message = typeof data.message === "string" ? data.message : "";
  handlers.onAppLog?.(level, message);
}

/**
 * Handle worker→host diagnostics that must not enter `broker.dispatch`.
 * Returns true when the message was consumed.
 */
export function handleSandboxAppMessage(
  data: unknown,
  handlers: SandboxAppMessageHandlers,
): boolean {
  if (data === null || typeof data !== "object" || !("type" in data)) {
    return false;
  }
  const typed = data as { type: string };
  if (typed.type === "app-error") {
    handleAppErrorMessage(data as SandboxAppErrorMessage, handlers);
    return true;
  }
  if (typed.type === "app-log") {
    handleAppLogMessage(data as SandboxAppLogMessage, handlers);
    return true;
  }
  return false;
}

export function sandboxLogHandlers(options: {
  readonly onAppError?: (report: AppErrorReport) => void;
  readonly onAppLog?: (level: DiagnosticsLevel, message: string) => void;
}): Pick<SandboxAppMessageHandlers, "onAppError" | "onAppLog"> {
  return {
    ...(options.onAppError === undefined
      ? {}
      : { onAppError: options.onAppError }),
    ...(options.onAppLog === undefined ? {} : { onAppLog: options.onAppLog }),
  };
}
