# Policy bypass suite

<!-- tp-doc
lifecycle: reference
audited: 2026-08-27
register: none
-->

`npm run test:policy-bypass` — B1…B14 of the bypass catalogue in
[docs/user-policy-plan.md](../../docs/user-policy-plan.md) §9.3, one named test
each, asserting the attack **fails**. B14 is the exception: self-lockout is
asserted to succeed, because the platform warns and does not nanny.

The requirement is not "policy works" but that policy cannot be talked out of,
so each test carries the payoff as well as the refusal — what the attacker would
have gained had the machine agreed. A test that only asserts a rejection cannot
tell a real defence from a typo in the attack.

| File                | Attacks                                                       |
| ------------------- | ------------------------------------------------------------- |
| `amendment.test.ts` | B1, B2, B3, B13, B14 — talking the amendment machine round    |
| `evidence.test.ts`  | B4, B5, B6, B12 — lying to the adapter that answers the world |
| `seal.test.ts`      | B8, B9, B11 — owning the disk                                 |
| `isolation.test.ts` | B7, B10 — a sibling installation and a mini-app               |
| `catalogue.test.ts` | The suite against the plan's table: no row without a test     |

Two boundaries are deliberate:

- **B8 is half here.** A pre-seal wrap cannot open a post-seal store, and that
  is asserted. Refusing a restored pre-seal _backup_ needs the policy commit
  bound into the backup envelope, which is `POL-8-RECOVERY`; that half is an
  `it.todo` naming it.
- **B12's ceiling.** Place and wakefulness are host sensors with no attestation,
  so a host whose sensor stack is already substituted can assert them. What is
  tested is that the predicate namespace is closed, that the two predicates
  carrying authority (attested time, bound approvals) verify signatures, and
  that a sensor this host lacks resolves `unknown` rather than `true`.
