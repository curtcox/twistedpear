/**
 * Opening a channel to an app that is not running must fail before chrome asks.
 * This does not prompt, so it is safe in routine diagnostics.
 */
export async function run(sdk, report) {
  const started = Date.now();
  try {
    await sdk.apps.channel.open({ appId: "handbook-no-such-app" });
    report({
      status: "fail",
      details: "Host opened a channel to an app that is not running.",
      timings: { ms: Date.now() - started },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const code =
      error && typeof error === "object" && "code" in error
        ? String(error.code)
        : "";
    const combined = `${code} ${message}`;
    const notGranted = /CAPABILITY_DENIED|has not been granted|Capability/i.test(
      combined,
    );
    const isolated = /CHANNEL_PEER_NOT_RUNNING/i.test(combined);
    report({
      status: notGranted ? "not-granted" : isolated ? "pass" : "fail",
      details: isolated
        ? "Missing destination was rejected before confirmation."
        : message,
      timings: { ms: Date.now() - started },
    });
  }
}
