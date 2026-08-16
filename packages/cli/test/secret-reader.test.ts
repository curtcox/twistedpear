import { EventEmitter } from "node:events";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readHiddenSecret } from "../src/bin/secret-reader.js";

// process.stdin/stdout are TTY-shaped in the real CLI; a fake stream lets the
// test drive raw-mode keystrokes without a real terminal.
class FakeStdin extends EventEmitter {
  isTTY = true;
  rawModeCalls: boolean[] = [];
  resumed = 0;
  paused = 0;

  setRawMode(value: boolean): this {
    this.rawModeCalls.push(value);
    return this;
  }
  resume(): this {
    this.resumed += 1;
    return this;
  }
  pause(): this {
    this.paused += 1;
    return this;
  }
}

function byte(value: number): Buffer {
  return Buffer.from([value]);
}
function text(value: string): Buffer {
  return Buffer.from(value, "utf8");
}

describe("readHiddenSecret", () => {
  let stdin: FakeStdin;
  let stdoutWrites: string[];
  let stdoutIsTTY: boolean;

  beforeEach(() => {
    stdin = new FakeStdin();
    stdoutWrites = [];
    stdoutIsTTY = true;
    vi.spyOn(process, "stdin", "get").mockReturnValue(
      stdin as unknown as NodeJS.ReadStream,
    );
    vi.spyOn(process, "stdout", "get").mockReturnValue({
      get isTTY() {
        return stdoutIsTTY;
      },
      write: (value: string) => {
        stdoutWrites.push(value);
        return true;
      },
    } as unknown as NodeJS.WriteStream);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("rejects when stdin or stdout is not a TTY", async () => {
    stdin.isTTY = false;
    await expect(readHiddenSecret("Passphrase")).rejects.toThrow(
      /requires a TTY/,
    );

    stdin.isTTY = true;
    stdoutIsTTY = false;
    await expect(readHiddenSecret("Passphrase")).rejects.toThrow(
      /requires a TTY/,
    );
  });

  it("prompts, enables raw mode, and resolves the typed value on Enter", async () => {
    const promise = readHiddenSecret("Passphrase");
    stdin.emit("data", text("hunter2"));
    stdin.emit("data", byte(13));

    await expect(promise).resolves.toBe("hunter2");
    expect(stdoutWrites[0]).toBe("Passphrase: ");
    expect(stdin.rawModeCalls).toEqual([true, false]);
    expect(stdin.resumed).toBe(1);
    expect(stdin.paused).toBe(1);
    expect(stdoutWrites.at(-1)).toBe("\n");
  });

  it("treats a bare newline the same as carriage return", async () => {
    const promise = readHiddenSecret("Passphrase");
    stdin.emit("data", text("abc"));
    stdin.emit("data", byte(10));
    await expect(promise).resolves.toBe("abc");
  });

  it("handles backspace/delete by trimming the last character", async () => {
    const promise = readHiddenSecret("Passphrase");
    stdin.emit("data", text("abcd"));
    stdin.emit("data", byte(127));
    stdin.emit("data", byte(8));
    stdin.emit("data", byte(13));
    await expect(promise).resolves.toBe("ab");
  });

  it("rejects with Cancelled on Ctrl-C", async () => {
    const promise = readHiddenSecret("Passphrase");
    stdin.emit("data", text("partial"));
    stdin.emit("data", byte(3));
    await expect(promise).rejects.toThrow("Cancelled");
    expect(stdin.rawModeCalls).toEqual([true, false]);
  });
});
