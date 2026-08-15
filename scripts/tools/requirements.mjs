import { spawnSync } from "node:child_process";
import { gates } from "../checks/registry.mjs";

/**
 * Every external thing a gate needs, in one place.
 *
 * This is the single source of truth for three questions that used to have
 * separate answers: does the gate runner skip this gate, does the doctor call
 * it missing, and what does the installer run. `scripts/checks/run.mjs` used to
 * carry its own private copy of the probe logic, which meant a requirement
 * could be "available" to one and "missing" to the other.
 *
 * `install` is a per-platform list of commands. An entry with no recipe for the
 * current platform is reported honestly as not installable here rather than
 * being papered over — `macos` is a property of the machine, and `node` is
 * already running.
 *
 * @typedef {object} Requirement
 * @property {string} why what it is for, in the doctor's output
 * @property {() => boolean} probe
 * @property {string[]} [needs] requirements to install first
 * @property {Record<string, string[][]>} [install] platform -> commands
 * @property {string} [manual] where to get it when there is no recipe
 */

/**
 * @param {string} command
 * @param {string[]} args
 * @returns {boolean}
 */
export function hasCommand(command, args = ["--version"]) {
  return spawnSync(command, args, { encoding: "utf8" }).status === 0;
}

/** @type {Record<string, Requirement>} */
export const REQUIREMENTS = {
  node: {
    why: "the repository's own toolchain",
    probe: () => true,
    manual: "you are running it",
  },
  macos: {
    why: "Swift tooling only runs on macOS",
    probe: () => process.platform === "darwin",
    manual: "a macOS host; this gate is skipped elsewhere",
  },
  network: {
    why: "reaching the npm advisory database and GitHub",
    // A DNS lookup is enough, and cheap: this asks "can we reach the registry",
    // not "is the whole internet up".
    probe: () =>
      spawnSync(
        "node",
        [
          "-e",
          "require('node:dns').promises.resolve('registry.npmjs.org').then(()=>process.exit(0),()=>process.exit(1))",
        ],
        {
          encoding: "utf8",
          timeout: 10_000,
        },
      ).status === 0,
    manual: "a working network connection",
  },
  actionlint: {
    why: "linting GitHub Actions workflows",
    probe: () => hasCommand("actionlint", ["-version"]),
    install: {
      darwin: [["brew", "install", "actionlint"]],
      linux: [
        ["go", "install", "github.com/rhysd/actionlint/cmd/actionlint@latest"],
      ],
    },
    manual: "https://github.com/rhysd/actionlint",
  },
  gitleaks: {
    why: "scanning for committed secrets",
    probe: () => hasCommand("gitleaks"),
    install: {
      darwin: [["brew", "install", "gitleaks"]],
      linux: [["brew", "install", "gitleaks"]],
    },
    manual: "https://github.com/gitleaks/gitleaks",
  },
  jvm: {
    why: "running ktlint and the TLA+ model checker",
    probe: () => hasCommand("java", ["-version"]),
    install: {
      darwin: [["brew", "install", "openjdk"]],
      linux: [["sudo", "apt-get", "install", "-y", "default-jre"]],
    },
  },
  ktlint: {
    why: "linting the Android bridge sources",
    probe: () => hasCommand("ktlint", ["--version"]),
    needs: ["jvm"],
    install: {
      darwin: [["brew", "install", "ktlint"]],
      linux: [["brew", "install", "ktlint"]],
    },
  },
  rust: {
    why: "building and checking the Rust components",
    probe: () => hasCommand("cargo"),
    install: {
      darwin: [
        ["brew", "install", "rustup-init"],
        ["rustup-init", "-y"],
      ],
      linux: [
        [
          "sh",
          "-c",
          "curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y",
        ],
      ],
    },
    manual: "https://rustup.rs",
  },
  "cargo-deny": {
    why: "the Rust dependency and licence policy",
    probe: () => hasCommand("cargo-deny"),
    needs: ["rust"],
    install: {
      darwin: [["cargo", "install", "cargo-deny", "--locked"]],
      linux: [["cargo", "install", "cargo-deny", "--locked"]],
    },
  },
  python: {
    why: "the Python launcher and its checks",
    probe: () => hasCommand("python3"),
    install: {
      darwin: [["brew", "install", "python"]],
      linux: [["sudo", "apt-get", "install", "-y", "python3"]],
    },
  },
  ruff: {
    why: "linting the Python launcher",
    probe: () => hasCommand("ruff"),
    needs: ["python"],
    install: {
      darwin: [["brew", "install", "ruff"]],
      linux: [["python3", "-m", "pip", "install", "--user", "ruff"]],
    },
  },
  mypy: {
    why: "type-checking the Python launcher",
    probe: () => hasCommand("mypy"),
    needs: ["python"],
    install: {
      darwin: [["brew", "install", "mypy"]],
      linux: [["python3", "-m", "pip", "install", "--user", "mypy"]],
    },
  },
  lizard: {
    why: "function complexity in the languages ESLint does not parse",
    probe: () => hasCommand("lizard", ["--version"]),
    needs: ["python"],
    // Pinned. Lizard's parsers are hand-written, and a release that counts one
    // more branch in a `switch` shifts CCN across the whole repository — which
    // would turn `complexity:multilang` red for reasons found nowhere in the
    // diff that tripped it.
    //
    // Two recipes because there is no one command that works on both. Homebrew
    // Python is PEP 668 "externally managed", so `pip3 install --user` there
    // refuses outright; pipx is the supported route and is what CI's Ubuntu
    // image does not need.
    install: {
      darwin: [
        ["brew", "install", "pipx"],
        ["pipx", "install", "lizard==1.23.0"],
      ],
      linux: [["pip3", "install", "--user", "lizard==1.23.0"]],
    },
    manual: "https://github.com/terryyin/lizard",
  },
  shellcheck: {
    why: "linting the shell scripts",
    probe: () => hasCommand("shellcheck"),
    install: {
      darwin: [["brew", "install", "shellcheck"]],
      linux: [["sudo", "apt-get", "install", "-y", "shellcheck"]],
    },
  },
  swiftlint: {
    why: "linting the iOS bridge sources",
    probe: () => hasCommand("swiftlint", ["version"]),
    needs: ["macos"],
    install: { darwin: [["brew", "install", "swiftlint"]] },
    manual: "https://github.com/realm/SwiftLint (macOS only)",
  },
};

