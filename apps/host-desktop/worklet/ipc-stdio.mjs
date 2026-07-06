/**
 * Desktop stdio IPC shim matching bare-kit newline JSON framing.
 */
import process from "bare-process";

const listeners = new Set();

process.stdin.on("data", (chunk) => {
  for (const listener of listeners) {
    listener(chunk);
  }
});

export const IPC = {
  on(event, listener) {
    if (event !== "data") {
      return;
    }

    listeners.add(listener);
  },

  write(data) {
    process.stdout.write(data);
  }
};
