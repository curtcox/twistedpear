/**
 * Handbook applet: relay.status() / diagnostics (flag-plane or InterfaceManager).
 * Does not flip relay mode — read-only probe that covers relay:* capability ids.
 */
export async function run(sdk, report) {
  const started = Date.now();
  try {
    if (sdk.relay === undefined || typeof sdk.relay.status !== "function") {
      report({
        status: "unavailable",
        details:
          "relay.status is not available in this sandbox (upgrade host API).",
        timings: { ms: Date.now() - started },
      });
      return;
    }

    const status = await sdk.relay.status();
    if (status === null || typeof status !== "object") {
      report({
        status: "fail",
        details: `Expected a relay status object, got: ${String(status)}`,
        timings: { ms: Date.now() - started },
      });
      return;
    }

    const diagnostics =
      typeof sdk.relay.diagnostics === "function"
        ? await sdk.relay.diagnostics()
        : [];
    const interfaces = Array.isArray(status.interfaces)
      ? status.interfaces
      : [];
    const kinds = interfaces.map((entry) => entry.kind).join(",");

    report({
      status: "pass",
      details: `mode=${status.mode ?? "?"} online=${status.onlineCount ?? 0} interfaces=[${kinds}] diagnostics=${Array.isArray(diagnostics) ? diagnostics.length : 0}`,
      timings: { ms: Date.now() - started },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const code =
      error && typeof error === "object" && "code" in error
        ? String(error.code)
        : "";
    const text = `${code} ${message}`;
    const notGranted =
      /CAPABILITY_DENIED|has not been granted|Capability/i.test(text);
    const unavailable =
      /UNKNOWN_METHOD|RELAY_UNCONFIGURED|not configured|not available|upgrade host|n\/a/i.test(
        text,
      );
    report({
      status: notGranted ? "not-granted" : unavailable ? "unavailable" : "fail",
      details: message,
      timings: { ms: Date.now() - started },
    });
  }
}
