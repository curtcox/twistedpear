# Symbolic crypto/authentication twins


<!-- tp-doc
lifecycle: reference
audited: 2026-07-20
register: none
-->

The grant boundary and authenticated link handshake each have a Tamarin and a
ProVerif model. Both tools assume perfect cryptography and a Dolev–Yao attacker
that controls the public network. The models make the identity-binding
assumption explicit: link ephemeral material is signed by the long-term peer
identity, while canonical grant records are signed by the issuing host.

The checked properties are grant authenticity, link session-key secrecy, and
mutual agreement on peer identity, link id, and derived key. Replay remains in
the attacker's power; correspondence queries require every acceptance to have
a prior matching issuance/handshake event.

Run the structural inventory everywhere with `npm run formal:symbolic:lint`.
With the tools installed, run:

```sh
npm run formal:tamarin
npm run formal:proverif
```

The symbolic CI workflow installs the official Nix packages and executes both
provers. These are deliberately abstract twins: cryptographic primitives are
symbolic constructors, while the TypeScript implementation and conformance
vectors remain the Layer-1/Layer-3 arbiters for byte behavior.
