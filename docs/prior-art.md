# Prior art and similar projects

TwistedPear combines four things that each exist elsewhere but have not shipped
together: a delay-tolerant encrypted mesh network stack, a peer-to-peer
application runtime, a capability-gated sandbox whose consent model ordinary
users can understand, and a distribution scheme with no gatekeeper in which
every app carries published source and a verified author signature. This
document surveys the neighbors in each of those directions, then attempts to
answer why the combination is still unclaimed.

Claims below about the two TwistedPear goals refer to
[motivation.md](motivation.md): (1) users know and choose who is involved in
what they do; (2) an open app platform where running a dangerous program by
accident is essentially impossible.

## 1. The substrate: Reticulum and its ecosystem

These are ancestors and dependencies, not competitors. TwistedPear's protocol
layer is a TypeScript implementation of this stack.

| Project | What it is | Relationship |
|---|---|---|
| [Reticulum](https://reticulum.network/) | Cryptography-first networking stack that runs over LoRa, packet radio, WiFi, TCP, I2P, serial — no central coordination, no plaintext option. | The transport TwistedPear reimplements ([reticulum-ts](../packages/reticulum-ts/)). Goal 1's "choose who is involved" is only meaningful because Reticulum makes the set of involved parties small and inspectable. |
| [LXMF](https://github.com/markqvist/LXMF) | Delay-tolerant message format and propagation-node scheme over Reticulum. | Reimplemented as [lxmf-ts](../packages/lxmf-ts/); the messaging substrate for mini-apps. |
| [Sideband](https://unsigned.io/software/Sideband.html) | Polished LXMF client (Android/desktop) with telemetry, voice, and a Python plugin system. | Closest existing user-facing app in the ecosystem. Its plugins are the seed of an app platform, but they are unsandboxed Python trusted implicitly — exactly the accident-prone model TwistedPear's runtime exists to replace. |
| [NomadNet](https://github.com/markqvist/NomadNet) | Terminal client whose nodes host pages, files, and small interactive "micron" apps for other users. | The nearest thing to mini-apps over Reticulum today: server-side pages with input fields, not installable sandboxed programs. |
| [MeshChat](https://github.com/liamcottle/reticulum-meshchat) | Web-UI LXMF client interoperable with Sideband/NomadNet. | Demonstrates the ecosystem's interop culture that TwistedPear's conformance suites ([conformance](../conformance/)) are built to preserve. |
| [Meshtastic](https://meshtastic.org/) | Popular LoRa mesh messaging firmware and apps. | Adjacent community, different layer: fixed-function messaging appliance, no app platform, weaker transport-agnosticism than Reticulum. |

## 2. Peer-to-peer application runtimes

Projects whose pitch is "run apps over a P2P substrate instead of servers."
This is the crowd TwistedPear most obviously stands in.

**[Pear Runtime](https://docs.pears.com/) (Holepunch)** — the closest living
relative, and the source of the "Pear-style local-first distribution" this
project borrows (apps loaded and updated peer-to-peer from content-addressed
storage, no app store, no servers). Actively developed (Keet is its flagship;
the Bare runtime underneath it targets mobile and desktop). Differences: Pear
runs full-trust JavaScript with no capability model, no mandatory source
publication, and no consent UI — its answer to "is this app safe?" is the same
as npm's. It assumes internet-grade connectivity (hole-punched UDP), not
LoRa/BLE-class links. It is funded by Tether/Bitfinex, i.e. it has a
corporate sponsor and adjacent monetization story where TwistedPear has
explicit non-goals.

**[Veilid](https://veilid.com/)** (Cult of the Dead Cow, 2023) — "Tor, but for
apps": a privacy-routed DHT and messaging fabric with a framework for building
applications. Active (veilid-core 0.5.x, VeilidChat). It is a *framework* for
developers, not a *platform* for users: no app runtime, no packaging, no
install/consent flow — every Veilid app is a separately installed native
program the user must trust the ordinary way.

**[Freenet](https://freenet.org/) (2023 rewrite, formerly Locutus)** — Ian
Clarke's "global shared computer": small WebAssembly contracts replicated
across a DHT, aiming to be a decentralized application substrate. The original
Java network continues as [Hyphanet](https://www.hyphanet.org/), whose
"freesites" and plugins were serving gatekeeper-free apps-over-P2P twenty years
ago. Both prioritize anonymity and censorship-resistance; neither centers user
comprehension of capability grants, and neither targets off-internet physical
links.

**[Urbit](https://urbit.org/)** — a from-scratch personal-server OS, identity
system, and P2P network with userspace apps. The most complete "replace the
whole stack" attempt in existence, and a demonstration of both ambition and
cost: a decade-plus of work, an exotic developer experience, address space
sold as a scarce asset (a gatekeeper of a different kind), and governance
turmoil. Apps are not sandboxed against the user in a way an ordinary person
can reason about.

**Dead relatives worth learning from:**

- [Beaker Browser](https://github.com/beakerbrowser/beaker) (2016–2022) — a
  browser where anyone could create and host a site/app peer-to-peer over the
  Dat/Hypercore protocol (the same lineage Pear grew from). Discontinued by its
  authors; its post-mortem lesson is that a P2P authoring platform without a
  reason for ordinary users to show up stays a demo. Its spirit continues in
  [Agregore](https://agregore.mauve.moe/).
- [ZeroNet](https://zeronet.io/) (2015–~2020) — sites and apps distributed via
  BitTorrent trackers and Bitcoin-key identities, updated live by their
  authors. Widely used briefly, then abandoned upstream; unsandboxed plugin
  model and unclear maintenance killed it.
- FireChat (2014–2018) — mesh chat that worked in protests and festivals;
  proved demand exists in connectivity crises and evaporates afterward.

**Building blocks rather than platforms:** [Iroh](https://iroh.computer/)
(dial-by-key QUIC connections), [libp2p](https://libp2p.io/),
[Earthstar](https://earthstar-project.org/) (small syncable shared spaces),
[Ditto](https://ditto.live/) (commercial local-first mesh sync, BLE/WiFi-aware
— proof the transport tier is commercially viable when sold B2B). These solve
transport or sync, and deliberately stop before "platform."

## 3. App platforms with capability security

The lineage for goal 2's "dangerous by accident is essentially impossible."

**[Sandstorm](https://sandstorm.io/)** — the strongest philosophical
predecessor. Self-hosted web apps in fine-grained sandboxes where an app gets
*nothing* by default and acquires connections through the **Powerbox**: the
user is never asked "allow X?" but rather "*which* calendar should this app
use?" — turning consent into an act of selection the user already understands.
Its company failed commercially in 2017; the project survives community-
maintained. Sandstorm targets a server you administer, not the mesh of
personal devices, and apps need not publish source. TwistedPear's grant flow
and G7 comprehension gate in [RELEASE-PLAN.md](../RELEASE-PLAN.md) are
attacking the same problem Powerbox did, one layer closer to the user.

**Object-capability research** — the E language and Mark Miller's
[capability-security work](http://erights.org/), KeyKOS/EROS, Capsicum, seL4,
and today [Endo/SES](https://github.com/endojs/endo) (hardened JavaScript) and
the [Spritely Institute](https://spritely.institute/)'s Goblins. This tradition
supplies the theory TwistedPear's broker model applies: authority is something
you are handed, not something you ambient-grab. Spritely in particular shares
the "capabilities + P2P + ordinary users" ambition but is still at the
language/library stage.

**Deployed permission systems as cautionary prior art** — Android/iOS runtime
permissions, browser permission prompts, and Wasm/WASI and Deno's flag-based
sandboxes all show the failure mode TwistedPear's "declare what and *why*
beforehand" rule answers: prompts arrive mid-task without rationale, users
learn to click yes, and the grant, once given, is invisible. App-store privacy
"nutrition labels" acknowledge the comprehension gap but are self-reported and
unenforced.

**WeChat mini programs** (and Alipay's, and Telegram's) — the largest
mini-app runtime on earth, proving the *form factor*: small, quickly
installed, host-mediated apps with a constrained widget UI. It is also the
perfect anti-TwistedPear: a single corporate gatekeeper approves every app and
observes every interaction. The form is validated; the governance is the
thing being replaced.

## 4. Gatekeeper-free distribution with verifiable provenance

- **[F-Droid](https://f-droid.org/)** — FOSS-only Android repository that
  builds every app from published source and signs the result; the closest
  deployed instance of "you can always examine the source, and no store
  decides what may exist" (anyone can run a repo). Limits: Android-only,
  curation still centralized per-repo, and users rarely read source — the
  comprehension burden is unaddressed.
- **Debian / [Nix](https://nixos.org/) / [Guix](https://guix.gnu.org/) and
  [Reproducible Builds](https://reproducible-builds.org/)** — the deepest
  prior art for "the binary you run corresponds to the source you can read."
  TwistedPear's signed package format ([package-format.md](package-format.md))
  and 256t identifiers ([256t-distribution.md](256t-distribution.md)) are this
  idea, minus the central archive.
- **PGP web of trust and code-signing regimes** — author signatures without a
  central authority (WoT) vs. with one (Apple notarization, Play signing). The
  WoT's usability failure is the standing warning for any "verify the author
  yourself" scheme; the store regimes are the gatekeepers goal 2 rejects.

## 5. Local-first software

Ink & Switch's ["Local-first software"](https://www.inkandswitch.com/local-first/)
(2019) named the ideology: your data on your device, sync as a service you can
swap, servers optional. The CRDT ecosystem it spawned
([Automerge](https://automerge.org/), [Yjs](https://yjs.dev/)) plus
[DXOS](https://dxos.org/) and Earthstar are its infrastructure. This movement
supplies TwistedPear's data-locality instincts but is largely silent on the
two TwistedPear goals: it assumes apps are already trusted, and "who is
involved" is answered "whoever runs your sync relay."

## 6. Messengers that solved adjacent hard problems

- **[Briar](https://briarproject.org/)** — messaging over Tor/WiFi/Bluetooth
  with no server; its Bramble transport layer and offline-first rigor parallel
  Reticulum's goals. Briar Desktop and its mailbox show the same
  "propagation node" pattern as LXMF. Fixed-function: no third-party apps.
- **[Berty](https://berty.tech/)** — serverless messenger over BLE/mDNS/libp2p;
  same story, mobile-first.
- **[GNUnet](https://gnunet.org/)** — decades of framework-for-secure-
  decentralized-apps research; perpetually infrastructure in search of
  applications, and a warning about frameworks that never ship a platform.
- **Serval Project, Bitmessage** — earlier mesh/anonymous-messaging attempts,
  both effectively dormant; evidence that transport-only projects stall
  without an application layer that ordinary people want daily.

## 7. Transparency of "who is involved"

No surveyed project treats *user-comprehensible involvement* as a first-class,
testable claim the way [RELEASE-PLAN.md](../RELEASE-PLAN.md) gate G7 does.
Partial precedents: Little Snitch/OpenSnitch (per-connection visibility,
expert-only), Tor Browser's circuit display (who relays this page — the
clearest existing "who is involved" UI), and Certificate Transparency
(publicly auditable authority actions). These are all bolt-on inspections of
systems whose default is opacity; TwistedPear inverts the default.

## Attempted answers

### 1. Why doesn't this already exist?

Every piece exists; the intersection doesn't. The attempted explanations:

1. **The economics select against it.** App platforms are expensive
   (multi-year, multi-discipline: protocol, sandbox, three host OSes,
   developer tooling, conformance), and historically they are paid for by
   being a gatekeeper — the 30% cut, the ad surface, the token. A platform
   whose defining features are "no gatekeeper" and "no revenue" removes the
   funding mechanism proportional to its cost. The survivors in §2 confirm
   this: Pear has a crypto-exchange sponsor, Urbit sold address space,
   Sandstorm's company died, Beaker's volunteers burned out.
2. **The constraint intersection is brutal.** Mesh/DTN links (KB-scale
   packages over BLE/LoRa), a broker-sandboxed runtime, host-rendered UI,
   signed reproducible packages, and a consent model that survives adversarial
   apps each individually shrink the design space; jointly they exclude nearly
   every off-the-shelf approach (no web runtime assumptions, no npm-style
   dependency sprawl, no server-rendered escape hatch). Projects that faced
   this fork picked one side: Pear kept the internet, Briar kept the mesh but
   dropped the platform.
3. **Mobile platforms actively resist it.** iOS forbids third-party code
   execution in distributed apps, throttles background radios, and gates BLE
   and multicast behind entitlements ([STATUS-HARDWARE](../STATUS-HARDWARE.md)
   and [ios-multicast-entitlement.md](ios-multicast-entitlement.md) are this
   project's own scar tissue). The devices people actually carry are owned, in
   the governance sense, by the two gatekeepers the project routes around —
   which is both the motivation and the obstacle.
4. **The human layer is the unglamorous hard part.** Cryptographic
   verification is publishable, fundable, and fun; making a grant dialog that
   an ordinary person cannot be tricked through is none of those. Nearly every
   project in this survey stops at "the signature verifies." The one that took
   the human layer seriously (Sandstorm's Powerbox) is the one this project
   most resembles — and even it never faced mesh constraints or mobile.
5. **The substrate is young.** Reticulum only reached usable maturity in the
   last few years, and local-first tooling and thinking are newer still. The
   window in which this project is *buildable at all* by a small effort opened
   recently.

### 2. Why isn't anyone else trying to make it?

Strictly, people *are* trying — Pear, Veilid, Freenet 2023, Spritely, and the
Reticulum community are all live — but each is optimizing a different corner,
and no one is aiming at this exact spot. Plausible reasons the spot stays
empty:

1. **No one is paid to.** The corner defined by "no monetization, no
   marketing, mesh-capable, gatekeeper-free, comprehension-first" offers no
   VC story, no token, no paper, and no promotion case. Companies can't
   justify it, academics can't publish it, and most volunteers understandably
   choose either the fun protocol work (Reticulum ecosystem) or the
   established social scene (Fediverse, SSB).
2. **The communities that hold the pieces don't overlap.** Mesh-radio people,
   object-capability people, local-first CRDT people, and consumer-UX people
   are four different communities with four different conferences. The project
   requires all four literacies simultaneously; each community rationally
   builds the part it knows and assumes someone else will do the rest. §2 and
   §6 are littered with "infrastructure in search of an application layer."
3. **The verification bar is repellent.** The parts that make this project
   *credible* rather than merely novel — abuse-ladder campaigns, formal twins,
   hostile-app suites, soak evidence, comprehension testing with outside
   humans ([abuse-resistance-loop.md](abuse-resistance-loop.md), gates G3/G7)
   — are precisely the work volunteers avoid and startups defer. Anyone
   sprinting to a demo would cut them first, and without them the platform is
   just another item for §2's dead-relatives list.
4. **Survivorship discouragement.** The visible record — Beaker discontinued,
   ZeroNet abandoned, Sandstorm's company folded, GNUnet perpetually
   pre-adoption — reads as evidence the niche is a graveyard. A rational
   founder pattern-matches and walks on, without checking whether the failures
   shared a removable cause (funding-model mismatch and missing app layer,
   mostly) rather than an intrinsic one.

### 3. Why am I trying to make it?

Attempted answers, inferred from this repository's own documents — the author
should correct them where they misread:

1. **The premise is a conviction, not a market thesis.**
   [motivation.md](motivation.md) opens with a claim about how computing
   *ought* to work: far-away computers with no logical need to be involved
   should not be involved. Someone who holds that as a matter of principle
   doesn't need the market validation whose absence stops everyone in
   question 2 — which is exactly why the non-goals (no money, no marketing)
   are stated as features. The project is immune to the funding-model failure
   that killed its predecessors because it never had one.
2. **The economics of building just changed.** The plan's own automation rule
   — "Claude turns the cranks; the user does only the steps marked [user]" —
   is the load-bearing answer to "a platform takes a company." AI-assisted
   development collapses the multi-person-year cost in explanation 1.1 to
   something one determined person can drive: the conformance suites, formal
   twins, simulation campaigns, and multi-host builds in this repo are the
   kind of breadth that previously required a team, and they are the parts
   machines are good at. The graveyard in question 2 was populated under the
   old economics.
3. **The unclaimed corner is the one that matters to this author.** Everyone
   else optimized transport (Reticulum, Veilid), anonymity (Freenet),
   sync (local-first), or developer reach (Pear). The corner left empty —
   *user comprehension of who is involved and what an app may do* — is the
   part that is a human-values problem rather than a systems problem, and it
   only gets built by someone who considers it the point rather than the
   polish. Gates G4 and G7 exist because that's the success criterion here:
   ordinary people knowing and choosing, even if adoption is only ever
   word-of-mouth.
4. **Because the substrate finally permits it.** Building *now*, on a mature
   Reticulum, with Pear having proven P2P app distribution and Sandstorm
   having proven capability UX, is not starting from scratch — it is
   assembling proven pieces whose union no one with these values has had the
   means to attempt until now.
