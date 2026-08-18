import type { HostInfo } from "@twistedpear/miniapp-runtime";
import { callHost } from "./rpc.js";

export type ResumeHandler = (blob: Uint8Array | null) => void | Promise<void>;

type InjectedHost = {
  setCheckpoint?: (bytes: Uint8Array | null) => void;
  onResume?: (handler: ResumeHandler) => void;
  getCheckpoint?: () => Uint8Array | null;
};

function injectedHost(): InjectedHost | undefined {
  return (
    globalThis as {
      sdk?: { host?: InjectedHost };
    }
  ).sdk?.host;
}

/**
 * Host metadata for diagnostics and platform-difference matrices.
 * Requires the `presence` capability (coarse host/peer state).
 */
export async function info(): Promise<HostInfo> {
  return (await callHost("host", "info", undefined, "presence")) as HostInfo;
}

/**
 * Store a blob the host will collect on suspend. Local to the sandbox — it
 * does not cross the broker. Cap is 64 KiB; larger writes throw.
 */
export function setCheckpoint(bytes: Uint8Array | null): void {
  const host = injectedHost();
  if (host?.setCheckpoint === undefined) {
    throw new Error(
      "host.setCheckpoint is only available inside a host sandbox",
    );
  }

  host.setCheckpoint(bytes);
}

/** The blob last passed to `setCheckpoint`, or null. */
export function getCheckpoint(): Uint8Array | null {
  const host = injectedHost();
  if (host?.getCheckpoint === undefined) {
    throw new Error(
      "host.getCheckpoint is only available inside a host sandbox",
    );
  }

  return host.getCheckpoint();
}

/**
 * Called when the sandbox returns to running. There is no general `onSuspend`;
 * keep `setCheckpoint` current while you run.
 */
export function onResume(handler: ResumeHandler): void {
  const host = injectedHost();
  if (host?.onResume === undefined) {
    throw new Error("host.onResume is only available inside a host sandbox");
  }

  host.onResume(handler);
}

export interface WakeHandle {
  readonly intervalMs: number;
  readonly budgetMs: number;
  readonly nextAt: number;
}

/**
 * Ask the host to wake this app periodically for bounded work. Rationed per
 * host, not per app — a phone cannot give every installed app a timer.
 */
export async function requestWake(
  intervalMs: number,
  budgetMs = 1_000,
): Promise<WakeHandle> {
  return (await callHost(
    "host",
    "requestWake",
    { intervalMs, budgetMs },
    "runtime:wake",
  )) as WakeHandle;
}
