# Mobile app lifecycle as a design constraint

<!-- tp-doc
lifecycle: live
audited: 2026-08-18
register: none
counterpart: docs/mobile-lifecycle-plan.md
-->

Several TwistedPear design decisions exist because the platform must run on iOS and
Android, whose app lifecycle is far more restrictive than a desktop operating system's.
This document states that constraint explicitly, records which decisions follow from it,
and — because a constraint absorbed silently becomes permanent by accident — keeps a
ledger of the utility mini-apps do not get as a result. Candidate expansions and their
sequencing are in [mobile-lifecycle-plan.md](mobile-lifecycle-plan.md).

Desktop is the reference lifecycle here, not the compromise. `tp node`, `tp seed`, and
`apps/host-desktop` already run continuously, carry transport and seeding by default, and
are under no OS pressure to stop. The question this document keeps asking is what mobile
can recover — never what desktop should give up.

## What the mobile OS actually constrains

Two restrictions do the work, and it matters exactly what each one binds:

1. **There is almost no background execution.** iOS suspends the host app outright; there
   is no foreground-service equivalent for a general network daemon, and the declared
   `fetch` and `processing` background modes are short, budgeted wake windows, not
   execution. Android permits sustained background work only through a foreground service
   with a permanent notification, and Doze and OEM battery managers still throttle it.
2. **Only one app is active at a time.** The user has one app on screen. When TwistedPear
   is not it, TwistedPear is not running.

**Both restrictions bind the host process, not the mini-apps inside it.** That distinction
is the whole reason this document has a ledger. The OS decides whether TwistedPear runs. It
does not decide how many sandboxes a running TwistedPear may hold, or what they are told
about their own lifecycle. Every limit of that second kind is ours, and it is on the ledger
below with `self-imposed` next to it.

The platform therefore commits to the opposite default: **as long as the host app is
running, running several mini-apps at once must be possible.** `MiniappHost` holds a
per-app instance map keyed the way grants are (`appId + publisherPublicKey`). Launching a
second app does not stop the first. Each shell has a switcher; only the foreground app's
widget tree is painted. Grants stay live for a running background app; confirmations and
media capture require it to be foregrounded (`FOREGROUND_REQUIRED`). Two running apps may
exchange messages through a brokered `apps:channel` after both sides grant the named
destination; they do not share storage.

Host `suspend-node` / `resume-node` is forwarded into each sandbox. Apps that hold
`runtime:background` keep running across that transition on Android (at most two,
with the battery cost on the grant screen). On iOS the grant is inert. There is no
general `onSuspend`: the app keeps a blob current with `host.setCheckpoint` (64 KiB),
and will-suspend copies that blob under a 50 ms budget. Overrun kills the app rather
than delaying host quiesce. `host.onResume` delivers the blob when the sandbox returns
to running. `runtime:wake` / `host.requestWake` rations periodic wake-ups per host.

## Decisions that follow from it

These are load-bearing choices whose cause is the mobile lifecycle. Each is documented in
full in its own canonical page; what is stated here is _why the choice was available to
make in the first place_.

| Decision                                                                                         | Follows from                                                                                                              | Canonical page                                                                             |
| ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Backgrounding is a state transition (`suspend-node` / `resume-node`), never a hidden daemon mode | iOS suspension is unavoidable, so it is made explicit and observable rather than papered over                             | [iOS host](ios-host.md)                                                                    |
| Desktop and headless peers carry transport, seeding, and propagation by default                  | A phone cannot be a reliable always-on node, so peer density has to come from somewhere else                              | [Desktop host](desktop-host.md), [Propagation node](propagation-node.md)                   |
| Sans-IO protocol code with adapters at the edge                                                  | A lifecycle transition that stops and resumes every interface is only tractable when the protocol layer holds no live I/O | [Sans-IO discipline](sansio.md), [Architecture §4](architecture.md)                        |
| Store-and-forward LXMF delivery rather than assumed liveness                                     | The recipient's host is usually suspended                                                                                 | [Multipart propagation](multipart-propagation.md), [Propagation node](propagation-node.md) |
| Foreground-preferring interface and battery budgets                                              | Radios that a desktop can leave on all day cost a phone its battery                                                       | [Battery and bandwidth policy](battery-bandwidth-policy.md)                                |
| Killable per-app sandboxes with watchdogs                                                        | A hostile or wedged app must die without taking the host's one chance at foreground time with it                          | [Mini-app runtime](miniapp-runtime.md)                                                     |
| Small package budgets and delta-friendly distribution                                            | Installs may happen on a radio link during a single foreground session                                                    | [256t distribution](256t-distribution.md), [Package format](package-format.md)             |

