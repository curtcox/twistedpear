import { beforeEach, describe, expect, it } from "vitest";
import type { BrokerRequest } from "@twistedpear/miniapp-runtime";
import { setMiniappHostTransport } from "../src/rpc.js";
import * as announce from "../src/announce.js";
import * as apps from "../src/apps.js";
import * as freenet from "../src/freenet.js";
import * as host from "../src/host.js";
import * as identity from "../src/identity.js";
import * as lxmf from "../src/lxmf.js";
import * as presence from "../src/presence.js";
import * as resource from "../src/resource.js";
import * as share from "../src/share.js";
import * as storage from "../src/storage.js";
import * as workspace from "../src/workspace.js";

const calls: BrokerRequest[] = [];
let nextResult: unknown = null;

beforeEach(() => {
  calls.length = 0;
  nextResult = null;
  setMiniappHostTransport({
    request(request) {
      calls.push(request);
      return Promise.resolve({ id: request.id, ok: true, result: nextResult });
    },
  });
});

interface SurfaceCase {
  readonly label: string;
  readonly call: () => Promise<unknown>;
  readonly namespace: string;
  readonly method: string;
  readonly capability: string | undefined;
  readonly payload?: unknown;
  /** Host result to serve, when the wrapper reshapes or returns it. */
  readonly result?: unknown;
  readonly expected?: unknown;
}

const MANIFEST = {
  name: "app",
  version: "1.0.0",
  entry: "bundle.js",
  capabilities: ["ui"],
};

