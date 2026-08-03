// @ts-nocheck
import { mkdtempSync, statSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { FileMultipartCheckpointStore } from "../src/multipart-checkpoint-store.js";

describe("FileMultipartCheckpointStore", () => {
  it("persists resumable chunks atomically with private permissions", () => {
    const path = join(mkdtempSync(join(tmpdir(), "tp-multipart-")), "checkpoints.json");
    const store = new FileMultipartCheckpointStore(path);
    const checkpoint = {
      transferId: "01".repeat(16), sourceHash: "02".repeat(16), destinationHash: "03".repeat(16),
      totalBytes: 3, chunkCount: 1, contentHash: "04".repeat(32), chunks: { 0: "010203" }
    };
    store.save(checkpoint);
    expect(new FileMultipartCheckpointStore(path).load(checkpoint.transferId)).toEqual(checkpoint);
    expect(statSync(path).mode & 0o777).toBe(0o600);
    store.delete(checkpoint.transferId);
    expect(new FileMultipartCheckpointStore(path).load(checkpoint.transferId)).toBeNull();
  });
});
