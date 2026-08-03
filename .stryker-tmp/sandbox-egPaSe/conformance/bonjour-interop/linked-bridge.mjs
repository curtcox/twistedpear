/**
 * Paired MulticastBridge halves that route unicast UDP between two AutoInterface peers.
 * Multicast discovery is unused — Bonjour supplies peer addresses. Only the data port is
 * forwarded; discovery/reverse-peering ports are dropped to avoid feedback loops.
 */
// @ts-nocheck


import { AUTO_DEFAULT_DATA_PORT } from "../../packages/reticulum-interfaces/dist/auto.js";
import { BONJOUR_RETICULUM_SERVICE } from "../../packages/reticulum-interfaces/dist/auto-discovery.js";

/** @typedef {import("../../packages/reticulum-interfaces/dist/bonjour.js").BonjourBridge} BonjourBridge */
/** @typedef {import("../../packages/reticulum-interfaces/dist/bonjour.js").BonjourServiceRecord} BonjourServiceRecord */

/** @typedef {import("../../packages/reticulum-interfaces/dist/pipes.js").MulticastBridge} MulticastBridge */
/** @typedef {import("../../packages/reticulum-interfaces/dist/pipes.js").MulticastBridgeEvents} MulticastBridgeEvents */
/** @typedef {import("../../packages/reticulum-interfaces/dist/pipes.js").MulticastNetworkInfo} MulticastNetworkInfo */

/**
 * @param {string} linkLocalAddress
 * @returns {MulticastBridge & { _link: (peer: ReturnType<typeof createLinkedMulticastBridge>) => void }}
 */
export function createLinkedMulticastBridge(linkLocalAddress) {
  /** @type {ReturnType<typeof createLinkedMulticastBridge> | null} */
  let peer = null;
  const interfaces = [{ name: "lo0", linkLocalAddress }];
  /** @type {MulticastBridgeEvents} */
  let events = {};

  const bridge = {
    get interfaces() {
      return interfaces;
    },

    setEvents(next) {
      events = next;
    },

    async start() {},

    async stop() {},

    async joinGroup() {},

    async bindPort() {},

    async send() {},

    async sendUnicast(ifname, _targetAddress, port, data) {
      if (port !== AUTO_DEFAULT_DATA_PORT) {
        return;
      }

      peer?._deliver(ifname, data, linkLocalAddress, port);
    },

    _link(other) {
      peer = other;
    },

    _deliver(ifname, data, sourceAddress, port) {
      events.onPacket?.(ifname, data, sourceAddress, port);
    }
  };

  return bridge;
}

/**
 * @param {ReturnType<typeof createLinkedMulticastBridge>} left
 * @param {ReturnType<typeof createLinkedMulticastBridge>} right
 */
export function linkMulticastBridges(left, right) {
  left._link(right);
  right._link(left);
}

/**
 * In-process BonjourBridge pair for Node ⇄ Bare interop without flaky host mDNS.
 * Real mDNS is covered by `bonjour-mdns.test.ts`.
 *
 * @param {string} linkLocalAddress
 */
export function createLinkedBonjourBridge(linkLocalAddress) {
  /** @type {ReturnType<typeof createLinkedBonjourBridge> | null} */
  let peer = null;
  const interfaces = [{ name: "lo0", linkLocalAddress }];
  /** @type {import("../../packages/reticulum-interfaces/dist/bonjour.js").BonjourBridgeEvents} */
  let events = {};

  const bridge = {
    get interfaces() {
      return interfaces;
    },

    setEvents(next) {
      events = next;
    },

    async start(_serviceType = BONJOUR_RETICULUM_SERVICE) {},

    async stop() {},

    async advertise(record) {
      peer?.events.onServiceFound?.(record);
    },

    _link(other) {
      peer = other;
    },

    get events() {
      return events;
    }
  };

  return bridge;
}

/**
 * @param {ReturnType<typeof createLinkedBonjourBridge>} left
 * @param {ReturnType<typeof createLinkedBonjourBridge>} right
 */
export function linkBonjourBridges(left, right) {
  left._link(right);
  right._link(left);
}
