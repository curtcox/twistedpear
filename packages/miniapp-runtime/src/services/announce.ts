export interface AnnounceSubscription {
  readonly namespace: string;
}

export interface AnnounceEvent {
  readonly destination: string;
  readonly appData: Uint8Array;
  readonly receivedAt: number;
}
