/**
 * Hostile handler-error cases: throws must surface as structured app-error
 * and must not take the app out of `running`.
 */
import {
  GrantStore,
  MemoryKvStoreBackend,
  MiniappHost,
  NodeWorkerSandboxBackend,
} from "../../packages/miniapp-runtime/dist/index.js";

function handlerBundle(body) {
  return new TextEncoder().encode(`
sdk.ui.onEvent(async (event) => { ${body} });
await sdk.ui.render({
  root: {
    id: "root",
    type: "view",
    children: [{ id: "go", type: "button", props: { label: "Go", event: "boom" } }]
  }
});
`);
}

async function waitUntil(condition, timeoutMs = 2_000) {
  const deadline = Date.now() + timeoutMs;
  while (!condition()) {
    if (Date.now() >= deadline) {
      throw new Error("timed out waiting for hostile-app condition");
    }
    await new Promise((resolve) => setTimeout(resolve, 15));
  }
}

async function assertHandlerError(body, expectedMessage) {
  const store = new MemoryKvStoreBackend();
  const host = new MiniappHost({
    backend: new NodeWorkerSandboxBackend(),
    grantStore: new GrantStore(store),
    kvBackend: store,
  });
  try {
    await host.launch(
      {
        name: "hostile-handler",
        version: "1.0.0",
        entry: "bundle.js",
        capabilities: [],
        publisherPublicKey: "publisher",
      },
      handlerBundle(body),
    );
    await waitUntil(() => host.snapshot().widgetTree !== null);
    await host.handleUiEvent("go", "boom");
    await waitUntil(
      () => host.lastAppError()?.message.includes(expectedMessage) === true,
    );
    if (host.snapshot().state !== "running") {
      throw new Error(
        `handler error left state ${host.snapshot().state}, expected running`,
      );
    }
    const error = host.lastAppError();
    if (error?.phase !== "ui-event" || error.event !== "boom") {
      throw new Error(`expected ui-event/boom, got ${JSON.stringify(error)}`);
    }
  } finally {
    await host.stop();
  }
}

export async function runHandlerErrorCases() {
  await assertHandlerError(`throw new Error("sync-hostile");`, "sync-hostile");
  await assertHandlerError(
    `return Promise.reject(new Error("reject-hostile"));`,
    "reject-hostile",
  );
  await assertHandlerError(
    `await Promise.resolve(); throw new Error("async-hostile");`,
    "async-hostile",
  );
}
