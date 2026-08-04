# Frequently asked questions

<!-- tp-doc
lifecycle: reference
audited: 2026-08-04
register: none
-->

Short answers to the questions people ask first, each ending at the canonical document
that owns the topic. This page is a starting point, not an authority: where it disagrees
with a `live` document, a spec, a test, or a status register, **those win** and this page
is the bug. [docs/README.md](README.md) arbitrates which document is canonical for a
topic; [architecture.md](architecture.md) is the orientation map.

- Using TwistedPear as a person, not a programmer → [User Guide](../guide/README.md)
- Writing a mini-app → [App Authoring Guide](../authors/README.md)
- Working on this repository → [AGENTS.md](../AGENTS.md)

## Contents

- [About the project](#about-the-project)
- [Using TwistedPear](#using-twistedpear)
- [Writing mini-apps](#writing-mini-apps)
- [Working on this repository](#working-on-this-repository)

## About the project

### What is TwistedPear?

A local-first peer-to-peer application platform. A **host** is the program you run on a
device; it owns a cryptographic identity, talks to other hosts over whatever media are
available (LAN, TCP, WebSocket, Bluetooth, LoRa, and more), and runs signed **mini-apps**
behind a capability broker. There is no server tier — a gateway, a seeder, and a
propagation node are all just peers with a role turned on. See
[architecture.md](architecture.md).

### Why does it exist?

Two goals that reinforce each other: users should decide which computers are involved in
what they do, and an app platform should have no gatekeeper deciding what may exist or
who may run it. The full argument, including the non-goals, is
[motivation.md](motivation.md).

### How does it relate to Reticulum, LXMF, Sideband, Briar, IPFS…?

TwistedPear does not author network protocols. It reimplements Reticulum and LXMF in
TypeScript ([reticulum-ts](../packages/reticulum-ts/README.md),
[lxmf-ts](../packages/lxmf-ts/README.md)) and must stay wire-compatible with the pinned
Python references. What it adds on top is the signed, sandboxed, capability-gated mini-app
platform. A project-by-project comparison — Reticulum ecosystem, p2p runtimes, capability
app platforms, gatekeeper-free distribution, local-first software — is
[prior-art.md](prior-art.md).

### Is it finished? Can I rely on it?

No, and not yet for anything that matters. Three disjoint registers tell you exactly where
it stands: [STATUS-COMPLETE.md](../STATUS-COMPLETE.md) for what is built and reproducible,
[STATUS-SOFTWARE.md](../STATUS-SOFTWARE.md) for open software work, and
[STATUS-HARDWARE.md](../STATUS-HARDWARE.md) for work gated on devices, accounts, or a real
network. Known costs of the design are catalogued in [LIMITATIONS.md](../LIMITATIONS.md),
and the gates to a first release are in [RELEASE-PLAN.md](../RELEASE-PLAN.md).

### Do I need an account, a server, or the internet?

None of the three. Your identity is a keypair generated on first launch — nothing
registers it and nothing can revoke it. Peers reach each other over whatever links exist,
so a group on one Wi-Fi network, or on LoRa radios with no internet behind them, is a
working network. The consequence is that a fresh host with no peers configured does
nothing interesting; see [Chapter 4](../guide/04-joining-a-network.md).

### Is it anonymous?

No. Message contents are end-to-end encrypted, but someone physically near you can observe
that your device is transmitting, and a peer you connect to learns your address. What is
and is not protected is stated plainly in
[Chapter 8](../guide/08-trust-privacy-safety.md); the sandbox threat model and its open
findings are [security-review.md](security-review.md).

### What license is it under?

The repository currently ships **no LICENSE file** and `package.json` is marked private,
so there is no grant of reuse rights to rely on — ask before reusing the code. Note that
`license-allowlist.json` and `license-ratchet.json` are about the licenses of _third-party
dependencies_, which is a different question; see [static-analysis.md](static-analysis.md).

### Where is the documentation published?

[curtcox.github.io/twistedpear](https://curtcox.github.io/twistedpear/) — the guides,
these docs, the specs, and the per-gate [quality results](https://curtcox.github.io/twistedpear/results/).
The same material also ships _as a mini-app_, so a host with no internet can still document
itself; see [handbook.md](handbook.md).

### Why is so much of the repository documentation and tests?

Because the claims are the product. Protocol behaviour has to match an external reference
byte for byte, the security story has to be checkable rather than asserted, and a lot of
the platform can only be proven on hardware nobody has yet. Sections 9–11 of
[architecture.md](architecture.md) explain the specs, conformance, and simulation
machinery; [ci-policy.md](ci-policy.md) explains what runs when.

## Using TwistedPear

### How do I install it?

By building from source, for now. There is no download page and no signed, notarized
installer — that is tracked as **H17** in [STATUS-HARDWARE.md](../STATUS-HARDWARE.md).
Every host starts with `git clone`, `npm ci`, `npm run build`;
[Chapter 2](../guide/02-installing-a-host.md) then gives the per-device command.

### Which host should I install?

The desktop host if you have the choice — it is the only one that is on all the time, and
by default it relays traffic and seeds packages for phones nearby. Android is a full peer
with radios; iOS is the most restricted; the web host is the two-minute trial; a headless
`tp node` is what a community runs on a spare machine. The comparison table is in
[Chapter 2](../guide/02-installing-a-host.md), and per-host detail is in
[desktop-host.md](desktop-host.md), [web-host.md](web-host.md), [ios-host.md](ios-host.md),
and [android-emulator-lab.md](android-emulator-lab.md).

### What happens if I lose my identity?

You lose that peer, permanently. There is no account recovery, because there is no account:
the keypair _is_ the identity. Backing it up is the single most important thing you do on
first run — [Chapter 3](../guide/03-first-run-and-identity.md) and
[identity-backup.md](identity-backup.md). Phone and browser identities cannot yet be
exported in-host, so a desktop host is the safer place to keep the identity you care about.

### Why is my announce browser or catalog empty?

Almost always because no interface is working, or because you genuinely have no peers yet —
which is the normal state of a fresh install, not a fault. Check that at least one
interface shows connected, give LAN discovery a full minute, and remember that corporate,
campus, and guest Wi-Fi routinely block device-to-device traffic. The symptom-by-symptom
list is [Chapter 10](../guide/10-troubleshooting.md).

### How do I install an app, and who decides what apps exist?

Nobody decides. A mini-app is a signed archive named by a **256t identifier** — a
94-character string short enough to paste into a chat, scan from a QR code, or read aloud.
You paste it in, your host resolves and verifies it, and then shows you exactly what it is
asking permission to do before anything is installed. See
[Chapter 5](../guide/05-finding-and-installing-apps.md) and
[256t-distribution.md](256t-distribution.md).

### If no one reviews apps, how is that safe?

It is safe by construction rather than by screening. An app must publish source, must carry
a verified author signature, must declare its capabilities in that signed manifest, and
must be granted them by you — either half alone is not enough. It runs in a sandbox with no
ambient access to your files, your network, or another app's data, and you can withhold or
revoke any capability later. The honest limits of that story are in
[Chapter 8](../guide/08-trust-privacy-safety.md) and [security-review.md](security-review.md);
community-side tools are [local-moderation.md](local-moderation.md).

### Can I use it over Bluetooth or LoRa?

Yes, within the physics. Over Wi-Fi it feels normal; over BLE or LoRa an app install is
measured in seconds to minutes and messages are small — over LoRa, anything above 64 KiB is
refused outright. This is why the Handbook can be published as five sub-180 KiB part
packages. See [battery-bandwidth-policy.md](battery-bandwidth-policy.md) and
[ble-interface.md](ble-interface.md).

### My phone stopped receiving things while the screen was off.

On iOS that is expected — the system suspends the app, and anything sent meanwhile arrives
only if a propagation server held it. On Android, check that the persistent notification is
still there; if it is gone, a manufacturer battery manager killed the service and you need
to exempt the app from battery optimisation. See
[Chapter 10](../guide/10-troubleshooting.md) and [ios-host.md](ios-host.md).

### Is the browser host as good as the others?

No, and the difference is not cosmetic. Browser storage is evictable: clearing site data,
private browsing, or storage pressure destroys the identity and every installed app in that
tab, unrecoverably. Treat it as a trial surface and keep your real identity on desktop or a
phone. See [web-host.md](web-host.md).

### Do I need Freenet, Hyperdrive, or any other network?

No. They are optional adapters on the package fetch chain; the plain Reticulum Resource
path is sufficient on its own, which is what keeps the platform runnable on a link with no
internet behind it. See [freenet.md](freenet.md) and section 6 of
[architecture.md](architecture.md).

### Can I run an always-on peer for my community?

Yes — that is what the headless CLI is for:

```sh
tp node --data-dir ~/.local/share/twistedpear/host
tp seed --transport --state-dir .tp/seeder
```

Roles are the difference between a peer and a "server": transport node, seeder, and
propagation server are switches on an ordinary host. See
[desktop-host.md](desktop-host.md), [propagation-node.md](propagation-node.md), and
[community-network.md](community-network.md).

### Which features actually work on my device?

[platform-capabilities-status.md](platform-capabilities-status.md) is the capability × host
matrix, kept per-capability rather than per-marketing-claim. The reader-facing summary is
[the user guide's feature-status appendix](../guide/appendix-feature-status.md).

## Writing mini-apps

### What is a mini-app, technically?

A single JavaScript bundle that runs in a killable worker sandbox, imports
`@twistedpear/miniapp-sdk` and nothing else, and describes its UI as a JSON widget tree
that the _host_ renders. There is no filesystem, no socket, no `require`, no `fetch` — not
discouraged, absent. See [authors/01](../authors/01-what-you-are-building.md) and
[miniapp-runtime.md](miniapp-runtime.md).

### Why can't I render my own UI, or use React, or add npm dependencies at runtime?

Because a mini-app that could draw pixels could draw a convincing fake grant screen over a
real one. Host-rendered UI is what makes the consent chrome trustworthy; the rules are
[SPEC-CHROME](../specs/spec-chrome/spec.md). You bundle your own build-time dependencies
into the single file, but everything that reaches outside the sandbox crosses the broker.
The widget model and SDK surface are [miniapp-sdk.md](miniapp-sdk.md) and
[authors/04](../authors/04-building-the-ui.md).

### How do I start?

Two paths, both covered end to end. In-platform: DevStudio, which authors, previews, packs,
and publishes on the device itself — [authors/02](../authors/02-hello-world-in-devstudio.md)
and [devstudio.md](devstudio.md). From a terminal: `tp create`, `tp dev`, `tp pack`,
`tp sign`, `tp publish` — [authors/03](../authors/03-hello-world-with-the-cli.md).

### What can an app ask for, and what happens if the user says no?

Capabilities are strings in your signed manifest — `identity`, `lxmf:send`, `storage:kv`,
`resource:fetch`, `device:*`, and the rest. A call succeeds only if the capability is both
declared _and_ granted, the user may grant a subset, and they may change their mind later,
so your app has to degrade or explain itself rather than crash. An unknown capability
string blocks install outright, so a typo can never silently downgrade you. The full
taxonomy is [authors/05](../authors/05-capabilities.md); enforcement is
[miniapp-runtime.md](miniapp-runtime.md).

### How do I publish, and what is a 256t identifier?

`tp pack` builds and signs a `.tpkg`; `tp publish` announces a locator for it. The 256t id
is the 94-character base64url name for the content — a 48-bit length plus the SHA-512 of
the bytes, or the bytes themselves inline when there are 64 or fewer. It names content
without carrying it, which is why it fits in a QR code. See
[authors/09](../authors/09-packaging-and-publishing.md),
[package-format.md](package-format.md), and [256t-distribution.md](256t-distribution.md).

### How big can my app be, and what limits will I hit?

Smaller than you would like, if you want to reach phones over a radio link. Budgets, quotas,
request sizes, and per-app message rates are enforced by the broker, not by convention. See
[authors/12](../authors/12-limits-and-budgets.md) and
[battery-bandwidth-policy.md](battery-bandwidth-policy.md).

### How do I keep working on older hosts?

Declare `minHostApi` honestly. Capabilities and SDK calls arrived in specific host API
versions, and an older host that installs you and _then_ fails your calls is a worse
experience than one that refuses the install. The version-by-version notes are in
[authors/05](../authors/05-capabilities.md) and
[authors/10](../authors/10-updates-and-trust.md).

### How do I test and debug one?

Side-load into a host's dev slot, then lean on the same suites CI uses — the headless
renderer means UI is a checkable artifact rather than something only a human can confirm.
See [authors/11](../authors/11-testing-and-debugging.md) and
[conformance/README.md](../conformance/README.md).

### Is there example code?

Three reference apps under [apps/examples](../apps/examples/README.md), the Handbook and
DevStudio themselves, and twenty-five complete sample apps in the
[Cookbook](../cookbook/README.md) — all of which CI packs, validates, and launches, so they
cannot rot quietly.

## Working on this repository

### What do I need installed?

Node 22 and npm 10+ (see `.node-version` and the `engines` field), then:

```sh
npm ci
npm run check:fast
```

`.npmrc` sets `legacy-peer-deps=true` so the Expo/React Native graph resolves; do not run
`npm install` against the root unless you mean to regenerate the lockfile. Docker,
Playwright, Xcode, and the Android SDK are needed only for the suites that say so — the
prerequisite list per suite is in [AGENTS.md](../AGENTS.md) and
[conformance/AGENTS.md](../conformance/AGENTS.md).

### What should I run before pushing?

`npm run check:fast` while iterating (typecheck plus the Vitest unit suite), then
`npm run check:ci-base` before handoff, then the focused conformance suite for whatever you
touched. `npm run check:all` runs every PR-tier gate whose toolchain is installed locally
and prints an explicit reason for each skip. A single test file:

```sh
npm test -- packages/<package>/test/<name>.test.ts
```

### Where does my change go?

[packages/AGENTS.md](../packages/AGENTS.md) is the row-per-package table —
responsibility, permitted dependencies, entry point, focused test. Dependency direction
flows downward only and packages never depend on apps; section 3 of
[architecture.md](architecture.md) is the shape of it. The rule is enforced by the
`structure` gate, not merely documented.

### `npm run sansio` failed. What is Sans-IO?

Inside the configured protocol roots, code may not read clocks, entropy, or environment,
schedule timers, perform I/O, or log. A protocol module is `step(state, event) → (state',
intents)`; intents are data that an adapter executes. That discipline is what makes the
seeded simulator a conforming host rather than a mock, so a failing scenario replays
byte-identically. The fix is almost always to return an intent instead of doing the thing.
See [sansio.md](sansio.md) and [SPEC-MACHINE](../specs/spec-machine/spec.md).

### A gate failed on code I did not write. What is a ratchet?

Most gates are baselines, not thresholds: a JSON file records the findings that existed
when the gate landed, and normal baseline writes may only tighten. That is how a large
existing codebase gets a strict gate without a flag-day rewrite. Regenerate with the
gate's `:baseline` command; loosening a baseline needs an explicit `--allow-regressions`
and a reviewer who agrees. Coverage, structure, complexity, lint, typed lint, formatting,
file sizes, licenses, mutation score, and the Sans-IO boundary all work this way — see
[static-analysis.md](static-analysis.md).

### The file-size gate failed on a file I only added ten lines to.

Thresholds are decomposition prompts. Files that were already oversized are grandfathered
and may only shrink, so the intended response is to split the file rather than extend the
baseline. Rules live in `size-rules.json`; see [file-sizes.md](file-sizes.md).

### Where do I add a new check?

[scripts/checks/registry.mjs](../scripts/checks/registry.mjs), exactly once. That single
declaration drives the local runner, the CI matrix, the published report pages, and a test
that cross-checks all three, so adding a gate in one place adds it everywhere. See
[static-analysis.md](static-analysis.md) and [ci-policy.md](ci-policy.md).

### Which document do I update, and why did doc-audit fail?

Every tracked markdown file declares `lifecycle`, `audited`, and `register` in a `tp-doc`
comment. Current and planned work live in **separate files** — `docs/<topic>.md` and
`docs/<topic>-plan.md`, each naming the other — and when they disagree the `live` file
wins. When you implement part of a plan, move that description into the live file and
delete it from the plan; when a plan is finished, move it under
[archive/](../archive/README.md). `npm run test:doc-audit` fails on a missing or invalid
header, a `historical` document outside `archive/`, a one-sided `counterpart:`, a broken
link, or a `planned` document that links no `live` one. See [docs/README.md](README.md).

### Can I edit generated files, or files under `archive/`?

No to both. Generated outputs are regenerated with a recorded command and committed
alongside their source — the list is in [AGENTS.md](../AGENTS.md). Archived material is
edited only to repair broken links, and it never describes current behaviour.

### Can I add a dependency?

Yes, but it passes through gates: its license must be in `license-allowlist.json`, Knip and
dependency-cruiser will notice if it is unused or crosses a layer, and advisory policy
applies. The workspace also carries a CycloneDX SBOM. See
[static-analysis.md](static-analysis.md).

### What are `specs/` and `formal/` for?

`specs/` decomposes the platform into quasi-independent units, under one governing rule:
**vectors and formal models are normative and prose is informative** — when a spec's prose
disagrees with its artifacts, the prose is the bug. The finished template is
[SPEC-CAP](../specs/spec-cap/spec.md), where one transition relation exists as an
executable table, a TLA+ twin, checked traces, and generated vectors, all cross-checked
edge for edge. See [specs/README.md](../specs/README.md).

### What is the simulation harness?

Because protocol code is Sans-IO, the whole stack runs under a virtual clock and a seeded
PRNG with adversaries in the loop — through the real host, the real broker, and the real
grant store, so weakening a capability check shows up as a failing negative control. A
failure shrinks to a minimal trace that is kept as a regression. See
[simulation.md](simulation.md) and [abuse-resistance-loop.md](abuse-resistance-loop.md).

### How do I test something that needs two peers?

Run several on one machine:

```sh
npm run peers -- up hub node2
npm run test:local-multipeer -- --attach
npm run peers -- down
```

Any combination of hub, extra `tp node`s, desktop, iOS simulator, and Android emulator. See
[local-multipeer.md](local-multipeer.md) and
[cross-device-dev-matrix.md](cross-device-dev-matrix.md).

### What does a full local validation run look like?

[mac-validation.md](mac-validation.md) is the staged runbook, up to and including the
plan-duration soaks that remain the open release-qualification items in
[STATUS-SOFTWARE.md](../STATUS-SOFTWARE.md). Release commands are not ordinary validation —
they start long-lived processes and edit evidence registers — so run them only for an
explicit release task.

### Something here is wrong or missing.

Fix the canonical document first and this page second; a duplicated answer that drifts is
worse than no answer. If you are not sure which document is canonical,
[docs/README.md](README.md) decides.
