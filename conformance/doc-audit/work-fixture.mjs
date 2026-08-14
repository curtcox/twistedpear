import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";

/**
 * A throwaway git repo shaped like the real one: the five register files the
 * audit reads, plus the work/ sidecar. Needed because the interesting cases are
 * all failures, and the real repo is (by design) always in the passing state.
 */
export class WorkFixture {
  constructor() {
    this.root = mkdtempSync(join(tmpdir(), "work-fixture-"));
    mkdirSync(join(this.root, "work"), { recursive: true });
    this.git("init", "-q", ".");
    this.git("config", "user.email", "fixture@example.com");
    this.git("config", "user.name", "fixture");
    this.registers({});
    this.metadata({});
    this.resources({});
  }

  /** @param {...string} args */
  git(...args) {
    // Isolate from the host gitconfig. Cloud/agent machines often enable
    // commit.gpgsign and core.fsmonitor globally; either one can hang a
    // throwaway `git commit` long enough to trip Vitest's 10s hookTimeout.
    return spawnSync("git", ["-c", "commit.gpgsign=false", ...args], {
      cwd: this.root,
      encoding: "utf8",
      env: {
        ...process.env,
        GIT_CONFIG_GLOBAL: "/dev/null",
        GIT_CONFIG_SYSTEM: "/dev/null",
        GIT_CONFIG_NOSYSTEM: "1",
        GIT_TERMINAL_PROMPT: "0",
      },
    });
  }

  /** @param {string} rel @param {string} text */
  write(rel, text) {
    writeFileSync(join(this.root, rel), text);
  }

  /** @param {string} message */
  commit(message = "fixture") {
    this.git("add", "-A");
    this.git("commit", "-q", "-m", message);
    return this.git("rev-parse", "HEAD").stdout.trim();
  }

  /**
   * @param {Record<string, { status: string; title?: string }>} rows
   * @param {string} [file]
   */
  registers(rows, file = "STATUS-SOFTWARE.md") {
    const others = [
      "STATUS-COMPLETE.md",
      "STATUS-COMPLETE-PHASES.md",
      "STATUS-HARDWARE.md",
      "RELEASE-PLAN.md",
    ];
    for (const other of others) {
      if (other === file) continue;
      this.write(other, emptyRegister());
    }
    if (!others.includes(file)) this.write("STATUS-SOFTWARE.md", table(rows));
    else {
      this.write("STATUS-SOFTWARE.md", emptyRegister());
      this.write(file, table(rows));
    }
  }

  /** @param {Record<string, any>} items */
  metadata(items) {
    this.write(
      "work/metadata.json",
      `${JSON.stringify({ version: 1, items }, null, 2)}\n`,
    );
  }

  /** @param {Record<string, any>} resources */
  resources(resources) {
    this.write(
      "work/resources.json",
      `${JSON.stringify({ version: 1, resources }, null, 2)}\n`,
    );
  }

  /** @param {object[]} events */
  journal(events) {
    this.write(
      "work/history.jsonl",
      events.map((event) => `${JSON.stringify(event)}\n`).join(""),
    );
  }

  cleanup() {
    rmSync(this.root, { recursive: true, force: true });
  }
}

/** @returns {string} */
function emptyRegister() {
  return "# Fixture\n\n| ID  | Status | Item | Evidence | Verify |\n| --- | ------ | ---- | -------- | ------ |\n";
}

/**
 * @param {Record<string, { status: string; title?: string }>} rows
 * @returns {string}
 */
function table(rows) {
  const lines = [
    "# Fixture",
    "",
    "| ID  | Status | Item | Evidence | Verify |",
    "| --- | ------ | ---- | -------- | ------ |",
  ];
  for (const [id, row] of Object.entries(rows)) {
    lines.push(`| ${id} | ${row.status} | ${row.title ?? id} | — | \`true\` |`);
  }
  return `${lines.join("\n")}\n`;
}

/**
 * @param {Partial<{ type: string; requires: string[]; verify: string; added: string }>} overrides
 * @returns {object}
 */
export function meta(overrides = {}) {
  return {
    type: "feature",
    requires: [],
    verify: "true",
    added: "2026-01-01",
    ...overrides,
  };
}
