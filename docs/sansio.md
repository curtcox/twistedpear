# Migrate TwistedPear to Sans-IO Protocol Discipline

> **Status:** Protocol deny-list ratchet is **empty**. Inventory reports 0 violations under
> configured roots (adapters remain outside the scan). Effects package, sim determinism,
> tripwire (scoped to `packages/protocol/test/**`), ESLint, and dependency-cruiser gates
> are green via `npm run sansio`. **RNS HKDF** (via **`stepRnsHkdfSha256WithActions`**:
> use-raw|reject) and **link key derive** (via **`stepDeriveRnsLinkKeyWithActions`** /
> **`stepOrderIndependentSharedSecretWithActions`**: use-raw|reject) are pure protocol
> cores (`@noble/hashes`); `Link.handshake` performs ECDH at the crypto edge then applies
> derive actions. Handshake sims use RNS HKDF over order-independent shared secrets.
> **Link keygen** entropy splits (via **`stepSplitInitiatorLinkEntropyWithActions`** /
> **`stepSplitResponderLinkEntropyWithActions`**: use-fields|reject) accept injected
> entropy; **`Runtime.entropy`** is threaded through `LeafTransport` into Link keygen
> (explicit override still wins). Announce builds prefer `transport.entropy` for the
> random hash. **Identity** keygen entropy split (via
> **`stepSplitIdentityEntropyWithActions`**: use-fields|reject) plus **Identity**,
> **Token**, and **Resource** RNG now prefer injected/`Runtime` entropy (transport
> identity keygen, path-request tags, link Token IVs, destination encrypt, resource
> random hashes). **Identity hash / private-key / public-key / load-key /
> ratchet-decrypt-attempt / ratchet-persist / ratchet-usable** gates (via
> **`stepIdentityHashAllowWithActions`**: allow|deny;
> **`stepIdentityUsePrivateKeyWithActions`**: allow|deny;
> **`stepIdentityUsePublicKeyWithActions`**: allow|deny;
> **`stepLoadIdentityKeyMaterialWithActions`**: allow|deny;
> **`stepAttemptIdentityRatchetDecryptWithActions`**: attempt|skip;
> **`stepPersistIdentityRatchetWithActions`**: persist|skip;
> **`stepIdentityRatchetRecordUsableWithActions`**: usable|unusable;
> **`stepCommitRestoredIdentityRatchetWithActions`**: commit|skip) are pure
> protocol leaves; `Identity` adapts them. **Channel message-state-from-receipt**
> (via **`stepChannelMessageStateFromPacketReceiptWithActions`**: use-state) and
> **announce rate** blocked / record (via **`stepAnnounceBlockedWithActions`**:
> blocked|live; **`stepRecordAnnounceWithActions`**: blocked|clear) are pure
> protocol leaves; `Channel` / `AnnounceRateLimiter` adapt them. **Client rate
> allow** (via **`stepAllowClientRequestWithActions`**: allow|deny),
> **propagation message-too-large** (via
> **`stepPropagationMessageTooLargeWithActions`**: too-large|fit), and
> **select-oldest propagation key** (via
> **`stepSelectOldestPropagationKeyWithActions`**: use-key|miss),
> **propagation store-commit** (via
> **`stepCommitPropagationStoreEntryWithActions`**: commit|skip),
> **propagation restore-apply** (via
> **`stepApplyPropagationRestoreWithActions`**: apply|skip), and
> **propagation store-apply-commit** (via
> **`stepApplyPropagationStoreCommitWithActions`**: apply|skip) are pure
> protocol leaves; `PropagationServer` adapts them.
> **Announce signature-attempt / destination-hash-check**
> gates (via **`stepAttemptAnnounceSignatureValidateWithActions`**: attempt|skip;
> **`stepCheckAnnounceDestinationHashWithActions`**: check|skip),
> **LINKIDENTIFY accept** (via **`stepAcceptLinkIdentifyWithActions`**: accept|skip),
> **LINKIDENTIFY outcome-plan** (via
> **`stepLinkIdentifyOutcomePlanWithActions`**: accept|reject — nested under
> identify),
> **RESOURCE_ADV advertisement-plan / app-result-plan** (via
> **`stepLinkResourceAdvertisementPlanWithActions`**: ignore|ask-app|accept —
> nested under resource-adv; **`stepLinkResourceAcceptAppResultPlanWithActions`**:
> accept|reject — nested under resource-adv),
> **propagation store-plan** (via
> **`stepPropagationStorePlanWithActions`**:
> reject-too-large|duplicate|reject-capacity|accept — nested under
> propagation-store),
> **LXMF delivery-plan** (via
> **`stepLxmfDeliveryPlanWithActions`**:
> deliver|reject-opportunistic-too-large|reject-unsupported-method — nested under
> delivery),
> **LXMF send-method-plan** (via
> **`stepLxmfSendMethodPlanWithActions`**:
> opportunistic|direct|propagated|reject-unpacked|reject-unsupported — nested under
> send-method),
> **LXMF opportunistic / direct / propagated send-plan** (via
> **`stepLxmfOpportunisticSendPlanWithActions`**: ok|missing-destination —
> nested under opportunistic-send;
> **`stepLxmfDirectSendPlanWithActions`**:
> ok|missing-destination|missing-packed — nested under direct-send;
> **`stepLxmfPropagatedSendPlanWithActions`**:
> ok|missing-node|missing-packed|resource-unimplemented — nested under
> propagated-send),
> **LXMF pack / pack-timestamp / instance-pack / propagated-pack-prep plans** (via
> **`stepLxMessagePackPlanWithActions`**: ok|bad-destination|bad-source — nested
> under pack; **`stepLxmfPackTimestampPlanWithActions`**:
> use-timestamp|use-now|reject — nested under pack-timestamp;
> **`stepLxMessageInstancePackPlanWithActions`**:
> ok|already-packed|missing-endpoints|missing-timestamp — nested under
> instance-pack; **`stepLxmfPropagatedPackPrepPlanWithActions`**:
> skip|ok|missing-identity|missing-timestamp — nested under
> propagated-pack-prep),
> **LXMF propagation link-ready / sync-prep / deliverable-accept /
> local-ingress plans** (via
> **`stepLxmfPropagationLinkReadyPlanWithActions`**:
> reuse|establish|missing-node|missing-identity — nested under
> propagation-link-ready; **`stepLxmfPropagationSyncPrepPlanWithActions`**:
> ok|missing-node|missing-delivery-identity — nested under
> propagation-sync-prep; **`stepLxmfDeliverableAcceptPlanWithActions`**:
> accept|reject-unsigned|reject-seen — nested under deliverable-accept;
> **`stepLxmfPropagationLocalIngressPlanWithActions`**:
> deliver|reject-prefix|reject-destination|reject-decrypt — nested under
> propagation-local-ingress),
> **LXMF receipt-send / signature-outcome plans** (via
> **`stepLxmfReceiptSendPlanWithActions`**: apply|skip — nested under
> receipt-send; **`stepLxmfSignatureOutcomePlanWithActions`**: outcome —
> nested under signature),
> **Announce validate / build plans** (via
> **`stepAnnounceValidateOutcomePlanWithActions`**:
> accept|accept-signature-only|reject-* — nested under announce-validate;
> **`stepAnnounceBuildPlanWithActions`**:
> ok|not-announceable-type|not-announceable-direction|missing-identity|
> bad-random-hash|bad-ratchet — nested under announce-build),
> **Identity decrypt / ratchet-lookup / recall / recall-app-data plans** (via
> **`stepIdentityDecryptOutcomePlanWithActions`**:
> reject-frame|accept|reject-enforced|try-identity|reject — nested under
> identity-decrypt; **`stepIdentityRatchetLookupPlanWithActions`**:
> use-cache|miss-no-store|miss-store|reject-unusable|restore — nested under
> identity-ratchet-lookup; **`stepIdentityRecallPlanWithActions`**:
> miss|reject-key|hit — nested under identity-recall;
> **`stepIdentityRecallAppDataPlanWithActions`**: hit|miss — nested under
> identity-recall-app-data),
> **Destination construction / decrypt / encrypt / packet-from-fields plans** (via
> **`stepDestinationConstructionPlanWithActions`**:
> ok|bad-direction|bad-type|bad-identity-binding — nested under
> destination-construction; **`stepDestinationDecryptPlanWithActions`**:
> return-ciphertext|reject|decrypt-with-identity — nested under
> destination-decrypt; **`stepDestinationEncryptPlanWithActions`**:
> use-plaintext|reject|encrypt-with-identity — nested under destination-encrypt;
> **`stepPacketFromFieldsPlanWithActions`**:
> ok|bad-*|header2-missing-transport-id — nested under packet-from-fields),
> **Channel MSGTYPE registration / envelope unpack / pack / send plans** (via
> **`stepChannelMessageTypeRegistrationPlanWithActions`**:
> ok|missing-msgtype|system-reserved — nested under
> channel-message-type-registration; **`stepChannelEnvelopeUnpackPlanWithActions`**:
> ok|missing-raw|truncated|not-registered — nested under channel-envelope-unpack;
> **`stepChannelEnvelopePackPlanWithActions`**: ok|missing-message — nested under
> channel-envelope-pack; **`stepChannelSendPlanWithActions`**:
> proceed|link-not-ready|too-big — nested under channel-send),
> **Resource assemble-outcome / proof-accept / advertise-phase plans** (via
> **`stepResourceAssembleOutcomePlanWithActions`**: complete|corrupt — nested
> under resource-assemble; **`stepResourceProofAcceptPlanWithActions`**:
> complete|ignore — nested under resource-proof-accept;
> **`stepResourceAdvertisePhasePlanWithActions`**: queue|advertise — nested
> under resource-advertise-wait),
> **Link app-request / app-request-transmit-outcome plans** (via
> **`stepLinkAppRequestPlanWithActions`**: send|reject — nested under
> link-app-request; **`stepLinkAppRequestTransmitOutcomePlanWithActions`**:
> keep-pending|unregister — nested under link-app-request-transmit),
> **Path-request ingress / path-outbound / discovery-fulfill / path-entry-lookup /
> transport-ingress-dispatch / link-data-ingress-target / link-relay-target /
> reverse-relay-outcome / packet-hash-remember / local-plain-data-delivery /
> proof-ingress plans** (via
> **`stepPathRequestIngressPlanWithActions`**: ignore-unparsed|ignore-seen-tag|
> answer-local|answer-path|ignore|ignore-in-flight-discovery|start-discovery —
> nested under path-request-ingress; **`stepPathOutboundPlanWithActions`**:
> wrap|direct|flood — nested under path-outbound;
> **`stepDiscoveryPathRequestFulfillPlanWithActions`**: ignore|drop-expired|fulfill —
> nested under discovery-path-request-fulfill;
> **`stepPathEntryLookupPlanWithActions`**: miss|expired|hit — nested under
> path-entry-lookup; **`stepTransportIngressDispatchPlanWithActions`**:
> announce|link-request|link-data|plain-data|proof|ignore — nested under
> transport-ingress-dispatch; **`stepLinkDataIngressTargetPlanWithActions`**:
> active|pending|none — nested under link-data-ingress-target;
> **`stepLinkRelayTargetPlanWithActions`**: outbound|received|ignore — nested under
> link-relay-target; **`stepReverseRelayOutcomePlanWithActions`**:
> relay|delete-expired|ignore — nested under reverse-relay-outcome;
> **`stepPacketHashRememberPlanWithActions`**: now|after-relay — nested under
> packet-hash-remember; **`stepLocalPlainDataDeliveryPlanWithActions`**:
> dispatch|ignore — nested under local-plain-data-delivery;
> **`stepProofIngressPlanWithActions`**: lrproof|resource-prf|receipt — nested under
> proof-ingress),
> **LINKIDENTIFY commit-remote-identity** (via
> **`stepCommitLinkRemoteIdentityWithActions`**: commit|skip),
> **packet-receipt register / keep / fail-and-drop** (via
> **`stepRegisterPacketReceiptWithActions`**: register|skip;
> **`stepKeepOutboundReceiptWithActions`**: keep|skip — planKeep×sent;
> **`stepFailAndDropOutboundReceiptWithActions`**: fail-and-drop|skip —
> failAndDrop×receiptPresent),
> **packet-receipt proof commit** (via
> **`stepAcceptPacketReceiptProofWithActions`**: accept|skip),
> **resource assemble-payload commit** (via
> **`stepCommitResourceAssemblePayloadWithActions`**: commit|skip),
> **local plain-data dispatch commit** (via
> **`stepDispatchLocalPlainDataDeliveryWithActions`**: dispatch|skip), and
> **link-member register** (via **`stepRegisterLinkMemberWithActions`**: register|skip)
> are pure protocol leaves; `Announce`, `Link`, `PacketReceipt`, `Resource`, and
> `TransportNode` adapt them.
> **Propagation catalog /get-request-data** gates (catalog
> evict via **`stepEvictPropagationCatalogEntryWithActions`**: evict|skip;
> catalog delete via **`stepDeletePropagationCatalogEntryWithActions`**:
> delete|skip; evict-oldest via
> **`stepEvictOldestPropagationEntryWithActions`**: evict|skip; /get
> request-data via **`stepAcceptPropagationGetRequestDataWithActions`**:
> accept|skip; /get plan via **`stepPropagationGetPlanWithActions`**:
> list-ids|apply — nested under /get) are pure protocol leaves;
> `PropagationServer` + propagation client adapt them. **LXMF delivery-receipt await / callback /
> local-delivery accept / ingress unpack** gates (via
> **`stepAwaitLxmfDeliveryReceiptWithActions`**: await|skip;
> **`stepInvokeLxmfDeliveryCallbackWithActions`**: invoke|skip;
> **`stepAcceptLxmfPropagationLocalDeliveryWithActions`**: accept|skip;
> **`stepUnpackLxmfPropagationLocalIngressWithActions`**: unpack|skip) are pure
> protocol leaves; `LXMFRouter` adapts them. **Resource hashmap-update gates** (frame accept via
> **`stepAcceptResourceHashmapUpdateFrameWithActions`**: accept|skip;
> part-request fulfill via **`stepFulfillResourcePartRequestWithActions`**:
> fulfill|skip; receive-part slot write via
> **`stepApplyResourceReceivePartSlotWithActions`**: apply|skip; HMU emit via
> **`stepSendResourceHashmapUpdateWithActions`**: send|skip; awaiting-proof
> advance via **`stepAdvanceResourceAwaitingProofWithActions`**: advance|skip)
> are pure protocol leaves; `Resource` + `Link` adapt them. **Resource
> transfer/status** gates (continue-transfer via
> **`stepResourceContinueTransferWithActions`**: continue|stop; complete via
> **`stepResourceCompleteWithActions`**: complete|incomplete; receive-part /
> request-next / watchdog / prove allow via
> **`stepResourceReceivePartAllowWithActions`** /
> **`stepResourceRequestNextAllowWithActions`** /
> **`stepResourceWatchdogAllowWithActions`** /
> **`stepProveResourceAllowWithActions`**: allow|deny; advertise via
> **`stepAdvertiseResourceWithActions`**: advertise|skip; incoming ADV via
> **`stepAcceptIncomingResourceAdvertisementWithActions`**: accept|skip) are pure
> protocol leaves; `Resource` adapts them. **Channel congestion** (window sizing, packet timeout formula
> via **`stepChannelPacketTimeoutSecondsWithActions`**: use-timeout; TX
> outstanding via **`stepCountChannelTxOutstandingWithActions`**: use-count;
> send-allow via **`stepChannelAllowsSendWithActions`**: allow|deny; outlet
> transmit via **`stepChannelOutletTransmitWithActions`**: ok|reject; TX-
> envelope / RX ring-sequence index via
> **`stepIndexOfChannelTxEnvelopeWithActions`** /
> **`stepIndexOfChannelRingSequenceWithActions`**: use-index|miss; TX-envelope
> op via **`stepChannelTxEnvelopeOpWithActions`**: miss|process (nested under
> TX timeout); packet-timeout plan via
> **`stepChannelPacketTimeoutWithActions`**: ignore|give-up|retry (nested under
> TX timeout); arm-
> packet-receipt via **`stepArmChannelPacketReceiptWithActions`**: arm|skip;
> extend-packet-receipt-timeout via **`stepExtendPacketReceiptTimeoutWithActions`**:
> extend|skip; resend-timeout-packet via
> **`stepResendChannelTimeoutPacketWithActions`**: resend|skip; retry exhaustion)
> is a pure protocol leaf; `Channel` adapts it.
> **Matching link-id / pending app-request index** (via
> **`stepIndexOfMatchingLinkIdWithActions`** /
> **`stepIndexOfPendingLinkAppRequestWithActions`**: use-index|miss) and
> **pending RESPONSE deliver** (via
> **`stepDeliverPendingLinkAppResponseWithActions`**: deliver|skip),
> **link app-request invoke-handler** (via
> **`stepInvokeLinkAppRequestHandlerWithActions`**: invoke|skip),
> **link app-request send-response** (via
> **`stepSendLinkAppRequestResponseWithActions`**: send|skip), and
> **send-link-app-response allow** (via
> **`stepSendLinkAppResponseAllowWithActions`**: allow|deny) are pure
> protocol leaves; `TransportNode` and `Link` adapt them. **Stream write
> chunk-length / read-size / chunk-take clamps** (via
> **`stepClampStreamDataChunkLengthWithActions`** /
> **`stepClampStreamReadSizeWithActions`** /
> **`stepClampStreamChunkTakeWithActions`**: use-length / use-size / use-take)
> and **stream append / read-defer / read-return / chunk-consume / eof-mark /
> stream-id / message-handle / ready-callback-register** gates (via
> **`stepAppendStreamDataWithActions`**: append|skip /
> **`stepStreamReadDeferWithActions`**: defer|proceed /
> **`stepStreamReadReturnWithActions`**: yield|skip /
> **`stepStreamChunkConsumeWithActions`**: consume|residual /
> **`stepStreamEofMarkWithActions`**: mark|skip /
> **`stepStreamIdAssignedWithActions`**: assigned|unassigned /
> **`stepStreamDataMessageHandleWithActions`**: handle|ignore /
> **`stepStreamReadyCallbackRegisterWithActions`**: register|skip)
> are pure protocol leaves; Buffer adapts them. **Interface name / MTU /
> closed / send-allow / enqueue / deliver / yield** gates (via
> **`stepInterfaceNameValidWithActions`**: valid|invalid /
> **`stepInterfaceMtuFitWithActions`**: fit|overflow /
> **`stepInterfaceClosedWithActions`**: closed|open /
> **`stepInterfaceSendAllowWithActions`**: allow|deny /
> **`stepEnqueueRawInterfaceFrameWithActions`**: enqueue|skip /
> **`stepEnqueueDecodedPacketWithActions`**: enqueue|skip /
> **`stepDeliverQueuedPacketWithActions`**: deliver|buffer /
> **`stepYieldBufferedPacketWithActions`**: yield|skip) are pure protocol
> leaves; `AbstractPacketInterface` adapts them. **Destination allow / attach /
> announce / send / request-link / register / proof-callback / emit** gates (via
> **`stepAcceptDestinationLinkRequestWithActions`**: allow|deny /
> **`stepAnnounceDestinationWithActions`**: allow|deny /
> **`stepDestinationSendWithActions`**: allow|deny /
> **`stepOperateAttachedDestinationWithActions`**: allow|deny /
> **`stepAnnounceWithIdentityWithActions`**: allow|deny /
> **`stepRequestLinkDestinationWithActions`**: allow|deny /
> **`stepDestinationRequestPathValidWithActions`**: valid|invalid /
> **`stepDestinationIdentityBindingValidWithActions`**: valid|invalid /
> **`stepDestinationProofCallbackWithActions`**: invoke|skip /
> **`stepDestinationLinkEstablishedCallbackWithActions`**: invoke|skip /
> **`stepRegisterDestinationLinkWithActions`**: register|skip /
> **`stepEmitDestinationProofWithActions`**: emit|skip) are pure protocol
> leaves; RegisteredDestination / Link / transport adapt them. **Destination
> request-allow** (via **`stepDestinationRequestAllowWithActions`**: allow|deny)
> is a pure protocol leaf; Link inbound app-request adapts it. **Pending
> link-request register / packet-receipt attach** (via
> **`stepPendingLinkRequestRegisterWithActions`**: register|skip /
> **`stepAttachLinkRequestPacketReceiptWithActions`**: attach|skip) are pure
> protocol leaves; `Link` and `LinkRequestReceipt` adapt them. **Link send / closed /
> reuse / packet-interface / encrypt / request-allow / last-data / inbound-DATA /
> keepalive ignore+reply / keepalive-update / create-channel / ready-for-resource**
> gates (via **`stepLinkSendAllowWithActions`**: allow|deny /
> **`stepLinkClosedWithActions`**: closed|open /
> **`stepReuseActiveLinkWithActions`**: reuse|skip /
> **`stepAcceptLinkPacketInterfaceWithActions`**: accept|skip /
> **`stepEncryptLinkPayloadWithActions`**: encrypt|plaintext /
> **`stepLinkRequestAllowWithActions`**: allow|deny /
> **`stepUpdateLinkLastDataWithActions`**: update|skip /
> **`stepLinkInboundDataPacketWithActions`**: data|other /
> **`stepIgnoreInitiatorKeepaliveProbeWithActions`**: ignore|proceed /
> **`stepReplyKeepaliveProbeWithActions`**: reply|skip /
> **`stepUpdateLinkKeepaliveAllowWithActions`**: allow|deny /
> **`stepCreateLinkChannelWithActions`**: create|reuse /
> **`stepLinkReadyForNewResourceWithActions`**: ready|busy /
> **`stepPerformLinkHandshakeAllowWithActions`**: allow|deny /
> **`stepProveLinkAllowWithActions`**: allow|deny /
> **`stepAcceptLinkOwnerPublicKeyWithActions`**: accept|reject /
> **`stepAcceptLinkRequestOwnerWithActions`**: accept|reject /
> **`stepValidateLinkProofAllowWithActions`**: allow|deny /
> **`stepLinkValidateRequestPlanWithActions`**: ok|bad-request|
> owner-missing-identity|mode-disabled (nested under validate-request) /
> **`stepContinueLinkValidateRequestWithActions`**: continue|skip /
> **`stepLinkAppRequestDispatchWithActions`**: ignore|forbidden|invoke-handler
> (nested under inbound app-request) /
> **`stepLinkAppRequestResponsePlanWithActions`**: ignore|response-too-big|
> send-response (nested under inbound app-request) /
> **`stepLinkTokenAccessPlanWithActions`**: reject-no-key|create|reuse
> (nested under token-access) /
> **`stepLinkProofValidateOutcomePlanWithActions`**: accept|reject
> (nested under proof-validate) /
> **`stepLinkIdentifyOutcomePlanWithActions`**: accept|reject
> (nested under identify) /
> **`stepLinkResourceAdvertisementPlanWithActions`**: ignore|ask-app|accept
> (nested under resource-adv) /
> **`stepLinkResourceAcceptAppResultPlanWithActions`**: accept|reject
> (nested under resource-adv) /
> **`stepPropagationStorePlanWithActions`**:
> reject-too-large|duplicate|reject-capacity|accept
> (nested under propagation-store) /
> **`stepLxmfDeliveryPlanWithActions`**:
> deliver|reject-opportunistic-too-large|reject-unsupported-method
> (nested under delivery) /
> **`stepLxmfSendMethodPlanWithActions`**:
> opportunistic|direct|propagated|reject-unpacked|reject-unsupported)
> (nested under send-method) /
> **`stepLxmfOpportunisticSendPlanWithActions`**: ok|missing-destination
> (nested under opportunistic-send) /
> **`stepLxmfDirectSendPlanWithActions`**:
> ok|missing-destination|missing-packed (nested under direct-send) /
> **`stepLxmfPropagatedSendPlanWithActions`**:
> ok|missing-node|missing-packed|resource-unimplemented
> (nested under propagated-send) /
> **`stepLxMessagePackPlanWithActions`**: ok|bad-destination|bad-source
> (nested under pack) /
> **`stepLxmfPackTimestampPlanWithActions`**: use-timestamp|use-now|reject
> (nested under pack-timestamp) /
> **`stepLxMessageInstancePackPlanWithActions`**:
> ok|already-packed|missing-endpoints|missing-timestamp
> (nested under instance-pack) /
> **`stepLxmfPropagatedPackPrepPlanWithActions`**:
> skip|ok|missing-identity|missing-timestamp
> (nested under propagated-pack-prep) /
> **`stepLxmfPropagationLinkReadyPlanWithActions`**:
> reuse|establish|missing-node|missing-identity
> (nested under propagation-link-ready) /
> **`stepLxmfPropagationSyncPrepPlanWithActions`**:
> ok|missing-node|missing-delivery-identity
> (nested under propagation-sync-prep) /
> **`stepLxmfDeliverableAcceptPlanWithActions`**:
> accept|reject-unsigned|reject-seen
> (nested under deliverable-accept) /
> **`stepLxmfPropagationLocalIngressPlanWithActions`**:
> deliver|reject-prefix|reject-destination|reject-decrypt
> (nested under propagation-local-ingress) /
> **`stepLxmfReceiptSendPlanWithActions`**: apply|skip
> (nested under receipt-send) /
> **`stepLxmfSignatureOutcomePlanWithActions`**: outcome
> (nested under signature) /
> **`stepAnnounceValidateOutcomePlanWithActions`**:
> accept|accept-signature-only|reject-*
> (nested under announce-validate) /
> **`stepAnnounceBuildPlanWithActions`**:
> ok|not-announceable-type|not-announceable-direction|missing-identity|
> bad-random-hash|bad-ratchet
> (nested under announce-build) /
> **`stepIdentityDecryptOutcomePlanWithActions`**:
> reject-frame|accept|reject-enforced|try-identity|reject
> (nested under identity-decrypt) /
> **`stepIdentityRatchetLookupPlanWithActions`**:
> use-cache|miss-no-store|miss-store|reject-unusable|restore
> (nested under identity-ratchet-lookup) /
> **`stepIdentityRecallPlanWithActions`**: miss|reject-key|hit
> (nested under identity-recall) /
> **`stepIdentityRecallAppDataPlanWithActions`**: hit|miss
> (nested under identity-recall-app-data) /
> **`stepDestinationConstructionPlanWithActions`**:
> ok|bad-direction|bad-type|bad-identity-binding
> (nested under destination-construction) /
> **`stepDestinationDecryptPlanWithActions`**:
> return-ciphertext|reject|decrypt-with-identity
> (nested under destination-decrypt) /
> **`stepDestinationEncryptPlanWithActions`**:
> use-plaintext|reject|encrypt-with-identity
> (nested under destination-encrypt) /
> **`stepPacketFromFieldsPlanWithActions`**:
> ok|bad-*|header2-missing-transport-id
> (nested under packet-from-fields) /
> **`stepChannelMessageTypeRegistrationPlanWithActions`**:
> ok|missing-msgtype|system-reserved
> (nested under channel-message-type-registration) /
> **`stepChannelEnvelopeUnpackPlanWithActions`**:
> ok|missing-raw|truncated|not-registered
> (nested under channel-envelope-unpack) /
> **`stepChannelEnvelopePackPlanWithActions`**: ok|missing-message
> (nested under channel-envelope-pack) /
> **`stepChannelSendPlanWithActions`**: proceed|link-not-ready|too-big
> (nested under channel-send) /
> **`stepResourceAssembleOutcomePlanWithActions`**: complete|corrupt
> (nested under resource-assemble) /
> **`stepResourceProofAcceptPlanWithActions`**: complete|ignore
> (nested under resource-proof-accept) /
> **`stepResourceAdvertisePhasePlanWithActions`**: queue|advertise
> (nested under resource-advertise-wait) /
> **`stepLinkAppRequestPlanWithActions`**: send|reject
> (nested under link-app-request) /
> **`stepLinkAppRequestTransmitOutcomePlanWithActions`**: keep-pending|unregister
> (nested under link-app-request-transmit) /
> **`stepPathRequestIngressPlanWithActions`**: ignore-unparsed|ignore-seen-tag|
> answer-local|answer-path|ignore|ignore-in-flight-discovery|start-discovery
> (nested under path-request-ingress) /
> **`stepPathOutboundPlanWithActions`**: wrap|direct|flood
> (nested under path-outbound) /
> **`stepDiscoveryPathRequestFulfillPlanWithActions`**: ignore|drop-expired|fulfill
> (nested under discovery-path-request-fulfill) /
> **`stepPathEntryLookupPlanWithActions`**: miss|expired|hit
> (nested under path-entry-lookup) /
> **`stepTransportIngressDispatchPlanWithActions`**: announce|link-request|
> link-data|plain-data|proof|ignore
> (nested under transport-ingress-dispatch) /
> **`stepLinkDataIngressTargetPlanWithActions`**: active|pending|none
> (nested under link-data-ingress-target) /
> **`stepLinkRelayTargetPlanWithActions`**: outbound|received|ignore
> (nested under link-relay-target) /
> **`stepReverseRelayOutcomePlanWithActions`**: relay|delete-expired|ignore
> (nested under reverse-relay-outcome) /
> **`stepPacketHashRememberPlanWithActions`**: now|after-relay
> (nested under packet-hash-remember) /
> **`stepLocalPlainDataDeliveryPlanWithActions`**: dispatch|ignore
> (nested under local-plain-data-delivery) /
> **`stepProofIngressPlanWithActions`**: lrproof|resource-prf|receipt
> (nested under proof-ingress) /
> **`stepAttemptLinkProofCryptoWithActions`**: attempt|skip /
> **`stepAcceptLinkRttWithActions`**: accept|skip /
> **`stepLinkRttOutcomePlanWithActions`**: ignore|activate|teardown
> (nested under establish LRRTT) /
> **`stepTeardownLinkFromRttWithActions`**: teardown|skip /
> **`stepAcceptLinkTeardownWithActions`**: accept|skip /
> **`stepLinkTeardownReasonWithActions`**: use-reason /
> **`stepLinkTeardownPlanWithActions`**: close-only|send-teardown-then-close /
> **`stepIdentifyOnLinkAllowWithActions`**: allow|deny /
> **`stepDispatchLinkPlaintextWithActions`**: dispatch|skip /
> **`stepResendLinkPacketAllowWithActions`**: allow|deny /
> **`stepRegisterLinkResourceWithActions`**: register|skip /
> **`stepHandleOutgoingResourceRequestWithActions`**: handle|skip /
> **`stepHandleIncomingResourceByHashWithActions`**: handle|skip /
> **`stepLinkModeEnabledWithActions`**: enabled|disabled /
> **`stepExpectedLinkModeWithActions`**: match|mismatch) are pure protocol
> leaves; `Link`, Channel outlet, and LXMF link-reuse adapt them. **Channel envelope
> framing** and **RX reorder/drain** are also pure protocol leaves. **LXMF outbound
> send-state** (enqueue → sending → sent/delivered/
> failed + progress) is a pure protocol leaf; `LXMFRouter` adapts it. **Link proof framing**
> and **establish status transitions** (handshake/proof/RTT/identify gates) are pure
> protocol leaves; `Link` adapts them. **Link identify** payload framing (pack/split via
> **`stepPackLinkIdentifyPayloadWithActions`** /
> **`stepSplitLinkIdentifyPayloadWithActions`**: use-raw|reject / use-fields|reject;
> signed material via **`stepLinkIdentifySignedMaterialWithActions`**: use-raw) and
> acceptance gates are pure protocol leaves; `Link` adapts them. **MDU**
> metrics and **hops-match** (via **`stepLinkHopsMatchWithActions`**:
> match|mismatch) are pure protocol leaves; `Link` adapts them. **LXMF propagation quota / eviction
> planning** (store via **`stepPropagationStoreWithActions`**: reject /
> duplicate / accept; plan nested via
> **`stepPropagationStorePlanWithActions`**:
> reject-too-large|duplicate|reject-capacity|accept) and **propagation /get
> request planning** (via **`stepPropagationGetWithActions`**: list-ids / apply
> delete+fetch; plan nested via **`stepPropagationGetPlanWithActions`**:
> list-ids|apply) are pure protocol leaves; `PropagationServer` and peer
> propagation adapt them. **LXMF delivery method / representation selection**
> (via **`stepLxmfDeliveryWithActions`**: deliver / reject-opportunistic-too-
> large / reject-unsupported-method; plan nested via
> **`stepLxmfDeliveryPlanWithActions`**:
> deliver|reject-opportunistic-too-large|reject-unsupported-method) is a pure
> protocol leaf; `LXMessage` adapts it. **LXMF outbound send-method dispatch** (via
> **`stepLxmfSendMethodWithActions`**: reject-unpacked / send-opportunistic /
> send-direct / send-propagated / reject-unsupported; plan nested via
> **`stepLxmfSendMethodPlanWithActions`**:
> opportunistic|direct|propagated|reject-unpacked|reject-unsupported) is a pure
> protocol leaf; `LXMFRouter.send` adapts it. **LXMF per-method send gates** (via
> **`stepLxmfOpportunisticSendWithActions`** / **`stepLxmfDirectSendWithActions`** /
> **`stepLxmfPropagatedSendWithActions`**: proceed / reject-*; plan nested via
> **`stepLxmfOpportunisticSendPlanWithActions`**: ok|missing-destination /
> **`stepLxmfDirectSendPlanWithActions`**:
> ok|missing-destination|missing-packed /
> **`stepLxmfPropagatedSendPlanWithActions`**:
> ok|missing-node|missing-packed|resource-unimplemented) are pure protocol
> leaves; `LXMFRouter` send paths adapt them. **LXMF pack gates** (via
> **`stepLxMessagePackWithActions`**: proceed / reject-bad-destination /
> reject-bad-source; plan nested via **`stepLxMessagePackPlanWithActions`**:
> ok|bad-destination|bad-source — nested under pack;
> **`stepLxmfPackTimestampWithActions`**: use-timestamp / use-now / reject; plan
> nested via **`stepLxmfPackTimestampPlanWithActions`**:
> use-timestamp|use-now|reject — nested under pack-timestamp;
> **`stepLxMessageInstancePackWithActions`**: proceed / reject-already-packed /
> reject-missing-endpoints / reject-missing-timestamp; plan nested via
> **`stepLxMessageInstancePackPlanWithActions`**:
> ok|already-packed|missing-endpoints|missing-timestamp — nested under
> instance-pack; **`stepLxmfPropagatedPackPrepWithActions`**: skip / proceed /
> reject-missing-identity / reject-missing-timestamp; plan nested via
> **`stepLxmfPropagatedPackPrepPlanWithActions`**:
> skip|ok|missing-identity|missing-timestamp — nested under
> propagated-pack-prep) are pure protocol leaves; `LXMessage` adapts them.
> **LXMF propagation link-ready /
> sync-prep / deliverable-accept / local-ingress gates** (via
> **`stepLxmfPropagationLinkReadyWithActions`**: reuse /
> establish / reject-missing-node / reject-missing-identity; plan nested via
> **`stepLxmfPropagationLinkReadyPlanWithActions`**:
> reuse|establish|missing-node|missing-identity — nested under
> propagation-link-ready; **`stepLxmfPropagationSyncPrepWithActions`**:
> proceed / reject-missing-node / reject-missing-delivery-identity; plan nested via
> **`stepLxmfPropagationSyncPrepPlanWithActions`**:
> ok|missing-node|missing-delivery-identity — nested under
> propagation-sync-prep; **`stepLxmfDeliverableAcceptWithActions`**: accept /
> reject-unsigned / reject-seen; plan nested via
> **`stepLxmfDeliverableAcceptPlanWithActions`**:
> accept|reject-unsigned|reject-seen — nested under deliverable-accept;
> **`stepLxmfPropagationLocalIngressWithActions`**: deliver / reject-prefix /
> reject-destination / reject-decrypt; plan nested via
> **`stepLxmfPropagationLocalIngressPlanWithActions`**:
> deliver|reject-prefix|reject-destination|reject-decrypt — nested under
> propagation-local-ingress) and **receipt → send-state
> mapping** (via **`stepLxmfReceiptSendWithActions`**: apply / skip; plan
> nested via **`stepLxmfReceiptSendPlanWithActions`**: apply|skip) and
> **signature outcome** (via **`stepLxmfSignatureWithActions`**: apply with
> signatureValidated / unverifiedReason; plan nested via
> **`stepLxmfSignatureOutcomePlanWithActions`**: outcome) are pure protocol leaves;
> `LXMFRouter` and `PropagationClient` adapt them. **Link request / response msgpack codecs**
> (pack/unpack via **`stepPackLinkRequestWithActions`** /
> **`stepPackLinkResponseWithActions`** /
> **`stepUnpackLinkRequestWithActions`** /
> **`stepUnpackLinkResponseWithActions`**: use-raw / use-fields|reject) are
> pure protocol leaves; `Link` adapts them (reticulum still re-exports the raw
> helpers). **Destination name expansion / hash material** (via
> **`stepExpandDestinationNameWithActions`** /
> **`stepDestinationNameHashMaterialWithActions`** /
> **`stepDestinationHashMaterialWithActions`** /
> **`stepValidateDestinationNamePartWithActions`** /
> **`stepParseAspectFilterWithActions`**: use-fields|reject / use-raw|reject /
> use-raw / proceed|reject / use-fields|reject) and shared **UTF-8** helpers are
> pure protocol leaves; `Destination` and announce-handler path-hash call sites
> adapt them (SHA stays at the crypto edge). **Msgpack string / string-map** packing and **resource advertisement**
> codecs (pack/unpack via **`stepPackResourceAdvertisementWithActions`** /
> **`stepUnpackResourceAdvertisementWithActions`**: use-raw / use-fields|reject;
> flag encode/decode via **`stepEncodeResourceAdvertisementFlagsWithActions`** /
> **`stepDecodeResourceAdvertisementFlagsWithActions`**: use-flags / use-fields;
> request/response classify via **`stepClassifyResourceAdvertisementWithActions`**:
> request|response|reject) are
> pure protocol leaves; `ResourceAdvertisement` adapts them. **Resource hashmap-update** framing (pack/unpack / packet pack/split /
> part-request parse via **`stepPackResourceHashmapUpdateWithActions`** /
> **`stepUnpackResourceHashmapUpdateWithActions`** /
> **`stepPackResourceHashmapUpdatePacketWithActions`** /
> **`stepSplitResourceHashmapUpdatePacketWithActions`** /
> **`stepParseResourcePartRequestWithActions`**: use-raw / use-fields|reject;
> collision-guard / assemble / membership / request-hash via
> **`stepAppendResourceMapHashCollisionGuardWithActions`** /
> **`stepAssembleResourceHashmapBytesWithActions`** /
> **`stepContainsResourceHashWithActions`** /
> **`stepReadResourceRequestHashWithActions`**: append|collide / use-raw /
> present|absent / use-raw; slot-write plan / apply via
> **`stepResourceHashmapSlotWritesWithActions`** /
> **`stepApplyResourceHashmapSlotWritesWithActions`**: write / use-fields),
> and **part-request / receive-part / request-fulfill / HMU-accept**
> (via **`stepResourcePartRequestWithActions`** /
> **`stepResourceReceivePartWithActions`** /
> **`stepResourceRequestFulfillWithActions`** /
> **`stepResourceHashmapUpdateAcceptWithActions`**) are pure protocol
> leaves; `Resource` + `Link` adapt them. Link RTT float encode/decode uses protocol msgpack
> (pack/unpack via **`stepPackMsgpackFloat64WithActions`** /
> **`stepUnpackMsgpackFloatWithActions`**: use-raw / use-fields|reject).
> **Transport wrap / strip / relay / hop-rewrite framing** (via
> **`stepWrapTransportPacketWithActions`** / **`stepStripTransportHeadersWithActions`** /
> **`stepRelayTransportPacketWithActions`** / **`stepRewritePacketHopsWithActions`**:
> use-raw) and **resource proof** framing (pack/split / decrypted-payload via
> **`stepPackResourceProofWithActions`** / **`stepSplitResourceProofWithActions`** /
> **`stepSplitResourceDecryptedPayloadWithActions`**: use-raw / use-fields|reject;
> validate via **`stepResourceProofAcceptWithActions`**) live in protocol; `Link` +
> `Resource` adapt them. **Transport hop-clone /
> announce / path-response field planning** (via **`stepClonePacketWithHopsWithActions`** /
> **`stepTransportAnnounceFieldsWithActions`** /
> **`stepPathResponseAnnounceFieldsWithActions`**: use-fields) lives in protocol;
> leaf transport adapts it. **Path-request payload framing**
> (build/parse/tag key via **`stepBuildPathRequestDataWithActions`** /
> **`stepParsePathRequestDataWithActions`** /
> **`stepPathRequestTagKeyWithActions`**: use-raw / use-fields|reject /
> use-key) is a pure protocol leaf; transport path helpers adapt it.
> **Announce payload framing** (pack/parse via **`stepPackAnnouncePayloadWithActions`** /
> **`stepParseAnnouncePayloadWithActions`**: use-raw / use-fields|reject; signed material via
> **`stepAnnounceSignedMaterialWithActions`**: use-raw; destination-hash material / match via
> **`stepAnnounceDestinationHashMaterialWithActions`** /
> **`stepAnnounceDestinationHashMatchWithActions`**: use-raw / match|mismatch;
> payload / parsed accept via **`stepAcceptAnnouncePayloadWithActions`** /
> **`stepAcceptParsedAnnounceWithActions`**: accept|skip;
> packet-type via **`stepAnnouncePacketTypeWithActions`**: announce|other)
> and **packet proof framing**
> (pack/split via **`stepPackPacketProofWithActions`** /
> **`stepSplitPacketProofWithActions`**: use-raw / use-fields|reject; explicit/implicit;
> hash-match via **`stepPacketProofHashMatchWithActions`**: match|mismatch;
> packet-type via **`stepPacketTypeProofWithActions`**: proof|other)
> are pure protocol leaves; `Announce` and `Packet` adapt them.
> **Link-proof / link-request framing** (pack/split via
> **`stepPackLinkProofDataWithActions`** / **`stepSplitLinkProofBodyWithActions`** /
> **`stepPackLinkRequestDataWithActions`** / **`stepSplitLinkRequestDataWithActions`**:
> use-raw / use-fields|reject; signed material / hashable truncate via
> **`stepLinkProofSignedMaterialWithActions`** /
> **`stepLinkRequestHashablePartWithActions`**: use-raw; signalling/MTU encode via
> **`stepEncodeLinkSignallingBytesWithActions`** /
> **`stepEncodeLinkMtuBytesWithActions`**: use-raw; mode/MTU decode via
> **`stepModeFromLinkRequestDataWithActions`** /
> **`stepModeFromLinkProofDataWithActions`** /
> **`stepMtuFromLinkRequestDataWithActions`** /
> **`stepMtuFromLinkProofDataWithActions`**: use-mode / use-mtu|reject;
> payload classify via **`stepClassifyLinkProofPayloadWithActions`**:
> body-only|body-with-mtu|reject) is a pure protocol leaf; `Link`
> adapts it.
> **Packet header** encode/decode (via **`stepEncodePacketRawWithActions`** /
> **`stepDecodePacketRawWithActions`**: use-raw|reject / use-fields|reject),
> flag packing / unpacking (via **`stepPackPacketFlagsWithActions`** /
> **`stepUnpackPacketFlagsWithActions`**: use-flags / use-fields), and
> hashable-part framing (via **`stepPacketHashablePartWithActions`**: use-raw)
> are pure protocol leaves; `Packet` adapts them. **PKCS#7** padding (pad/unpad via
> **`stepPkcs7PadWithActions`** / **`stepPkcs7UnpadWithActions`**: use-raw /
> use-raw|reject) and **LXMF delivery planning**
> (method/representation selection via **`stepLxmfDeliveryWithActions`**;
> plan nested via **`stepLxmfDeliveryPlanWithActions`**:
> deliver|reject-opportunistic-too-large|reject-unsupported-method) are
> pure protocol leaves; Token and `LXMessage` adapt them. **Token framing**
> (key split / iv||ciphertext||hmac via **`stepSplitTokenKeyWithActions`** /
> **`stepPackTokenFrameWithActions`** /
> **`stepSplitTokenFrameWithActions`**: use-fields|reject / use-raw|reject /
> use-fields|reject; IV-length / frame-accept via
> **`stepTokenIvLengthValidWithActions`** /
> **`stepAcceptTokenFrameWithActions`**: valid|invalid / accept|skip;
> signed material / HMAC match via **`stepTokenSignedMaterialWithActions`** /
> **`stepTokenHmacMatchWithActions`**: use-raw|reject / match|mismatch) and
> **link keepalive-context** (via **`stepLinkKeepaliveContextWithActions`**:
> keepalive|other), **channel envelope emplace** (via
> **`stepEmplaceChannelEnvelopeWithActions`**: emplace|skip), **channel RX/TX
> lifecycle** (sequence accept via **`stepAcceptChannelSequenceWithActions`**:
> accept|skip; ring drain via **`stepDrainChannelRingIndexWithActions`**:
> drain|skip; handler register via
> **`stepRegisterChannelMessageHandlerWithActions`**: register|skip; fan-out
> stop via **`stepStopChannelHandlerFanoutWithActions`**: stop|continue;
> immediate delivery via **`stepEmitChannelImmediateDeliveryWithActions`**:
> emit|skip; envelope clear via **`stepClearChannelEnvelopePacketWithActions`**:
> clear|skip; receipt arm via **`stepArmChannelPacketReceiptWithActions`**:
> arm|skip (nested under TX receipt-timeout refresh); packet-timeout formula
> via **`stepChannelPacketTimeoutSecondsWithActions`**: use-timeout (also
> nested under TX receipt-timeout refresh); receipt timeout via
> **`stepApplyChannelPacketReceiptTimeoutWithActions`**: apply|skip; resent
> replace via **`stepReplaceChannelResentPacketWithActions`**: replace|skip;
> TX receipt-timeout extension via
> **`stepApplyChannelTxReceiptTimeoutExtensionWithActions`**: apply|skip;
> extend-packet-receipt-timeout via
> **`stepExtendPacketReceiptTimeoutWithActions`**: extend|skip;
> resend-timeout-packet via
> **`stepResendChannelTimeoutPacketWithActions`**: resend|skip), **resource
> fulfill-part apply** (via **`stepApplyResourceFulfillPartWithActions`**:
> apply|skip; frame accept / part-request fulfill / receive-part slot / HMU emit /
> awaiting-proof advance via
> **`stepAcceptResourceHashmapUpdateFrameWithActions`**: accept|skip /
> **`stepFulfillResourcePartRequestWithActions`**: fulfill|skip /
> **`stepApplyResourceReceivePartSlotWithActions`**: apply|skip /
> **`stepSendResourceHashmapUpdateWithActions`**: send|skip /
> **`stepAdvanceResourceAwaitingProofWithActions`**: advance|skip), **propagation peer-response accept** (via
> **`stepAcceptPropagationPeerResponseWithActions`**: accept|skip),
> **resource-proof payload / split / random-hash length** (via
> **`stepAcceptResourceProofPayloadWithActions`** /
> **`stepAcceptResourceProofSplitWithActions`**: accept|skip;
> **`stepResourceRandomHashLengthValidWithActions`**: valid|invalid),
> **propagation peer-error / delivered-message / list-empty / haves-ack** (via
> **`stepHandlePropagationPeerErrorWithActions`**: handle|skip;
> **`stepAcceptPropagationDeliveredMessageWithActions`**: accept|skip;
> **`stepTreatPropagationListAsEmptyWithActions`**: empty|nonempty;
> **`stepRequestPropagationHavesAckWithActions`**: request|skip), and
> **stamp-cost extraction** from announce app-data (via
> **`stepStampCostFromAppDataWithActions`**: use-fields|reject) are pure
> protocol leaves; Token, Link, Channel, Resource, LXMF propagation, and LXMF
> router adapt them. **Resource receive-part planning** (via **`stepResourceReceivePartWithActions`**), **LXMF outer wire framing** (via
> **`stepPackLxmfWireWithActions`** / **`stepSplitLxmfWireWithActions`**;
> hashable / signed / opportunistic via **`stepLxmfHashableMaterialWithActions`** /
> **`stepLxmfSignedMaterialWithActions`** /
> **`stepLxmfOpportunisticPayloadWithActions`**), and
> PacketReceipt proof validation via **`stepSplitPacketProofWithActions`** /
> **`stepPacketProofHashMatchWithActions`** /
> **`stepPacketReceiptProofAcceptWithActions`** are pure protocol leaves.
> **Identity ciphertext** framing (pack/split via
> **`stepPackIdentityCiphertextWithActions`** /
> **`stepSplitIdentityCiphertextWithActions`**: use-raw|reject /
> use-fields|reject; ephemeral public || Token; accept gates via
> **`stepAcceptIdentityCiphertextFrameWithActions`** /
> **`stepAcceptIdentityDecryptPlaintextWithActions`**: accept|skip), **WS binary frame**
> encode/decode (via **`stepEncodeWsBinaryFrameWithActions`** /
> **`stepDecodeWsClientFrameWithActions`**: use-raw / use-fields|reject),
> **HDLC interface framing** (encode/decode via
> **`stepEncodeHdlcFrameWithActions`** / **`stepDecodeHdlcFramesWithActions`**:
> use-raw / use-fields), **LXMF peer-error** msgpack decode (via
> **`stepDecodeLxmfPeerErrorWithActions`**: use-fields|reject), and **LXMF
> payload / propagation** codecs (pack/unpack via
> **`stepPackLxmPayloadWithActions`** /
> **`stepUnpackLxmPayloadWithActions`** /
> **`stepPackPropagationRequestWithActions`** /
> **`stepUnpackPropagationRequestWithActions`** /
> **`stepPackPropagationEnvelopeWithActions`** /
> **`stepUnpackPropagationEnvelopeWithActions`** /
> **`stepUnpackBinListWithActions`**: use-raw /
> use-fields|reject) are pure protocol leaves; Identity,
> websocket-server, `HdlcPacketInterface`, `LXMessage`, and
> propagation adapters use them. **Identity ratchet
> persistence** (JSON encode/decode via
> **`stepEncodeIdentityRatchetRecordWithActions`** /
> **`stepDecodeIdentityRatchetRecordWithActions`**: use-raw|reject /
> use-fields|reject; store key, usability/expiry; lookup via
> **`stepIdentityRatchetLookupWithActions`**) and **web-identity
> record framing** (pack/split via **`stepPackWebIdentityRecordWithActions`** /
> **`stepSplitWebIdentityRecordWithActions`**: use-raw|reject / use-fields|reject;
> salt||iv||ciphertext) are pure protocol leaves; Identity and web-identity
> adapters use them. Shared `hexToBytesLower` lives with destination-name
> helpers. **Identity recall** / **recall-app-data** (via
> **`stepIdentityRecallWithActions`** / **`stepIdentityRecallAppDataWithActions`**)
> are pure protocol leaves; `Identity` adapts them. **Link establishment timeout**
> (`computeLinkEstablishmentTimeout` via **`stepComputeLinkEstablishmentTimeoutWithActions`**:
> use-timeout; **`stepComputeLinkRequestTimeoutWithActions`**: use-timeout) and **LXMF
> inbound delivery framing** (opportunistic rebuild + destination-prefixed pack/split
> via **`stepLxmfInboundDeliveryWithActions`** /
> **`stepPackLxmfDestinationPrefixedWithActions`** /
> **`stepSplitLxmfDestinationPrefixedWithActions`**: use-raw / use-raw|reject /
> use-fields|reject) are pure protocol leaves; `Link` and `LXMFRouter` adapt them.
> **LXMF outer wire framing** (pack/split via
> **`stepPackLxmfWireWithActions`** / **`stepSplitLxmfWireWithActions`**: use-raw|reject /
> use-fields|reject; hashable / signed / opportunistic via
> **`stepLxmfHashableMaterialWithActions`** /
> **`stepLxmfSignedMaterialWithActions`** /
> **`stepLxmfOpportunisticPayloadWithActions`**: use-raw / use-raw /
> use-raw|reject) is a pure protocol leaf; `LXMessage` adapts it. **Link proof signed
> material** / **link-request hashable truncation** (via
> **`stepLinkProofSignedMaterialWithActions`** /
> **`stepLinkRequestHashablePartWithActions`**: use-raw), **StreamDataMessage framing**
> (pack/unpack via **`stepPackStreamDataMessageWithActions`** /
> **`stepUnpackStreamDataMessageWithActions`**: use-raw|reject /
> use-fields|reject), and **resource hash/encrypt
> materials** (via **`stepResourceEncryptMaterialWithActions`** /
> **`stepResourceHashMaterialWithActions`** /
> **`stepResourceExpectedProofMaterialWithActions`** /
> **`stepResourcePartMapHashMaterialWithActions`**: use-raw|reject /
> use-raw; total parts via **`stepComputeResourceTotalPartsWithActions`**:
> use-parts) are pure protocol leaves; `Resource` adapts them.
> **Identity keygen entropy** (via **`stepSplitIdentityEntropyWithActions`**:
> use-fields|reject) and **Identity key pack/split** (via
> **`stepPackIdentityPrivateKeyWithActions`** /
> **`stepSplitIdentityPrivateKeyWithActions`** /
> **`stepPackIdentityPublicKeyWithActions`** /
> **`stepSplitIdentityPublicKeyWithActions`**: use-raw|reject /
> use-fields|reject), and
> **RESOURCE_HMU pack** are pure protocol leaves; Identity, Link, and Resource adapt
> them (`Identity.prove` uses **`stepPackPacketProofWithActions`**; link-request /
> link-proof pack/split use the WithActions steps above). **Byte-array assembly**
> (via **`stepAssembleByteArraysWithActions`**: use-raw),
> **interface reconnect planning**, and Resource hashmap/part assembly via protocol
> assemblers are pure protocol leaves; TCP/WebSocket clients and Resource adapt them.
> **Transport announce / path-response / hop-clone field planning** applies only from
> those `use-fields` actions (see above). **Transport wrap / strip / relay /
> hop-rewrite framing** applies only from those `use-raw` actions (see above).
> Link proof paths use **`stepSplitIdentityPublicKeyWithActions`** for
> owner/peer Ed25519 halves. **Interface reconnect** is now a pure step machine
> (`timer/set` intents + connect/give-up actions); TCP/WebSocket clients adapt it.
> Link resource HMU/cancel uses `splitResourceHashmapUpdatePacket`. Identity ratchet JSON
> (encode/decode via **`stepEncodeIdentityRatchetRecordWithActions`** /
> **`stepDecodeIdentityRatchetRecordWithActions`**: use-raw|reject /
> use-fields|reject), web-identity
> passphrase bytes, and LXMF message text use protocol UTF-8 (no
> `TextEncoder`/`TextDecoder`). **Hash truncation** (via
> **`stepTruncateHashBytesWithActions`**: use-raw|reject; truncated / name-hash
> lengths), **packet context byte codes**, and **UTF-8** encode/decode/or-bytes
> (via **`stepUtf8EncodeWithActions`** / **`stepUtf8DecodeWithActions`** /
> **`stepUtf8OrBytesWithActions`**: use-raw / use-fields / use-raw) are pure
> protocol leaves; Identity/Destination/Announce/Packet, Link path hashing,
> web-identity passphrase bytes, msgpack string decode, and LXMF message text
> adapt them. **Grant-record** encode/decode (via
> **`stepEncodeGrantRecordWithActions`** /
> **`stepDecodeGrantRecordWithActions`**: use-raw|reject / use-fields|reject)
> is a pure protocol leaf; `stepGrantHost` and miniapp `GrantStore` adapt them.
> **Channel envelope** framing pack/unpack (via
> **`stepPackChannelEnvelopeWithActions`** /
> **`stepUnpackChannelEnvelopeWithActions`**: use-raw|reject /
> use-fields|reject), **envelope pack/unpack gates**, **MSGTYPE
> registration**, and **channel send** (via **`stepChannelEnvelopePackWithActions`** /
> **`stepChannelEnvelopeUnpackWithActions`** / **`stepChannelMessageTypeRegistrationWithActions`** /
> **`stepChannelSendWithActions`**; plans nested via
> **`stepChannelEnvelopePackPlanWithActions`** /
> **`stepChannelEnvelopeUnpackPlanWithActions`** /
> **`stepChannelMessageTypeRegistrationPlanWithActions`** /
> **`stepChannelSendPlanWithActions`**) are pure protocol leaves; `Channel` adapts them.
> **Resource assemble / proof-accept / advertise-phase** (via
> **`stepResourceAssembleWithActions`** /
> **`stepResourceProofAcceptWithActions`** /
> **`stepResourceAdvertiseWaitWithActions`**; plans nested via
> **`stepResourceAssembleOutcomePlanWithActions`** /
> **`stepResourceProofAcceptPlanWithActions`** /
> **`stepResourceAdvertisePhasePlanWithActions`**) are pure protocol leaves;
> `Resource` adapts them. **LXMF delivery sizes / MDU max-content** and
> **peer-error code object** live in protocol; lxmf-ts re-exports aliases
> (`DESTINATION_LENGTH`, `ENCRYPTED_PACKET_MAX_CONTENT`, `PeerError`, method/representation
> enums). **Packet header enum objects** (`PacketTypeCode`, header/context-flag/transport/
> destination-type/direction codes), **link keepalive probe/reply framing** (pack/classify
> via **`stepPackLinkKeepaliveProbeWithActions`** /
> **`stepPackLinkKeepaliveReplyWithActions`** /
> **`stepClassifyLinkKeepaliveWithActions`**: use-raw / probe|reply|reject), and proof/
> announce signature size aliases are pure protocol leaves; Packet, Destination, Link,
> PacketReceipt, and Announce adapt them. **Link wire constants / enums** (modes, MTU
> masks, sizes, keepalive/stale/traffic timeouts, status/teardown/resource-strategy)
> live in protocol; `link.ts` re-exports RNS names (`LinkMode`, `LINK_ECPUB_SIZE`, …).
> **LXMF Field / unverified-reason / peer paths / app name**, **ChannelMessageState**,
> **stream SMT_STREAM_DATA**, and **PacketReceiptStatus** live in protocol; lxmf-ts and
> reticulum Channel/Buffer/PacketReceipt adapt them. **Resource session constants**
> (status/window/retry) and **resource timeout** (via
> **`stepComputeResourceTimeoutWithActions`**: use-timeout) live in protocol;
> Resource adapts them. **LinkRequestReceiptStatus**, **DestinationAllowPolicyCode**, and
> **`planDestinationRequestAllow`** (via **`stepDestinationRequestAllowWithActions`**:
> allow|deny) live in protocol; LinkRequestReceipt,
> RegisteredDestination, and Link adapt them. **Destination proof strategy /
> `planDestinationProof`**, **link resource-accept planning**, **`stepLinkRequestReceipt`**,
> and **ChannelExceptionType** live in protocol; LeafTransport, Link, LinkRequestReceipt,
> and Channel adapt them. **`channelMessageStateFromPacketReceipt`** (via
> **`stepChannelMessageStateFromPacketReceiptWithActions`**: use-state), **link teardown
> planning** (via **`stepLinkTeardownWithActions`**; remote accept nested via
> **`stepAcceptLinkTeardownWithActions`**: accept|skip; reason nested via
> **`stepLinkTeardownReasonWithActions`**: use-reason; plan nested via
> **`stepLinkTeardownPlanWithActions`**: close-only|send-teardown-then-close), and PacketReceipt delivery/timeout via **`stepPacketReceiptTimeoutWithActions`**
> (`timeout` / `delivered` / `failed` actions) live in
> protocol; Channel, Link, and PacketReceipt adapt them. **Announce rate** blocked /
> record gates (via **`stepAnnounceBlockedWithActions`**: blocked|live;
> **`stepRecordAnnounceWithActions`**: blocked|clear) live in protocol;
> `AnnounceRateLimiter` adapts them. **Client rate allow** (via
> **`stepAllowClientRequestWithActions`**: allow|deny), **propagation
> message-too-large** (via **`stepPropagationMessageTooLargeWithActions`**:
> too-large|fit), **select-oldest propagation key** (via
> **`stepSelectOldestPropagationKeyWithActions`**: use-key|miss),
> **propagation store-commit** (via
> **`stepCommitPropagationStoreEntryWithActions`**: commit|skip),
> **propagation restore-apply** (via
> **`stepApplyPropagationRestoreWithActions`**: apply|skip), and
> **propagation store-apply-commit** (via
> **`stepApplyPropagationStoreCommitWithActions`**: apply|skip) live in
> protocol; `PropagationServer` adapts them. **`planChannelPacketTimeout`**
> (via **`stepChannelPacketTimeoutWithActions`**: ignore|give-up|retry;
> `CHANNEL_MAX_TRIES`; nested under **`stepChannelTxTimeoutWithActions`**),
> **`shouldEmitPathRequest`** (via
> **`stepEmitPathRequestWithActions`**: emit|skip), and link-watchdog **`link/inbound`**
> STALE→ACTIVE revive live in protocol; Channel, LeafTransport, and Link adapt them.
> **`stepChannelWindow`**, **transport ingress accept/hash-defer planners** (+ rebroadcast/
> reverse-timeout constants), and **`computeLinkRequestTimeout`** live in protocol; Channel,
> TransportNode, and Link adapt them. **`planResourceRequestFulfill`** (sender RESOURCE_REQ
> fulfill via **`stepResourceRequestFulfillWithActions`**: part send/resend + optional HMU +
> awaiting-proof) lives in protocol; `Resource`
> adapts it. **`planLinkRelayTarget`** (via **`stepLinkRelayTargetWithActions`**:
> outbound / received / ignore; plan nested via **`stepLinkRelayTargetPlanWithActions`**:
> outbound|received|ignore), transport-wrap / link-relay / reverse-relay allow +
> table-record gates (via **`stepRelayTransportPacketAllowWithActions`** /
> **`stepRecordLinkRelayTableEntryWithActions`** /
> **`stepRecordReverseTableEntryWithActions`** /
> **`stepLocalPathRequestPacketWithActions`** /
> **`stepRelayLinkPacketAllowWithActions`** /
> **`stepLookupLinkRelayEntryWithActions`** /
> **`stepTransmitLinkRelayWithActions`** /
> **`stepRelayReversePacketAllowWithActions`** /
> **`stepRelayReverseOnInterfaceWithActions`** /
> **`stepReverseEntryExpiredWithActions`** /
> **`stepTransmitReverseRelayWithActions`** /
> **`stepTransmitOnInterfaceWithActions`** /
> **`stepMatchLocalInboundDestinationWithActions`** /
> **`stepMatchLocalTypedDestinationWithActions`** /
> **`stepDispatchLocalLinkRequestWithActions`** /
> **`stepAcceptLinkLrProofCandidateWithActions`** /
> **`stepDispatchResourceProofToLinkWithActions`** /
> **`stepRegisterTransportMemberWithActions`**) live in protocol;
> `TransportNode` adapts them (reverse-table timeout now applied). **`planPathOutbound`**
> (wrap / direct / flood via **`stepPathOutboundWithActions`**; plan nested via
> **`stepPathOutboundPlanWithActions`**: wrap|direct|flood) lives in protocol;
> `LeafTransport` adapts it. **`stepResourceStatus`**
> (queue → advertise → transferring → awaiting-proof / assemble → complete/corrupt/failed +
> gates) and **`isResourceComplete`** (via **`stepResourceCompleteWithActions`**:
> complete|incomplete) live in protocol; `Resource` adapts them. **`planPacketFilter`** (foreign transport-id +
> seen-hash allow rules) lives in protocol; `LeafTransport` adapts it.
> **`isDiscoveryPathRequestExpired`** (via
> **`stepDiscoveryPathRequestExpiredWithActions`**: expired|live) lives in protocol;
> `TransportNode` adapts it (discovery path-request timeout now applied).
> **`isPathEntryExpired`** (via **`stepPathEntryExpiredWithActions`**: expired|live) /
> **`shouldAddPathEntry`** (via **`stepAddPathEntryWithActions`**: add|skip) /
> **`shouldBeginPathDiscovery`** (via **`stepBeginPathDiscoveryWithActions`**:
> begin|skip) / **`planPathEntryLookup`** (via **`stepPathEntryLookupWithActions`**:
> miss / expired / hit; plan nested via **`stepPathEntryLookupPlanWithActions`**:
> miss|expired|hit) / **`canAnswerLocalPathRequest`** (via
> **`stepAnswerLocalPathRequestWithActions`**: answer|skip) /
> **`shouldRememberPathRequestTag`** (via
> **`stepRememberPathRequestTagWithActions`**: remember|skip) /
> **`shouldClearExpiredDiscoveryPathRequest`** (via
> **`stepClearExpiredDiscoveryPathRequestWithActions`**: clear|skip) /
> **`shouldUsePathForOutbound`** (via **`stepUsePathForOutboundWithActions`**:
> use|skip) / **`shouldAnswerPathWithEntry`** (via
> **`stepAnswerPathWithEntryWithActions`**: answer|skip) /
> **`shouldTouchPathEntry`** (via **`stepTouchPathEntryWithActions`**:
> touch|skip) / **`shouldAnswerPathRequest`** (via
> **`stepAnswerPathRequestWithActions`**: answer|skip) /
> **`shouldFulfillDiscoveryPending`** (via
> **`stepFulfillDiscoveryPendingWithActions`**: fulfill|skip) /
> **`shouldAcceptCachedPathResponsePacket`** (via
> **`stepAcceptCachedPathResponsePacketWithActions`**: accept|skip) live in
> protocol; path-table lookups (`hasPath` / `getPathEntry` / outbound /
> path-request) treat expired paths as missing.
> **`receipt/failed`** on `stepPacketReceiptTimeout` lives in protocol; `PacketReceipt.markFailed`
> / `LeafTransport.sendPacket` adapt it. **`Link.updateKeepalive`** applies keepalive via
> **`stepComputeKeepaliveWithActions`** (`use-keepalive`) then syncs watchdog via
> `link/rtt-measured`; keepalive outbound routes through `link/keepalive-sent`.
> **`countChannelTxOutstanding`** (via **`stepCountChannelTxOutstandingWithActions`**:
> use-count) and **`channelAllowsSend`** (via **`stepChannelAllowsSendWithActions`**:
> allow|deny) live in protocol; `Channel.isReadyToSend` adapts them.
> **`shouldExtendPacketReceiptTimeout`** (via
> **`stepExtendPacketReceiptTimeoutWithActions`**: extend|skip) lives in
> protocol; `Channel.updatePacketTimeouts` / TX receipt-timeout refresh adapt
> it. **`shouldResendChannelTimeoutPacket`** (via
> **`stepResendChannelTimeoutPacketWithActions`**: resend|skip) lives in
> protocol; Channel TX-timeout resend adapts it. **`indexOfChannelTxEnvelope`** (via **`stepIndexOfChannelTxEnvelopeWithActions`**:
> use-index|miss) lives in protocol; Channel timeout/delivery TX-ring lookup
> adapts it. **`indexOfMatchingLinkId`** (via
> **`stepIndexOfMatchingLinkIdWithActions`**: use-index|miss) lives in protocol;
> transport link-data / RESOURCE_PRF lookup adapts it.
> **`indexOfPendingLinkAppRequest`** (via
> **`stepIndexOfPendingLinkAppRequestWithActions`**: use-index|miss) lives in
> protocol; Link RESPONSE dispatch adapts it.
> **`stepAppendResourceMapHashCollisionGuardWithActions`** lives in protocol; `Resource.send`
> adapts it. **`stepContainsResourceHashWithActions`** lives in protocol;
> `Resource.accept` and `Link.hasIncomingResource` adapt it.
> **`stepAssembleResourceHashmapBytesWithActions`** / **`stepReadResourceRequestHashWithActions`**
> live in protocol; `Resource.send` / fulfill / `readRequestHash` adapt them.
> **`indexOfChannelRingSequence`** (via **`stepIndexOfChannelRingSequenceWithActions`**:
> use-index|miss) lives in protocol; Channel RX drain adapts it.
> **`applyResourceHashmapSlotWrites`** (via
> **`stepApplyResourceHashmapSlotWritesWithActions`**: use-fields) lives in
> protocol; `Resource.hashmapUpdate` adapts it. **`appendPathRandomBlob`** (via
> **`stepAppendPathRandomBlobWithActions`**: use-fields) and **`computePathExpiry`**
> (via **`stepComputePathExpiryWithActions`**: use-expiry) live in protocol;
> path-table announce update adapts them. **`parseAspectFilter`** lives in protocol; announce-handler
> matching adapts it (SHA stays at the edge). **`shouldReceiveAnnouncePathResponse`** (via
> **`stepReceiveAnnouncePathResponseWithActions`**: receive|skip) lives in
> protocol; announce-handler PATH_RESPONSE opt-in adapts it. **`planAnnounceIngressGates`**
> (rate-limit / record / rebroadcast for PATH_RESPONSE) lives in protocol; `TransportNode`
> adapts it. **`linkPayloadFitsMdu`** lives in protocol; Link request/response and Channel send
> adapt it. **`canLinkRequest`** (via **`stepLinkRequestAllowWithActions`**: allow|deny)
> lives in protocol; `Link.request` adapts it. **`canLinkSend`** (via
> **`stepLinkSendAllowWithActions`**: allow|deny) lives in protocol; `Link.sendContext`
> and Channel outlet usability adapt it.
> **`computeResourceTotalParts`** (via **`stepComputeResourceTotalPartsWithActions`**:
> use-parts) lives in protocol; `Resource.send` adapts it.
> **`linkReadyForNewResource`** (via **`stepLinkReadyForNewResourceWithActions`**:
> ready|busy) lives in protocol; `Link.readyForNewResource` adapts it.
> **`isLinkModeEnabled`** (via **`stepLinkModeEnabledWithActions`**: enabled|disabled) lives in protocol; link validate/signalling adapts it.
> **`isLinkClosed`** (via **`stepLinkClosedWithActions`**: closed|open) lives in
> protocol; `Link.receive` / watchdog early-outs adapt it.
> **`isChannelOutletTransmitOk`** (via **`stepChannelOutletTransmitWithActions`**:
> ok|reject) lives in protocol; `Channel.send` outlet-result gate adapts it.
> **`isValidDestinationRequestPath`** (via
> **`stepDestinationRequestPathValidWithActions`**: valid|invalid) lives in
> protocol; `registerRequestHandler` adapts it.
> **`clampStreamDataChunkLength`** (via **`stepClampStreamDataChunkLengthWithActions`**:
> use-length) lives in protocol; `RawChannelWriter.write` adapts it.
> **`shouldAppendStreamData`** (via **`stepAppendStreamDataWithActions`**:
> append|skip) lives in protocol; `RawChannelReader` append gating adapts it.
> **`clampStreamReadSize`** (via **`stepClampStreamReadSizeWithActions`**: use-size)
> lives in protocol; `RawChannelReader.read` adapts it.
> **`shouldDeferStreamRead`** (via **`stepStreamReadDeferWithActions`**:
> defer|proceed) lives in protocol; `RawChannelReader.read` empty-buffer gate adapts it.
> **`shouldReturnStreamReadResult`** (via **`stepStreamReadReturnWithActions`**:
> yield|skip) lives in protocol; `RawChannelReader.read` result gate adapts it.
> **`clampStreamChunkTake`** (via **`stepClampStreamChunkTakeWithActions`**: use-take)
> lives in protocol; `RawChannelReader.read` per-chunk take adapts it.
> **`isValidInterfaceName`** (via **`stepInterfaceNameValidWithActions`**:
> valid|invalid) lives in protocol; `AbstractPacketInterface` construction adapts it.
> **`packetFitsInterfaceMtu`** (via **`stepInterfaceMtuFitWithActions`**:
> fit|overflow) lives in protocol; `AbstractPacketInterface.send` adapts it.
> **`canInterfaceSend`** (via **`stepInterfaceSendAllowWithActions`**: allow|deny)
> lives in protocol; `AbstractPacketInterface.send` closed/outgoing gates adapt it.
> **`isInterfaceClosed`** (via **`stepInterfaceClosedWithActions`**: closed|open)
> lives in protocol; interface close / receiveBytes early-outs adapt it.
> **`shouldEnqueueRawInterfaceFrame`** (via
> **`stepEnqueueRawInterfaceFrameWithActions`**: enqueue|skip) lives in protocol;
> `RawPacketInterface.decodeIncoming` adapts it.
> **`shouldConsumeStreamChunk`** (via **`stepStreamChunkConsumeWithActions`**:
> consume|residual) lives in protocol; `RawChannelReader.read` chunk-consume branch adapts it.
> **`shouldEnqueueDecodedPacket`** (via
> **`stepEnqueueDecodedPacketWithActions`**: enqueue|skip) lives in protocol;
> `AbstractPacketInterface.receiveBytes` adapts it.
> **`shouldDeliverQueuedPacket`** (via **`stepDeliverQueuedPacketWithActions`**:
> deliver|buffer) lives in protocol; `AsyncPacketQueue.push` adapts it.
> **`shouldYieldBufferedPacket`** (via **`stepYieldBufferedPacketWithActions`**:
> yield|skip) lives in protocol; `AsyncPacketQueue` iterator `next` adapts it.
> **`shouldMarkStreamEof`** (via **`stepStreamEofMarkWithActions`**: mark|skip)
> lives in protocol; `RawChannelReader` message handler adapts it.
> **`canAcceptDestinationLinkRequest`** (via
> **`stepAcceptDestinationLinkRequestWithActions`**: allow|deny) lives in
> protocol; `RegisteredDestination.handleLinkRequest` adapts it.
> **`canAnnounceDestination`** (via **`stepAnnounceDestinationWithActions`**:
> allow|deny) lives in protocol; `RegisteredDestination.announce` adapts it.
> **`canDestinationSend`** (via **`stepDestinationSendWithActions`**: allow|deny)
> lives in protocol; `RegisteredDestination.send` adapts it.
> **`isStreamIdAssigned`** (via **`stepStreamIdAssignedWithActions`**:
> assigned|unassigned) lives in protocol; `StreamDataMessage.pack` adapts it.
> **`shouldHandleStreamDataMessage`** (via
> **`stepStreamDataMessageHandleWithActions`**: handle|ignore) lives in protocol;
> `RawChannelReader` message handler adapts it.
> **`shouldRegisterStreamReadyCallback`** (via
> **`stepStreamReadyCallbackRegisterWithActions`**: register|skip) lives in
> protocol; `Buffer.createReader` adapts it.
> **`planDestinationDecrypt`** (via **`stepDestinationDecryptWithActions`**:
> return-ciphertext / reject / decrypt-with-identity; plan nested via
> **`stepDestinationDecryptPlanWithActions`**:
> return-ciphertext|reject|decrypt-with-identity) lives in protocol;
> `RegisteredDestination.decrypt` adapts it. **`planDestinationEncrypt`** (via
> **`stepDestinationEncryptWithActions`**: use-plaintext / reject /
> encrypt-with-identity; plan nested via
> **`stepDestinationEncryptPlanWithActions`**:
> use-plaintext|reject|encrypt-with-identity) lives in protocol;
> `RegisteredDestination.send` adapts it.
> **`canRequestLinkDestination`** (via
> **`stepRequestLinkDestinationWithActions`**: allow|deny) lives in protocol;
> `Link.request` adapts it.
> **`isValidDestinationIdentityBinding`** (via
> **`stepDestinationIdentityBindingValidWithActions`**: valid|invalid) lives in
> protocol; `Destination` construction adapts it. **`Announce.buildPacket`** reuses **`canAnnounceDestination`**.
> **`planLxMessagePack`** (via **`stepLxMessagePackWithActions`**: proceed /
> reject-bad-destination / reject-bad-source; plan nested via
> **`stepLxMessagePackPlanWithActions`**: ok|bad-destination|bad-source) lives
> in protocol; `LXMessage.pack` adapts it.
> **`shouldIgnoreInitiatorKeepaliveProbe`** (via
> **`stepIgnoreInitiatorKeepaliveProbeWithActions`**: ignore|proceed),
> **`shouldAcceptLinkPacketInterface`** (via
> **`stepAcceptLinkPacketInterfaceWithActions`**: accept|skip), and
> **`shouldEncryptLinkPayload`** (via **`stepEncryptLinkPayloadWithActions`**:
> encrypt|plaintext) live in protocol; `Link.receive` / `sendContext` adapt them.
> **`planChannelMessageTypeRegistration`** (via
> **`stepChannelMessageTypeRegistrationWithActions`**: ok / missing-msgtype /
> system-reserved; plan nested via
> **`stepChannelMessageTypeRegistrationPlanWithActions`**:
> ok|missing-msgtype|system-reserved) lives in protocol; `Channel.registerMessageType` adapts it.
> **`canRelayTransportPacket`** (via **`stepRelayTransportPacketAllowWithActions`**:
> allow|deny), **`shouldRecordLinkRelayTableEntry`** (via
> **`stepRecordLinkRelayTableEntryWithActions`**: record|skip),
> **`shouldRecordReverseTableEntry`** (via
> **`stepRecordReverseTableEntryWithActions`**: record|skip), and
> **`isLocalPathRequestPacket`** (via
> **`stepLocalPathRequestPacketWithActions`**: path-request|other) live in
> protocol; transport relay / `LeafTransport.handleData` adapt them.
> **`isPacketTypeProof`** (via
> **`stepPacketTypeProofWithActions`**: proof|other) lives in
> protocol; `PacketReceipt.validateProofPacket` adapts it. **`planLxmfDeliverableAccept`**
> (via **`stepLxmfDeliverableAcceptWithActions`**: accept / reject-unsigned /
> reject-seen; plan nested via **`stepLxmfDeliverableAcceptPlanWithActions`**:
> accept|reject-unsigned|reject-seen) lives in protocol; `LXMFRouter` unpack
> adapts it. **`canRelayLinkPacket`** (via **`stepRelayLinkPacketAllowWithActions`**:
> allow|deny), **`canLookupLinkRelayEntry`** (via
> **`stepLookupLinkRelayEntryWithActions`**: hit|miss),
> **`shouldTransmitLinkRelay`** (via **`stepTransmitLinkRelayWithActions`**:
> transmit|skip),
> **`canRelayReversePacket`** (via **`stepRelayReversePacketAllowWithActions`**:
> allow|deny), **`shouldRelayReverseOnInterface`** (via
> **`stepRelayReverseOnInterfaceWithActions`**: match|mismatch),
> **`isReverseEntryExpired`** (via **`stepReverseEntryExpiredWithActions`**:
> expired|live), **`shouldTransmitReverseRelay`** (via
> **`stepTransmitReverseRelayWithActions`**: transmit|skip),
> **`planTransportIngressDispatch`** (via
> **`stepTransportIngressDispatchWithActions`**: announce / link-request /
> link-data / plain-data / proof / ignore; plan nested via
> **`stepTransportIngressDispatchPlanWithActions`**: announce|link-request|
> link-data|plain-data|proof|ignore), **`planProofIngressKind`** (via
> **`stepProofIngressWithActions`**: lrproof / resource-prf / receipt; plan nested via
> **`stepProofIngressPlanWithActions`**: lrproof|resource-prf|receipt), and
> **`shouldTransmitOnInterface`** (via **`stepTransmitOnInterfaceWithActions`**:
> transmit|skip) live in protocol; `TransportNode` /
> `LeafTransport` adapt them. **`shouldIgnoreLocalAnnounce`** (via
> **`stepIgnoreLocalAnnounceWithActions`**: ignore|proceed) /
> **`shouldMatchAnnounceAspect`** (via **`stepMatchAnnounceAspectWithActions`**:
> match|mismatch) live in protocol; announce ingress adapts them.
> **`shouldReplyKeepaliveProbe`** (via **`stepReplyKeepaliveProbeWithActions`**:
> reply|skip) and **`isExpectedLinkMode`** (via **`stepExpectedLinkModeWithActions`**:
> match|mismatch) live in protocol; `Link` adapts them. **`canAcceptLxmfPropagationLocalDelivery`** (via
> **`stepAcceptLxmfPropagationLocalDeliveryWithActions`**: accept|skip) /
> **`canUnpackLxmfPropagationLocalIngress`** (via
> **`stepUnpackLxmfPropagationLocalIngressWithActions`**: unpack|skip) and
> **`planLxmfPropagatedSend`** (via **`stepLxmfPropagatedSendWithActions`**: proceed /
> reject-missing-node / reject-missing-packed / reject-resource-unimplemented; plan
> nested via **`stepLxmfPropagatedSendPlanWithActions`**:
> ok|missing-node|missing-packed|resource-unimplemented) live
> in protocol; `LXMFRouter` adapts them.
> **`planPathRequestIngress`** (via **`stepPathRequestIngressWithActions`**:
> ignore-unparsed / ignore-seen-tag / answer-local / answer-path / ignore /
> ignore-in-flight-discovery / start-discovery; plan nested via
> **`stepPathRequestIngressPlanWithActions`**: ignore-unparsed|ignore-seen-tag|
> answer-local|answer-path|ignore|ignore-in-flight-discovery|start-discovery) and
> **`planDiscoveryPathRequestFulfill`**
> (via **`stepDiscoveryPathRequestFulfillWithActions`**: ignore / drop-expired / fulfill;
> plan nested via **`stepDiscoveryPathRequestFulfillPlanWithActions`**:
> ignore|drop-expired|fulfill)
> live in protocol; leaf / transport path-request and discovery announce fulfill adapt them.
> **`planLinkDataContext`** (via **`stepLinkDataContextWithActions`**: rtt /
> keepalive / close / identify / request / response / channel / resource-* /
> plaintext / ignore) lives in protocol; `Link.receive` DATA dispatch adapts it.
> **`planResourceAssembleOutcome`** (via **`stepResourceAssembleWithActions`**:
> complete / corrupt; plan nested via
> **`stepResourceAssembleOutcomePlanWithActions`**: complete|corrupt),
> **`planResourceProofAccept`** (via
> **`stepResourceProofAcceptWithActions`**: complete / ignore; plan nested via
> **`stepResourceProofAcceptPlanWithActions`**: complete|ignore),
> **`canResourceContinueTransfer`** (via **`stepResourceContinueTransferWithActions`**:
> continue|stop), **`isResourceComplete`** (via
> **`stepResourceCompleteWithActions`**: complete|incomplete),
> **`canReceiveResourcePart`** (via
> **`stepResourceReceivePartAllowWithActions`**: allow|deny),
> **`canRequestResourceNext`** (via **`stepResourceRequestNextAllowWithActions`**:
> allow|deny), **`canRunResourceWatchdog`** (via
> **`stepResourceWatchdogAllowWithActions`**: allow|deny), **`canProveResource`**
> (via **`stepProveResourceAllowWithActions`**: allow|deny),
> **`shouldAdvertiseResource`** (via **`stepAdvertiseResourceWithActions`**:
> advertise|skip), **`planResourceAdvertisePhase`** (via
> **`stepResourceAdvertiseWaitWithActions`**: queue / resolve; plan nested via
> **`stepResourceAdvertisePhasePlanWithActions`**: queue|advertise), and
> **`shouldAcceptIncomingResourceAdvertisement`** (via
> **`stepAcceptIncomingResourceAdvertisementWithActions`**: accept|skip) live in
> protocol; `Resource` adapts them.
> **`shouldHandleOutgoingResourceRequest`** (via
> **`stepHandleOutgoingResourceRequestWithActions`**: handle|skip) /
> **`shouldHandleIncomingResourceByHash`** (via
> **`stepHandleIncomingResourceByHashWithActions`**: handle|skip) live in
> protocol; `Link` resource REQ/HMU/cancel/proof dispatch adapts them.
> **`planLxmfSendMethod`** (via **`stepLxmfSendMethodWithActions`**: reject-unpacked /
> send-opportunistic / send-direct / send-propagated / reject-unsupported; plan
> nested via **`stepLxmfSendMethodPlanWithActions`**:
> opportunistic|direct|propagated|reject-unpacked|reject-unsupported) lives in
> protocol; `LXMFRouter.send` adapts it. **`planChannelSend`** (via
> **`stepChannelSendWithActions`**: proceed / link-not-ready / too-big; plan nested via
> **`stepChannelSendPlanWithActions`**: proceed|link-not-ready|too-big) lives in
> protocol; `Channel.send` adapts it.
> **`canPerformLinkHandshake`** (via **`stepPerformLinkHandshakeAllowWithActions`**: allow|deny), **`canProveLink`** (via **`stepProveLinkAllowWithActions`**: allow|deny), **`canAcceptLinkRequestOwner`** (via **`stepAcceptLinkRequestOwnerWithActions`**: accept|reject),
> **`planLinkAppRequest`** (via **`stepLinkAppRequestWithActions`**: send /
> reject; plan nested via **`stepLinkAppRequestPlanWithActions`**: send|reject),
> **`planLinkAppRequestTransmitOutcome`** (via
> **`stepLinkAppRequestTransmitWithActions`**: keep-pending / unregister; plan
> nested via **`stepLinkAppRequestTransmitOutcomePlanWithActions`**:
> keep-pending|unregister),
> **`canSendLinkAppResponse`** (via **`stepSendLinkAppResponseAllowWithActions`**: allow|deny), and **`planLinkTokenAccess`**
> (via **`stepLinkTokenAccessWithActions`**: reject-no-key / create / reuse) live in
> protocol; `Link` adapts them (`tokenInstance` via token-access actions).
> **`shouldAcceptLinkTeardown`** (via
> **`stepAcceptLinkTeardownWithActions`**: accept|skip),
> **`planLinkTeardownReason`** (via **`stepLinkTeardownReasonWithActions`**:
> use-reason), and **`planLinkTeardown`** (via
> **`stepLinkTeardownPlanWithActions`**: close-only|send-teardown-then-close)
> live in protocol; LINKCLOSE handling adapts them (nested under
> **`stepLinkTeardownWithActions`**).
> **`canValidateLinkProof`** (via **`stepValidateLinkProofAllowWithActions`**: allow|deny) also gates destination presence.
> **`planLxmfDirectSend`** (via **`stepLxmfDirectSendWithActions`**: proceed /
> reject-missing-destination / reject-missing-packed; plan nested via
> **`stepLxmfDirectSendPlanWithActions`**: ok|missing-destination|missing-packed), **`planLxMessageInstancePack`**
> (via **`stepLxMessageInstancePackWithActions`**: proceed / reject-already-packed /
> reject-missing-endpoints / reject-missing-timestamp; plan nested via
> **`stepLxMessageInstancePackPlanWithActions`**:
> ok|already-packed|missing-endpoints|missing-timestamp), and
> **`planLxmfSignatureOutcome`** (via **`stepLxmfSignatureWithActions`**: apply with
> signatureValidated / unverifiedReason; plan nested via
> **`stepLxmfSignatureOutcomePlanWithActions`**: outcome) live in protocol; `LXMFRouter` /
> `LXMessage.unpackFromBytes` adapt them.
> **`shouldReuseActiveLink`** (via **`stepReuseActiveLinkWithActions`**: reuse|skip)
> lives in protocol; LXMF direct/propagation link reuse adapts it. **`planAnnounceBuild`** (via **`stepAnnounceBuildWithActions`**: proceed /
> reject-not-announceable-type / reject-not-announceable-direction /
> reject-missing-identity / reject-bad-random-hash / reject-bad-ratchet; plan
> nested via **`stepAnnounceBuildPlanWithActions`**:
> ok|not-announceable-type|not-announceable-direction|missing-identity|
> bad-random-hash|bad-ratchet) and
> **`planDestinationConstruction`** (via **`stepDestinationConstructionWithActions`**:
> ok / bad-direction / bad-type / bad-identity-binding; identity binding nested via
> **`stepDestinationIdentityBindingValidWithActions`**: valid|invalid; plan nested via
> **`stepDestinationConstructionPlanWithActions`**:
> ok|bad-direction|bad-type|bad-identity-binding) lives in protocol; `Announce`
> and `Destination` adapt them. **`planLinkInitiatorMtu`** lives in protocol;
> `Link.request` adapts it. Destination type/direction code predicates
> (`isDestinationTypeCode` / `isDestinationDirectionCode`) are exported for adapters.
> **`planPacketFromFields`** (via **`stepPacketFromFieldsWithActions`**: ok /
> bad-header-type / bad-context-flag / bad-transport-type / bad-destination-type /
> bad-packet-type / bad-destination-hash / header2-missing-transport-id /
> bad-transport-id; plan nested via **`stepPacketFromFieldsPlanWithActions`**:
> ok|bad-*|header2-missing-transport-id) lives in protocol; `Packet.fromFields`
> adapts it.
> **`planChannelEnvelopeUnpack`** (via **`stepChannelEnvelopeUnpackWithActions`**:
> ok / missing-raw / truncate / not-registered; plan nested via
> **`stepChannelEnvelopeUnpackPlanWithActions`**:
> ok|missing-raw|truncated|not-registered) lives in protocol; Channel
> `Envelope.unpack` adapts it. **`planLxmfPropagatedPackPrep`** (via
> **`stepLxmfPropagatedPackPrepWithActions`**: skip / proceed /
> reject-missing-identity / reject-missing-timestamp; plan nested via
> **`stepLxmfPropagatedPackPrepPlanWithActions`**:
> skip|ok|missing-identity|missing-timestamp) lives in protocol;
> `LXMessage` delivery-parameter selection adapts it. **`planLinkValidateRequest`**
> (via **`stepLinkValidateRequestPlanWithActions`**: ok|bad-request|
> owner-missing-identity|mode-disabled, nested under
> **`stepLinkValidateRequestWithActions`**: proceed / reject-bad-request /
> reject-owner-missing-identity / reject-mode-disabled; owner acceptance nested via
> **`stepAcceptLinkRequestOwnerWithActions`**: accept|reject) and
> **`shouldContinueLinkValidateRequest`** (via
> **`stepContinueLinkValidateRequestWithActions`**: continue|skip) and
> **`planLinkIdentifyOutcome`** (via **`stepLinkIdentifyWithActions`**:
> reject / commit; plan nested via
> **`stepLinkIdentifyOutcomePlanWithActions`**: accept|reject) and
> **`canAcceptLinkIdentify`** (via **`stepAcceptLinkIdentifyWithActions`**:
> accept|skip) and **`shouldCommitLinkRemoteIdentity`** (via
> **`stepCommitLinkRemoteIdentityWithActions`**: commit|skip) live in
> protocol; `Link.validateRequest` / `handleIdentifyPacket` adapt them.
> **`planLinkAppRequestDispatch`** / **`planLinkAppRequestResponse`** (via
> **`stepLinkAppRequestDispatchWithActions`**: ignore|forbidden|invoke-handler and
> **`stepLinkAppRequestResponsePlanWithActions`**: ignore|response-too-big|
> send-response, nested under **`stepLinkAppRequestInboundWithActions`**; allow via
> **`stepDestinationRequestAllowWithActions`**: allow|deny; response MDU via
> **`stepSendLinkAppResponseAllowWithActions`**: allow|deny; invoke via
> **`stepInvokeLinkAppRequestHandlerWithActions`**: invoke|skip; send via
> **`stepSendLinkAppRequestResponseWithActions`**: send|skip) and
> **`planLinkProofValidateOutcome`** (via **`stepLinkProofValidateWithActions`**:
> accept / reject; plan nested via
> **`stepLinkProofValidateOutcomePlanWithActions`**: accept|reject) live in
> protocol; `Link` app-request and proof validation
> adapt them.
> **`planLinkResourceAdvertisement`** (via **`stepLinkResourceAdvertisementWithActions`**:
> ignore / ask-app / accept / reject; plan nested via
> **`stepLinkResourceAdvertisementPlanWithActions`**: ignore|ask-app|accept;
> app-result plan nested via
> **`stepLinkResourceAcceptAppResultPlanWithActions`**: accept|reject) lives in protocol;
> `Link` RESOURCE_ADV adapts it. **`planLxmfOpportunisticSend`** (via **`stepLxmfOpportunisticSendWithActions`**: proceed / reject-missing-destination; plan nested via **`stepLxmfOpportunisticSendPlanWithActions`**: ok|missing-destination) lives in protocol;
> `LXMFRouter` adapts it. **`shouldUpdateLinkLastData`** (via
> **`stepUpdateLinkLastDataWithActions`**: update|skip) /
> **`isLinkInboundDataPacket`** (via **`stepLinkInboundDataPacketWithActions`**:
> data|other) live in protocol; `Link.receive` adapts them.
> **`planLxmfReceiptSendOutcome`** (via **`stepLxmfReceiptSendWithActions`**: apply /
> skip; plan nested via **`stepLxmfReceiptSendPlanWithActions`**: apply|skip)
> lives in protocol; opportunistic/propagated receipt → send-state adapts it.
> **`planLxmfPropagationLocalIngress`** (via **`stepLxmfPropagationLocalIngressWithActions`**:
> deliver / reject-*; plan nested via **`stepLxmfPropagationLocalIngressPlanWithActions`**:
> deliver|reject-prefix|reject-destination|reject-decrypt) /
> **`planLxmfPropagationLinkReady`** (via **`stepLxmfPropagationLinkReadyWithActions`**:
> reuse / establish / reject-missing-node / reject-missing-identity; plan nested via
> **`stepLxmfPropagationLinkReadyPlanWithActions`**:
> reuse|establish|missing-node|missing-identity) live in protocol;
> propagation ingress and outbound link readiness adapt them. **`shouldAttemptLinkProofCrypto`** (via **`stepAttemptLinkProofCryptoWithActions`**: attempt|skip) lives in protocol;
> `Link.validateProof` adapts it. **`shouldEmitChannelImmediateDelivery`** lives in
> protocol; Channel send/resend adapts it. **`planLxmfPackTimestamp`** (via
> **`stepLxmfPackTimestampWithActions`**: use-timestamp / use-now / reject; plan
> nested via **`stepLxmfPackTimestampPlanWithActions`**:
> use-timestamp|use-now|reject) /
> **`shouldIncludeLxmfStamp`** (via **`stepIncludeLxmfStampWithActions`**:
> include|skip) live in protocol; `LXMessage.pack` adapts them.
> **`planAnnounceValidateOutcome`** (via **`stepAnnounceValidateWithActions`**:
> accept / accept-signature-only / reject-*; plan nested via
> **`stepAnnounceValidateOutcomePlanWithActions`**:
> accept|accept-signature-only|reject-*) / **`isAnnouncePacketType`** (via
> **`stepAnnouncePacketTypeWithActions`**: announce|other) and
> **`planPacketReceiptProofAccept`** live in protocol; `Announce` and `PacketReceipt`
> adapt them. **Local destination match gates** (`shouldMatchLocalInboundDestination`
> via **`stepMatchLocalInboundDestinationWithActions`**: match|mismatch;
> **`shouldMatchLocalTypedDestination`** via
> **`stepMatchLocalTypedDestinationWithActions`**: match|mismatch;
> **`shouldDispatchLocalLinkRequest`** via
> **`stepDispatchLocalLinkRequestWithActions`**: dispatch|skip),
> **`shouldAcceptLinkLrProofCandidate`** (via
> **`stepAcceptLinkLrProofCandidateWithActions`**: accept|reject),
> **`planLocalPlainDataDelivery`** (via
> **`stepLocalPlainDataDeliveryWithActions`**: dispatch / ignore; plan nested via
> **`stepLocalPlainDataDeliveryPlanWithActions`**: dispatch|ignore), and
> **`planPacketHashRemember`** (via **`stepPacketHashRememberWithActions`**: now /
> after-relay; plan nested via **`stepPacketHashRememberPlanWithActions`**:
> now|after-relay) live in protocol; transport node / LeafTransport adapt them.
> **`indexOfPendingLinkAppRequest`** (via
> **`stepIndexOfPendingLinkAppRequestWithActions`**: use-index|miss),
> **`planLinkRequestResponderMtu`**, and
> **`planChannelEnvelopePack`** (via **`stepChannelEnvelopePackWithActions`**: ok /
> missing-message; plan nested via **`stepChannelEnvelopePackPlanWithActions`**:
> ok|missing-message) live in protocol; `Link` and `Channel` adapt them.
> **`planOutboundReceiptOutcome`** (via **`stepOutboundReceiptWithActions`**:
> none / keep-receipt / fail-and-drop-receipt) /
> **`planPacketReceiptProofIngress`** (via
> **`stepPacketReceiptProofIngressWithActions`**: remove-receipt / continue) live in
> protocol; transport sendPacket / receipt proofs adapt them. **`planLinkRegisterList`**
> (via **`stepLinkRegisterListWithActions`**: pending / active),
> **`indexOfMatchingLinkId`** (via
> **`stepIndexOfMatchingLinkIdWithActions`**: use-index|miss) /
> **`planLinkDataIngressTarget`** (via
> **`stepLinkDataIngressTargetWithActions`**: active / pending / none; plan nested via
> **`stepLinkDataIngressTargetPlanWithActions`**: active|pending|none), and
> **`planReverseRelayOutcome`** (via **`stepReverseRelayOutcomeWithActions`**:
> relay / delete-expired / ignore; plan nested via
> **`stepReverseRelayOutcomePlanWithActions`**: relay|delete-expired|ignore) live in
> protocol; transport link + reverse relay adapt them. **`planLinkRttOutcome`** (via **`stepLinkEstablishWithActions`**
> `establish/rtt`; accept via **`stepAcceptLinkRttWithActions`**: accept|skip;
> outcome plan nested via **`stepLinkRttOutcomePlanWithActions`**:
> ignore|activate|teardown; teardown via
> **`stepTeardownLinkFromRttWithActions`**: teardown|skip), **`shouldDispatchLinkPlaintext`** (via **`stepDispatchLinkPlaintextWithActions`**: dispatch|skip),
> **`canResendLinkPacket`** (via **`stepResendLinkPacketAllowWithActions`**: allow|deny), and **`planLinkAppRequestTransmitOutcome`** (via
> **`stepLinkAppRequestTransmitWithActions`**: keep-pending / unregister) live in
> protocol; `Link` adapts them. **`planResourceHashmapUpdateAccept`** (via
> **`stepResourceHashmapUpdateAcceptWithActions`**) /
> **`shouldAcceptResourceHashmapUpdateFrame`** (via
> **`stepAcceptResourceHashmapUpdateFrameWithActions`**: accept|skip) /
> **`shouldFulfillResourcePartRequest`** (via
> **`stepFulfillResourcePartRequestWithActions`**: fulfill|skip) /
> **`shouldApplyResourceReceivePartSlot`** (via
> **`stepApplyResourceReceivePartSlotWithActions`**: apply|skip) /
> **`shouldSendResourceHashmapUpdate`** (via
> **`stepSendResourceHashmapUpdateWithActions`**: send|skip) /
> **`shouldAdvanceResourceAwaitingProof`** (via
> **`stepAdvanceResourceAwaitingProofWithActions`**: advance|skip) live in
> protocol; `Resource` + `Link` adapt them. **`shouldRegisterLinkMember`** (via
> **`stepRegisterLinkMemberWithActions`**: register|skip),
> **`planLinkActivateMembership`** (via **`stepLinkActivateMembershipWithActions`**:
> remove-pending / append-active), and **`planLinkUnregisterMembership`** (via
> **`stepLinkUnregisterMembershipWithActions`**: remove-pending / remove-active) live in
> protocol; transport link register/activate/unregister adapt them.
> **`shouldRegisterLinkResource`** (via **`stepRegisterLinkResourceWithActions`**: register|skip) /
> **`shouldHandleOutgoingResourceRequest`** (via
> **`stepHandleOutgoingResourceRequestWithActions`**: handle|skip) /
> **`shouldHandleIncomingResourceByHash`** (via
> **`stepHandleIncomingResourceByHashWithActions`**: handle|skip) /
> **`planLinkResourceConclude`** and
> **`shouldRegisterPendingLinkRequest`** (via
> **`stepPendingLinkRequestRegisterWithActions`**: register|skip) /
> **`planUnregisterPendingLinkRequest`** (via
> **`stepPendingLinkRequestUnregisterWithActions`**)
> live in protocol; `Link` resource and pending-request lists adapt them.
> **`shouldRegisterTransportMember`** (via
> **`stepRegisterTransportMemberWithActions`**: register|skip) /
> **`planUnregisterTransportMember`**,
> **`planUnregisterPacketReceipt`**, **`shouldRegisterPacketReceipt`** (via
> **`stepRegisterPacketReceiptWithActions`**: register|skip),
> **`shouldKeepOutboundReceipt`** (via **`stepKeepOutboundReceiptWithActions`**:
> keep|skip — planKeep×sent),
> **`shouldFailAndDropOutboundReceipt`** (via
> **`stepFailAndDropOutboundReceiptWithActions`**: fail-and-drop|skip),
> **`shouldRegisterChannelMessageHandler`** / **`planUnregisterChannelMessageHandler`**,
> **`shouldStopChannelHandlerFanout`**, **`planUnregisterStreamReadyCallback`**,
> **`shouldRegisterDestinationLink`** (via
> **`stepRegisterDestinationLinkWithActions`**: register|skip), **`planPathEntryLookup`** (via
> **`stepPathEntryLookupWithActions`**; plan nested via
> **`stepPathEntryLookupPlanWithActions`**: miss|expired|hit),
> **`planPropagationRestore`**, and **`shouldRememberLxmfMessage`** (via
> **`stepRememberLxmfMessageWithActions`**: remember|skip) live in protocol;
> transport lists, receipt create/drop, Channel handlers, stream ready-callbacks,
> destination link lists, path-table get, propagation restore, and LXMF seen-hash
> remember adapt them. **`planIdentityDecryptOutcome`** (via
> **`stepIdentityDecryptWithActions`**: reject-frame / accept / reject-enforced /
> try-identity / reject; plan nested via
> **`stepIdentityDecryptOutcomePlanWithActions`**:
> reject-frame|accept|reject-enforced|try-identity|reject),
> **`planIdentityRatchetLookup`** (via
> **`stepIdentityRatchetLookupWithActions`**: use-cache / miss-no-store /
> miss-store / reject-unusable / restore; plan nested via
> **`stepIdentityRatchetLookupPlanWithActions`**:
> use-cache|miss-no-store|miss-store|reject-unusable|restore),
> **`planIdentityRecall`** (via
> **`stepIdentityRecallWithActions`**: miss / reject-key / hit; plan nested via
> **`stepIdentityRecallPlanWithActions`**: miss|reject-key|hit),
> **`planIdentityRecallAppData`** (via **`stepIdentityRecallAppDataWithActions`**:
> hit / miss; plan nested via **`stepIdentityRecallAppDataPlanWithActions`**:
> hit|miss), and **`canIdentityHash`** (via
> **`stepIdentityHashAllowWithActions`**: allow|deny) live in protocol; `Identity`
> adapts them. **`canRegisterLxmfDeliveryIdentity`** (via
> **`stepRegisterLxmfDeliveryIdentityWithActions`**: register|skip) /
> **`shouldTeardownLxmfPropagationLink`** (via
> **`stepTeardownLxmfPropagationLinkWithActions`**: teardown|skip) live in
> protocol; LXMF router and propagation client adapt them.
> **`planDestinationIdentityHash`** lives in protocol; destination hash construction
> adapts it.
> **`canIdentityUsePrivateKey`** (via **`stepIdentityUsePrivateKeyWithActions`**:
> allow|deny) / **`canIdentityUsePublicKey`** (via
> **`stepIdentityUsePublicKeyWithActions`**: allow|deny) /
> **`canLoadIdentityKeyMaterial`** (via
> **`stepLoadIdentityKeyMaterialWithActions`**: allow|deny),
> **`shouldAttemptIdentityRatchetDecrypt`** (via
> **`stepAttemptIdentityRatchetDecryptWithActions`**: attempt|skip), and
> **`shouldPersistIdentityRatchet`** (via
> **`stepPersistIdentityRatchetWithActions`**: persist|skip) /
> **`isIdentityRatchetRecordUsable`** (via
> **`stepIdentityRatchetRecordUsableWithActions`**: usable|unusable) /
> **`shouldRestoreIdentityRatchetRecord`** (via
> **`stepCommitRestoredIdentityRatchetWithActions`**: commit|skip) live in
> protocol; Identity adapts them. **`canOperateAttachedDestination`** (via
> **`stepOperateAttachedDestinationWithActions`**: allow|deny) /
> **`canAnnounceWithIdentity`** (via **`stepAnnounceWithIdentityWithActions`**:
> allow|deny) / **`shouldInvokeDestinationProofCallback`** (via
> **`stepDestinationProofCallbackWithActions`**: invoke|skip) and
> **`canEmitDestinationProof`** (via **`stepEmitDestinationProofWithActions`**:
> emit|skip) live in protocol; RegisteredDestination and transport
> sendProof adapt them. **`canExtractLxmfOpportunisticPayload`** (via
> **`stepExtractLxmfOpportunisticPayloadWithActions`**: extract|skip) /
> **`shouldSelectLxmfDeliveryParameters`** (via
> **`stepSelectLxmfDeliveryParametersWithActions`**: select|skip) /
> **`planLxmfPropagationSyncPrep`** (via
> **`stepLxmfPropagationSyncPrepWithActions`**: proceed / reject-missing-node /
> reject-missing-delivery-identity; plan nested via
> **`stepLxmfPropagationSyncPrepPlanWithActions`**:
> ok|missing-node|missing-delivery-identity) live in
> protocol; LXMessage and PropagationClient adapt them (ensurePropagationLink also uses
> **`planLxmfPropagationLinkReady`** via **`stepLxmfPropagationLinkReadyWithActions`**;
> plan nested via **`stepLxmfPropagationLinkReadyPlanWithActions`**). **`canProveResource`**
> (via **`stepProveResourceAllowWithActions`**: allow|deny) /
> **`shouldAdvertiseResource`** (via **`stepAdvertiseResourceWithActions`**:
> advertise|skip), **`canUpdateLinkKeepalive`** (via
> **`stepUpdateLinkKeepaliveAllowWithActions`**: allow|deny) /
> **`shouldCreateLinkChannel`** (via **`stepCreateLinkChannelWithActions`**:
> create|reuse) / **`planLinkTokenAccess`** (via
> **`stepLinkTokenAccessWithActions`**: reject-no-key / create / reuse) live in
> protocol; Resource and Link adapt them. **`shouldInvokeDestinationLinkEstablishedCallback`**
> (via **`stepDestinationLinkEstablishedCallbackWithActions`**: invoke|skip),
> **`canArmChannelPacketReceipt`** (via
> **`stepArmChannelPacketReceiptWithActions`**: arm|skip; nested under
> **`planChannelTxReceiptTimeoutRefresh`** /
> **`stepChannelTxReceiptTimeoutRefreshWithActions`**), **`planPacketReceiptCallback`**,
> **`canDispatchAnnounceHandlers`** (via
> **`stepDispatchAnnounceHandlersWithActions`**: dispatch|skip), **`shouldAttemptIdentityRatchetDecrypt`**,
> **`shouldRegisterStreamReadyCallback`** (via
> **`stepStreamReadyCallbackRegisterWithActions`**: register|skip),
> **`shouldAttachLinkRequestPacketReceipt`** (via
> **`stepAttachLinkRequestPacketReceiptWithActions`**: attach|skip), **`shouldAwaitLxmfDeliveryReceipt`** (via
> **`stepAwaitLxmfDeliveryReceiptWithActions`**: await|skip) /
> **`shouldInvokeLxmfDeliveryCallback`** (via
> **`stepInvokeLxmfDeliveryCallbackWithActions`**: invoke|skip), and extended **`planLxmfPropagatedSend`**
> (`missing-node`, via **`stepLxmfPropagatedSendWithActions`**) live in protocol; destination, Channel, PacketReceipt, transport
> announce, Identity, Buffer, LinkRequestReceipt, and LXMF router adapt them. Link
> resource/response/channel plaintext early-outs reuse **`shouldDispatchLinkPlaintext`** (via **`stepDispatchLinkPlaintextWithActions`**).
> **`shouldAcceptResourceProofPayload`** (via
> **`stepAcceptResourceProofPayloadWithActions`**: accept|skip) /
> **`isValidResourceRandomHashLength`** (via
> **`stepResourceRandomHashLengthValidWithActions`**: valid|invalid),
> **`shouldAcceptResourceHashmapUpdateFrame`** (via
> **`stepAcceptResourceHashmapUpdateFrameWithActions`**: accept|skip) /
> **`shouldFulfillResourcePartRequest`** (via
> **`stepFulfillResourcePartRequestWithActions`**: fulfill|skip),
> **`planChannelTxEnvelopeOp`** (via **`stepChannelTxEnvelopeOpWithActions`**:
> miss|process; nested under **`stepChannelTxTimeoutWithActions`**) /
> **`planChannelPacketTimeout`** (via **`stepChannelPacketTimeoutWithActions`**:
> ignore|give-up|retry; nested under **`stepChannelTxTimeoutWithActions`**) /
> **`shouldApplyChannelPacketReceiptTimeout`** (via
> **`stepApplyChannelPacketReceiptTimeoutWithActions`**: apply|skip) /
> **`shouldReplaceChannelResentPacket`** (via
> **`stepReplaceChannelResentPacketWithActions`**: replace|skip), **`canAnswerLocalPathRequest`** (via
> **`stepAnswerLocalPathRequestWithActions`**: answer|skip) /
> **`shouldBeginPathDiscovery`** (via **`stepBeginPathDiscoveryWithActions`**:
> begin|skip), **`canAcceptLinkOwnerPublicKey`** (via **`stepAcceptLinkOwnerPublicKeyWithActions`**: accept|reject),
> **`canAcceptLinkRequestOwner`** (via **`stepAcceptLinkRequestOwnerWithActions`**: accept|reject),
> **`shouldInvokePacketReceiptTimeoutCallback`**, and
> **`shouldInvokeLinkRequestReceiptAction`** live in protocol; Link, Resource, Channel,
> transport path-request, PacketReceipt, and LinkRequestReceipt adapt them.
> **`planResourceAdvertisementRoleFlags`**, **`isValidTokenIvLength`** (via
> **`stepTokenIvLengthValidWithActions`**: valid|invalid) /
> **`shouldAcceptTokenFrame`** (via **`stepAcceptTokenFrameWithActions`**:
> accept|skip), **`isLinkKeepaliveContext`** (via
> **`stepLinkKeepaliveContextWithActions`**: keepalive|other),
> **`shouldAcceptResourceProofSplit`** (via
> **`stepAcceptResourceProofSplitWithActions`**: accept|skip),
> **`shouldEmplaceChannelEnvelope`** (via
> **`stepEmplaceChannelEnvelopeWithActions`**: emplace|skip),
> **`shouldAcceptChannelSequence`** (via
> **`stepAcceptChannelSequenceWithActions`**: accept|skip) /
> **`shouldDrainChannelRingIndex`** (via
> **`stepDrainChannelRingIndexWithActions`**: drain|skip) /
> **`shouldRegisterChannelMessageHandler`** (via
> **`stepRegisterChannelMessageHandlerWithActions`**: register|skip) /
> **`shouldStopChannelHandlerFanout`** (via
> **`stepStopChannelHandlerFanoutWithActions`**: stop|continue) /
> **`shouldEmitChannelImmediateDelivery`** (via
> **`stepEmitChannelImmediateDeliveryWithActions`**: emit|skip) /
> **`channelMessageStateFromPacketReceipt`** (via
> **`stepChannelMessageStateFromPacketReceiptWithActions`**: use-state) /
> **`shouldClearChannelEnvelopePacket`** (via
> **`stepClearChannelEnvelopePacketWithActions`**: clear|skip) /
> **`canArmChannelPacketReceipt`** (via
> **`stepArmChannelPacketReceiptWithActions`**: arm|skip; nested under
> **`planChannelTxReceiptTimeoutRefresh`**; timeout formula nested via
> **`stepChannelPacketTimeoutSecondsWithActions`**: use-timeout) /
> **`shouldApplyChannelPacketReceiptTimeout`** (via
> **`stepApplyChannelPacketReceiptTimeoutWithActions`**: apply|skip) /
> **`shouldReplaceChannelResentPacket`** (via
> **`stepReplaceChannelResentPacketWithActions`**: replace|skip) /
> **`shouldApplyChannelTxReceiptTimeoutExtension`** (via
> **`stepApplyChannelTxReceiptTimeoutExtensionWithActions`**: apply|skip),
> **`shouldExtendPacketReceiptTimeout`** (via
> **`stepExtendPacketReceiptTimeoutWithActions`**: extend|skip) /
> **`shouldResendChannelTimeoutPacket`** (via
> **`stepResendChannelTimeoutPacketWithActions`**: resend|skip),
> **`shouldApplyResourceFulfillPart`** (via
> **`stepApplyResourceFulfillPartWithActions`**: apply|skip) /
> **`shouldAcceptResourceHashmapUpdateFrame`** (via
> **`stepAcceptResourceHashmapUpdateFrameWithActions`**: accept|skip) /
> **`shouldFulfillResourcePartRequest`** (via
> **`stepFulfillResourcePartRequestWithActions`**: fulfill|skip) /
> **`shouldApplyResourceReceivePartSlot`** (via
> **`stepApplyResourceReceivePartSlotWithActions`**: apply|skip) /
> **`shouldSendResourceHashmapUpdate`** (via
> **`stepSendResourceHashmapUpdateWithActions`**: send|skip) /
> **`shouldAdvanceResourceAwaitingProof`** (via
> **`stepAdvanceResourceAwaitingProofWithActions`**: advance|skip),
> **`shouldClearExpiredDiscoveryPathRequest`** (via
> **`stepClearExpiredDiscoveryPathRequestWithActions`**: clear|skip) /
> **`shouldRememberPathRequestTag`** (via
> **`stepRememberPathRequestTagWithActions`**: remember|skip),
> **`shouldAcceptCachedPathResponsePacket`** (via
> **`stepAcceptCachedPathResponsePacketWithActions`**: accept|skip),
> and **`shouldAcceptPropagationPeerResponse`** (via
> **`stepAcceptPropagationPeerResponseWithActions`**: accept|skip) /
> **`shouldTreatPropagationListAsEmpty`** (via
> **`stepTreatPropagationListAsEmptyWithActions`**: empty|nonempty) /
> **`shouldRequestPropagationHavesAck`** (via
> **`stepRequestPropagationHavesAckWithActions`**: request|skip) live in
> protocol; Resource, Token, Link,
> Channel, transport path helpers, and LXMF propagation adapt them.
> **`shouldUsePathForOutbound`** (via **`stepUsePathForOutboundWithActions`**:
> use|skip) / **`shouldAnswerPathWithEntry`** (via
> **`stepAnswerPathWithEntryWithActions`**: answer|skip) /
> **`shouldFulfillDiscoveryPending`** (via
> **`stepFulfillDiscoveryPendingWithActions`**: fulfill|skip), **`canLookupLinkRelayEntry`**, and
> **`shouldTransmitLinkRelay`** live in protocol; LeafTransport and TransportNode adapt
> them. **`shouldTouchPathEntry`** (via **`stepTouchPathEntryWithActions`**:
> touch|skip) / **`shouldAnswerPathRequest`** (via
> **`stepAnswerPathRequestWithActions`**: answer|skip) /
> **`shouldIgnoreDiscoveryPathFulfill`**,
> **`shouldRememberPacketHashNow`** / **`shouldRememberPacketHashAfterRelay`**,
> **`shouldDeleteExpiredReverseEntry`** / **`shouldTransmitReverseRelay`**,
> **`shouldFailAndDropOutboundReceipt`** / **`shouldKeepOutboundReceipt`** (via
> **`stepKeepOutboundReceiptWithActions`**: keep|skip — planKeep×sent; no ad-hoc
> `planKeep && sent` compound beside the step),
> **`shouldApplyLxmfReceiptSendState`**, and **`shouldHandlePropagationPeerError`** (via
> **`stepHandlePropagationPeerErrorWithActions`**: handle|skip) /
> **`shouldAcceptPropagationDeliveredMessage`** (via
> **`stepAcceptPropagationDeliveredMessageWithActions`**: accept|skip) live in
> protocol; transport path/hash/
> reverse/receipt adapters and LXMF router/propagation adapt them.
> **`shouldApplyResourceReceivePartSlot`** (via
> **`stepApplyResourceReceivePartSlotWithActions`**: apply|skip) /
> **`shouldSendResourceHashmapUpdate`** (via
> **`stepSendResourceHashmapUpdateWithActions`**: send|skip) /
> **`shouldAdvanceResourceAwaitingProof`** (via
> **`stepAdvanceResourceAwaitingProofWithActions`**: advance|skip),
> **`shouldDispatchResourceProofToLink`** (via
> **`stepDispatchResourceProofToLinkWithActions`**: dispatch|skip), and
> **`shouldAttemptAnnounceSignatureValidate`** (via
> **`stepAttemptAnnounceSignatureValidateWithActions`**: attempt|skip) /
> **`shouldCheckAnnounceDestinationHash`** (via
> **`stepCheckAnnounceDestinationHashWithActions`**: check|skip) live in protocol; Resource, Channel,
> TransportNode, and Announce adapt them.
> **`shouldDrainChannelRingIndex`** (via
> **`stepDrainChannelRingIndexWithActions`**: drain|skip) /
> **`shouldClearChannelEnvelopePacket`** (via
> **`stepClearChannelEnvelopePacketWithActions`**: clear|skip) /
> **`shouldUnregisterChannelMessageHandler`**,
> **`shouldEvictPropagationCatalogEntry`** (via
> **`stepEvictPropagationCatalogEntryWithActions`**: evict|skip) /
> **`shouldCommitPropagationStoreEntry`** (via
> **`stepCommitPropagationStoreEntryWithActions`**: commit|skip) /
> **`shouldDeletePropagationCatalogEntry`** (via
> **`stepDeletePropagationCatalogEntryWithActions`**: delete|skip) /
> **`shouldEvictOldestPropagationEntry`** (via
> **`stepEvictOldestPropagationEntryWithActions`**: evict|skip) /
> **`shouldApplyPropagationRestore`** (via
> **`stepApplyPropagationRestoreWithActions`**: apply|skip) /
> **`shouldApplyPropagationStoreCommit`** (via
> **`stepApplyPropagationStoreCommitWithActions`**: apply|skip), and
> **`shouldAcceptPropagationGetRequestData`** (via
> **`stepAcceptPropagationGetRequestDataWithActions`**: accept|skip) live in protocol; Channel and
> PropagationServer / PropagationClient adapt them.
> **`shouldRelayReverseOnInterface`**, **`shouldInvokeLinkAppRequestHandler`** (via
> **`stepInvokeLinkAppRequestHandlerWithActions`**: invoke|skip) /
> **`shouldSendLinkAppRequestResponse`** (via
> **`stepSendLinkAppRequestResponseWithActions`**: send|skip), **`shouldRestoreIdentityRatchetRecord`**
> (via **`stepCommitRestoredIdentityRatchetWithActions`**: commit|skip),
> **`shouldCommitResourceAssemblePayload`** (via
> **`stepCommitResourceAssemblePayloadWithActions`**: commit|skip), and
> **`shouldRejectLxmfPackEndpoints`** /
> **`shouldRejectLxmfPackTimestamp`** live in protocol; LeafTransport reverse relay,
> Link, Identity, Resource, and LXMessage adapt them.
> **`shouldContinueLinkValidateRequest`** (via
> **`stepContinueLinkValidateRequestWithActions`**: continue|skip) /
> **`shouldTeardownLinkFromRtt`** (via
> **`stepTeardownLinkFromRttWithActions`**: teardown|skip) /
> **`shouldRemovePendingLinkMembership`** / **`shouldAppendActiveLinkMembership`** /
> **`shouldRemoveActiveLinkMembership`**, **`shouldUnregisterPendingLinkRequest`** /
> **`shouldRemoveLinkResourceListIndex`**, **`shouldAcceptPacketReceiptProof`** (via
> **`stepAcceptPacketReceiptProofWithActions`**: accept|skip) /
> **`shouldUnregisterPacketReceipt`**, **`shouldAcceptLxmfWireFrame`** (via
> **`stepAcceptLxmfWireFrameWithActions`**: accept|skip) /
> **`shouldCommitRememberedLxmfHash`** (via
> **`stepCommitRememberedLxmfHashWithActions`**: commit|skip) /
> **`shouldDeliverLxmfPropagationLocalIngress`**,
> **`shouldEvictOldestPropagationEntry`**, **`shouldUnregisterStreamReadyCallback`**,
> **`shouldDispatchLocalPlainDataDelivery`** (via
> **`stepDispatchLocalPlainDataDeliveryWithActions`**: dispatch|skip), and
> **`shouldUnregisterTransportMember`**
> live in protocol; Link, TransportNode, PacketReceipt, LXMF, PropagationServer, Buffer,
> and LeafTransport adapt them. **`stepResourceAdvertiseWait`** (queue until link ready
> for a new resource; timer intents + queue actions) lives in protocol; `Resource.advertise`
> adapts it. **`stepPathAwait`** (poll until path present or deadline; timer intents)
> lives in protocol; `TransportNode.awaitPath` adapts it. **`stepLinkAwait`** (outbound
> link establish-or-timeout; timer set/cancel intents) lives in protocol; LXMF router
> direct/propagation link waits and `PropagationClient` adapt it.
> **`stepPathResponseGrace`** (PATH_REQUEST_GRACE_MS delay then `transmit` + `resolve`
> actions) lives in protocol; `TransportNode.sendPathResponse` adapts it (no ad-hoc
> `shouldTransmitPathResponse` read beside the machine).
> **`stepInterfaceConnectWithActions`** (arm → `connect`; open/fail/timeout →
> `resolve` / `reject`) lives in protocol; TCP and WebSocket clients adapt it (share
> `INTERFACE_CONNECT_TIMEOUT_MS`; TCP factory uses `connectTimeoutMs: 0` so only the
> step machine arms a timer).
> **`stepPacketReceiptTimeout`** emits `timer/set` / `timer/cancel` for
> `receipt-timeout` and concludes via `timeout` / `delivered` / `failed`
> actions (`stepPacketReceiptTimeoutWithActions`); `PacketReceipt` schedules
> from injected `clock` and invokes callbacks only from those actions (Channel /
> LinkRequestReceipt callbacks fire on timer expiry).
> **`stepChannelTxTimeoutWithActions`** composes envelope miss / ignore /
> give-up / retry with window shrink (envelope-op nested via
> **`stepChannelTxEnvelopeOpWithActions`**: miss|process; packet-timeout plan
> nested via **`stepChannelPacketTimeoutWithActions`**: ignore|give-up|retry);
> `Channel.packetTimeout` applies only `give-up` / `retry` actions (no ad-hoc
> `plan.kind` / `planChannelTxEnvelopeOp` / `planChannelPacketTimeout` reads).
> Receipt timeout
> refresh uses **`planChannelTxReceiptTimeoutRefresh`** (arm nested via
> **`stepArmChannelPacketReceiptWithActions`**: arm|skip; timeout formula nested
> via **`stepChannelPacketTimeoutSecondsWithActions`**: use-timeout; extend
> nested via **`stepExtendPacketReceiptTimeoutWithActions`**: extend|skip).
> **`stepLinkEstablishWithActions`** emits `enter-handshake` / `activated`
> (with initiator `sendRtt` + `activateMembership` flags) / `failed` / LRRTT
> `ignore` / `accept-rtt` / `teardown` (accept-RTT nested via
> **`stepAcceptLinkRttWithActions`**: accept|skip; outcome plan nested via
> **`stepLinkRttOutcomePlanWithActions`**: ignore|activate|teardown;
> teardown-from-RTT nested via **`stepTeardownLinkFromRttWithActions`**:
> teardown|skip); `Link` handshake, validateProof, and
> handleRtt apply status and edge IO only from those actions (no ad-hoc
> `planLinkRttOutcome` / `outcome ===` / `canAcceptLinkRtt` /
> `shouldTeardownLinkFromRtt` reads beside the step).
> **`stepLinkTeardownWithActions`** emits `close-only` /
> `send-teardown-then-close` (with reason) / `accept-remote-close`; remote
> accept nested via **`stepAcceptLinkTeardownWithActions`** (`accept`|`skip`);
> reason nested via **`stepLinkTeardownReasonWithActions`** (`use-reason`);
> plan nested via **`stepLinkTeardownPlanWithActions`**
> (`close-only`|`send-teardown-then-close`);
> `Link` teardown and LINKCLOSE handling apply send/reason/close only from those
> actions (no ad-hoc `plan.kind` / `planLinkTeardown` /
> `shouldAcceptLinkTeardown` / `planLinkTeardownReason` reads beside the step).
> **`stepLinkResourceAdvertisementWithActions`** emits `ignore` / `ask-app` /
> `accept` / `reject` (advertisement plan nested via
> **`stepLinkResourceAdvertisementPlanWithActions`**: ignore|ask-app|accept;
> app-result plan nested via
> **`stepLinkResourceAcceptAppResultPlanWithActions`**: accept|reject);
> `Link` RESOURCE_ADV handling applies unpack/app-callback /
> accept/reject only from those actions (no ad-hoc `planLinkResourceAdvertisement` /
> `planLinkResourceAcceptAppResult` / `plan.kind` / `outcome ===` reads beside the
> step).
> **`stepLinkAppRequestInboundWithActions`** emits `ignore` / `forbidden` /
> `invoke-handler` / `send-response` / `ignore-response` / `response-too-big`
> (dispatch nested via **`stepLinkAppRequestDispatchWithActions`**:
> ignore|forbidden|invoke-handler; response plan nested via
> **`stepLinkAppRequestResponsePlanWithActions`**: ignore|response-too-big|
> send-response; response MDU fit nested via
> **`stepSendLinkAppResponseAllowWithActions`**: allow|deny);
> **`stepInvokeLinkAppRequestHandlerWithActions`** emits `invoke` / `skip`;
> **`stepSendLinkAppRequestResponseWithActions`** emits `send` / `skip`;
> `Link.handleRequestPacket` applies responseGenerator / send only from those
> actions (no ad-hoc dispatch/`plan.kind` / `planLinkAppRequestDispatch` /
> `planLinkAppRequestResponse` / `canSendLinkAppResponse` /
> `shouldInvokeLinkAppRequestHandler` /
> `shouldSendLinkAppRequestResponse` reads beside the step).
> **`stepLinkIdentifyWithActions`** emits `reject` / `commit` (plan nested via
> **`stepLinkIdentifyOutcomePlanWithActions`**: accept|reject);
> **`stepAcceptLinkIdentifyWithActions`** emits `accept`|`skip`;
> **`stepCommitLinkRemoteIdentityWithActions`** emits `commit`|`skip`; `Link`
> LINKIDENTIFY handling applies decrypt-accept / remoteIdentity + callback only from those
> actions (no ad-hoc `canAcceptLinkIdentify` / `planLinkIdentifyOutcome` /
> `outcome ===` / `shouldCommitLinkRemoteIdentity` reads beside the step).
> **`stepLinkValidateRequestWithActions`** emits `proceed` /
> `reject-bad-request` / `reject-owner-missing-identity` /
> `reject-mode-disabled` (owner acceptance nested via
> **`stepAcceptLinkRequestOwnerWithActions`**: accept|reject; plan nested via
> **`stepLinkValidateRequestPlanWithActions`**: ok|bad-request|
> owner-missing-identity|mode-disabled);
> **`stepContinueLinkValidateRequestWithActions`**
> emits `continue`|`skip`; `Link.validateRequest` applies continue/mode
> gates only from those actions (no ad-hoc `planLinkValidateRequest` /
> `plan.kind` / `canAcceptLinkRequestOwner` /
> `shouldContinueLinkValidateRequest` reads beside the step).
> **`stepLinkProofValidateWithActions`** emits `accept` / `reject` (plan nested
> via **`stepLinkProofValidateOutcomePlanWithActions`**: accept|reject);
> `Link.validateProof` applies activation gate only from those actions
> (no ad-hoc `planLinkProofValidateOutcome` / `outcome ===` reads beside the
> step).
> **`stepPropagationStoreWithActions`** emits `reject` / `duplicate` /
> `accept` (with evict keys; plan nested via
> **`stepPropagationStorePlanWithActions`**:
> reject-too-large|duplicate|reject-capacity|accept);
> **`stepCommitPropagationStoreEntryWithActions`**
> emits `commit` / `skip`; **`stepApplyPropagationStoreCommitWithActions`**
> emits `apply` / `skip`; `PropagationServer.storePropagationData` applies
> eviction + commit only from those actions (no ad-hoc `planPropagationStore` /
> `plan.kind` / `shouldCommitPropagationStoreEntry` /
> `shouldApplyPropagationStoreCommit` reads beside the step).
> **`stepApplyPropagationRestoreWithActions`** emits `apply` / `skip`;
> `PropagationServer` restore applies catalog insert only from those actions
> (no ad-hoc `shouldApplyPropagationRestore` / accept+hash reads beside the
> step).
> **`stepPropagationGetWithActions`** emits `list-ids` / `apply` (delete +
> fetch ids); plan nested via **`stepPropagationGetPlanWithActions`**
> (`list-ids`|`apply`); `PropagationServer` and `PropagationNodeStore` /get
> handlers pack responses only from those actions (no ad-hoc
> `planPropagationGet` / `plan.kind` reads beside the step).
> **`stepLxmfDeliveryWithActions`** emits `deliver` / `reject-opportunistic-
> too-large` / `reject-unsupported-method`; plan nested via
> **`stepLxmfDeliveryPlanWithActions`**
> (`deliver`|`reject-opportunistic-too-large`|`reject-unsupported-method`);
> `LXMessage.selectDeliveryParameters` applies method/representation or throws
> only from those actions (no ad-hoc `planLxmfDelivery` / `plan.kind` reads
> beside the step).
> **`stepLxmfSendMethodWithActions`** emits `reject-unpacked` /
> `send-opportunistic` / `send-direct` / `send-propagated` /
> `reject-unsupported`; plan nested via
> **`stepLxmfSendMethodPlanWithActions`**
> (`opportunistic`|`direct`|`propagated`|`reject-unpacked`|`reject-unsupported`);
> `LXMFRouter.send` applies enqueue + method dispatch or throws only from those
> actions (no ad-hoc `planLxmfSendMethod` / `plan ===` reads beside the step).
> **`stepLxmfOpportunisticSendWithActions`** emits `proceed` /
> `reject-missing-destination`; plan nested via
> **`stepLxmfOpportunisticSendPlanWithActions`** (`ok`|`missing-destination`);
> **`stepLxmfDirectSendWithActions`** emits
> `proceed` / `reject-missing-destination` / `reject-missing-packed`; plan nested
> via **`stepLxmfDirectSendPlanWithActions`**
> (`ok`|`missing-destination`|`missing-packed`);
> **`stepLxmfPropagatedSendWithActions`** emits `proceed` /
> `reject-missing-node` / `reject-missing-packed` /
> `reject-resource-unimplemented`; plan nested via
> **`stepLxmfPropagatedSendPlanWithActions`**
> (`ok`|`missing-node`|`missing-packed`|`resource-unimplemented`); `LXMFRouter`
> per-method send applies proceed or throws only from those actions (no ad-hoc
> `planLxmfOpportunisticSend` / `planLxmfDirectSend` /
> `planLxmfPropagatedSend` / `plan ===` reads beside the step).
> **`stepLxmfPropagationLinkReadyWithActions`** emits `reuse` / `establish` /
> `reject-missing-node` / `reject-missing-identity` (plan nested via
> **`stepLxmfPropagationLinkReadyPlanWithActions`**:
> `reuse`|`establish`|`missing-node`|`missing-identity`);
> **`stepLxmfPropagationSyncPrepWithActions`** emits `proceed` /
> `reject-missing-node` / `reject-missing-delivery-identity` (plan nested via
> **`stepLxmfPropagationSyncPrepPlanWithActions`**:
> `ok`|`missing-node`|`missing-delivery-identity`); `LXMFRouter` /
> `PropagationClient` apply reuse/establish/proceed or throw only from those
> actions (no ad-hoc `planLxmfPropagationLinkReady` /
> `planLxmfPropagationSyncPrep` / `plan ===` reads beside the step).
> **`stepLxmfDeliverableAcceptWithActions`** emits `accept` / `reject-unsigned` /
> `reject-seen` (plan nested via **`stepLxmfDeliverableAcceptPlanWithActions`**:
> `accept`|`reject-unsigned`|`reject-seen`); `LXMFRouter.unpackDeliverable` accepts
> or drops only from those actions (no ad-hoc `planLxmfDeliverableAccept` /
> `plan ===` reads beside the step).
> **`stepLxmfPropagationLocalIngressWithActions`** emits `deliver` /
> `reject-prefix` / `reject-destination` / `reject-decrypt` (plan nested via
> **`stepLxmfPropagationLocalIngressPlanWithActions`**:
> `deliver`|`reject-prefix`|`reject-destination`|`reject-decrypt`);
> `LXMFRouter.handlePropagationData` unpacks only from those actions (no ad-hoc
> `planLxmfPropagationLocalIngress` / `plan ===` reads beside the step).
> **`stepLxmfReceiptSendWithActions`** emits `apply` (with send-state event) /
> `skip` (plan nested via **`stepLxmfReceiptSendPlanWithActions`**:
> `apply`|`skip`); opportunistic/propagated send paths update send-state only from those
> actions (no ad-hoc `planLxmfReceiptSendOutcome` / `plan ===` reads beside the step).
> **`stepLxMessagePackWithActions`** emits `proceed` / `reject-bad-destination` /
> `reject-bad-source` (plan nested via **`stepLxMessagePackPlanWithActions`**:
> `ok`|`bad-destination`|`bad-source`); **`stepLxmfPackTimestampWithActions`** emits
> `use-timestamp` / `use-now` / `reject` (plan nested via
> **`stepLxmfPackTimestampPlanWithActions`**: `use-timestamp`|`use-now`|`reject`);
> **`stepLxMessageInstancePackWithActions`** emits `proceed` /
> `reject-already-packed` / `reject-missing-endpoints` /
> `reject-missing-timestamp` (plan nested via
> **`stepLxMessageInstancePackPlanWithActions`**:
> `ok`|`already-packed`|`missing-endpoints`|`missing-timestamp`);
> **`stepLxmfPropagatedPackPrepWithActions`** emits `skip` / `proceed` /
> `reject-missing-identity` / `reject-missing-timestamp` (plan nested via
> **`stepLxmfPropagatedPackPrepPlanWithActions`**:
> `skip`|`ok`|`missing-identity`|`missing-timestamp`);
> `LXMessage` pack / timestamp / instance-pack / propagated-pack-prep apply
> proceed/encrypt or throw only from those actions (no ad-hoc
> `planLxMessagePack` / `planLxmfPackTimestamp` / `planLxMessageInstancePack` /
> `planLxmfPropagatedPackPrep` / `plan ===` reads beside the step).
> **`stepLxmfSignatureWithActions`** emits `apply` (with signatureValidated /
> unverifiedReason; plan nested via **`stepLxmfSignatureOutcomePlanWithActions`**:
> `outcome`); `LXMessage.unpackFromBytes` applies signature status only
> from those actions (no ad-hoc `planLxmfSignatureOutcome` / `outcome ===` reads
> beside the step).
> **`stepLinkTokenAccessWithActions`** emits `reject-no-key` / `create` /
> `reuse` (plan nested via **`stepLinkTokenAccessPlanWithActions`**:
> reject-no-key|create|reuse); `Link.tokenInstance` constructs or reuses Token
> only from those actions (no ad-hoc `planLinkTokenAccess` / `plan ===` reads
> beside the step).
> **`stepAnnounceValidateWithActions`** emits `accept` / `accept-signature-only` /
> `reject-*` (plan nested via **`stepAnnounceValidateOutcomePlanWithActions`**:
> `accept`|`accept-signature-only`|`reject-*`); `Announce.validate` returns true only from those actions (no
> ad-hoc `planAnnounceValidateOutcome` / `plan ===` reads beside the step).
> **`stepAnnounceBuildWithActions`** emits `proceed` / `reject-*` (plan nested via
> **`stepAnnounceBuildPlanWithActions`**:
> `ok`|`not-announceable-type`|`not-announceable-direction`|`missing-identity`|
> `bad-random-hash`|`bad-ratchet`);
> `Announce.buildPacket` throws or continues only from those actions (no
> ad-hoc `planAnnounceBuild` / `plan ===` reads beside the step).
> **`stepIdentityDecryptWithActions`** emits `reject-frame` / `accept` /
> `reject-enforced` / `try-identity` / `reject` (plan nested via
> **`stepIdentityDecryptOutcomePlanWithActions`**:
> `reject-frame`|`accept`|`reject-enforced`|`try-identity`|`reject`);
> `Identity.decrypt` applies ratchet/fallback outcomes only from those actions (no
> ad-hoc `planIdentityDecryptOutcome` / `plan ===` reads beside the step).
> **`stepIdentityRatchetLookupWithActions`** emits `use-cache` /
> `miss-no-store` / `miss-store` / `reject-unusable` / `restore` (plan nested via
> **`stepIdentityRatchetLookupPlanWithActions`**:
> `use-cache`|`miss-no-store`|`miss-store`|`reject-unusable`|`restore`);
> `Identity.getRatchet` applies cache/store outcomes only from those actions
> (no ad-hoc `planIdentityRatchetLookup` / `plan ===` reads beside the step).
> **`stepIdentityRatchetRecordUsableWithActions`** emits `usable`|`unusable`;
> `Identity.getRatchet` usability for stored records applies only from those
> actions (no ad-hoc `isIdentityRatchetRecordUsable` reads beside the step).
> **`stepCommitRestoredIdentityRatchetWithActions`** emits `commit`|`skip`;
> `Identity.getRatchet` restore-to-cache applies only from those actions (no
> ad-hoc `shouldRestoreIdentityRatchetRecord` reads beside the step).
> **`stepIdentityRecallWithActions`** emits `miss` / `reject-key` / `hit` (plan
> nested via **`stepIdentityRecallPlanWithActions`**:
> `miss`|`reject-key`|`hit`);
> **`stepIdentityRecallAppDataWithActions`** emits `hit` / `miss` (plan nested
> via **`stepIdentityRecallAppDataPlanWithActions`**: `hit`|`miss`);
> `Identity.recall` / `recallAppData` return results only from those actions
> (no ad-hoc `planIdentityRecall` / `planIdentityRecallAppData` / `plan ===`
> reads beside the step).
> **`stepDestinationConstructionWithActions`** emits `ok` / `bad-direction` /
> `bad-type` / `bad-identity-binding` (plan nested via
> **`stepDestinationConstructionPlanWithActions`**:
> `ok`|`bad-direction`|`bad-type`|`bad-identity-binding`); identity binding nested via
> **`stepDestinationIdentityBindingValidWithActions`** (`valid`|`invalid`);
> `Destination` construction throws or
> continues only from those actions (no ad-hoc `planDestinationConstruction` /
> `plan ===` reads beside the step). **`stepDestinationDecryptWithActions`**
> emits `return-ciphertext` / `reject` / `decrypt-with-identity` (plan nested via
> **`stepDestinationDecryptPlanWithActions`**:
> `return-ciphertext`|`reject`|`decrypt-with-identity`);
> **`stepDestinationEncryptWithActions`** emits `use-plaintext` / `reject` /
> `encrypt-with-identity` (plan nested via
> **`stepDestinationEncryptPlanWithActions`**:
> `use-plaintext`|`reject`|`encrypt-with-identity`); `RegisteredDestination`
> decrypt/send apply only from those actions (no ad-hoc `planDestinationDecrypt` /
> `planDestinationEncrypt` / `plan ===` reads beside the step).
> **`stepPacketFromFieldsWithActions`** emits `ok` /
> `bad-*` / `header2-missing-transport-id` (plan nested via
> **`stepPacketFromFieldsPlanWithActions`**:
> `ok`|`bad-*`|`header2-missing-transport-id`); `Packet.fromFields` throws or
> continues only from those actions (no ad-hoc `isValidDestinationIdentityBinding` /
> `planPacketFromFields` / `plan ===` reads beside the step).
> **`stepChannelMessageTypeRegistrationWithActions`** emits `ok` /
> `missing-msgtype` / `system-reserved` (plan nested via
> **`stepChannelMessageTypeRegistrationPlanWithActions`**:
> `ok`|`missing-msgtype`|`system-reserved`); **`stepChannelEnvelopeUnpackWithActions`**
> emits `ok` / `missing-raw` / `truncate` / `not-registered` (plan nested via
> **`stepChannelEnvelopeUnpackPlanWithActions`**:
> `ok`|`missing-raw`|`truncated`|`not-registered`);
> **`stepChannelEnvelopePackWithActions`** emits `ok` / `missing-message` (plan nested via
> **`stepChannelEnvelopePackPlanWithActions`**: `ok`|`missing-message`);
> **`stepChannelSendWithActions`** emits `proceed` / `link-not-ready` /
> `too-big` (plan nested via **`stepChannelSendPlanWithActions`**:
> `proceed`|`link-not-ready`|`too-big`); `Channel` register/pack/unpack/send apply only
> from those actions (no ad-hoc `planChannelMessageTypeRegistration` /
> `planChannelEnvelopeUnpack` / `planChannelEnvelopePack` / `planChannelSend` /
> `plan ===` reads beside the step).
> **`stepResourceAssembleWithActions`** emits `complete` / `corrupt` (plan nested via
> **`stepResourceAssembleOutcomePlanWithActions`**: `complete`|`corrupt`);
> **`stepCommitResourceAssemblePayloadWithActions`** emits `commit`|`skip`;
> **`stepResourceCompleteWithActions`** emits `complete`|`incomplete`;
> `Resource.isComplete` applies only from those actions (no ad-hoc
> `isResourceComplete` reads beside the step).
> **`stepResourceProofAcceptWithActions`** emits `complete` / `ignore` (plan nested via
> **`stepResourceProofAcceptPlanWithActions`**: `complete`|`ignore`);
> **`stepResourceAdvertiseWaitWithActions`** emits `probe` / `queue` / `resolve`
> (plan nested via **`stepResourceAdvertisePhasePlanWithActions`**:
> `queue`|`advertise`);
> **`stepResourceContinueTransferWithActions`** emits `continue`|`stop`;
> **`stepResourceReceivePartAllowWithActions`** /
> **`stepResourceRequestNextAllowWithActions`** /
> **`stepResourceWatchdogAllowWithActions`** /
> **`stepProveResourceAllowWithActions`** emit `allow`|`deny`;
> **`stepAdvertiseResourceWithActions`** emits `advertise`|`skip`;
> **`stepAcceptIncomingResourceAdvertisementWithActions`** emits
> `accept`|`skip`; `Resource` assemble/validateProof/transfer/advertise-wait gates
> apply only from those actions (no ad-hoc
> `planResourceAssembleOutcome` /
> `shouldCommitResourceAssemblePayload` / `planResourceProofAccept` /
> `planResourceAdvertisePhase` /
> `plan ===` /
> `canResourceContinueTransfer` /
> `canReceiveResourcePart` / `canRequestResourceNext` /
> `canRunResourceWatchdog` / `canProveResource` / `shouldAdvertiseResource` /
> `shouldAcceptIncomingResourceAdvertisement` reads beside the step).
> **`stepResourceRequestFulfillWithActions`** emits `fulfill` (part send/resend +
> optional HMU + counters/status); **`stepResourceReceivePartWithActions`** emits
> `receive` (slot/counters + assemble/request-next); **`stepResourcePartRequestWithActions`**
> emits `request`; **`stepResourceHashmapUpdateAcceptWithActions`** emits
> `apply` / `ignore`; **`stepAcceptResourceHashmapUpdateFrameWithActions`** emits
> `accept`|`skip`; **`stepFulfillResourcePartRequestWithActions`** emits
> `fulfill`|`skip`; **`stepApplyResourceReceivePartSlotWithActions`** emits
> `apply`|`skip`; **`stepSendResourceHashmapUpdateWithActions`** emits
> `send`|`skip`; **`stepAdvanceResourceAwaitingProofWithActions`** emits
> `advance`|`skip`; `Resource` + `Link` REQ/HMU/receive/request-next apply only
> from those actions (no ad-hoc `planResourceRequestFulfill` /
> `planResourceReceivePart` / `planResourcePartRequest` /
> `planResourceHashmapUpdateAccept` / `shouldAcceptResourceHashmapUpdateFrame` /
> `shouldFulfillResourcePartRequest` / `shouldApplyResourceReceivePartSlot` /
> `shouldSendResourceHashmapUpdate` / `shouldAdvanceResourceAwaitingProof`
> reads beside the step).
> **`stepPathRequestIngressWithActions`** emits `ignore-unparsed` /
> `ignore-seen-tag` / `answer-local` / `answer-path` / `ignore` /
> `ignore-in-flight-discovery` / `start-discovery` (plan nested via
> **`stepPathRequestIngressPlanWithActions`**: ignore-unparsed|ignore-seen-tag|
> answer-local|answer-path|ignore|ignore-in-flight-discovery|start-discovery);
> **`stepDiscoveryPathRequestFulfillWithActions`** emits `ignore` /
> `drop-expired` / `fulfill` (plan nested via
> **`stepDiscoveryPathRequestFulfillPlanWithActions`**:
> ignore|drop-expired|fulfill); **`stepPathOutboundWithActions`** emits
> `wrap` / `direct` / `flood` (plan nested via
> **`stepPathOutboundPlanWithActions`**: wrap|direct|flood);
> **`stepPathEntryLookupWithActions`** emits
> `miss` / `expired` / `hit` (plan nested via
> **`stepPathEntryLookupPlanWithActions`**: miss|expired|hit);
> **`stepEmitPathRequestWithActions`** emits
> `emit` / `skip`; **`stepDiscoveryPathRequestExpiredWithActions`** /
> **`stepPathEntryExpiredWithActions`** emit `expired` / `live`;
> **`stepBeginPathDiscoveryWithActions`** emits `begin` / `skip`;
> **`stepAddPathEntryWithActions`** emits `add` / `skip`; `LeafTransport` /
> `TransportNode` path-request, discovery fulfill, outbound, path-table get /
> emit / add, and discovery/path expiry apply only from those actions (no
> ad-hoc `planPathRequestIngress` / `planDiscoveryPathRequestFulfill` /
> `planPathOutbound` / `planPathEntryLookup` / `shouldEmitPathRequest` /
> `isDiscoveryPathRequestExpired` / `isPathEntryExpired` /
> `shouldBeginPathDiscovery` / `shouldAddPathEntry` reads beside the step).
> **`stepTransportIngressDispatchWithActions`** emits `announce` /
> `link-request` / `link-data` / `plain-data` / `proof` / `ignore` (plan nested
> via **`stepTransportIngressDispatchPlanWithActions`**: announce|link-request|
> link-data|plain-data|proof|ignore);
> **`stepLinkDataIngressTargetWithActions`** emits `active` / `pending` /
> `none` (plan nested via **`stepLinkDataIngressTargetPlanWithActions`**:
> active|pending|none); **`stepLinkRelayTargetWithActions`** emits `outbound` /
> `received` / `ignore` (plan nested via **`stepLinkRelayTargetPlanWithActions`**:
> outbound|received|ignore); **`stepReverseRelayOutcomeWithActions`** emits `relay` /
> `delete-expired` / `ignore` (plan nested via **`stepReverseRelayOutcomePlanWithActions`**:
> relay|delete-expired|ignore); **`stepPacketHashRememberWithActions`** emits
> `now` / `after-relay` (plan nested via **`stepPacketHashRememberPlanWithActions`**:
> now|after-relay); **`stepLocalPlainDataDeliveryWithActions`** emits
> `dispatch` / `ignore` (plan nested via **`stepLocalPlainDataDeliveryPlanWithActions`**:
> dispatch|ignore); **`stepDispatchLocalPlainDataDeliveryWithActions`**
> emits `dispatch`|`skip`; **`stepProofIngressWithActions`** emits
> `lrproof` / `resource-prf` / `receipt` (plan nested via
> **`stepProofIngressPlanWithActions`**: lrproof|resource-prf|receipt); `LeafTransport` /
> `TransportNode` ingress dispatch, link relay target, link-data target, reverse relay,
> hash remember, local plain DATA, and proof ingress apply only from those actions (no
> ad-hoc `planTransportIngressDispatch` / `planLinkDataIngressTarget` /
> `planLinkRelayTarget` / `planReverseRelayOutcome` / `planPacketHashRemember` /
> `planLocalPlainDataDelivery` / `shouldDispatchLocalPlainDataDelivery` /
> `planProofIngressKind` reads beside the
> step).
> **`stepOutboundReceiptWithActions`** emits `none` / `keep-receipt` /
> `fail-and-drop-receipt`; **`stepPacketReceiptProofIngressWithActions`**
> emits `remove-receipt` / `continue`; `LeafTransport.sendPacket` /
> `handleProof` apply only from those actions (no ad-hoc
> `planOutboundReceiptOutcome` / `planPacketReceiptProofIngress` reads
> beside the step).
> **`stepLinkDataContextWithActions`** emits `rtt` / `keepalive` / `close` /
> `identify` / `request` / `response` / `channel` / `resource-*` /
> `plaintext` / `ignore`; `Link.receive` DATA dispatch applies only from
> those actions (no ad-hoc `planLinkDataContext` reads beside the step).
> **`stepLinkRegisterListWithActions`** emits `pending` / `active`;
> **`stepLinkActivateMembershipWithActions`** emits `remove-pending` /
> `append-active`; **`stepLinkUnregisterMembershipWithActions`** emits
> `remove-pending` / `remove-active`; **`stepLinkAppRequestWithActions`**
> emits `send` / `reject` (plan nested via
> **`stepLinkAppRequestPlanWithActions`**: `send`|`reject`);
> **`stepLinkAppRequestTransmitWithActions`** emits
> `keep-pending` / `unregister` (plan nested via
> **`stepLinkAppRequestTransmitOutcomePlanWithActions`**:
> `keep-pending`|`unregister`); transport link register/activate/unregister
> and `Link.request` apply only from those actions (no ad-hoc
> `planLinkRegisterList` / `planLinkActivateMembership` /
> `planLinkUnregisterMembership` / `planLinkAppRequest` /
> `planLinkAppRequestTransmitOutcome` / `plan ===` reads beside the step).
> **`stepAnnounceIngressGatesWithActions`** emits `apply-rate-limit` /
> `record-rate` / `rebroadcast`; **`stepIgnoreLocalAnnounceWithActions`** emits
> `ignore`|`proceed`; **`stepDispatchAnnounceHandlersWithActions`** emits
> `dispatch`|`skip`; **`stepReceiveAnnouncePathResponseWithActions`** emits
> `receive`|`skip`; **`stepMatchAnnounceAspectWithActions`** emits
> `match`|`mismatch`; **`stepLinkRelayTargetWithActions`** emits
> `outbound` / `received` / `ignore`; **`stepRelayTransportPacketAllowWithActions`**
> emits `allow`|`deny`; **`stepRecordLinkRelayTableEntryWithActions`** /
> **`stepRecordReverseTableEntryWithActions`** emit `record`|`skip`;
> **`stepLocalPathRequestPacketWithActions`** emits `path-request`|`other`;
> **`stepRelayLinkPacketAllowWithActions`** emits `allow`|`deny`;
> **`stepLookupLinkRelayEntryWithActions`** emits `hit`|`miss`;
> **`stepTransmitLinkRelayWithActions`** emits `transmit`|`skip`;
> **`stepRelayReversePacketAllowWithActions`** emits `allow`|`deny`;
> **`stepRelayReverseOnInterfaceWithActions`** emits `match`|`mismatch`;
> **`stepReverseEntryExpiredWithActions`** emits `expired`|`live`;
> **`stepTransmitReverseRelayWithActions`** emits `transmit`|`skip`;
> **`stepTransmitOnInterfaceWithActions`** emits `transmit`|`skip`;
> **`stepMatchLocalInboundDestinationWithActions`** /
> **`stepMatchLocalTypedDestinationWithActions`** emit `match`|`mismatch`;
> **`stepDispatchLocalLinkRequestWithActions`** emits `dispatch`|`skip`;
> **`stepAcceptLinkLrProofCandidateWithActions`** emits `accept`|`reject`;
> **`stepDispatchResourceProofToLinkWithActions`** emits `dispatch`|`skip`;
> **`stepRegisterTransportMemberWithActions`** emits `register`|`skip`;
> **`stepLinkResourceConcludeWithActions`**
> emits `remove-outgoing` / `remove-incoming`;
> **`stepPacketReceiptProofAcceptWithActions`** emits `accept` / `reject`;
> **`stepAcceptPacketReceiptProofWithActions`** emits `accept`|`skip`;
> `TransportNode` announce ingress/rebroadcast, transport/link/reverse-packet
> relay, interface transmit, local destination match/dispatch, LR-proof /
> resource-prf target, transport-member register, `Link.resourceConcluded`, and
> `PacketReceipt.validateProof` apply only from those actions (no ad-hoc
> `planAnnounceIngressGates` / `planLinkRelayTarget` /
> `canRelayTransportPacket` / `shouldRecordLinkRelayTableEntry` /
> `shouldRecordReverseTableEntry` / `isLocalPathRequestPacket` /
> `canRelayLinkPacket` /
> `canLookupLinkRelayEntry` / `shouldTransmitLinkRelay` /
> `canRelayReversePacket` / `shouldRelayReverseOnInterface` /
> `isReverseEntryExpired` / `shouldTransmitReverseRelay` /
> `shouldTransmitOnInterface` / `shouldMatchLocalInboundDestination` /
> `shouldMatchLocalTypedDestination` / `shouldDispatchLocalLinkRequest` /
> `shouldAcceptLinkLrProofCandidate` / `shouldDispatchResourceProofToLink` /
> `shouldRegisterTransportMember` /
> `planLinkResourceConclude` / `planPacketReceiptProofAccept` /
> `shouldAcceptPacketReceiptProof` reads beside the
> step).
> **`stepDeliverPendingLinkAppResponseWithActions`** emits `deliver`|`skip`;
> **`stepAcceptAnnouncePayloadWithActions`** / **`stepAcceptParsedAnnounceWithActions`**
> emit `accept`|`skip`; **`stepAcceptIdentityCiphertextFrameWithActions`** /
> **`stepAcceptIdentityDecryptPlaintextWithActions`** emit `accept`|`skip`;
> Link RESPONSE deliver, Announce parse / handleAnnounce, and Identity decrypt
> apply only from those actions (no ad-hoc `shouldDeliverPendingLinkAppResponse` /
> `shouldAcceptAnnouncePayload` / `shouldAcceptParsedAnnounce` /
> `shouldAcceptIdentityCiphertextFrame` /
> `shouldAcceptIdentityDecryptPlaintext` reads beside the step).
> **`stepAcceptDestinationLinkRequestWithActions`** /
> **`stepAnnounceDestinationWithActions`** /
> **`stepDestinationSendWithActions`** /
> **`stepOperateAttachedDestinationWithActions`** /
> **`stepAnnounceWithIdentityWithActions`** /
> **`stepRequestLinkDestinationWithActions`** /
> **`stepDestinationRequestAllowWithActions`** emit `allow`|`deny`;
> **`stepDestinationRequestPathValidWithActions`** emits `valid`|`invalid`;
> **`stepDestinationIdentityBindingValidWithActions`** emits `valid`|`invalid`;
> **`stepDestinationProofCallbackWithActions`** /
> **`stepDestinationLinkEstablishedCallbackWithActions`** emit `invoke`|`skip`;
> **`stepRegisterDestinationLinkWithActions`** emits `register`|`skip`;
> **`stepEmitDestinationProofWithActions`** emits `emit`|`skip`;
> **`stepPendingLinkRequestRegisterWithActions`** emits `register`|`skip`;
> **`stepAttachLinkRequestPacketReceiptWithActions`** emits `attach`|`skip`;
> RegisteredDestination / Link / LinkRequestReceipt / transport sendProof
> apply only from those actions (no ad-hoc `canAcceptDestinationLinkRequest` /
> `canAnnounceDestination` / `canDestinationSend` /
> `canOperateAttachedDestination` / `canAnnounceWithIdentity` /
> `canRequestLinkDestination` / `planDestinationRequestAllow` /
> `isValidDestinationRequestPath` / `isValidDestinationIdentityBinding` /
> `shouldInvokeDestinationProofCallback` /
> `shouldInvokeDestinationLinkEstablishedCallback` /
> `shouldRegisterDestinationLink` / `canEmitDestinationProof` /
> `shouldRegisterPendingLinkRequest` /
> `shouldAttachLinkRequestPacketReceipt` reads beside the step).
> **`stepLinkSendAllowWithActions`** / **`stepLinkClosedWithActions`** /
> **`stepReuseActiveLinkWithActions`** /
> **`stepAcceptLinkPacketInterfaceWithActions`** /
> **`stepEncryptLinkPayloadWithActions`** /
> **`stepLinkRequestAllowWithActions`** /
> **`stepUpdateLinkLastDataWithActions`** /
> **`stepLinkInboundDataPacketWithActions`** /
> **`stepIgnoreInitiatorKeepaliveProbeWithActions`** /
> **`stepReplyKeepaliveProbeWithActions`** /
> **`stepUpdateLinkKeepaliveAllowWithActions`** /
> **`stepCreateLinkChannelWithActions`** /
> **`stepLinkReadyForNewResourceWithActions`** emit allow|deny / closed|open /
> reuse|skip / accept|skip / encrypt|plaintext / update|skip / data|other /
> ignore|proceed / reply|skip / create|reuse / ready|busy; `Link`, Channel outlet,
> and LXMF link-reuse adapt them (no ad-hoc `canLinkSend` / `isLinkClosed` /
> `shouldReuseActiveLink` / `shouldAcceptLinkPacketInterface` /
> `shouldEncryptLinkPayload` / `canLinkRequest` / `shouldUpdateLinkLastData` /
> `isLinkInboundDataPacket` / `shouldIgnoreInitiatorKeepaliveProbe` /
> `shouldReplyKeepaliveProbe` / `canUpdateLinkKeepalive` /
> `shouldCreateLinkChannel` / `linkReadyForNewResource` reads beside the step).
> **`stepPerformLinkHandshakeAllowWithActions`** /
> **`stepProveLinkAllowWithActions`** /
> **`stepAcceptLinkOwnerPublicKeyWithActions`** /
> **`stepAcceptLinkRequestOwnerWithActions`** /
> **`stepValidateLinkProofAllowWithActions`** /
> **`stepContinueLinkValidateRequestWithActions`** /
> **`stepAttemptLinkProofCryptoWithActions`** /
> **`stepAcceptLinkRttWithActions`** /
> **`stepTeardownLinkFromRttWithActions`** /
> **`stepAcceptLinkTeardownWithActions`** /
> **`stepLinkTeardownReasonWithActions`** /
> **`stepLinkTeardownPlanWithActions`** /
> **`stepIdentifyOnLinkAllowWithActions`** /
> **`stepDispatchLinkPlaintextWithActions`** /
> **`stepResendLinkPacketAllowWithActions`** /
> **`stepRegisterLinkResourceWithActions`** /
> **`stepHandleOutgoingResourceRequestWithActions`** /
> **`stepHandleIncomingResourceByHashWithActions`** /
> **`stepLinkModeEnabledWithActions`** /
> **`stepExpectedLinkModeWithActions`** emit allow|deny / accept|reject /
> continue|skip / attempt|skip / accept|skip / teardown|skip / use-reason /
> close-only|send-teardown-then-close /
> dispatch|skip / register|skip /
> handle|skip /
> enabled|disabled / match|mismatch; `Link` adapts them (no ad-hoc
> `canPerformLinkHandshake` / `canProveLink` / `canAcceptLinkOwnerPublicKey` /
> `canAcceptLinkRequestOwner` / `canValidateLinkProof` / `shouldContinueLinkValidateRequest` /
> `shouldAttemptLinkProofCrypto` / `canAcceptLinkRtt` /
> `shouldTeardownLinkFromRtt` / `shouldAcceptLinkTeardown` /
> `planLinkTeardownReason` / `planLinkTeardown` /
> `canIdentifyOnLink` / `shouldDispatchLinkPlaintext` / `canResendLinkPacket` /
> `shouldRegisterLinkResource` / `shouldHandleOutgoingResourceRequest` /
> `shouldHandleIncomingResourceByHash` / `isLinkModeEnabled` /
> `isExpectedLinkMode` reads beside the step).
> **`stepPropagationRestoreWithActions`** emits `reject-too-large` / `duplicate` /
> `reject-hash` / `accept`; `PropagationServer` restore applies catalog insert only
> from those actions (no ad-hoc `planPropagationRestore` / `plan === "accept"`
> reads beside the step). **`stepDestinationIdentityHashWithActions`** emits
> `missing` / `use-object` / `reject-length` / `use-bytes`; `Destination` hash
> construction applies only from those actions.
> **`stepChannelTxEnvelopeOpWithActions`** emits `miss` / `process`; Channel
> TX-ring timeout/delivery applies only from those actions (nested under
> **`stepChannelTxTimeoutWithActions`**).
> **`stepChannelPacketTimeoutWithActions`** emits `ignore` / `give-up` /
> `retry`; Channel TX-timeout plan applies only from those actions (nested under
> **`stepChannelTxTimeoutWithActions`**; no ad-hoc `planChannelPacketTimeout` /
> `plan.kind` reads beside the step).
> **`stepDestinationProofWithActions`** emits `prove` / `skip`;
> **`stepPacketFilterWithActions`** emits `accept` / `reject`; transport node
> local plain DATA prove and packet-filter apply only from those actions.
> **`stepPacketReceiptCallbackWithActions`** emits `clear` / `set`;
> `PacketReceipt` timeout/delivery callback assignment applies only from those
> actions.
> Residual session wait loops now schedule injected-clock timers from step
> intents (no Promise.`delay`/`sleep` polls): **`stepPathAwait`** /
> **`stepPathResponseGrace`** (`TransportNode`), **`stepDeliveryReceiptPoll`**
> (LXMF router), and **`stepResourceAdvertiseWait`** (`Resource.advertise`).
> **`stepPathAwait`** / **`stepDeliveryReceiptPoll`** /
> **`stepResourceAdvertiseWait`** arms emit a `probe` action; continuing status
> events emit `timer/set` (advertise-wait also emits `queue`); terminal probes
> emit `timer/cancel` and conclude via `resolve` actions (`found` for path-await,
> `status` for delivery-receipt). Timer callbacks only re-enter via `timer/fired`
> → probe actions (no ad-hoc status reads beside the machine).
> **`stepPropagationTransfer`** link-establish timeout (`PROPAGATION_LINK_TIMER_ID`)
> is adapted by `PropagationClient`: timer callbacks only emit `timer/fired`;
> `reject-link-wait` / `resolve-link-wait` conclude the Promise shell;
> `xfer/link-arrived` gates late establishes (no ad-hoc phase read). Cancel /
> link-ready / link-timeout emit `timer/cancel`.
> **`stepLinkAwaitWithActions`** emits a `request-link` action on arm (plus the
> link-await timer intents) and concludes via `resolve` / `reject` actions;
> LXMF `awaitOutboundLink` adapts it — same action+intent path as propagation
> establish (`resolve-link-wait` / `reject-link-wait`), still sharing the Promise
> shell for the public async API.
> **`stepLinkAppRequestAwait`** (arm → `send-request`; response/failed/send-
> rejected → `resolve`) lives in protocol; LXMF `PropagationClient` list /
> download / haves awaits adapt it (timeout stays on `LinkRequestReceipt`).
> Remaining depth work: Link/LXMF orchestration shells that still hold
> Promise/callback continuations around already-pure step cores (watchdog
> ticks are already intent-driven). Path-await, delivery-receipt, resource
> advertise-wait, path-response grace, interface connect, propagation link
> establish/timeout, LXMF outbound link-await, and propagation app-request
> awaits all conclude via machine resolve/reject actions (adapters no longer
> finish by reading `state.concluded` beside probes). PacketReceipt
> timeout/delivery/failed, Channel TX timeout/retry/give-up, Link establish
> handshake/activate/fail/LRRTT, Link teardown local/remote close, Link
> RESOURCE_ADV accept/ask-app/reject / link-resource-advertisement-plan /
> link-resource-accept-app-result-plan, Link inbound app-request
> invoke/response, Link LINKIDENTIFY reject/commit /
> link-identify-outcome-plan, propagation-store
> reject/duplicate/accept / propagation-store-plan, propagation /get list-ids/apply /
> propagation-get-plan, LXMF
> delivery-parameter select deliver/reject / lxmf-delivery-plan, LXMF send-method
> reject/dispatch / lxmf-send-method-plan, LXMF per-method send gates (opportunistic /
> direct / propagated) / lxmf-opportunistic-send-plan / lxmf-direct-send-plan /
> lxmf-propagated-send-plan, LXMF pack gates (static pack / timestamp /
> instance pack / propagated pack prep) / lxmessage-pack-plan /
> lxmf-pack-timestamp-plan / lxmessage-instance-pack-plan /
> lxmf-propagated-pack-prep-plan, LXMF propagation link-ready /
> sync-prep / deliverable-accept / local-ingress gates /
> lxmf-propagation-link-ready-plan / lxmf-propagation-sync-prep-plan /
> lxmf-deliverable-accept-plan / lxmf-propagation-local-ingress-plan,
> LXMF receipt → send-state mapping, Link validate-request
> proceed/reject / continue, Link proof-validate accept/reject /
> link-proof-validate-outcome-plan, and Link
> LRRTT accept/teardown-from-rtt / link-rtt-outcome-plan / LINKCLOSE accept-link-teardown /
> link-teardown-reason / link-teardown-plan also conclude via
> machine actions (no ad-hoc `state.timedOut` / `plan.kind` / establish-status /
> dispatch / identify-outcome / delivery-plan / send-method /
> lxmf-send-method-plan / send-gate / lxmf-opportunistic-send-plan /
> lxmf-direct-send-plan / lxmf-propagated-send-plan /
> pack-gate / lxmessage-pack-plan / lxmf-pack-timestamp-plan /
> lxmessage-instance-pack-plan / lxmf-propagated-pack-prep-plan /
> propagation-link-ready / sync-prep / deliverable-accept /
> local-ingress / lxmf-propagation-link-ready-plan /
> lxmf-propagation-sync-prep-plan / lxmf-deliverable-accept-plan /
> lxmf-propagation-local-ingress-plan / receipt-send /
> lxmf-receipt-send-plan / signature-outcome /
> lxmf-signature-outcome-plan / include-lxmf-stamp / remember-lxmf-message /
> commit-remembered-lxmf-hash / accept-lxmf-wire-frame /
> register-lxmf-delivery-identity / teardown-lxmf-propagation-link /
> extract-lxmf-opportunistic-payload / select-lxmf-delivery-parameters /
> accept-transport-packet / validate-request / continue-link-validate-request /
> proof-validate / link-proof-validate-outcome-plan / link-identify-outcome-plan / link-resource-advertisement-plan / link-resource-accept-app-result-plan / propagation-store-plan / propagation-get-plan / lxmf-delivery-plan / lxmf-send-method-plan / lxmf-opportunistic-send-plan / lxmf-direct-send-plan / lxmf-propagated-send-plan / lxmessage-pack-plan / lxmf-pack-timestamp-plan / lxmessage-instance-pack-plan / lxmf-propagated-pack-prep-plan / lxmf-propagation-link-ready-plan / lxmf-propagation-sync-prep-plan / lxmf-deliverable-accept-plan / lxmf-propagation-local-ingress-plan / lxmf-receipt-send-plan / lxmf-signature-outcome-plan / announce-validate-outcome-plan / announce-build-plan / identity-decrypt-outcome-plan / identity-ratchet-lookup-plan / identity-recall-plan / identity-recall-app-data-plan / destination-construction-plan / destination-decrypt-plan / destination-encrypt-plan / packet-from-fields-plan / channel-message-type-registration-plan / channel-envelope-unpack-plan / channel-envelope-pack-plan / channel-send-plan / resource-assemble-outcome-plan / resource-proof-accept-plan / teardown-link-from-rtt / link-rtt-outcome-plan / accept-link-teardown /
> link-teardown-reason / link-teardown-plan /
> signature-outcome / token-access / announce-validate /
> announce-validate-outcome-plan / announce-build / announce-build-plan /
> identity-decrypt / identity-decrypt-outcome-plan / identity-ratchet-lookup /
> identity-ratchet-lookup-plan / identity-recall / identity-recall-plan /
> identity-recall-app-data / identity-recall-app-data-plan / identity-hash-allow / identity-use-private-key /
> identity-use-public-key / load-identity-key-material /
> attempt-identity-ratchet-decrypt / persist-identity-ratchet /
> identity-ratchet-record-usable / commit-restored-identity-ratchet /
> destination-construction / destination-construction-plan / destination-decrypt /
> destination-decrypt-plan / destination-encrypt / destination-encrypt-plan /
> packet-from-fields / packet-from-fields-plan /
> channel-message-type-registration / channel-message-type-registration-plan /
> channel-envelope-unpack / channel-envelope-unpack-plan /
> channel-envelope-pack / channel-envelope-pack-plan /
> channel-send / channel-send-plan /
> resource-assemble / resource-assemble-outcome-plan /
> resource-proof-accept / resource-proof-accept-plan /
> resource-advertise-wait / resource-advertise-phase-plan /
> link-app-request / link-app-request-plan /
> link-app-request-transmit / link-app-request-transmit-outcome-plan /
> emplace-channel-envelope / accept-channel-sequence /
> drain-channel-ring-index / register-channel-message-handler /
> stop-channel-handler-fanout / emit-channel-immediate-delivery /
> channel-message-state-from-receipt / announce-blocked / record-announce /
> allow-client-request / propagation-message-too-large /
> select-oldest-propagation-key / commit-propagation-store-entry /
> apply-propagation-restore / apply-propagation-store-commit /
> commit-link-remote-identity / invoke-link-app-request-handler /
> send-link-app-request-response / send-link-app-response-allow /
> clear-channel-envelope-packet / arm-channel-packet-receipt /
> apply-channel-packet-receipt-timeout / replace-channel-resent-packet /
> apply-channel-tx-receipt-timeout-extension /
> extend-packet-receipt-timeout / resend-channel-timeout-packet /
> link-keepalive-context /
> apply-resource-fulfill-part / accept-resource-hashmap-update-frame /
> fulfill-resource-part-request / apply-resource-receive-part-slot /
> send-resource-hashmap-update / advance-resource-awaiting-proof /
> accept-propagation-peer-response /
> evict-propagation-catalog-entry / delete-propagation-catalog-entry /
> evict-oldest-propagation-entry / accept-propagation-get-request-data /
> await-lxmf-delivery-receipt / invoke-lxmf-delivery-callback /
> accept-lxmf-propagation-local-delivery / unpack-lxmf-propagation-local-ingress /
> accept-resource-proof-payload / accept-resource-proof-split /
> resource-random-hash-length-valid / handle-propagation-peer-error /
> accept-propagation-delivered-message / treat-propagation-list-as-empty /
> request-propagation-haves-ack /
> resource-assemble / resource-assemble-outcome-plan / resource-proof-accept / resource-proof-accept-plan / resource-advertise-wait / resource-advertise-phase-plan / link-app-request / link-app-request-plan / link-app-request-transmit / link-app-request-transmit-outcome-plan / resource-continue-transfer /
> resource-complete /
> resource-receive-part-allow / resource-request-next-allow /
> resource-watchdog-allow / prove-resource-allow / advertise-resource /
> accept-incoming-resource-advertisement / resource-request-fulfill /
> resource-receive-part / resource-part-request /
> resource-hashmap-update-accept / append-resource-map-hash-collision-guard /
> assemble-resource-hashmap-bytes / contains-resource-hash /
> read-resource-request-hash / path-request-ingress /
> path-request-ingress-plan / discovery-path-request-fulfill /
> discovery-path-request-fulfill-plan / path-outbound / path-outbound-plan /
> path-entry-lookup / path-entry-lookup-plan / transport-ingress-dispatch /
> transport-ingress-dispatch-plan / accept-transport-packet /
> link-data-ingress-target / link-data-ingress-target-plan /
> reverse-relay-outcome / packet-hash-remember /
> local-plain-data-delivery / proof-ingress / outbound-receipt /
> packet-receipt-proof-ingress / link-data-context /
> link-register-list / link-activate-membership /
> link-unregister-membership / link-app-request /
> link-app-request-transmit / announce-ingress-gates /
> ignore-local-announce / dispatch-announce-handlers /
> receive-announce-path-response / match-announce-aspect /
> link-relay-target / relay-transport-packet-allow /
> record-link-relay-table-entry / record-reverse-table-entry /
> local-path-request-packet / relay-link-packet-allow /
> lookup-link-relay-entry / transmit-link-relay /
> relay-reverse-packet-allow / relay-reverse-on-interface /
> reverse-entry-expired / transmit-reverse-relay /
> transmit-on-interface / match-local-inbound-destination /
> match-local-typed-destination / dispatch-local-link-request /
> accept-link-lr-proof-candidate / dispatch-resource-proof-to-link /
> register-transport-member /
> link-resource-conclude /
> packet-receipt-proof-accept / accept-packet-receipt-proof /
> commit-resource-assemble-payload / dispatch-local-plain-data-delivery /
> propagation-restore /
> deliver-pending-link-app-response / accept-announce-payload /
> accept-parsed-announce / accept-identity-ciphertext-frame /
> attempt-announce-signature-validate / check-announce-destination-hash /
> accept-link-identify / register-packet-receipt / keep-outbound-receipt /
> fail-and-drop-outbound-receipt / register-link-member /
> accept-identity-decrypt-plaintext /
> attempt-announce-signature-validate / check-announce-destination-hash /
> accept-link-identify / register-packet-receipt / keep-outbound-receipt /
> fail-and-drop-outbound-receipt / register-link-member /
> identity-hash-allow / identity-use-private-key /
> identity-use-public-key / load-identity-key-material /
> attempt-identity-ratchet-decrypt / persist-identity-ratchet /
> identity-ratchet-record-usable / commit-restored-identity-ratchet /
> channel-message-state-from-receipt / announce-blocked / record-announce /
> allow-client-request / propagation-message-too-large /
> select-oldest-propagation-key / commit-propagation-store-entry /
> apply-propagation-restore / apply-propagation-store-commit /
> commit-link-remote-identity / invoke-link-app-request-handler /
> send-link-app-request-response / send-link-app-response-allow /
> accept-destination-link-request / announce-destination /
> destination-send / operate-attached-destination /
> announce-with-identity / request-link-destination /
> destination-request-allow / destination-request-path-valid /
> destination-proof-callback /
> destination-link-established-callback / register-destination-link /
> emit-destination-proof / pending-link-request-register /
> attach-link-request-packet-receipt /
> link-send-allow / link-closed / reuse-active-link /
> accept-link-packet-interface / encrypt-link-payload / link-request-allow /
> update-link-last-data / link-inbound-data-packet /
> ignore-initiator-keepalive-probe / reply-keepalive-probe /
> update-link-keepalive-allow / create-link-channel /
> link-ready-for-new-resource /
> perform-link-handshake-allow / prove-link-allow /
> accept-link-owner-public-key / accept-link-request-owner / validate-link-proof-allow /
> attempt-link-proof-crypto / accept-link-rtt / link-rtt-outcome-plan / teardown-link-from-rtt /
> link-proof-validate-outcome-plan / link-identify-outcome-plan /
> link-resource-advertisement-plan / link-resource-accept-app-result-plan /
> propagation-store-plan / propagation-get-plan / lxmf-delivery-plan /
> lxmf-send-method-plan / lxmf-opportunistic-send-plan / lxmf-direct-send-plan /
> lxmf-propagated-send-plan / announce-validate-outcome-plan / announce-build-plan /
> identity-decrypt-outcome-plan / identity-ratchet-lookup-plan /
> identity-recall-plan / identity-recall-app-data-plan /
> destination-construction-plan / destination-decrypt-plan /
> destination-encrypt-plan / packet-from-fields-plan /
> channel-message-type-registration-plan / channel-envelope-unpack-plan /
> channel-envelope-pack-plan / channel-send-plan /
> resource-assemble-outcome-plan / resource-proof-accept-plan /
> resource-advertise-phase-plan / link-app-request-plan /
> link-app-request-transmit-outcome-plan /
> accept-link-teardown / link-teardown-reason / link-teardown-plan / identify-on-link-allow /
> dispatch-link-plaintext / resend-link-packet-allow /
> register-link-resource / handle-outgoing-resource-request /
> handle-incoming-resource-by-hash / link-mode-enabled / expected-link-mode /
> destination-identity-hash / channel-tx-envelope-op /
> channel-packet-timeout /
> destination-proof / packet-filter / packet-receipt-callback /
> channel-tx-receipt-timeout-refresh / extend-packet-receipt-timeout /
> resend-channel-timeout-packet /
> channel-message-handler-unregister /
> pending-link-request-unregister / stream-ready-callback-unregister /
> packet-receipt-unregister / transport-member-unregister /
> link-initiator-mtu / link-request-responder-mtu / link-hops-match /
> compute-link-mdu / compute-link-establishment-timeout /
> compute-link-request-timeout / compute-link-rtt-seconds / merge-link-rtt /
> compute-resource-timeout / compute-keepalive /
> channel-packet-timeout-seconds / count-channel-tx-outstanding /
> channel-allows-send / channel-outlet-transmit /
> index-of-channel-tx-envelope / index-of-channel-ring-sequence /
> index-of-matching-link-id / index-of-pending-link-app-request /
> clamp-stream-data-chunk-length / clamp-stream-read-size /
> clamp-stream-chunk-take / append-stream-data / stream-read-defer /
> stream-read-return / stream-chunk-consume / stream-eof-mark /
> stream-id-assigned / stream-data-message-handle /
> stream-ready-callback-register / interface-name-valid /
> interface-mtu-fit / interface-closed / interface-send-allow /
> enqueue-raw-interface-frame / enqueue-decoded-packet /
> deliver-queued-packet / yield-buffered-packet /
> deliver-pending-link-app-response / accept-announce-payload /
> accept-parsed-announce / accept-identity-ciphertext-frame /
> attempt-announce-signature-validate / check-announce-destination-hash /
> accept-link-identify / register-packet-receipt / keep-outbound-receipt /
> fail-and-drop-outbound-receipt / register-link-member /
> accept-identity-decrypt-plaintext /
> attempt-announce-signature-validate / check-announce-destination-hash /
> accept-link-identify / register-packet-receipt / keep-outbound-receipt /
> fail-and-drop-outbound-receipt / register-link-member /
> identity-hash-allow / identity-use-private-key /
> identity-use-public-key / load-identity-key-material /
> attempt-identity-ratchet-decrypt / persist-identity-ratchet /
> identity-ratchet-record-usable / commit-restored-identity-ratchet /
> channel-message-state-from-receipt / announce-blocked / record-announce /
> allow-client-request / propagation-message-too-large /
> select-oldest-propagation-key / commit-propagation-store-entry /
> apply-propagation-restore / apply-propagation-store-commit /
> commit-link-remote-identity / invoke-link-app-request-handler /
> send-link-app-request-response / send-link-app-response-allow /
> accept-destination-link-request / announce-destination /
> destination-send / operate-attached-destination /
> announce-with-identity / request-link-destination /
> destination-request-allow / destination-request-path-valid /
> destination-proof-callback /
> destination-link-established-callback / register-destination-link /
> emit-destination-proof / pending-link-request-register /
> attach-link-request-packet-receipt /
> link-send-allow / link-closed / reuse-active-link /
> accept-link-packet-interface / encrypt-link-payload / link-request-allow /
> update-link-last-data / link-inbound-data-packet /
> ignore-initiator-keepalive-probe / reply-keepalive-probe /
> update-link-keepalive-allow / create-link-channel /
> link-ready-for-new-resource /
> assemble-byte-arrays / append-path-random-blob / compute-path-expiry /
> emit-path-request / discovery-path-request-expired / begin-path-discovery /
> path-entry-expired / add-path-entry /
> answer-local-path-request / remember-path-request-tag /
> clear-expired-discovery-path-request / use-path-for-outbound /
> answer-path-with-entry / touch-path-entry / answer-path-request /
> fulfill-discovery-pending / accept-cached-path-response-packet /
> include-lxmf-stamp / remember-lxmf-message / commit-remembered-lxmf-hash /
> accept-lxmf-wire-frame / register-lxmf-delivery-identity /
> teardown-lxmf-propagation-link / extract-lxmf-opportunistic-payload /
> select-lxmf-delivery-parameters /
> accept-transport-packet / packet-hash-defer /
> emplace-channel-envelope / accept-channel-sequence /
> drain-channel-ring-index / register-channel-message-handler /
> stop-channel-handler-fanout / emit-channel-immediate-delivery /
> clear-channel-envelope-packet / arm-channel-packet-receipt /
> apply-channel-packet-receipt-timeout / replace-channel-resent-packet /
> apply-channel-tx-receipt-timeout-extension /
> extend-packet-receipt-timeout / resend-channel-timeout-packet /
> link-keepalive-context /
> apply-resource-fulfill-part / accept-resource-hashmap-update-frame /
> fulfill-resource-part-request / apply-resource-receive-part-slot /
> send-resource-hashmap-update / advance-resource-awaiting-proof /
> accept-propagation-peer-response /
> evict-propagation-catalog-entry / delete-propagation-catalog-entry /
> evict-oldest-propagation-entry / accept-propagation-get-request-data /
> await-lxmf-delivery-receipt / invoke-lxmf-delivery-callback /
> accept-lxmf-propagation-local-delivery / unpack-lxmf-propagation-local-ingress /
> accept-resource-proof-payload / accept-resource-proof-split /
> resource-random-hash-length-valid / handle-propagation-peer-error /
> accept-propagation-delivered-message / treat-propagation-list-as-empty /
> request-propagation-haves-ack /
> resource-advertisement-role-flags / encode-resource-advertisement-flags /
> decode-resource-advertisement-flags / classify-resource-advertisement /
> resource-encrypt-material / resource-hash-material /
> resource-expected-proof-material / resource-part-map-hash-material /
> compute-resource-total-parts / resource-hashmap-slot-writes /
> apply-resource-hashmap-slot-writes /
> clone-packet-with-hops / transport-announce-fields /
> path-response-announce-fields / wrap-transport-packet /
> strip-transport-headers / relay-transport-packet-bytes /
> rewrite-packet-hops / build-path-request-data /
> parse-path-request-data / path-request-tag-key /
> pack-announce-payload / parse-announce-payload /
> announce-signed-material /
> announce-destination-hash-material / announce-destination-hash-match /
> pack-packet-proof / split-packet-proof / packet-proof-hash-match /
> encode-packet-raw / decode-packet-raw /
> pack-packet-flags / unpack-packet-flags / packet-hashable-part /
> pack-link-proof-data / split-link-proof-body /
> pack-link-request-data / split-link-request-data /
> link-proof-signed-material / link-request-hashable-part /
> encode-link-signalling-bytes / encode-link-mtu-bytes /
> mode-from-link-request-data / mode-from-link-proof-data /
> mtu-from-link-request-data / mtu-from-link-proof-data /
> classify-link-proof-payload /
> pack-resource-proof / split-resource-proof /
> split-resource-decrypted-payload /
> pack-resource-hashmap-update / unpack-resource-hashmap-update /
> pack-resource-hashmap-update-packet / split-resource-hashmap-update-packet /
> parse-resource-part-request / append-resource-map-hash-collision-guard /
> assemble-resource-hashmap-bytes / contains-resource-hash /
> read-resource-request-hash / pack-resource-advertisement /
> unpack-resource-advertisement / encode-resource-advertisement-flags /
> decode-resource-advertisement-flags / classify-resource-advertisement /
> resource-encrypt-material / resource-hash-material /
> resource-expected-proof-material / resource-part-map-hash-material /
> compute-resource-total-parts / pack-link-request /
> pack-link-response / unpack-link-request / unpack-link-response /
> pack-token-frame / split-token-frame / split-token-key /
> token-iv-length-valid / accept-token-frame /
> token-signed-material / token-hmac-match /
> link-keepalive-context / emplace-channel-envelope /
> accept-channel-sequence / drain-channel-ring-index /
> register-channel-message-handler / stop-channel-handler-fanout /
> emit-channel-immediate-delivery / clear-channel-envelope-packet /
> arm-channel-packet-receipt / apply-channel-packet-receipt-timeout /
> replace-channel-resent-packet / apply-channel-tx-receipt-timeout-extension /
> extend-packet-receipt-timeout / resend-channel-timeout-packet /
> apply-resource-fulfill-part / accept-resource-hashmap-update-frame /
> fulfill-resource-part-request / apply-resource-receive-part-slot /
> send-resource-hashmap-update / advance-resource-awaiting-proof /
> accept-propagation-peer-response /
> evict-propagation-catalog-entry / delete-propagation-catalog-entry /
> evict-oldest-propagation-entry / accept-propagation-get-request-data /
> await-lxmf-delivery-receipt / invoke-lxmf-delivery-callback /
> accept-lxmf-propagation-local-delivery / unpack-lxmf-propagation-local-ingress /
> accept-resource-proof-payload / accept-resource-proof-split /
> resource-random-hash-length-valid / handle-propagation-peer-error /
> accept-propagation-delivered-message / treat-propagation-list-as-empty /
> request-propagation-haves-ack /
> pack-identity-ciphertext / split-identity-ciphertext /
> pack-lxmf-wire / split-lxmf-wire /
> lxmf-hashable-material / lxmf-signed-material /
> lxmf-opportunistic-payload /
> pack-lxmf-destination-prefixed / split-lxmf-destination-prefixed /
> lxmf-inbound-delivery / pack-link-identify-payload /
> split-link-identify-payload / link-identify-signed-material /
> pack-web-identity-record /
> split-web-identity-record / encode-ws-binary-frame /
> decode-ws-client-frame / encode-hdlc-frame / decode-hdlc-frames /
> decode-lxmf-peer-error / pack-lxm-payload / unpack-lxm-payload /
> pack-propagation-request / unpack-propagation-request /
> pack-propagation-envelope / unpack-propagation-envelope /
> unpack-bin-list / pack-stream-data-message /
> unpack-stream-data-message / pack-identity-private-key /
> split-identity-private-key / pack-identity-public-key /
> split-identity-public-key / encode-identity-ratchet-record /
> decode-identity-ratchet-record / encode-grant-record /
> decode-grant-record / pack-channel-envelope /
> unpack-channel-envelope / pack-link-keepalive-probe /
> pack-link-keepalive-reply / classify-link-keepalive /
> pack-msgpack-float64 / unpack-msgpack-float / pkcs7-pad /
> pkcs7-unpad / stamp-cost-from-app-data / truncate-hash-bytes /
> utf8-encode / utf8-decode / utf8-or-bytes / expand-destination-name /
> destination-name-hash-material / destination-hash-material /
> validate-destination-name-part / parse-aspect-filter /
> split-initiator-link-entropy / split-responder-link-entropy /
> split-identity-entropy / rns-hkdf / derive-rns-link-key /
> order-independent-shared-secret reads
> beside the step).
> **`stepPackStreamDataMessageWithActions`** /
> **`stepUnpackStreamDataMessageWithActions`** emit `use-raw`|`reject` /
> `use-fields`|`reject`; StreamDataMessage pack / unpack apply only from
> those actions (no ad-hoc `packStreamDataMessage` /
> `unpackStreamDataMessage` reads beside the step).
> **`stepPackIdentityPrivateKeyWithActions`** /
> **`stepSplitIdentityPrivateKeyWithActions`** /
> **`stepPackIdentityPublicKeyWithActions`** /
> **`stepSplitIdentityPublicKeyWithActions`** emit `use-raw`|`reject` /
> `use-fields`|`reject`; Identity key pack / split and Link owner/peer
> public-key splits apply only from those actions (no ad-hoc
> `packIdentityPrivateKey` / `splitIdentityPrivateKey` /
> `packIdentityPublicKey` / `splitIdentityPublicKey` reads beside the step).
> Identity keygen entropy uses **`stepSplitIdentityEntropyWithActions`**
> (see above).
> **`stepEncodeIdentityRatchetRecordWithActions`** /
> **`stepDecodeIdentityRatchetRecordWithActions`** emit `use-raw`|`reject` /
> `use-fields`|`reject`; Identity ratchet persist encode / decode apply only
> from those actions (no ad-hoc `encodeIdentityRatchetRecord` /
> `decodeIdentityRatchetRecord` reads beside the step).
> **`stepIdentityRatchetRecordUsableWithActions`** emits `usable`|`unusable`;
> Identity ratchet store restore usability applies only from those actions
> (no ad-hoc `isIdentityRatchetRecordUsable` reads beside the step).
> **`stepCommitRestoredIdentityRatchetWithActions`** emits `commit`|`skip`;
> Identity ratchet restore-to-cache applies only from those actions (no
> ad-hoc `shouldRestoreIdentityRatchetRecord` reads beside the step).
> **`stepEncodeGrantRecordWithActions`** /
> **`stepDecodeGrantRecordWithActions`** emit `use-raw`|`reject` /
> `use-fields`|`reject`; grant-record encode / decode (host persist +
> `GrantStore` get) apply only from those actions (no ad-hoc
> `encodeGrantRecord` / `decodeGrantRecord` reads beside the step).
> **`stepPackChannelEnvelopeWithActions`** /
> **`stepUnpackChannelEnvelopeWithActions`** emit `use-raw`|`reject` /
> `use-fields`|`reject`; Channel envelope framing pack / unpack apply only
> from those actions (no ad-hoc `packChannelEnvelope` /
> `unpackChannelEnvelope` reads beside the step).
> **`stepPackLinkKeepaliveProbeWithActions`** /
> **`stepPackLinkKeepaliveReplyWithActions`** /
> **`stepClassifyLinkKeepaliveWithActions`** emit `use-raw` /
> `probe`|`reply`|`reject`; Link keepalive pack / classify apply only from
> those actions (no ad-hoc `packLinkKeepaliveProbe` /
> `packLinkKeepaliveReply` / `isLinkKeepaliveProbe` /
> `isLinkKeepaliveReply` reads beside the step).
> **`stepPackMsgpackFloat64WithActions`** /
> **`stepUnpackMsgpackFloatWithActions`** emit `use-raw` /
> `use-fields`|`reject`; Link RTT msgpack float pack / unpack apply only
> from those actions (no ad-hoc `msgpackPackFloat64` /
> `msgpackUnpackFloat` reads beside the step).
> **`stepPkcs7PadWithActions`** / **`stepPkcs7UnpadWithActions`** emit
> `use-raw` / `use-raw`|`reject`; Token PKCS#7 pad / unpad apply only from
> those actions (no ad-hoc `pkcs7Pad` / `pkcs7Unpad` reads beside the step).
> **`stepStampCostFromAppDataWithActions`** emits `use-fields`|`reject`;
> LXMF stamp-cost extraction from announce app-data applies only from those
> actions (no ad-hoc `stampCostFromAppData` reads beside the step).
> **`stepTruncateHashBytesWithActions`** emits `use-raw`|`reject`; Identity /
> Destination / Packet / Announce hash truncation apply only from those
> actions (no ad-hoc `truncateHashBytes` / `truncateToNameHash` /
> `truncateToTruncatedHash` reads beside the step).
> **`stepUtf8EncodeWithActions`** / **`stepUtf8DecodeWithActions`** /
> **`stepUtf8OrBytesWithActions`** emit `use-raw` / `use-fields` / `use-raw`;
> Link / Destination path hashing, web-identity passphrase, msgpack string
> decode, and LXMF title/content/or-bytes apply only from those actions (no
> ad-hoc `utf8Encode` / `utf8Decode` / `utf8OrBytes` reads beside the step).
> **`stepExpandDestinationNameWithActions`** /
> **`stepDestinationNameHashMaterialWithActions`** /
> **`stepDestinationHashMaterialWithActions`** /
> **`stepValidateDestinationNamePartWithActions`** /
> **`stepParseAspectFilterWithActions`** emit `use-fields`|`reject` /
> `use-raw`|`reject` / `use-raw` / `proceed`|`reject` / `use-fields`|`reject`;
> Destination expand / hash materials / name-part validation and
> announce-handler aspect-filter parse apply only from those actions (no
> ad-hoc `expandDestinationName` / `destinationNameHashMaterial` /
> `destinationHashMaterial` / `validateDestinationNamePart` /
> `parseAspectFilter` reads beside the step).
> **`stepSplitInitiatorLinkEntropyWithActions`** /
> **`stepSplitResponderLinkEntropyWithActions`** emit `use-fields`|`reject`;
> Link initiator / responder keygen entropy splits apply only from those
> actions (no ad-hoc `splitInitiatorLinkEntropy` /
> `splitResponderLinkEntropy` reads beside the step).
> **`stepSplitIdentityEntropyWithActions`** emits `use-fields`|`reject`;
> Identity keygen entropy split applies only from those actions (no ad-hoc
> `splitIdentityEntropy` reads beside the step).
> **`stepRnsHkdfSha256WithActions`** emits `use-raw`|`reject`; RNS HKDF-SHA256
> apply only from those actions (no ad-hoc `rnsHkdfSha256` reads beside the
> step). **`stepDeriveRnsLinkKeyWithActions`** /
> **`stepOrderIndependentSharedSecretWithActions`** emit `use-raw`|`reject`;
> Link session-key derive and sim order-independent shared secrets apply only
> from those actions (no ad-hoc `deriveRnsLinkKey` /
> `orderIndependentSharedSecret` reads beside the step).
> **`stepChannelTxReceiptTimeoutRefreshWithActions`** emits `extend`
> (per refreshed TX-ring receipt; arm nested via
> **`stepArmChannelPacketReceiptWithActions`**: arm|skip; timeout formula nested
> via **`stepChannelPacketTimeoutSecondsWithActions`**: use-timeout; extend
> decision nested via **`stepExtendPacketReceiptTimeoutWithActions`**:
> extend|skip); Channel receipt-timeout refresh applies only from those actions
> (no ad-hoc `planChannelTxReceiptTimeoutRefresh` / `canArmChannelPacketReceipt` /
> `channelPacketTimeoutSeconds` reads beside the step). **`stepChannelMessageHandlerUnregisterWithActions`**,
> **`stepPendingLinkRequestUnregisterWithActions`**,
> **`stepStreamReadyCallbackUnregisterWithActions`**,
> **`stepPacketReceiptUnregisterWithActions`**, and
> **`stepTransportMemberUnregisterWithActions`** emit `remove` (with index);
> Channel, Link, Buffer, and TransportNode list splices apply only from those
> actions (no ad-hoc `planUnregister*` / `index !== null` reads beside the
> step).
> **`stepLinkInitiatorMtuWithActions`** / **`stepLinkRequestResponderMtuWithActions`**
> emit `use-mtu`; Link establish applies MTU only from those actions.
> **`stepComputeLinkMduWithActions`** emits `use-mdu`; `Link.updateMdu` applies only
> from those actions (no ad-hoc `computeLinkMdu` reads beside the step).
> **`stepLinkHopsMatchWithActions`** emits `match`|`mismatch`; `Link.hopsMatch`
> applies only from those actions (no ad-hoc `linkHopsMatch` reads beside the
> step).
> **`stepComputeLinkEstablishmentTimeoutWithActions`** /
> **`stepComputeLinkRequestTimeoutWithActions`** emit `use-timeout`; Link
> establishment / app-request timeouts apply only from those actions (no
> ad-hoc `computeLinkEstablishmentTimeout` / `computeLinkRequestTimeout` reads
> beside the step).
> **`stepComputeResourceTimeoutWithActions`** emits `use-timeout`; `Resource`
> construction applies only from those actions (no ad-hoc
> `computeResourceTimeout` reads beside the step).
> **`stepComputeKeepaliveWithActions`** emits `use-keepalive`; `Link.updateKeepalive`
> applies only from those actions (no ad-hoc `computeKeepalive` reads beside the
> step).
> **`stepChannelPacketTimeoutSecondsWithActions`** emits `use-timeout`;
> `Channel.getPacketTimeoutTime` and TX receipt-timeout refresh apply only from
> those actions (no ad-hoc `channelPacketTimeoutSeconds` reads beside the step).
> **`stepChannelPacketTimeoutWithActions`** emits `ignore`|`give-up`|`retry`;
> Channel TX-timeout plan applies only from those actions (nested under
> **`stepChannelTxTimeoutWithActions`**; no ad-hoc `planChannelPacketTimeout` /
> `plan.kind` reads beside the step).
> **`stepExtendPacketReceiptTimeoutWithActions`** emits `extend`|`skip`;
> Channel TX receipt-timeout refresh applies only from those actions (no
> ad-hoc `shouldExtendPacketReceiptTimeout` reads beside the step).
> **`stepResendChannelTimeoutPacketWithActions`** emits `resend`|`skip`;
> Channel TX-timeout resend applies only from those actions (no ad-hoc
> `shouldResendChannelTimeoutPacket` reads beside the step).
> **`stepCountChannelTxOutstandingWithActions`** emits `use-count`;
> **`stepChannelAllowsSendWithActions`** emits `allow`|`deny`;
> `Channel.isReadyToSend` applies only from those actions (no ad-hoc
> `countChannelTxOutstanding` / `channelAllowsSend` reads beside the step).
> **`stepChannelOutletTransmitWithActions`** emits `ok`|`reject`;
> `Channel.send` outlet-result gate applies only from those actions (no ad-hoc
> `isChannelOutletTransmitOk` reads beside the step).
> **`stepIndexOfChannelTxEnvelopeWithActions`** emits `use-index`|`miss`;
> Channel TX-ring timeout/delivery lookup applies only from those actions (no
> ad-hoc `indexOfChannelTxEnvelope` reads beside the step).
> **`stepIndexOfChannelRingSequenceWithActions`** emits `use-index`|`miss`;
> Channel RX drain applies only from those actions (no ad-hoc
> `indexOfChannelRingSequence` reads beside the step).
> **`stepIndexOfMatchingLinkIdWithActions`** emits `use-index`|`miss`;
> transport link-data / RESOURCE_PRF lookup applies only from those actions (no
> ad-hoc `indexOfMatchingLinkId` reads beside the step).
> **`stepIndexOfPendingLinkAppRequestWithActions`** emits `use-index`|`miss`;
> Link RESPONSE dispatch applies only from those actions (no ad-hoc
> `indexOfPendingLinkAppRequest` reads beside the step).
> **`stepClampStreamDataChunkLengthWithActions`** emits `use-length`;
> **`stepClampStreamReadSizeWithActions`** emits `use-size`;
> **`stepClampStreamChunkTakeWithActions`** emits `use-take`;
> `RawChannelWriter.write` / `RawChannelReader.read` apply only from those
> actions (no ad-hoc `clampStreamDataChunkLength` / `clampStreamReadSize` /
> `clampStreamChunkTake` reads beside the step).
> **`stepAppendStreamDataWithActions`** emits `append`|`skip`;
> **`stepStreamReadDeferWithActions`** emits `defer`|`proceed`;
> **`stepStreamReadReturnWithActions`** emits `yield`|`skip`;
> **`stepStreamChunkConsumeWithActions`** emits `consume`|`residual`;
> **`stepStreamEofMarkWithActions`** emits `mark`|`skip`;
> **`stepStreamIdAssignedWithActions`** emits `assigned`|`unassigned`;
> **`stepStreamDataMessageHandleWithActions`** emits `handle`|`ignore`;
> **`stepStreamReadyCallbackRegisterWithActions`** emits `register`|`skip`;
> Buffer stream adaptors apply only from those actions (no ad-hoc
> `shouldAppendStreamData` / `shouldDeferStreamRead` /
> `shouldReturnStreamReadResult` / `shouldConsumeStreamChunk` /
> `shouldMarkStreamEof` / `isStreamIdAssigned` /
> `shouldHandleStreamDataMessage` / `shouldRegisterStreamReadyCallback`
> reads beside the step).
> **`stepInterfaceNameValidWithActions`** emits `valid`|`invalid`;
> **`stepInterfaceMtuFitWithActions`** emits `fit`|`overflow`;
> **`stepInterfaceClosedWithActions`** emits `closed`|`open`;
> **`stepInterfaceSendAllowWithActions`** emits `allow`|`deny`;
> **`stepEnqueueRawInterfaceFrameWithActions`** emits `enqueue`|`skip`;
> **`stepEnqueueDecodedPacketWithActions`** emits `enqueue`|`skip`;
> **`stepDeliverQueuedPacketWithActions`** emits `deliver`|`buffer`;
> **`stepYieldBufferedPacketWithActions`** emits `yield`|`skip`;
> interface adaptors apply only from those actions (no ad-hoc
> `isValidInterfaceName` / `packetFitsInterfaceMtu` / `isInterfaceClosed` /
> `canInterfaceSend` / `shouldEnqueueRawInterfaceFrame` /
> `shouldEnqueueDecodedPacket` / `shouldDeliverQueuedPacket` /
> `shouldYieldBufferedPacket` reads beside the step).
> **`stepDeliverPendingLinkAppResponseWithActions`** emits `deliver`|`skip`;
> **`stepAcceptAnnouncePayloadWithActions`** emits `accept`|`skip`;
> **`stepAcceptParsedAnnounceWithActions`** emits `accept`|`skip`;
> **`stepAttemptAnnounceSignatureValidateWithActions`** emits `attempt`|`skip`;
> **`stepCheckAnnounceDestinationHashWithActions`** emits `check`|`skip`;
> **`stepAcceptLinkIdentifyWithActions`** emits `accept`|`skip`;
> **`stepCommitLinkRemoteIdentityWithActions`** emits `commit`|`skip`;
> **`stepInvokeLinkAppRequestHandlerWithActions`** emits `invoke`|`skip`;
> **`stepSendLinkAppRequestResponseWithActions`** emits `send`|`skip`;
> **`stepSendLinkAppResponseAllowWithActions`** emits `allow`|`deny`;
> **`stepRegisterPacketReceiptWithActions`** emits `register`|`skip`;
> **`stepKeepOutboundReceiptWithActions`** emits `keep`|`skip` (planKeep×sent);
> **`stepFailAndDropOutboundReceiptWithActions`** emits `fail-and-drop`|`skip`;
> **`stepRegisterLinkMemberWithActions`** emits `register`|`skip`;
> **`stepAcceptIdentityCiphertextFrameWithActions`** emits `accept`|`skip`;
> **`stepAcceptIdentityDecryptPlaintextWithActions`** emits `accept`|`skip`;
> **`stepIdentityHashAllowWithActions`** emits `allow`|`deny`;
> **`stepIdentityUsePrivateKeyWithActions`** /
> **`stepIdentityUsePublicKeyWithActions`** /
> **`stepLoadIdentityKeyMaterialWithActions`** emit `allow`|`deny`;
> **`stepAttemptIdentityRatchetDecryptWithActions`** emits `attempt`|`skip`;
> **`stepPersistIdentityRatchetWithActions`** emits `persist`|`skip`;
> **`stepIdentityRatchetRecordUsableWithActions`** emits `usable`|`unusable`;
> **`stepCommitRestoredIdentityRatchetWithActions`** emits `commit`|`skip`;
> Link RESPONSE / Announce parse / handleAnnounce / Identity decrypt, hash,
> key-use, load, ratchet-decrypt attempt, ratchet persist, ratchet usable, and
> restored-ratchet commit apply only
> from those actions (no ad-hoc `shouldDeliverPendingLinkAppResponse` /
> `shouldAcceptAnnouncePayload` / `shouldAcceptParsedAnnounce` /
> `shouldAcceptIdentityCiphertextFrame` /
> `shouldAcceptIdentityDecryptPlaintext` / `canIdentityHash` /
> `canIdentityUsePrivateKey` / `canIdentityUsePublicKey` /
> `canLoadIdentityKeyMaterial` / `shouldAttemptIdentityRatchetDecrypt` /
> `shouldPersistIdentityRatchet` / `isIdentityRatchetRecordUsable` /
> `shouldRestoreIdentityRatchetRecord` / `shouldAttemptAnnounceSignatureValidate` /
> `shouldCheckAnnounceDestinationHash` / `canAcceptLinkIdentify` /
> `shouldCommitLinkRemoteIdentity` / `shouldInvokeLinkAppRequestHandler` /
> `shouldSendLinkAppRequestResponse` / `canSendLinkAppResponse` /
> `shouldRegisterPacketReceipt` / `shouldKeepOutboundReceipt` /
> `shouldFailAndDropOutboundReceipt` / `shouldRegisterLinkMember` reads beside the step).
> **`stepAcceptDestinationLinkRequestWithActions`** /
> **`stepAnnounceDestinationWithActions`** /
> **`stepDestinationSendWithActions`** /
> **`stepOperateAttachedDestinationWithActions`** /
> **`stepAnnounceWithIdentityWithActions`** /
> **`stepRequestLinkDestinationWithActions`** /
> **`stepDestinationRequestAllowWithActions`** emit `allow`|`deny`;
> **`stepDestinationRequestPathValidWithActions`** emits `valid`|`invalid`;
> **`stepDestinationIdentityBindingValidWithActions`** emits `valid`|`invalid`;
> **`stepDestinationProofCallbackWithActions`** /
> **`stepDestinationLinkEstablishedCallbackWithActions`** emit `invoke`|`skip`;
> **`stepRegisterDestinationLinkWithActions`** emits `register`|`skip`;
> **`stepEmitDestinationProofWithActions`** emits `emit`|`skip`;
> **`stepPendingLinkRequestRegisterWithActions`** emits `register`|`skip`;
> **`stepAttachLinkRequestPacketReceiptWithActions`** emits `attach`|`skip`;
> RegisteredDestination / Link / LinkRequestReceipt / transport sendProof
> apply only from those actions (no ad-hoc `canAcceptDestinationLinkRequest` /
> `canAnnounceDestination` / `canDestinationSend` /
> `canOperateAttachedDestination` / `canAnnounceWithIdentity` /
> `canRequestLinkDestination` / `planDestinationRequestAllow` /
> `isValidDestinationRequestPath` / `isValidDestinationIdentityBinding` /
> `shouldInvokeDestinationProofCallback` /
> `shouldInvokeDestinationLinkEstablishedCallback` /
> `shouldRegisterDestinationLink` / `canEmitDestinationProof` /
> `shouldRegisterPendingLinkRequest` /
> `shouldAttachLinkRequestPacketReceipt` reads beside the step).
> **`stepComputeLinkRttSecondsWithActions`** / **`stepMergeLinkRttWithActions`**
> emit `use-rtt`; Link establish RTT measure / merge apply only from those
> actions (no ad-hoc `computeLinkRttSeconds` / `mergeLinkRtt` reads beside the
> step).
> **`stepAssembleByteArraysWithActions`** emits `use-raw`; `Resource.assemble`
> applies only from those actions (no ad-hoc `assembleByteArrays` reads beside
> the step).
> **`stepAppendPathRandomBlobWithActions`** emits `use-fields`; path-table
> announce update applies only from those actions (no ad-hoc
> `appendPathRandomBlob` reads beside the step).
> **`stepComputePathExpiryWithActions`** emits `use-expiry`; path-table announce
> update applies only from those actions (no ad-hoc `computePathExpiry` reads
> beside the step).
> **`stepEmitPathRequestWithActions`** emits `emit` / `skip`;
> **`stepDiscoveryPathRequestExpiredWithActions`** /
> **`stepPathEntryExpiredWithActions`** emit `expired` / `live`;
> **`stepBeginPathDiscoveryWithActions`** emits `begin` / `skip`;
> **`stepAddPathEntryWithActions`** emits `add` / `skip`;
> **`stepAnswerLocalPathRequestWithActions`** emits `answer` / `skip`;
> **`stepRememberPathRequestTagWithActions`** emits `remember` / `skip`;
> **`stepClearExpiredDiscoveryPathRequestWithActions`** emits `clear` / `skip`;
> **`stepUsePathForOutboundWithActions`** emits `use` / `skip`;
> **`stepAnswerPathWithEntryWithActions`** emits `answer` / `skip`;
> **`stepTouchPathEntryWithActions`** emits `touch` / `skip`;
> **`stepAnswerPathRequestWithActions`** emits `answer` / `skip`;
> **`stepFulfillDiscoveryPendingWithActions`** emits `fulfill` / `skip`;
> **`stepAcceptCachedPathResponsePacketWithActions`** emits `accept` / `skip`;
> path-request emit, discovery/path expiry, begin-discovery, path-table add,
> answer-local / remember-tag / clear-expired-discovery / use-path-for-outbound /
> answer-path-with-entry / touch-path-entry / answer-path-request /
> fulfill-discovery-pending / accept-cached-path-response apply only from
> those actions (no ad-hoc `shouldEmitPathRequest` /
> `isDiscoveryPathRequestExpired` / `isPathEntryExpired` /
> `shouldBeginPathDiscovery` / `shouldAddPathEntry` /
> `canAnswerLocalPathRequest` / `shouldRememberPathRequestTag` /
> `shouldClearExpiredDiscoveryPathRequest` / `shouldUsePathForOutbound` /
> `shouldAnswerPathWithEntry` / `shouldTouchPathEntry` /
> `shouldAnswerPathRequest` / `shouldFulfillDiscoveryPending` /
> `shouldAcceptCachedPathResponsePacket` reads beside the step).
> **`stepIncludeLxmfStampWithActions`** emits `include` / `skip`;
> **`stepRememberLxmfMessageWithActions`** emits `remember` / `skip`;
> **`stepCommitRememberedLxmfHashWithActions`** emits `commit` / `skip`;
> **`stepAcceptLxmfWireFrameWithActions`** emits `accept` / `skip`;
> **`stepRegisterLxmfDeliveryIdentityWithActions`** emits `register` / `skip`;
> **`stepTeardownLxmfPropagationLinkWithActions`** emits `teardown` / `skip`;
> **`stepExtractLxmfOpportunisticPayloadWithActions`** emits `extract` / `skip`;
> **`stepSelectLxmfDeliveryParametersWithActions`** emits `select` / `skip`;
> LXMF stamp include / seen-hash remember / commit / wire-frame accept /
> delivery-identity register / propagation-link teardown / opportunistic extract /
> delivery-parameter select apply only from those actions (no ad-hoc
> `shouldIncludeLxmfStamp` / `shouldRememberLxmfMessage` /
> `shouldCommitRememberedLxmfHash` / `shouldAcceptLxmfWireFrame` /
> `canRegisterLxmfDeliveryIdentity` / `shouldTeardownLxmfPropagationLink` /
> `canExtractLxmfOpportunisticPayload` / `shouldSelectLxmfDeliveryParameters`
> reads beside the step).
> **`stepAcceptTransportPacketWithActions`** emits `accept` / `skip`;
> transport ingress packet accept applies only from those actions (no ad-hoc
> `shouldAcceptTransportPacket` reads beside the step).
> **`stepLinkKeepaliveContextWithActions`** emits `keepalive` / `other`;
> **`stepEmplaceChannelEnvelopeWithActions`** emits `emplace` / `skip`;
> **`stepAcceptChannelSequenceWithActions`** emits `accept` / `skip`;
> **`stepDrainChannelRingIndexWithActions`** emits `drain` / `skip`;
> **`stepRegisterChannelMessageHandlerWithActions`** emits `register` / `skip`;
> **`stepStopChannelHandlerFanoutWithActions`** emits `stop` / `continue`;
> **`stepEmitChannelImmediateDeliveryWithActions`** emits `emit` / `skip`;
> **`stepChannelMessageStateFromPacketReceiptWithActions`** emits `use-state`;
> **`stepAnnounceBlockedWithActions`** emits `blocked` / `live`;
> **`stepRecordAnnounceWithActions`** emits `blocked` / `clear`;
> **`stepAllowClientRequestWithActions`** emits `allow` / `deny`;
> **`stepPropagationMessageTooLargeWithActions`** emits `too-large` / `fit`;
> **`stepSelectOldestPropagationKeyWithActions`** emits `use-key` / `miss`;
> **`stepCommitPropagationStoreEntryWithActions`** emits `commit` / `skip`;
> **`stepApplyPropagationRestoreWithActions`** emits `apply` / `skip`;
> **`stepApplyPropagationStoreCommitWithActions`** emits `apply` / `skip`;
> **`stepClearChannelEnvelopePacketWithActions`** emits `clear` / `skip`;
> Channel message-state, announce-rate, client-rate, and PropagationServer
> adapters apply only from those actions (no ad-hoc
> `channelMessageStateFromPacketReceipt` / `isAnnounceBlocked` /
> `recordAnnounce` / `allowClientRequest` / `isPropagationMessageTooLarge` /
> `selectOldestPropagationKey` / `shouldCommitPropagationStoreEntry` /
> `shouldApplyPropagationRestore` / `shouldApplyPropagationStoreCommit`
> reads beside the step).
> **`stepArmChannelPacketReceiptWithActions`** emits `arm` / `skip`;
> **`stepApplyChannelPacketReceiptTimeoutWithActions`** emits `apply` / `skip`;
> **`stepReplaceChannelResentPacketWithActions`** emits `replace` / `skip`;
> **`stepApplyChannelTxReceiptTimeoutExtensionWithActions`** emits `apply` / `skip`;
> **`stepExtendPacketReceiptTimeoutWithActions`** emits `extend` / `skip`;
> **`stepResendChannelTimeoutPacketWithActions`** emits `resend` / `skip`;
> **`stepApplyResourceFulfillPartWithActions`** emits `apply` / `skip`;
> **`stepAcceptResourceHashmapUpdateFrameWithActions`** emits `accept` / `skip`;
> **`stepFulfillResourcePartRequestWithActions`** emits `fulfill` / `skip`;
> **`stepApplyResourceReceivePartSlotWithActions`** emits `apply` / `skip`;
> **`stepSendResourceHashmapUpdateWithActions`** emits `send` / `skip`;
> **`stepAdvanceResourceAwaitingProofWithActions`** emits `advance` / `skip`;
> **`stepAcceptPropagationPeerResponseWithActions`** emits `accept` / `skip`;
> **`stepEvictPropagationCatalogEntryWithActions`** emits `evict` / `skip`;
> **`stepDeletePropagationCatalogEntryWithActions`** emits `delete` / `skip`;
> **`stepEvictOldestPropagationEntryWithActions`** emits `evict` / `skip`;
> **`stepAcceptPropagationGetRequestDataWithActions`** emits `accept` / `skip`;
> **`stepAwaitLxmfDeliveryReceiptWithActions`** emits `await` / `skip`;
> **`stepInvokeLxmfDeliveryCallbackWithActions`** emits `invoke` / `skip`;
> **`stepAcceptLxmfPropagationLocalDeliveryWithActions`** emits `accept` / `skip`;
> **`stepUnpackLxmfPropagationLocalIngressWithActions`** emits `unpack` / `skip`;
> **`stepAcceptResourceProofPayloadWithActions`** emits `accept` / `skip`;
> **`stepAcceptResourceProofSplitWithActions`** emits `accept` / `skip`;
> **`stepResourceRandomHashLengthValidWithActions`** emits `valid` / `invalid`;
> **`stepHandlePropagationPeerErrorWithActions`** emits `handle` / `skip`;
> **`stepAcceptPropagationDeliveredMessageWithActions`** emits `accept` / `skip`;
> **`stepTreatPropagationListAsEmptyWithActions`** emits `empty` / `nonempty`;
> **`stepRequestPropagationHavesAckWithActions`** emits `request` / `skip`;
> link keepalive-context, channel envelope emplace / RX-TX lifecycle,
> resource fulfill-part / hashmap-update frame accept / part-request fulfill /
> receive-part slot / HMU emit / awaiting-proof advance, propagation peer-response accept /
> catalog evict / delete / evict-oldest / get-request-data accept, LXMF
> receipt-await / callback-invoke / local-delivery accept / ingress unpack, resource-proof
> payload/split/random-hash, and propagation peer-error / delivered-message /
> list-empty / haves-ack apply only from those actions (no ad-hoc
> `isLinkKeepaliveContext` / `shouldEmplaceChannelEnvelope` /
> `shouldAcceptChannelSequence` / `shouldDrainChannelRingIndex` /
> `shouldRegisterChannelMessageHandler` / `shouldStopChannelHandlerFanout` /
> `shouldEmitChannelImmediateDelivery` / `shouldClearChannelEnvelopePacket` /
> `canArmChannelPacketReceipt` / `shouldApplyChannelPacketReceiptTimeout` /
> `shouldReplaceChannelResentPacket` /
> `shouldApplyChannelTxReceiptTimeoutExtension` /
> `shouldExtendPacketReceiptTimeout` /
> `shouldResendChannelTimeoutPacket` /
> `shouldApplyResourceFulfillPart` / `shouldAcceptResourceHashmapUpdateFrame` /
> `shouldFulfillResourcePartRequest` / `shouldApplyResourceReceivePartSlot` /
> `shouldSendResourceHashmapUpdate` / `shouldAdvanceResourceAwaitingProof` /
> `shouldAcceptPropagationPeerResponse` /
> `shouldEvictPropagationCatalogEntry` / `shouldDeletePropagationCatalogEntry` /
> `shouldEvictOldestPropagationEntry` / `shouldAcceptPropagationGetRequestData` /
> `shouldAwaitLxmfDeliveryReceipt` / `shouldInvokeLxmfDeliveryCallback` /
> `canAcceptLxmfPropagationLocalDelivery` / `canUnpackLxmfPropagationLocalIngress` /
> `shouldAcceptResourceProofPayload` / `shouldAcceptResourceProofSplit` /
> `isValidResourceRandomHashLength` / `shouldHandlePropagationPeerError` /
> `shouldAcceptPropagationDeliveredMessage` /
> `shouldTreatPropagationListAsEmpty` / `shouldRequestPropagationHavesAck`
> reads beside the step).
> **`stepIgnoreLocalAnnounceWithActions`** emits `ignore`|`proceed`;
> **`stepDispatchAnnounceHandlersWithActions`** emits `dispatch`|`skip`;
> **`stepReceiveAnnouncePathResponseWithActions`** emits `receive`|`skip`;
> **`stepMatchAnnounceAspectWithActions`** emits `match`|`mismatch`; announce
> ingress handler gates apply only from those actions (no ad-hoc
> `shouldIgnoreLocalAnnounce` / `canDispatchAnnounceHandlers` /
> `shouldReceiveAnnouncePathResponse` / `shouldMatchAnnounceAspect` reads
> beside the step).
> **`stepPacketHashDeferWithActions`** emits `defer` / `remember-now`;
> transport ingress hash deferral applies only from those actions.
> **`stepResourceAdvertisementRoleFlagsWithActions`** emits `use-flags`;
> **`stepResourceHashmapSlotWritesWithActions`** emits `write` (per slot);
> **`stepApplyResourceHashmapSlotWritesWithActions`** emits `use-fields`;
> Resource advertisement + hashmap-update apply only from those actions
> (no ad-hoc `planLinkInitiatorMtu` / `planLinkRequestResponderMtu` /
> `linkHopsMatch` / `computeLinkMdu` / `computeLinkEstablishmentTimeout` /
> `computeLinkRequestTimeout` / `computeResourceTimeout` / `computeKeepalive` /
> `channelPacketTimeoutSeconds` / `countChannelTxOutstanding` /
> `channelAllowsSend` / `isChannelOutletTransmitOk` /
> `indexOfChannelTxEnvelope` / `indexOfChannelRingSequence` /
> `indexOfMatchingLinkId` / `indexOfPendingLinkAppRequest` /
> `clampStreamDataChunkLength` / `clampStreamReadSize` /
> `clampStreamChunkTake` / `shouldAppendStreamData` /
> `shouldDeferStreamRead` / `shouldReturnStreamReadResult` /
> `shouldConsumeStreamChunk` / `shouldMarkStreamEof` /
> `isStreamIdAssigned` / `shouldHandleStreamDataMessage` /
> `shouldRegisterStreamReadyCallback` /
> `isValidInterfaceName` / `packetFitsInterfaceMtu` /
> `isInterfaceClosed` / `canInterfaceSend` /
> `shouldEnqueueRawInterfaceFrame` / `shouldEnqueueDecodedPacket` /
> `shouldDeliverQueuedPacket` / `shouldYieldBufferedPacket` /
> `shouldDeliverPendingLinkAppResponse` / `shouldAcceptAnnouncePayload` /
> `shouldAcceptParsedAnnounce` / `shouldAcceptIdentityCiphertextFrame` /
> `shouldAcceptIdentityDecryptPlaintext` /
> `canAcceptDestinationLinkRequest` / `canAnnounceDestination` /
> `canDestinationSend` / `canOperateAttachedDestination` /
> `canAnnounceWithIdentity` / `canRequestLinkDestination` /
> `planDestinationRequestAllow` / `isValidDestinationRequestPath` /
> `isValidDestinationIdentityBinding` /
> `shouldInvokeDestinationProofCallback` /
> `shouldInvokeDestinationLinkEstablishedCallback` /
> `shouldRegisterDestinationLink` / `canEmitDestinationProof` /
> `shouldRegisterPendingLinkRequest` /
> `shouldAttachLinkRequestPacketReceipt` /
> `computeLinkRttSeconds` / `mergeLinkRtt` /
> `computePathExpiry` / `shouldDeferPacketHash` /
> `planResourceAdvertisementRoleFlags` /
> `planResourceHashmapSlotWrites` / `applyResourceHashmapSlotWrites` reads beside the step).
> **`stepClonePacketWithHopsWithActions`** / **`stepTransportAnnounceFieldsWithActions`** /
> **`stepPathResponseAnnounceFieldsWithActions`** emit `use-fields`; hop-clone,
> transport announce rebroadcast, and path-response announce field planning apply
> only from those actions (no ad-hoc `planClonePacketWithHops` /
> `planTransportAnnounceFields` / `planPathResponseAnnounceFields` reads beside
> the step).
> **`stepWrapTransportPacketWithActions`** / **`stepStripTransportHeadersWithActions`** /
> **`stepRelayTransportPacketWithActions`** / **`stepRewritePacketHopsWithActions`**
> emit `use-raw`; transport wrap / strip / relay / hop-rewrite framing apply only
> from those actions (no ad-hoc `wrapTransportPacketBytes` /
> `stripTransportHeadersBytes` / `relayTransportPacketBytes` /
> `rewritePacketHopsBytes` reads beside the step).
> **`stepBuildPathRequestDataWithActions`** /
> **`stepParsePathRequestDataWithActions`** /
> **`stepPathRequestTagKeyWithActions`** emit `use-raw` / `use-fields`|`reject` /
> `use-key`; transport path-request build / parse / tag-key apply only from
> those actions (no ad-hoc `buildPathRequestData` / `parsePathRequestData` /
> `pathRequestTagKey` reads beside the step).
> **`stepPackAnnouncePayloadWithActions`** /
> **`stepParseAnnouncePayloadWithActions`** /
> **`stepAnnounceSignedMaterialWithActions`** /
> **`stepAnnounceDestinationHashMaterialWithActions`** /
> **`stepAnnounceDestinationHashMatchWithActions`** /
> **`stepAnnouncePacketTypeWithActions`** emit `use-raw` /
> `use-fields`|`reject` / `use-raw` / `use-raw` / `match`|`mismatch` /
> `announce`|`other`; announce pack / parse / signed-material /
> destination-hash material / match / packet-type apply only from those
> actions (no ad-hoc `packAnnouncePayload` / `parseAnnouncePayload` /
> `announceSignedMaterial` / `announceDestinationHashMaterial` /
> `announceDestinationHashMatches` / `isAnnouncePacketType` reads beside the
> step).
> **`stepPackPacketProofWithActions`** /
> **`stepSplitPacketProofWithActions`** /
> **`stepPacketProofHashMatchWithActions`** /
> **`stepPacketTypeProofWithActions`** emit `use-raw` /
> `use-fields`|`reject` / `match`|`mismatch` / `proof`|`other`; packet-proof
> pack / split / hash-match / packet-type apply only from those actions (no
> ad-hoc `packPacketProof` / `splitPacketProof` / `packetProofHashMatches` /
> `isPacketTypeProof` reads beside the step).
> **`stepEncodePacketRawWithActions`** /
> **`stepDecodePacketRawWithActions`** emit `use-raw`|`reject` /
> `use-fields`|`reject`; packet-header encode / decode apply only from those
> actions (no ad-hoc `encodePacketRaw` / `decodePacketRaw` reads beside the
> step).
> **`stepPackPacketFlagsWithActions`** /
> **`stepUnpackPacketFlagsWithActions`** /
> **`stepPacketHashablePartWithActions`** emit `use-flags` / `use-fields` /
> `use-raw`; packet flag pack / unpack and hashable-part framing apply only
> from those actions (no ad-hoc `packPacketFlags` / `unpackPacketFlags` /
> `packetHashablePart` reads beside the step).
> **`stepPackLinkProofDataWithActions`** /
> **`stepSplitLinkProofBodyWithActions`** /
> **`stepPackLinkRequestDataWithActions`** /
> **`stepSplitLinkRequestDataWithActions`** /
> **`stepLinkProofSignedMaterialWithActions`** /
> **`stepLinkRequestHashablePartWithActions`** /
> **`stepEncodeLinkSignallingBytesWithActions`** /
> **`stepEncodeLinkMtuBytesWithActions`** /
> **`stepModeFromLinkRequestDataWithActions`** /
> **`stepModeFromLinkProofDataWithActions`** /
> **`stepMtuFromLinkRequestDataWithActions`** /
> **`stepMtuFromLinkProofDataWithActions`** /
> **`stepClassifyLinkProofPayloadWithActions`** emit `use-raw` /
> `use-fields`|`reject` / `use-raw` / `use-raw` / `use-mode` /
> `use-mtu`|`reject` / `body-only`|`body-with-mtu`|`reject`; link-proof /
> link-request pack / split, signed material / hashable truncate, signalling /
> MTU encode, mode / MTU decode, and payload classify apply only from those
> actions (no ad-hoc `packLinkProofData` / `splitLinkProofBody` /
> `packLinkRequestData` / `splitLinkRequestData` /
> `linkProofSignedMaterial` / `linkRequestHashablePart` /
> `encodeLinkSignallingBytes` / `encodeLinkMtuBytes` /
> `modeFromLinkRequestData` / `modeFromLinkProofData` /
> `mtuFromLinkRequestData` / `mtuFromLinkProofData` /
> `classifyLinkProofPayload` reads beside the step).
> **`stepPackResourceProofWithActions`** /
> **`stepSplitResourceProofWithActions`** /
> **`stepSplitResourceDecryptedPayloadWithActions`** emit `use-raw` /
> `use-fields`|`reject` / `use-raw`|`reject`; resource-proof pack / split and
> decrypted-payload strip apply only from those actions (no ad-hoc
> `packResourceProof` / `splitResourceProof` /
> `splitResourceDecryptedPayload` reads beside the step).
> **`stepPackResourceHashmapUpdateWithActions`** /
> **`stepUnpackResourceHashmapUpdateWithActions`** /
> **`stepPackResourceHashmapUpdatePacketWithActions`** /
> **`stepSplitResourceHashmapUpdatePacketWithActions`** /
> **`stepParseResourcePartRequestWithActions`** emit `use-raw` /
> `use-fields`|`reject`; resource hashmap-update pack / unpack / packet pack /
> packet split and part-request parse apply only from those actions (no ad-hoc
> `packResourceHashmapUpdate` / `unpackResourceHashmapUpdate` /
> `packResourceHashmapUpdatePacket` / `splitResourceHashmapUpdatePacket` /
> `parseResourcePartRequest` reads beside the step).
> **`stepAppendResourceMapHashCollisionGuardWithActions`** /
> **`stepAssembleResourceHashmapBytesWithActions`** /
> **`stepContainsResourceHashWithActions`** /
> **`stepReadResourceRequestHashWithActions`** /
> **`stepApplyResourceHashmapSlotWritesWithActions`** emit `append`|`collide` /
> `use-raw` / `present`|`absent` / `use-raw` / `use-fields`; resource collision-guard append,
> hashmap assemble, hash membership, request-hash read, and slot-write apply apply only from
> those actions (no ad-hoc `appendResourceMapHashCollisionGuard` /
> `assembleResourceHashmapBytes` / `containsResourceHash` /
> `indexOfResourceHash` / `readResourceRequestHash` /
> `applyResourceHashmapSlotWrites` reads beside the step).
> **`stepPackResourceAdvertisementWithActions`** /
> **`stepUnpackResourceAdvertisementWithActions`** emit `use-raw` /
> `use-fields`|`reject`; resource advertisement pack / unpack apply only from
> those actions (no ad-hoc `packResourceAdvertisement` /
> `unpackResourceAdvertisement` reads beside the step).
> **`stepEncodeResourceAdvertisementFlagsWithActions`** /
> **`stepDecodeResourceAdvertisementFlagsWithActions`** /
> **`stepClassifyResourceAdvertisementWithActions`** emit `use-flags` /
> `use-fields` / `request`|`response`|`reject`; resource advertisement flag
> encode / decode and request/response classify apply only from those actions
> (no ad-hoc `encodeResourceAdvertisementFlags` /
> `decodeResourceAdvertisementFlags` / `isResourceAdvertisementRequest` /
> `isResourceAdvertisementResponse` reads beside the step).
> **`stepResourceEncryptMaterialWithActions`** /
> **`stepResourceHashMaterialWithActions`** /
> **`stepResourceExpectedProofMaterialWithActions`** /
> **`stepResourcePartMapHashMaterialWithActions`** /
> **`stepComputeResourceTotalPartsWithActions`** emit `use-raw`|`reject` /
> `use-raw` / `use-parts`; resource encrypt / hash / expected-proof / part
> map-hash materials and total-parts computation apply only from those actions
> (no ad-hoc `resourceEncryptMaterial` / `resourceHashMaterial` /
> `resourceExpectedProofMaterial` / `resourcePartMapHashMaterial` /
> `computeResourceTotalParts` reads beside the step).
> **`stepPackLinkRequestWithActions`** /
> **`stepPackLinkResponseWithActions`** /
> **`stepUnpackLinkRequestWithActions`** /
> **`stepUnpackLinkResponseWithActions`** emit `use-raw` /
> `use-fields`|`reject`; link request/response msgpack pack / unpack apply
> only from those actions (no ad-hoc `msgpackPackLinkRequest` /
> `msgpackPackLinkResponse` / `msgpackUnpackLinkRequest` /
> `msgpackUnpackLinkResponse` reads beside the step).
> **`stepPackTokenFrameWithActions`** /
> **`stepSplitTokenFrameWithActions`** /
> **`stepSplitTokenKeyWithActions`** /
> **`stepTokenIvLengthValidWithActions`** /
> **`stepAcceptTokenFrameWithActions`** /
> **`stepTokenSignedMaterialWithActions`** /
> **`stepTokenHmacMatchWithActions`** emit `use-raw`|`reject` /
> `use-fields`|`reject` / `use-fields`|`reject` / `valid`|`invalid` /
> `accept`|`skip` / `use-raw`|`reject` / `match`|`mismatch`; Token frame
> pack / split, key-split, IV-length, frame-accept, signed-material, and
> HMAC match apply only from those actions (no ad-hoc `packTokenFrame` /
> `splitTokenFrame` / `splitTokenKey` / `isValidTokenIvLength` /
> `shouldAcceptTokenFrame` / `tokenSignedMaterial` / `tokenHmacMatches`
> reads beside the step).
> **`stepPackIdentityCiphertextWithActions`** /
> **`stepSplitIdentityCiphertextWithActions`** emit `use-raw`|`reject` /
> `use-fields`|`reject`; Identity ciphertext pack / split apply only from
> those actions (no ad-hoc `packIdentityCiphertext` /
> `splitIdentityCiphertext` reads beside the step).
> **`stepPackLxmfWireWithActions`** /
> **`stepSplitLxmfWireWithActions`** emit `use-raw`|`reject` /
> `use-fields`|`reject`; LXMF outer wire pack / split apply only from those
> actions (no ad-hoc `packLxmfWire` / `splitLxmfWire` reads beside the step).
> **`stepLxmfHashableMaterialWithActions`** /
> **`stepLxmfSignedMaterialWithActions`** /
> **`stepLxmfOpportunisticPayloadWithActions`** emit `use-raw` / `use-raw` /
> `use-raw`|`reject`; LXMF hashable / signed materials and opportunistic
> payload strip apply only from those actions (no ad-hoc
> `lxmfHashableMaterial` / `lxmfSignedMaterial` / `lxmfOpportunisticPayload`
> reads beside the step).
> **`stepPackLxmfDestinationPrefixedWithActions`** /
> **`stepSplitLxmfDestinationPrefixedWithActions`** /
> **`stepLxmfInboundDeliveryWithActions`** emit `use-raw`|`reject` /
> `use-fields`|`reject` / `use-raw`; destination-prefixed pack / split and
> inbound-delivery rebuild apply only from those actions (no ad-hoc
> `packLxmfDestinationPrefixed` / `splitLxmfDestinationPrefixed` /
> `lxmfInboundDeliveryBytes` reads beside the step).
> **`stepPackLinkIdentifyPayloadWithActions`** /
> **`stepSplitLinkIdentifyPayloadWithActions`** /
> **`stepLinkIdentifySignedMaterialWithActions`** emit `use-raw`|`reject` /
> `use-fields`|`reject` / `use-raw`; Link identify payload pack / split /
> signed-material apply only from those actions (no ad-hoc
> `packLinkIdentifyPayload` / `splitLinkIdentifyPayload` /
> `linkIdentifySignedMaterial` reads beside the step).
> **`stepPackWebIdentityRecordWithActions`** /
> **`stepSplitWebIdentityRecordWithActions`** emit `use-raw`|`reject` /
> `use-fields`|`reject`; web-identity salt||iv||ciphertext pack / split apply
> only from those actions (no ad-hoc `packWebIdentityRecord` /
> `splitWebIdentityRecord` reads beside the step).
> **`stepEncodeWsBinaryFrameWithActions`** /
> **`stepDecodeWsClientFrameWithActions`** emit `use-raw` /
> `use-fields`|`reject`; WS binary frame encode / decode apply only from those
> actions (no ad-hoc `encodeWsBinaryFrame` / `decodeWsClientFrame` reads beside
> the step).
> **`stepEncodeHdlcFrameWithActions`** /
> **`stepDecodeHdlcFramesWithActions`** emit `use-raw` / `use-fields`; HDLC
> interface encode / decode apply only from those actions (no ad-hoc
> `encodeHdlcFrame` / `decodeHdlcFrames` reads beside the step).
> **`stepDecodeLxmfPeerErrorWithActions`** emits `use-fields`|`reject`; LXMF
> peer-error msgpack decode applies only from those actions (no ad-hoc
> `decodeLxmfPeerError` reads beside the step).
> **`stepPackLxmPayloadWithActions`** /
> **`stepUnpackLxmPayloadWithActions`** /
> **`stepPackPropagationRequestWithActions`** /
> **`stepUnpackPropagationRequestWithActions`** /
> **`stepPackPropagationEnvelopeWithActions`** /
> **`stepUnpackPropagationEnvelopeWithActions`** /
> **`stepUnpackBinListWithActions`** emit `use-raw` /
> `use-fields`|`reject`; LXMF payload / propagation-request /
> propagation-envelope / bin-list pack / unpack apply only from those
> actions (no ad-hoc `packLxmPayload` / `unpackLxmPayload` /
> `packPropagationRequest` / `unpackPropagationRequest` /
> `packPropagationEnvelope` / `unpackPropagationEnvelope` /
> `unpackBinList` reads beside the step).
> **`stepAssembleByteArraysWithActions`** emits `use-raw`; Resource assemble
> applies only from those actions (no ad-hoc `assembleByteArrays` reads beside
> the step).
> **`stepAppendPathRandomBlobWithActions`** emits `use-fields`; TransportNode
> path-table announce update applies only from those actions (no ad-hoc
> `appendPathRandomBlob` reads beside the step).
> **`stepComputePathExpiryWithActions`** emits `use-expiry`; TransportNode
> path-table announce update applies only from those actions (no ad-hoc
> `computePathExpiry` reads beside the step).
> **`stepComputeLinkEstablishmentTimeoutWithActions`** /
> **`stepComputeLinkRequestTimeoutWithActions`** emit `use-timeout`; Link
> establishment / request timeouts apply only from those actions (no ad-hoc
> `computeLinkEstablishmentTimeout` / `computeLinkRequestTimeout` reads beside
> the step).
> **`stepComputeResourceTimeoutWithActions`** emits `use-timeout`; Resource
> construction applies only from those actions (no ad-hoc
> `computeResourceTimeout` reads beside the step).
> **`stepComputeKeepaliveWithActions`** emits `use-keepalive`; `Link.updateKeepalive`
> applies only from those actions (no ad-hoc `computeKeepalive` reads beside the
> step).
> **`stepChannelPacketTimeoutSecondsWithActions`** emits `use-timeout`;
> `Channel.getPacketTimeoutTime` and TX receipt-timeout refresh apply only from
> those actions (no ad-hoc `channelPacketTimeoutSeconds` reads beside the step).
> **`stepChannelPacketTimeoutWithActions`** emits `ignore`|`give-up`|`retry`;
> Channel TX-timeout plan applies only from those actions (nested under
> **`stepChannelTxTimeoutWithActions`**; no ad-hoc `planChannelPacketTimeout` /
> `plan.kind` reads beside the step).
> **`stepExtendPacketReceiptTimeoutWithActions`** emits `extend`|`skip`;
> Channel TX receipt-timeout refresh applies only from those actions (no
> ad-hoc `shouldExtendPacketReceiptTimeout` reads beside the step).
> **`stepResendChannelTimeoutPacketWithActions`** emits `resend`|`skip`;
> Channel TX-timeout resend applies only from those actions (no ad-hoc
> `shouldResendChannelTimeoutPacket` reads beside the step).
> **`stepCountChannelTxOutstandingWithActions`** emits `use-count`;
> **`stepChannelAllowsSendWithActions`** emits `allow`|`deny`;
> `Channel.isReadyToSend` applies only from those actions (no ad-hoc
> `countChannelTxOutstanding` / `channelAllowsSend` reads beside the step).
> **`stepComputeLinkRttSecondsWithActions`** / **`stepMergeLinkRttWithActions`**
> emit `use-rtt`; Link establish RTT apply only from those actions (no ad-hoc
> `computeLinkRttSeconds` / `mergeLinkRtt` reads beside the step).
> **`stepComputeLinkMduWithActions`** emits `use-mdu`; `Link.updateMdu` applies
> only from those actions (no ad-hoc `computeLinkMdu` reads beside the step).
> **`stepClampStreamDataChunkLengthWithActions`** emits `use-length`;
> **`stepClampStreamReadSizeWithActions`** emits `use-size`;
> **`stepClampStreamChunkTakeWithActions`** emits `use-take`; Buffer write/read
> clamps apply only from those actions (no ad-hoc `clampStreamDataChunkLength` /
> `clampStreamReadSize` / `clampStreamChunkTake` reads beside the step).
> **`stepAppendStreamDataWithActions`** emits `append`|`skip`;
> **`stepStreamReadDeferWithActions`** emits `defer`|`proceed`;
> **`stepStreamReadReturnWithActions`** emits `yield`|`skip`;
> **`stepStreamChunkConsumeWithActions`** emits `consume`|`residual`;
> **`stepStreamEofMarkWithActions`** emits `mark`|`skip`;
> **`stepStreamIdAssignedWithActions`** emits `assigned`|`unassigned`;
> **`stepStreamDataMessageHandleWithActions`** emits `handle`|`ignore`;
> **`stepStreamReadyCallbackRegisterWithActions`** emits `register`|`skip`;
> Buffer stream adaptors apply only from those actions (no ad-hoc
> `shouldAppendStreamData` / `shouldDeferStreamRead` /
> `shouldReturnStreamReadResult` / `shouldConsumeStreamChunk` /
> `shouldMarkStreamEof` / `isStreamIdAssigned` /
> `shouldHandleStreamDataMessage` / `shouldRegisterStreamReadyCallback`
> reads beside the step).
> **`stepInterfaceNameValidWithActions`** emits `valid`|`invalid`;
> **`stepInterfaceMtuFitWithActions`** emits `fit`|`overflow`;
> **`stepInterfaceClosedWithActions`** emits `closed`|`open`;
> **`stepInterfaceSendAllowWithActions`** emits `allow`|`deny`;
> **`stepEnqueueRawInterfaceFrameWithActions`** emits `enqueue`|`skip`;
> **`stepEnqueueDecodedPacketWithActions`** emits `enqueue`|`skip`;
> **`stepDeliverQueuedPacketWithActions`** emits `deliver`|`buffer`;
> **`stepYieldBufferedPacketWithActions`** emits `yield`|`skip`;
> interface adaptors apply only from those actions (no ad-hoc
> `isValidInterfaceName` / `packetFitsInterfaceMtu` / `isInterfaceClosed` /
> `canInterfaceSend` / `shouldEnqueueRawInterfaceFrame` /
> `shouldEnqueueDecodedPacket` / `shouldDeliverQueuedPacket` /
> `shouldYieldBufferedPacket` reads beside the step).
> **`stepDeliverPendingLinkAppResponseWithActions`** emits `deliver`|`skip`;
> **`stepAcceptAnnouncePayloadWithActions`** emits `accept`|`skip`;
> **`stepAcceptParsedAnnounceWithActions`** emits `accept`|`skip`;
> **`stepAttemptAnnounceSignatureValidateWithActions`** emits `attempt`|`skip`;
> **`stepCheckAnnounceDestinationHashWithActions`** emits `check`|`skip`;
> **`stepAcceptLinkIdentifyWithActions`** emits `accept`|`skip`;
> **`stepCommitLinkRemoteIdentityWithActions`** emits `commit`|`skip`;
> **`stepInvokeLinkAppRequestHandlerWithActions`** emits `invoke`|`skip`;
> **`stepSendLinkAppRequestResponseWithActions`** emits `send`|`skip`;
> **`stepSendLinkAppResponseAllowWithActions`** emits `allow`|`deny`;
> **`stepRegisterPacketReceiptWithActions`** emits `register`|`skip`;
> **`stepKeepOutboundReceiptWithActions`** emits `keep`|`skip` (planKeep×sent);
> **`stepFailAndDropOutboundReceiptWithActions`** emits `fail-and-drop`|`skip`;
> **`stepRegisterLinkMemberWithActions`** emits `register`|`skip`;
> **`stepAcceptIdentityCiphertextFrameWithActions`** emits `accept`|`skip`;
> **`stepAcceptIdentityDecryptPlaintextWithActions`** emits `accept`|`skip`;
> **`stepIdentityHashAllowWithActions`** emits `allow`|`deny`;
> **`stepIdentityUsePrivateKeyWithActions`** /
> **`stepIdentityUsePublicKeyWithActions`** /
> **`stepLoadIdentityKeyMaterialWithActions`** emit `allow`|`deny`;
> **`stepAttemptIdentityRatchetDecryptWithActions`** emits `attempt`|`skip`;
> **`stepPersistIdentityRatchetWithActions`** emits `persist`|`skip`;
> **`stepIdentityRatchetRecordUsableWithActions`** emits `usable`|`unusable`;
> **`stepCommitRestoredIdentityRatchetWithActions`** emits `commit`|`skip`;
> Link RESPONSE / Announce parse / handleAnnounce / Identity decrypt, hash,
> key-use, load, ratchet-decrypt attempt, ratchet persist, ratchet usable, and
> restored-ratchet commit apply only
> from those actions (no ad-hoc `shouldDeliverPendingLinkAppResponse` /
> `shouldAcceptAnnouncePayload` / `shouldAcceptParsedAnnounce` /
> `shouldAcceptIdentityCiphertextFrame` /
> `shouldAcceptIdentityDecryptPlaintext` / `canIdentityHash` /
> `canIdentityUsePrivateKey` / `canIdentityUsePublicKey` /
> `canLoadIdentityKeyMaterial` / `shouldAttemptIdentityRatchetDecrypt` /
> `shouldPersistIdentityRatchet` / `isIdentityRatchetRecordUsable` /
> `shouldRestoreIdentityRatchetRecord` / `shouldAttemptAnnounceSignatureValidate` /
> `shouldCheckAnnounceDestinationHash` / `canAcceptLinkIdentify` /
> `shouldCommitLinkRemoteIdentity` / `shouldInvokeLinkAppRequestHandler` /
> `shouldSendLinkAppRequestResponse` / `canSendLinkAppResponse` /
> `shouldRegisterPacketReceipt` / `shouldKeepOutboundReceipt` /
> `shouldFailAndDropOutboundReceipt` / `shouldRegisterLinkMember` reads beside the step).
> **`stepAcceptDestinationLinkRequestWithActions`** /
> **`stepAnnounceDestinationWithActions`** /
> **`stepDestinationSendWithActions`** /
> **`stepOperateAttachedDestinationWithActions`** /
> **`stepAnnounceWithIdentityWithActions`** /
> **`stepRequestLinkDestinationWithActions`** /
> **`stepDestinationRequestAllowWithActions`** emit `allow`|`deny`;
> **`stepDestinationRequestPathValidWithActions`** emits `valid`|`invalid`;
> **`stepDestinationIdentityBindingValidWithActions`** emits `valid`|`invalid`;
> **`stepDestinationProofCallbackWithActions`** /
> **`stepDestinationLinkEstablishedCallbackWithActions`** emit `invoke`|`skip`;
> **`stepRegisterDestinationLinkWithActions`** emits `register`|`skip`;
> **`stepEmitDestinationProofWithActions`** emits `emit`|`skip`;
> **`stepPendingLinkRequestRegisterWithActions`** emits `register`|`skip`;
> **`stepAttachLinkRequestPacketReceiptWithActions`** emits `attach`|`skip`;
> RegisteredDestination / Link / LinkRequestReceipt / transport sendProof
> apply only from those actions (no ad-hoc `canAcceptDestinationLinkRequest` /
> `canAnnounceDestination` / `canDestinationSend` /
> `canOperateAttachedDestination` / `canAnnounceWithIdentity` /
> `canRequestLinkDestination` / `planDestinationRequestAllow` /
> `isValidDestinationRequestPath` / `isValidDestinationIdentityBinding` /
> `shouldInvokeDestinationProofCallback` /
> `shouldInvokeDestinationLinkEstablishedCallback` /
> `shouldRegisterDestinationLink` / `canEmitDestinationProof` /
> `shouldRegisterPendingLinkRequest` /
> `shouldAttachLinkRequestPacketReceipt` reads beside the step).
> **`stepLinkSendAllowWithActions`** / **`stepLinkClosedWithActions`** /
> **`stepReuseActiveLinkWithActions`** /
> **`stepAcceptLinkPacketInterfaceWithActions`** /
> **`stepEncryptLinkPayloadWithActions`** /
> **`stepLinkRequestAllowWithActions`** /
> **`stepUpdateLinkLastDataWithActions`** /
> **`stepLinkInboundDataPacketWithActions`** /
> **`stepIgnoreInitiatorKeepaliveProbeWithActions`** /
> **`stepReplyKeepaliveProbeWithActions`** /
> **`stepUpdateLinkKeepaliveAllowWithActions`** /
> **`stepCreateLinkChannelWithActions`** /
> **`stepLinkReadyForNewResourceWithActions`** emit allow|deny / closed|open /
> reuse|skip / accept|skip / encrypt|plaintext / update|skip / data|other /
> ignore|proceed / reply|skip / create|reuse / ready|busy; `Link`, Channel outlet,
> and LXMF link-reuse adapt them (no ad-hoc `canLinkSend` / `isLinkClosed` /
> `shouldReuseActiveLink` / `shouldAcceptLinkPacketInterface` /
> `shouldEncryptLinkPayload` / `canLinkRequest` / `shouldUpdateLinkLastData` /
> `isLinkInboundDataPacket` / `shouldIgnoreInitiatorKeepaliveProbe` /
> `shouldReplyKeepaliveProbe` / `canUpdateLinkKeepalive` /
> `shouldCreateLinkChannel` / `linkReadyForNewResource` reads beside the step).

