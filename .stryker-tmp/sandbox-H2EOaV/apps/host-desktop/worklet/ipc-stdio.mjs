/**
 * Desktop stdio IPC shim matching bare-kit newline JSON framing.
 * bare-process loads lazily so the worklet can emit an initial status before
 * native addons resolve (desktop bare CLI spawn without linked frameworks).
 */
// @ts-nocheck

const listeners = new Set();
/** @type {typeof import("bare-process").default | null} */
let processModule = null;
let stdinAttached = false;
let processLoad = null;

function nodeProcess() {
  const candidate = globalThis.process;
  if (
    candidate !== undefined &&
    candidate.stdin !== undefined &&
    typeof candidate.stdin.on === "function" &&
    candidate.stdout !== undefined &&
    typeof candidate.stdout.write === "function"
  ) {
    return candidate;
  }

  return null;
}

async function loadProcess() {
  if (processModule !== null) {
    return processModule;
  }

  processLoad ??= import("bare-process").then((mod) => {
    processModule = mod.default;
    return processModule;
  });

  return processLoad;
}

function attachStdin(process) {
  if (stdinAttached) {
    return;
  }

  stdinAttached = true;
  process.stdin.on("data", (chunk) => {
    for (const listener of listeners) {
      listener(chunk);
    }
  });
}

export const IPC = {
  on(event, listener) {
    if (event !== "data") {
      return;
    }

    listeners.add(listener);
    const process = nodeProcess();
    if (process !== null) {
      attachStdin(process);
      return;
    }

    void loadProcess()
      .then((process) => attachStdin(process))
      .catch((error) => {
        console.error(
          `[ipc-stdio] stdin unavailable: ${error instanceof Error ? error.message : String(error)}`
        );
      });
  },

  write(data) {
    const process = nodeProcess();
    if (process !== null) {
      process.stdout.write(data);
      return;
    }

    void loadProcess()
      .then((process) => {
        process.stdout.write(data);
      })
      .catch(() => {
        const text = Buffer.from(data).toString("utf8").trimEnd();
        if (text.length > 0) {
          console.log(text);
        }
      });
  }
};
