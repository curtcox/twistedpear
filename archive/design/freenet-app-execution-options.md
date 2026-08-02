# Freenet app-execution options (superseded by the Option A ADR)

<!-- tp-doc
lifecycle: historical
audited: 2026-08-02
register: none
-->

**Archived 2026-08-02.** This was §10 of the Freenet integration plan while the
app-execution model was still open. The decision was taken on 2026-07-28 and is
recorded in [the Option A ADR](../decisions/freenet-app-execution.md). Current
behaviour is described in
[docs/freenet.md](../../docs/freenet.md); remaining work is in
[docs/freenet-plan.md](../../docs/freenet-plan.md).

## The three options, as stated before the decision

**Deliberately unresolved.** F0's S4, S7, and S8 produce the evidence; this phase records the
decision and its rationale in an ADR. The three options and their real tradeoffs:

**Option A — TwistedPear apps as Freenet clients.** Mini-apps get `get`/`put`/`update`/
`subscribe` through the broker; a TP app can share live state with River or Atlas.
*For:* no WASM engine, no sandbox change, no new UI model; fits the existing broker exactly;
S7 proves or disproves it cheaply. *Against:* Freenet apps do not run on TwistedPear — TP apps
merely reach Freenet data. This is interoperability, not hosting, and the plan should say so
rather than claim more.

**Option B — contract/delegate execution on TP nodes.** TP nodes run Freenet WASM contracts
and delegates, making a TP node a real participant carrying app state. *For:* the only option
that makes the phrase "Freenet apps run on TwistedPear nodes" literally true; a TP node
becomes useful to the Freenet network rather than a leech. *Against:* needs a WASM engine in
every sandbox backend (S4), with Bare on device the likely blocker; contracts are untrusted
code, so the kill-a-hostile-app guarantee must be re-established, not assumed; and it
duplicates work `freenet-core` already does well. If a node is bundled anyway (§8), the
bundled node can execute contracts and Option B's marginal value shrinks sharply — a point
that should be tested before any engine work begins.

**Option C — Freenet web UIs as mini-apps.** Run an existing Freenet app's HTML/JS UI on a TP
host. *For:* the only path to running *existing, unmodified* Freenet applications.
*Against:* head-on collision with the host-rendered widget model. Freenet UIs are DOM apps
that talk WebSocket to a node; supporting them means a webview capability and a second sandbox
posture, and the capability-comprehension guarantees that are the point of this project would
have to be re-derived from scratch for that posture. This is a platform-shape decision, not a
feature.

**Recommended sequencing** (a recommendation, not a decision): ship A as it is nearly free and
immediately testable against live apps; treat B as conditional on S4 *and* on B retaining value
once a node is bundled; treat C as a separate proposal with its own plan, because it changes
what TwistedPear is.

