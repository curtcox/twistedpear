#!/usr/bin/env node
/**
 * iOS worklet interface prioritization policy (Phase 5 M6).
 */

import { pathToFileURL } from "node:url";
import {
  InterfaceKind,
  rankOutgoingInterfaces,
  selectPreferredInterface
} from "../../packages/reticulum-interfaces/dist/policy.js";

function mockInterface(name, online = true) {
  return {
    name,
    mtu: 500,
    bitrate: null,
    incoming: true,
    outgoing: true,
    online,
    packets: (async function* () {})(),
    async send() {},
    async close() {}
  };
}

export function runIosInterfacePolicy() {
  const ranked = rankOutgoingInterfaces([
    mockInterface("harness-ble"),
    mockInterface("harness-tcp"),
    mockInterface("harness-auto")
  ]);

  if (ranked.map((entry) => entry.kind).join(",") !== "auto,tcp,ble") {
    throw new Error(`unexpected interface rank order: ${ranked.map((entry) => entry.kind).join(",")}`);
  }

  const preferred = selectPreferredInterface([
    mockInterface("harness-auto", false),
    mockInterface("harness-tcp", true),
    mockInterface("harness-ble", true)
  ]);

  if (preferred?.name !== "harness-tcp") {
    throw new Error(`expected harness-tcp when auto is offline, got ${preferred?.name ?? "null"}`);
  }

  const blePreferred = selectPreferredInterface([
    mockInterface("harness-auto", false),
    mockInterface("harness-tcp", false),
    mockInterface("harness-ble", true)
  ]);

  if (blePreferred?.name !== "harness-ble") {
    throw new Error(`expected harness-ble as last online interface, got ${blePreferred?.name ?? "null"}`);
  }

  if (InterfaceKind.AUTO !== "auto") {
    throw new Error("InterfaceKind.AUTO mismatch");
  }

  console.log("[ios-sim/interface-policy] AutoInterface > TCP > BLE ranking verified for harness interface names");
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    runIosInterfacePolicy();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}
