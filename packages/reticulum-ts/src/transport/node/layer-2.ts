import {
  PATH_AWAIT_TIMER_ID,
  PATH_REQUEST_TIMEOUT_SECONDS,
  initialPathAwaitState,
  stepPathAwaitWithActions,
  activeLinkUnregisterRemoveIndex,
  initialLinkActivateMembershipState,
  initialLinkRegisterListState,
  initialLinkUnregisterMembershipState,
  initialOutboundReceiptState,
  initialPacketReceiptUnregisterState,
  initialTransportMemberUnregisterState,
  packetReceiptUnregisterIndex,
  pendingLinkMembershipRemoveIndex,
  pendingLinkUnregisterRemoveIndex,
  shouldAppendActiveLinkMembershipActions,
  shouldFailAndDropOutboundReceiptNow,
  shouldKeepOutboundReceiptNow,
  shouldOutboundFailAndDropReceipt,
  shouldOutboundKeepReceipt,
  shouldRegisterLinkActive,
  shouldRegisterLinkMemberNow,
  shouldRegisterLinkPending,
  shouldRegisterPacketReceiptNow,
  shouldRegisterTransportMemberNow,
  shouldRemoveActiveLinkUnregisterActions,
  shouldRemovePendingLinkMembershipActions,
  shouldRemovePendingLinkUnregisterActions,
  shouldRemovePacketReceipt,
  shouldRemoveTransportMember,
  initialEmitPathRequestState,
  initialFailAndDropOutboundReceiptState,
  initialKeepOutboundReceiptState,
  initialRegisterLinkMemberState,
  initialRegisterPacketReceiptState,
  initialRegisterTransportMemberState,
  shouldEmitPathRequestNow,
  stepEmitPathRequestWithActions,
  stepLinkActivateMembershipWithActions,
  stepLinkRegisterListWithActions,
  stepLinkUnregisterMembershipWithActions,
  stepFailAndDropOutboundReceiptWithActions,
  stepKeepOutboundReceiptWithActions,
  stepOutboundReceiptWithActions,
  stepPacketReceiptUnregisterWithActions,
  stepRegisterLinkMemberWithActions,
  stepRegisterPacketReceiptWithActions,
  stepRegisterTransportMemberWithActions,
  stepTransportMemberUnregisterWithActions,
  transportMemberUnregisterIndex,
} from "@twistedpear/protocol";
import { equalBytes } from "../../crypto/bytes.js";
import { DestinationType } from "../../destination.js";
import { Identity } from "../../identity.js";
import type { PacketInterface } from "../../interfaces/interface.js";
import type { Link } from "../../link.js";
import { PacketReceipt } from "../../packet-receipt.js";
import {
  Packet,
  PacketContext,
  PacketHeaderType,
  PacketType,
  TransportType,
} from "../../packet.js";
import type { Timer } from "../../runtime/runtime.js";
import { buildPathRequestData } from "../path.js";
import { TRUNCATED_HASH_BYTES, hashKey } from "./shared.js";
import type {
  AnnounceHandler,
  DropObserver,
  LocalDestination,
} from "./shared.js";
import { LeafTransportLayer1 } from "./layer-1.js";
export class LeafTransportLayer2 extends LeafTransportLayer1 {
  registerInterface(iface: PacketInterface): void {
    const stepped = stepRegisterTransportMemberWithActions(
      initialRegisterTransportMemberState(),
      {
        kind: "transport/member-register-gate",
        alreadyPresent: this.interfaces.includes(iface),
      },
    );
    if (!shouldRegisterTransportMemberNow(stepped.actions)) {
      return;
    }

    this.interfaces.push(iface);
    this.interfaceTasks.set(
      iface,
      (async () => {
        try {
          for await (const packet of iface.packets) {
            await this.inboundBandwidth?.consume(packet.raw.length);
            this.bytesIn += packet.raw.length;
            await this.inbound(packet, iface);
          }
        } catch {
          // Interface consumer exited; detach quietly.
        }
      })(),
    );
  }

