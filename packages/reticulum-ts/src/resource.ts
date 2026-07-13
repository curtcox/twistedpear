import {
  computeResourceTimeout,
  stepResourceWatchdogWithActions,
  type ResourceWatchdogState,
  type ResourceWatchdogStepResult
} from "@twistedpear/protocol";
import type { CryptoProvider } from "./crypto/provider.js";
import { equalBytes } from "./crypto/bytes.js";
import { Identity } from "./identity.js";
import type { Link } from "./link.js";
import type { LeafTransport } from "./transport/node.js";
import {
  msgpackPackBin,
  msgpackPackMap,
  msgpackPackNil,
  msgpackPackUInt,
  msgpackUnpack,
  type MsgpackValue
} from "./msgpack.js";
import {
  Packet,
  PacketContext,
  PacketHeaderType,
  PacketType,
  TransportType
} from "./packet.js";
import { DestinationType } from "./destination.js";

/** Mirrors RNS/Resource.py constants. */
export const ResourceStatus = {
  NONE: 0x00,
  QUEUED: 0x01,
  ADVERTISED: 0x02,
  TRANSFERRING: 0x03,
  AWAITING_PROOF: 0x04,
  ASSEMBLING: 0x05,
  COMPLETE: 0x06,
  FAILED: 0x07,
  CORRUPT: 0x08,
  REJECTED: 0x00
} as const;

export type ResourceStatusValue = (typeof ResourceStatus)[keyof typeof ResourceStatus];

export const RESOURCE_WINDOW = 4;
export const RESOURCE_WINDOW_MIN = 2;
export const RESOURCE_WINDOW_MAX_SLOW = 10;
export const RESOURCE_WINDOW_MAX_FAST = 75;
export const RESOURCE_WINDOW_MAX = RESOURCE_WINDOW_MAX_FAST;
export const RESOURCE_WINDOW_FLEXIBILITY = 4;
export const RESOURCE_MAPHASH_LEN = 4;
export const RESOURCE_RANDOM_HASH_SIZE = 4;
export const RESOURCE_HASHMAP_IS_NOT_EXHAUSTED = 0x00;
export const RESOURCE_HASHMAP_IS_EXHAUSTED = 0xff;
export const RESOURCE_MAX_RETRIES = 16;
export const RESOURCE_MAX_ADV_RETRIES = 4;
export const RESOURCE_PART_TIMEOUT_FACTOR = 4;
export const RESOURCE_SENDER_GRACE_TIME = 10;
export const RESOURCE_PROCESSING_GRACE = 1;

export interface ResourceCallbacks {
  readonly callback?: (resource: Resource) => void;
  readonly progressCallback?: (resource: Resource) => void;
}

export interface ResourceOptions extends ResourceCallbacks {
  readonly advertise?: boolean;
  readonly autoCompress?: boolean;
  readonly timeout?: number;
}

interface ResourcePart {
  readonly data: Uint8Array;
  readonly mapHash: Uint8Array;
  raw: Uint8Array;
  sent: boolean;
}

/** Mirrors RNS/Resource.py ResourceAdvertisement. */
export class ResourceAdvertisement {
  static readonly OVERHEAD = 134;
  static readonly HASHMAP_MAX_LEN = Math.floor((383 - ResourceAdvertisement.OVERHEAD) / RESOURCE_MAPHASH_LEN);

  t = 0;
  d = 0;
  n = 0;
  h = new Uint8Array(0);
  r = new Uint8Array(0);
  o = new Uint8Array(0);
  m = new Uint8Array(0);
  f = 0;
  i = 1;
  l = 1;
  q: Uint8Array | null = null;
  e = false;
  c = false;
  s = false;
  u = false;
  p = false;
  x = false;

  static isRequest(plaintext: Uint8Array): boolean {
    try {
      const adv = ResourceAdvertisement.unpack(plaintext);
      return adv.q !== null && adv.u;
    } catch {
      return false;
    }
  }

  static isResponse(plaintext: Uint8Array): boolean {
    try {
      const adv = ResourceAdvertisement.unpack(plaintext);
      return adv.q !== null && adv.p;
    } catch {
      return false;
    }
  }

