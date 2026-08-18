#!/usr/bin/env node
/**
 * Single-Mac staged validation runner for docs/mac-validation.md.
 *
 * Defaults to the CI-parity local pass (doctor + Stages 1-5). Use --full for
 * the mobile and default soak stages, --stage N for one stage, and --dry-run
 * to print the exact command plan without executing it.
 */

import { spawn, spawnSync } from "node:child_process";
import { createWriteStream, existsSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { alreadyPassed } from "./resume.mjs";
import { printHelp } from "./usage.mjs";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");
const androidHome =
  process.env.ANDROID_HOME ?? join(homedir(), "Library/Android/sdk");
const defaultLogDir = join(
  repoRoot,
  ".tmp/mac-validation",
  new Date().toISOString().replace(/[:.]/g, "-"),
);
const java17Token = "__MAC_VALIDATION_JAVA_HOME_17__";
const java17Display = `"$(/usr/libexec/java_home -V 2>&1 | awk '/^[[:space:]]*17([.[:space:]]|$)/ { for (i=1; i<=NF; i++) if ($i ~ /^\\//) { print $i; exit } }')"`;

export function parseArgs(argv) {
  const options = {
    dryRun: false,
    list: false,
    full: false,
    aiDoctor: false,
    skipDoctor: false,
    continueOnFailure: false,
    resume: false,
    planDuration: false,
    noCaffeinate: false,
    startAndroidEmulator: false,
    logDir: defaultLogDir,
    stages: [],
    from: undefined,
    through: undefined,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") options.help = true;
    else if (arg === "--dry-run") options.dryRun = true;
    else if (arg === "--list") options.list = true;
    else if (arg === "--full") options.full = true;
    else if (arg === "--ai") options.aiDoctor = true;
    else if (arg === "--skip-doctor") options.skipDoctor = true;
    else if (arg === "--continue-on-failure") options.continueOnFailure = true;
    else if (arg === "--resume") options.resume = true;
    else if (arg === "--plan-duration") options.planDuration = true;
    else if (arg === "--no-caffeinate") options.noCaffeinate = true;
    else if (arg === "--start-android-emulator")
      options.startAndroidEmulator = true;
    else if (arg === "--stage" || arg === "--stages")
      options.stages.push(...readNumberList(argv[++i], arg));
    else if (arg.startsWith("--stage="))
      options.stages.push(
        ...readNumberList(arg.slice("--stage=".length), "--stage"),
      );
    else if (arg.startsWith("--stages="))
      options.stages.push(
        ...readNumberList(arg.slice("--stages=".length), "--stages"),
      );
    else if (arg === "--from") options.from = readStageNumber(argv[++i], arg);
    else if (arg.startsWith("--from="))
      options.from = readStageNumber(arg.slice("--from=".length), "--from");
    else if (arg === "--through" || arg === "--to")
      options.through = readStageNumber(argv[++i], arg);
    else if (arg.startsWith("--through="))
      options.through = readStageNumber(
        arg.slice("--through=".length),
        "--through",
      );
    else if (arg.startsWith("--to="))
      options.through = readStageNumber(arg.slice("--to=".length), "--to");
    else if (arg === "--log-dir") options.logDir = resolve(argv[++i]);
    else if (arg.startsWith("--log-dir="))
      options.logDir = resolve(arg.slice("--log-dir=".length));
    else throw new Error(`unknown option: ${arg}`);
  }

  return options;
}

function readNumberList(value, flag) {
  if (!value)
    throw new Error(`${flag} requires a stage number or comma-separated list`);
  return value.split(",").map((item) => readStageNumber(item, flag));
}

function readStageNumber(value, flag) {
  if (!/^\d+$/.test(value ?? "")) {
    throw new Error(`${flag} must be a stage number from 0 through 8`);
  }

  const stage = Number.parseInt(value, 10);
  if (!Number.isInteger(stage) || stage < 0 || stage > 8) {
    throw new Error(`${flag} must be a stage number from 0 through 8`);
  }

  return stage;
}

function npmScript(script, opts = {}) {
  return {
    label: opts.label ?? script,
    cmd: "npm",
    args: opts.args ?? ["run", script],
    env: opts.env,
    cwd: opts.cwd,
    note: opts.note,
  };
}

function docker(args, opts = {}) {
  return {
    label: opts.label ?? `docker ${args.join(" ")}`,
    cmd: "docker",
    args,
    env: opts.env,
    cwd: opts.cwd,
    note: opts.note,
  };
}

export function buildStages(options) {
  const stage8Default = [
    npmScript("test:link-soak"),
    npmScript("test:integration-soak"),
    npmScript("test:mixed-network-soak"),
    npmScript("test:dist-soak"),
    npmScript("test:miniapp-soak"),
    npmScript("test:transport-node-soak"),
    npmScript("test:desktop-soak"),
    npmScript("test:web-soak"),
    npmScript("test:ios-soak"),
  ];

  const stage8PlanDuration = [
    npmScript("test:link-soak", { env: { LINK_SOAK_DURATION_MS: "3600000" } }),
    npmScript("test:integration-soak", {
      env: { SOAK_DURATION_MS: "86400000" },
    }),
    npmScript("test:dist-soak", { env: { SOAK_DURATION_MS: "86400000" } }),
    npmScript("test:mixed-network-soak", {
      env: { SOAK_DURATION_MS: "86400000" },
    }),
    npmScript("test:miniapp-soak", { env: { SOAK_DURATION_MS: "86400000" } }),
    npmScript("test:ios-soak:required", {
      env: { SOAK_DURATION_MS: "86400000", IOS_LIFECYCLE_CYCLES: "100" },
    }),
    npmScript("test:transport-node-soak", {
      env: { TRANSPORT_SOAK_DURATION_MS: "259200000" },
    }),
    npmScript("test:desktop-soak", {
      env: { SOAK_DURATION_MS: "300000", DESKTOP_SOAK_CYCLES: "864" },
    }),
  ];

  return new Map([
    [
      0,
      {
        title: "Toolchain doctor",
        commands: [
          npmScript("doctor:mac", {
            label: options.aiDoctor ? "doctor:mac -- --ai" : "doctor:mac",
            args: options.aiDoctor
              ? ["run", "doctor:mac", "--", "--ai"]
              : undefined,
          }),
        ],
      },
    ],
    [
      1,
      {
        title: "Build, unit, fuzz, benchmarks",
        commands: [
          { label: "npm ci", cmd: "npm", args: ["ci"] },
          npmScript("build"),
          { label: "npm test", cmd: "npm", args: ["test"] },
          npmScript("test:fuzz"),
          npmScript("test:bare-smoke"),
          npmScript("test:bare-runtime"),
          npmScript("test:bare-benchmark-compare"),
          npmScript("test:bare-benchmark-bare-compare"),
        ],
      },
    ],
    [
      2,
      {
        title: "Docker interop",
        commands: [
          docker([
            "compose",
            "-f",
            "conformance/docker/docker-compose.yml",
            "build",
          ]),
          npmScript("test:interop"),
          npmScript("test:transport-role", { env: { INTEROP: "1" } }),
          npmScript("test:rnsd-mode", { env: { INTEROP: "1" } }),
          npmScript("test:propagation-interop", { env: { INTEROP: "1" } }),
          npmScript("test:link-benchmark"),
          npmScript("test:auto-interop"),
          npmScript("test:bonjour-interop"),
          npmScript("test:i2p-interop"),
          npmScript("test:web-interop"),
        ],
      },
    ],
    [
      3,
      {
        title: "Distribution and mini-app runtime",
        commands: [
          npmScript("test:cli"),
          npmScript("test:dist-interop"),
          npmScript("test:bare-hyperdrive"),
          npmScript("test:bare-hyperswarm"),
          npmScript("test:bare-interop"),
          npmScript("test:seeder"),
          npmScript("test:updates"),
          npmScript("test:budgets"),
          npmScript("test:harness-install"),
          npmScript("test:lan-mirror"),
          npmScript("test:hostile-apps"),
          npmScript("test:hostile-authors"),
          npmScript("test:sdk-interop"),
          npmScript("test:dev-loop"),
          npmScript("test:examples"),
          npmScript("test:handbook"),
          npmScript("test:handbook-report"),
          npmScript("test:miniapp-benchmark"),
          npmScript("test:widget-parity"),
          npmScript("test:devstudio-loop"),
          npmScript("test:serialport-load"),
        ],
      },
    ],
    [
      4,
      {
        title: "Web host",
        commands: [
          npmScript("test:web-runtime"),
          npmScript("test:web-sandbox"),
          npmScript("test:web-widget-renderer"),
          npmScript("test:web-storage"),
          npmScript("test:web-miniapp"),
          npmScript("test:web-examples"),
          npmScript("test:web-distribution"),
          npmScript("test:web-devstudio"),
          npmScript("test:web-handbook"),
          npmScript("test:web-pwa"),
          npmScript("test:web-hyperdrive"),
          npmScript("test:web-hyperdrive-browser"),
          npmScript("test:web-rnode"),
          npmScript("test:web-interop-browser", { env: { INTEROP: "1" } }),
        ],
      },
    ],
    [
      5,
      {
        title: "Desktop host",
        commands: [
          npmScript("test:desktop"),
          npmScript("test:desktop-lifecycle"),
        ],
      },
    ],
    [
      6,
      {
        title: "iOS simulator",
        commands: [
          npmScript("build:worklet"),
          docker([
            "compose",
            "-f",
            "conformance/docker/docker-compose.yml",
            "up",
            "-d",
            "leaf-echo",
          ]),
          npmScript("test:ios-sim:required", {
            env: { IOS_SIM_TCP_REQUIRED: "1", IOS_LIFECYCLE_CYCLES: "100" },
          }),
          npmScript("test:handbook-mobile"),
          npmScript("build:worklet", {
            env: { TWISTEDPEAR_STORE_POSTURE: "store" },
          }),
        ],
      },
    ],
    [
      7,
      {
        title: "Android emulator lab",
        commands: [
          ...(options.startAndroidEmulator
            ? [
                {
                  label: "start Pixel_8_API_34 emulator",
                  custom: startAndroidEmulator,
                },
              ]
            : []),
          npmScript("test:android-native", { env: java17Env() }),
          docker([
            "compose",
            "-f",
            "conformance/docker/docker-compose.yml",
            "up",
            "-d",
            "--build",
            "leaf-echo",
          ]),
          {
            label: "expo run:android",
            cmd: "npx",
            args: ["expo", "run:android"],
            cwd: join(repoRoot, "apps/harness-mobile"),
            env: java17Env(),
            note: "Requires a booted emulator unless --start-android-emulator is used.",
          },
          npmScript("test:android-emulator", {
            env: { ANDROID_EMULATOR_REQUIRED: "1" },
          }),
          npmScript("test:android-emulator:e3", {
            env: { ANDROID_EMULATOR_REQUIRED: "1" },
          }),
          npmScript("test:android-emulator:e5", {
            env: { ANDROID_EMULATOR_REQUIRED: "1" },
          }),
        ],
      },
    ],
    [
      8,
      {
        title: options.planDuration ? "Plan-duration soaks" : "Default soaks",
        commands: options.planDuration ? stage8PlanDuration : stage8Default,
      },
    ],
  ]);
}

function java17Env() {
  return {
    JAVA_HOME: java17Token,
  };
}

export function selectedStages(options) {
  if (options.stages.length > 0) return uniqueSorted(options.stages);
  if (options.from !== undefined || options.through !== undefined) {
    const from = options.from ?? 1;
    const through = options.through ?? from;
    if (from > through) throw new Error("--from must be <= --through");
    return Array.from(
      { length: through - from + 1 },
      (_, index) => from + index,
    );
  }
  if (options.full) return [1, 2, 3, 4, 5, 6, 7, 8];
  return [1, 2, 3, 4, 5];
}

function uniqueSorted(values) {
  return [...new Set(values)].sort((a, b) => a - b);
}

export function runStagesForOptions(options, stages = buildStages(options)) {
  const chosen = selectedStages(options);
  const runStages =
    options.skipDoctor || chosen.includes(0) ? chosen : [0, ...chosen];
  const invalid = runStages.filter((stage) => !stages.has(stage));
  if (invalid.length > 0)
    throw new Error(`unknown stage(s): ${invalid.join(", ")}`);
  return runStages;
}

function mergedEnv(extra = {}) {
  const pathParts = [
    join(androidHome, "platform-tools"),
    join(androidHome, "emulator"),
    join(homedir(), ".maestro/bin"),
    process.env.PATH ?? "",
  ];
  const env = {
    ...process.env,
    ANDROID_HOME: androidHome,
    PATH: pathParts.join(":"),
  };

  for (const [key, value] of Object.entries(extra)) {
    env[key] = shellEval(value);
  }

  return env;
}

function shellEval(value) {
  if (value !== java17Token) return value;

  return javaHome17();
}

function javaHome17() {
  const result = spawnSync("/usr/libexec/java_home", ["-V"], {
    encoding: "utf8",
  });
  const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  const line = output
    .split("\n")
    .find((candidate) => /^\s*17(?:[.\s]|$)/.test(candidate));
  const match = line?.match(/(\/.*\/Contents\/Home)\s*$/);
  if (!match)
    throw new Error("no Java 17 runtime listed by /usr/libexec/java_home -V");
  return match[1];
}

async function startAndroidEmulator(context) {
  const emulator = join(androidHome, "emulator/emulator");
  if (!existsSync(emulator)) {
    throw new Error(
      `${emulator} does not exist; run conformance/mac-validation/setup.sh`,
    );
  }

  const log = createWriteStream(context.logPath, { flags: "a" });
  log.write(
    `[mac-validation] starting ${emulator} -avd Pixel_8_API_34 -no-snapshot-load\n`,
  );
  const child = spawn(
    emulator,
    ["-avd", "Pixel_8_API_34", "-no-snapshot-load"],
    {
      detached: true,
      stdio: ["ignore", "ignore", "ignore"],
      env: mergedEnv(),
    },
  );
  child.unref();
  log.write(
    `[mac-validation] emulator process detached with pid ${child.pid}\n`,
  );
  log.end();

  const adbWait = await runCommand(
    {
      label: "wait for Android emulator boot",
      cmd: "adb",
      args: ["wait-for-device"],
      env: {},
      cwd: repoRoot,
    },
    { ...context, logPath: context.logPath.replace(/\.log$/, "-adb-wait.log") },
  );
  if (adbWait !== 0) throw new Error("adb wait-for-device failed");

  const bootWait = await runCommand(
    {
      label: "wait for sys.boot_completed",
      cmd: "node",
      args: [
        "-e",
        "let n=0; const {spawnSync}=require('child_process'); while(n++<60){ const r=spawnSync('adb',['shell','getprop','sys.boot_completed'],{encoding:'utf8'}); if((r.stdout||'').trim()==='1') process.exit(0); spawnSync('sleep',['2']); } process.exit(1);",
      ],
      env: {},
      cwd: repoRoot,
    },
    {
      ...context,
      logPath: context.logPath.replace(/\.log$/, "-boot-complete.log"),
    },
  );
  if (bootWait !== 0)
    throw new Error("emulator did not report sys.boot_completed=1");
}

export function commandLine(command) {
  const env = command.env
    ? `${Object.entries(command.env)
        .map(([key, value]) => `${key}=${quoteEnvValue(value)}`)
        .join(" ")} `
    : "";
  return `${env}${command.cmd} ${command.args.map(quote).join(" ")}`.trim();
}

function quoteEnvValue(value) {
  return value === java17Token ? java17Display : quote(value);
}

function quote(value) {
  if (/^[A-Za-z0-9_./:=@+-]+$/.test(value)) return value;
  return JSON.stringify(value);
}

async function runCommand(command, context) {
  if (command.note) console.log(`[mac-validation] note: ${command.note}`);

  if (command.custom) {
    console.log(`[mac-validation] $ ${command.label}`);
    await appendLog(
      context.logPath,
      `[mac-validation] cwd: ${command.cwd ?? repoRoot}\n`,
    );
    await appendLog(
      context.logPath,
      `[mac-validation] command: ${command.label}\n\n`,
    );
    try {
      await command.custom(context);
      await appendLog(context.logPath, "\n[mac-validation] exit: 0\n");
      return 0;
    } catch (error) {
      await appendLog(
        context.logPath,
        `\n[mac-validation] custom command failed: ${error instanceof Error ? error.message : String(error)}\n`,
      );
      await appendLog(context.logPath, "[mac-validation] exit: 1\n");
      return 1;
    }
  }

  console.log(`[mac-validation] $ ${commandLine(command)}`);
  const log = createWriteStream(context.logPath, { flags: "a" });
  log.write(`[mac-validation] cwd: ${command.cwd ?? repoRoot}\n`);
  log.write(`[mac-validation] command: ${commandLine(command)}\n\n`);

  const child = spawn(command.cmd, command.args, {
    cwd: command.cwd ?? repoRoot,
    env: mergedEnv(command.env),
    stdio: ["inherit", "pipe", "pipe"],
  });

  child.stdout.on("data", (chunk) => {
    process.stdout.write(chunk);
    log.write(chunk);
  });
  child.stderr.on("data", (chunk) => {
    process.stderr.write(chunk);
    log.write(chunk);
  });

  const status = await new Promise((resolveStatus) => {
    child.on("error", (error) => {
      log.write(`\n[mac-validation] spawn failed: ${error.message}\n`);
      resolveStatus(1);
    });
    child.on("close", (code, signal) => resolveStatus(code ?? signal ?? 1));
  });
  log.write(`\n[mac-validation] exit: ${status}\n`);
  await new Promise((resolveEnd) => log.end(resolveEnd));
  return status === 0 ? 0 : 1;
}

async function appendLog(path, text) {
  const log = createWriteStream(path, { flags: "a" });
  log.write(text);
  await new Promise((resolveEnd) => log.end(resolveEnd));
}

export function logFileFor(logDir, stage, index, label) {
  const safe = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
  return join(
    logDir,
    `stage-${stage}-${String(index + 1).padStart(2, "0")}-${safe || "command"}.log`,
  );
}

function startCaffeinate(logDir) {
  const logPath = join(logDir, "plan-duration-caffeinate.log");
  const log = createWriteStream(logPath, { flags: "a" });
  let loggedExit = false;
  let stopping = false;
  let exited = false;
  let resolveStopped;
  const stopped = new Promise((resolve) => {
    resolveStopped = resolve;
  });
  const finishLog = (status) => {
    if (loggedExit) return;
    loggedExit = true;
    log.write(`\n[mac-validation] exit: ${status}\n`);
    log.end(resolveStopped);
  };

  log.write(`[mac-validation] cwd: ${repoRoot}\n`);
  log.write("[mac-validation] command: caffeinate -dimsu\n\n");
  log.write("[mac-validation] helper: caffeinate\n");
  const child = spawn("caffeinate", ["-dimsu"], {
    cwd: repoRoot,
    env: process.env,
    stdio: ["ignore", "ignore", "pipe"],
  });

  child.stderr.on("data", (chunk) => log.write(chunk));
  child.on("error", (error) => {
    log.write(`\n[mac-validation] spawn failed: ${error.message}\n`);
    exited = true;
    finishLog(1);
    console.error(
      `[mac-validation] failed to start caffeinate: ${error.message}`,
    );
  });
  child.on("close", (code, signal) => {
    exited = true;
    finishLog(stopping && signal === "SIGTERM" ? 0 : (code ?? signal ?? 0));
  });

  console.log(
    `[mac-validation] keeping macOS awake with caffeinate -dimsu (log: ${logPath})`,
  );
  return {
    child,
    async stop() {
      stopping = true;
      if (!exited) child.kill("SIGTERM");
      await stopped;
    },
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const stages = buildStages(options);
  if (options.list) {
    for (const [number, stage] of stages) {
      console.log(
        `Stage ${number}: ${stage.title} (${stage.commands.length} command${stage.commands.length === 1 ? "" : "s"})`,
      );
    }
    return;
  }

  const runStages = runStagesForOptions(options, stages);

  console.log(`[mac-validation] stages: ${runStages.join(", ")}`);
  console.log(`[mac-validation] logs: ${options.logDir}`);
  const shouldCaffeinate =
    options.planDuration && runStages.includes(8) && !options.noCaffeinate;

  if (options.dryRun) {
    if (shouldCaffeinate) {
      console.log("\n# Keep awake");
      console.log("caffeinate -dimsu");
    }
    for (const stageNumber of runStages) {
      const stage = stages.get(stageNumber);
      console.log(`\n# Stage ${stageNumber}: ${stage.title}`);
      stage.commands.forEach((command, index) => {
        console.log(
          `${index + 1}. ${command.custom ? command.label : commandLine(command)}`,
        );
      });
    }
    return;
  }

  mkdirSync(options.logDir, { recursive: true });
  const caffeinate = shouldCaffeinate
    ? startCaffeinate(options.logDir)
    : undefined;

  const failures = [];
  try {
    for (const stageNumber of runStages) {
      const stage = stages.get(stageNumber);
      console.log(`\n[mac-validation] Stage ${stageNumber}: ${stage.title}`);
      for (let index = 0; index < stage.commands.length; index += 1) {
        const command = stage.commands[index];
        const logPath = logFileFor(
          options.logDir,
          stageNumber,
          index,
          command.label,
        );
        if (options.resume && alreadyPassed(logPath)) {
          console.log(`[mac-validation] resume: skipping ${command.label}`);
          continue;
        }
        const status = await runCommand(command, {
          logPath,
          stageNumber,
          index,
          options,
        });
        if (status !== 0) {
          failures.push({ stage: stageNumber, label: command.label, logPath });
          console.error(
            `[mac-validation] failed: Stage ${stageNumber} ${command.label}`,
          );
          console.error(`[mac-validation] log: ${logPath}`);
          if (!options.continueOnFailure) break;
        }
      }
      if (failures.length > 0 && !options.continueOnFailure) break;
    }

    if (failures.length > 0) {
      console.error(`\n[mac-validation] ${failures.length} failure(s):`);
      for (const failure of failures) {
        console.error(
          `- Stage ${failure.stage} ${failure.label}: ${failure.logPath}`,
        );
      }
      process.exitCode = 1;
    } else {
      console.log("\n[mac-validation] selected stages passed");
    }
  } finally {
    if (caffeinate) {
      console.log("[mac-validation] stopping caffeinate");
      await caffeinate.stop();
    }
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.stack : String(error));
    process.exit(1);
  });
}
