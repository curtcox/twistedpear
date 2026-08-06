/** Attach stdio IPC host-message handling with fast-path replies. */
export function attachHostIpc({
  IPC,
  hostReplyChannel,
  hostMessageHandlers,
  identityMessages,
  pushStatus,
  log,
}) {
  let hostMessageBuffer = "";
  let hostMessageQueue = Promise.resolve();
  const HOST_REPLY_TYPES = new Set([
    "confirm-response",
    "launch-confirm",
    "install-confirm",
    "peer-chrome-response",
    "device-bridge-response",
    "media-codec-response",
    "media-opus-play-response",
  ]);

  async function handleHostMessage(raw) {
    const line = raw.toString().trim();
    if (line.length === 0) return;

    let message;
    try {
      message = JSON.parse(line);
    } catch {
      log(`Ignored host message: ${line}`);
      return;
    }

    const handler = hostMessageHandlers[message.type];
    if (handler !== undefined) {
      await handler(message);
      return;
    }

    if (message.type.startsWith("moderation-")) {
      await identityMessages.handleModerationUpdate(message);
    }
  }

  IPC.on("data", (data) => {
    hostMessageBuffer += data.toString();
    const lines = hostMessageBuffer.split("\n");
    hostMessageBuffer = lines.pop() ?? "";
    for (const line of lines) {
      try {
        const parsed = JSON.parse(line);
        if (parsed && HOST_REPLY_TYPES.has(parsed.type)) {
          if (!hostReplyChannel.resolveReply(parsed)) {
            log(
              `Orphan host reply ${parsed.type} token=${typeof parsed.token === "string" ? parsed.token.slice(0, 12) : "?"}`,
            );
          }
          continue;
        }
      } catch {
        // Fall through to the ordered handler for malformed lines.
      }
      hostMessageQueue = hostMessageQueue
        .then(() => handleHostMessage(line))
        .catch((error) => {
          log(
            `Worklet error: ${error instanceof Error ? error.message : String(error)}`,
          );
          pushStatus();
        });
    }
  });
}
