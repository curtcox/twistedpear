import { device, links, ui } from "@twistedpear/miniapp-sdk";

/** @type {Awaited<ReturnType<typeof links.peers>>} */
let roster = [];
/** @type {Awaited<ReturnType<typeof device.shareOffers>>} */
let offers = [];
let status = "Checking host-owned link and sharing state…";
/** @type {Awaited<ReturnType<typeof device.open>> | null} */
let activeSession = null;
/** @type {Awaited<ReturnType<typeof device.stream>> | null} */
let activeStream = null;
/** @type {ReturnType<typeof setInterval> | null} */
let mediaPump = null;

function capability(peer) {
  const camera = peer.readiness?.accepts.find((entry) => entry.classId === "camera");
  const mic = peer.readiness?.accepts.find((entry) => entry.classId === "microphone");
  if (peer.reachability === "unreachable" || peer.readiness === null) return "Unreachable";
  if (camera !== undefined && peer.readiness.downlinkBucket === "hd-video") return "HD video";
  if (camera !== undefined && peer.readiness.downlinkBucket === "sd-video") return "Video";
  if (mic !== undefined && ["hd-video", "sd-video", "audio"].includes(peer.readiness.downlinkBucket)) return "Audio";
  if (mic !== undefined && peer.readiness.downlinkBucket === "narrowband") return "Voice (narrowband)";
  return "Events only";
}

async function refresh() {
  const failures = [];
  try { roster = await links.peers(); } catch (error) { failures.push(`links: ${error.message}`); }
  try { offers = await device.shareOffers(); } catch (error) { failures.push(`sharing: ${error.message}`); }
  status = failures.length === 0 ? `Current · ${roster.length} peer(s)` : `Partial · ${failures.join("; ")}`;
}

/** @returns {import("@twistedpear/miniapp-runtime").WidgetNode} */
function peerRow(peer, index) {
  const caveat = peer.quality.source === "declared" && peer.quality.confidence === "low"
    ? `probably ${capability(peer).toLowerCase()} — not measured`
    : capability(peer);
  return {
    id: `peer-${index}`,
    type: "view",
    style: { gap: 4, padding: 8 },
    children: [
      { id: `peer-name-${index}`, type: "text", props: { value: peer.displayLabel }, style: { fontWeight: "bold" } },
      { id: `peer-cap-${index}`, type: "text", props: { value: `${caveat} · ${peer.reachability} · ${peer.plane}` } },
      { id: `peer-quality-${index}`, type: "text", props: { value: `${peer.quality.source} · ${peer.freshness} · ${Math.round(peer.quality.rttMs)} ms RTT` }, style: { fontSize: 12 } },
      { id: `measure-${index}`, type: "button", props: { label: "Measure now", event: `lc.measure.${index}` } }
    ]
  };
}

/** @returns {import("@twistedpear/miniapp-runtime").WidgetNode} */
function offerRow(offer, index) {
  return {
    id: `offer-${index}`,
    type: "view",
    style: { gap: 4 },
    children: [
      { id: `offer-label-${index}`, type: "text", props: { value: `${offer.classId} → ${offer.displayLabel} · ${offer.maxRung}` } },
      { id: `offer-revoke-${index}`, type: "button", props: { label: "Revoke in host", event: `lc.revoke.${index}` } }
    ]
  };
}

