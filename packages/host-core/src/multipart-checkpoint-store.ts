import { existsSync, readFileSync } from "node:fs";
import { dirname } from "node:path";
import type {
  MultipartCheckpoint,
  MultipartCheckpointStore,
} from "@twistedpear/lxmf-ts";
import { ensureDir } from "./config.js";
import { atomicWritePrivateFile } from "./identity.js";

interface CheckpointFile {
  readonly version: 1;
  readonly transfers: Readonly<Record<string, MultipartCheckpoint>>;
}

export class FileMultipartCheckpointStore implements MultipartCheckpointStore {
  private state: CheckpointFile;

  constructor(private readonly path: string) {
    const loaded: unknown = existsSync(path)
      ? JSON.parse(readFileSync(path, "utf8"))
      : { version: 1, transfers: {} };
    const candidate = loaded as Partial<CheckpointFile> | null;
    if (
      candidate === null ||
      typeof candidate !== "object" ||
      candidate.version !== 1 ||
      typeof candidate.transfers !== "object"
    ) {
      throw new Error("Invalid multipart checkpoint store");
    }
    this.state = candidate as CheckpointFile;
  }

  load(transferId: string): MultipartCheckpoint | null {
    return this.state.transfers[transferId] ?? null;
  }

  save(checkpoint: MultipartCheckpoint): void {
    this.state = {
      ...this.state,
      transfers: {
        ...this.state.transfers,
        [checkpoint.transferId]: checkpoint,
      },
    };
    this.persist();
  }

  delete(transferId: string): void {
    const transfers = { ...this.state.transfers };
    delete transfers[transferId];
    this.state = { ...this.state, transfers };
    this.persist();
  }

  private persist(): void {
    ensureDir(dirname(this.path));
    atomicWritePrivateFile(
      this.path,
      new TextEncoder().encode(`${JSON.stringify(this.state, null, 2)}\n`),
    );
  }
}
