import {
  RESOURCE_ADVERTISEMENT_OVERHEAD,
  RESOURCE_HASHMAP_IS_EXHAUSTED,
  RESOURCE_HASHMAP_IS_NOT_EXHAUSTED,
  RESOURCE_MAPHASH_LEN,
  RESOURCE_MAX_ADV_RETRIES,
  RESOURCE_MAX_RETRIES,
  RESOURCE_PART_TIMEOUT_FACTOR,
  RESOURCE_PROCESSING_GRACE,
  RESOURCE_RANDOM_HASH_SIZE,
  RESOURCE_SENDER_GRACE_TIME,
  RESOURCE_WINDOW,
  RESOURCE_WINDOW_FLEXIBILITY,
  RESOURCE_WINDOW_MAX,
  RESOURCE_WINDOW_MAX_FAST,
  RESOURCE_WINDOW_MAX_SLOW,
  RESOURCE_WINDOW_MIN,
  ResourceStatus,
  applyResourceStatusEvent,
  assembleByteArrays,
  assembleResourceHashmapBytes,
  canReceiveResourcePart,
  canResourceContinueTransfer,
  canRunResourceWatchdog,
  canValidateResourceProof,
  computeResourceTimeout,
  decodeResourceAdvertisementFlags,
  encodeResourceAdvertisementFlags,
  initialResourceStatusState,
  isResourceAdvertisementRequest,
  isResourceAdvertisementResponse,
  isResourceComplete,
  packResourceAdvertisement,
  packResourceHashmapUpdate,
  packResourceHashmapUpdatePacket,
  packResourceProof,
  parseResourcePartRequest,
  planResourceHashmapSlotWrites,
  planResourcePartRequest,
  planResourceReceivePart,
  planResourceRequestFulfill,
  readResourceRequestHash,
  appendResourceMapHashCollisionGuard,
  resourceEncryptMaterial,
  resourceExpectedProofMaterial,
  resourceHashMaterial,
  resourceHashmapMaxLen,
  resourcePartMapHashMaterial,
  isValidResourceProof,
  splitResourceDecryptedPayload,
  splitResourceHashmapUpdatePacket,
  stepResourceWatchdogWithActions,
  unpackResourceAdvertisement,
  unpackResourceHashmapUpdate,
  type ResourceStatusEvent,
  type ResourceStatusValue,
  type ResourceWatchdogState,
  type ResourceWatchdogStepResult
} from "@twistedpear/protocol";
import type { CryptoProvider } from "./crypto/provider.js";
import { equalBytes } from "./crypto/bytes.js";
import { Identity } from "./identity.js";
import type { Link } from "./link.js";
import type { LeafTransport } from "./transport/node.js";
import {
  Packet,
  PacketContext,
  PacketHeaderType,
  PacketType,
  TransportType
} from "./packet.js";
import { DestinationType } from "./destination.js";

/** Mirrors RNS/Resource.py constants. */
export {
  ResourceStatus,
  RESOURCE_WINDOW,
  RESOURCE_WINDOW_MIN,
  RESOURCE_WINDOW_MAX_SLOW,
  RESOURCE_WINDOW_MAX_FAST,
  RESOURCE_WINDOW_MAX,
  RESOURCE_WINDOW_FLEXIBILITY,
  RESOURCE_MAPHASH_LEN,
  RESOURCE_HASHMAP_IS_NOT_EXHAUSTED,
  RESOURCE_HASHMAP_IS_EXHAUSTED,
  RESOURCE_RANDOM_HASH_SIZE,
  RESOURCE_MAX_RETRIES,
  RESOURCE_MAX_ADV_RETRIES,
  RESOURCE_PART_TIMEOUT_FACTOR,
  RESOURCE_SENDER_GRACE_TIME,
  RESOURCE_PROCESSING_GRACE,
  type ResourceStatusValue
};

export interface ResourceCallbacks {
  readonly callback?: (resource: Resource) => void;
  readonly progressCallback?: (resource: Resource) => void;
}