  static unpack(data: Uint8Array): ResourceAdvertisement {
    const value = msgpackUnpack(data);
    if (value.type !== "map" || value.map === undefined) {
      throw new Error("Invalid resource advertisement");
    }

    const adv = new ResourceAdvertisement();
    adv.t = readInt(value.map["t"]);
    adv.d = readInt(value.map["d"]);
    adv.n = readInt(value.map["n"]);
    adv.h = Uint8Array.from(readBin(value.map["h"]));
    adv.r = Uint8Array.from(readBin(value.map["r"]));
    adv.o = Uint8Array.from(readBin(value.map["o"]));
    adv.m = Uint8Array.from(readBin(value.map["m"]));
    adv.f = readInt(value.map["f"]);
    adv.i = readInt(value.map["i"]);
    adv.l = readInt(value.map["l"]);
    adv.q = readOptionalBin(value.map["q"]);
    if (adv.q !== null) {
      adv.q = Uint8Array.from(adv.q);
    }
    adv.e = (adv.f & 0x01) === 0x01;
    adv.c = ((adv.f >> 1) & 0x01) === 0x01;
    adv.s = ((adv.f >> 2) & 0x01) === 0x01;
    adv.u = ((adv.f >> 3) & 0x01) === 0x01;
    adv.p = ((adv.f >> 4) & 0x01) === 0x01;
    adv.x = ((adv.f >> 5) & 0x01) === 0x01;
    return adv;
  }

  constructor(resource?: Resource) {
    if (resource === undefined) {
      return;
    }

    this.t = resource.size;
    this.d = resource.totalSize;
    this.n = resource.totalParts;
    this.h = Uint8Array.from(resource.hash);
    this.r = Uint8Array.from(resource.randomHash);
    this.o = Uint8Array.from(resource.originalHash);
    this.m = Uint8Array.from(resource.hashmapBytes);
    this.c = resource.compressed;
    this.e = resource.encrypted;
    this.s = resource.split;
    this.x = resource.hasMetadata;
    this.i = resource.segmentIndex;
    this.l = resource.totalSegments;
    this.q = resource.requestId;
    this.u = resource.requestId !== null && !resource.isResponse;
    this.p = resource.requestId !== null && resource.isResponse;
    this.f = 0x00 | (this.x ? 1 << 5 : 0) | (this.p ? 1 << 4 : 0) | (this.u ? 1 << 3 : 0) | (this.s ? 1 << 2 : 0) | (this.c ? 1 << 1 : 0) | (this.e ? 1 : 0);
  }

  pack(): Uint8Array {
    return msgpackPackMap([
      ["t", msgpackPackUInt(this.t)],
      ["d", msgpackPackUInt(this.d)],
      ["n", msgpackPackUInt(this.n)],
      ["h", msgpackPackBin(this.h)],
      ["r", msgpackPackBin(this.r)],
      ["o", msgpackPackBin(this.o)],
      ["i", msgpackPackUInt(this.i)],
      ["l", msgpackPackUInt(this.l)],
      ["q", this.q === null ? msgpackPackNil() : msgpackPackBin(this.q)],
      ["f", msgpackPackUInt(this.f)],
      ["m", msgpackPackBin(this.m)]
    ]);
  }
}

/** Mirrors RNS/Resource.py bulk transfer over links. */
export class Resource {
  readonly link: Link;
  readonly initiator: boolean;
  readonly hash: Uint8Array;
  readonly originalHash: Uint8Array;
  readonly randomHash: Uint8Array;
  readonly encrypted: boolean;
  readonly compressed: boolean;
  readonly split = false;
  readonly hasMetadata = false;
  readonly segmentIndex = 1;
  readonly totalSegments = 1;
  readonly requestId: Uint8Array | null;
  readonly isResponse: boolean;
  readonly hashmapBytes: Uint8Array;
  readonly expectedProof: Uint8Array;
  readonly totalSize: number;
  readonly sdu: number;

  size = 0;
  totalParts = 0;
  status: ResourceStatusValue = ResourceStatus.NONE;
  data: Uint8Array | null = null;
  progress = 0;
  window = RESOURCE_WINDOW;
  windowMax = RESOURCE_WINDOW_MAX_SLOW;
  windowMin = RESOURCE_WINDOW_MIN;
  windowFlexibility = RESOURCE_WINDOW_FLEXIBILITY;
  eifr: number | null = null;

