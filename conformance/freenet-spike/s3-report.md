# S3 — ordered contract-state encoding

<!-- tp-doc
lifecycle: reference
audited: 2026-07-28
register: none
-->

## Result

**Pass for a pairwise, single-writer-per-direction append log; not evidence
that the packet tunnel is fast enough to ship.** The Rust spike under
[`ordered-log-contract`](ordered-log-contract/) compiles to Freenet WASM and
implements a canonical bounded log with:

- direction (`0` or `1`), unsigned 64-bit index, unsigned 16-bit payload length,
  and payload bytes;
- canonical direction/index ordering;
- union by `(direction, index)`, with the lexicographically smaller payload
  winning an index collision;
- independent highest-index retention windows for each direction.

The merge is commutative, associative, and idempotent in native tests.
Concurrent even/odd inputs reconstruct as indexes `0,1,2,3,4,5` regardless of
merge order. A receiver must still detect gaps and delay delivery or declare a
loss; contract convergence does not create transport ordering.

## Growth and merge cost

The encoded size at a saturated bidirectional window is:

```text
9 + 2 × retention × (11 + payload_bytes)
```

The audited arm64 host measured 200 native release-mode merges per case. The
largest case—256 retained 500-byte packets per direction—produced 261,641
bytes of state with 0.107 ms p95 native merge time. Full measurements, host
toolchain, and the generated WASM hash are recorded in
[`s3-measurements.json`](s3-measurements.json).

These timings measure the pure merge implementation, not Freenet routing,
replication, WebSocket chunking, or WASM-host overhead. S2 remains the
authoritative latency/throughput gate.

## Limits exposed by the spike

- Pairwise logs have one writer per direction, avoiding distributed index
  allocation. Multiple writers in one direction need a different key scheme.
- A same-index collision converges but discards one payload. F2 must treat such
  a collision as corruption rather than normal operation.
- Retention is deterministic, but a packet arriving below the retained index
  floor is permanently discarded. Acknowledgement and consumption state are
  still required before selecting a shipping window.
- State carries no authentication. The rendezvous contract parameters and
  packet contents need an authenticated binding before F2 can ship.

The encoding is sufficient to continue F2 design and provides the same
set-union foundation needed by F3. It does not open either phase while the
global S2 gate is closed.
