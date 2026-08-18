# 7. Messaging

<!-- tp-doc
lifecycle: live
audited: 2026-08-18
register: none
-->

Messaging is built into the platform itself, not into any one app. Chat is just the
simplest thing you can put on top of it.

## Sending a message

Open Chat, paste or scan the address of the person you want to reach, and type.

![Sending a message in Chat](/guide/images/07-chat-send.png)

**Screenshot 7.1 — Sending a message.** The Chat example app with a peer destination in
the peer field, this host's address in the header, and **Send hello** ready. Delivery
state lives on the LXMF path, not in a separate compose widget.

Every message is encrypted end to end. Peers that relay it — including your friend's
desktop node, and any stranger's transport node in between — can see that a packet passed
through them, but not what it says and not who sent it. Reticulum packets do not carry a
source address.

## The three ways a message travels

You do not choose between these; the host picks. It helps to recognise them in the
delivery indicator.

**Direct.** A link is established to the other host and the message goes straight there.
Fastest, and you get a confirmation when it arrives.

**Opportunistic.** For short messages when setting up a full link is not worth it. Sent
and forgotten — you find out it worked when they reply.

**Propagated.** The other person is offline, so the message is left with a **propagation
server** that holds it until they come back and collect it.

![Message delivery states](/guide/images/07-delivery-states.png)

**Screenshot 7.2 — Delivery states side by side.** A message list where four consecutive
messages show four different states: "sending", "delivered" with a checkmark, "held for
delivery" with a clock icon and a tooltip explaining a propagation server is holding it,
and "failed — no route" in red with a **Retry** action.

## When the other person is offline

Without a propagation server in reach, a message to an offline peer simply fails. This
surprises people who expect messaging apps to queue things forever, so it is worth being
direct about: **there is no cloud holding your messages.**

A propagation server is just a host with that role turned on — typically a desktop or a
small always-on machine that a community runs. If you or your friends run one, offline
delivery works. If nobody does, it does not.

![Turning on the propagation server role](/guide/images/07-propagation-role.png)

**Screenshot 7.3 — Enabling the propagation server role.** The desktop host's Settings →
Roles panel, showing Transport node (on), Seeder (on), and Propagation server being
switched on, with its quota controls appearing beneath: "Store up to 256 MiB / 10,000
messages" and a current-usage bar.

> **⚠️ Works, with limits — one propagation server at a time.** Your host syncs with a
> propagation server, but propagation servers do not yet share their stores with each
> other. That means a message left with one server is only collectable from that server.
> Communities that need a meshed store should run the reference `lxmd` software instead.
> See [docs/propagation-node.md](../docs/propagation-node.md) and
> [STATUS-SOFTWARE.md](../STATUS-SOFTWARE.md).

> **⚠️ Works, with limits — multipart propagation.** A host can split a bounded payload into
> independently held messages and resume/reassemble them after reconnecting. The default
> ceiling is 64 KiB, parts are deliberately tiny, and radio airtime rises quickly. This is
> for reports and other bounded payloads, not attachments or bulk files. See
> [multipart propagation](../docs/multipart-propagation.md).

## Spam and unwanted messages

There is no company to report someone to. Defence is structural instead:

- **Cost to send.** A peer can require senders to do a small amount of computation before
  a message is accepted, which is free for a person sending a few messages and expensive
  for someone sending a hundred thousand.
- **Your own lists.** Blocked senders are rejected before inbox delivery. Muted senders remain
  in history but do not trigger notifications.
- **No enumeration.** Addresses are not sequential and there is no directory, so there is
  nobody to bulk-mail.

The desktop host's **Settings → Safety** panel manages block and mute lists by authenticated
LXMF source hash. **Record report** saves the source, reason, optional message hash, note, and
timestamp locally. **Export reports** writes a JSON file you may choose to share; it does not
contact a company or silently transmit anything. See
[Local blocking, muting, and reports](../docs/local-moderation.md).

![The desktop Safety panel with a blocked sender and local report](/guide/images/07-local-safety.png)

**Screenshot 7.4 — Local safety controls.** A disposable authenticated source hash is blocked
and recorded as a local spam report. The summary makes the local-only scope visible.

> **⚠️ Works, with limits — local policy only.** There is no takedown, account ban, or
> network-wide report destination. The desktop settings UI is implemented; mobile and browser
> hosts do not expose these controls yet.

## What messaging does not do yet

> **⏳ Not yet available — group chat, attachments, and history sync.** Chat is
> one-to-one. There are no group conversations (the Board app is the closest thing:
> broadcast to subscribers), no file attachments inside a message — use the File drop app
> — and no way to see your conversation on a second device. Each host's history is its
> own.

## Next

Understand what you are actually trusting:
[Chapter 8 — Trust, privacy, and safety](08-trust-privacy-safety.md).
