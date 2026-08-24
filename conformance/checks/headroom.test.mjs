/**
 * Host-headroom judgment, tested against snapshots whose answer is known.
 *
 * The live probe reads os/ps/sysctl; those numbers move underfoot. The 16 GB
 * watchdog stack is the case this exists to refuse, so it is a fixture rather
 * than something we hope to reproduce on the test runner.
 */
import { describe, expect, it } from "vitest";
import { gates } from "../../scripts/checks/registry.mjs";
import {
  GiB,
  HEAVY_GATE_IDS,
  coverageWorkerArgs,
  formatRefusal,
  gateCost,
  hostDiagnostics,
  judgeHeadroom,
  parseProcessTable,
  parseSwapUsedBytes,
  rivalProcesses,
  snapshotHost,
  unitWorkerArgs,
  waitForHeadroom,
} from "../../scripts/checks/headroom.mjs";

const GiB16 = 16 * GiB;

function snapshot(overrides = {}) {
  return {
    ci: false,
    totalBytes: GiB16,
    freeBytes: 8 * GiB,
    swapUsedBytes: 0,
    load1: 1,
    cpuCount: 8,
    processes: [],
    selfPids: new Set([100]),
    ...overrides,
  };
}

describe("parseSwapUsedBytes", () => {
  it("reads the Darwin sysctl line from the watchdog host", () => {
    expect(
      parseSwapUsedBytes(
        "vm.swapusage: total = 8192.00M  used = 7512.50M  free = 679.50M  (encrypted)",
      ),
    ).toBe(7512.5 * 1024 * 1024);
  });

  it("reads Linux /proc/meminfo", () => {
    expect(
      parseSwapUsedBytes(
        "SwapTotal:       8388608 kB\nSwapFree:         921600 kB\n",
      ),
    ).toBe((8388608 - 921600) * 1024);
  });

  it("reads a gigabyte Darwin quantity", () => {
    expect(parseSwapUsedBytes("used = 2.00G")).toBe(2 * GiB);
  });
});

describe("parseProcessTable", () => {
  it("keeps pid, rss, and the command line", () => {
    expect(
      parseProcessTable(
        "  42  2048000 java GradleDaemon 9.3.1\n  99    12000 node scripts/checks/run.mjs --tier=pr\n",
      ),
    ).toEqual([
      { pid: 42, rssKiB: 2_048_000, args: "java GradleDaemon 9.3.1" },
      {
        pid: 99,
        rssKiB: 12_000,
        args: "node scripts/checks/run.mjs --tier=pr",
      },
    ]);
  });
});

describe("snapshotHost", () => {
  it("treats the owning gate runner as self in a nested probe", () => {
    const host = snapshotHost({
      env: { TP_HEADROOM_OWNER_PIDS: "40,41" },
      osApi: {
        totalmem: () => GiB16,
        freemem: () => 8 * GiB,
        loadavg: () => [1],
        cpus: () => Array.from({ length: 8 }),
      },
      readSwap: () => 0,
      listProcesses: () => [
        {
          pid: 40,
          rssKiB: 100_000,
          args: "node scripts/checks/run.mjs --tier=pr",
        },
      ],
      pid: 42,
      ppid: 43,
    });
    expect([...host.selfPids]).toEqual([42, 43, 40, 41]);
    expect(judgeHeadroom(host, { cost: "heavy" }).ok).toBe(true);
  });
});

describe("rivalProcesses", () => {
  it("drops the current gate runner and keeps Gradle/JDT/coverage", () => {
    const rows = parseProcessTable(
      [
        "100 8000 node scripts/checks/run.mjs --tier=pr",
        "200 1800000 java GradleDaemon",
        "201 500000 org.eclipse.equinox.launcher jdt.ls",
        "202 20000 node node_modules/vitest/vitest.mjs run --coverage.enabled",
        "203 4000 vim README.md",
      ].join("\n"),
    );
    expect(rivalProcesses(rows, new Set([100])).map((row) => row.pid)).toEqual([
      200, 201, 202,
    ]);
  });
});

