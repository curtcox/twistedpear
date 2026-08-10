/**
 * App-scoped identities, derived from the installation identity.
 *
 * A mini-app never signs with the user's account key and never signs with the
 * raw installation key. It gets its own Reticulum identity, derived from the
 * installation identity plus the app id and the publisher that signed the
 * package. Two consequences are deliberate:
 *
 * - The same app on two of a user's machines is two peers with two addresses,
 *   so an app cannot correlate a user across their machines. This is decision 3
 *   of docs/linked-devices-plan.md.
 * - The same app id signed by a different publisher is a different identity, so
 *   a package cannot inherit an existing app's address by reusing its id.
 *
 * Derivation is the same HKDF discipline used for installation identities in
 * `linked-installation.ts`.
 */
import {
  Identity,
  bytesToHex,
  type CryptoProvider,
} from "@twistedpear/reticulum-ts";

export const APP_SCOPED_IDENTITY_SALT = "TwistedPear app-scoped identity v1";

function hexBytes(hex: string, length: number, name: string): Uint8Array {
  if (!new RegExp(`^[0-9a-f]{${length * 2}}$`, "i").test(hex))
    throw new Error(`Invalid ${name}`);
  return Uint8Array.from({ length }, (_, index) =>
    Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16),
  );
}

/**
 * Unambiguous binding of app id to publisher key.
 *
 * The app id is length-prefixed rather than separator-joined so that no two
 * (appId, publisher) pairs can produce the same info string, whatever bytes an
 * app id contains.
 */
function derivationInfo(
  provider: CryptoProvider,
  appId: string,
  publisherPublicKey: string,
): Uint8Array {
  const appIdBytes = new TextEncoder().encode(appId.normalize("NFKC"));
  if (appIdBytes.length === 0) throw new Error("appId must not be empty");
  if (appIdBytes.length > 0xffff_ffff) throw new Error("appId is too long");
  const publisher = hexBytes(publisherPublicKey, 64, "publisher public key");
  const info = new Uint8Array(4 + appIdBytes.length + publisher.length);
  new DataView(info.buffer).setUint32(0, appIdBytes.length, false);
  info.set(appIdBytes, 4);
  info.set(publisher, 4 + appIdBytes.length);
  return provider.sha256(info);
}

/** Derives the Reticulum identity a single app uses on a single installation. */
export function deriveAppScopedIdentity(
  provider: CryptoProvider,
  installationIdentity: Identity,
  appId: string,
  publisherPublicKey: string,
): Identity {
  const installationPrivateKey = installationIdentity.getPrivateKey();
  try {
    const derived = provider.hkdf({
      hash: "sha256",
      keyMaterial: installationPrivateKey,
      salt: new TextEncoder().encode(APP_SCOPED_IDENTITY_SALT),
      info: derivationInfo(provider, appId, publisherPublicKey),
      length: 64,
    });
    // Do not zero `derived`: Identity.fromBytes keeps the caller's buffer as
    // its signing key, so wiping it leaves an identity whose public key still
    // looks right but whose signatures no longer verify.
    const identity = Identity.fromBytes(provider, derived);
    if (identity === null)
      throw new Error("Could not derive app-scoped identity");
    return identity;
  } finally {
    installationPrivateKey.fill(0);
  }
}

/**
 * Shaped to satisfy `IdentityBackend` in `@twistedpear/miniapp-runtime`, which
 * host-core does not depend on. The wiring site supplies the type.
 */
export interface AppScopedIdentityBackend {
  deriveDestinationHash(
    appId: string,
    publisherPublicKey: string,
  ): Promise<string>;
  sign(
    appId: string,
    publisherPublicKey: string,
    payload: Uint8Array,
  ): Promise<Uint8Array>;
  verify(
    appId: string,
    publisherPublicKey: string,
    payload: Uint8Array,
    signature: Uint8Array,
  ): Promise<boolean>;
}

export interface AppScopedIdentityOptions {
  readonly provider: CryptoProvider;
  /**
   * The identity of *this installation*, not the account or publisher identity.
   * On an unlinked host these are the same key playing different roles; once
   * linked mode exists they diverge, and this must stay the installation one.
   */
  getInstallationIdentity(): Promise<Identity | null>;
}

/**
 * Builds the real backend behind the `identity` capability.
 *
 * `deriveDestinationHash` returns the hex Reticulum identity hash of the
 * app-scoped identity. Registering a live Destination under the app's announce
 * aspects is a separate concern owned by the announce path; this is the identity
 * that path must use.
 */
export function createAppScopedIdentityBackend(
  options: AppScopedIdentityOptions,
): AppScopedIdentityBackend {
  async function identityFor(
    appId: string,
    publisherPublicKey: string,
  ): Promise<Identity> {
    const installation = await options.getInstallationIdentity();
    if (installation === null)
      throw new Error(
        "No installation identity is available; start the node first",
      );
    return deriveAppScopedIdentity(
      options.provider,
      installation,
      appId,
      publisherPublicKey,
    );
  }

  return {
    async deriveDestinationHash(appId, publisherPublicKey) {
      return bytesToHex((await identityFor(appId, publisherPublicKey)).hash);
    },
    async sign(appId, publisherPublicKey, payload) {
      return (await identityFor(appId, publisherPublicKey)).sign(payload);
    },
    async verify(appId, publisherPublicKey, payload, signature) {
      return (await identityFor(appId, publisherPublicKey)).validate(
        signature,
        payload,
      );
    },
  };
}
