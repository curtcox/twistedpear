#!/usr/bin/env node
/**
 * Shared helpers for Bare conformance runners (Phase 2 M1).
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PacketReceiptStatus } from "../../packages/reticulum-ts/dist/packet-receipt.js";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");

export const LEAF_ECHO_PORT = Number.parseInt(process.env.LEAF_ECHO_PORT ?? "4242", 10);
export const LXMF_ECHO_PORT = Number.parseInt(process.env.LXMF_ECHO_PORT ?? "4243", 10);
export const LINK_ECHO_PORT = Number.parseInt(process.env.LINK_ECHO_PORT ?? "4244", 10);
export const INTEROP_HOST = process.env.INTEROP_HOST ?? "127.0.0.1";

export function loadIdentityVectors() {
  return JSON.parse(
    readFileSync(join(repoRoot, "conformance/vectors/identity.json"), "utf8")
  );
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
  while (Date.now() < deadline) {
    if (reticulum.hasPath(destinationHash)) {
      return;
    }

    await sleep(100);
  }

  throw new Error("Timed out waiting for path to peer");
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
