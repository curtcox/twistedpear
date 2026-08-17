/**
 * Opening a channel to an app that is not running must fail before chrome asks.
 * This does not prompt, so it is safe in routine diagnostics.
 */
export async function run(sdk, report) {
  const started = Date.now();
  const open = sdk.apps?.channel?.open;
  if (typeof open !== "function") {
    report({
      status: "unavailable",
      details: "apps.channel.open is not available in this sandbox.",
      timings: { ms: Date.now() - started },
    });
    return;
  }

  let opened = false;
  let failure;
  try {
    await open.call(sdk.apps.channel, { appId: "handbook-no-such-app" });
    opened = true;
  } catch (caught) {
    failure = caught;
  }

  if (opened) {
    report({
      status: "fail",
      details: "Host opened a channel to an app that is not running.",
      timings: { ms: Date.now() - started },
    });
    return;
  }

  const err = failure instanceof Error ? failure : new Error(String(failure));
  const code =
    failure && typeof failure === "object" && "code" in failure
      ? String(failure.code)
      : "";

  if (
    /CAPABILITY_DENIED|has not been granted/i.test(`${code} ${err.message}`)
  ) {
    report({
      status: "not-granted",
      details: err.message,
      timings: { ms: Date.now() - started },
    });
    return;
  }

  if (code === "CHANNEL_PEER_NOT_RUNNING") {
    report({
      status: "pass",
      details: "Missing destination was rejected before confirmation.",
      timings: { ms: Date.now() - started },
    });
    return;
  }

  report({
    status: "fail",
    details: err.message,
    timings: { ms: Date.now() - started },
  });
}
