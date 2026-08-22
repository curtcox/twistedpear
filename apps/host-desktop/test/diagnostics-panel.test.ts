import { describe, expect, it } from "vitest";
import {
  formatAppError,
  formatDiagnosticsLines,
  formatLifecycleChip,
  renderDiagnosticsPanel,
} from "../src/renderer/diagnostics-panel.mjs";

describe("diagnostics panel", () => {
  it("renders a lifecycle chip beside app-authored error text", () => {
    expect(formatLifecycleChip("running")).toEqual({
      state: "running",
      label: "running",
    });
    const error = formatAppError({
      phase: "ui-event",
      message: "TwistedPear has verified this",
      event: "boom",
    });
    expect(error?.badge).toBe("app-authored");
    expect(error?.text).toContain("ui-event");
    expect(error?.text).toContain("boom");
  });

  it("badges console lines as app-authored and never as chrome assurance", () => {
    const formatted = formatDiagnosticsLines({
      entries: [
        {
          level: "warn",
          message: "TwistedPear has verified this install",
          authored: true,
        },
      ],
      dropped: 3,
    });
    expect(formatted.badge).toBe("app-authored");
    expect(formatted.text.startsWith("[app] warn:")).toBe(true);
    expect(formatted.dropped).toBe(3);
  });

  it("writes chip, error, and log pane onto DOM nodes", () => {
    const elements = {
      lifecycleChip: { textContent: "", dataset: {} },
      appError: { textContent: "", hidden: true, dataset: {} },
      appDiagnostics: { textContent: "", dataset: {} },
    };
    renderDiagnosticsPanel(elements, {
      state: "running",
      lastAppError: { phase: "ui-event", message: "nope", event: "tap" },
      diagnostics: {
        entries: [{ level: "log", message: "hello" }],
        dropped: 0,
      },
    });
    expect(elements.lifecycleChip.textContent).toBe("running");
    expect(elements.appError.hidden).toBe(false);
    expect(elements.appError.dataset.authored).toBe("true");
    expect(elements.appDiagnostics.dataset.authored).toBe("true");
    expect(elements.appDiagnostics.textContent).toContain("[app] log: hello");
  });
});