  private readonly provider: CryptoProvider;
  private readonly parts: ResourcePart[] = [];
  private readonly receivedParts: Array<Uint8Array | null> = [];
  private hashmap: Array<Uint8Array | null> = [];
  private readonly reqHashlist = new Set<string>();
  private readonly callbacks: ResourceCallbacks;
  private readonly timeout: number;
  private retriesLeft = RESOURCE_MAX_RETRIES;
  private advSent = 0;
  private consecutiveCompletedHeight = -1;
  private receivedCount = 0;
  private outstandingParts = 0;
  private waitingForHashmap = false;
  private receiverMinConsecutiveHeight = 0;
  private sentParts = 0;
  private hashmapHeight = 0;
  private assemblyStarted = false;
  private watchdogTimer: ReturnType<LeafTransport["clock"]["setTimeout"]> | null = null;
  startedTransferring: number | null = null;

  private constructor(
    provider: CryptoProvider,
    link: Link,
    options: {
      readonly initiator: boolean;
      readonly hash: Uint8Array;
      readonly originalHash: Uint8Array;
      readonly randomHash: Uint8Array;
      readonly encrypted: boolean;
      readonly compressed: boolean;
      readonly size: number;
      readonly totalSize: number;
      readonly totalParts: number;
      readonly hashmapBytes: Uint8Array;
      readonly expectedProof: Uint8Array;
      readonly parts: ResourcePart[];
      readonly requestId?: Uint8Array | null;
      readonly isResponse?: boolean;
      readonly callbacks?: ResourceCallbacks;
      readonly timeout?: number;
    }
  ) {
    this.provider = provider;
    this.link = link;
    this.initiator = options.initiator;
    this.hash = options.hash;
    this.originalHash = options.originalHash;
    this.randomHash = options.randomHash;
    this.encrypted = options.encrypted;
    this.compressed = options.compressed;
    this.size = options.size;
    this.totalSize = options.totalSize;
    this.totalParts = options.totalParts;
    this.hashmapBytes = options.hashmapBytes;
    this.expectedProof = options.expectedProof;
    this.parts = options.parts;
    this.requestId = options.requestId ?? null;
    this.isResponse = options.isResponse ?? false;
    this.callbacks = options.callbacks ?? {};
    this.sdu = link.mdu;
    this.timeout =
      options.timeout ?? computeResourceTimeout(link.rtt ?? 1, link.trafficTimeoutFactor);
  }

  static send(link: Link, data: Uint8Array, options: ResourceOptions = {}): Resource {
    const provider = link.cryptoProvider;
    const randomHash = Identity.getRandomHash(provider).subarray(0, RESOURCE_RANDOM_HASH_SIZE);
    const payload = concatBytes(randomHash, data);
    const encryptedPayload = link.encrypt(payload);
    const sdu = link.mdu;
    const totalParts = Math.ceil(encryptedPayload.length / sdu);
    const hashInput = concatBytes(data, randomHash);
    const hash = Identity.fullHash(provider, hashInput);
    const expectedProof = Identity.fullHash(provider, concatBytes(data, hash));

    const parts: ResourcePart[] = [];
    let hashmapBytes = new Uint8Array(0);
    let collisionGuard: Uint8Array[] = [];

    let hashmapOk = false;
    while (!hashmapOk) {
      hashmapOk = true;
      parts.length = 0;
      hashmapBytes = new Uint8Array(0);
      collisionGuard = [];

      for (let index = 0; index < totalParts; index += 1) {
        const partData = encryptedPayload.subarray(index * sdu, (index + 1) * sdu);
        const mapHash = Identity.fullHash(provider, concatBytes(partData, randomHash)).subarray(
          0,
          RESOURCE_MAPHASH_LEN
        );

        if (collisionGuard.some((existing) => equalBytes(existing, mapHash))) {
          hashmapOk = false;
          break;
        }

        collisionGuard.push(mapHash);
        if (collisionGuard.length > ResourceAdvertisement.HASHMAP_MAX_LEN * 2 + 10) {
          collisionGuard.shift();
        }

        const packet = Packet.fromFields(provider, {
          headerType: PacketHeaderType.HEADER_1,
          transportType: TransportType.BROADCAST,
          destinationType: DestinationType.LINK,
          packetType: PacketType.DATA,
          destinationHash: link.linkId,
          context: PacketContext.RESOURCE,
          data: partData
        });

        parts.push({
          data: partData,
          mapHash: Uint8Array.from(mapHash),
          raw: packet.raw,
          sent: false
        });
        hashmapBytes = Uint8Array.from(concatBytes(hashmapBytes, Uint8Array.from(mapHash)));
      }
    }

    const resource = new Resource(provider, link, {
      initiator: true,
      hash,
      originalHash: hash,
      randomHash,
      encrypted: true,
      compressed: false,
      size: encryptedPayload.length,
      totalSize: data.length,
      totalParts,
      hashmapBytes,
      expectedProof,
      parts,
      callbacks: {
        ...(options.callback === undefined ? {} : { callback: options.callback }),
        ...(options.progressCallback === undefined ? {} : { progressCallback: options.progressCallback })
      },
      ...(options.timeout === undefined ? {} : { timeout: options.timeout })
    });

    if (options.advertise !== false) {
      void resource.advertise();
    }

    return resource;
  }

