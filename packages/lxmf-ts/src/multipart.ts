import type {
  Destination,
  RegisteredDestination,
} from "@twistedpear/reticulum-ts";
import {
  Identity,
  bytesToHex,
  equalBytes,
  hexToBytes,
} from "@twistedpear/reticulum-ts";
import { LXMessageMethod } from "./constants.js";
import type { LXMessage } from "./message.js";
import type { LXMFRouter } from "./router.js";

const MAGIC = new TextEncoder().encode("TPMP");
const HEADER_BYTES = 61;
export const MULTIPART_CHUNK_BYTES = 32;
export const MULTIPART_TITLE_BYTES = 16;
export const DEFAULT_MULTIPART_BUDGET_BYTES = 64 * 1024;
export const MAX_MULTIPART_BYTES = 1_000_000;

export interface MultipartCheckpoint {
  readonly transferId: string;
  readonly sourceHash: string;
  readonly destinationHash: string;
  readonly totalBytes: number;
  readonly chunkCount: number;
  readonly contentHash: string;
  readonly chunks: Readonly<Record<number, string>>;
}

export interface MultipartCheckpointStore {
  load(transferId: string): MultipartCheckpoint | null;
  save(checkpoint: MultipartCheckpoint): void;
  delete(transferId: string): void;
}

export interface MultipartReceiveResult {
  readonly recognized: boolean;
  readonly transferId: string | null;
  readonly receivedChunks: number;
  readonly chunkCount: number;
  readonly complete: boolean;
  readonly content: Uint8Array | null;
}

export class MemoryMultipartCheckpointStore implements MultipartCheckpointStore {
  private readonly checkpoints = new Map<string, MultipartCheckpoint>();
  load(transferId: string): MultipartCheckpoint | null {
    return this.checkpoints.get(transferId) ?? null;
  }
  save(checkpoint: MultipartCheckpoint): void {
    this.checkpoints.set(checkpoint.transferId, structuredClone(checkpoint));
  }
  delete(transferId: string): void {
    this.checkpoints.delete(transferId);
  }
}

interface MultipartFrame {
  readonly transferId: Uint8Array;
  readonly index: number;
  readonly count: number;
  readonly totalBytes: number;
  readonly contentHash: Uint8Array;
  readonly chunk: Uint8Array;
}

function encodeFrame(frame: MultipartFrame): Uint8Array {
  const output = new Uint8Array(HEADER_BYTES + frame.chunk.length);
  output.set(MAGIC);
  output[4] = 1;
  output.set(frame.transferId, 5);
  const view = new DataView(output.buffer);
  view.setUint16(21, frame.index, false);
  view.setUint16(23, frame.count, false);
  view.setUint32(25, frame.totalBytes, false);
  output.set(frame.contentHash, 29);
  output.set(frame.chunk, HEADER_BYTES);
  return output;
}

function decodeFrame(bytes: Uint8Array): MultipartFrame | null {
  if (
    bytes.length < HEADER_BYTES ||
    bytes[4] !== 1 ||
    !equalBytes(bytes.subarray(0, 4), MAGIC)
  )
    return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const index = view.getUint16(21, false);
  const count = view.getUint16(23, false);
  const totalBytes = view.getUint32(25, false);
  if (count === 0 || index >= count || totalBytes > MAX_MULTIPART_BYTES)
    return null;
  return {
    transferId: bytes.slice(5, 21),
    index,
    count,
    totalBytes,
    contentHash: bytes.slice(29, HEADER_BYTES),
    chunk: bytes.slice(HEADER_BYTES),
  };
}

function resolveMultipartSendBudget(budgetBytes?: number): number {
  const requested = budgetBytes ?? DEFAULT_MULTIPART_BUDGET_BYTES;
  if (!Number.isSafeInteger(requested) || requested <= 0) {
    throw new Error("Multipart propagation budget must be a positive integer");
  }
  return Math.min(requested, MAX_MULTIPART_BYTES);
}

