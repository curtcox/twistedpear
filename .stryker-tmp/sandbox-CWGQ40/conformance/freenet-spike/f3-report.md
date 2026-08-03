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

Distinct-node publish on Freenet node A / retrieve on node B after stopping A's
process:

```sh
npm run test:freenet-distinct-nodes -- --smoke
```

Evidence: [f3-propagation-proof.json](f3-propagation-proof.json). The harness is
[run-local-f3.mjs](run-local-f3.mjs) plus [prove-f3-propagation.mjs](prove-f3-propagation.mjs);
the distinct-node runner is [run-distinct-nodes.mjs](run-distinct-nodes.mjs).

This is store-level evidence for phase F3. Shipping hosts still need an
operator-facing wire-up of `PropagationRemoteMirror`; destination-hash metadata
exposure remains covered by S8.