  static accept(
    link: Link,
    plaintext: Uint8Array,
    packet: Packet,
    options: ResourceCallbacks = {}
  ): Resource | null {
    try {
      const adv = ResourceAdvertisement.unpack(plaintext);
      const provider = link.cryptoProvider;
      if (link.incomingResources.some((resource) => equalBytes(resource.hash, adv.h))) {
        return null;
      }

      const resource = new Resource(provider, link, {
        initiator: false,
        hash: adv.h,
        originalHash: adv.o,
        randomHash: adv.r,
        encrypted: adv.e,
        compressed: adv.c,
        size: adv.t,
        totalSize: adv.d,
        totalParts: adv.n,
        hashmapBytes: adv.m,
        expectedProof: new Uint8Array(0),
        parts: [],
        requestId: adv.q,
        isResponse: adv.p,
        callbacks: {
          ...(options.callback === undefined ? {} : { callback: options.callback }),
          ...(options.progressCallback === undefined ? {} : { progressCallback: options.progressCallback })
        }
      });

      resource.status = ResourceStatus.TRANSFERRING;
      resource.receivedParts.length = adv.n;
      resource.receivedParts.fill(null);
      resource.hashmap = new Array(adv.n).fill(null);
      resource.startedTransferring = link.linkTransport.clock.now() / 1000;
      resource.hashmapUpdate(0, adv.m);
      link.registerIncomingResource(resource);
      resource.startWatchdog();
      return resource;
    } catch {
      return null;
    }
  }

  static reject(link: Link, plaintext: Uint8Array): void {
    try {
      const adv = ResourceAdvertisement.unpack(plaintext);
      void link.sendContext(PacketContext.RESOURCE_RCL, adv.h);
    } catch {
      // Ignore malformed advertisements.
    }
  }

  static readRequestHash(requestData: Uint8Array): Uint8Array {
    const wantsMoreHashmap = requestData[0] === RESOURCE_HASHMAP_IS_EXHAUSTED;
    const pad = wantsMoreHashmap ? 1 + RESOURCE_MAPHASH_LEN : 1;
    return requestData.subarray(pad, pad + 32);
  }

  getTransferSize(): number {
    return this.size;
  }

  getDataSize(): number {
    return this.totalSize;
  }

  getParts(): number {
    return this.totalParts;
  }

  isComplete(): boolean {
    return this.status === ResourceStatus.COMPLETE;
  }

  async advertise(): Promise<void> {
    while (!this.link.readyForNewResource()) {
      this.status = ResourceStatus.QUEUED;
      await this.sleep(250);
    }

    const packed = new ResourceAdvertisement(this).pack();
    this.status = ResourceStatus.ADVERTISED;
    this.advSent = this.link.linkTransport.clock.now() / 1000;
    this.startedTransferring = this.advSent;
    this.retriesLeft = RESOURCE_MAX_ADV_RETRIES;
    this.link.registerOutgoingResource(this);
    await this.link.sendContext(PacketContext.RESOURCE_ADV, packed);
    this.startWatchdog();
  }

  hasSeenRequest(packet: Packet): boolean {
    const key = bytesToHex(packet.raw);
    return this.reqHashlist.has(key);
  }

  trackRequest(packet: Packet): void {
    this.reqHashlist.add(bytesToHex(packet.raw));
  }