You are refactoring the TwistedPear codebase (TypeScript, React Native + Node hosts; includes TypeScript implementations of Reticulum and LXMF) to enforce one invariant:

**No protocol module ever touches IO, time, or randomness directly.**

Every protocol behavior (Reticulum/LXMF sessions, capability grant lifecycle, discovery, sync, escrow, mini-app runtime brokering) must be expressible as pure transitions: `step(state, event) -> { state, intents }`. Effects enter only as events; effects leave only as declared intents executed by adapters at the edge. The purpose is deterministic simulation testing: an entire multi-node run must be reproducible from `(seed, config)`.

## Definitions

**Protocol module**: any code under the protocol source roots (identify them first; expect `src/protocol/`, the Reticulum/LXMF implementations, broker logic, and state machines — confirm actual paths from the repo layout and record them in the ratchet config).

**Forbidden inside protocol modules** (the deny list — enforce every item):
- Time: `Date.now`, `new Date()`, `performance.now`, `process.hrtime`, `Intl.DateTimeFormat` for current time
- Randomness: `Math.random`, `crypto.getRandomValues`, `crypto.randomBytes`, `crypto.randomUUID`, any uuid/nanoid library
- Scheduling: `setTimeout`, `setInterval`, `setImmediate`, `queueMicrotask`, `requestAnimationFrame`, unawaited floating promises used as timers
- Network: `fetch`, `XMLHttpRequest`, `WebSocket`, `net`, `dgram`, `tls`, `http(s)`, React Native networking, any BLE/LoRa/serial native module
- Storage: `fs`, `AsyncStorage`, SQLite/MMKV/keychain bindings, `localStorage`
- Process/environment: `process.env` reads, `os.*`, locale or timezone queries
- Logging directly to `console` (inject a logger; log calls must not observe time on their own)

