# F3 Freenet propagation proof

<!-- tp-doc
lifecycle: live
audited: 2026-07-28
register: none
-->

Local isolated proof that `FreenetPropagationStore` can publish LXMF ciphertext
into the pinned propagation-set WASM contract and that a second client can
retrieve it after the publisher disconnects.

```sh
npm run test:freenet-propagation
```

Evidence: [f3-propagation-proof.json](f3-propagation-proof.json). The harness is
[run-local-f3.mjs](run-local-f3.mjs) plus [prove-f3-propagation.mjs](prove-f3-propagation.mjs).

This is store-level evidence for phase F3. Shipping hosts still need an
operator-facing wire-up of `PropagationRemoteMirror`; destination-hash metadata
exposure remains covered by S8.
