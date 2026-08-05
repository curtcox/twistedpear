/**
 * A fake handle must never reveal peer data. This does not start discovery or
 * trigger a permission prompt, so it is safe in routine diagnostics.
 */
export async function run(sdk, report) {
  const started = Date.now();
  try {
    await sdk.peers.info({ id: "handbook-invalid-peer-handle" });
    report({
      status: "fail",
      details: "Host accepted an unowned peer handle.",
      timings: { ms: Date.now() - started },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const code =
      error && typeof error === "object" && "code" in error
        ? String(error.code)
        : "";
    const notGranted =
      /CAPABILITY_DENIED|has not been granted|Capability/i.test(
        `${code} ${message}`,
      );
    const unavailable = /UNCONFIGURED|not configured/i.test(
      `${code} ${message}`,
    );
    const isolated = /POLICY_DENIED|Unknown peer handle/i.test(
      `${code} ${message}`,
    );
    report({
      status: notGranted
        ? "not-granted"
        : unavailable
          ? "unavailable"
          : isolated
            ? "pass"
            : "fail",
      details: isolated
        ? "Opaque handle ownership check rejected the probe."
        : message,
      timings: { ms: Date.now() - started },
    });
  }
}