/**
 * Whether a requirement is satisfied here. Unknown tokens fall back to "is
 * there a command by that name", which is how the registry's own tokens have
 * always behaved, so adding a gate that needs a new tool keeps working before
 * anyone describes it here.
 * @param {string} token
 * @returns {boolean}
 */
export function requirementAvailable(token) {
  const requirement = REQUIREMENTS[token];
  if (requirement) return requirement.probe();
  return hasCommand(token);
}

/**
 * Which gates each requirement gates, so the doctor can say what a missing tool
 * actually costs rather than just naming it.
 * @param {string} [tier]
 * @returns {Map<string, string[]>}
 */
export function gatesByRequirement(tier) {
  /** @type {Map<string, string[]>} */
  const index = new Map();
  for (const gate of gates) {
    if (tier && gate.tier !== tier) continue;
    for (const token of gate.requires) {
      if (!index.has(token)) index.set(token, []);
      index.get(token).push(gate.id);
    }
  }
  for (const list of index.values()) list.sort();
  return index;
}

/**
 * @typedef {object} ToolReport
 * @property {string} token
 * @property {boolean} present
 * @property {string} why
 * @property {string[]} gates
 * @property {string[][]} install commands for this platform, empty when none
 * @property {string} [manual]
 */

/**
 * @param {{ tier?: string; platform?: string }} [options]
 * @returns {ToolReport[]}
 */
export function survey(options = {}) {
  const { tier = "pr", platform = process.platform } = options;
  const index = gatesByRequirement(tier);
  return [...index.keys()].sort().map((token) => {
    const requirement = REQUIREMENTS[token];
    return {
      token,
      present: requirementAvailable(token),
      why: requirement?.why ?? "required by a gate",
      gates: index.get(token) ?? [],
      install: requirement?.install?.[platform] ?? [],
      manual: requirement?.manual,
    };
  });
}

/**
 * Missing requirements in dependency order, so `cargo-deny` is never attempted
 * before `rust` exists.
 * @param {ToolReport[]} reports
 * @returns {ToolReport[]}
 */
export function installOrder(reports) {
  const missing = reports.filter((report) => !report.present);
  const byToken = new Map(missing.map((report) => [report.token, report]));
  /** @type {ToolReport[]} */
  const ordered = [];
  const seen = new Set();

  /** @param {ToolReport} report */
  function visit(report) {
    if (seen.has(report.token)) return;
    seen.add(report.token);
    for (const need of REQUIREMENTS[report.token]?.needs ?? []) {
      const dependency = byToken.get(need);
      if (dependency) visit(dependency);
    }
    ordered.push(report);
  }

  for (const report of missing) visit(report);
  return ordered;
}
