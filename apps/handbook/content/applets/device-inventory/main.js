/**
 * Handbook applet: device.inventory() / diagnostics for every device:* id.
 * Does not open sessions or request OS permissions — proves the broker path and
 * host inventory. Hardware-gated open/read paths remain separate probes.
 */
export async function run(sdk, report) {
  const started = Date.now();
  try {
    if (
      sdk.device === undefined ||
      typeof sdk.device.inventory !== "function"
    ) {
      report({
        status: "unavailable",
        details:
          "device.inventory is not available in this sandbox (upgrade host API).",
        timings: { ms: Date.now() - started },
      });
      return;
    }

    const inventory = await sdk.device.inventory();
    if (!Array.isArray(inventory) || inventory.length === 0) {
      report({
        status: "fail",
        details: `Expected a non-empty device inventory, got: ${JSON.stringify(inventory)}`,
        timings: { ms: Date.now() - started },
      });
      return;
    }

    const diagnostics =
      typeof sdk.device.diagnostics === "function"
        ? await sdk.device.diagnostics()
        : [];
    const available = inventory.filter(
      (entry) => entry.availability === "available",
    ).length;
    const summary = inventory
      .slice(0, 8)
      .map((entry) => `${entry.class}:${entry.availability}`)
      .join(", ");

    report({
      status: "pass",
      details: `classes=${inventory.length} available=${available} diagnostics=${Array.isArray(diagnostics) ? diagnostics.length : 0} sample=[${summary}]`,
      timings: { ms: Date.now() - started },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const notGranted =
      /CAPABILITY_DENIED|has not been granted|Capability|DEVICE_UNCONFIGURED/i.test(
        message,
      );
    const unavailable =
      /UNKNOWN_METHOD|not available|upgrade host|DEVICE_UNCONFIGURED/i.test(
        message,
      );
    report({
      status: notGranted ? "not-granted" : unavailable ? "unavailable" : "fail",
      details: message,
      timings: { ms: Date.now() - started },
    });
  }
}
