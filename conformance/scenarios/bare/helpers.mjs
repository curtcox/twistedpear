#!/usr/bin/env node
/**
 * Shared helpers for Bare conformance runners (Phase 2 M1).
 */

import identityVectors from "../../vectors/identity.json" with { type: "json" };
import { PacketReceiptStatus } from "../../../packages/reticulum-ts/dist/packet-receipt.js";

const repoRoot = new URL("../../..", import.meta.url).pathname.replace(/\/$/, "");

export const LEAF_ECHO_PORT = Number.parseInt(globalThis.process?.env?.LEAF_ECHO_PORT ?? "4242", 10);
export const LXMF_ECHO_PORT = Number.parseInt(globalThis.process?.env?.LXMF_ECHO_PORT ?? "4243", 10);
export const LINK_ECHO_PORT = Number.parseInt(globalThis.process?.env?.LINK_ECHO_PORT ?? "4244", 10);
export const INTEROP_HOST = globalThis.process?.env?.INTEROP_HOST ?? "127.0.0.1";

export function loadIdentityVectors() {
  return identityVectors;
}

export function hexToBytes(hex) {
  const normalized = hex.length % 2 === 0 ? hex : `0${hex}`;
  const bytes = new Uint8Array(normalized.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(normalized.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
}

export async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function waitForPath(reticulum, destinationHash, timeoutMs = 15_000) {
  const deadline = Date.now() + timeoutMs;
  let lastRequest = 0;
  while (Date.now() < deadline) {
    if (reticulum.hasPath(destinationHash)) {
      return;
    }

    const now = Date.now();
    if (typeof reticulum.requestPath === "function" && now - lastRequest >= 1_000) {
      reticulum.requestPath(destinationHash);
      lastRequest = now;
    }

    await sleep(100);
  }

  throw new Error("Timed out waiting for path to peer");
}

export async function waitForInterfaceOnline(iface, timeoutMs = 15_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (iface.online) {
      return;
    }

    await sleep(100);
  }

  const detail = iface.connectionError?.message;
  throw new Error(
    `Timed out waiting for interface ${iface.name} to connect${detail === undefined ? "" : `: ${detail}`}`
  );
}

export async function waitForReceipt(receipt, timeoutMs = 15_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (receipt.status === PacketReceiptStatus.DELIVERED) {
      return;
    }
    if (
      receipt.status === PacketReceiptStatus.FAILED ||
      receipt.status === PacketReceiptStatus.CULLED
    ) {
      throw new Error(`Receipt concluded with status ${receipt.status}`);
    }

    await sleep(50);
  }

  throw new Error(`Timed out waiting for delivered receipt; last status ${receipt.status}`);
}

export function expectReceipt(actual, expected) {
  if (actual !== expected) {
    throw new Error(`Expected receipt status ${expected}, got ${actual}`);
  }
}

export function bytesToAscii(bytes) {
  return Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");
}

export { PacketReceiptStatus, repoRoot };
