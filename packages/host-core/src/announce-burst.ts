/**
 * Peer-local announce flood for rate-limit census proofs.
 * Kept out of test-agent.ts so the agent file does not grow further.
 */

export async function announceBurst(
  announce: () => Promise<void>,
  count: number
): Promise<{ readonly sent: number; readonly failed: number }> {
  const n = Math.max(1, Math.min(Math.floor(count), 64));
  const results = await Promise.allSettled(Array.from({ length: n }, () => announce()));
  let sent = 0;
  let failed = 0;
  for (const result of results) {
    if (result.status === "fulfilled") {
      sent += 1;
    } else {
      failed += 1;
    }
  }
  return { sent, failed };
}
