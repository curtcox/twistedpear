import type {
  CryptoProvider,
  ReticulumInterfaceOptions,
} from "@twistedpear/reticulum-ts";

/**
 * A channel representing the camera (inbound) and screen/display (outbound) medium.
 * The host provides an implementation that drives native camera capture and display rendering.
 * PCM/pixel data never crosses into mini-apps; this is the effect boundary.
 */
export interface OpticalChannel {
  /** Start the display/camera hardware. */
  start(): Promise<void>;
  /** Stop the display/camera hardware. */
  stop(): Promise<void>;
  /** Whether the channel is currently active. */
  readonly active: boolean;
  /** Display encoded frames on screen (outbound). Each frame is a self-contained code payload. */
  display(frames: ReadonlyArray<Uint8Array>): Promise<void>;
  /** Subscribe to decoded inbound frames from the camera. */
  setReceiver(onFrame: (frame: Uint8Array) => void): void;
}

export interface OpticalInterfaceOptions extends ReticulumInterfaceOptions {
  readonly provider: CryptoProvider;
  readonly channel: OpticalChannel;
}