const cases: ReadonlyArray<SurfaceCase> = [
  {
    label: "announce.publish",
    call: () => announce.publish(new Uint8Array([1]), "ns"),
    namespace: "announce",
    method: "publish",
    capability: "announce:publish",
    payload: { appData: new Uint8Array([1]), namespace: "ns" },
  },
  {
    label: "announce.subscribe",
    call: () => announce.subscribe("ns"),
    namespace: "announce",
    method: "subscribe",
    capability: "announce:subscribe",
    payload: { namespace: "ns" },
    result: [],
    expected: [],
  },
  {
    label: "host.info",
    call: () => host.info(),
    namespace: "host",
    method: "info",
    capability: "presence",
    result: { platform: "test" },
    expected: { platform: "test" },
  },
  {
    label: "identity.destinationHash",
    call: () => identity.destinationHash(),
    namespace: "identity",
    method: "destinationHash",
    capability: "identity",
    result: "abcd",
    expected: "abcd",
  },
  {
    label: "identity.sign",
    call: () => identity.sign(new Uint8Array([2])),
    namespace: "identity",
    method: "sign",
    capability: "identity",
    payload: { payload: new Uint8Array([2]) },
  },
  {
    label: "lxmf.send",
    call: () => lxmf.send({ destinationHash: "dest", content: "hi" } as never),
    namespace: "lxmf",
    method: "send",
    capability: "lxmf:send",
    payload: { destinationHash: "dest", content: "hi" },
  },
  {
    label: "lxmf.receive",
    call: () => lxmf.receive(),
    namespace: "lxmf",
    method: "receive",
    capability: "lxmf:receive",
    result: [],
    expected: [],
  },
  {
    label: "presence.snapshot",
    call: () => presence.snapshot(),
    namespace: "presence",
    method: "snapshot",
    capability: "presence",
  },
  {
    label: "resource.fetch",
    call: () => resource.fetch({ t256: "t" } as never),
    namespace: "resource",
    method: "fetch",
    capability: "resource:fetch",
    payload: { t256: "t" },
  },
  {
    label: "share.put",
    call: () => share.put("hello"),
    namespace: "share.cas",
    method: "put",
    capability: "share:cas",
    payload: { content: "hello" },
    result: { t256: "t", size: 5 },
    expected: { t256: "t", size: 5 },
  },
  {
    label: "share.get",
    call: () => share.get("t"),
    namespace: "share.cas",
    method: "get",
    capability: "share:cas",
    payload: { t256: "t" },
    result: { content: "hello" },
    expected: "hello",
  },
  {
    label: "freenet.get",
    call: () => freenet.get("key"),
    namespace: "freenet",
    method: "get",
    capability: "freenet:contract",
    payload: { keyHex: "key" },
  },
  {
    label: "freenet.put",
    call: () =>
      freenet.put({ wasmHex: "w", parametersHex: "p", stateHex: "s" }),
    namespace: "freenet",
    method: "put",
    capability: "freenet:contract",
    payload: { wasmHex: "w", parametersHex: "p", stateHex: "s" },
  },
  {
    label: "freenet.update",
    call: () =>
      freenet.update({ keyHex: "k", codeHashHex: "c", stateHex: "s" }),
    namespace: "freenet",
    method: "update",
    capability: "freenet:contract",
    payload: { keyHex: "k", codeHashHex: "c", stateHex: "s" },
  },
  {
    label: "storage.kv.get",
    call: () => storage.kv.get("k"),
    namespace: "storage.kv",
    method: "get",
    capability: "storage:kv",
    payload: { key: "k" },
  },
  {
    label: "storage.kv.set",
    call: () => storage.kv.set("k", new Uint8Array([3])),
    namespace: "storage.kv",
    method: "set",
    capability: "storage:kv",
    payload: { key: "k", value: new Uint8Array([3]) },
  },
  {
    label: "storage.kv.delete",
    call: () => storage.kv.delete("k"),
    namespace: "storage.kv",
    method: "delete",
    capability: "storage:kv",
    payload: { key: "k" },
  },
  {
    label: "storage.bee.open",
    call: () => storage.bee.open(),
    namespace: "storage.bee",
    method: "open",
    capability: "storage:hyperbee",
  },
  {
    label: "storage.bee.get",
    call: () => storage.bee.get("k"),
    namespace: "storage.bee",
    method: "get",
    capability: "storage:hyperbee",
    payload: { key: "k" },
  },
  {
    label: "storage.bee.put",
    call: () => storage.bee.put("k", new Uint8Array([4])),
    namespace: "storage.bee",
    method: "put",
    capability: "storage:hyperbee",
    payload: { key: "k", value: new Uint8Array([4]) },
  },
  {
    label: "storage.bee.del",
    call: () => storage.bee.del("k"),
    namespace: "storage.bee",
    method: "del",
    capability: "storage:hyperbee",
    payload: { key: "k" },
  },
  {
    label: "storage.bee.list without options",
    call: () => storage.bee.list(),
    namespace: "storage.bee",
    method: "list",
    capability: "storage:hyperbee",
    payload: {},
    result: [],
    expected: [],
  },
  {
    label: "storage.bee.list with options",
    call: () => storage.bee.list({ limit: 2 } as never),
    namespace: "storage.bee",
    method: "list",
    capability: "storage:hyperbee",
    payload: { limit: 2 },
    result: [],
    expected: [],
  },
  {
    label: "workspace.list",
    call: () => workspace.list("src/"),
    namespace: "workspace",
    method: "list",
    capability: "workspace",
    payload: { prefix: "src/" },
    result: [],
    expected: [],
  },
  {
    label: "workspace.read",
    call: () => workspace.read("a.txt"),
    namespace: "workspace",
    method: "read",
    capability: "workspace",
    payload: { path: "a.txt" },
    result: { content: "body" },
    expected: "body",
  },
  {
    label: "workspace.write",
    call: () => workspace.write("a.txt", "body"),
    namespace: "workspace",
    method: "write",
    capability: "workspace",
    payload: { path: "a.txt", content: "body" },
    result: { path: "a.txt", size: 4 },
    expected: { path: "a.txt", size: 4 },
  },
  {
    label: "workspace.patch",
    call: () => workspace.patch("a.txt", 4, [{ start: 0, end: 1, text: "B" }]),
    namespace: "workspace",
    method: "patch",
    capability: "workspace",
    payload: {
      path: "a.txt",
      baseLength: 4,
      edits: [{ start: 0, end: 1, text: "B" }],
    },
  },
  {
    label: "workspace.remove",
    call: () => workspace.remove("a.txt"),
    namespace: "workspace",
    method: "delete",
    capability: "workspace",
    payload: { path: "a.txt" },
  },
  {
    label: "apps.packageProject",
    call: () => apps.packageProject("src/", MANIFEST),
    namespace: "apps",
    method: "package",
    capability: "apps:package",
    payload: { projectPrefix: "src/", manifest: MANIFEST },
  },
  {
    label: "apps.publish",
    call: () => apps.publish("t"),
    namespace: "apps",
    method: "publish",
    capability: "apps:publish",
    payload: { t256: "t" },
  },
  {
    label: "apps.install",
    call: () => apps.install("t"),
    namespace: "apps",
    method: "install",
    capability: "apps:install",
    payload: { t256: "t" },
  },
  {
    label: "apps.preview",
    call: () => apps.preview("src/", MANIFEST, ["ui"]),
    namespace: "apps",
    method: "preview",
    capability: "apps:preview",
    payload: { projectPrefix: "src/", manifest: MANIFEST, grants: ["ui"] },
  },
  {
    label: "apps.stopPreview",
    call: () => apps.stopPreview(),
    namespace: "apps",
    method: "stopPreview",
    capability: "apps:preview",
  },
];

describe("broker surface", () => {
  it.each(cases)(
    "$label routes to its namespace, method, and capability",
    async (surface) => {
      nextResult = surface.result ?? null;

      const returned = await surface.call();

      const call = calls[0];
      if (call === undefined) throw new Error("expected a broker call");
      expect(call.namespace).toBe(surface.namespace);
      expect(call.method).toBe(surface.method);
      expect(call.capability).toBe(surface.capability);
      if (surface.payload === undefined) {
        expect(call).not.toHaveProperty("payload");
      } else {
        expect(call.payload).toEqual(surface.payload);
      }
      if (surface.expected !== undefined) {
        expect(returned).toEqual(surface.expected);
      }
    },
  );

  it("covers every capability-bearing wrapper exactly once", () => {
    const labels = cases.map((surface) => surface.label);

    expect(new Set(labels).size).toBe(labels.length);
  });
});
