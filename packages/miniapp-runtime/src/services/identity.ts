export interface AppScopedIdentity {
  readonly appId: string;
  readonly destinationHash: string;
  sign(payload: Uint8Array): Promise<Uint8Array>;
  verify(payload: Uint8Array, signature: Uint8Array): Promise<boolean>;
}

export interface IdentityBackend {
  deriveDestinationHash(appId: string, publisherPublicKey: string): Promise<string>;
  sign(appId: string, publisherPublicKey: string, payload: Uint8Array): Promise<Uint8Array>;
  verify?(appId: string, publisherPublicKey: string, payload: Uint8Array, signature: Uint8Array): Promise<boolean>;
}

export class AppIdentityService {
  constructor(private readonly backend: IdentityBackend) {}

  async destinationHash(appId: string, publisherPublicKey: string): Promise<string> {
    return this.backend.deriveDestinationHash(appId, publisherPublicKey);
  }

  async sign(appId: string, publisherPublicKey: string, payload: Uint8Array): Promise<Uint8Array> {
    return this.backend.sign(appId, publisherPublicKey, payload);
  }

  async verify(
    appId: string,
    publisherPublicKey: string,
    payload: Uint8Array,
    signature: Uint8Array
  ): Promise<boolean> {
    if (this.backend.verify === undefined) {
      return false;
    }

    return this.backend.verify(appId, publisherPublicKey, payload, signature);
  }
}
