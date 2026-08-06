import { NamespacedKvService } from "../services/storage-kv.js";
import { diffWidgetTrees, type WidgetPatch } from "../ui/diff.js";
import { validateWidgetTree } from "../ui/validate.js";
import type { WidgetTree } from "../ui/schema.js";
import { findWidgetNode } from "./shared.js";
import { MiniappHostLayer1Base } from "./layer-1-base.js";

export abstract class MiniappHostLayer1HandlersCore extends MiniappHostLayer1Base {
  protected registerCoreHandlers(): void {
    this.broker.register("ui", "render", null, async (request) => {
      const tree = (request.payload as { tree: WidgetTree }).tree;
      validateWidgetTree(tree);
      let patches: ReadonlyArray<WidgetPatch> = [];
      if (this.active !== null) {
        patches = diffWidgetTrees(this.active.widgetTree, tree);
        this.active.widgetTree = tree;
        if (patches.length > 0) {
          this.logActive(
            this.active.manifest.name,
            `ui ${patches.length} patch(es)`,
          );
        }
      }

      this.options.callbacks?.onWidgetTree?.(tree, patches);
      return { accepted: true, patchCount: patches.length };
    });

    this.broker.register("ui", "subscribe", null, async () => ({
      subscribed: true,
    }));

    this.broker.register("ui", "event", null, async (request) => {
      if (this.active === null) {
        throw new Error("No mini-app is running");
      }

      const payload = request.payload as {
        nodeId: string;
        event: string;
        value?: unknown;
      };
      const tree = this.active.widgetTree;
      if (tree === null || findWidgetNode(tree.root, payload.nodeId) === null) {
        throw new Error(`Unknown widget node: ${payload.nodeId}`);
      }

      await this.active.lifecycle.deliverUiEvent(payload);
      return { delivered: true };
    });

    this.broker.register(
      "identity",
      "destinationHash",
      "identity",
      async (_request, context) =>
        this.identityService.destinationHash(
          context.appId,
          context.publisherPublicKey,
        ),
    );

    this.broker.register(
      "identity",
      "sign",
      "identity",
      async (request, context) => {
        const payload = (request.payload as { payload: Uint8Array }).payload;
        return this.identityService.sign(
          context.appId,
          context.publisherPublicKey,
          payload,
        );
      },
    );

    this.broker.register(
      "storage.kv",
      "get",
      "storage:kv",
      async (request, context) => {
        const key = (request.payload as { key: string }).key;
        const service = new NamespacedKvService(
          this.options.kvBackend,
          context.appId,
          this.kvQuotaFor(context.appId),
        );
        return service.get(key);
      },
    );

    this.broker.register(
      "storage.kv",
      "set",
      "storage:kv",
      async (request, context) => {
        const { key, value } = request.payload as {
          key: string;
          value: Uint8Array;
        };
        const service = new NamespacedKvService(
          this.options.kvBackend,
          context.appId,
          this.kvQuotaFor(context.appId),
        );
        await service.set(key, value);
        return { ok: true };
      },
    );

    this.broker.register(
      "storage.kv",
      "delete",
      "storage:kv",
      async (request, context) => {
        const key = (request.payload as { key: string }).key;
        const service = new NamespacedKvService(
          this.options.kvBackend,
          context.appId,
          this.kvQuotaFor(context.appId),
        );
        await service.delete(key);
        return { ok: true };
      },
    );

    const beeBackend = this.options.beeBackend;
    if (beeBackend !== undefined) {
      this.broker.register(
        "storage.bee",
        "open",
        "storage:hyperbee",
        async (_request, context) => beeBackend.descriptor(context.appId),
      );

      this.broker.register(
        "storage.bee",
        "get",
        "storage:hyperbee",
        async (request, context) => {
          const key = (request.payload as { key: string }).key;
          return beeBackend.get(context.appId, key);
        },
      );

      this.broker.register(
        "storage.bee",
        "put",
        "storage:hyperbee",
        async (request, context) => {
          const { key, value } = request.payload as {
            key: string;
            value: Uint8Array;
          };
          await beeBackend.put(context.appId, key, value);
          return { ok: true };
        },
      );

      this.broker.register(
        "storage.bee",
        "del",
        "storage:hyperbee",
        async (request, context) => {
          const key = (request.payload as { key: string }).key;
          await beeBackend.del(context.appId, key);
          return { ok: true };
        },
      );

      this.broker.register(
        "storage.bee",
        "list",
        "storage:hyperbee",
        async (request, context) => {
          const options =
            (request.payload as {
              gte?: string;
              lt?: string;
              limit?: number;
            }) ?? {};
          return beeBackend.list(context.appId, options);
        },
      );
    } else {
      this.broker.register(
        "storage.bee",
        "open",
        "storage:hyperbee",
        async () => {
          throw new Error("Hyperbee storage is not configured on this host");
        },
      );
    }

    this.broker.register(
      "lxmf",
      "send",
      "lxmf:send",
      async (request, context) =>
        this.lxmfService.send(context.appId, request.payload as never),
    );
    this.broker.register(
      "lxmf",
      "receive",
      "lxmf:receive",
      async (_request, context) => this.lxmfService.receive(context.appId),
    );
    this.broker.register(
      "announce",
      "publish",
      "announce:publish",
      async (request, context) => {
        const payload = request.payload as
          { appData?: Uint8Array; namespace?: string } | undefined;
        await this.announceService.publish(
          context.appId,
          payload?.appData,
          payload?.namespace,
        );
        return { published: true };
      },
    );
    this.broker.register(
      "announce",
      "subscribe",
      "announce:subscribe",
      async (request, context) => {
        const namespace = (
          request.payload as { namespace?: string } | undefined
        )?.namespace;
        return this.announceService.subscribe(context.appId, namespace);
      },
    );
    this.broker.register(
      "resource",
      "fetch",
      "resource:fetch",
      async (request, context) => {
        if (this.resourceService === null) {
          throw new Error("Resource fetch is not configured on this host");
        }

        return this.resourceService.fetch(
          context.appId,
          request.payload as never,
        );
      },
    );
    this.broker.register(
      "workspace",
      "list",
      "workspace",
      async (request, context) => {
        const prefix =
          (request.payload as { prefix?: string } | undefined)?.prefix ?? "";
        return this.workspace.list(context.appId, prefix);
      },
    );

    this.broker.register(
      "workspace",
      "read",
      "workspace",
      async (request, context) => {
        const path = (request.payload as { path: string }).path;
        return {
          path,
          content: await this.workspace.read(context.appId, path),
        };
      },
    );

    this.broker.register(
      "workspace",
      "write",
      "workspace",
      async (request, context) => {
        const { path, content } = request.payload as {
          path: string;
          content: string;
        };
        if (typeof content !== "string") {
          throw new Error("Workspace content must be a string");
        }

        return this.workspace.write(context.appId, path, content);
      },
    );

    this.broker.register(
      "workspace",
      "patch",
      "workspace",
      async (request, context) => {
        const { path, baseLength, edits } = request.payload as {
          path: string;
          baseLength: number;
          edits: ReadonlyArray<{ start: number; end: number; text: string }>;
        };
        return this.workspace.patch(context.appId, path, baseLength, edits);
      },
    );

    this.broker.register(
      "workspace",
      "delete",
      "workspace",
      async (request, context) => {
        const path = (request.payload as { path: string }).path;
        await this.workspace.delete(context.appId, path);
        return { ok: true };
      },
    );
  }
}