  unregisterInterface(iface: PacketInterface): void {
    const stepped = stepTransportMemberUnregisterWithActions(
      initialTransportMemberUnregisterState(),
      {
        kind: "transport/member-unregister-gate",
        index: this.interfaces.indexOf(iface),
      },
    );
    const index = transportMemberUnregisterIndex(stepped.actions);
    if (shouldRemoveTransportMember(stepped.actions) && index !== null) {
      this.interfaces.splice(index, 1);
    }
    this.interfaceTasks.delete(iface);
    for (const [destinationKey, entry] of this.pathTable) {
      if (entry.receivedInterface === iface) {
        this.pathTable.delete(destinationKey);
      }
    }
  }

  listInterfaces(): ReadonlyArray<PacketInterface> {
    return [...this.interfaces];
  }

  registerDestination(destination: LocalDestination): void {
    const stepped = stepRegisterTransportMemberWithActions(
      initialRegisterTransportMemberState(),
      {
        kind: "transport/member-register-gate",
        alreadyPresent: this.destinations.includes(destination),
      },
    );
    if (shouldRegisterTransportMemberNow(stepped.actions)) {
      this.destinations.push(destination);
    }
  }

  findLocalDestination(
    destinationHash: Uint8Array,
  ): LocalDestination | undefined {
    return this.destinations.find((destination) =>
      equalBytes(destination.hash, destinationHash),
    );
  }

  registerAnnounceHandler(handler: AnnounceHandler): void {
    const stepped = stepRegisterTransportMemberWithActions(
      initialRegisterTransportMemberState(),
      {
        kind: "transport/member-register-gate",
        alreadyPresent: this.announceHandlers.includes(handler),
      },
    );
    if (shouldRegisterTransportMemberNow(stepped.actions)) {
      this.announceHandlers.push(handler);
    }
  }

  registerDropObserver(observer: DropObserver): void {
    if (!this.dropObservers.includes(observer)) {
      this.dropObservers.push(observer);
    }
  }

  hasPath(destinationHash: Uint8Array): boolean {
    return this.getPathEntry(destinationHash) !== undefined;
  }

  hopsTo(destinationHash: Uint8Array): number | null {
    return this.getPathEntry(destinationHash)?.hops ?? null;
  }

  nextHopInterfaceMtu(destinationHash: Uint8Array): number | null {
    return this.getPathEntry(destinationHash)?.receivedInterface.mtu ?? null;
  }

  get pathTableCount(): number {
    return this.pathTable.size;
  }

  get activeLinkCount(): number {
    return this.activeLinks.length;
  }

  get bandwidthBytesIn(): number {
    return this.bytesIn;
  }

  get bandwidthBytesOut(): number {
    return this.bytesOut;
  }

  requestPath(
    destinationHash: Uint8Array,
    onInterface: PacketInterface | null = null,
  ): void {
    const key = hashKey(destinationHash);
    const now = this.clock.now() / 1000;
    const lastRequest = this.pathRequests.get(key) ?? 0;
    if (
      !shouldEmitPathRequestNow(
        stepEmitPathRequestWithActions(initialEmitPathRequestState(), {
          kind: "path-request/emit-gate",
          lastRequestAt: lastRequest,
          nowSeconds: now,
        }).actions,
      )
    ) {
      return;
    }

    const tag = Identity.getRandomHash(this.provider, this.entropy).subarray(
      0,
      TRUNCATED_HASH_BYTES,
    );
    const requestData = buildPathRequestData(
      destinationHash,
      this.transportEnabled ? this.transportIdentity.hash : null,
      tag,
    );

    const packet = Packet.fromFields(this.provider, {
      headerType: PacketHeaderType.HEADER_1,
      transportType: TransportType.BROADCAST,
      destinationType: DestinationType.PLAIN,
      packetType: PacketType.DATA,
      destinationHash: this.pathRequestHash,
      context: PacketContext.NONE,
      data: requestData,
    });

    void this.sendPacket(packet, { attachedInterface: onInterface });
    this.pathRequests.set(key, now);
  }

