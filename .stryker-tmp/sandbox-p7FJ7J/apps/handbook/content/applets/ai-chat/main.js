/**
 * Handbook applet: ai.chatStream against the host-configured endpoint.
 */
// @ts-nocheck

export async function run(sdk, report) {
  const started = Date.now();
  try {
    let content = "";
    let response = null;
    for await (const event of sdk.ai.chatStream({
      messages: [{ role: "user", content: "Reply with the single word: handbook" }]
    })) {
      if (event.type === "delta") content += event.delta;
      if (event.type === "done") response = event.response;
    }
    if (response === null || typeof response !== "object" || response.message === undefined) {
      report({
        status: "fail",
        details: `Expected AI response object, got: ${JSON.stringify(response)}`,
        timings: { ms: Date.now() - started }
      });
      return;
    }

    if (content.length === 0 || response.message?.content !== content) {
      report({
        status: "fail",
        details: "AI response message.content was empty",
        timings: { ms: Date.now() - started }
      });
      return;
    }

    report({
      status: "pass",
      details: `AI replied (${response.model ?? "unknown model"}): ${content.slice(0, 80)}`,
      timings: { ms: Date.now() - started }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const notGranted = /CAPABILITY_DENIED|has not been granted|Capability/i.test(message);
    const unavailable = /not configured|UNCONFIGURED|AI_UNCONFIGURED|unavailable/i.test(message);
    report({
      status: notGranted ? "not-granted" : unavailable ? "unavailable" : "fail",
      details: message,
      timings: { ms: Date.now() - started }
    });
  }
}