function assertMultipartSendTitle(title?: string): void {
  if (new TextEncoder().encode(title ?? "").length > MULTIPART_TITLE_BYTES) {
    throw new Error(
      `Multipart propagation title exceeds ${MULTIPART_TITLE_BYTES} bytes`,
    );
  }
}

function assertMultipartSendContent(
  content: Uint8Array,
  budgetBytes: number,
): void {
  if (content.length === 0 || content.length > budgetBytes) {
    throw new Error(
      `Multipart propagation content exceeds budget (1..${budgetBytes} bytes)`,
    );
  }
}

function resolveMultipartTransferId(
  transferId: Uint8Array | undefined,
  randomBytes: (length: number) => Uint8Array,
): Uint8Array {
  const resolved = transferId?.slice() ?? randomBytes(16);
  if (resolved.length !== 16) {
    throw new Error("Multipart transfer id must be 16 bytes");
  }
  return resolved;
}

async function sendMultipartChunk(options: {
  readonly router: LXMFRouter;
  readonly destination: Destination;
  readonly source: RegisteredDestination;
  readonly title?: string;
  readonly now?: () => number;
  readonly transferId: Uint8Array;
  readonly index: number;
  readonly chunkCount: number;
  readonly totalBytes: number;
  readonly contentHash: Uint8Array;
  readonly chunk: Uint8Array;
}): Promise<void> {
  await options.router.packAndSend({
    destination: options.destination,
    source: options.source,
    title: options.title ?? "",
    content: encodeFrame({
      transferId: options.transferId,
      index: options.index,
      count: options.chunkCount,
      totalBytes: options.totalBytes,
      contentHash: options.contentHash,
      chunk: options.chunk,
    }),
    desiredMethod: LXMessageMethod.PROPAGATED,
    deferStamp: true,
    ...(options.now === undefined ? {} : { now: options.now }),
  });
}

export async function sendMultipartPropagation(options: {
  readonly router: LXMFRouter;
  readonly destination: Destination;
  readonly source: RegisteredDestination;
  readonly content: Uint8Array;
  readonly title?: string;
  readonly budgetBytes?: number;
  readonly transferId?: Uint8Array;
  readonly completedChunks?: ReadonlySet<number>;
  readonly now?: () => number;
}): Promise<{
  transferId: string;
  chunkCount: number;
  sentChunks: ReadonlyArray<number>;
}> {
  const budgetBytes = resolveMultipartSendBudget(options.budgetBytes);
  assertMultipartSendTitle(options.title);
  assertMultipartSendContent(options.content, budgetBytes);
  const transferId = resolveMultipartTransferId(options.transferId, (length) =>
    options.router.provider.randomBytes(length),
  );
  const contentHash = Identity.fullHash(
    options.router.provider,
    options.content,
  );
  const chunkCount = Math.ceil(options.content.length / MULTIPART_CHUNK_BYTES);
  const sentChunks: number[] = [];
  for (let index = 0; index < chunkCount; index += 1) {
    if (options.completedChunks?.has(index) === true) continue;
    await sendMultipartChunk({
      router: options.router,
      destination: options.destination,
      source: options.source,
      ...(options.title !== undefined ? { title: options.title } : {}),
      ...(options.now !== undefined ? { now: options.now } : {}),
      transferId,
      index,
      chunkCount,
      totalBytes: options.content.length,
      contentHash,
      chunk: options.content.subarray(
        index * MULTIPART_CHUNK_BYTES,
        (index + 1) * MULTIPART_CHUNK_BYTES,
      ),
    });
    sentChunks.push(index);
  }
  return { transferId: bytesToHex(transferId), chunkCount, sentChunks };
}

function unrecognizedMultipartResult(): MultipartReceiveResult {
  return {
    recognized: false,
    transferId: null,
    receivedChunks: 0,
    chunkCount: 0,
    complete: false,
    content: null,
  };
}

function expectedMultipartChunkBytes(frame: MultipartFrame): number {
  if (frame.index === frame.count - 1) {
    return frame.totalBytes - frame.index * MULTIPART_CHUNK_BYTES;
  }
  return MULTIPART_CHUNK_BYTES;
}

