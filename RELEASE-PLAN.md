# TwistedPear — v1 release plan

How we iterate on the app and its testing until it is ready for release, and how we
know when it is. This plan sequences existing machinery; it does not replace the
canonical registers:

- Open software work: [STATUS-SOFTWARE.md](STATUS-SOFTWARE.md)
- Device-/account-gated work: [STATUS-HARDWARE.md](STATUS-HARDWARE.md)
- Verified evidence: [STATUS-COMPLETE.md](STATUS-COMPLETE.md)
- Known costs of the design: [LIMITATIONS.md](LIMITATIONS.md)

Every release gate below traces back to the two claims in
[docs/motivation.md](docs/motivation.md): users know and choose who is involved in
what they do, and running a dangerous program by accident is essentially impossible.

## 1. What v1 ships

| Target | Channel | Verification bar |
|---|---|---|
| Desktop host (macOS, Linux) | Signed installers; macOS notarized | Full loop + plan-duration desktop soak + real-LAN evidence (H18) |
| Desktop host (Windows) | NSIS installer | Ships only if H17 passes; otherwise deferred, not "unverified" |
| Android host | Direct APK / F-Droid — no Play Store | Device evidence H1–H3, H6–H7, H9–H11 |
| Web host | Self-served from user's node (`tp node --serve-web`) | Web conformance suites + sandbox adversarial review parity |
| Headless node / seeder | `tp` CLI | 2-week unattended run (H20) |
| `reticulum-ts` 0.1.0 | Tagged package release | After the 72 h transport soak (per STATUS-SOFTWARE) |

**Not in v1:** iOS beyond dev-build (no store submission; dossier stays current),
Play Store submission, node-to-node propagation peering (use `lxmd`), React
reconciler renderer. **Conditional:** RNode/LoRa support ships as verified only if
H4/H8 hardware evidence lands in time; otherwise it ships labeled *experimental,
simulator-verified only* in LIMITATIONS §3/§6.

## 2. Release gates

v1 is ready when every gate is green. Gates are evidence statements, not work items —
the work lives in the loops (§3).

| Gate | Statement | Evidence source |
|---|---|---|
| **G1 — Software qualification** | Every row of the release-qualification table in STATUS-SOFTWARE is complete (plan-duration soaks; `reticulum-ts` 0.1.0 tagged) | `npm run validate:mac -- --stage 8 --plan-duration` logs; release tag |
| **G2 — Core device evidence** | H1, H2, H3, H6, H7, H9, H10, H11, H18, H20, H21 passed and logged; LIMITATIONS §§3, 5–7 updated with measured values | STATUS-HARDWARE checklists |
| **G3 — Safety bar: abuse ladder holds L3** | L0–L3 rungs green per [docs/abuse-resistance-loop.md](docs/abuse-resistance-loop.md): escrow/recovery + quorum oracles clean under colluding relays and compromised host; every genuine finding fixed with a committed reproducer | `conformance/sim-campaign/artifacts/report.json`; `conformance/sim-regressions/` |
| **G4 — Trust loop verified end-to-end** | On real devices, a user can: see an app's source before running, verify author signature, review requested capabilities and reasons, grant/deny, and revoke — and an unsigned/tampered/over-reaching package is refused (hostile-app suites + H9/H11 on device) | `test:hostile-apps` + H-register logs |
| **G5 — Packaging and provenance** | Versioned, signed artifacts for every shipped target; macOS notarized (needs H12 account); install docs match a from-scratch install on a clean machine | Release artifacts + walkthrough log |
| **G6 — Docs tell the truth** | LIMITATIONS reflects final measured values; README/Handbook install paths verified; release notes state what is verified vs experimental | Doc review against G1–G5 evidence |
| **G7 — Human-layer resistance** | The trust UI survives adversaries who target the user, not the system: spoofing-resistance fixtures prove a mini-app cannot imitate host chrome or grant dialogs; deception/impersonation abuse verbs sit in the campaign coverage cube with clean oracles; automated UI invariants prove "who is involved" and capability status are reachable from every mini-app screen; a11y scans gate green on trust-critical surfaces; scripted comprehension sessions with outside testers pass their pre-committed thresholds | `test:hostile-apps` + `test:ui-invariants` tiers; campaign report; usability session logs (Loop E) |

