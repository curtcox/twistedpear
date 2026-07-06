export interface AppScopedIdentity {
  readonly appId: string;
  readonly destinationHash: string;
  sign(payload: Uint8Array): Promise<Uint8Array>;
  verify(payload: Uint8Array, signature: Uint8Array): Promise<boolean>;
}
