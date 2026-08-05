#!/usr/bin/env node
/**
 * Desktop worklet supervisor crash-restart (Phase 6 M6 tier).
 */

import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  decodeMessages,
  encodeMessage,
} from "../../packages/host-core/dist/protocol.js";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

class TestSupervisor {
  child = null;
  buffer = "";
  restartAttempts = 0;
  stopping = false;

  constructor(options) {
    this.options = options;
    this.script = join(
      dirname(fileURLToPath(import.meta.url)),
      "fixtures/supervisor-worklet.mjs",
    );
  }

  start() {
    this.stopping = false;
    this.child = spawn(process.execPath, [this.script], {
      stdio: ["pipe", "pipe", "pipe"],
    });

    this.child.stdout.on("data", (chunk) => {
      this.buffer += chunk.toString("utf8");
      const parsed = decodeMessages(this.buffer);
      this.buffer = parsed.remainder;
      for (const message of parsed.messages) {
        this.options.onMessage(message);
      }
    });

    this.child.on("exit", (code, signal) => {
      this.child = null;
      this.options.onExit(code, signal);
      if (!this.stopping) {
        this.restartAttempts += 1;
        const delay = Math.min(
          30_000,
          500 * 2 ** Math.min(this.restartAttempts, 6),
        );
        setTimeout(() => this.start(), delay);
      }
    });
  }

  send(message) {
    this.child?.stdin.write(encodeMessage(message));
  }

  stop() {
    this.stopping = true;
    this.send({ type: "stop" });
    this.child?.kill("SIGTERM");
  }

  simulateCrash() {
    this.child?.kill("SIGKILL");
  }
}

export async function runDesktopCrashRestart() {
  const messages = [];
  let exitCount = 0;
  let supervisor = null;

  await new Promise((resolve) => {
    supervisor = new TestSupervisor({
      onMessage(message) {
        messages.push(message);
        if (message.type === "status") {
          resolve();
        }
      },
      onExit() {
        exitCount += 1;
      },
    });

    supervisor.start();
  });

  supervisor.send({ type: "create-identity" });
  await sleep(100);

  const firstIdentity = messages.findLast(
    (message) => message.type === "status",
  )?.status.identityHash;
  assert(
    firstIdentity === "supervisor-test-identity",
    "fixture worklet created identity before crash",
  );

  const messageCountBefore = messages.length;
  supervisor.simulateCrash();

  const restartedAt = Date.now();
  while (Date.now() - restartedAt < 5_000) {
    if (exitCount >= 1 && messages.length > messageCountBefore) {
      supervisor.stop();
      console.log(
        "desktop-crash-restart: supervisor restarted worklet within 5s",
      );
      return;
    }

    await sleep(100);
  }

  supervisor?.stop();
  throw new Error(`supervisor did not restart within 5s (exits=${exitCount})`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  runDesktopCrashRestart().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