G3 is the deliberate hard choice: L3 requires escrow/recovery product semantics that
do not exist yet (today an explicit scope boundary in the simulation docs). That new
product work is on the critical path — see Loop C. G7 exists because motivation.md's
first claim ("users always know who is involved") is a *comprehension* claim, and
functional flow tests cannot discharge it; its tester sessions are the plan's only
gate that requires human perception.

## 3. The iteration loops

Claude turns the cranks; the user does only the steps marked **[user]** (hardware,
purchases, accounts, and starting long soaks). Every loop turn ends by updating the
canonical status registers — this plan is never the record of what passed.

**Automation rule.** Every recurring check in these loops must exist as a checked-in
script or test tier (`npm run …`) that a session or CI can execute without judgment.
A step may stay manual only if it requires hardware in hand, an account action, or
human perception — and any turn that touches a manual step should try to shrink or
script it. One-off findings become fixtures; fixtures become tiers; tiers get wired
into PR or nightly CI per [docs/ci-policy.md](docs/ci-policy.md). The crank itself
is a thing we automate.

### Loop A — Keep-green (every session, background discipline)

`npm run build && npm test` plus the CI-tier conformance suites relevant to whatever
changed. Any red is fixed before new work. This is a discipline, not a phase.

### Loop B — Soak ladder (calendar time, low effort)

1. **[user]** Start `npm run validate:mac -- --stage 8 --plan-duration` on the Mac
   (needs it powered and awake; the 72 h transport soak is the long pole).
2. Claude monitors logs, triages any failure to a minimal reproducer, fixes, and
   restarts the affected soak.
3. On completion, record evidence in STATUS-COMPLETE, strike the row from
   STATUS-SOFTWARE, and after the 72 h transport soak, tag `reticulum-ts` 0.1.0.

Start this loop **first**: it costs calendar time, not attention, and G1 cannot
finish without it.

### Loop C — Abuse-resistance climb to L3 (critical path)

Runs exactly as specified in [docs/abuse-resistance-loop.md](docs/abuse-resistance-loop.md)
(one fidelity *or* difficulty increment per turn, six stages, ratchet). The
release-specific sequence:

1. **Hold L2.** Confirm the current rung's exit criteria with a fresh campaign;
   fix any stragglers.