  async handleRequest(requestData: Uint8Array): Promise<void> {
    if (this.status === ResourceStatus.FAILED) {
      return;
    }

    this.status = ResourceStatus.TRANSFERRING;
    this.retriesLeft = RESOURCE_MAX_RETRIES;
    this.startWatchdog();

    const wantsMoreHashmap = requestData[0] === RESOURCE_HASHMAP_IS_EXHAUSTED;
    const pad = wantsMoreHashmap ? 1 + RESOURCE_MAPHASH_LEN : 1;
    const requestedHashes = requestData.subarray(pad + 32);
    const mapHashes: Uint8Array[] = [];
    for (let index = 0; index < requestedHashes.length; index += RESOURCE_MAPHASH_LEN) {
      mapHashes.push(requestedHashes.subarray(index, index + RESOURCE_MAPHASH_LEN));
    }

    const searchStart = this.receiverMinConsecutiveHeight;
    const searchScope = this.parts.slice(
      searchStart,
      searchStart + ResourceAdvertisement.HASHMAP_MAX_LEN * 2 + RESOURCE_WINDOW_MAX
    );

    for (const part of searchScope) {
      if (mapHashes.some((mapHash) => equalBytes(mapHash, part.mapHash))) {
        if (!part.sent) {
          await this.link.sendResourcePart(part.data);
          part.sent = true;
          this.sentParts += 1;
        } else {
          await this.link.resendPacket(part.raw);
        }
      }
    }

    if (wantsMoreHashmap) {
      const lastMapHash = requestData.subarray(1, 1 + RESOURCE_MAPHASH_LEN);
      let partIndex = this.receiverMinConsecutiveHeight;
      for (const part of this.parts.slice(partIndex, partIndex + ResourceAdvertisement.HASHMAP_MAX_LEN * 2)) {
        partIndex += 1;
        if (equalBytes(part.mapHash, lastMapHash)) {
          break;
        }
      }

      this.receiverMinConsecutiveHeight = Math.max(partIndex - 1 - RESOURCE_WINDOW_MAX, 0);
      const segment = Math.floor(partIndex / ResourceAdvertisement.HASHMAP_MAX_LEN);
      const hashmapStart = segment * ResourceAdvertisement.HASHMAP_MAX_LEN;
      const hashmapEnd = Math.min((segment + 1) * ResourceAdvertisement.HASHMAP_MAX_LEN, this.parts.length);
      let hashmap = new Uint8Array(0);
      for (let index = hashmapStart; index < hashmapEnd; index += 1) {
        const part = this.parts[index];
        if (part !== undefined) {
          hashmap = Uint8Array.from(concatBytes(hashmap, part.mapHash));
        }
      }

      const update = msgpackPackArray([msgpackPackUInt(segment), msgpackPackBin(hashmap)]);
      await this.link.sendContext(PacketContext.RESOURCE_HMU, concatBytes(this.hash, update));
    }

    if (this.sentParts === this.totalParts) {
      this.status = ResourceStatus.AWAITING_PROOF;
    }
  }

  hashmapUpdatePacket(plaintext: Uint8Array): void {
    if (this.status === ResourceStatus.FAILED) {
      return;
    }

    const updateBytes = plaintext.subarray(32);
    const update = msgpackUnpack(updateBytes);
    if (update.type !== "array" || update.array === undefined || update.array.length !== 2) {
      return;
    }

    const segment = readInt(update.array[0]!);
    const hashmap = readBin(update.array[1]!);
    this.hashmapUpdate(segment, hashmap);
  }

  hashmapUpdate(segment: number, hashmap: Uint8Array): void {
    if (this.status === ResourceStatus.FAILED) {
      return;
    }

    this.status = ResourceStatus.TRANSFERRING;
    const hashes = hashmap.length / RESOURCE_MAPHASH_LEN;
    for (let index = 0; index < hashes; index += 1) {
      const slot = index + segment * ResourceAdvertisement.HASHMAP_MAX_LEN;
      if (this.hashmap[slot] === null) {
        this.hashmapHeight += 1;
        this.hashmap[slot] = Uint8Array.from(
          hashmap.subarray(index * RESOURCE_MAPHASH_LEN, (index + 1) * RESOURCE_MAPHASH_LEN)
        );
      }
    }

    this.waitingForHashmap = false;
    void this.requestNext();
  }

