# Deterministic abuse simulation — validation evidence, 2026-07-16

<!-- tp-doc
lifecycle: historical
audited: 2026-08-02
register: none
-->

**Archived 2026-08-02.** Point-in-time run evidence from a single validation pass. The
current status record is [docs/simulation.md](../../docs/simulation.md); the procedure
that produces evidence like this is [docs/mac-validation.md](../../docs/mac-validation.md).
Nothing here is a current claim.

## Validation reproduced locally on 2026-07-16

- Environment: macOS 26.5.2 (25F84), Node 26.5.0, npm 11.17.0, Python 3.14.6.
- `npm test`: 1,130 passed; 7 optional interop tests skipped. Localhost tests required running
  outside the filesystem/network sandbox; the initial sandboxed run failed only with listener EPERM.
- `npm run sansio`: all fences and canaries passed; 684 deterministic tests passed.
- `npm run test:sim-campaign`: 4,000 deterministic scenarios over 200 registered cells; 310 canary
  findings; zero genuine findings; conservative canary-recapture floor 0.862; byte-identical local
  rerun; containment baselines passed.
- `npm run test:sim-fixed-replay` twice: 400 production-backed scenarios per run; serialized outputs
  compared byte-identically.
- Fixed replay on macOS and Linux Node 22 container: identical SHA-256
  `fa95084a8ca4fe5a985cbddf437262f1971604e3ec0ea2082a74b5f023ba0288`.
- `npm run test:interop`: 7/7 passed in 55.16 s against Linux/arm64 Python 3.12.13,
  RNS 0.9.5, and LXMF 0.7.0. The gate includes 1 KiB and 1 MiB resource round trips,
  an interrupted 1 MiB resume, and LXMF.
- `npm run test:sim-authored-replay`: committed two-event model-authored reproducer replayed without
  a model or network.
- No-RNS `conformance/vectors/generate.py`: RNS-dependent packet, identity, and LXMF vectors retained
  their exact SHA-256 hashes.
- `npm run formal:all`: grant, escrow, and recovery table/model/vector relations passed.
- TLC: grant (6 states), escrow (9 states), and recovery (29 states) completed with no error.
- Tamarin 1.12.0: all six declared lemmas passed twice.
- ProVerif 2.05: all five declared queries passed.
- `npm run lint` and the symbolic-model inventory passed.

## Hosted CI evidence on 2026-07-16

- [`python-interop`](https://github.com/curtcox/twistedpear/actions/runs/29531252986/job/87731814562)
  passed on `ubuntu-latest` at commit `13b4b076`; the job ran the seven pinned-peer scenarios and
  uploaded the exact dependency-version record.
- [`simulation-replay (ubuntu-latest)`](https://github.com/curtcox/twistedpear/actions/runs/29531252986/job/87731814377)
  and [`simulation-replay (macos-15)`](https://github.com/curtcox/twistedpear/actions/runs/29531252986/job/87731814507)
  each completed the fixed 400-scenario production-backed corpus.
- [`simulation-replay-compare`](https://github.com/curtcox/twistedpear/actions/runs/29531252986/job/87732020778)
  compared the two uploaded reports byte-for-byte and passed.

These local and hosted results validate the deterministic machinery, production-backed registered
paths, historical policy adapters, authored replay, provisioned Python interop, macOS/Linux replay
parity, and formal relations. They do not constitute BLE/LoRa calibration or evidence of zero
shipping abuse defects.