**Permitted**: pure computation, injected capability interfaces, and data types. Crypto *algorithms* (hashing, signing, verification) are pure and permitted; crypto *key generation and nonces* must consume injected entropy.

## Target architecture

1. Define an `effects` package with narrow interfaces: `Clock` (returns the current virtual instant it was handed — protocol code never asks the OS), `Entropy` (deterministic stream seeded per node), `Timers` (request/cancel by id; expiry arrives as an event), `Transport` (send intent out; receive as event), `Store` (read/write as intent/event pairs).
2. Protocol cores are state machines: explicit state types, event union types, and a pure `step`. Outputs are `Intent[]` data — never executed inline.
3. Adapters live outside protocol roots and translate intents to real IO (production) or simulated IO (harness). Adapters may import protocol; protocol may never import adapters.
4. Async inside protocol code is suspect: prefer synchronous `step` functions. Where the existing code is promise-shaped, convert to event-driven continuations held in state, not awaited IO.

## Migration procedure

1. **Inventory.** AST-scan the protocol roots for every deny-list usage (use ts-morph or eslint with the rules below in report-only mode). Emit `violations.json`: file, line, API, suggested effect interface. Commit this as the baseline.
2. **Ratchet.** Create `sansio-ratchet.json` listing currently-violating files as temporary exceptions. CI fails if (a) any file NOT on the list violates, or (b) the list grows. Every PR may only shrink it. This makes the migration monotonic and lets it land incrementally.
3. **Effects package.** Implement the interfaces plus two adapter sets: `adapters/real/` and `adapters/sim/` (virtual clock, seeded PRNG such as xoshiro/PCG, in-memory transport with pluggable latency/loss models).
4. **Convert module-by-module**, dependency-leaves first (likely: framing/codec code, then session state machines, then broker, then discovery). For each module: replace direct calls with events/intents, move any residual IO to an adapter, delete the ratchet entry, and add a determinism test (below) covering the module.
5. **Do not change protocol behavior while converting.** Byte-level wire compatibility must hold: run the existing Python-RNS interop/conformance suite after each module conversion.

