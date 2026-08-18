import { HOST_API_VERSION } from "../host-api.js";
import type { HostInfo } from "../services/host-info.js";
import {
  DeviceBrokerServiceError,
  type DeviceOpenRequest,
  type DeviceSessionHandle,
} from "../services/device.js";
import { FreenetBrokerServiceError } from "../services/freenet.js";
import { RelayBrokerServiceError } from "../services/relay.js";
import type { StreamSink } from "../media-stream.js";
import { MiniappHostLayer1HandlersServices } from "./layer-1-handlers-services.js";

export abstract class MiniappHostLayer1HandlersDevice extends MiniappHostLayer1HandlersServices {
  protected registerDeviceHandlers(): void {
    this.registerRelayHandlers();
    this.registerFreenetHandlers();
    this.registerDeviceIoHandlers();
    this.registerDeviceShareHandlers();
    this.registerPresenceHostHandlers();
  }

  private registerRelayHandlers(): void {
    const relay = () => {
      if (this.relayService === null)
        throw new RelayBrokerServiceError(
          "RELAY_UNCONFIGURED",
          "Relay/interface management is not configured on this host",
        );
      return this.relayService;
    };
    this.broker.register(
      "relay",
      "setMode",
      "relay:configure",
      (request, context) =>
        Promise.resolve(
          relay().setMode(
            context.appId,
            request.payload as { mode: "off" | "bridge" | "transport-node" },
          ),
        ),
    );
    this.broker.register(
      "relay",
      "enable",
      "relay:configure",
      (request, context) =>
        Promise.resolve(
          relay().enable(
            context.appId,
            request.payload as {
              kind: import("../services/relay.js").RelayInterfaceKind;
              options?: Record<string, unknown>;
            },
          ),
        ),
    );
    this.broker.register(
      "relay",
      "disable",
      "relay:configure",
      (request, context) =>
        Promise.resolve(
          relay().disable(
            context.appId,
            request.payload as {
              kind: import("../services/relay.js").RelayInterfaceKind;
            },
          ),
        ),
    );
    this.broker.register(
      "relay",
      "setDirection",
      "relay:configure",
      (request, context) =>
        Promise.resolve(
          relay().setDirection(
            context.appId,
            request.payload as {
              kind: import("../services/relay.js").RelayInterfaceKind;
              direction: import("../services/relay.js").InterfaceDirection;
            },
          ),
        ),
    );
    this.broker.register(
      "relay",
      "configure",
      "relay:configure",
      (request, context) =>
        Promise.resolve(
          relay().configure(
            context.appId,
            request.payload as {
              kind: import("../services/relay.js").RelayInterfaceKind;
              patch: Record<string, unknown>;
            },
          ),
        ),
    );
    this.broker.register(
      "relay",
      "setPolicy",
      "relay:configure",
      (request, context) =>
        Promise.resolve(
          relay().setPolicy(
            context.appId,
            request.payload as {
              policy: import("../services/relay.js").RelayPolicyMatrix;
            },
          ),
        ),
    );
    this.broker.register("relay", "list", "relay:read", (_request, context) =>
      Promise.resolve(relay().list(context.appId)),
    );
    this.broker.register("relay", "status", "relay:read", (_request, context) =>
      Promise.resolve(relay().status(context.appId)),
    );
    this.broker.register(
      "relay",
      "diagnostics",
      "relay:read",
      (_request, context) =>
        Promise.resolve(relay().diagnostics(context.appId)),
    );
  }

  private registerFreenetHandlers(): void {
    const freenet = () => {
      if (this.freenetService === null) {
        throw new FreenetBrokerServiceError(
          "FREENET_UNCONFIGURED",
          "Freenet contract access is not configured on this host",
        );
      }
      return this.freenetService;
    };
    this.broker.register(
      "freenet",
      "get",
      "freenet:contract",
      (request, context) =>
        Promise.resolve(
          freenet().get(context, request.payload as { keyHex: unknown }),
        ),
    );
    this.broker.register(
      "freenet",
      "put",
      "freenet:contract",
      (request, context) =>
        Promise.resolve(
          freenet().put(
            context,
            request.payload as {
              wasmHex: unknown;
              parametersHex: unknown;
              stateHex: unknown;
            },
          ),
        ),
    );
    this.broker.register(
      "freenet",
      "update",
      "freenet:contract",
      (request, context) =>
        Promise.resolve(
          freenet().update(
            context,
            request.payload as {
              keyHex: unknown;
              codeHashHex: unknown;
              stateHex: unknown;
            },
          ),
        ),
    );
  }

