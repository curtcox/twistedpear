/**
 * Desktop host environment adapters: process environment access, the platform
 * data directory, store-posture policy, and crypto provider selection.
 */
import { PureCryptoProvider } from "../../../packages/reticulum-ts/dist/crypto/pure.js";

function envValue(name) {
  const value = globalThis.process?.env?.[name];
  return typeof value === "string" && value.length > 0 ? value : null;
}

function defaultDesktopDataDir() {
  const configured = envValue("TWISTEDPEAR_HOST_DATA_DIR");
  if (configured !== null) return configured;
  const platform = globalThis.process?.platform ?? "";

  if (platform === "win32") {
    return `${envValue("APPDATA") ?? `${envValue("USERPROFILE") ?? "."}\\AppData\\Roaming`}\\TwistedPear\\host`;
  }

  const home = envValue("HOME") ?? ".";
  if (platform === "darwin") {
    return `${home}/Library/Application Support/TwistedPear/host`;
  }

  return `${home}/.local/share/twistedpear/host`;
}

const HOST_DATA_DIR = defaultDesktopDataDir();
const HOST_DATA_SEPARATOR = HOST_DATA_DIR.includes("\\") ? "\\" : "/";

function hostDataPath(...segments) {
  return [HOST_DATA_DIR, ...segments].join(HOST_DATA_SEPARATOR);
}

function refuseStorePosture() {
  return false;
}

function shouldRefuseDeveloperMode() {
  return false;
}

export async function createCryptoProvider(isDesktopHost) {
  if (isDesktopHost) {
    return new PureCryptoProvider();
  }

  try {
    const { BareCryptoProvider } = await import("../../../packages/reticulum-ts/dist/crypto/bare.js");
    const bare = new BareCryptoProvider();
    bare.ed25519PublicFromPrivate(bare.randomBytes(32));
    return bare;
  } catch {
    return new PureCryptoProvider();
  }
}

export { envValue, hostDataPath, refuseStorePosture, shouldRefuseDeveloperMode };
