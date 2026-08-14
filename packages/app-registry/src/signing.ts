import type { CryptoProvider, Identity } from "@twistedpear/reticulum-ts";
import {
  Identity as IdentityClass,
  bytesToHex,
} from "@twistedpear/reticulum-ts";
import {
  type AppManifest,
  type UnsignedManifest,
  manifestPublisherKeyBytes,
  manifestSignatureBytes,
  manifestSigningPayload,
  validateManifestStructure,
} from "./manifest.js";

export function signManifest(
  _provider: CryptoProvider,
  identity: Identity,
  manifest: UnsignedManifest,
): AppManifest {
  validateManifestStructure(manifest);

  const publisherKey = identity.getPublicKey();
  const manifestWithKey: UnsignedManifest = {
    ...manifest,
    publisherPublicKey: bytesToHex(publisherKey),
  };

  const payload = manifestSigningPayload(manifestWithKey);
  const signature = identity.sign(payload);

  return {
    ...manifestWithKey,
    signature: bytesToHex(signature),
  };
}

export function verifyManifestSignature(
  provider: CryptoProvider,
  manifest: AppManifest,
): boolean {
  try {
    const { signature: _signature, ...unsigned } = manifest;
    void _signature;
    validateManifestStructure(unsigned);
  } catch {
    return false;
  }

  const { signature: _signature, ...unsigned } = manifest;
  void _signature;
  const payload = manifestSigningPayload(unsigned);
  const signatureBytes = manifestSignatureBytes(manifest);
  const publisherKey = manifestPublisherKeyBytes(unsigned);

  const identity = IdentityClass.fromPublicKey(provider, publisherKey);
  if (identity === null) {
    return false;
  }

  return identity.validate(signatureBytes, payload);
}
