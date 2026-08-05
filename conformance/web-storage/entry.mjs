/**
 * W-S4 browser spike: install example .tpkg into OPFS/IndexedDB CAS, reload, surface quota.
 * Bundled for Playwright; reports status on window.__WEB_STORAGE__.
 */

import { encode256t, verify256t } from "../../packages/cas-256t/dist/index.js";
import { verifyPackage } from "../../packages/app-registry/dist/index.js";
import { PureCryptoProvider } from "../../packages/reticulum-ts/dist/web.js";
import {
  createWebPackageStorage,
  resetWebPackageStorage,
} from "../../packages/host-core/dist/web.js";
import { TINY_TPKG_BASE64 } from "./fixture.mjs";

const DB_NAME = "twistedpear-web-storage-spike";
const HOST_API_VERSION = "0.1.0";

function decodeBase64(value) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function sha512(provider, data) {
  return provider.sha512(data);
}

async function installPhase(archiveBytes) {
  await resetWebPackageStorage({ dbName: DB_NAME });
  const storage = await createWebPackageStorage({ dbName: DB_NAME });
  await storage.requestPersistence();

  const installed = await storage.installArchive(archiveBytes);
  const quota = await storage.getQuotaInfo();
  const archive = await storage.readArchive(installed.appId, installed.version);
  if (archive === null) {
    throw new Error("installed archive missing immediately after install");
  }

  const provider = new PureCryptoProvider();
  verifyPackage(provider, archive, { hostApiVersion: HOST_API_VERSION });
  if (!verify256t(installed.t256, archive, (data) => sha512(provider, data))) {
    throw new Error("CAS id does not match installed archive");
  }

  return {
    installed,
    quota,
    archiveBackend: storage.archiveBackend,
  };
}

async function reloadPhase() {
  const storage = await createWebPackageStorage({ dbName: DB_NAME });
  const records = storage.listInstalled();
  if (records.length !== 1) {
    throw new Error(
      `expected one installed package after reload, got ${records.length}`,
    );
  }

  const record = records[0];
  const archive = await storage.readArchive(record.appId, record.version);
  if (archive === null) {
    throw new Error("installed archive missing after reload");
  }

  const provider = new PureCryptoProvider();
  verifyPackage(provider, archive, { hostApiVersion: HOST_API_VERSION });
  const t256 = encode256t(archive, (data) => sha512(provider, data));
  if (!verify256t(t256, archive, (data) => sha512(provider, data))) {
    throw new Error("CAS id mismatch after reload");
  }

  const quota = await storage.getQuotaInfo();
  if (quota.packageUsedBytes !== archive.length) {
    throw new Error(
      `packageUsedBytes mismatch after reload (${quota.packageUsedBytes} vs ${archive.length})`,
    );
  }

  if (quota.quotaBytes === null || quota.usageBytes === null) {
    throw new Error("browser storage quota was not surfaced");
  }

  return {
    record,
    quota,
    archiveBytes: archive.length,
    archiveBackend: storage.archiveBackend,
    t256,
  };
}

async function main() {
  globalThis.__WEB_STORAGE__ = { status: "running" };

  const params = new URLSearchParams(globalThis.location.search);
  const phase = params.get("phase") ?? "install";

  if (phase === "install") {
    const archiveBytes = decodeBase64(TINY_TPKG_BASE64);
    const firstVisit = await installPhase(archiveBytes);
    globalThis.__WEB_STORAGE__ = {
      status: "installed",
      installed: firstVisit.installed,
      quota: firstVisit.quota,
      archiveBackend: firstVisit.archiveBackend,
    };
    return;
  }

  const reloaded = await reloadPhase();
  globalThis.__WEB_STORAGE__ = {
    status: "done",
    reload: reloaded,
    quota: reloaded.quota,
    archiveBackend: reloaded.archiveBackend,
  };
}

main().catch((error) => {
  globalThis.__WEB_STORAGE__ = {
    status: "error",
    message: error instanceof Error ? error.message : String(error),
  };
});
