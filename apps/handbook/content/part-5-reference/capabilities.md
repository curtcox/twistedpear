# Capabilities


<!-- tp-doc
lifecycle: live
audited: 2026-07-21
register: none
-->

Generated from `CAPABILITY_DEFINITIONS` in `packages/miniapp-runtime`.
Every id below must be exercised by at least one Handbook applet (coverage gate).

- **`identity`** — Use an app-scoped identity for signing and addressing.
- **`presence`** — Read coarse peer/interface presence and host info.
- **`announce:subscribe`** — Receive announces in the app namespace.
- **`announce:publish`** — Publish the app destination.
- **`lxmf:send`** — Send LXMF messages from the app destination.
- **`lxmf:receive`** — Receive LXMF messages for the app destination.
- **`storage:kv`** — Store local key/value data for this app.
- **`storage:hyperbee`** — Store ordered local Hyperbee data for this app.
- **`resource:fetch`** — Fetch package resources through host budget rules.
- **`workspace`** — Read and write project source files in this app's private workspace.
- **`ai:chat`** — Send prompts to the host-configured AI service; prompts may include workspace content.
- **`ai:embed`** — Send bounded text to the host-configured embedding model and rank vectors locally.
- **`apps:package`** — Package and sign apps under this device's publisher identity (asks each time).
- **`apps:publish`** — Publish signed apps so other users can find and install them (asks each time).
- **`apps:install`** — Ask the host to install apps from a 256t id (asks each time, with capability review).
- **`apps:preview`** — Run a built app in the host's sandboxed dev-preview slot.
- **`apps:channel`** — Send and receive messages with another running mini-app named when you grant this.
- **`share:cas`** — Store and retrieve bounded content-addressed data shared by 256t id.
- **`peer:connect`** — Ask trusted host chrome to find, confirm, and connect an app-scoped peer.
- **`link:observe`** — See which peers are reachable and how good the connection to each is.
- **`link:probe`** — Send a small test transmission to measure a connection (uses airtime and battery).
- **`relay:configure`** — Turn this device's radios, camera, microphone, speaker, and internet-push relaying on or off, and forward other people's traffic. This grant permits changes without another prompt.
- **`relay:read`** — Read host relay mode, interface status, and diagnostics.
- **`freenet:contract`** — Read and publish Freenet contract state. Updates are published to a global network and cannot be recalled (asks each time for put/update).
- **`device:location`** — Host-mediated geolocation. Default tier is quantized coarse (~1 km); precise is a separate elevated grant. (default tier; consent: low).
- **`device:location:precise`** — Host-mediated geolocation. Default tier is quantized coarse (~1 km); precise is a separate elevated grant. (precise tier; consent: elevated).
- **`device:ambient-light`** — Quantized ambient illuminance in lux, rate-capped at 1 Hz. (default tier; consent: low).
- **`device:camera`** — Camera. Default derived tier yields barcodes, motion events, and counts — not full frames. (default tier; consent: elevated).
- **`device:camera:frames`** — Camera. Default derived tier yields barcodes, motion events, and counts — not full frames. (frames tier; consent: sensitive).
- **`device:microphone`** — Microphone. Default derived tier yields level, VAD, tone/DTMF, and transcript — not raw PCM. (default tier; consent: elevated).
- **`device:microphone:pcm`** — Microphone. Default derived tier yields level, VAD, tone/DTMF, and transcript — not raw PCM. (pcm tier; consent: sensitive).
- **`device:motion`** — Fused motion (accel/gyro/magnetometer). Default derived tier is orientation and events at ≤ 10 Hz. (default tier; consent: elevated).
- **`device:motion:samples`** — Fused motion (accel/gyro/magnetometer). Default derived tier is orientation and events at ≤ 10 Hz. (samples tier; consent: sensitive).
- **`device:torch`** — Camera torch / flashlight. Strobe rate hard-capped below photosensitive-epilepsy thresholds. (default tier; consent: elevated).
- **`device:speaker`** — Audio output. Default play tier accepts asset ids or TTS text — not arbitrary PCM carriers. (default tier; consent: elevated).
- **`device:speaker:pcm`** — Audio output. Default play tier accepts asset ids or TTS text — not arbitrary PCM carriers. (pcm tier; consent: sensitive).
- **`device:tts`** — Text-to-speech service composing speaker. Text length and rate are bounded. (default tier; consent: elevated).
- **`device:stt`** — Speech-to-text service composing microphone. Transcript is the derived microphone tier. (default tier; consent: elevated).
- **`device:haptics`** — Haptic feedback. Duty-cycle capped. (default tier; consent: low).
- **`device:battery`** — Coarse battery buckets only — precise curves are a fingerprinting vector. (default tier; consent: low).
- **`device:screen-capture`** — Screen capture. Always requires an explicit per-session region picker in host chrome. (default tier; consent: sensitive).
- **`device:screen-capture:frames`** — Screen capture. Always requires an explicit per-session region picker in host chrome. (frames tier; consent: sensitive).
- **`device:nfc`** — NFC / card reader. APDU tier is sensitive and rejects payment AIDs at the driver. (default tier; consent: elevated).
- **`device:nfc:apdu`** — NFC / card reader. APDU tier is sensitive and rejects payment AIDs at the driver. (apdu tier; consent: sensitive).
- **`device:biometric`** — Biometric assertion only. Templates never leave the OS enclave; there is no raw tier. (default tier; consent: elevated).
- **`device:proximity`** — Near/far proximity scalar, rate-capped. (default tier; consent: low).
- **`device:barometer`** — Atmospheric pressure scalar in hPa, rate-capped. (default tier; consent: low).
- **`device:thermometer`** — Ambient temperature scalar in °C, rate-capped. (default tier; consent: low).
- **`device:hygrometer`** — Relative humidity percent scalar, rate-capped. (default tier; consent: low).
- **`device:thermal`** — Coarse device thermal buckets only — precise curves are a fingerprinting vector. (default tier; consent: low).
- **`device:stream`** — Stream any already-held device data to a peer. Never implied by a device grant alone.
- **`device:remote`** — Request a device on a peer's host. Confers nothing on the serving host.
- **`device:share-policy:read`** — See which peers this app is currently sharing your camera or microphone with.
- **`device:stream:raw-inbound`** — Receive raw camera frames or audio from a peer into the app itself.

Manifests declare the full list; users may grant a subset at install.
Withholding a capability turns matching probes into `not-granted` cards.

Tutorial: [Capability model](chapter:sdk-capabilities).
Per-namespace guides: [Developing mini-apps](chapter:sdk-identity).
