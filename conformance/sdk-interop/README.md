# SDK Interop


<!-- tp-doc
lifecycle: reference
audited: 2026-07-20
register: none
-->

Exercises the Phase 4 broker namespaces against two logical app identities in one
process:

- identity, LXMF, KV storage, Hyperbee, announce, resource fetch, presence
- cross-app inbox and storage isolation
- deny-by-default grants and broker rate limits

Docker peer scenarios against the Python transport stack are layered on top of this
matrix in nightly jobs; the checked-in runner is the fast per-PR gate.

Run with:

```bash
npm run test:sdk-interop
```
