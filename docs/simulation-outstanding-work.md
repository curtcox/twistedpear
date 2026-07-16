# Deterministic Abuse-Simulation — Completion Record

Completed and revalidated on 2026-07-16. The work formerly tracked as R1–R6 is closed. This file
is the short, authoritative completion checklist; detailed sequencing and evidence remain in
[simulation-outstanding-work-plan.md](simulation-outstanding-work-plan.md).

Host/product integration of escrow and recovery remains intentionally outside this simulator
scope. Their adversarial machines, schedules, oracles, recording, shrinking, vectors, and formal
twins are in scope and complete.

---

## R1 — Persist the grant lifecycle as production authority — complete

- `GrantStore` persists the formally checked lifecycle state separately from the public grant
  record and reloads it before every mutation.
- `set` cannot revive denied, expired, or revoked authority. Revocation before and after first use,
  first use, TTL expiry, denial, and restart/reload behavior have production runtime tests.
- `MiniappHost` drives TTL and first use through `GrantStore.use` before dispatching a
  capability-bearing broker request.
- The seven legal lifecycle edges, illegal terminal transitions, vectors, and TLA+ relation remain
  checked against `stepGrantHost`.

## R2 — Replace label-driven campaign cells with reviewed behavior — complete

- Every counted cell records its production path, persisted authority, operation, attacker access,
  damage condition, and reviewed success oracle in the campaign report.
- The production registry executes the shipping capability gate, grant host, link handshake, and
  capability-specific service path. Capability, position, and verb mutations change executed
  state, effects, powers, transport actions, or containment outcomes.
- Position powers are enforced by the transport; unauthorized powers throw. Reviewed unsupported
  combinations are excluded from `supportedCells` with a reason and cannot be executed as counted
  coverage.
- Canary cells use phase-specific broken policy variants. Discovery depends on the race between a
  legitimate first use and an attack payload over the selected transport; removing the defect
  removes the finding.

## R3 — Make historical and fuzz tiers accuracy evidence — complete

- Every expressible historical fixture runs against its named broker, handshake, grant,
  key-share, or federation target. Expected outcomes are assertion-only and never enter target
  state or events.
- Weakening a named target policy makes its historical fixture fail.
- The search fuzzer selects payload and delivery delay from kernel entropy, targets a defective
  variant of the production grant parser boundary, records the failure, and shrinks it.
- The stable model-free reproducer is committed at
  `packages/sim-adversaries/test/fixtures/fuzz-grant-parser-reproducer.json`.

## R4 — Make escrow/recovery adversarial schedules take effect — complete

- Drop, delay, reorder, duplicate, replay, partition, expiry-race, below-threshold, and
  colluding-pair schedules run while actor messages are in flight.
- Transport statistics now distinguish requested actions from messages actually dropped, delayed,
  reordered, duplicated, or injected. Reorder changes delivery slots, not only queue order.
- Schedule-effect tests cover LAN, internet, BLE, and LoRa. Replay is an additional protocol event,
  while duplication is a transport copy; partition is a real time window.
- Legal machines stay clean. Deliberately defective below-quorum variants produce typed global
  safety violations whose histories rerun and shrink.

## R5 — Make social/economic scenarios first-class simulations — complete

- Spam cost uses executed send, delivery/loss, serialized-byte, airtime, and duty-cycle statistics;
  LoRa scarcity materially raises the observed cost.
- Harassment traverses a three-node discovery graph and actual block/sever events reduce its reach.
- Coordinated votes feed the protected ranking decision; colluder weighting leaves the reviewed
  trusted alternative ranked first.
- Spam, harassment, and reputation scenarios use the campaign runner, recorder, global oracles,
  shrinking, report coverage, and deterministic transport classes. Broken variants for all three
  record and causally shrink.

## R6 — Project real storage and authority into global grant oracles — complete

- Stored blobs, live lifecycle authority, identities, and per-grant access times are projected
  independently from multi-node production campaign state.
- Revocation removes production storage explicitly; the grant-coverage break variant leaves the
  stored blob visible so the oracle observes the orphan instead of hiding it with the live grant.
- Deliberate production-state breaks for grant coverage, ID uniqueness, and revocation
  monotonicity each produce a typed violation, identical rerun, and smaller causal history.
- Unmodified production scenarios remain clean.

---

## Validation reproduced on 2026-07-16

- `npm test`: 1,125 passed; 7 optional interop tests skipped.
- `npm run sansio`: all fences and canaries passed; 684 deterministic tests passed.
- `npm run test:sim-campaign`: 2,000 deterministic scenarios; 142 path-dependent canary findings;
  zero genuine findings; conservative recapture floor 0.862; byte-identical rerun and containment
  baselines passed.
- `npm run formal:all`: grant, escrow, and recovery table/model/vector relations passed.
- TLC: grant (6 states), escrow (9 states), and recovery (29 states) completed with no error.
- Tamarin 1.12.0: all six declared lemmas passed twice.
- ProVerif: all five declared queries passed.

The campaign result is evidence for the reviewed, registered model and its historical accuracy
floor. It is not a proof that every possible abuse has been enumerated; saturation, canary
recapture, formal results, and documented out-of-model cases remain separate claims.
