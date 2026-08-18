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
Surface 3 is the CHROME-R8/R9 render oracle.

| Id | Expected | Measured | Evidence |
| --- | --- | --- | --- |
| HA-01 | INFORMED | INFORMED | Two publisher keys both appear as Handbook / homoglyph; install-review confusableWith names the lookalike. |
| HA-02 | BLOCKED | BLOCKED | A different publisher key is a different catalog id; the original entry is not overwritten. |
| HA-03 | INFORMED | INFORMED | trust-import transcript names the pasted key; TrustStore source paste is imported, not direct. |
| HA-04 | INFORMED | INFORMED | apps.install confirmation is transcript-checked; post-fetch review is a separate install-review record. |
| HA-05 | INFORMED | INFORMED | Chain-install confirmation and the second app's review are distinct tokens. |
| HA-10 | INFORMED | INFORMED | Install-review transcript carries the canonical lxmf:send wording. |
| HA-11 | BLOCKED then INFORMED | BLOCKED then INFORMED | Updates do not auto-activate new capabilities; the review marks isNewSinceLastApproval. |
| HA-12 | BLOCKED | BLOCKED | ConfirmationRequest.summary strips newlines and bidi overrides before chrome sees them. |
| HA-13 | BLOCKED | BLOCKED | A fourth device-session confirmation in the same window is CONFIRMATION_RATE_LIMITED. |
| HA-14 | BLOCKED | BLOCKED | AppsService.preview rejects grants outside the declared manifest. |
| HA-15 | INFORMED | INFORMED | Transcript lists every declared authority, including ones the app has not used yet. Unused is not a separate flag. |
| HA-20 | BLOCKED | BLOCKED | Grant-screen Approve/Deny pair is CHROME-R8 layout imitation. |
| HA-21 | BLOCKED | BLOCKED | Recovery-phrase solicitation is CHROME-R9. Highest-severity catalog row. |
| HA-22 | BLOCKED | BLOCKED | Softened permissions pre-prompt matches reserved lexicon. |
| HA-23 | BLOCKED | BLOCKED | Fake host-update banner is CHROME-R8 reserved lexicon. |
| HA-24 | BLOCKED | BLOCKED | TwistedPear authority claim is CHROME-R8 reserved lexicon. |
| HA-30 | BLOCKED | BLOCKED | lxmf.send without a host-authored EgressOffer is EGRESS_DENIED. |
| HA-31 | INFORMED + CONTAINED | INFORMED + CONTAINED | ai:chat is host-fixed and budgeted; the grant transcript uses the canonical wording. |
| HA-32 | CONTAINED | CONTAINED | Own-namespace publish is allowed; a foreign namespace is ANNOUNCE_CROSS_APP_SCOPE. |
| HA-33 | BLOCKED | BLOCKED | announce.subscribe into another app's namespace is ANNOUNCE_CROSS_APP_SCOPE. |
| HA-34 | CONTAINED | CONTAINED | resource.fetch names a host resource id, not an app URL. |
| HA-35 | BLOCKED | BLOCKED | GrantStore.delete denies the next lxmf.send. |
| HA-36 | CONTAINED | CONTAINED | A live offer for one peer does not permit a later send to an author-chosen destination. |
| HA-40 | CONTAINED | CONTAINED | Invite send is offer-bound (EGRESS_DENIED without a peer offer). Recipients still do not see host-injected app provenance on the message. |
| HA-41 | BLOCKED | BLOCKED | blockedApps blocks the hostile app id without blocking another app on the same source hash. |
| HA-42 | CONTAINED | CONTAINED | Transport announce ingress is rate-limited (DEFAULT_ANNOUNCE_RATE_TARGET). |
| HA-43 | INFORMED | INFORMED | A 256t lure is the same install confirmation as HA-04; the transcript names apps:install. |

Counts: 13 BLOCKED, 5 CONTAINED, 7 INFORMED, 1 INFORMED+CONTAINED, 1 BLOCKED-then-INFORMED, 0 UNCONTROLLED, 0 PENDING-PLANNED, 0 UNMEASURED.

UNMEASURED is a driver bug. Re-run with `npm run test:hostile-authors`.