## The ledger

One row per piece of utility a mini-app does not get because of the mobile lifecycle. The
`Cause` column is the point of the exercise:

- **`os`** — the mobile OS forbids it. Only an OS capability, an entitlement, or a
  different host changes the answer.
- **`os-derived`** — the OS forbids something adjacent, and this is our implementation of
  living within it. A different implementation could recover part of the utility.
- **`self-imposed`** — nothing in the mobile OS requires it. The platform chose it, and the
  cost to mini-apps is ours to remove.

<!-- Generated from mobile-lifecycle-ledger.json; conformance/doc-audit/mobile-lifecycle.test.mjs fails if they diverge. -->

| Row                   | Utility withheld                                                    | Cause | Revisit when |
| --------------------- | ------------------------------------------------------------------- | ----- | ------------ |
| `MLC-BACKGROUND-IOS`  | Mini-app code running while the host app is backgrounded on iOS     | `os`  | 2027-02-01   |
| `MLC-ALWAYS-ON-ROLES` | A phone carrying transport, seeding, or propagation for other peers | `os`  | 2027-02-01   |

The decision in force, the cost it carries, what would unlock it, and the files that show
it are recorded per row in [mobile-lifecycle-ledger.json](../mobile-lifecycle-ledger.json).
What it would take to clear the remaining `os` rows is
[mobile-lifecycle-plan.md](mobile-lifecycle-plan.md).

The remaining rows are `os`. Concurrent mini-apps, a brokered app-to-app channel, suspend
checkpoints, Android background execution, and rationed scheduled wake have shipped;
shared storage is still withheld by choice, not by the OS.

## How a row leaves the ledger

A row is removed when the utility ships — the ledger records absent capability, so a row
that describes something the platform now does is simply wrong. Deleting it means deleting
its entry from `mobile-lifecycle-ledger.json` and its line from the table above in the same
change; the audit fails if only one of them moves.

Reclassifying a row is the other legitimate exit, and it needs evidence: an `os` row
becomes `self-imposed` when someone shows the OS permitting the thing, and the note field
must say where that was shown. Reclassification in the other direction — `self-imposed`
becoming `os` — needs the same standard, because that direction is how a limit quietly
acquires a justification it never earned.

## Where this is enforced

`npm run test:doc-audit` runs `conformance/doc-audit/mobile-lifecycle.test.mjs`, which:

- requires every row to declare a defined cause, cite files that exist, and carry exactly
  one revisit trigger — a tracked work id, or a date;
- fails when a `revisit.work` id names no row in any register, so a `self-imposed` cost
  cannot be recorded without work behind it;
- warns when a trigger fires — its date arrives, or its work item closes — and fails once
  a date has been ignored for more than 90 days;
- fails when the table above and the ledger disagree, in content or in order;
- fails when a claim the ledger has recorded as false reappears anywhere in tracked
  markdown. `forbiddenClaims` currently holds the "by design" justifications for a single
  running mini-app that eleven documents carried before this ledger existed.

That last rule is the mechanism this document exists to provide. A constraint that is only
described gets absorbed and forgotten; one that fails the build when it is misattributed
stays a question.