export interface ResourceOptions extends ResourceCallbacks {
  readonly advertise?: boolean;
  readonly autoCompress?: boolean;
  readonly timeout?: number;
  /** Optional injected resource random hash (first 4 bytes used). */
  readonly randomHash?: Uint8Array;
}

interface ResourcePart {
  readonly data: Uint8Array;
  readonly mapHash: Uint8Array;
  raw: Uint8Array;
  sent: boolean;
}

/** Mirrors RNS/Resource.py ResourceAdvertisement. */
export class ResourceAdvertisement {
  static readonly OVERHEAD = RESOURCE_ADVERTISEMENT_OVERHEAD;
  static readonly HASHMAP_MAX_LEN = resourceHashmapMaxLen();

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
      return isResourceAdvertisementRequest(unpackResourceAdvertisement(plaintext));
    } catch {
      return false;
    }
  }

  static isResponse(plaintext: Uint8Array): boolean {
    try {
      return isResourceAdvertisementResponse(unpackResourceAdvertisement(plaintext));
    } catch {
      return false;
    }
  }

  static unpack(data: Uint8Array): ResourceAdvertisement {
    const fields = unpackResourceAdvertisement(data);
    const flags = decodeResourceAdvertisementFlags(fields.f);
    const adv = new ResourceAdvertisement();
    adv.t = fields.t;
    adv.d = fields.d;
    adv.n = fields.n;
    adv.h = fields.h;
    adv.r = fields.r;
    adv.o = fields.o;
    adv.m = fields.m;
    adv.f = fields.f;
    adv.i = fields.i;
    adv.l = fields.l;
    adv.q = fields.q;
    adv.e = flags.e;
    adv.c = flags.c;
    adv.s = flags.s;
    adv.u = flags.u;
    adv.p = flags.p;
    adv.x = flags.x;
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
    this.f = encodeResourceAdvertisementFlags({
      e: this.e,
      c: this.c,
      s: this.s,
      u: this.u,
      p: this.p,
      x: this.x
    });
  }

  pack(): Uint8Array {
    return packResourceAdvertisement({
      t: this.t,
      d: this.d,
      n: this.n,
      h: this.h,
      r: this.r,
      o: this.o,
      m: this.m,
      f: this.f,
      i: this.i,
      l: this.l,
      q: this.q
    });
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
    const randomHash =
      options.randomHash !== undefined
        ? Uint8Array.from(options.randomHash.subarray(0, RESOURCE_RANDOM_HASH_SIZE))
        : Identity.getRandomHash(provider, link.linkTransport.entropy).subarray(
            0,
            RESOURCE_RANDOM_HASH_SIZE
          );
    if (randomHash.length !== RESOURCE_RANDOM_HASH_SIZE) {
      throw new Error(`Resource random hash must be ${RESOURCE_RANDOM_HASH_SIZE} bytes`);
    }
    const payload = resourceEncryptMaterial(randomHash, data);
    const encryptedPayload = link.encrypt(payload);
    const sdu = link.mdu;
    const totalParts = Math.ceil(encryptedPayload.length / sdu);
    const hashInput = resourceHashMaterial(data, randomHash);
    const hash = Identity.fullHash(provider, hashInput);
    const expectedProof = Identity.fullHash(provider, resourceExpectedProofMaterial(data, hash));

    const parts: ResourcePart[] = [];
    const mapHashes: Uint8Array[] = [];
    let collisionGuard: Uint8Array[] = [];

    let hashmapOk = false;
    while (!hashmapOk) {
      hashmapOk = true;
      parts.length = 0;
      mapHashes.length = 0;
      collisionGuard = [];

      for (let index = 0; index < totalParts; index += 1) {
        const partData = encryptedPayload.subarray(index * sdu, (index + 1) * sdu);
        const mapHash = Identity.fullHash(provider, resourcePartMapHashMaterial(partData, randomHash)).subarray(
          0,
          RESOURCE_MAPHASH_LEN
        );

        const appended = appendResourceMapHashCollisionGuard({
          guard: collisionGuard,
          mapHash,
          hashmapMaxLen: ResourceAdvertisement.HASHMAP_MAX_LEN
        });
        if (appended.collided) {
          hashmapOk = false;
          break;
        }
        collisionGuard = [...appended.guard];

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
        mapHashes.push(Uint8Array.from(mapHash));
      }
    }

    const hashmapBytes = assembleResourceHashmapBytes(mapHashes);

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

      resource.applyStatus({ kind: "resource/transferring" });
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
    return readResourceRequestHash(requestData);
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
    return isResourceComplete(this.status);
  }

  async advertise(): Promise<void> {
    while (!this.link.readyForNewResource()) {
      this.applyStatus({ kind: "resource/queue" });
      await this.sleep(250);
    }

    const packed = new ResourceAdvertisement(this).pack();
    this.applyStatus({ kind: "resource/advertise" });
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
    if (!canResourceContinueTransfer(this.status)) {
      return;
    }

    this.applyStatus({ kind: "resource/transferring" });
    this.retriesLeft = RESOURCE_MAX_RETRIES;
    this.startWatchdog();

    const request = parseResourcePartRequest(requestData);
    if (request === null) {
      return;
    }

    const plan = planResourceRequestFulfill({
      request,
      partMapHashes: this.parts.map((part) => part.mapHash),
      partSent: this.parts.map((part) => part.sent),
      receiverMinConsecutiveHeight: this.receiverMinConsecutiveHeight,
      hashmapMaxLen: ResourceAdvertisement.HASHMAP_MAX_LEN,
      windowMax: RESOURCE_WINDOW_MAX,
      totalParts: this.totalParts,
      sentParts: this.sentParts
    });

    for (const action of plan.partActions) {
      const part = this.parts[action.index];
      if (part === undefined) {
        continue;
      }
      if (action.kind === "send") {
        await this.link.sendResourcePart(part.data);
        part.sent = true;
      } else {
        await this.link.resendPacket(part.raw);
      }
    }
    this.sentParts = plan.nextSentParts;
    this.receiverMinConsecutiveHeight = plan.nextReceiverMinConsecutiveHeight;

    if (plan.hashmapUpdate !== null) {
      const update = packResourceHashmapUpdate(
        plan.hashmapUpdate.segment,
        assembleResourceHashmapBytes(plan.hashmapUpdate.mapHashes)
      );
      await this.link.sendContext(
        PacketContext.RESOURCE_HMU,
        packResourceHashmapUpdatePacket(this.hash, update)
      );
    }

    if (plan.status === "awaiting-proof") {
      this.applyStatus({ kind: "resource/awaiting-proof" });
    }
  }

  hashmapUpdatePacket(plaintext: Uint8Array): void {
    if (!canResourceContinueTransfer(this.status)) {
      return;
    }

    const split = splitResourceHashmapUpdatePacket(plaintext);
    if (split === null) {
      return;
    }
    const update = unpackResourceHashmapUpdate(split.updateBytes);
    if (update === null) {
      return;
    }
    this.hashmapUpdate(update.segment, update.hashmap);
  }

  hashmapUpdate(segment: number, hashmap: Uint8Array): void {
    if (!canResourceContinueTransfer(this.status)) {
      return;
    }

    this.applyStatus({ kind: "resource/transferring" });
    const writes = planResourceHashmapSlotWrites({
      segment,
      hashmap,
      hashmapMaxLen: ResourceAdvertisement.HASHMAP_MAX_LEN
    });
    for (const write of writes) {
      if (this.hashmap[write.slot] === null) {
        this.hashmapHeight += 1;
        this.hashmap[write.slot] = Uint8Array.from(write.mapHash);
      }
    }

    this.waitingForHashmap = false;
    void this.requestNext();
  }

  receivePart(packet: Packet): void {
    if (!canReceiveResourcePart(this.status)) {
      return;
    }

    const partData = packet.data;
    const partHash = Identity.fullHash(
      this.provider,
      resourcePartMapHashMaterial(partData, this.randomHash)
    ).subarray(0, RESOURCE_MAPHASH_LEN);

    const plan = planResourceReceivePart({
      partHash,
      hashmap: this.hashmap,
      receivedParts: this.receivedParts,
      consecutiveCompletedHeight: this.consecutiveCompletedHeight,
      window: this.window,
      receivedCount: this.receivedCount,
      outstandingParts: this.outstandingParts,
      totalParts: this.totalParts,
      assemblyStarted: this.assemblyStarted
    });

    if (plan.matched && plan.slot !== null) {
      this.receivedParts[plan.slot] = Uint8Array.from(partData);
      this.receivedCount = plan.receivedCount;
      this.outstandingParts = plan.outstandingParts;
      this.consecutiveCompletedHeight = plan.consecutiveCompletedHeight;
      this.progress = plan.progress;
      this.callbacks.progressCallback?.(this);
    }

    if (plan.shouldAssemble) {
      this.assemblyStarted = true;
      void this.assemble();
    } else if (plan.shouldRequestNext) {
      void this.requestNext();
    }
  }

  async requestNext(): Promise<void> {
    if (!canResourceContinueTransfer(this.status) || this.waitingForHashmap) {
      return;
    }

    const plan = planResourcePartRequest({
      receivedParts: this.receivedParts,
      hashmap: this.hashmap,
      consecutiveCompletedHeight: this.consecutiveCompletedHeight,
      window: this.window,
      hashmapHeight: this.hashmapHeight,
      resourceHash: this.hash
    });
    this.outstandingParts = plan.outstandingParts;
    this.waitingForHashmap = plan.waitingForHashmap;
    await this.link.sendContext(PacketContext.RESOURCE_REQ, plan.requestData);
  }

  async assemble(): Promise<void> {
    if (!canResourceContinueTransfer(this.status)) {
      return;
    }

    try {
      this.applyStatus({ kind: "resource/assemble" });
      const stream = assembleByteArrays(this.receivedParts.map((part) => part!));
      const decrypted = this.link.decrypt(stream);
      if (decrypted === null) {
        this.applyStatus({ kind: "resource/corrupt" });
        this.cancel();
        return;
      }

      const payload = splitResourceDecryptedPayload(decrypted);
      if (payload === null) {
        this.applyStatus({ kind: "resource/corrupt" });
        this.cancel();
        return;
      }
      const calculatedHash = Identity.fullHash(
        this.provider,
        resourceHashMaterial(payload, this.randomHash)
      );
      if (!equalBytes(calculatedHash, this.hash)) {
        this.applyStatus({ kind: "resource/corrupt" });
        this.cancel();
        return;
      }

      this.data = payload;
      this.applyStatus({ kind: "resource/complete" });
      this.progress = 1;
      await this.prove();
      this.link.resourceConcluded(this);
      this.callbacks.callback?.(this);
    } catch {
      this.applyStatus({ kind: "resource/corrupt" });
      this.cancel();
    }
  }

  async prove(): Promise<void> {
    if (this.data === null) {
      return;
    }

    const proof = Identity.fullHash(
      this.provider,
      resourceExpectedProofMaterial(this.data, this.hash)
    );
    const proofData = packResourceProof(this.hash, proof);
    await this.link.sendProof(PacketContext.RESOURCE_PRF, proofData);
  }

  validateProof(proofData: Uint8Array): void {
    if (!canValidateResourceProof(this.status)) {
      return;
    }

    if (isValidResourceProof(proofData, this.expectedProof)) {
      this.applyStatus({ kind: "resource/complete" });
      this.progress = 1;
      this.link.resourceConcluded(this);
      this.callbacks.callback?.(this);
    }
  }

  cancel(): void {
    this.applyStatus({ kind: "resource/fail" });
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
    if (!canRunResourceWatchdog(this.status)) {
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

  private applyStatus(event: ResourceStatusEvent): void {
    this.status = applyResourceStatusEvent(initialResourceStatusState(this.status), event).status;
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

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

