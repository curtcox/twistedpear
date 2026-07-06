export interface ResourceFetchRequest {
  readonly resourceId: string;
  readonly budgetBytes?: number;
}

export interface ResourceFetchProgress {
  readonly resourceId: string;
  readonly bytesReceived: number;
  readonly totalBytes: number | null;
}