## Enforcement mechanisms (implement ALL — layered detection)

**Static, compile-time:**
- Split protocol code into its own TypeScript project reference with `"lib": ["ES2022"]`, no `"dom"`, and no `@types/node`. Then `fetch`, `setTimeout`, `WebSocket`, `process`, and `fs` are *type errors* — the compiler itself enforces the boundary. This is the strongest single mechanism; do it even though it requires untangling tsconfigs.
- ESLint scoped to protocol roots: `no-restricted-globals`, `no-restricted-imports`, `no-restricted-syntax` (for `new Date()` and member expressions like `Math.random`), covering the full deny list. Error severity, no inline-disable allowed (`--no-inline-config` in CI, or eslint-comments/no-restricted-disable).
- dependency-cruiser rule: forbid any import path from protocol roots into `adapters/`, native modules, or node builtins. Emit the dependency graph as a CI artifact so violations are visible in review.
- A dedicated `package.json` for the protocol package with zero runtime dependencies except pure libraries (explicitly audited allowlist).

**Runtime tripwires (defense against what static analysis misses — e.g. dynamic access, `globalThis['set'+'Timeout']`):**
- Test bootstrap that, before importing protocol modules, replaces `Date.now`, `Math.random`, `setTimeout`, `fetch`, etc. on `globalThis` with functions that throw `SansIOViolation` including a stack trace. All unit and simulation tests run under this bootstrap.
- In the simulator, adapters are the only holders of real capabilities; the sim kernel asserts that every externally visible action was produced via a declared intent (any observed effect without a matching intent record fails the run).

