export interface ResourceFetchRequest {
  readonly resourceId: string;
  readonly budgetBytes?: number;
}

export interface ResourceFetchProgress {
  readonly resourceId: string;
  readonly bytesReceived: number;
  readonly totalBytes: number | null;
}

export interface ResourceFetchBackend {
  fetch(appId: string, request: ResourceFetchRequest): Promise<Uint8Array>;
}

export class ResourceService {
  constructor(private readonly backend: ResourceFetchBackend) {}

  async fetch(
    appId: string,
    request: ResourceFetchRequest,
  ): Promise<Uint8Array> {
    return this.backend.fetch(appId, request);
  }
}
