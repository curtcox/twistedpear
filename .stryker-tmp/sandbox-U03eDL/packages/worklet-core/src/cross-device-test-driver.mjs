/**
 * Host-side implementation of the cross-device development test commands.
 * It drives the real DevStudio mini-app through widget events; confirmations
 * remain pending in host chrome and must be approved by the platform UI driver.
 */
// @ts-nocheck


import { verify256t } from "@twistedpear/cas-256t";

function bytesToHex(bytes) {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function hexToBytes(value) {
  if (typeof value !== "string" || value.length === 0 || value.length % 2 !== 0 || !/^[0-9a-f]+$/i.test(value)) {
    throw new Error("archiveHex must be non-empty hexadecimal bytes");
  }
  return Uint8Array.from(value.match(/../g), (pair) => Number.parseInt(pair, 16));
}

function projectName(snapshot) {
  const children = snapshot?.widgetTree?.root?.children ?? [];
  const selected = children.find((node) =>
    typeof node?.id === "string" && node.id.startsWith("proj-") && node?.props?.label?.startsWith("▶ ")
  );
  if (selected !== undefined) return selected.id.slice("proj-".length);
  const any = children.find((node) => typeof node?.id === "string" && node.id.startsWith("proj-"));
  return any?.id?.slice("proj-".length) ?? null;
}

function qrValue(snapshot) {
  const node = (snapshot?.widgetTree?.root?.children ?? []).find((entry) => entry?.id === "package-qr");
  return typeof node?.props?.value === "string" ? node.props.value : null;
}

function hasNode(node, id) {
  if (node === null || typeof node !== "object") return false;
  if (node.id === id) return true;
  return Array.isArray(node.children) && node.children.some((child) => hasNode(child, id));
}

export function createCrossDeviceTestDriver(options) {
  const host = () => options.miniappHost();
  const waitForState = async (predicate, label) => {
    const deadline = Date.now() + 10_000;
    while (Date.now() < deadline) {
      const state = host().snapshot();
      if (predicate(state)) return state;
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
    throw new Error(`Timed out waiting for ${label}`);
  };

  return async function handleCrossDeviceCommand(request) {
    switch (request.cmd) {
      case "devstudio.load": {
        if (typeof request.bundle !== "string" || typeof request.manifest !== "object" || request.manifest === null) {
          throw new Error("devstudio.load requires manifest and bundle");
        }
        host().setDeveloperMode(true);
        const capabilities = request.manifest.capabilities ?? [];
        await host().setGrants(
          request.manifest.name,
          request.manifest.publisherPublicKey ?? "dev",
          capabilities,
          capabilities
        );
        await host().devSideLoad(request.manifest, new TextEncoder().encode(request.bundle));
        const state = await waitForState(
          (snapshot) => hasNode(snapshot?.widgetTree?.root, "new-project"),
          "DevStudio initial render"
        );
        return { state };
      }
      case "project.create": {
        await host().handleUiEvent("new-project", "ds.newproject");
        const state = await waitForState((snapshot) => projectName(snapshot) !== null, "DevStudio project creation");
        return { project: projectName(state), state };
      }
      case "project.write": {
        if (typeof request.path !== "string" || typeof request.content !== "string") {
          throw new Error("project.write requires path and content");
        }
        const current = await host().readWorkspaceFile(request.path);
        await host().handleUiEvent(`open-${request.path}`, "ds.openfile");
        await host().handleUiEvent("editor", "ds.edit", {
          documentId: request.path,
          baseLength: current.length,
          edits: [{ start: 0, end: current.length, text: request.content }]
        });
        return { path: request.path, size: request.content.length };
      }
      case "preview": {
        const action = request.action === "stop" ? "ds.stoppreview" : "ds.preview";
        await host().handleUiEvent(action === "ds.preview" ? "preview" : "stop-preview", action);
        return { state: host().previewSnapshot() };
      }
      case "package": {
        await host().handleUiEvent("package", "ds.package");
        const state = host().snapshot();
        return { t256: qrValue(state), state };
      }
      case "publish": {
        await host().handleUiEvent("publish", "ds.publish");
        return { state: host().snapshot() };
      }
      case "trust.import": {
        if (typeof request.identity256t !== "string") throw new Error("trust.import requires identity256t");
        await options.importTrust(request.identity256t, String(request.label ?? "Cross-device publisher"));
        return {};
      }
      case "install": {
        if (typeof request.t256 !== "string") throw new Error("install requires t256");
        return options.installFromT256(request.t256);
      }
      case "run": {
        if (typeof request.appId !== "string") throw new Error("run requires appId");
        if (options.runApp !== undefined) {
          await options.runApp(request.appId);
        } else {
          await host().launch(options.installedStore(), options.runtime, request.appId);
        }
        return { state: host().snapshot() };
      }
      case "ui.event": {
        if (typeof request.nodeId !== "string" || typeof request.event !== "string") {
          throw new Error("ui.event requires nodeId and event");
        }
        await host().handleUiEvent(request.nodeId, request.event, request.value);
        return { state: host().snapshot() };
      }
      case "state":
        return { state: host().snapshot(), preview: host().previewSnapshot() };
      case "cas.has": {
        if (typeof request.t256 !== "string") throw new Error("cas.has requires t256");
        if (options.casHas !== undefined) return { present: await options.casHas(request.t256) };
        return { present: (await options.casStore().get(request.t256).catch(() => null)) !== null };
      }
      case "cas.read": {
        if (typeof request.t256 !== "string") throw new Error("cas.read requires t256");
        const archive = await options.casStore().get(request.t256);
        if (archive === null) throw new Error(`CAS archive is unavailable: ${request.t256}`);
        return { archiveHex: bytesToHex(archive), size: archive.length };
      }
      case "negative.verify": {
        if (typeof request.t256 !== "string") throw new Error("negative.verify requires t256");
        const archive = hexToBytes(request.archiveHex);
        const refused = !verify256t(request.t256, archive, options.sha512);
        if (!refused) throw new Error("corrupted archive unexpectedly matched its 256t id");
        return { refused, stage: "sha512", codeExecuted: false };
      }
      case "trust.show":
        return { identity256t: await options.publisherIdentity256t() };
      default:
        throw new Error(`Unknown cross-device command: ${request.cmd}`);
    }
  };
}
