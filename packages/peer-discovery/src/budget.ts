import { PeerDiscoveryError } from "./index.js";

export async function *withDiscoveryBudget<T>(
  source: AsyncIterable<T>,
  timeoutMs: number,
  signal: AbortSignal | undefined,
  cancel: () => Promise<void>
): AsyncIterable<T> {
  const iterator = source[Symbol.asyncIterator]();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let abortListener: (() => void) | undefined;
  const budget = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => reject(new PeerDiscoveryError("TIMEOUT", "Peer discovery timed out")), timeoutMs);
    if (signal !== undefined) {
      abortListener = () => reject(new PeerDiscoveryError("CANCELLED", "Peer discovery cancelled"));
      if (signal.aborted) abortListener(); else signal.addEventListener("abort", abortListener, { once: true });
    }
  });
  try {
    while (true) {
      const next = await Promise.race([iterator.next(), budget]);
      if (next.done === true) return;
      yield next.value;
    }
  } catch (error) {
    void iterator.return?.();
    await cancel();
    throw error;
  } finally {
    if (timer !== undefined) clearTimeout(timer);
    if (signal !== undefined && abortListener !== undefined) signal.removeEventListener("abort", abortListener);
  }
}
