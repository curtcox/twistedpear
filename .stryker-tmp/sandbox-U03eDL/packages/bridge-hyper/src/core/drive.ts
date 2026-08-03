// @ts-nocheck
import Corestore from "corestore";
import Hyperdrive from "hyperdrive";
import b4a from "b4a";
import { bytesToHex } from "@twistedpear/reticulum-ts";
import type { SwarmSession } from "./swarm.js";
import { driveTopic } from "./swarm.js";

export interface DriveManagerOptions {
  readonly storagePath: string;
  readonly swarm?: SwarmSession;
}

export interface PublishedVersion {
  readonly version: string;
  readonly packageHash: string;
  readonly archivePath: string;
}

const MANIFEST_PATH = "/manifest.json";
const PACKAGE_PATH_PREFIX = "/packages/";

interface DriveManifest {
  readonly latestVersion: string;
  readonly versions: Record<string, { readonly packageHash: string; readonly archivePath: string; readonly size?: number }>;
}

async function readDriveManifest(drive: Hyperdrive): Promise<DriveManifest> {
  const raw = await drive.get(MANIFEST_PATH);
  if (raw === null) {
    return { latestVersion: "", versions: {} };
  }

  return JSON.parse(new TextDecoder().decode(raw)) as DriveManifest;
}

export class DriveManager {
  private readonly store: Corestore;
  private drive: Hyperdrive | null = null;

  constructor(private readonly options: DriveManagerOptions) {
    this.store = new Corestore(options.storagePath);
  }

  async ready(): Promise<void> {
    await this.store.ready();
  }

  async createDrive(): Promise<{ drive: Hyperdrive; keyHex: string }> {
    this.drive = new Hyperdrive(this.store);
    await this.drive.ready();
    return { drive: this.drive, keyHex: bytesToHex(this.drive.key) };
  }

  async openDrive(keyHex: string, options: { readonly serve?: boolean } = {}): Promise<Hyperdrive> {
    this.drive = new Hyperdrive(this.store, b4a.from(keyHex, "hex"));
    await this.drive.ready();
    this.options.swarm?.replicate(this.store);
    await this.options.swarm?.join(driveTopic(this.drive.key), {
      server: options.serve ?? false,
      client: true
    });
    return this.drive;
  }

  get activeDrive(): Hyperdrive | null {
    return this.drive;
  }

  async publishVersion(version: string, archiveBytes: Uint8Array, packageHash: string): Promise<PublishedVersion> {
    if (this.drive === null) {
      throw new Error("Drive not initialized");
    }

    const archivePath = `${PACKAGE_PATH_PREFIX}${version}.tpkg`;
    await this.drive.put(archivePath, archiveBytes);

    const manifest = await readDriveManifest(this.drive);
    const versions = {
      ...manifest.versions,
      [version]: { packageHash, archivePath, size: archiveBytes.length }
    };

    await this.drive.put(
      MANIFEST_PATH,
      new TextEncoder().encode(
        JSON.stringify(
          {
            latestVersion: version,
            versions
          },
          null,
          2
        )
      )
    );

    this.options.swarm?.replicate(this.store);
    await this.options.swarm?.join(driveTopic(this.drive.key), { server: true, client: true });
    await this.drive.update();

    return { version, packageHash, archivePath };
  }

  async listVersions(): Promise<ReadonlyArray<{ version: string; packageHash: string; size: number }>> {
    if (this.drive === null) {
      throw new Error("Drive not initialized");
    }

    const manifest = await readDriveManifest(this.drive);
    return Object.entries(manifest.versions)
      .map(([version, info]) => ({
        version,
        packageHash: info.packageHash,
        size: info.size ?? 0
      }))
      .sort((left, right) => left.version.localeCompare(right.version));
  }

  async fetchVersion(version: string): Promise<Uint8Array> {
    if (this.drive === null) {
      throw new Error("Drive not initialized");
    }

    const archivePath = `${PACKAGE_PATH_PREFIX}${version}.tpkg`;
    const entry = await this.drive.entry(archivePath);
    if (entry === null) {
      throw new Error(`Version not found: ${version}`);
    }

    return this.drive.get(archivePath) as Promise<Uint8Array>;
  }

  async mirrorFrom(keyHex: string, timeoutMs = 30_000): Promise<void> {
    const remote = await this.openDrive(keyHex);
    const mirror = new Hyperdrive(this.store);
    await mirror.ready();

    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      await remote.update();
      const manifestRaw = await remote.get(MANIFEST_PATH);
      if (manifestRaw !== null) {
        const manifest = JSON.parse(new TextDecoder().decode(manifestRaw)) as DriveManifest;
        await mirror.put(MANIFEST_PATH, manifestRaw);

        for (const info of Object.values(manifest.versions)) {
          const content = await remote.get(info.archivePath);
          if (content !== null) {
            await mirror.put(info.archivePath, content);
          }
        }

        await mirror.update();
        this.drive = mirror;
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    throw new Error("mirrorFrom timeout");
  }

  async close(): Promise<void> {
    if (this.drive !== null) {
      await this.drive.close();
      this.drive = null;
    }

    await this.store.close();
  }
}
