export interface StorageBeeDescriptor {
  readonly appId: string;
  readonly namespace: string;
  readonly localOnly: true;
}

export function storageBeeDescriptor(appId: string): StorageBeeDescriptor {
  return {
    appId,
    namespace: `miniapp-bee:${appId}`,
    localOnly: true
  };
}
