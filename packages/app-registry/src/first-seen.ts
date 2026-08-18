/** Observer-owned first-seen times. Not subject to the catalog TTL. */

export interface FirstSeenObservation {
  readonly appId: string;
  readonly publisherPublicKey: string;
  readonly packageHash: string;
}

export function firstSeenKey(observation: FirstSeenObservation): string {
  return `${observation.appId}\0${observation.publisherPublicKey}\0${observation.packageHash}`;
}

export class FirstSeenLedger {
  private readonly observations = new Map<string, number>();

  record(observation: FirstSeenObservation, at: number): number {
    const key = firstSeenKey(observation);
    const existing = this.observations.get(key);
    if (existing !== undefined) return existing;
    this.observations.set(key, at);
    return at;
  }

  get(observation: FirstSeenObservation): number | null {
    return this.observations.get(firstSeenKey(observation)) ?? null;
  }

  ageMs(observation: FirstSeenObservation, at: number): number | null {
    const firstSeenAt = this.get(observation);
    return firstSeenAt === null ? null : Math.max(0, at - firstSeenAt);
  }

  snapshot(): ReadonlyArray<readonly [string, number]> {
    return [...this.observations.entries()];
  }

  restore(entries: ReadonlyArray<readonly [string, number]>): void {
    this.observations.clear();
    for (const [key, firstSeenAt] of entries) {
      this.observations.set(key, firstSeenAt);
    }
  }
}