describe("judgeHeadroom", () => {
  it("allows a quiet 16 GB host for a heavy gate", () => {
    expect(judgeHeadroom(snapshot(), { cost: "heavy" }).ok).toBe(true);
  });

  it("skips the probe in CI and when forced", () => {
    const dying = snapshot({
      ci: true,
      swapUsedBytes: 8 * GiB,
      load1: 90,
    });
    expect(judgeHeadroom(dying, { cost: "heavy" }).ok).toBe(true);
    expect(
      judgeHeadroom(snapshot({ swapUsedBytes: 8 * GiB }), {
        cost: "heavy",
        force: true,
      }).ok,
    ).toBe(true);
  });

  it("refuses the 16 GB watchdog stack", () => {
    const verdict = judgeHeadroom(
      snapshot({
        freeBytes: 0.4 * GiB,
        swapUsedBytes: 7.5 * GiB,
        load1: 90,
        processes: [
          { pid: 1, rssKiB: 1_800_000, args: "java GradleDaemon 9.3.1" },
          { pid: 2, rssKiB: 1_800_000, args: "java GradleDaemon 8.10.2" },
          {
            pid: 3,
            rssKiB: 2_000_000,
            args: "java org.eclipse.equinox.launcher jdt.ls",
          },
          {
            pid: 4,
            rssKiB: 400_000,
            args: "node node_modules/vitest/vitest.mjs run --coverage.enabled",
          },
        ],
      }),
      { cost: "heavy" },
    );
    expect(verdict.ok).toBe(false);
    expect(verdict.reasons.join("\n")).toMatch(/swap used/);
    expect(verdict.reasons.join("\n")).toMatch(/load 90/);
    expect(verdict.reasons.join("\n")).toMatch(/rival heap/);
    expect(formatRefusal("coverage", verdict)).toMatch(/checks:status:import/);
  });

  it("refuses a heavy gate on a small host once Gradle is resident, even with free RAM", () => {
    const verdict = judgeHeadroom(
      snapshot({
        freeBytes: 10 * GiB,
        processes: [
          { pid: 1, rssKiB: 400_000, args: "java GradleDaemon 9.3.1" },
        ],
      }),
      { cost: "heavy" },
    );
    expect(verdict.ok).toBe(false);
    expect(verdict.reasons.join("\n")).toMatch(/GradleDaemon/);
  });

  it("refuses even a light gate once the host is already swapping hard", () => {
    expect(
      judgeHeadroom(snapshot({ swapUsedBytes: 7.5 * GiB }), { cost: "light" })
        .ok,
    ).toBe(false);
  });

  it("lets light gates run through stale moderate swap when free RAM is healthy", () => {
    expect(
      judgeHeadroom(snapshot({ freeBytes: 6 * GiB, swapUsedBytes: 3 * GiB }), {
        cost: "light",
      }).ok,
    ).toBe(true);
  });

  it("refuses a light gate when moderate swap accompanies low free RAM", () => {
    const verdict = judgeHeadroom(
      snapshot({ freeBytes: 0.5 * GiB, swapUsedBytes: 3 * GiB }),
      { cost: "light" },
    );
    expect(verdict.ok).toBe(false);
    expect(verdict.reasons.join("\n")).toMatch(/free memory/);
  });

  it("allows a light gate next to Gradle when swap and load are calm", () => {
    expect(
      judgeHeadroom(
        snapshot({
          processes: [
            { pid: 1, rssKiB: 400_000, args: "java GradleDaemon 9.3.1" },
          ],
        }),
        { cost: "light" },
      ).ok,
    ).toBe(true);
  });

  it("allows a heavy gate next to Gradle on a 32 GB host with headroom", () => {
    expect(
      judgeHeadroom(
        snapshot({
          totalBytes: 32 * GiB,
          freeBytes: 20 * GiB,
          processes: [
            { pid: 1, rssKiB: 400_000, args: "java GradleDaemon 9.3.1" },
          ],
        }),
        { cost: "heavy" },
      ).ok,
    ).toBe(true);
  });
});