  async awaitPath(
    destinationHash: Uint8Array,
    timeoutSeconds = PATH_REQUEST_TIMEOUT_SECONDS,
  ): Promise<boolean> {
    if (this.hasPath(destinationHash)) {
      return true;
    }

    this.requestPath(destinationHash);
    return new Promise<boolean>((resolve) => {
      const armed = stepPathAwaitWithActions(initialPathAwaitState(), {
        kind: "path-await/arm",
        at: this.clock.now(),
        timeoutMs: timeoutSeconds * 1000,
      });
      let state = armed.state;
      let timer: Timer | null = null;
      let concluded = false;

      const finish = (found: boolean): void => {
        if (concluded) {
          return;
        }
        concluded = true;
        timer?.cancel();
        timer = null;
        resolve(found);
      };

      const applyIntents = (
        intents: ReturnType<typeof stepPathAwaitWithActions>["intents"],
      ): void => {
        for (const intent of intents) {
          if (
            intent.kind === "timer/cancel" &&
            intent.timer.id === PATH_AWAIT_TIMER_ID
          ) {
            timer?.cancel();
            timer = null;
          }
          if (
            intent.kind === "timer/set" &&
            intent.timer.id === PATH_AWAIT_TIMER_ID
          ) {
            timer?.cancel();
            timer = this.clock.setTimeout(() => {
              timer = null;
              const tick = stepPathAwaitWithActions(state, {
                kind: "timer/fired",
                id: PATH_AWAIT_TIMER_ID,
                at: this.clock.now(),
              });
              state = tick.state;
              applyIntents(tick.intents);
              applyActions(tick.actions);
            }, intent.timer.delayMs);
          }
        }
      };

      const applyActions = (
        actions: ReturnType<typeof stepPathAwaitWithActions>["actions"],
      ): void => {
        for (const action of actions) {
          if (action.kind === "probe") {
            const probe = stepPathAwaitWithActions(state, {
              kind: "path-await/path-status",
              present: this.hasPath(destinationHash),
              at: this.clock.now(),
            });
            state = probe.state;
            applyIntents(probe.intents);
            applyActions(probe.actions);
          }
          if (action.kind === "resolve") {
            finish(action.found);
          }
        }
      };

      applyIntents(armed.intents);
      applyActions(armed.actions);
    });
  }

  registerLink(link: Link): void {
    const registerStepped = stepLinkRegisterListWithActions(
      initialLinkRegisterListState(),
      {
        kind: "link/register-list-gate",
        initiator: link.initiator,
      },
    );
    if (shouldRegisterLinkPending(registerStepped.actions)) {
      const memberStepped = stepRegisterLinkMemberWithActions(
        initialRegisterLinkMemberState(),
        {
          kind: "link/register-member-gate",
          alreadyPresent: this.pendingLinks.includes(link),
        },
      );
      if (shouldRegisterLinkMemberNow(memberStepped.actions)) {
        this.pendingLinks.push(link);
      }
      return;
    }

    if (shouldRegisterLinkActive(registerStepped.actions)) {
      const memberStepped = stepRegisterLinkMemberWithActions(
        initialRegisterLinkMemberState(),
        {
          kind: "link/register-member-gate",
          alreadyPresent: this.activeLinks.includes(link),
        },
      );
      if (shouldRegisterLinkMemberNow(memberStepped.actions)) {
        this.activeLinks.push(link);
      }
    }
  }

