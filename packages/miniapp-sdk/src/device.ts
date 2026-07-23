import { callHost, MiniappHostError } from "./rpc.js";

export type DeviceAvailability =
  | "available"
  | "permission-required"
  | "unsupported"
  | "busy"
  | "policy-disabled"
  | "offline";

export interface DeviceDescriptor {
  readonly class: string;
  readonly tiers: ReadonlyArray<string>;
  readonly availability: DeviceAvailability;
  readonly maxRateHz: number;
  readonly streamable: boolean;
  readonly remoteEligible: boolean;
}

export interface DeviceDiagnostic {
  readonly class: string;
  readonly availability: DeviceAvailability;
  readonly reason?: string;
  readonly holder?: string;
}

export interface DeviceOpenRequest {
  readonly class: string;
  readonly tier?: string;
  readonly purpose: string;
  readonly rateHz?: number;
  readonly options?: Readonly<Record<string, unknown>>;
  readonly maxDurationMs?: number;
}

export interface DeviceSession {
  readonly handle: string;
  readonly class: string;
  readonly tier: string;
  readonly expiresAt: number | null;
}

export type DeviceSample =
  | {
      readonly kind: "location";
      readonly tier: "coarse" | "precise";
      readonly at: number;
      readonly latitude: number;
      readonly longitude: number;
      readonly accuracyM: number;
      readonly altitudeM?: number;
      readonly speedMps?: number;
      readonly headingDeg?: number;
    }
  | {
      readonly kind: "ambient-light";
      readonly tier: "quantized";
      readonly at: number;
      readonly luxBucket: "dark" | "dim" | "indoor" | "bright" | "sunlit";
    };

export class DeviceError extends Error {
  constructor(readonly code: string, message: string) {
    super(message);
    this.name = "DeviceError";
  }
}

async function deviceCall<T>(method: string, payload?: unknown): Promise<T> {
  try {
    return (await callHost("device", method, payload)) as T;
  } catch (error) {
    if (error instanceof MiniappHostError) {
      throw new DeviceError(error.code, error.message);
    }
    throw error;
  }
}

/** Discovery — no capability required; returns only what this host has. */
export async function inventory(): Promise<ReadonlyArray<DeviceDescriptor>> {
  return deviceCall("inventory");
}

export async function diagnostics(): Promise<ReadonlyArray<DeviceDiagnostic>> {
  return deviceCall("diagnostics");
}

/** Session lifecycle — capability + consent gates are enforced by the host. */
export async function open(request: DeviceOpenRequest): Promise<DeviceSession> {
  return deviceCall("open", request);
}

export async function close(session: DeviceSession | string): Promise<void> {
  const handle = typeof session === "string" ? session : session.handle;
  await deviceCall("close", { handle });
}

export async function read(session: DeviceSession | string): Promise<DeviceSample> {
  const handle = typeof session === "string" ? session : session.handle;
  return deviceCall("read", { handle });
}