**Behavioral (the ground-truth check — catches nondeterminism the deny list doesn't name):**
- Determinism test: run every simulation scenario twice from the same seed and assert the full event-trace hashes are byte-identical. Run this in CI on every PR; run cross-platform (linux + macos runners) nightly, since platform divergence exposes hidden environment reads.
- Fuzz the schedule: with the seed fixed, vary only the simulator's event-interleaving salt; state-machine outputs must depend only on event order actually delivered, and replay of a recorded trace must reproduce identical final state hashes.
- Add a canary: deliberately introduce one `Date.now()` in a scratch branch and verify every layer (tsc, eslint, tripwire, determinism diff) reports it. Document which layers caught it. If any layer misses, fix the layer before proceeding. Re-run this canary check whenever the enforcement config changes.

**CI gate summary** (all must pass to merge): tsc project build, eslint, dependency-cruiser, ratchet non-growth, determinism double-run, Python-RNS conformance suite.

## Acceptance criteria

- `sansio-ratchet.json` is empty.
- The protocol package compiles with no DOM/node libs and zero IO-capable dependencies.
- A full multi-node simulation scenario replays byte-identically from `(seed, config)` on two platforms.
- The canary experiment shows at least three independent layers catching a seeded violation.
- Wire compatibility with Python RNS is unchanged (conformance suite green).

Work incrementally: after the inventory and ratchet land, each subsequent PR should convert one module, shrink the ratchet, and keep every CI gate green. Never batch the whole migration into one change.