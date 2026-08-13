/** Bounded host-owned replay memory. Persist this interface when sessions must survive restart. */
export class PeerReplayCache {
  private readonly sessions = new Map<string, number>();

  constructor(private readonly maxEntries = 4096) {}

  acceptOnce(sessionId: string, expiresAt: number, now: number): boolean {
    for (const [id, expiry] of this.sessions) {
      if (expiry <= now) this.sessions.delete(id);
    }
    if (this.sessions.has(sessionId)) return false;
    if (this.sessions.size >= this.maxEntries) {
      const oldest = this.sessions.keys().next().value as string | undefined;
      if (oldest !== undefined) this.sessions.delete(oldest);
    }
    this.sessions.set(sessionId, expiresAt);
    return true;
  }
}
