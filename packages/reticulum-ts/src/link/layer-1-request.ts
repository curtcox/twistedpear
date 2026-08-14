import {
  initialLinkAppRequestState,
  initialLinkAppRequestTransmitState,
  initialLinkRequestAllowState,
  initialPackLinkRequestState,
  initialUtf8EncodeState,
  packLinkRequestRawFromActions,
  shouldAllowLinkRequest,
  shouldKeepPendingLinkAppRequestTransmit,
  shouldRejectLinkAppRequest,
  shouldSendLinkAppRequest,
  shouldUnregisterLinkAppRequestTransmit,
  shouldUsePackLinkRequest,
  shouldUseUtf8Encode,
  stepLinkAppRequestTransmitWithActions,
  stepLinkAppRequestWithActions,
  stepLinkRequestAllowWithActions,
  stepPackLinkRequestWithActions,
  stepUtf8EncodeWithActions,
  utf8EncodeRawFromActions,
} from "./protocol.js";

import { Identity } from "../identity.js";
import { LinkRequestReceipt } from "../link-request-receipt.js";
import {
  Packet,
  PacketContext,
  PacketHeaderType,
  PacketType,
  TransportType,
} from "../packet.js";
import { DestinationType } from "../destination.js";
import { linkRequestTimeoutForRtt } from "./shared.js";
import type { LinkRequestOptions } from "./shared.js";
import type { Link } from "../link.js";
import type { RequestReceiptCallbacks } from "../link-request-receipt.js";
import { LinkLayer1 } from "./layer-1.js";

export class LinkLayer1Request extends LinkLayer1 {
  async request(
    path: string,
    data: Uint8Array | null = null,
    options: LinkRequestOptions = {},
  ): Promise<LinkRequestReceipt | false> {
    const packedRequest = this.packAppRequest(path, data);
    if (packedRequest === null) {
      return false;
    }
    if (!this.shouldSendPackedAppRequest(packedRequest)) {
      return false;
    }
    return this.transmitPackedAppRequest(packedRequest, options);
  }

  private packAppRequest(
    path: string,
    data: Uint8Array | null,
  ): Uint8Array | null {
    const requestAllow = stepLinkRequestAllowWithActions(
      initialLinkRequestAllowState(),
      {
        kind: "link/request-allow-gate",
        status: this.status,
        rtt: this.rtt,
      },
    );
    if (!shouldAllowLinkRequest(requestAllow.actions)) {
      return null;
    }

    const pathEncode = stepUtf8EncodeWithActions(initialUtf8EncodeState(), {
      kind: "utf8/encode-gate",
      value: path,
    });
    const pathBytes = utf8EncodeRawFromActions(pathEncode.actions);
    if (!shouldUseUtf8Encode(pathEncode.actions) || pathBytes === null) {
      throw new Error("Link.request: missing utf8 use-raw action");
    }
    const pathHash = Identity.truncatedHash(this.provider, pathBytes);
    const packStepped = stepPackLinkRequestWithActions(
      initialPackLinkRequestState(),
      {
        kind: "link-request-codec/pack-gate",
        requestedAt: this.clock.now() / 1000,
        pathHash,
        data,
      },
    );
    if (!shouldUsePackLinkRequest(packStepped.actions)) {
      return null;
    }
    return packLinkRequestRawFromActions(packStepped.actions);
  }

  private shouldSendPackedAppRequest(packedRequest: Uint8Array): boolean {
    const appRequestStepped = stepLinkAppRequestWithActions(
      initialLinkAppRequestState(),
      {
        kind: "link/app-request-gate",
        status: this.status,
        rtt: this.rtt,
        packedLength: packedRequest.length,
        mdu: this.mdu,
      },
    );
    if (shouldRejectLinkAppRequest(appRequestStepped.actions)) {
      return false;
    }
    return shouldSendLinkAppRequest(appRequestStepped.actions);
  }

  private async transmitPackedAppRequest(
    packedRequest: Uint8Array,
    options: LinkRequestOptions,
  ): Promise<LinkRequestReceipt | false> {
    const timeout = options.timeout ?? linkRequestTimeoutForRtt(this.rtt!);
    const packet = Packet.fromFields(this.provider, {
      headerType: PacketHeaderType.HEADER_1,
      transportType: TransportType.BROADCAST,
      destinationType: DestinationType.LINK,
      packetType: PacketType.DATA,
      destinationHash: this.linkId,
      context: PacketContext.REQUEST,
      data: this.encrypt(packedRequest),
    });

    const pending = new LinkRequestReceipt({
      link: this as unknown as Link,
      requestId: packet.truncatedHash(),
      timeout,
      now: () => this.clock.now() / 1000,
      requestSize: packedRequest.length,
      callbacks: linkRequestCallbacks(options),
    });

    const sentReceipt = await this.transport.sendPacket(packet, {
      attachedInterface: this.attachedInterface,
      createReceipt: true,
    });
    this.hadOutbound(false);

    const transmitStepped = stepLinkAppRequestTransmitWithActions(
      initialLinkAppRequestTransmitState(),
      {
        kind: "link/app-request-transmit-gate",
        receiptPresent: sentReceipt !== null,
      },
    );
    if (shouldUnregisterLinkAppRequestTransmit(transmitStepped.actions)) {
      this.unregisterPendingRequest(pending);
      return false;
    }
    if (!shouldKeepPendingLinkAppRequestTransmit(transmitStepped.actions)) {
      return false;
    }

    pending.attachPacketReceipt(sentReceipt!);
    return pending;
  }
}

function linkRequestCallbacks(
  options: LinkRequestOptions,
): RequestReceiptCallbacks {
  return {
    ...(options.response === undefined ? {} : { response: options.response }),
    ...(options.failed === undefined ? {} : { failed: options.failed }),
  };
}
