# S2 local smoke observation

<!-- tp-doc
lifecycle: live
audited: 2026-07-28
register: none
-->

Status: **negative diagnostic evidence, not gate measurements**.

An isolated Freenet 0.2.112 network was started with one localhost gateway and
two localhost peers. The first experiment was manual; the same topology is now
reproducible with the self-cleaning `run-local-s2.mjs` harness. A one-sample
run was attempted before any 100-sample run. This is deliberately recorded as
incomplete and no latency percentile is inferred from it.

The smoke found and corrected four client/runner defects:

- first retrieval now asks the node for contract code as well as state;
- the measurement PUT requests blocking subscription retention at the
  publisher;
- subscriber readiness uses GET with both `subscribe` and
  `blocking_subscribe`, matching the node's race-free wire path;
- notification decoding accepts state, delta, and state-plus-delta union
  shapes because TwistedPear contracts use replacement-state deltas.

After those corrections, the installed node still did not produce a measurable
notification path. The three-node gateway reported a transport connection with
an empty ring (`RING_TRANSPORT_DESYNC`), updates were not consistently backed by
a retained executor contract, and peers reported no subscriber snapshot. As a
control, isolated local mode completed PUT, blocking subscription, and UPDATE
but emitted no notification within 60 seconds and logged the same missing
subscriber-snapshot condition.

The automated rerun started all three API listeners and reached the
measurement, then the first blocking-retention PUT timed out after 60 seconds.
The harness stopped the three child processes and removed its temporary state.
This independently confirms that the blocker precedes latency sampling.

The machine-readable observation is `s2-smoke-observation.json`. Temporary
node state was kept outside the repository and removed after shutdown.

S2 therefore remains pending. A future run must first reproduce successful
update-to-notify behavior on a Freenet version/topology known to pass upstream's
blocking-subscription integration tests; only then should the 100-sample local
and live measurements be recorded.
