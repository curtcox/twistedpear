import { beforeEach, describe, expect, it, vi } from "vitest";
import { bytesToHex } from "@twistedpear/reticulum-ts";

class FakeCorestore {
  static instances: FakeCorestore[] = [];
  ready_ = 0;
  closed = false;

  constructor(readonly storagePath: string) {
    FakeCorestore.instances.push(this);
  }

  ready(): Promise<void> {
    this.ready_ += 1;
    return Promise.resolve();
  }

  close(): Promise<void> {
    this.closed = true;
    return Promise.resolve();
  }
}

class FakeHyperdrive {
  static instances: FakeHyperdrive[] = [];
  static contents = new Map<string, Map<string, Uint8Array>>();
  static nextLocalKey = 1;

  readonly key: Uint8Array;
  readonly files: Map<string, Uint8Array>;
  updates = 0;
  closed = false;

  constructor(
    readonly store: FakeCorestore,
    key?: Uint8Array,
  ) {
    this.key =
      key ?? new Uint8Array(32).fill(FakeHyperdrive.nextLocalKey++ % 256);
    const keyHex = bytesToHex(this.key);
    const existing = FakeHyperdrive.contents.get(keyHex);
    if (existing === undefined) {
      this.files = new Map();
      FakeHyperdrive.contents.set(keyHex, this.files);
    } else {
      this.files = existing;
    }
    FakeHyperdrive.instances.push(this);
  }

  ready(): Promise<void> {
    return Promise.resolve();
  }

  put(path: string, bytes: Uint8Array): Promise<void> {
    this.files.set(path, bytes);
    return Promise.resolve();
  }

  get(path: string): Promise<Uint8Array | null> {
    return Promise.resolve(this.files.get(path) ?? null);
  }

  entry(path: string): Promise<{ key: string } | null> {
    return Promise.resolve(this.files.has(path) ? { key: path } : null);
  }

  update(): Promise<void> {
    this.updates += 1;
    return Promise.resolve();
  }

  close(): Promise<void> {
    this.closed = true;
    return Promise.resolve();
  }
}

vi.mock("corestore", () => ({ default: FakeCorestore }));
vi.mock("hyperdrive", () => ({ default: FakeHyperdrive }));

const { DriveManager } = await import("../src/core/drive.js");

const REMOTE_KEY_HEX = "ab".repeat(32);

function fakeSwarm() {
  return {
    swarm: {} as never,
    join: vi.fn(async () => {}),
    replicate: vi.fn(),
    destroy: vi.fn(async () => {}),
  };
}

function manifestOf(drive: FakeHyperdrive) {
  const raw = drive.files.get("/manifest.json");
  if (raw === undefined) throw new Error("expected a manifest");
  return JSON.parse(new TextDecoder().decode(raw)) as {
    latestVersion: string;
    versions: Record<string, { packageHash: string; archivePath: string }>;
  };
}

beforeEach(() => {
  FakeCorestore.instances = [];
  FakeHyperdrive.instances = [];
  FakeHyperdrive.contents = new Map();
  FakeHyperdrive.nextLocalKey = 1;
});

describe("DriveManager publishing", () => {
  it("creates a drive and reports its key", async () => {
    const manager = new DriveManager({ storagePath: "/tmp/drive" });
    await manager.ready();

    const { drive, keyHex } = await manager.createDrive();

    expect(FakeCorestore.instances[0]?.storagePath).toBe("/tmp/drive");
    expect(keyHex).toBe(bytesToHex(drive.key));
    expect(manager.activeDrive).toBe(drive);
  });

  it("writes the archive and updates the manifest on publish", async () => {
    const swarm = fakeSwarm();
    const manager = new DriveManager({ storagePath: "/tmp/drive", swarm });
    await manager.ready();
    await manager.createDrive();

    const first = await manager.publishVersion(
      "1.0.0",
      new Uint8Array([1, 2, 3]),
      "hash-1",
    );
    await manager.publishVersion("0.9.0", new Uint8Array([4]), "hash-0");

    expect(first).toEqual({
      version: "1.0.0",
      packageHash: "hash-1",
      archivePath: "/packages/1.0.0.tpkg",
    });
    const drive = FakeHyperdrive.instances[0];
    if (drive === undefined) throw new Error("expected a drive");
    expect(manifestOf(drive)).toEqual({
      latestVersion: "0.9.0",
      versions: {
        "1.0.0": {
          packageHash: "hash-1",
          archivePath: "/packages/1.0.0.tpkg",
          size: 3,
        },
        "0.9.0": {
          packageHash: "hash-0",
          archivePath: "/packages/0.9.0.tpkg",
          size: 1,
        },
      },
    });
    expect(swarm.replicate).toHaveBeenCalledTimes(2);
    expect(swarm.join).toHaveBeenCalledWith(drive.key.slice(0, 32), {
      server: true,
      client: true,
    });
  });

  it("lists published versions sorted by version string", async () => {
    const manager = new DriveManager({ storagePath: "/tmp/drive" });
    await manager.ready();
    await manager.createDrive();
    await manager.publishVersion("1.0.0", new Uint8Array([1]), "hash-1");
    await manager.publishVersion("0.2.0", new Uint8Array([2, 2]), "hash-2");

    expect(await manager.listVersions()).toEqual([
      { version: "0.2.0", packageHash: "hash-2", size: 2 },
      { version: "1.0.0", packageHash: "hash-1", size: 1 },
    ]);
  });

  it("refuses to publish, list, or fetch before a drive is opened", async () => {
    const manager = new DriveManager({ storagePath: "/tmp/drive" });

    await expect(
      manager.publishVersion("1.0.0", new Uint8Array(), "hash"),
    ).rejects.toThrow("Drive not initialized");
    await expect(manager.listVersions()).rejects.toThrow(
      "Drive not initialized",
    );
    await expect(manager.fetchVersion("1.0.0")).rejects.toThrow(
      "Drive not initialized",
    );
  });
});

