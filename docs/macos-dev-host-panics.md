# 16 GB macOS host kernel panics

<!-- tp-doc
lifecycle: reference
audited: 2026-08-23
register: none
-->

How to collect evidence when the local 16 GB Mac mini kernel-panics during
TwistedPear work, and how to change the load so the next panic is actually
informative. Companion to [single-Mac validation](mac-validation.md),
[iOS simulator conformance](../conformance/ios-sim/README.md), and the 16 GB
headroom rule in [static analysis](static-analysis.md).

This is a host-machine runbook. A panic here is an Apple kernel failure, not a
TwistedPear test failure, and it does not move a `STATUS-*.md` row.

---

## What already collects

On Apple Silicon with SIP enabled, the useful artifacts write themselves:

| Source                        | Where                                                                                                               |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Panic log + process stackshot | `/Library/Logs/DiagnosticReports/panic-full-*.panic` (then `Retired/`)                                              |
| Watchdog reset                | `/Library/Logs/DiagnosticReports/ResetCounter-*.diag` (`Boot faults: wdog,…`)                                       |
| PanicMedic                    | NVRAM `panicmedic-telemetry` / `panicmedic-timestamps`                                                              |
| Analytics auto-submit         | `/Library/Application Support/CrashReporter/DiagnosticMessagesHistory.plist` (`AutoSubmit`, `ThirdPartyDataSubmit`) |

Unified logs from the dying boot are usually gone after the watchdog reboot.
`log show --last boot` after login is the _new_ boot. Do not expect it to
reconstruct the last seconds before the panic.

Kernel debug `boot-args`, KDP, and `keepsyms` need a security downgrade and
do not help on this machine. Always-on `eslogger` is too heavy on 16 GB.

---

## After the next panic

Before opening IDEs or rebooting simulators:

1. Confirm it was a crash, not a logout: `last` should show `crash`, and
   `sysctl kern.boottime` should match the panic file's timestamp.
2. Copy the new `panic-full-*.panic` and `ResetCounter-*.diag` out of
   DiagnosticReports (those directories rotate).
3. Capture post-reboot state while it is still fresh:
   ```sh
   sudo sysdiagnose -f ~/Desktop
   ```
4. File or update one Feedback Assistant report that AutoSubmit cannot
   include: both panic files, the machine (Mac mini M1, 16 GB, macOS version),
   and the load story (which of Freenet, Cursor, Claude, iOS Simulator,
   `TwistedPearHarness` were up). PanicMedic already sent Apple the kernel
   bits; the report is the only place the load story lives.
5. Run Apple Diagnostics once if panics keep clustering (startup options,
   Command-D). Different panic signatures on adjacent days argue software
   or load; a PPM memory result would change that.

Read the panic for `Kernel Extensions in backtrace`, `Panicked task`,
`memoryPressure`, and `procname` of large RSS processes. A backtrace in
`com.apple.iokit.EndpointSecurity` with no third-party kext is an Apple
kernel bug under load, not a userland crash in Node, Maestro, or the
harness.

---

## Time series the panic snapshot does not have

The panic stackshot is one instant. A 30–60 s sampler that **fsyncs each
line to disk** is the highest-value extra diagnostic: RSS/CPU of the top
processes, `memory_pressure`, compressor pages, process count, and whether
`launchd_sim` / `freenet-bin` exist. Without a flush, the panic eats the
buffer.

Do not leave that sampler as a reason to stack more daemons onto the same
16 GB box during `xcodebuild` or Maestro. Start it before the heavy run,
stop it after.

---

## Isolation (also the prevention)

Do not run iOS Simulator / `xcodebuild` / Maestro on this host while all of
the following are also resident:

- Freenet (`freenet-bin`; historically ~4 GB RSS and hours of CPU)
- Cursor (helpers plus a 1 GB+ `node`)
- A second Electron app (Claude)
- A booted iPhone 17 Pro (or any) simulator left up after Maestro finishes

Practical protocol for FN-A2 and other sim work:

1. Quit Freenet before `IOS_SIM_WASM_BUILD=1` / Maestro.
2. Shut the simulator down when the run finishes
   (`xcrun simctl shutdown booted`).
3. Keep the existing rule: do not run `npm run checks:status` or
   `coverage:check` on this contended host; import CI or use `--only=`
   with other IDEs closed.

The local gate runner now treats the broad unit suite and coverage as heavy,
limits both to one Vitest worker, and gives swap at most 60 seconds to drain
while it is measurably improving. A refusal includes a bounded host snapshot.
Do not turn that diagnostic into permission to use `--force-headroom`; close the
named large apps or import CI instead.

Two weeks of iOS sim work with Freenet down and no panic is stronger
evidence than another stackshot. If it still panics with Freenet off, the
remaining hypothesis is the EndpointSecurity kext under sim+IDE load, and
the Feedback report plus `sysdiagnose` are what Apple needs.

---

## Dated evidence (2026-08-18 / 2026-08-19)

Macmini9,1, 16 GB, macOS 26.5.2 (25F84), SIP on, zero third-party kexts,
zero system extensions. Analytics `LastFullSubmissionSuccess` for the
19 Aug panic was 08:56 CDT the same morning.

| When (CDT)       | File                                      | Panic                                                   | Load in stackshot                                                                                                                                                                                                              |
| ---------------- | ----------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 2026-08-18 08:13 | `panic-full-2026-08-18-081309.0002.panic` | `initproc exited` (launchd)                             | `freenet-bin` ~4.5 GB, Cursor; no iOS sim / harness                                                                                                                                                                            |
| 2026-08-19 08:34 | `panic-full-2026-08-19-083442.0002.panic` | Kernel data abort in `com.apple.iokit.EndpointSecurity` | `freenet-bin` ~4.2 GB, Cursor + 1.4 GB `node`, ~323 sim-guest processes, `TwistedPearHarness` 144 MB, `SimMetalHost (iPhone 17 Pro…)`. `xcodebuild`/Maestro not still running. Memory pressure flag false; ~4.5 GB compressed. |

The 19 Aug session started 07:37 (STATUS-SOFTWARE backlog, soaks skipped).
`TwistedPearHarness.app` was written at 08:15; the panic was 19 minutes
later with the sim still booted. `last` recorded that console session as
`crash`. Earlier `last` crashes exist (10 Aug, 30 Jul, 29 Jul).

Userland TwistedPear/Node/Maestro cannot panic XNU except by hitting a
kernel bug. The 19 Aug backtrace was Apple's EndpointSecurity kext
(AMFI + quarantine). Temporal overlap with FN-A2 sim work is real;
exclusive causation is not, given Freenet in both snapshots and the
prior day's different panic.
