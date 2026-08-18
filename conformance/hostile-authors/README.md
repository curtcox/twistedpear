# Hostile-author catalog

<!-- tp-doc
lifecycle: live
audited: 2026-08-18
register: software
counterpart: docs/hostile-author-plan.md
-->

Measured verdicts for the 27 scenarios in
[hostile-author-plan.md](../../docs/hostile-author-plan.md) §6.
P1 fixtures assert against the `ConsentRecord` transcript and the broker.
Surface 3 stays `PENDING-P2` until the render oracle lands.

| Id | Expected | Measured | Evidence |
| --- | --- | --- | --- |
| HA-01 | INFORMED | UNCONTROLLED | Two publisher keys both appear as Handbook / homoglyph; confusableWith is empty until P3. |
| HA-02 | BLOCKED | BLOCKED | A different publisher key is a different catalog id; the original entry is not overwritten. |
| HA-03 | INFORMED | INFORMED | trust-import transcript names the pasted key; TrustStore source paste is imported, not direct. |
| HA-04 | INFORMED | INFORMED | apps.install confirmation is transcript-checked; post-fetch review is a separate install-review record. |
| HA-05 | INFORMED | INFORMED | Chain-install confirmation and the second app's review are distinct tokens. |
| HA-10 | INFORMED | INFORMED | Install-review transcript carries the canonical lxmf:send wording. |
| HA-11 | BLOCKED then INFORMED | BLOCKED then INFORMED | Updates do not auto-activate new capabilities; the review marks isNewSinceLastApproval. |
| HA-12 | BLOCKED | UNCONTROLLED | ConfirmationRequest.summary is still an unsanitized string map. |
| HA-13 | BLOCKED | UNCONTROLLED | Eight device-session confirmations in a row are all accepted; no rate limit. |
| HA-14 | BLOCKED | BLOCKED | AppsService.preview rejects grants outside the declared manifest. |
| HA-15 | INFORMED | INFORMED | Transcript lists every declared authority, including ones the app has not used yet. Unused is not a separate flag. |
| HA-20 | BLOCKED | PENDING-P2 | Grant-screen imitation needs the CHROME-R7 layout oracle (P2). |
| HA-21 | BLOCKED | PENDING-P2 | Recovery-phrase solicitation needs CHROME-R8 (P2). |
| HA-22 | BLOCKED | PENDING-P2 | Softened permissions screen is a render-oracle check (P2). |
| HA-23 | BLOCKED | PENDING-P2 | Fake host-update banner is a render-oracle check (P2). |
| HA-24 | BLOCKED | PENDING-P2 | Reserved-lexicon oracle is P2. |
| HA-30 | BLOCKED | BLOCKED | lxmf.send without a host-authored EgressOffer is EGRESS_DENIED. |
| HA-31 | INFORMED + CONTAINED | INFORMED + CONTAINED | ai:chat is host-fixed and budgeted; the grant transcript uses the canonical wording. |
| HA-32 | CONTAINED | CONTAINED | Own-namespace publish is allowed; a foreign namespace is ANNOUNCE_CROSS_APP_SCOPE. |
| HA-33 | BLOCKED | BLOCKED | announce.subscribe into another app's namespace is ANNOUNCE_CROSS_APP_SCOPE. |
| HA-34 | CONTAINED | CONTAINED | resource.fetch names a host resource id, not an app URL. |
| HA-35 | BLOCKED | BLOCKED | GrantStore.delete denies the next lxmf.send. |
| HA-36 | CONTAINED | CONTAINED | A live offer for one peer does not permit a later send to an author-chosen destination. |
| HA-40 | CONTAINED | CONTAINED | Invite send is offer-bound (EGRESS_DENIED without a peer offer). Recipients still do not see host-injected app provenance on the message. |
| HA-41 | BLOCKED | UNCONTROLLED | Local moderation keys on source destination hash, not app id. No per-app block in this suite. |
| HA-42 | CONTAINED | CONTAINED | Transport announce ingress is rate-limited (DEFAULT_ANNOUNCE_RATE_TARGET). |
| HA-43 | INFORMED | INFORMED | A 256t lure is the same install confirmation as HA-04; the transcript names apps:install. |

Counts: 5 BLOCKED, 5 CONTAINED, 6 INFORMED, 1 INFORMED+CONTAINED, 1 BLOCKED-then-INFORMED, 4 UNCONTROLLED, 5 PENDING-P2, 0 UNMEASURED.

UNMEASURED is a driver bug. Re-run with `npm run test:hostile-authors`.
