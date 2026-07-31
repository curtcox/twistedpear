import {
  DEVICE_STREAM_KIND,
  decodeDeviceStreamFrame,
  encodeDeviceStreamFrame,
  type DeviceStreamFrame,
  type DeviceStreamSampleKind,
  DeviceStreamFrameError
} from "@twistedpear/protocol";

export type DeviceSidecarTransport = "transferable" | "shared-ring" | "chunked-wire";

export interface DeviceSidecarPush {
  readonly sessionHandle: string;
  readonly sessionToken: number;
  readonly sampleKind: DeviceStreamSampleKind;
  readonly sequence: number;
  readonly captureAtUs: number;
  readonly clockId: number;
  readonly payload: Uint8Array;
}

export interface DeviceSidecarDelivery {
  readonly transport: DeviceSidecarTransport;
  readonly frames: ReadonlyArray<Uint8Array>;
  readonly droppedOldest: number;
}

/**
 * Bounded in-host sidecar queue. Capability-derived: one session, sample data only.
 * Drops oldest on overflow and reports the drop count.
 */
export class DeviceStreamSidecar {
  private readonly queues = new Map<string, SidecarQueue>();
  private nextToken = 1;

  constructor(
    private readonly options: {
      readonly maxQueuedFrames?: number;
      readonly transport?: DeviceSidecarTransport;
    } = {}
  ) {}

  open(sessionHandle: string): number {
    const token = this.nextToken++;
    this.queues.set(sessionHandle, {
      token,
      sequence: 0,
      frames: [],
      droppedOldest: 0
    });
    return token;
  }

  close(sessionHandle: string): void {
    this.queues.delete(sessionHandle);
  }

  push(push: DeviceSidecarPush): DeviceSidecarDelivery {
    const queue = this.queues.get(push.sessionHandle);
    if (queue === undefined || queue.token !== push.sessionToken) {
      throw new DeviceStreamFrameError("MALFORMED", "Unknown or mismatched device sidecar session.");
    }

    const encoded = encodeDeviceStreamFrame({
      version: 2,
      sampleKind: push.sampleKind,
      sessionToken: push.sessionToken,
      sequence: push.sequence,
      captureAtUs: push.captureAtUs,
      clockId: push.clockId,
      payload: push.payload
    });

    // Refuse anything that would decode as a non-sample / control frame.
    const decoded = decodeDeviceStreamFrame(encoded);
    assertSampleOnly(decoded);

    const maxQueued = this.options.maxQueuedFrames ?? 8;
    queue.frames.push(encoded);
    while (queue.frames.length > maxQueued) {
      queue.frames.shift();
      queue.droppedOldest += 1;
    }
    queue.sequence = push.sequence + 1;

    const frames = [...queue.frames];
    queue.frames = [];
    const droppedOldest = queue.droppedOldest;
    queue.droppedOldest = 0;

    return {
      transport: this.options.transport ?? "transferable",
      frames,
      droppedOldest
    };
  }

  /** Negative-control helper: attempting to decode a control kind must throw. */
  rejectControlFrame(sessionToken: number, payload: Uint8Array): void {
    const bogus = new Uint8Array(24 + payload.length);
    bogus.set([0x54, 0x50, 0x44, 0x31], 0);
    bogus[4] = 1;
    bogus[5] = 0; // control kind
    const view = new DataView(bogus.buffer);
    view.setUint32(8, sessionToken >>> 0, false);
    view.setUint32(12, 0, false);
    view.setUint32(16, payload.length >>> 0, false);
    view.setUint32(20, 0, false);
    bogus.set(payload, 24);
    decodeDeviceStreamFrame(bogus);
  }
}

interface SidecarQueue {
  readonly token: number;
  sequence: number;
  frames: Uint8Array[];
  droppedOldest: number;
}

function assertSampleOnly(frame: DeviceStreamFrame): void {
  if (
    frame.sampleKind !== DEVICE_STREAM_KIND.cameraFrame &&
    frame.sampleKind !== DEVICE_STREAM_KIND.pcm &&
    frame.sampleKind !== DEVICE_STREAM_KIND.motionSamples &&
    frame.sampleKind !== DEVICE_STREAM_KIND.screenFrame &&
    frame.sampleKind !== DEVICE_STREAM_KIND.derivedEvent
  ) {
    throw new DeviceStreamFrameError(
      "CONTROL_FORBIDDEN",
      "Device stream sidecar refuses control messages."
    );
  }
}

export { DEVICE_STREAM_KIND };
