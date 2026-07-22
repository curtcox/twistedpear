import { announce, storage, ui } from "@twistedpear/miniapp-sdk";

// The interesting constraint here is bytes. This announce payload is capped at 120
// bytes on purpose: on a LoRa link at a few hundred bits per second, a listing that
// costs a kilobyte is a listing that takes ten seconds of airtime to share.

const MAX_PAYLOAD_BYTES = 120;
const LISTINGS_KEY = "listings";
const STALE_MS = 7 * 24 * 60 * 60 * 1000;
const decoder = new TextDecoder();
const encoder = new TextEncoder();
const ANNOUNCE_NAMESPACE = "swap-shelf";

/** @type {{ from: string; item: string; at: number }[]} */
let listings = [];
let draft = "";
let status = "";

async function load() {
  const stored = await storage.kv.get(LISTINGS_KEY);
  if (stored === null) return;
  try {
    listings = JSON.parse(decoder.decode(stored));
  } catch (error) {
    listings = [];
  }
}

async function persist() {
  // Expiry is a local decision. Nothing revokes an announce, so every host decides
  // for itself when a listing has gone stale.
  const cutoff = Date.now() - STALE_MS;
  listings = listings.filter((row) => row.at >= cutoff).slice(-200);
  await storage.kv.set(LISTINGS_KEY, encoder.encode(JSON.stringify(listings)));
}

function payloadFor(item) {
  const payload = { i: item };
  const bytes = encoder.encode(JSON.stringify(payload)).length;
  return bytes > MAX_PAYLOAD_BYTES ? null : payload;
}

async function offer() {
  const item = draft.trim();
  const payload = payloadFor(item);
  if (payload === null) {
    status = `Too long — keep the whole payload under ${MAX_PAYLOAD_BYTES} bytes`;
    return;
  }
  await announce.publish(encoder.encode(JSON.stringify(payload)), ANNOUNCE_NAMESPACE);
  listings = [...listings, { from: "me", item, at: Date.now() }];
  draft = "";
  await persist();
  status = "Offered";
}

// subscribe resolves once with a snapshot of the announces already buffered for this
// namespace — not a live stream. Re-poll if you want to keep hearing new offers.
announce.subscribe(ANNOUNCE_NAMESPACE).then(async (events) => {
  for (const event of events) {
    let payload;
    try {
      payload = JSON.parse(decoder.decode(event.appData));
    } catch (error) {
      continue; // untrusted bytes from a stranger's code; skip anything unparseable
    }
    const item = payload?.i;
    if (typeof item !== "string") continue;
    listings = [...listings, { from: event.destination, item, at: Date.now() }];
    await persist();
    await render();
  }
});

async function render() {
  const remaining = MAX_PAYLOAD_BYTES - encoder.encode(JSON.stringify({ i: draft })).length;
  await ui.render({
    root: {
      id: "root",
      type: "view",
      style: { padding: 16, gap: 12 },
      children: [
        {
          id: "title",
          type: "text",
          props: { value: "Swap shelf" },
          style: { fontSize: 20, fontWeight: "bold" }
        },
        {
          id: "draft",
          type: "text-input",
          props: { value: draft, placeholder: "What are you offering?", event: "ss.draft" }
        },
        {
          id: "budget",
          type: "text",
          props: { value: `${remaining} bytes left in the payload budget` },
          style: { fontSize: 12 }
        },
        { id: "offer", type: "button", props: { label: "Offer it", event: "ss.offer" } },
        { id: "divider", type: "divider" },
        {
          id: "listings",
          type: "scroll",
          children: [
            {
              id: "listing-list",
              type: "list",
              style: { gap: 6 },
              children: [...listings]
                .reverse()
                .map((row, index) => ({
                  id: `listing-${index}`,
                  type: "text",
                  props: { value: `${row.item} — ${row.from.slice(0, 12)}` }
                }))
            }
          ]
        },
        { id: "status", type: "text", props: { value: status }, style: { fontSize: 12 } }
      ]
    }
  });
}

ui.onEvent(async ({ event, value }) => {
  if (event === "ss.draft" && typeof value === "string") draft = value;
  else if (event === "ss.offer") await offer();
  else return;
  await render();
});

await load();
await persist();
await render();
