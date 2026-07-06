export interface PresenceSnapshot {
  readonly onlineInterfaces: number;
  readonly preferredInterface: string | null;
  readonly peers: number;
}
