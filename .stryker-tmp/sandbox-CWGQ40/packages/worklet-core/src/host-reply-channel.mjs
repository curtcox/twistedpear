/**
 * Tokenized request/reply channel over a host IPC `send` function.
 * Used for confirmations, device-bridge, peer chrome, and launch review.
 */
// @ts-nocheck

export function createHostReplyChannel(options) {
  const send = options.send;
  const defaultTimeoutMs = options.defaultTimeoutMs ?? 120_000;
  /** @type {Map<string, (reply: unknown) => void>} */
  const pending = new Map();

  function requestReply(message, timeoutMs = defaultTimeoutMs) {
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        pending.delete(message.token);
        resolve(null);
      }, timeoutMs);
      pending.set(message.token, (reply) => {
        clearTimeout(timer);
        pending.delete(message.token);
        resolve(reply);
      });
      send(message);
    });
  }

  function resolveReply(message) {
    if (typeof message?.token !== "string") {
      return false;
    }
    const waiter = pending.get(message.token);
    if (waiter === undefined) {
      return false;
    }
    waiter(message);
    return true;
  }

  return { requestReply, resolveReply, pending };
}