  receivePart(packet: Packet): void {
    if (this.status === ResourceStatus.FAILED || this.status === ResourceStatus.COMPLETE) {
      return;
    }

    const partData = packet.data;
    const partHash = Identity.fullHash(this.provider, concatBytes(partData, this.randomHash)).subarray(
      0,
      RESOURCE_MAPHASH_LEN
    );

    let index = Math.max(this.consecutiveCompletedHeight + 1, 0);
    const searchEnd = Math.min(index + this.window, this.hashmap.length);
    for (; index < searchEnd; index += 1) {
      const mapHash = this.hashmap[index];
      if (mapHash !== null && mapHash !== undefined && equalBytes(mapHash, partHash) && this.receivedParts[index] === null) {
        this.receivedParts[index] = Uint8Array.from(partData);
        this.receivedCount += 1;
        this.outstandingParts -= 1;
        if (index === this.consecutiveCompletedHeight + 1) {
          this.consecutiveCompletedHeight = index;
        }

        let cursor = this.consecutiveCompletedHeight + 1;
        while (cursor < this.receivedParts.length && this.receivedParts[cursor] !== null) {
          this.consecutiveCompletedHeight = cursor;
          cursor += 1;
        }

        this.progress = this.receivedCount / this.totalParts;
        this.callbacks.progressCallback?.(this);
        break;
      }
    }

    if (this.receivedCount === this.totalParts && !this.assemblyStarted) {
      this.assemblyStarted = true;
      void this.assemble();
    } else if (this.outstandingParts === 0) {
      void this.requestNext();
    }
  }

  async requestNext(): Promise<void> {
    if (this.status === ResourceStatus.FAILED || this.waitingForHashmap) {
      return;
    }

    this.outstandingParts = 0;
    let hashmapExhausted = RESOURCE_HASHMAP_IS_NOT_EXHAUSTED;
    let requestedHashes = new Uint8Array(0);
    let index = 0;
    let partNumber = this.consecutiveCompletedHeight + 1;
    const searchStart = partNumber;

    for (const part of this.receivedParts.slice(searchStart, searchStart + this.window)) {
      if (part === null) {
        const mapHash = this.hashmap[partNumber];
        if (mapHash !== null && mapHash !== undefined) {
          requestedHashes = Uint8Array.from(concatBytes(requestedHashes, mapHash));
          this.outstandingParts += 1;
          index += 1;
        } else {
          hashmapExhausted = RESOURCE_HASHMAP_IS_EXHAUSTED;
          break;
        }
      }
      partNumber += 1;
      if (index >= this.window || hashmapExhausted === RESOURCE_HASHMAP_IS_EXHAUSTED) {
        break;
      }
    }

    let requestPrefix = new Uint8Array([hashmapExhausted]);
    if (hashmapExhausted === RESOURCE_HASHMAP_IS_EXHAUSTED) {
      const lastMapHash = this.hashmap[this.hashmapHeight - 1];
      if (lastMapHash !== null && lastMapHash !== undefined) {
        requestPrefix = Uint8Array.from(concatBytes(requestPrefix, lastMapHash));
        this.waitingForHashmap = true;
      }
    }

    const requestData = concatBytes(requestPrefix, this.hash, requestedHashes);
    await this.link.sendContext(PacketContext.RESOURCE_REQ, requestData);
  }

  async assemble(): Promise<void> {
    if (this.status === ResourceStatus.FAILED) {
      return;
    }

    try {
      this.status = ResourceStatus.ASSEMBLING;
      const stream = concatBytes(...this.receivedParts.map((part) => part!));
      const decrypted = this.link.decrypt(stream);
      if (decrypted === null) {
        this.status = ResourceStatus.CORRUPT;
        this.cancel();
        return;
      }

      const payload = decrypted.subarray(RESOURCE_RANDOM_HASH_SIZE);
      const calculatedHash = Identity.fullHash(this.provider, concatBytes(payload, this.randomHash));
      if (!equalBytes(calculatedHash, this.hash)) {
        this.status = ResourceStatus.CORRUPT;
        this.cancel();
        return;
      }

      this.data = payload;
      this.status = ResourceStatus.COMPLETE;
      this.progress = 1;
      await this.prove();
      this.link.resourceConcluded(this);
      this.callbacks.callback?.(this);
    } catch {
      this.status = ResourceStatus.CORRUPT;
      this.cancel();
    }
  }

  async prove(): Promise<void> {
    if (this.data === null) {
      return;
    }

    const proof = Identity.fullHash(this.provider, concatBytes(this.data, this.hash));
    const proofData = concatBytes(this.hash, proof);
    await this.link.sendProof(PacketContext.RESOURCE_PRF, proofData);
  }