  activateLink(link: Link): void {
    const activateStepped = stepLinkActivateMembershipWithActions(
      initialLinkActivateMembershipState(),
      {
        kind: "link/activate-membership-gate",
        pendingIndex: this.pendingLinks.indexOf(link),
        alreadyActive: this.activeLinks.includes(link),
      },
    );
    const pendingIndex = pendingLinkMembershipRemoveIndex(
      activateStepped.actions,
    );
    if (
      shouldRemovePendingLinkMembershipActions(activateStepped.actions) &&
      pendingIndex !== null
    ) {
      this.pendingLinks.splice(pendingIndex, 1);
    }
    if (shouldAppendActiveLinkMembershipActions(activateStepped.actions)) {
      this.activeLinks.push(link);
    }
  }

  unregisterLink(link: Link): void {
    const unregisterStepped = stepLinkUnregisterMembershipWithActions(
      initialLinkUnregisterMembershipState(),
      {
        kind: "link/unregister-membership-gate",
        pendingIndex: this.pendingLinks.indexOf(link),
        activeIndex: this.activeLinks.indexOf(link),
      },
    );
    const pendingIndex = pendingLinkUnregisterRemoveIndex(
      unregisterStepped.actions,
    );
    if (
      shouldRemovePendingLinkUnregisterActions(unregisterStepped.actions) &&
      pendingIndex !== null
    ) {
      this.pendingLinks.splice(pendingIndex, 1);
    }
    const activeIndex = activeLinkUnregisterRemoveIndex(
      unregisterStepped.actions,
    );
    if (
      shouldRemoveActiveLinkUnregisterActions(unregisterStepped.actions) &&
      activeIndex !== null
    ) {
      this.activeLinks.splice(activeIndex, 1);
    }
  }

  async sendPacket(
    packet: Packet,
    options: {
      createReceipt?: boolean;
      attachedInterface?: PacketInterface | null;
    } = {},
  ): Promise<PacketReceipt | null> {
    const createReceipt = options.createReceipt === true;
    let receipt: PacketReceipt | null = null;

    const registerStepped = stepRegisterPacketReceiptWithActions(
      initialRegisterPacketReceiptState(),
      {
        kind: "receipt/register-gate",
        createReceipt,
      },
    );
    if (shouldRegisterPacketReceiptNow(registerStepped.actions)) {
      const nowSeconds = () => this.clock.now() / 1000;
      receipt = new PacketReceipt(
        packet.hash(),
        packet.truncatedHash(),
        packet.destinationHash,
        {
          sentAt: nowSeconds(),
          now: nowSeconds,
          clock: this.clock,
        },
      );
      this.receipts.push(receipt);
    }

    const sent = await this.outbound(packet, options.attachedInterface ?? null);
    const outcomeStepped = stepOutboundReceiptWithActions(
      initialOutboundReceiptState(),
      {
        kind: "receipt/outbound-gate",
        createReceipt,
        sent,
      },
    );
    const failAndDropStepped = stepFailAndDropOutboundReceiptWithActions(
      initialFailAndDropOutboundReceiptState(),
      {
        kind: "receipt/fail-and-drop-gate",
        failAndDrop: shouldOutboundFailAndDropReceipt(outcomeStepped.actions),
        receiptPresent: receipt !== null,
      },
    );
    if (shouldFailAndDropOutboundReceiptNow(failAndDropStepped.actions)) {
      receipt!.markFailed();
      const receiptStepped = stepPacketReceiptUnregisterWithActions(
        initialPacketReceiptUnregisterState(),
        {
          kind: "receipt/unregister-gate",
          index: this.receipts.indexOf(receipt!),
        },
      );
      const index = packetReceiptUnregisterIndex(receiptStepped.actions);
      if (shouldRemovePacketReceipt(receiptStepped.actions) && index !== null) {
        this.receipts.splice(index, 1);
      }
      return null;
    }
    const keepStepped = stepKeepOutboundReceiptWithActions(
      initialKeepOutboundReceiptState(),
      {
        kind: "receipt/keep-outbound-gate",
        planKeep: shouldOutboundKeepReceipt(outcomeStepped.actions),
        sent,
      },
    );
    if (!shouldKeepOutboundReceiptNow(keepStepped.actions)) {
      return null;
    }

    return receipt;
  }
}
