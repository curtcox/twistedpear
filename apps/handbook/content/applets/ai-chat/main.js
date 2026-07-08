/**
 * Handbook applet: ai.chat against the host-configured endpoint.
 */
export async function run(sdk, report) {
  const started = Date.now();
  try {
    const response = await sdk.ai.chat({
      messages: [{ role: "user", content: "Reply with the single word: handbook" }]
    });
    if (response === null || typeof response !== "object" || response.message === undefined) {
      report({
        status: "fail",
        details: `Expected AI response object, got: ${JSON.stringify(response)}`,
        timings: { ms: Date.now() - started }
      });
      return;
    }

    const content = response.message?.content;
    if (typeof content !== "string" || content.length === 0) {
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