  validateProof(proofData: Uint8Array): void {
    if (this.status === ResourceStatus.FAILED) {
      return;
    }

    if (proofData.length === 64 && equalBytes(proofData.subarray(32), this.expectedProof)) {
      this.status = ResourceStatus.COMPLETE;
      this.progress = 1;
      this.link.resourceConcluded(this);
      this.callbacks.callback?.(this);
    }
  }

  cancel(): void {
    this.status = ResourceStatus.FAILED;
    this.stopWatchdog();
    this.link.resourceConcluded(this);
  }

  private startWatchdog(): void {
    this.stopWatchdog();
    this.applyWatchdogResult(
      stepResourceWatchdogWithActions(this.snapshotWatchdogState(), { kind: "resource/watchdog-start" })
    );
  }

  private stopWatchdog(): void {
    this.watchdogTimer?.cancel();
    this.watchdogTimer = null;
  }

  private scheduleWatchdog(delayMs: number): void {
    this.watchdogTimer?.cancel();
    this.watchdogTimer = this.link.linkTransport.clock.setTimeout(() => {
      void this.watchdogTick();
    }, delayMs);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => {
      this.link.linkTransport.clock.setTimeout(() => resolve(), ms);
    });
  }

  private async watchdogTick(): Promise<void> {
    if (this.status === ResourceStatus.COMPLETE || this.status === ResourceStatus.FAILED) {
      return;
    }

    const result = stepResourceWatchdogWithActions(this.snapshotWatchdogState(), {
      kind: "timer/fired",
      id: "resource-watchdog",
      at: this.link.linkTransport.clock.now()
    });

    await this.applyWatchdogResultAsync(result);
  }

  private snapshotWatchdogState(): ResourceWatchdogState {
    return {
      status: this.status,
      initiator: this.initiator,
      advSent: this.advSent,
      timeout: this.timeout,
      retriesLeft: this.retriesLeft,
      outstandingParts: this.outstandingParts,
      receivedCount: this.receivedCount,
      totalParts: this.totalParts
    };
  }

  private applyWatchdogResult(result: ResourceWatchdogStepResult): void {
    this.retriesLeft = result.state.retriesLeft;

    for (const intent of result.intents) {
      if (intent.kind === "timer/set" && intent.timer.id === "resource-watchdog") {
        this.scheduleWatchdog(intent.timer.delayMs);
      }
    }
  }

  private async applyWatchdogResultAsync(result: ResourceWatchdogStepResult): Promise<void> {
    this.retriesLeft = result.state.retriesLeft;

    for (const action of result.actions) {
      if (action.kind === "cancel") {
        this.cancel();
        return;
      }
      if (action.kind === "advertise") {
        await this.advertise();
      } else if (action.kind === "request-next") {
        await this.requestNext();
      }
    }

    for (const intent of result.intents) {
      if (intent.kind === "timer/set" && intent.timer.id === "resource-watchdog") {
        this.scheduleWatchdog(intent.timer.delayMs);
      }
    }
  }
}

function readInt(value: MsgpackValue | undefined): number {
  if (value === undefined) {
    throw new Error("Missing msgpack int");
  }

  if (value.type === "int") {
    return value.int ?? 0;
  }

  throw new Error("Expected msgpack int");
}

function readBin(value: MsgpackValue | undefined): Uint8Array {
  if (value === undefined || value.type !== "bin" || value.bin === undefined) {
    throw new Error("Expected msgpack bin");
  }

  return Uint8Array.from(value.bin);
}

function readOptionalBin(value: MsgpackValue | undefined): Uint8Array | null {
  if (value === undefined || value.type === "nil") {
    return null;
  }

  return readBin(value);
}

function msgpackPackArray(items: ReadonlyArray<Uint8Array>): Uint8Array {
  if (items.length > 15) {
    throw new Error("msgpackPackArray supports at most 15 items");
  }

  const body = concatBytes(...items);
  const output = new Uint8Array(1 + body.length);
  output[0] = 0x90 | items.length;
  output.set(body, 1);
  return output;
}

function concatBytes(...parts: ReadonlyArray<Uint8Array>): Uint8Array {
  const length = parts.reduce((total, part) => total + part.length, 0);
  const output = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) {
    output.set(new Uint8Array(part), offset);
    offset += part.length;
  }

  return output;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

