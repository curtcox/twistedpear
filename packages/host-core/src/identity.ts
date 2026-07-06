import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { CryptoProvider, Identity } from "@twistedpear/reticulum-ts";
import { Identity as RnsIdentity, bytesToHex } from "@twistedpear/reticulum-ts";
import { ensureDir } from "./config.js";

export async function loadOrCreateIdentity(
  provider: CryptoProvider,
  identityPath: string
): Promise<Identity> {
  if (existsSync(identityPath)) {
    const bytes = new Uint8Array(readFileSync(identityPath));
    const loaded = RnsIdentity.fromBytes(provider, bytes);
    if (loaded === null) {
      throw new Error(`Invalid identity at ${identityPath}`);
    }

    return loaded;
  }

  const identity = new RnsIdentity(provider);
  await persistIdentity(identityPath, identity);
  return identity;
}

export async function persistIdentity(identityPath: string, identity: Identity): Promise<void> {
  ensureDir(dirname(identityPath));
  writeFileSync(identityPath, identity.getPrivateKey());
}

export function identityHashHex(identity: Identity): string {
  return bytesToHex(identity.hash);
}
