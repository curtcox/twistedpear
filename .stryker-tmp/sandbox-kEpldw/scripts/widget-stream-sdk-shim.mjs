// @ts-nocheck
// Stub @twistedpear/miniapp-sdk used by scripts/record-widget-streams.mjs to
// run the example app bundles headlessly. Deterministic: fixed identity,
// scripted lxmf/announce/resource responses, in-memory storage. The recorder
// resets globalThis.__widgetStreamRecorder between apps.

function recorder() {
  const state = globalThis.__widgetStreamRecorder;
  if (state === undefined) throw new Error("widget stream recorder not initialised");
  return state;
}

export const identity = {
  destinationHash: async () => "d3adbeefd3adbeefd3adbeefd3adbeef"
};

export const ui = {
  render: async (tree) => {
    recorder().frames.push(structuredClone(tree));
  },
  onEvent: (handler) => {
    recorder().handler = handler;
  }
};

export const storage = {
  kv: {
    get: async (key) => recorder().kv.get(key) ?? null,
    set: async (key, value) => {
      recorder().kv.set(key, value);
    }
  },
  bee: {
    open: async () => {},
    put: async (key, value) => {
      recorder().bee.push([key, value]);
    },
    list: async () => [...recorder().bee]
  }
};

export const lxmf = {
  send: async (message) => {
    recorder().sent.push(message);
  },
  receive: async () => recorder().inbox
};

export const announce = {
  publish: async (payload, topic) => {
    recorder().announces.push({ topic, payload });
  },
  subscribe: async (topic) => recorder().announces.filter((item) => item.topic === topic)
};

export const resource = {
  fetch: async (request) => {
    const script = recorder().resourceResults;
    if (script.length === 0) throw new Error(`no scripted result for ${request.resourceId}`);
    const next = script.shift();
    if (next instanceof Error) throw next;
    return next;
  }
};
