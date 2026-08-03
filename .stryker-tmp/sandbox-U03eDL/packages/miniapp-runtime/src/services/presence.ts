// @ts-nocheck
export interface PresenceSnapshot {
  readonly onlineInterfaces: number;
  readonly preferredInterface: string | null;
  readonly peers: number;
}

export interface PresenceBackend {
  snapshot(): Promise<PresenceSnapshot>;
}

export class PresenceService {
  constructor(private readonly backend: PresenceBackend) {}

  async snapshot(): Promise<PresenceSnapshot> {
    return this.backend.snapshot();
  }
}
