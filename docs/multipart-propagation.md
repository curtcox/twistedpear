# Multipart LXMF propagation

<!-- tp-doc
lifecycle: reference
audited: 2026-07-21
register: none
-->

`@twistedpear/lxmf-ts` can carry a payload that does not fit one propagated LXMF packet by
splitting it into independently signed, store-and-forward messages. The receiver accepts the
parts in any order, persists an incomplete transfer, verifies the complete payload hash, and
deletes the checkpoint only after successful reassembly.

This is a TwistedPear payload convention, identified by the `TPMP` frame marker. Other LXMF
clients still receive valid LXMF messages, but need this framing implementation to reassemble
their contents.

## Sending and resuming

```ts
import { sendMultipartPropagation } from "@twistedpear/lxmf-ts";

const transfer = await sendMultipartPropagation({
  router,
  destination,
  source,
  title: "field/report",
  content,
  budgetBytes: 64 * 1024,
});
```

Persist `transfer.transferId` and the indexes acknowledged by the application. To resume,
decode that hexadecimal id and pass it back with the completed indexes:

```ts
await sendMultipartPropagation({
  router,
  destination,
  source,
  content,
  transferId,
  completedChunks: new Set([0, 1, 3]),
});
```

Only missing indexes are transmitted. A transfer id is 16 bytes and must not be reused for
different content or endpoints.

## Receiving and resuming

Desktop and CLI hosts should use the file-backed checkpoint store. It writes atomically with
mode `0600`:

```ts
import { FileMultipartCheckpointStore } from "@twistedpear/host-core";
import { MultipartPropagationReceiver } from "@twistedpear/lxmf-ts";

const receiver = new MultipartPropagationReceiver(
  router.provider,
  new FileMultipartCheckpointStore(checkpointPath),
  64 * 1024,
);

router.onDelivery((message) => {
  const part = receiver.ingest(message);
  if (part.complete && part.content !== null) consume(part.content);
});
```

Recreating the receiver with the same store resumes incomplete transfers. Duplicate and
out-of-order parts are safe. Every part is authenticated by LXMF; completion additionally
requires the exact advertised length and SHA-256 hash.

## Budgets and limits

- The default send and receive budget is **64 KiB**, matching the automatic bulk-transfer
  ceiling for an RNode-only path.
- Callers may lower that budget. Raising it is explicit and can never exceed **1,000,000
  bytes**, the propagation-store message ceiling.
- Frames carry **32 content bytes** each so the signed LXMF envelope stays on the proven
  packet propagation path; titles are limited to **16 UTF-8 bytes** for the same reason.
  This is reliable but expensive on a radio; it is not a bulk-file transport.
- Retrieve a bounded number of stored messages per propagation sync. A one-part-at-a-time
  sync is the conservative resume path when the response itself must stay within the link
  packet budget.
- This adds chunking, ordering, resume, integrity checking, and reassembly. It does not add
  attachments, group messaging, history synchronization, background mini-app execution, or
  propagation-node peering.

Use Reticulum Resources, `resource.fetch`, or content-addressed sharing for larger data when
the recipient can retrieve it. Multipart propagation is for bounded payloads that must wait
for an offline recipient.
