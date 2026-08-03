// @ts-nocheck
import { CatalogStore, InstalledPackageStore } from "../../app-registry/dist/index.js";
import { catalogEntryView } from "./worklet-entry-shared-helpers.mjs";

export function createCatalogOps(deps) {
  let catalogStore = null;
  let installedStore = null;

  function ensureCatalog() {
    if (catalogStore === null) {
      catalogStore = new CatalogStore(deps.provider);
    }
    if (installedStore === null) {
      installedStore = new InstalledPackageStore(deps.packageQuotaBytes);
    }
    return { catalogStore, installedStore };
  }

  async function persistCatalogState() {
    const { catalogStore: catalog, installedStore: installed } = ensureCatalog();
    const kv = deps.runtimeKeyValueStore();
    await catalog.save(kv);
    await installed.save(kv);
  }

  async function loadCatalogState() {
    const { catalogStore: catalog, installedStore: installed } = ensureCatalog();
    const kv = deps.runtimeKeyValueStore();
    await catalog.load(kv);
    await installed.load(kv);
  }

  function pushCatalog() {
    const { catalogStore: catalog, installedStore: installed } = ensureCatalog();
    deps.status.catalogEntries = catalog.list().length;
    deps.status.installedPackages = installed.list().length;
    deps.status.storageUsedBytes = installed.usedBytes;
    deps.pushStatus();
    deps.send({ type: "catalog", entries: catalog.list().map(catalogEntryView) });
    deps.send({
      type: "installed",
      packages: [...new Set(installed.list().map((record) => record.appId))].map((appId) => {
        const active = installed.activeVersion(appId);
        const record = active === null ? null : installed.get(appId, active);
        const previous = installed.previousVersion(appId);
        return {
          appId,
          version: record?.version ?? active ?? "",
          activeVersion: active ?? "",
          packageHash: record?.packageHash ?? "",
          installedAt: record?.installedAt ?? 0,
          rollbackAvailable: previous !== null && active !== null && active !== previous,
          capabilities: record?.manifest.capabilities ?? [],
          publisherPublicKey: record?.manifest.publisherPublicKey ?? ""
        };
      })
    });
  }

  return {
    ensureCatalog,
    persistCatalogState,
    loadCatalogState,
    pushCatalog
  };
}