describe("coverage serialisation", () => {
  it("pins one Vitest worker locally and leaves CI on the default pool", () => {
    expect(coverageWorkerArgs({})).toEqual(["--maxWorkers=1"]);
    expect(coverageWorkerArgs({ CI: "true" })).toEqual([]);
    expect(coverageWorkerArgs({ CI: "true", TP_COVERAGE_SERIAL: "1" })).toEqual(
      ["--maxWorkers=1"],
    );
  });
});

describe("unit serialisation", () => {
  it("pins one Vitest worker locally and leaves CI on the default pool", () => {
    expect(unitWorkerArgs({})).toEqual(["--maxWorkers=1"]);
    expect(unitWorkerArgs({ TP_UNIT_MAX_WORKERS: "2" })).toEqual([
      "--maxWorkers=2",
    ]);
    expect(unitWorkerArgs({ CI: "true", TP_UNIT_MAX_WORKERS: "1" })).toEqual(
      [],
    );
  });
});

describe("bounded headroom recovery", () => {
  it("continues while swap is draining and accepts a recovered host", async () => {
    const samples = [
      snapshot({ swapUsedBytes: 3 * GiB }),
      snapshot({ swapUsedBytes: 2.5 * GiB }),
      snapshot({ swapUsedBytes: 1.5 * GiB }),
    ];
    let waits = 0;
    const result = await waitForHeadroom({
      cost: "heavy",
      sample: () => samples.shift(),
      wait: async () => {
        waits += 1;
      },
      maxSamples: 7,
    });
    expect(result.verdict.ok).toBe(true);
    expect(result.recovered).toBe(true);
    expect(result.samples).toBe(3);
    expect(waits).toBe(2);
  });

  it("stops after one non-improving recovery sample", async () => {
    const samples = [
      snapshot({ swapUsedBytes: 3 * GiB }),
      snapshot({ swapUsedBytes: 3 * GiB }),
    ];
    let waits = 0;
    const result = await waitForHeadroom({
      cost: "heavy",
      sample: () => samples.shift(),
      wait: async () => {
        waits += 1;
      },
      maxSamples: 7,
    });
    expect(result.verdict.ok).toBe(false);
    expect(result.samples).toBe(2);
    expect(waits).toBe(1);
  });

  it("does not sleep for a competing heap", async () => {
    let waits = 0;
    const result = await waitForHeadroom({
      cost: "heavy",
      sample: () =>
        snapshot({
          processes: [
            { pid: 1, rssKiB: 400_000, args: "java GradleDaemon 9.3.1" },
          ],
        }),
      wait: async () => {
        waits += 1;
      },
    });
    expect(result.verdict.ok).toBe(false);
    expect(waits).toBe(0);
  });
});

describe("headroom diagnostics", () => {
  it("records bounded, redacted process details in refusal output", () => {
    const host = snapshot({
      swapUsedBytes: 5 * GiB,
      processes: [
        {
          pid: 42,
          rssKiB: 2_048_000,
          args: "Google Chrome --profile-directory=/private/user/path",
        },
      ],
    });
    const diagnostic = hostDiagnostics(host);
    expect(diagnostic.largestRss).toEqual([
      { pid: 42, label: "Chrome", rssMiB: 2000 },
    ]);
    expect(JSON.stringify(diagnostic)).not.toContain("/private/user/path");
    const output = formatRefusal(
      "unit-tests",
      judgeHeadroom(host, { cost: "heavy" }),
      host,
      3,
    );
    expect(output).toMatch(/largest RSS: Chrome 2000 MiB/);
    expect(output).toMatch(/recovery samples: 3/);
  });
});

describe("heavy gates", () => {
  it("names registered gates, including unit tests and coverage", () => {
    expect(gateCost("unit-tests")).toBe("heavy");
    expect(gateCost("coverage")).toBe("heavy");
    expect(gateCost("lint")).toBe("light");
    for (const id of HEAVY_GATE_IDS) {
      expect(
        gates.some((gate) => gate.id === id),
        `${id} is a registered gate`,
      ).toBe(true);
    }
  });
});