async function render() {
  /** @type {import("@twistedpear/miniapp-runtime").WidgetNode[]} */
  const children = [];
  children.push(
    { id: "title", type: "text", props: { value: "Line check" }, style: { fontSize: 24, fontWeight: "bold" } },
    { id: "subtitle", type: "text", props: { value: "Who can I call, and what am I sharing?" } },
    { id: "refresh", type: "button", props: { label: "Refresh", event: "lc.refresh" } },
    { id: "matrix-title", type: "text", props: { value: "Reachability matrix" }, style: { fontSize: 16, fontWeight: "bold" } }
  );
  if (roster.length === 0) {
    children.push({ id: "peers-empty", type: "text", props: { value: "No app-scoped peers are currently reachable." } });
  } else {
    children.push(...roster.map(peerRow));
  }
  children.push(
    { id: "sharing-divider", type: "divider" },
    { id: "sharing-title", type: "text", props: { value: "What I am sharing" }, style: { fontSize: 16, fontWeight: "bold" } },
    { id: "request-share", type: "button", props: { label: "Choose a peer and media in host", event: "lc.share" } }
  );
  if (offers.length === 0) {
    children.push({ id: "offers-empty", type: "text", props: { value: "No standing camera or microphone offers." } });
  } else {
    children.push(...offers.map(offerRow));
  }
  children.push(
    { id: "call-divider", type: "divider" },
    { id: "call-title", type: "text", props: { value: "Call surface" }, style: { fontSize: 16, fontWeight: "bold" } },
    { id: "remote", type: "remote-video", props: { peer: roster[0]?.peer.id ?? "none", session: "pending" } },
    { id: "call-note", type: "text", props: { value: "Backgrounding ends the session. Store-and-forward peers cannot connect while asleep." }, style: { fontSize: 12 } },
    { id: "status", type: "text", props: { value: status }, style: { fontSize: 12 } }
  );
  await ui.render({
    root: {
      id: "root",
      type: "scroll",
      style: { padding: 16, gap: 12 },
      children
    }
  });
}

ui.onEvent(async ({ event }) => {
  if (event === "lc.refresh") await refresh();
  else if (event === "lc.share") {
    const offer = await device.requestShareOffer("Start a Line Check call");
    if (offer === null) {
      status = "Share request cancelled in host";
    } else if (offer.targetKind !== "peer") {
      status = `Host allowed ${offer.classId} to ${offer.displayLabel}; group calls are not started by this sample`;
    } else {
      try {
        activeSession = await device.open({
          class: offer.classId,
          tier: offer.tierId,
          purpose: "Line Check call",
          rateHz: offer.classId === "microphone" ? 10 : 5,
          options: offer.classId === "microphone" ? { voiceDuplex: true } : {}
        });
        activeStream = await device.stream(activeSession, offer.targetId, { encoding: offer.maxRung });
        if (mediaPump !== null) clearInterval(mediaPump);
        let ticks = 0;
        mediaPump = setInterval(() => {
          if (activeSession !== null) void device.read(activeSession).catch(() => {});
          ticks += 1;
          if (ticks % 10 === 0 && activeStream !== null) void device.streams().then(async (streams) => {
            const current = streams.find((stream) => stream.handle === activeStream?.handle);
            if (current !== undefined && current.admission.rung !== activeStream.admission.rung) {
              activeStream = current;
              status = `Link adapted to ${current.admission.rung} · ${current.admission.reason}`;
              await render();
            }
          }).catch(() => {});
        }, 100);
        status = `Streaming ${offer.classId} to ${offer.displayLabel} · ${activeStream.admission.rung}`;
      } catch (error) {
        status = `Host allowed ${offer.classId}, but media did not start: ${error.message}`;
      }
    }
    offers = await device.shareOffers();
  } else if (event.startsWith("lc.measure.")) {
    const index = Number(event.slice("lc.measure.".length));
    const peer = roster[index];
    if (peer !== undefined) {
      const quality = await links.probe(peer.peer);
      await refresh();
      status = `Measured ${peer.displayLabel}: ${Math.round(quality.goodputBps)} bps · ${Math.round(quality.rttMs)} ms`;
    }
  } else if (event.startsWith("lc.revoke.")) {
    const offer = offers[Number(event.slice("lc.revoke.".length))];
    if (offer !== undefined) status = await device.revokeShareOffer(offer.id) ? "Share revoked" : "Revocation cancelled";
    offers = await device.shareOffers();
  } else return;
  await render();
});

await refresh();
await render();

void (async () => {
  try {
    for await (const offer of device.incoming()) {
      await device.accept(offer, offer.classId === "microphone" ? { kind: "speaker" } : { kind: "remote-video", widgetId: "remote" });
      status = `Receiving ${offer.classId} from ${offer.displayLabel} · ${offer.encoding}`;
      await render();
    }
  } catch (error) {
    status = `Incoming media unavailable: ${error.message}`;
    await render();
  }
})();
