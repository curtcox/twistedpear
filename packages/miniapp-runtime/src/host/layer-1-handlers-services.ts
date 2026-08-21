import type { PeerHandle } from "@twistedpear/peer-discovery";
import {
  AiServiceError,
  type AiChatRequest,
  type AiEmbedRequest,
  type AiVectorSearchRequest,
} from "../services/ai.js";
import { AppsServiceError } from "../services/apps.js";
import { LinkServiceError, type LinkProbeOptions } from "../services/links.js";
import {
  PeerServiceError,
  type PeerRequestPayload,
} from "../services/peers.js";
import { MiniappHostLayer1HandlersCore } from "./layer-1-handlers-core.js";

export abstract class MiniappHostLayer1HandlersServices extends MiniappHostLayer1HandlersCore {
  protected registerServicesHandlers(): void {
    this.registerAiHandlers();
    this.registerAppsShareHandlers();
    this.registerAppChannelHandlers();
    this.registerPeersLinksHandlers();
  }

  private registerAiHandlers(): void {
    this.broker.register("ai", "chat", "ai:chat", async (request, context) => {
      if (this.aiService === null) {
        throw new AiServiceError(
          "AI_UNCONFIGURED",
          "AI is not configured on this host",
        );
      }

      return this.aiService.chat(
        context.appId,
        request.payload as AiChatRequest,
      );
    });

    this.broker.register(
      "ai",
      "chatStreamStart",
      "ai:chat",
      (request, context) => {
        if (this.aiService === null) {
          throw new AiServiceError(
            "AI_UNCONFIGURED",
            "AI is not configured on this host",
          );
        }
        const streamId = `ai-stream-${this.nextAiStreamId++}`;
        this.aiStreams.set(streamId, {
          appId: context.appId,
          iterator: this.aiService.stream(
            context.appId,
            request.payload as AiChatRequest,
          ),
        });
        return { streamId };
      },
    );

    this.broker.register(
      "ai",
      "chatStreamNext",
      "ai:chat",
      async (request, context) => {
        const streamId = this.aiStreamId(request.payload);
        const session = this.aiStreams.get(streamId);
        if (session === undefined || session.appId !== context.appId) {
          throw new AiServiceError(
            "AI_BAD_REQUEST",
            "Unknown AI stream session.",
          );
        }
        try {
          const result = await session.iterator.next();
          if (result.done === true) this.aiStreams.delete(streamId);
          return result;
        } catch (error) {
          this.aiStreams.delete(streamId);
          throw error;
        }
      },
    );

    this.broker.register(
      "ai",
      "chatStreamCancel",
      "ai:chat",
      async (request, context) => {
        const streamId = this.aiStreamId(request.payload);
        const session = this.aiStreams.get(streamId);
        if (session === undefined || session.appId !== context.appId)
          return { cancelled: false };
        this.aiStreams.delete(streamId);
        await session.iterator.return?.();
        return { cancelled: true };
      },
    );

    this.broker.register(
      "ai",
      "embed",
      "ai:embed",
      async (request, context) => {
        if (this.aiService === null) {
          throw new AiServiceError(
            "AI_UNCONFIGURED",
            "AI is not configured on this host",
          );
        }
        return this.aiService.embed(
          context.appId,
          request.payload as AiEmbedRequest,
        );
      },
    );

    this.broker.register(
      "ai",
      "search",
      "ai:embed",
      async (request, context) => {
        if (this.aiService === null) {
          throw new AiServiceError(
            "AI_UNCONFIGURED",
            "AI is not configured on this host",
          );
        }
        return this.aiService.search(
          context.appId,
          request.payload as AiVectorSearchRequest,
        );
      },
    );
  }

