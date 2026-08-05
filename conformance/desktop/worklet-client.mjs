#!/usr/bin/env node
/**
 * Spawn the desktop Bare worklet and exchange newline-delimited JSON over stdio.
 */

import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { decodeMessages, encodeMessage } from "../../packages/host-core/dist/protocol.js";

const hostRoot = join(dirname(fileURLToPath(import.meta.url)), "../../apps/host-desktop");
const workletBundle = join(hostRoot, "worklet/worklet.bundle");
const bareBin = join(hostRoot, "../../node_modules/bare/bin/bare");

export class DesktopWorkletClient {
  child = null;
  buffer = "";
  messages = [];
  exitPromise = null;

  async start() {
    if (this.child !== null) {
      return;
    }

    this.child = spawn(bareBin, [workletBundle], {
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env, TWISTEDPEAR_HOST_DESKTOP: "1" }
    });

    this.exitPromise = new Promise((resolve) => {
      this.child?.on("exit", (code, signal) => resolve({ code, signal }));
    });

    this.child.stdout.on("data", (chunk) => {
      this.buffer += chunk.toString("utf8");
      const parsed = decodeMessages(this.buffer);
      this.buffer = parsed.remainder;
      this.messages.push(...parsed.messages);
    });

    this.child.stderr.on("data", (chunk) => {
      process.stderr.write(`[desktop-worklet] ${chunk.toString("utf8")}`);
    });

    await this.waitFor((message) => message.type === "status", 15_000);
  }

  send(message) {
    if (this.child === null) {
      throw new Error("worklet not started");
    }

    this.child.stdin.write(encodeMessage(message));
  }

  async waitFor(predicate, timeoutMs = 20_000) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      for (const message of this.messages) {
        if (predicate(message)) {
          return message;
        }
      }

      await sleep(50);
    }

    throw new Error("DesktopWorkletClient.waitFor timeout");
  }

  async stop() {
    if (this.child === null) {
      return;
    }

    this.send({ type: "stop" });
    this.child.kill("SIGTERM");
    await this.exitPromise;
    this.child = null;
  }

  kill(signal = "SIGKILL") {
    this.child?.kill(signal);
  }
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}
