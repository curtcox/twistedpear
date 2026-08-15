import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { gates } from "../checks/registry.mjs";

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

/**
 * The pinned version of every external tool, read from the one file that holds
 * them. See `tool-versions.json` for why it is a file rather than a constant
 * here.
 * @type {Record<string, { version: string, probe: string[] }>}
 */
export const PINS = JSON.parse(
  fs.readFileSync(path.join(ROOT, "tool-versions.json"), "utf8"),
).tools;

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

/**
 * The version of an installed tool, or null when it is absent or says nothing
 * recognisable.
 *
 * Every one of these tools prints its version differently — bare (`1.7.12`),
 * prefixed (`ruff 0.15.16`), on a second line (`version: 0.11.0`), or with a
 * build suffix (`mypy 2.1.0 (compiled: yes)`). Rather than ten parsers, take
 * the first dotted-numeric run in the output, which each of those forms puts
 * where the version belongs.
 *
 * `{version}` in a probe expands to the pin. Rust is the one tool whose probe
 * has to name the version it is asking about — `rustup run 1.97.1 cargo` is how
 * the gates invoke it — and writing the number twice in one file would defeat
 * the point of the file.
 *
 * @param {string} token
 * @returns {string | null}
 */
export function installedVersion(token) {
  const pin = PINS[token];
  if (!pin) return null;
  const [command, ...args] = pin.probe.map((part) =>
    part.replace("{version}", pin.version),
  );
  const result = spawnSync(command, args, { encoding: "utf8" });
  if (result.status !== 0) return null;
  const match = `${result.stdout ?? ""}${result.stderr ?? ""}`.match(
    /\d+\.\d+(?:\.\d+)?/,
  );
  return match ? match[0] : null;
}

/**
 * Whether the installed tool is the pinned one.
 *
 * A tool that is present but the wrong version is the failure mode the pins
 * exist to prevent, and the one nothing here used to detect: local Ruff 0.16.3
 * reported two findings that CI's pinned 0.15.16 does not, which reads as a
 * source regression rather than as toolchain drift.
 *
 * @param {string} token
 * @returns {{ pinned: string, installed: string | null, matches: boolean } | null}
 */
export function versionReport(token) {
  const pin = PINS[token];
  if (!pin) return null;
  const installed = installedVersion(token);
  return {
    pinned: pin.version,
    installed,
    matches: installed === pin.version,
  };
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
  // Pinned for the same reason lizard is, and with the same recipe shape. Ruff
  // 0.16 reports RUF100 on `# noqa: E402` directives that 0.15 needs, so an
  // unpinned `brew install ruff` turns `lint:python` red on a file CI is happy
  // with. Homebrew has no version selector, so pipx installs the pin instead.
  ruff: {
    why: "linting the Python launcher",
    probe: () => hasCommand("ruff"),
    needs: ["python"],
    install: {
      darwin: [
        ["brew", "install", "pipx"],
        ["pipx", "install", `ruff==${PINS.ruff.version}`],
      ],
      linux: [
        [
          "python3",
          "-m",
          "pip",
          "install",
          "--user",
          `ruff==${PINS.ruff.version}`,
        ],
      ],
    },
  },
  mypy: {
    why: "type-checking the Python launcher",
    probe: () => hasCommand("mypy"),
    needs: ["python"],
    install: {
      darwin: [
        ["brew", "install", "pipx"],
        ["pipx", "install", `mypy==${PINS.mypy.version}`],
      ],
      linux: [
        [
          "python3",
          "-m",
          "pip",
          "install",
          "--user",
          `mypy==${PINS.mypy.version}`,
        ],
      ],
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
        ["pipx", "install", `lizard==${PINS.lizard.version}`],
      ],
      linux: [["pip3", "install", "--user", `lizard==${PINS.lizard.version}`]],
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
  swift: {
    why: "running the Swift bridge unit tests",
    probe: () => hasCommand("swift", ["--version"]),
    needs: ["macos"],
    manual: "Xcode or the Swift toolchain (macOS only)",
  },
  // Playwright itself is an ordinary devDependency, so `npm ci` is enough to
  // import it — but the browser binary it drives is downloaded separately into
  // a cache outside the repository, and every Playwright gate fails at launch
  // without it. Probing the dependency would therefore always say yes; the
  // executable path is the only honest question.
  chromium: {
    why: "driving the browser conformance harnesses under Playwright",
    probe: () => {
      const probed = spawnSync(
        "node",
        [
          "-e",
          "import('playwright').then((pw)=>{process.exit(require('node:fs').existsSync(pw.chromium.executablePath())?0:1)},()=>process.exit(1))",
        ],
        { encoding: "utf8", timeout: 30_000 },
      );
      return probed.status === 0;
    },
    install: {
      darwin: [["npx", "playwright", "install", "chromium"]],
      linux: [["npx", "playwright", "install", "--with-deps", "chromium"]],
    },
    manual: "npx playwright install chromium",
  },
  // `docker --version` answers even when the daemon is not running, and a gate
  // that shells into a container needs the daemon, not the client. `docker
  // info` is the question that distinguishes them — the same probe
  // `conformance/scenarios/ts/harness.mjs` has always used to decide whether
  // the interop suite can run.
  docker: {
    why: "running the pinned Python reference for the differential fuzzer",
    probe: () =>
      spawnSync("docker", ["info"], {
        encoding: "utf8",
        timeout: 30_000,
      }).status === 0,
    install: {
      darwin: [["brew", "install", "--cask", "docker"]],
      linux: [["sudo", "apt-get", "install", "-y", "docker.io"]],
    },
    manual: "https://docs.docker.com/get-docker/ (the daemon must be running)",
  },
  "android-sdk": {
    why: "running the Android bridge JVM unit tests",
    // The Gradle Android plugin resolves the SDK from these, or from
    // `local.properties` inside the generated project. Probing the environment
    // is the only check that works before the Expo prebuild has run.
    probe: () =>
      Boolean(process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT),
    needs: ["jvm"],
    manual:
      "Android Studio or the command-line SDK tools, with ANDROID_HOME set",
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
 * @property {string} [pinned] the version `tool-versions.json` requires
 * @property {string | null} [installed] the version actually here
 * @property {boolean} [matches] whether the two agree
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
    const present = requirementAvailable(token);
    // Only ask a tool its version when it is here and pinned; a missing tool is
    // already reported, and asking twice would double the doctor's spawns.
    const version = present ? versionReport(token) : null;
    return {
      token,
      present,
      why: requirement?.why ?? "required by a gate",
      gates: index.get(token) ?? [],
      install: requirement?.install?.[platform] ?? [],
      manual: requirement?.manual,
      ...(version ?? {}),
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