  private registerAppsShareHandlers(): void {
    const appsService = () => {
      if (this.appsService === null) {
        throw new AppsServiceError(
          "APPS_UNCONFIGURED",
          "App packaging is not configured on this host",
        );
      }

      return this.appsService;
    };

    this.broker.register(
      "apps",
      "compile",
      "apps:package",
      async (request, context) =>
        appsService().compile(
          context,
          request.payload as { projectPrefix: string },
        ),
    );

    this.broker.register(
      "apps",
      "format",
      "apps:package",
      async (request, context) =>
        appsService().format(context, request.payload as { content: unknown }),
    );

    this.broker.register(
      "apps",
      "diagnostics",
      "apps:package",
      async (request, context) =>
        appsService().diagnostics(
          context,
          request.payload as { projectPrefix: unknown; path?: unknown },
        ),
    );

    this.broker.register(
      "apps",
      "package",
      "apps:package",
      async (request, context) =>
        appsService().package(
          context,
          request.payload as { projectPrefix: string; manifest: unknown },
        ),
    );

    this.broker.register(
      "apps",
      "publish",
      "apps:publish",
      async (request, context) =>
        appsService().publish(context, request.payload as { t256: unknown }),
    );

    this.broker.register(
      "apps",
      "install",
      "apps:install",
      async (request, context) =>
        appsService().install(context, request.payload as { t256: unknown }),
    );

    this.broker.register(
      "apps",
      "preview",
      "apps:preview",
      async (request, context) =>
        appsService().preview(
          context,
          request.payload as {
            projectPrefix: string;
            manifest: unknown;
            grants: unknown;
          },
        ),
    );

    this.broker.register(
      "apps",
      "stopPreview",
      "apps:preview",
      async (_request, context) => {
        await appsService().stopPreview(context);
        return { ok: true };
      },
    );

    this.broker.register(
      "share.cas",
      "put",
      "share:cas",
      async (request, context) => {
        const casBackend = this.options.casBackend;
        if (casBackend === undefined) {
          throw new Error(
            "Content-addressed sharing is not configured on this host",
          );
        }

        const content = (request.payload as { content: string }).content;
        if (typeof content !== "string") {
          throw new Error("share.cas content must be a string");
        }

        return casBackend.put(context.appId, new TextEncoder().encode(content));
      },
    );

    this.broker.register(
      "share.cas",
      "get",
      "share:cas",
      async (request, context) => {
        const casBackend = this.options.casBackend;
        if (casBackend === undefined) {
          throw new Error(
            "Content-addressed sharing is not configured on this host",
          );
        }

        const t256 = (request.payload as { t256: string }).t256;
        const bytes = await casBackend.get(context.appId, t256);
        return {
          content: bytes === null ? null : new TextDecoder().decode(bytes),
        };
      },
    );
  }

  private registerAppChannelHandlers(): void {
    const caller = (context: {
      appId: string;
      publisherPublicKey: string;
    }) => ({
      appId: context.appId,
      publisherPublicKey: context.publisherPublicKey,
    });
    this.broker.register(
      "apps.channel",
      "open",
      "apps:channel",
      (request, context) =>
        this.channelService.open(caller(context), request.payload),
    );
    this.broker.register(
      "apps.channel",
      "send",
      "apps:channel",
      (request, context) =>
        this.channelService.send(caller(context), request.payload),
    );
    this.broker.register(
      "apps.channel",
      "receive",
      "apps:channel",
      (_request, context) => this.channelService.receive(caller(context)),
    );
    this.broker.register(
      "apps.channel",
      "close",
      "apps:channel",
      (request, context) =>
        this.channelService.close(caller(context), request.payload),
    );
    this.broker.register(
      "apps.channel",
      "peers",
      "apps:channel",
      (_request, context) => this.channelService.peers(caller(context)),
    );
  }

  private registerPeersLinksHandlers(): void {
    const peers = () => {
      if (this.peerService === null)
        throw new PeerServiceError(
          "PEERS_UNCONFIGURED",
          "Peer discovery is not configured on this host",
        );
      return this.peerService;
    };
    const runtimeId = (appId: string) =>
      this.appById(appId)?.runtimeId ?? `external:${appId}`;
    this.broker.register(
      "peers",
      "request",
      "peer:connect",
      async (request, context) =>
        peers().request(
          context.appId,
          runtimeId(context.appId),
          request.payload as PeerRequestPayload,
        ),
    );
    this.broker.register(
      "peers",
      "listen",
      "peer:connect",
      async (request, context) =>
        peers().listen(
          context.appId,
          runtimeId(context.appId),
          request.payload as PeerRequestPayload,
        ),
    );
    this.broker.register("peers", "diagnostics", "peer:connect", async () =>
      peers().diagnostics(),
    );
    this.broker.register("peers", "info", "peer:connect", (request, context) =>
      peers().info(
        context.appId,
        runtimeId(context.appId),
        (request.payload as { handle: PeerHandle }).handle,
      ),
    );
    this.broker.register(
      "peers",
      "close",
      "peer:connect",
      async (request, context) => {
        await peers().close(
          context.appId,
          runtimeId(context.appId),
          (request.payload as { handle: PeerHandle }).handle,
        );
        return { closed: true };
      },
    );

    const links = () => {
      if (this.linkService === null) {
        throw new LinkServiceError(
          "LINK_UNCONFIGURED",
          "Link observation is not configured on this host",
        );
      }
      return this.linkService;
    };
    this.broker.register(
      "links",
      "peers",
      "link:observe",
      async (_request, context) => links().peers(context.appId),
    );
    this.broker.register(
      "links",
      "watch",
      "link:observe",
      async (request, context) =>
        links().watch(
          context.appId,
          (request.payload as { cursor?: string } | undefined)?.cursor,
        ),
    );
    this.broker.register(
      "links",
      "probe",
      "link:probe",
      async (request, context) => {
        const payload = request.payload as {
          peer: PeerHandle | string;
          options?: LinkProbeOptions;
        };
        const targetId =
          typeof payload.peer === "string" ? payload.peer : payload.peer.id;
        this.assertEgressAllowed(
          context.appId,
          "link:probe",
          "peer",
          targetId,
        );
        return links().probe(
          context.appId,
          payload.peer as PeerHandle,
          payload.options,
        );
      },
    );
  }
}
