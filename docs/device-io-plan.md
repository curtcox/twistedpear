# Device I/O plan — exposing every device capability to mini-apps

<!-- tp-doc
lifecycle: planned
audited: 2026-08-02
register: software
counterpart: docs/device-io.md
-->

**This document describes intended work, not current behaviour.** What is built today —
the shipped registry, session machine, broker path, and the per-host capability matrix —
is described in [Device I/O — current implementation](device-io.md). Where the two
disagree, that document wins.

This plan gives mini-apps access to **every I/O capability the device has** — GPS, camera,
screen, microphone, speaker, TTS, STT, gyroscope, accelerometer, flashlight, ambient light,
card reader, and whatever comes next — behind the capability broker, and lets each of those
streams be **processed locally** or **streamed to a peer** when the link has adequate
bandwidth.

When this plan was written the platform exposed **no device I/O to mini-apps at all**:
camera existed only as a host-chrome QR-install flow, and microphone and speaker only as a
peer-discovery effect boundary where PCM never crossed into the sandbox. Much of the plan
below has since landed — see [device-io.md](device-io.md) for what actually ships and
[platform capabilities status](platform-capabilities-status.md) for per-host state. The
plan is retained for the design rationale and for the phases that remain.

Companion plan: [Reticulum relay and configurable interfaces](relay-interfaces-plan.md). That
plan promotes camera/screen and mic/speaker into *packet transports* for relaying. This plan
exposes the same hardware as *application-visible devices*. They share drivers and permission
plumbing but are different planes and must not be conflated — see
[Boundary with the relay plan](#boundary-with-the-relay-plan).

## The four decisions this plan is built on

| Decision | Choice |
|---|---|
| What an app receives | **Tiered.** Host-derived results are the default tier; raw samples are a separate, harder-to-grant tier. |
| Network model | **Both directions, per-session consent.** A local app may push a device stream to a peer, and a peer may acquire a device on this host under a distinct remote grant with its own confirmation, indicator, and TTL. |
| Future devices | **Versioned device-class registry.** Capability strings stay closed and install-blocking; a normative registry grows by host-API version with a uniform open/read/stream/close shape. |
| Deliverable | This plan document. No code. |

## Scope and boundary

In scope: a device-class registry, the capability tiers and grant/consent model, a session and
streaming API in the SDK, host-side local processing, network streaming with bandwidth
admission control and graceful degradation, remote device acquisition by a peer, per-host
availability, and the spec/conformance artifacts that pin all of it.

Out of scope: changing the Reticulum wire format, the identity model, or LXMF; background
mini-app execution (still prohibited — [battery and bandwidth policy](battery-bandwidth-policy.md)
principle 3); and shipping vendor-specific native drivers, which land per host as ordinary
work once the contract exists.

### Boundary with the relay plan

| Question | Relay plan | This plan |
|---|---|---|
| What flows | Reticulum packets | Sensor samples and derived results |
| Who consumes | The Transport node | A granted mini-app, or a peer's mini-app |
| Camera means | An optical modem receiving framed packets | A camera the app can preview, analyze, or stream |
| Speaker means | An acoustic modem emitting framed packets | Audio output an app can drive, including TTS |
| Capability | `relay:configure`, `relay:read` | `device:*` (this plan) |

A device may not be held by both planes at once. The Device Manager and the relay plan's
Interface Manager share one **device arbitration lock** per physical device; whichever acquires
it first wins, and the other reports `busy` with an attribution string naming the holder.

## What existed to build on (as of 2026-07-23)

| Capability | Where | Status for this plan |
|---|---|---|
| Closed capability taxonomy, install-blocking unknown strings | [`capabilities.ts`](../packages/miniapp-runtime/src/capabilities.ts) | Extend with generated `device:*` ids; keep the closed-set guarantee. |
| Grant lifecycle machine with TTL, revoke, terminal phases | [`grant-machine.ts`](../packages/protocol/src/grant-machine.ts), [SPEC-CAP](../specs/spec-cap/spec.md) | Reuse unchanged. TTL is what makes short-lived device grants work. |
| Brokered, capability-checked, rate-limited RPC | [`broker.ts`](../packages/miniapp-runtime/src/broker.ts) | Reuse for control plane. **Not** suitable for sample data — see [Data path](#data-path-the-broker-is-not-a-media-bus). |
| Host-chrome confirmation the app cannot draw over | [`confirm.ts`](../packages/miniapp-runtime/src/confirm.ts), [SPEC-CHROME](../specs/spec-chrome/spec.md) | Add `ConfirmationKind` values for device sessions and remote acquisition. |
| Polling stream precedent (`chatStreamStart/Next/Cancel`) | [`services/ai.ts`](../packages/miniapp-runtime/src/services/ai.ts), [`sdk/ai.ts`](../packages/miniapp-sdk/src/ai.ts) | Reuse the *shape* for control and low-rate events; not the transport for media. |
| App-scoped opaque peer handles with a chosen data plane | [`sdk/peers.ts`](../packages/miniapp-sdk/src/peers.ts), `services/peers.ts` | Reuse as the addressing and consent primitive for remote streaming. |
| Host-side effect boundaries for mic PCM, camera/QR, ntfy | [`peer-discovery/src/{audio,qr,ntfy}.ts`](../packages/peer-discovery/src/) | Promote into the first two device drivers; the boundary already has the right shape. |
| Audio framing, reassembly, FSK modem | [`peer-audio-framing.ts`](../packages/protocol/src/peer-audio-framing.ts), [`peer-audio-fsk.ts`](../packages/protocol/src/peer-audio-fsk.ts) | Reuse for chunked sample transport and the acoustic path. |
| Interface ranking and bitrate table | [`policy.ts`](../packages/reticulum-interfaces/src/policy.ts) | The input to bandwidth admission control. |
| Host rate limiter and transfer budgets (524,288 B/s per direction) | [battery and bandwidth policy](battery-bandwidth-policy.md) | Streams must be admitted *inside* this budget, not beside it. |
| Two transport planes: Reticulum control plane, Pears bulk plane | [`bridge-hyper`](../packages/bridge-hyper/), [Pears bulk plane](../apps/handbook/content/part-1-concepts/pears-bulk-plane.md) | The two ends of the streaming ladder. |
| Host-rendered declarative widget tree | [`ui/schema.ts`](../packages/miniapp-runtime/src/ui/schema.ts) | Add preview surfaces so an app can *show* a camera it never receives frames from. |
| Native module pattern (Expo config plugins, Swift/Kotlin) | [`apps/harness-mobile/modules/`](../apps/harness-mobile/modules/) | The template for camera, location, motion, and torch modules. `peer-audio` already exists (iOS). |
| Sans-IO discipline, generated event alphabet | [AGENTS.md](../AGENTS.md), [`spec-events/schema`](../specs/spec-events/schema/) | Session and admission machines are pure; drivers live in adapters. |

## Target architecture

```
   mini-app (granted)                        host chrome / settings
        │ device.*  (control: open/close/configure — brokered RPC)
        │ device stream handle (data: samples — sidecar channel)
        ▼                                            ▼
 ┌──────────────────────────────────────────────────────────────────┐
 │                         Device Manager                            │
 │  • device-class registry + per-host inventory & availability      │
 │  • arbitration lock (shared with relay Interface Manager)         │
 │  • session lifecycle, tier enforcement, rate & duty-cycle caps    │
 │  • active-use indicators, attribution, audit log                  │
 └───┬──────────────────┬───────────────────┬───────────────────┬────┘
     │                  │                   │                   │
     ▼                  ▼                   ▼                   ▼
 ┌────────┐      ┌─────────────┐    ┌──────────────┐   ┌───────────────┐
 │ Drivers│      │ Processors  │    │ Stream        │   │ Remote        │
 │(effects│      │(host-side:  │    │ Admission     │   │ Acquisition   │
 │adapters│      │ STT, QR,    │    │ + Degradation │   │ (peer asks    │
 │ per    │      │ vision,     │    │ ladder        │   │  for a device │
 │ host)  │      │ geofence,   │    │               │   │  on this host)│
 └───┬────┘      │ TTS, VAD)   │    └───────┬───────┘   └───────┬───────┘
     │           └──────┬──────┘            │                   │
  hardware              │                   ▼                   ▼
                        │        ┌──────────────────────────────────┐
                        └───────►│ transport plane selection         │
                                 │ WebRTC/direct · Pears bulk ·      │
                                 │ Reticulum link · LXMF · CAS store │
                                 └──────────────────────────────────┘
```

The Device Manager is the single owner of "which devices exist, who is using them, at what
tier, at what rate, and for how long." Everything else — SDK, host settings UI, remote peers —
mutates or observes that one state.

## Device-class registry

The registry is the extensibility mechanism. It is a **normative artifact** (`SPEC-DEVICE`,
see [Specs to add](#specs-to-add)) with a JSON schema, a generated TypeScript table, and
golden vectors — the same four-representation discipline [SPEC-CAP](../specs/spec-cap/spec.md)
sets as the bar.

Each entry declares:

```ts
interface DeviceClassEntry {
  readonly id: string;                    // "camera", "location", "motion", …
  readonly role: "sensor" | "actuator" | "transducer" | "service";
  readonly addedInHostApi: string;        // "0.10.0" — drives minHostApi negotiation
  readonly tiers: ReadonlyArray<DeviceTier>;
  readonly sampleSchema: string;          // $ref into the SPEC-DEVICE schema
  readonly defaults: {
    readonly maxRateHz: number;           // hard ceiling the host enforces
    readonly maxSessionMs: number;        // session TTL before re-consent
    readonly dutyCycle?: number;          // for actuators (torch, speaker)
  };
  readonly streamable: boolean;           // may be streamed to a peer at all
  readonly remoteEligible: boolean;       // a peer may acquire it (see remote model)
  readonly bandwidth: BandwidthProfile;   // min / target / burst, per tier & encoding
  readonly consentClass: "low" | "elevated" | "sensitive";
}
```

A new device class is **a registry entry plus a driver**. It adds no new SDK methods, no new
broker namespace, and no new UI shape — that is the point of the uniform session API below.
Capability ids are *generated* from the registry, so `CAPABILITY_DEFINITIONS` stays a closed,
install-blocking set while the registry is the thing that grows.

### Initial registry (host API 0.10.0)

| Class | Role | Derived tier (default) | Raw tier (opt-in) | Notes |
|---|---|---|---|---|
| `location` | sensor | `coarse` — ~1 km cell, ≤ 1 fix/min | `precise` — full fix, speed, heading, altitude | Coarse is computed host-side by quantizing; the app never sees the precise fix. |
| `camera` | sensor | `derived` — barcode/QR payloads, motion events, face/object counts, downscaled thumbnails ≤ 1 fps | `frames` — full-rate frames | Preview to the user needs *neither* tier — see [preview surfaces](#preview-surfaces-showing-without-seeing). |
| `microphone` | sensor | `derived` — level, VAD, transcript (via `stt`), tone/DTMF | `pcm` — raw PCM | Existing effect boundary becomes the driver. |
| `motion` | sensor | `derived` — orientation quaternion, step/shake/tilt events, ≤ 10 Hz | `samples` — accel/gyro/magnetometer at device rate | One class, three physical sensors; fusion is host-side. Raw high-rate motion is a known fingerprinting and keystroke-inference vector. |
| `ambient-light` | sensor | single tier — quantized lux, ≤ 1 Hz | — | No raw tier needed. |
| `proximity`, `barometer`, `thermometer`, `hygrometer` | sensor | single tier — scalar, rate-capped | — | Registry entries land with their drivers; no API change. |
| `screen-capture` | sensor | `derived` — user-selected region, downscaled, ≤ 1 fps | `frames` | `sensitive`. Always an explicit per-session picker in host chrome; never a silent whole-screen grab. |
| `torch` | actuator | single tier | — | Hard strobe-rate cap (see [actuator safety](#actuator-and-output-safety)). |
| `speaker` | actuator | `play` — app supplies an asset id or TTS text | `pcm` — raw PCM out | `play` covers most apps and cannot be used to emit arbitrary ultrasonic carriers. |
| `tts` | service | single tier — text in, speech out | — | Composes `speaker`; text is bounded and logged. |
| `stt` | service | single tier — transcript out | — | Composes `microphone`; the transcript is the derived tier of mic. |
| `nfc` | transducer | `ndef` — read/write NDEF tags | `apdu` — raw APDU exchange | The "card reader". `apdu` is `sensitive` and **payment applets are blocklisted** — see below. |
| `biometric` | service | single tier — assertion only | — | Returns a signed pass/fail assertion. Templates never leave the OS enclave; there is no raw tier and never will be. |
| `haptics` | actuator | single tier | — | Duty-cycle capped. |
| `battery`, `thermal` | sensor | single tier — coarse buckets | — | Precise battery curves are a fingerprinting vector; buckets only. |

Deliberately excluded from any tier, permanently: payment credentials (PAN, track data,
EMV payment applets), biometric templates, and the raw contents of the secure enclave. The
`nfc:apdu` tier rejects AIDs on a payment blocklist at the driver, not at the app's discretion.
An app that wants payment must use the OS's own payment sheet, which is outside this platform.

### Growth path

Adding `lidar`, `uwb-ranging`, `air-quality`, or a class nobody has thought of yet is:

1. A registry entry (schema-validated, with bandwidth profile and consent class).
2. Generated capability ids appear in `CAPABILITY_DEFINITIONS` and the trust descriptions.
3. A driver per host that can support it; every other host reports `unsupported`.
4. `addedInHostApi` bumps `HOST_API_VERSION`; older apps are unaffected, and apps that need
   the class declare `minHostApi`.

Because unknown capability strings still block install, an app built against a newer registry
fails closed on an older host with a clear "update your host" message, rather than silently
losing a sensor.

## Capability and consent model

### Capability ids

Generated as `device:<class>` for the default tier and `device:<class>:<tier>` for elevated
tiers — e.g. `device:location`, `device:location:precise`, `device:camera`,
`device:camera:frames`, `device:microphone:pcm`, `device:nfc:apdu`. Holding an elevated tier
implies the default tier; the reverse is never true.

Two cross-cutting capabilities:

- **`device:stream`** — may stream *any* device data it already holds to a peer. Streaming is
  never implied by a device grant alone; sending a sensor off-device is its own decision.
- **`device:remote`** — may *request* a device on a peer's host. On the requesting side this
  is a normal capability; on the serving side it is not an app capability at all, it is a
  host-owned policy plus per-session confirmation.

### Three consent classes

| Class | Examples | Gate |
|---|---|---|
| `low` | `ambient-light`, `battery`, coarse `location`, `haptics` | Install-time grant only. |
| `elevated` | `camera` derived, `microphone` derived, `motion` derived, `torch`, `speaker`, `tts`, `stt`, precise `location` | Install-time grant **plus** a host-chrome session confirmation on first use per session, with a visible active-use indicator for the session's duration. |
| `sensitive` | `camera:frames`, `microphone:pcm`, `screen-capture`, `nfc:apdu`, anything streamed off-device, anything acquired remotely | Install-time grant **plus** per-session confirmation naming the app, the device, the tier, the destination (local or a named peer), and the duration — **every session, no remember-me**. Short TTL. Persistent, non-dismissible indicator. |

The grant lifecycle machine already supports exactly this: `approve` requires a `ttlMs` and
always sets `expiresAt`, and terminal phases are unrevivable. Sensitive device grants get short
TTLs (default 15 minutes of session time, configurable down) so that a stale grant cannot be
resurrected by a background app weeks later. No code change to
[`grant-machine.ts`](../packages/protocol/src/grant-machine.ts) is expected — this is a policy
layer on top of it.

New `ConfirmationKind` values in [`confirm.ts`](../packages/miniapp-runtime/src/confirm.ts):
`device-session`, `device-stream`, `device-remote-grant`. Each carries a structured summary the
chrome renders itself; the app supplies only a purpose string, which is displayed as
app-authored text and never as chrome-authored assurance.

### Active-use indicators and attribution

Any live `elevated` or `sensitive` session drives a host indicator that the mini-app cannot
draw over, occlude, or dismiss, showing device, app, tier, and destination. Desktop uses a tray
badge and window chrome; mobile uses the platform's own recording indicator plus an in-app
banner; web relies on the browser's indicator plus host chrome; headless writes to the status
endpoint and logs. Killing the session from the indicator is always one interaction away.

Every session open, tier escalation, stream start, degradation step, and close is written to
the broker audit log ([`BrokerAuditEntry`](../packages/miniapp-runtime/src/broker.ts)) extended
with device fields, and is queryable by the user.

## Session API

One shape for every class, present and future:

```ts
// discovery — no capability required, returns only what this host has
device.inventory(): Promise<ReadonlyArray<DeviceDescriptor>>;
  // { class, tiers, availability, maxRateHz, streamable, remoteEligible }
device.diagnostics(): Promise<ReadonlyArray<DeviceDiagnostic>>;
  // availability: "available" | "permission-required" | "unsupported" | "busy" |
  //               "policy-disabled" | "offline"   — mirrors peers.diagnostics()

// session lifecycle — capability + consent class gates apply
device.open(request: DeviceOpenRequest): Promise<DeviceSession>;
  // { class, tier?, purpose, rateHz?, options?, target?: PeerHandle, maxDurationMs? }
device.close(session: DeviceSession): Promise<void>;
device.configure(session: DeviceSession, patch: DeviceOptionsPatch): Promise<void>;

// reading
device.read(session: DeviceSession): Promise<DeviceSample>;          // one-shot
device.subscribe(session: DeviceSession): AsyncIterable<DeviceSample>; // events / low rate
device.stream(session: DeviceSession, to: PeerHandle,
              constraints?: StreamConstraints): Promise<StreamHandle>; // to a peer

// writing (actuators)
device.write(session: DeviceSession, command: DeviceCommand): Promise<void>;
  // torch on/off, speaker play, tts speak, haptics pattern, nfc write
```

`DeviceSession` is an **opaque host-issued handle**, exactly like `PeerHandle` — no OS handle,
path, or device id ever crosses into the sandbox. Sessions are app-scoped, TTL-bounded, and
revoked on app suspend, on grant revocation, and on host policy change.

Errors follow the existing typed-error convention (`DeviceError` with codes
`DEVICE_UNSUPPORTED`, `DEVICE_BUSY`, `DEVICE_DENIED`, `DEVICE_RATE_EXCEEDED`,
`DEVICE_TIER_REQUIRED`, `DEVICE_BANDWIDTH_INSUFFICIENT`, `DEVICE_SESSION_EXPIRED`).

### Preview surfaces: showing without seeing

Add host-rendered widget kinds to [`ui/schema.ts`](../packages/miniapp-runtime/src/ui/schema.ts):
`camera-preview`, `audio-meter`, `waveform`, `map-preview`, `remote-video`. The host draws
live device output into a region the app lays out but cannot read back — the same trick the
declarative widget tree already plays for `code-editor` and `qr-code`.

This matters more than it sounds: a QR scanner, a document camera, a level meter, a video-call
UI, and a "point your phone at the thing" flow all become buildable at the *derived* tier, with
the app never holding a single frame. It is the single biggest reason the tiered default is not
crippling, and it is why `camera:frames` should stay rare enough that granting it means
something.

## Local processing

Host-side processors turn raw device output into the derived tier. They run in the host, never
in the sandbox, and are the only consumer of raw data for `derived`-tier sessions.

| Processor | Feeds | Implementation posture |
|---|---|---|
| Barcode/QR decode | `camera:derived` | Reuse [`peer-discovery/src/qr.ts`](../packages/peer-discovery/src/qr.ts). |
| Motion/scene events, object & face **counts** | `camera:derived` | Platform vision APIs where present; a bundled model otherwise. Counts and bounding boxes only — **no identity, no recognition, no matching against a gallery**. |
| Thumbnail downscale | `camera:derived` | Fixed ladder (160/320/640 px), rate-capped. |
| VAD, level, tone/DTMF | `microphone:derived` | Reuse the existing PCM effect boundary and FSK work. |
| STT | `stt`, `microphone:derived` | On-device engine by default. A host-configured cloud engine is opt-in, disclosed at consent time, and refused for `sensitive` sessions unless the user explicitly allows it. |
| TTS | `tts` | Platform synthesizer. |
| Sensor fusion, step/shake/tilt | `motion:derived` | Pure function over raw samples; belongs in `packages/protocol` (Sans-IO), driven by adapter-supplied samples. |
| Geofence, quantization | `location:coarse` | Pure; Sans-IO. |

Processors are pure-where-possible so they are testable from recorded sample tapes. The
[`spec-events/tapes`](../specs/spec-events/tapes/) precedent applies directly: record a device
tape once, replay it in CI forever, and no camera is needed to test a QR pipeline.

An app may also do its own processing — that is what the raw tiers are for. The point is that
choosing to do so is a visible, separately-granted decision.

## Streaming to a peer

### Plane selection

Reticulum is a control plane with hard bandwidth limits; media does not belong on it by
default. The selection order, computed per stream:

| Plane | Used when | Typical fit |
|---|---|---|
| Direct/WebRTC data plane (via `peers`) | Peer reachable over IP, NAT traversal succeeds | Real-time A/V, low latency |
| Pears bulk plane (Hyperdrive/Hyperswarm) | IP present, latency tolerant | Recordings, batches, replayable capture |
| Reticulum link | No IP path, or the only path is mesh | Derived events, telemetry, low-rate audio |
| LXMF message | Intermittent, store-and-forward | Periodic samples, alerts |
| CAS + announce | No live path at all | Snapshots the peer fetches later |

The `dataPlane` field already on [`PeerSummary`](../packages/miniapp-sdk/src/peers.ts) is the
existing hook; streams extend it rather than inventing parallel addressing.

### Bandwidth admission control

This is the "provided a connection of adequate bandwidth is available" requirement, made
enforceable rather than aspirational. Before a single sample leaves the device:

1. **Demand.** The registry's `BandwidthProfile` for (class, tier, encoding, rate) yields
   `minBps`, `targetBps`, and `burstBytes`.
2. **Supply.** Rank the candidate path with
   [`policy.ts`](../packages/reticulum-interfaces/src/policy.ts) `effectiveBitrate`, corrected
   by measured goodput where a measurement exists, and reduced by the host limiter's
   uncommitted headroom (default 524,288 B/s per direction, shared with relay, Hyperdrive, and
   package fetches — streams are admitted *inside* that budget, never beside it).
3. **Decide.** `accept` at the requested quality · `degrade` to the highest rung the link
   sustains · `defer` (queue for a better path, with a bounded local ring buffer) ·
   `reject` with `DEVICE_BANDWIDTH_INSUFFICIENT` and the numbers that produced the refusal.
4. **Adapt.** Watch delivered goodput and queue depth; downshift immediately on sustained
   deficit, upshift only after a hysteresis window. Every transition is an audited event the
   app can observe, so a video app can honestly tell its user "this link only carries audio."

The decision function is **Sans-IO and pure**: measurements in, decision out, no clocks or
sockets. That makes it model-checkable and lets the simulator campaign
([`sim-campaign`](../packages/sim-campaign/)) explore it against adversarial link profiles.

### Degradation ladders

Declared per class in the registry, so a new device class ships its own ladder:

- **camera** — 720p30 → 480p15 → 240p10 → thumbnails 1 fps → derived events only → snapshot to CAS
- **microphone** — 48 kHz PCM → 16 kHz Opus → 8 kHz narrowband → VAD + transcript → transcript only
- **location** — 1 Hz precise → 0.1 Hz precise → coarse on movement → coarse on demand
- **motion** — full rate → 10 Hz → event summaries → nothing

Note the bottom of every ladder: derived data. On a LoRa link at hundreds of bps, "stream my
camera" degrades honestly into "send a line of text when something moves" — which is exactly
the right behavior for this platform and is why the derived tier is infrastructure, not just a
privacy control.

Metered-link and battery policy applies on top: on a metered or low-battery host, sensitive
streams start at a lower rung and require re-confirmation to climb.

## Remote acquisition

A peer asking to open a device on *this* host is the highest-risk path in this plan, so it is
the most constrained.

- **Off by default, globally.** A host does not answer remote device requests at all until the
  user enables the feature.
- **Per-peer, per-class, per-tier grant.** The user grants "this named peer may open my
  `camera` at `derived` tier for 30 minutes," through host chrome, never through an app.
  Grants are stored against the peer's Reticulum identity, are TTL-bounded, revocable, and
  survive nothing — no implicit renewal.
- **Confirmation every session** for `sensitive` classes, with the peer's verified label and
  the purpose string shown as untrusted, peer-authored text.
- **Indicator and kill switch** identical to local sensitive sessions, plus a persistent
  "remote peer is using your camera" state that cannot be backgrounded away.
- **The requesting app's `device:remote` capability governs only its side.** It confers nothing
  on the serving host. A malicious app cannot escalate by asking harder.
- **Rate, duration, and concurrency caps** are enforced by the serving host's Device Manager,
  not negotiated by the requester.
- **No transitive delegation.** A peer that acquires a device may not re-serve it to a third
  peer; the stream terminates at the granted peer.

Remote acquisition rides the same session machine as local acquisition, with the consent
authority relocated to the serving host. That symmetry is what keeps the surface small.

## Actuator and output safety

Outputs are not the safe half of I/O. Specific caps, enforced in the driver where the app
cannot reach them:

- **Torch and screen flash**: strobe rate hard-capped below photosensitive-epilepsy thresholds
  (no user-controllable 3–60 Hz flashing); duty cycle capped for thermal reasons.
- **Speaker**: volume ceiling respecting the OS media volume; no ultrasonic emission from the
  `play` tier (`speaker:pcm` may, and is `sensitive` partly for that reason — ultrasonic
  beacons are a real cross-device tracking technique).
- **Haptics**: duty-cycle capped.
- **TTS**: bounded text length and rate; no silent background speech.
- **NFC write**: confirmed per write, with the payload shown.
- **All actuators** stop on session end, app suspend, and host focus loss.

## Per-host availability

Availability is reported by `device.inventory()` and `host.info()`, never asserted in prose —
the same discipline as the [live difference matrix](../apps/handbook/content/part-2-hosts/difference-matrix.md).

| Class | Desktop | Android | iOS | Web | Headless |
|---|---|---|---|---|---|
| `location` | coarse (IP/WiFi) | full | full | browser geolocation | none |
| `camera` | full | full | full | `getUserMedia` | none |
| `microphone`, `speaker` | full | full | full | `getUserMedia` / WebAudio | none |
| `tts`, `stt` | platform | platform | platform | Web Speech (uneven) | optional engine |
| `motion` | none | full | full | sensor APIs, permission-gated | none |
| `ambient-light`, `proximity`, `barometer` | rare | common | partial | mostly unavailable | none |
| `torch`, `haptics` | none | full | full | torch via track constraints | none |
| `nfc` | reader-dependent | full | restricted (Core NFC limits) | WebNFC (Chrome/Android only) | reader-dependent |
| `screen-capture` | full | full (MediaProjection) | restricted | `getDisplayMedia` | none |
| `biometric` | platform | full | full | WebAuthn | none |

iOS constraints from [LIMITATIONS.md](../LIMITATIONS.md) §4 apply directly: no background
device sessions, and downloaded-code review scrutiny means the derived-default posture, the
host-rendered preview surfaces, and the closed capability registry are not merely nice design —
they are the argument that the platform mediates hardware access rather than handing it to
arbitrary downloaded code. New native modules are needed on mobile for camera, location,
motion, torch, and NFC, following the
[`modules/`](../apps/harness-mobile/modules/) pattern; `peer-audio` already exists on iOS.

## Data path: the broker is not a media bus

Today every sandbox call goes through [`broker.ts`](../packages/miniapp-runtime/src/broker.ts)
with a per-app rate limit (60 msg/s default), a max message size, and
[`json-wire.ts`](../packages/miniapp-runtime/src/sandbox/json-wire.ts) encoding — which turns a
`Uint8Array` into a JSON array of numbers, roughly a 4–6× expansion plus parse cost. A 1080p
frame or 48 kHz PCM through that path is not a performance problem, it is a non-starter.

The plan therefore splits the two:

- **Control plane** — `open`, `close`, `configure`, `read`, low-rate `subscribe`: the existing
  broker, unchanged, capability-checked, audited. This is where all the security lives.
- **Data plane** — a **device stream sidecar** established *only* after the broker authorizes a
  session, carrying a compact binary frame format (fixed header + payload, reusing the chunking
  in [`peer-audio-framing.ts`](../packages/protocol/src/peer-audio-framing.ts)):
  - Node worker and Electron backends: `postMessage` with transferable `ArrayBuffer`.
  - Browser worker backend: transferables, or `SharedArrayBuffer` ring buffer where
    cross-origin isolation is available.
  - Compartment/worklet backends: a bounded shared ring buffer.
  - Fallback for any backend without zero-copy: chunked binary over the existing wire, with the
    registry rate cap lowered accordingly and the app told the effective ceiling.

The sidecar is a *capability-derived* channel: it exists only for the lifetime of an authorized
session, carries exactly one session's data, is closed by the host unilaterally, and never
carries control messages. Backpressure is explicit — the host drops oldest samples and reports
the drop rather than growing an unbounded queue.

For `derived`-tier sessions the sidecar is usually unnecessary; the existing broker handles a
transcript or a QR payload fine. This is another way the derived default pays for itself.

## Configuration surface

A "Devices & Sensors" screen in every host, backed by the same Device Manager:

- **Desktop** ([`apps/host-desktop`](../apps/host-desktop/)) — per-class rows with availability,
  which apps hold grants, live sessions with kill buttons, remote-peer grants, per-app history,
  and global toggles (e.g. "never allow raw camera", "never answer remote device requests").
- **Mobile** ([`apps/harness-mobile`](../apps/harness-mobile/)) — the same, plus OS permission
  state per class and a one-tap global sensor kill.
- **Web** — the browser-supported subset, with everything else shown as `unsupported`.
- **Headless / CLI** — config file plus flags, with the localhost `/status` endpoint extended
  with the device inventory and active sessions.

Host policy is authoritative over app grants in both directions: a host-disabled class reports
`policy-disabled` even to a granted app, and a host cap on rate or duration silently clamps
rather than failing, with the clamp reported to the app.

## Security, privacy, and safety

- **Tiering is the whole defense.** Most apps get results, not sensors. The blast radius of a
  compromised or malicious app is bounded by what it was granted, and the sensitive tiers are
  designed to be conspicuous enough that users grant them rarely.
- **Sensor fusion is a real deanonymization risk.** An app holding `motion:samples` +
  `location:precise` + `microphone:pcm` can infer far more than any one grant suggests. The
  grant review screen must show *combinations*, not just a list, and the host should warn on
  known-dangerous combinations.
- **Fingerprinting.** Raw sensor calibration data, precise battery curves, and full-rate motion
  are strong device fingerprints. Quantize by default; expose exact values only at raw tiers.
- **Side channels.** Ultrasonic audio (cross-device tracking) and high-rate accelerometer
  (keystroke and speech inference) are the two documented ones. Both are confined to
  `sensitive` tiers with explicit disclosure.
- **Streaming is a separate decision from sensing.** `device:stream` exists so that "this app
  may use my camera" never silently means "this app may send my camera somewhere."
- **Remote acquisition is off until the user turns it on**, and is per-peer, per-class,
  TTL-bounded, and non-transitive.
- **Indicators must be unforgeable.** Host chrome only; the widget tree cannot draw them, and a
  mini-app cannot occlude them. This is already the model for `apps:*` confirmations.
- **Uninstall and revocation** stop all sessions immediately, drop remote grants issued on
  behalf of that app, and clear the sidecar.
- **Audit everything.** Every session, escalation, stream, and degradation step is logged and
  user-visible. Users should be able to answer "what has looked at my camera this week."

## Testing and conformance

- **Registry conformance** — schema validation, generated capability ids match
  `CAPABILITY_DEFINITIONS`, every entry has a bandwidth profile, ladder, and consent class,
  and `addedInHostApi` is consistent with `HOST_API_VERSION`.
- **Session machine** — Sans-IO unit tests plus a TLA+ model for the device-session lifecycle
  (open → active → degraded → closed/expired/revoked), cross-checked against the executable
  table and Layer-3 vectors, following the [SPEC-CAP](../specs/spec-cap/spec.md) exemplar.
- **Admission control** — pure decision-function vectors over a matrix of demand profiles and
  measured link conditions; property test that no accepted stream can exceed the host limiter's
  headroom.
- **Tier enforcement (negative controls)** — a derived-tier session must never emit a raw
  sample; a hostile-app test calling every raw method with only derived grants; a test that the
  sidecar refuses control messages; a test that preview surfaces never round-trip pixels.
- **Recorded device tapes** — camera/mic/motion/location tapes recorded once, replayed in CI, so
  the entire processor and streaming stack is testable with no hardware.
- **Simulated links** — stream the tapes across simulated LoRa/BLE/LAN profiles and assert the
  ladder lands on the right rung; extend [`sim-campaign`](../packages/sim-campaign/) and
  [`sim-adversaries`](../packages/sim-adversaries/) with a peer that lies about its bandwidth.
- **Remote acquisition** — two simulated hosts; assert consent is required every time for
  sensitive classes, TTLs expire mid-stream and terminate it, revocation is immediate, and
  delegation to a third peer is refused.
- **Actuator caps** — strobe-rate, duty-cycle, volume, and ultrasonic limits are asserted at the
  driver boundary.
- **Handbook coverage gate** — every capability id must be exercised by at least one Handbook
  applet; device-gated ones report `device-gated` with a guided procedure, matching the existing
  [`camera-qr-scan`](../apps/handbook/content/applets/camera-qr-scan/main.js) pattern.
- **Hardware-gated** — real sensors on real devices, cross-device streaming, NFC readers, and
  battery cost of live sessions, tracked in [STATUS-HARDWARE.md](../STATUS-HARDWARE.md).

## Specs to add

| Spec | Contents |
|---|---|
| `specs/spec-device/` | The device-class registry (normative JSON schema + generated table + vectors), tier semantics, session lifecycle machine with TLA+ model, error taxonomy. The registry is the artifact everything else generates from. |
| `specs/spec-stream/` | Sample framing, encodings per class, the degradation ladders, and the admission decision function with vectors. |
| Extend `specs/spec-cap/` | Device consent classes, session TTL policy, and the generated-capability rule. |
| Extend `specs/spec-chrome/` | The three new confirmation kinds and the indicator/attribution requirements. |
| Extend `specs/spec-widget/` | Preview surface widget kinds and the no-read-back property. |
| Extend `specs/spec-events/` | Device events and intents in the generated alphabet ([`types.gen.ts`](../packages/effects/src/types.gen.ts) is regenerated, not hand-edited). |

## Phasing

1. **Foundation.** `SPEC-DEVICE` registry (schema, generated table, vectors); Device Manager
   with inventory, availability, arbitration lock, and session lifecycle; generated `device:*`
   capabilities and trust descriptions; consent classes and the new confirmation kinds; `device`
   SDK namespace with `inventory`/`diagnostics`/`open`/`close`/`read`; `host.info()` device
   inventory. Two classes end-to-end at derived tier — `location:coarse` and `ambient-light` —
   because they are low-risk and prove the whole path. `HOST_API_VERSION` → `0.10.0`.
2. **Derived-tier sensors and processors.** `camera:derived` (reusing the QR effect boundary),
   `microphone:derived`, `stt`, `motion:derived`, `location:precise`; host-side processors with
   recorded tapes; preview surface widgets; desktop and mobile "Devices & Sensors" screens;
   active-use indicators and audit UI.
3. **Actuators.** `torch`, `speaker:play`, `tts`, `haptics`, `nfc:ndef`, with driver-level
   safety caps and confirmation flows.
4. **Raw tiers and the sidecar.** The device stream sidecar across all sandbox backends;
   `camera:frames`, `microphone:pcm`, `motion:samples`, `screen-capture`; tier-enforcement
   negative controls; fingerprinting mitigations.
5. **Streaming to a peer.** `device:stream`; plane selection; the admission decision function
   and its model; degradation ladders; simulated-link conformance; metered/battery policy
   integration.
6. **Remote acquisition.** `device:remote`; serving-host policy, per-peer grants, confirmation,
   indicators, caps, non-delegation; two-host conformance.
7. **Hardening and growth.** `nfc:apdu` with the payment blocklist, `biometric`, remaining
   scalar sensors; hardware-gated conformance; docs (a per-class reference page set mirroring
   [ble-interface.md](ble-interface.md)); a "add a device class" runbook proving the registry
   path works end-to-end for a class not in the initial set.

Phases 1–3 deliver a genuinely useful platform on their own: scanners, navigation, voice
input, audio output, and NFC apps all land before any raw sample or any byte leaves the device.

## Open questions to resolve during design

- **Sidecar on the web host.** `SharedArrayBuffer` needs cross-origin isolation, which the web
  host may not always have. Is a reduced rate cap acceptable, or does the web host need a
  different sandbox posture for raw tiers?
- **Codec dependencies.** Opus and H.264/VP8 for streaming mean either platform codecs (uneven
  across hosts) or bundled ones (size, and a patent surface). Which classes require a codec, and
  which can ship with raw-or-derived only in v1?
- **On-device model footprint.** STT and vision processors need models. Bundled (size),
  downloaded (a new signed-artifact path), or platform-provided (uneven)?
- **Tier escalation mid-session.** May an app hold a derived session and escalate to raw with a
  fresh confirmation, or must it close and reopen? Reopening is simpler and more auditable;
  escalation is better UX for "scan, then record."
- **Remote grant persistence.** Should a per-peer device grant ever survive a host restart, or
  always require re-granting? Current lean: never survives, since these are the highest-risk
  grants in the system.
- **Relay arbitration UX.** When the relay plan's acoustic interface holds the microphone and an
  app asks for it, who wins and how is the conflict presented? Current lean: first holder wins,
  the loser gets `busy` with attribution, and the user resolves it in host chrome.
- **Whether `screen-capture` belongs in v1 at all**, given it is the class most likely to draw
  App Review attention on iOS and the one with the worst abuse-to-utility ratio.