describe("DriveManager reading", () => {
  it("opens a remote drive as a client by default", async () => {
    const swarm = fakeSwarm();
    const manager = new DriveManager({ storagePath: "/tmp/drive", swarm });
    await manager.ready();

    const drive = await manager.openDrive(REMOTE_KEY_HEX);

    expect(bytesToHex(drive.key)).toBe(REMOTE_KEY_HEX);
    expect(swarm.join).toHaveBeenCalledWith(drive.key.slice(0, 32), {
      server: false,
      client: true,
    });
  });

  it("serves the drive when asked to", async () => {
    const swarm = fakeSwarm();
    const manager = new DriveManager({ storagePath: "/tmp/drive", swarm });
    await manager.ready();

    await manager.openDrive(REMOTE_KEY_HEX, { serve: true });

    expect(swarm.join.mock.calls[0]?.[1]).toEqual({
      server: true,
      client: true,
    });
  });

  it("fetches a published archive and rejects unknown versions", async () => {
    const manager = new DriveManager({ storagePath: "/tmp/drive" });
    await manager.ready();
    await manager.createDrive();
    await manager.publishVersion("1.0.0", new Uint8Array([5, 6]), "hash");

    expect(await manager.fetchVersion("1.0.0")).toEqual(new Uint8Array([5, 6]));
    await expect(manager.fetchVersion("2.0.0")).rejects.toThrow(
      "Version not found: 2.0.0",
    );
  });

  it("reports an empty manifest for a drive that has published nothing", async () => {
    const manager = new DriveManager({ storagePath: "/tmp/drive" });
    await manager.ready();
    await manager.openDrive(REMOTE_KEY_HEX);

    expect(await manager.listVersions()).toEqual([]);
  });
});

describe("DriveManager mirroring", () => {
  it("copies the manifest and every archive into a local drive", async () => {
    const source = new DriveManager({ storagePath: "/tmp/source" });
    await source.ready();
    await source.openDrive(REMOTE_KEY_HEX);
    await source.publishVersion("1.0.0", new Uint8Array([1, 1]), "hash-1");

    const mirror = new DriveManager({ storagePath: "/tmp/mirror" });
    await mirror.ready();
    await mirror.mirrorFrom(REMOTE_KEY_HEX);

    expect(await mirror.listVersions()).toEqual([
      { version: "1.0.0", packageHash: "hash-1", size: 2 },
    ]);
    expect(await mirror.fetchVersion("1.0.0")).toEqual(new Uint8Array([1, 1]));
    expect(mirror.activeDrive).not.toBe(source.activeDrive);
  });

  it("times out when the remote manifest never arrives", async () => {
    const manager = new DriveManager({ storagePath: "/tmp/drive" });
    await manager.ready();

    await expect(manager.mirrorFrom(REMOTE_KEY_HEX, 250)).rejects.toThrow(
      "mirrorFrom timeout",
    );
  });
});

describe("DriveManager teardown", () => {
  it("closes the active drive and the store", async () => {
    const manager = new DriveManager({ storagePath: "/tmp/drive" });
    await manager.ready();
    await manager.createDrive();

    await manager.close();

    expect(FakeHyperdrive.instances[0]?.closed).toBe(true);
    expect(FakeCorestore.instances[0]?.closed).toBe(true);
    expect(manager.activeDrive).toBeNull();
  });

  it("closes the store even when no drive was opened", async () => {
    const manager = new DriveManager({ storagePath: "/tmp/drive" });
    await manager.ready();

    await manager.close();

    expect(FakeCorestore.instances[0]?.closed).toBe(true);
  });
});