  private registerDeviceIoHandlers(): void {
    const device = () => {
      if (this.deviceService === null) {
        throw new DeviceBrokerServiceError(
          "DEVICE_UNCONFIGURED",
          "Device I/O is not configured on this host",
        );
      }
      return this.deviceService;
    };
    // inventory/diagnostics: presence-gated; holder redacted unless a device:* grant.
    this.broker.register(
      "device",
      "inventory",
      "presence",
      (_request, context) => Promise.resolve(device().inventory(context.appId)),
    );
    this.broker.register(
      "device",
      "diagnostics",
      "presence",
      (_request, context) =>
        Promise.resolve(
          device().diagnostics(context.appId, context.grantedCapabilities),
        ),
    );
    this.broker.register("device", "open", null, (request, context) => {
      this.assertForeground(context.appId, context.publisherPublicKey);
      return Promise.resolve(
        device().open(
          context.appId,
          context.publisherPublicKey,
          context.declaredCapabilities,
          context.grantedCapabilities,
          request.payload as DeviceOpenRequest,
        ),
      );
    });
    this.broker.register("device", "close", null, (request, context) =>
      Promise.resolve(
        device().close(
          context.appId,
          request.payload as { handle: DeviceSessionHandle },
        ),
      ),
    );
    this.broker.register("device", "read", null, (request, context) =>
      Promise.resolve(
        device().read(
          context.appId,
          request.payload as { handle: DeviceSessionHandle },
        ),
      ),
    );
    this.broker.register("device", "write", null, async (request, context) => {
      await device().write(
        context.appId,
        context.publisherPublicKey,
        request.payload as {
          handle: DeviceSessionHandle;
          command: import("@twistedpear/protocol").DeviceCommand;
        },
      );
      return { written: true };
    });
    this.broker.register("device", "stream", null, (request, context) => {
      this.assertForeground(context.appId, context.publisherPublicKey);
      return Promise.resolve(
        device().stream(
          context.appId,
          context.declaredCapabilities,
          context.grantedCapabilities,
          request.payload as {
            handle: DeviceSessionHandle;
            peer: string;
            constraints?: import("../device-manager.js").DeviceStreamConstraints;
          },
        ),
      );
    });
    this.broker.register("device", "closeStream", null, (request, context) =>
      Promise.resolve(
        device().closeStream(
          context.appId,
          request.payload as { handle: string },
        ),
      ),
    );
  }

  private registerDeviceShareHandlers(): void {
    const device = () => {
      if (this.deviceService === null) {
        throw new DeviceBrokerServiceError(
          "DEVICE_UNCONFIGURED",
          "Device I/O is not configured on this host",
        );
      }
      return this.deviceService;
    };
    this.broker.register(
      "device",
      "streams",
      "device:stream",
      (_request, context) => Promise.resolve(device().streams(context.appId)),
    );
    this.broker.register(
      "device",
      "shareOffers",
      "device:share-policy:read",
      (_request, context) =>
        Promise.resolve(device().shareOffers(context.appId)),
    );
    this.broker.register(
      "device",
      "requestShareOffer",
      "device:stream",
      (request, context) =>
        Promise.resolve(
          device().requestShareOffer(
            context.appId,
            request.payload as { purpose: string },
          ),
        ),
    );
    this.broker.register(
      "device",
      "revokeShareOffer",
      "device:stream",
      (request, context) =>
        Promise.resolve(
          device().revokeShareOffer(
            context.appId,
            request.payload as { id: string },
          ),
        ),
    );
    const inbound = () => {
      if (this.inboundMedia === null)
        throw new DeviceBrokerServiceError(
          "DEVICE_UNCONFIGURED",
          "Inbound media is not configured",
        );
      return this.inboundMedia;
    };
    this.broker.register(
      "device",
      "incoming",
      "device:stream",
      (request, context) =>
        Promise.resolve(
          inbound().pollOffers(
            context.appId,
            (request.payload as { cursor?: string } | undefined)?.cursor,
          ),
        ),
    );
    this.broker.register(
      "device",
      "accept",
      "device:stream",
      (request, context) => {
        const payload = request.payload as {
          offerId: string;
          sink: StreamSink;
        };
        return Promise.resolve(
          inbound().accept(context.appId, payload.offerId, payload.sink),
        );
      },
    );
    this.broker.register(
      "device",
      "decline",
      "device:stream",
      async (request, context) => {
        const payload = request.payload as { offerId: string; reason?: string };
        await inbound().decline(context.appId, payload.offerId, payload.reason);
        return { declined: true };
      },
    );
  }

  private registerPresenceHostHandlers(): void {
    this.broker.register("presence", "snapshot", "presence", () => {
      if (this.presenceService === null) {
        return Promise.resolve({
          peers: 0,
          onlineInterfaces: 0,
          preferredInterface: null,
        });
      }

      return Promise.resolve(this.presenceService.snapshot());
    });

    this.broker.register(
      "host",
      "info",
      "presence",
      async (_request, context): Promise<HostInfo> => {
        const info = await this.hostInfoService.info();
        const devices =
          info.devices ??
          (this.deviceService === null
            ? undefined
            : (await this.deviceService.inventory(context.appId)).map(
                (entry) => ({
                  class: entry.class,
                  availability: entry.availability,
                  tiers: entry.tiers,
                }),
              ));
        return {
          ...info,
          hostApiVersion: info.hostApiVersion || HOST_API_VERSION,
          grantedCapabilities: [...context.grantedCapabilities],
          ...(devices !== undefined ? { devices } : {}),
        };
      },
    );
  }
}