function assertMultipartIngestGeometry(
  frame: MultipartFrame,
  budgetBytes: number,
): void {
  const expectedCount = Math.ceil(frame.totalBytes / MULTIPART_CHUNK_BYTES);
  if (
    frame.totalBytes === 0 ||
    frame.totalBytes > Math.min(budgetBytes, MAX_MULTIPART_BYTES)
  ) {
    throw new Error("Multipart propagation content exceeds receive budget");
  }
  if (
    frame.count !== expectedCount ||
    frame.chunk.length !== expectedMultipartChunkBytes(frame)
  ) {
    throw new Error("Multipart propagation frame has invalid chunk geometry");
  }
}

function assertMultipartCheckpointCompatible(
  existing: MultipartCheckpoint | null,
  message: LXMessage,
  frame: MultipartFrame,
  contentHash: string,
): void {
  if (existing === null) return;
  if (
    existing.sourceHash !== bytesToHex(message.sourceHash) ||
    existing.destinationHash !== bytesToHex(message.destinationHash) ||
    existing.totalBytes !== frame.totalBytes ||
    existing.chunkCount !== frame.count ||
    existing.contentHash !== contentHash
  ) {
    throw new Error("Multipart transfer metadata changed during resume");
  }
}

function assembleVerifiedMultipartContent(
  provider: LXMFRouter["provider"],
  frame: MultipartFrame,
  chunks: Readonly<Record<number, string>>,
): Uint8Array {
  const content = new Uint8Array(frame.totalBytes);
  let offset = 0;
  for (let index = 0; index < frame.count; index += 1) {
    const encoded = chunks[index];
    if (encoded === undefined) {
      throw new Error("Multipart transfer is missing a chunk");
    }
    const chunk = hexToBytes(encoded);
    content.set(chunk, offset);
    offset += chunk.length;
  }
  if (
    offset !== frame.totalBytes ||
    !equalBytes(Identity.fullHash(provider, content), frame.contentHash)
  ) {
    throw new Error("Multipart transfer failed integrity verification");
  }
  return content;
}

export class MultipartPropagationReceiver {
  constructor(
    private readonly provider: LXMFRouter["provider"],
    private readonly store: MultipartCheckpointStore = new MemoryMultipartCheckpointStore(),
    private readonly budgetBytes = DEFAULT_MULTIPART_BUDGET_BYTES,
  ) {
    if (!Number.isSafeInteger(budgetBytes) || budgetBytes <= 0) {
      throw new Error(
        "Multipart propagation receive budget must be a positive integer",
      );
    }
  }

  ingest(message: LXMessage): MultipartReceiveResult {
    const frame = decodeFrame(message.content);
    if (frame === null) return unrecognizedMultipartResult();
    if (message.signatureValidated !== true) {
      throw new Error("Multipart propagation frame is not authenticated");
    }
    assertMultipartIngestGeometry(frame, this.budgetBytes);
    const transferId = bytesToHex(frame.transferId);
    const contentHash = bytesToHex(frame.contentHash);
    const existing = this.store.load(transferId);
    assertMultipartCheckpointCompatible(existing, message, frame, contentHash);
    const checkpoint: MultipartCheckpoint = existing ?? {
      transferId,
      sourceHash: bytesToHex(message.sourceHash),
      destinationHash: bytesToHex(message.destinationHash),
      totalBytes: frame.totalBytes,
      chunkCount: frame.count,
      contentHash,
      chunks: {},
    };
    const chunks = {
      ...checkpoint.chunks,
      [frame.index]: bytesToHex(frame.chunk),
    };
    const receivedChunks = Object.keys(chunks).length;
    const updated = { ...checkpoint, chunks };
    if (receivedChunks !== frame.count) {
      this.store.save(updated);
      return {
        recognized: true,
        transferId,
        receivedChunks,
        chunkCount: frame.count,
        complete: false,
        content: null,
      };
    }
    const content = assembleVerifiedMultipartContent(
      this.provider,
      frame,
      chunks,
    );
    this.store.delete(transferId);
    return {
      recognized: true,
      transferId,
      receivedChunks,
      chunkCount: frame.count,
      complete: true,
      content,
    };
  }
}
