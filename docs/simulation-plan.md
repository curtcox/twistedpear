# Deterministic abuse simulation — remaining work

<!-- tp-doc
lifecycle: planned
audited: 2026-08-17
register: software
counterpart: docs/simulation.md
-->

**This document describes work not yet done.** What is built and verified today is in
[Deterministic abuse simulation — current implementation](simulation.md); where the two
disagree, that document wins. The mechanics of each turn of the find-fix loop are in the
[abuse-resistance loop](abuse-resistance-loop.md). The original phased design is preserved
in [archive/design/simulation-implementation-plan.md](../archive/design/simulation-implementation-plan.md).

Every item below is carried from a `Remaining` or `open` clause in the status record. None
of it may be closed by a simulator result alone.

S-B shipped as `SIM-L3-COLLUDING`. S-D is
`SIM-D-CALIBRATE-MODELS` in the blocked backlog, waiting on H4. S-A carries no separate
row: it is H4-D in [STATUS-HARDWARE.md](../STATUS-HARDWARE.md).

## S-A — BLE/LoRa physical-layer calibration (hardware-gated)

The single remaining evidence boundary. `conformance/sim-calibration/` already defines the
versioned trace schema, pre-registered sample and parameter-drift tolerances, the
deterministic robust fitter, and a provenance-enforcing report command — and it rejects
simulated provenance and insufficient trace coverage. What is missing is the input:
accepted guarded hardware traces, or independently recorded deployment traces.

**Done when** accepted traces and their generated reports are versioned. Until then,
numerical physical-layer claims stay out of scope, and simulator results must never be
described as physical-layer accuracy. Tracked in
[STATUS-HARDWARE.md](../STATUS-HARDWARE.md).

## S-B — Ratchet the difficulty ladder to L3 (colluding)

Shipped. The held rung is **L3 — colluding**. L4 is the next queued increment and waits
on hardware traces. Loop mechanics: see the
[abuse-resistance loop](abuse-resistance-loop.md).

## S-D — Calibrate the social/economic models before using their numbers

The spam, harassment, and reputation models are deliberately synthetic. Before any of
their numerical outputs becomes a product threshold, calibrate transport costs and
behaviour against real deployments or guarded hardware tests, and document the
calibration data and tolerances. This depends on S-A.

## Out of model, deliberately

Key-share and federation historical fixtures stay explicitly out of model because no
corresponding shipping product path exists. They are not backlog; they re-enter scope only
if such a path ships.
