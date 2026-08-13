import { existsSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const driveManagers: FakeDriveManager[] = [];
const swarms: FakeSwarm[] = [];

class FakeDriveManager {
  static archives = new Map<string, Uint8Array>();
  /** Failed `fetchVersion` calls to serve before the archive becomes available. */
  static failuresBeforeHit = 0;

  attempts = 0;
  closed = false;
  opened: Array<{ keyHex: string; serve: boolean | undefined }> = [];

  constructor(
    readonly options: { storagePath: string; swarm?: { destroy(): unknown } },
  ) {
    driveManagers.push(this);
  }

  ready(): Promise<void> {
    return Promise.resolve();
  }

  openDrive(
    keyHex: string,
    options: { serve?: boolean } = {},
  ): Promise<unknown> {
    this.opened.push({ keyHex, serve: options.serve });
    return Promise.resolve({});
  }

  fetchVersion(version: string): Promise<Uint8Array> {
    this.attempts += 1;
    const archive = FakeDriveManager.archives.get(version);
    if (
      archive === undefined ||
      this.attempts <= FakeDriveManager.failuresBeforeHit
    ) {
      return Promise.reject(new Error(`Version not found: ${version}`));
    }
    return Promise.resolve(archive);
  }

  close(): Promise<void> {
    this.closed = true;
    return Promise.resolve();
  }
}

class FakeSwarm {
  destroyed = false;
  constructor(readonly options: Record<string, unknown>) {
    swarms.push(this);
  }

  destroy(): Promise<void> {
    this.destroyed = true;
    return Promise.resolve();
  }
}

vi.mock("../src/core/drive.js", () => ({ DriveManager: FakeDriveManager }));
vi.mock("../src/core/swarm.js", () => ({
  createSwarm: (options: Record<string, unknown>) => new FakeSwarm(options),
  driveTopic: (key: Uint8Array) => key.slice(0, 32),
}));

const { createGatewayHyperswarmDriveFetcher, fetchDriveVersionViaHyperswarm } =
  await import("../src/server/gateway-hyperswarm-drive-fetch.js");

const DRIVE_KEY_HEX = "ef".repeat(32);

beforeEach(() => {
  driveManagers.length = 0;
  swarms.length = 0;
  FakeDriveManager.archives = new Map();
  FakeDriveManager.failuresBeforeHit = 0;
});

describe("fetchDriveVersionViaHyperswarm", () => {
  it("opens the drive as a leech and returns the archive", async () => {
    FakeDriveManager.archives.set("1.0.0", new Uint8Array([1, 2]));

    const bytes = await fetchDriveVersionViaHyperswarm({
      driveKeyHex: DRIVE_KEY_HEX,
      version: "1.0.0",
    });

    expect(bytes).toEqual(new Uint8Array([1, 2]));
    expect(driveManagers[0]?.opened).toEqual([
      { keyHex: DRIVE_KEY_HEX, serve: false },
    ]);
    expect(swarms[0]?.options).toEqual({});
  });

  it("retries until the version appears on the drive", async () => {
    FakeDriveManager.archives.set("1.0.0", new Uint8Array([3]));
    FakeDriveManager.failuresBeforeHit = 2;

    const bytes = await fetchDriveVersionViaHyperswarm({
      driveKeyHex: DRIVE_KEY_HEX,
      version: "1.0.0",
      timeoutMs: 5_000,
    });

    expect(bytes).toEqual(new Uint8Array([3]));
    expect(driveManagers[0]?.attempts).toBe(3);
  });

  it("passes the bandwidth limiters through to the swarm", async () => {
    FakeDriveManager.archives.set("1.0.0", new Uint8Array([1]));
    const inboundBandwidthLimiter = { consume: async () => {} };
    const outboundBandwidthLimiter = { consume: async () => {} };

    await fetchDriveVersionViaHyperswarm({
      driveKeyHex: DRIVE_KEY_HEX,
      version: "1.0.0",
      inboundBandwidthLimiter,
      outboundBandwidthLimiter,
    });

    expect(swarms[0]?.options).toEqual({
      inboundBandwidthLimiter,
      outboundBandwidthLimiter,
    });
  });

  it("times out, tears down, and removes the temporary store", async () => {
    await expect(
      fetchDriveVersionViaHyperswarm({
        driveKeyHex: DRIVE_KEY_HEX,
        version: "9.9.9",
        timeoutMs: 300,
      }),
    ).rejects.toThrow("hyperdrive fetch timed out for 9.9.9");

    const storagePath = driveManagers[0]?.options.storagePath;
    expect(driveManagers[0]?.closed).toBe(true);
    expect(swarms[0]?.destroyed).toBe(true);
    expect(storagePath === undefined ? true : existsSync(storagePath)).toBe(
      false,
    );
  });
});

describe("createGatewayHyperswarmDriveFetcher", () => {
  it("forwards the drive key and version to the swarm fetch", async () => {
    FakeDriveManager.archives.set("2.0.0", new Uint8Array([7]));

    const bytes = await createGatewayHyperswarmDriveFetcher({
      timeoutMs: 5_000,
    }).fetchDriveVersion(DRIVE_KEY_HEX, "2.0.0");

    expect(bytes).toEqual(new Uint8Array([7]));
    expect(driveManagers[0]?.opened[0]?.keyHex).toBe(DRIVE_KEY_HEX);
  });
});