2. **Design escrow/recovery + quorum semantics.** Write the spec/ADR for the
   authority machines the L3 oracles reference, formal twins first
   (TLA+/Tamarin/ProVerif per the loop's rule: twin lands before the machine ships).
3. **Implement** the machines behind the sans-IO fence, with conformance traces
   accepted from the twins.
4. **Extend the coverage cube with human-layer abuse verbs** (backs G7): deception
   within granted capabilities, author impersonation and 256t look-alikes,
   trust-bootstrapping ("behave for months, then ship the payload"), and compromised
   author keys — each verb anchored to its STRIDE/LINDDUN mapping and landing with an
   oracle, so G7's adversaries are campaign cells, not prose. Key-compromise cells
   must exercise revocation propagation and report it through the existing
   containment metrics.
5. **Climb L3** turn by turn: colluding-pair schedules, colluding relays,
   compromised host, calibrated transport distributions. Fix, regression-lock,
   re-baseline until the L3 exit criterion holds.
6. **Lock the rung** into nightly. L4/L5 continue post-release; if RNode calibration
   traces (H4-D) arrive early, fold them in, but they do not gate v1.

### Loop D — Device evidence (as hardware arrives)

1. **[user]** Acquire hardware in the order already prioritized in STATUS-HARDWARE
   (§Hardware acquisition order): two used Android phones and the Apple Developer
   account cover most of G2 and G5; RNode pair and Windows machine as they come.
2. **[user]** Execute each H-register checklist with devices in hand (the steps are
   already written as runbooks).
3. Claude prepares anything missing before each session (builds, fixtures, adb
   scripts), triages failures, fixes, and updates LIMITATIONS with measured values.
4. Each completed row moves to STATUS-COMPLETE with its log.

Release-gating rows: H1–H3, H6–H7, H9–H11, H18, H20, H21 (+H12 for notarization,
H17 for the Windows artifact). All others improve the release but do not gate it.

### Loop E — Human-layer validation (automate everything except the humans)

Backs G7. Items 1–4 are pure automation and start as soon as a session picks them
up; item 5 feeds Loop C; only item 6 needs people.

1. **Spoofing-resistance fixtures** in the hostile-app suite: mini-apps that attempt
   to imitate host chrome, grant dialogs, capability badges, or the Handbook. Pass =
   imitation is impossible by construction (widget whitelist) or unmistakably badged
   as app content. Lands in the `test:hostile-apps` tier and runs on every PR.
2. **UI trust invariants** as automated flows on the existing drivers (Playwright
   for web/desktop, Maestro on the Android emulator): from any mini-app screen,
   "who is involved" — author identity, granted capabilities, capabilities in use,
   peers being contacted — is reachable within two interactions; every grant prompt
   shows what is requested and the author's stated why; revocation is always
   reachable and takes effect without restart. Lands as `test:ui-invariants`, wired
   into CI.
3. **Accessibility scans** (axe-core against the web/desktop DOM renderer) gate
   green on trust-critical surfaces — a trust UI a screen-reader user cannot
   operate fails motivation.md's "users always know," not just a checklist.
4. **Visual regression** on trust-critical surfaces (grant dialog, source viewer,
   capability badges, revocation flow), so a change that hides trust information
   shows up as a diff in review, not as an opinion.
5. **Adversarial-UX review**: a checklist-driven pass over the trust surfaces —
   look-alike names/ids, urgency framing in app descriptions, capability-request
   social engineering, key-compromise recovery UX. Each finding becomes a fixture
   in items 1–2 or a campaign cell in Loop C step 4; the review itself is repeated
   only when trust surfaces change.
6. **[user] Comprehension sessions** — the one irreducibly manual step: 3–5 testers
   from outside the project, run twice (once when items 1–4 are green, once
   pre-release), against scripted tasks with pass thresholds committed beforehand:
   "find out who is involved in what this app just did," "decide whether this app
   is safe to install and say why," "spot the impersonator among these two apps,"
   "revoke this app's network access." Claude prepares the script, builds, and
   scoring sheet; failures route to fixes and a re-run, not to a shrug.

### Loop F — Release packaging (last, short)

1. Reproducible signed builds for every shipped target; macOS notarization
   ([docs/macos-notarization.md](docs/macos-notarization.md), needs H12).
2. **[user]** Clean-machine install walkthrough per target following only the docs;
   Claude fixes every gap found.
3. Release notes: verified claims with evidence links; experimental features
   labeled; LIMITATIONS final pass (G6).
4. Tag, publish artifacts, publish `reticulum-ts` 0.1.0.

## 4. Sequencing

```
now ──────────────────────────────────────────────────────► release
Loop A  ══════════════════════════════════════════════════  (always on)
Loop B  ▶ start soaks immediately ─ monitor ─ 0.1.0 tag
Loop C  ▶ hold L2 ─ escrow/recovery spec+twins ─ implement ─ +deception verbs ─ climb L3
Loop D           ▶ phones arrive ─ H1–H3,H6–H11 ─ H18,H20,H21 ─ (H17,RNode)
Loop E  ▶ spoofing+invariants+a11y+visual tiers ─ adv-UX review ─ testers ①  ─ testers ②
Loop F                                              ▶ package ─ walkthrough ─ ship
```

- **Start today, in parallel:** Loop B soaks (calendar-bound), the Loop C
  escrow/recovery spec (the largest unknown), Loop E's automated tiers 1–4 (pure
  software, CI-bound, no dependencies), and the **[user]** hardware order for the
  first two Android phones + Apple Developer enrollment (H12 has lead time).
- **Critical path:** Loop C — it contains genuinely new product work. Everything
  else is execution of existing runbooks or new automation.
- **Tester rounds** (Loop E.6) are scheduled events, not blockers on other work:
  round ① as soon as the automated tiers are green, round ② against the release
  candidate.
- **H20 (2-week unattended node)** is the other long calendar item; start it as soon
  as a spare Linux box exists.

## 5. Cadence and definition of done

- **Per session:** Loop A green; at most one deliberate increment on one other loop;
  any manual step touched is scripted or shrunk if possible (the automation rule);
  status registers updated before the session ends.
- **Per week (default):** one full Loop C turn; soak/hardware progress recorded;
  a one-paragraph status delta noted in the relevant register.
- **Done:** all seven gates green. The release commit updates STATUS-COMPLETE with the
  final evidence table, LIMITATIONS with final measured values, and the release
  notes — then the post-release steady state begins: nightly held rungs, L4/L5
  climbing, and the deferred iOS/store decisions as their own future plan.
