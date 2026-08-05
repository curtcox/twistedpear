/**
 * Handbook applet: send an LXMF message to this app (by app id) and read it back.
 * The default host LXMF backend keys inboxes by app id (same as the chat example).
 */
export async function run(sdk, report) {
  const started = Date.now();
  try {
    const me = await sdk.identity.destinationHash();
    const body = `handbook-lxmf-${started}`;
    // Deliver to this Handbook app's inbox (app id === "handbook").
    await sdk.lxmf.send({ to: "handbook", subject: "handbook-probe", body });
    const inbox = await sdk.lxmf.receive();
    if (!Array.isArray(inbox)) {
      report({
        status: "fail",
        details: `Expected inbox array, got: ${typeof inbox}`,
        timings: { ms: Date.now() - started }
      });
      return;
    }

    const hit = inbox.find((message) => message && message.body === body);
    if (hit === undefined) {
      report({
        status: "fail",
        details: `Inbox had ${inbox.length} message(s); self-message not found`,
        timings: { ms: Date.now() - started }
      });
      return;
    }

    report({
      status: "pass",
      details: `Self-message round-trip (destinationHash=${me})`,
      timings: { ms: Date.now() - started }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const notGranted = /CAPABILITY_DENIED|has not been granted|Capability/i.test(message);
    report({
      status: notGranted ? "not-granted" : "fail",
      details: message,
      timings: { ms: Date.now() - started }
    });
  }
}
