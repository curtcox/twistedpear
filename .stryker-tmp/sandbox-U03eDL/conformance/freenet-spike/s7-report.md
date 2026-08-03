# S7 — live application interoperability

<!-- tp-doc
lifecycle: reference
audited: 2026-07-28
register: none
-->

The TwistedPear TypeScript adapter successfully read the live Atlas index
contract through the localhost Freenet 0.2.112 node. The repeatable probe is:

```sh
npm run test:freenet-atlas-read
```

The audited response was 13,989 bytes of CBOR `IndexState`; the returned key
matched Atlas's documented instance id. The state hash, node endpoint, and
Atlas source commit used to identify the schema are recorded in
[s7-atlas-read.json](s7-atlas-read.json).

This proves useful Option A read interoperability with a real application
contract. It is not yet a complete S7 result:

- Atlas material updates require a record signed by an authorized curator key.
- Even an idempotent or intentionally rejected live update creates public
  operation metadata. No update was sent without explicit approval.

S7 remains **partial** until a well-formed update is attempted and its accepted
or rejected result is recorded. Option A may continue as read-only exploration;
write capability must not be claimed from this evidence.
