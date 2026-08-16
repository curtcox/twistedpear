#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { runGradleWithRetry } from "../../conformance/android-native/run.mjs";
import { applyCoveragePolicy, percentage } from "./native-coverage-policy.mjs";

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const HARNESS = path.join(ROOT, "apps/harness-mobile");
const ANDROID = path.join(HARNESS, "android");
const write = process.argv.includes("--write");
const allowRegressions = process.argv.includes("--allow-regressions");
const METRICS = ["lines", "branches", "methods"];
const MODULES = [
  ["twistedpear-ble-bridge", "ble-bridge"],
  ["twistedpear-multicast", "multicast"],
  ["twistedpear-usb-serial", "usb-serial"],
];

if (!fs.existsSync(ANDROID)) {
  const prebuild = spawnSync(
    "npx",
    ["expo", "prebuild", "--platform", "android", "--no-install"],
    { cwd: HARNESS, stdio: "inherit" },
  );
  if (prebuild.status !== 0) throw new Error("Expo Android prebuild failed");
}

const gradlew = process.platform === "win32" ? "gradlew.bat" : "./gradlew";
runGradleWithRetry(
  gradlew,
  MODULES.map(([project]) => `:${project}:jacocoTestReport`),
  ANDROID,
);

function counter(xml, type) {
  const matches = [
    ...xml.matchAll(
      new RegExp(
        `<counter type="${type}" missed="(\\d+)" covered="(\\d+)"\\/>`,
        "g",
      ),
    ),
  ];
  if (matches.length === 0) throw new Error(`JaCoCo report lacks ${type}`);
  const [, missed, covered] = matches.at(-1);
  return percentage(Number(covered), Number(missed));
}

const measured = Object.fromEntries(
  MODULES.map(([, module]) => {
    const scope = `apps/harness-mobile/modules/${module}/android`;
    const report = path.join(
      ROOT,
      scope,
      "build/reports/jacoco/jacocoTestReport/jacocoTestReport.xml",
    );
    const xml = fs.readFileSync(report, "utf8");
    return [
      scope,
      {
        lines: counter(xml, "LINE"),
        branches: counter(xml, "BRANCH"),
        methods: counter(xml, "METHOD"),
      },
    ];
  }),
);

process.exit(
  applyCoveragePolicy({
    root: ROOT,
    language: "kotlin",
    measured,
    metrics: METRICS,
    description:
      "Per-module Kotlin JVM coverage floors from JaCoCo for the BLE, multicast, and USB-serial bridges. Values may only rise; low initial floors expose hardware-bound code that is not yet exercised by JVM tests.",
    write,
    allowRegressions,
  }),
);
