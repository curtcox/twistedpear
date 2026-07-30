# 11. Using Freenet

<!-- tp-doc
lifecycle: live
audited: 2026-07-29
register: none
-->

Freenet is an optional way for a desktop, headless, or (simulator-verified)
mobile TwistedPear host to publish and fetch app packages, carry Reticulum
packets, mirror LXMF propagation state, and let a granted mini-app read or
publish Freenet contract state. It is off by default and no existing TwistedPear
feature depends on it.

TwistedPear connects to a Freenet node that you supply. You can point at an
external node URL, or pass `--freenet-binary` so the host supervises a
hash-verified executable you already installed. It does not download or
redistribute Freenet binaries. Browser hosts deliberately do not expose Freenet
(Option A). Mobile hosts show a remote-node grant screen first: the exact URL,
operator label, irreversible-update disclosure, and per-role toggles — still off
by default, with no third-party gateway preconfigured.

> **An update is public and irreversible.** A Freenet contract update is
> published to a global replicated network. It cannot be recalled. The desktop
> host asks again before every mini-app `put` or `update`, even after you grant
> `freenet:contract`. On mobile, contract writes stay behind the same disclosure
> and capability toggles.

## 1. Run the pinned external node

TwistedPear is tested against `freenet-core` **v0.2.112**. The client API was
stable across the ten releases examined by the S6 spike, but Freenet is still
pre-1.0 and moves quickly, so this integration pins an exact release rather than
silently following latest.

Download the asset for your platform from the
[v0.2.112 upstream release](https://github.com/freenet/freenet-core/releases/tag/v0.2.112).
On x86-64 Linux, the exact archive used by CI is:

```sh
curl -LO https://github.com/freenet/freenet-core/releases/download/v0.2.112/freenet-x86_64-unknown-linux-musl.tar.gz
echo "b5b6bdf975c1563a98507e94c8edc1091278306e16f25ef216aacea1570a5571  freenet-x86_64-unknown-linux-musl.tar.gz" | sha256sum --check
tar -xzf freenet-x86_64-unknown-linux-musl.tar.gz
./freenet network
```

The last command stays running. Unless you change the node configuration, its
contract WebSocket endpoint is:

```text
ws://127.0.0.1:50509/v1/contract/command
```

Keep the endpoint on loopback unless you have separately secured remote access.
If your node requires an auth token, pass it only through the token field or
`--freenet-token`; do not put it in a URL you might paste into logs.

## 2. Connect a headless TwistedPear host

The short form accepts the endpoint directly:

```sh
tp node --freenet ws://127.0.0.1:50509/v1/contract/command
```

To supervise a user-supplied binary instead (ephemeral port; generated token kept
out of URLs and logs):

```sh
tp node --freenet-binary /absolute/path/to/freenet \
  --freenet-binary-sha256 <64-hex-sha256-of-that-binary>
```

The equivalent explicit form, including an optional token, is:

```sh
tp node \
  --freenet \
  --freenet-node ws://127.0.0.1:50509/v1/contract/command \
  --freenet-token "$FREENET_AUTH_TOKEN"
```

Add `--propagation` to mirror the node's LXMF propagation store through Freenet:

```sh
tp node --freenet --propagation
```

To carry Reticulum HDLC frames over a shared packet-log contract, both peers use
the same 64-hex-character rendezvous value and opposite local directions:

```sh
# Peer A
tp node --freenet-interface \
  --freenet-node ws://127.0.0.1:50509/v1/contract/command \
  --freenet-rendezvous <64-hex-rendezvous> \
  --freenet-direction 0

# Peer B
tp node --freenet-interface \
  --freenet-node ws://127.0.0.1:50509/v1/contract/command \
  --freenet-rendezvous <same-64-hex-rendezvous> \
  --freenet-direction 1
```

If you omit `--freenet-rendezvous`, `tp` generates one and prints it for you to
share with the other peer. The interface is measured and ranked at 90 kbit/s;
it is appropriate for Reticulum and LXMF traffic, not bulk streaming.

## 3. Configure the desktop host

Open **Settings → Freenet** and set:

1. **Freenet contracts** on.
2. **Freenet node WebSocket** to the node endpoint.
3. **Freenet auth token** only if your node requires one.
4. **Freenet as Reticulum interface (HDLC)** only when you need the packet
   tunnel.
5. **Freenet peer rendezvous** to the same 64 hex characters used by the peer.
6. **Freenet packet-log side** to Side 0 on one peer and Side 1 on the other.

The **Node status** panel then shows **Freenet**, **Freenet configured**,
**Freenet URL**, **Freenet HDLC**, and **Freenet HDLC online**. A configured
contract backend and an online HDLC interface are separate states; contracts
can work while the interface toggle is off.

Turning Freenet off makes its fetch path, interface, propagation mirror, and
mini-app backend unavailable. Hyperdrive, LAN mirror, Resource, and every other
interface continue normally.

## 4. Publish and install an app package

From a source checkout with `tp` built and the external node running:

```sh
npm run build:freenet-contract
tp publish path/to/app \
  --freenet \
  --freenet-node ws://127.0.0.1:50509/v1/contract/command
```

Expected output includes:

```text
Published <bytes> bytes to Freenet contract <contract-key>
```

The normal signed locator and `.tpkg` verification still apply. Freenet is an
untrusted place to fetch bytes, not a new trust root.

On a second configured desktop host, install the announced 256t identifier from
**Catalog → Install from identifier**. The host ranks a reachable Freenet path
after Hyperdrive and LAN mirror and before Reticulum Resource. The internal
install request also accepts `forcePath: "freenet"` for conformance and
developer tooling; there is no separate `tp install --force-path` command.

Publishing the locator is a real Freenet write. Do not use a public network as
a test fixture unless you intend the operation metadata to be public.

## 5. Verify the integration

The following checks do not need a Freenet node and make no network writes:

```sh
npm test -- packages/bridge-freenet/test
npm test -- packages/effects/test/freenet-sim.test.ts
npm test -- packages/reticulum-interfaces/test/freenet-announce-lxmf.test.ts
npm run test:freenet-spike
npm run test:freenet-ordered-log
```

Expected result: Vitest reports passing tests; the S1 probe reports that the
pinned SDK imports under Bare and says its live portion was skipped; S3 reports
the ordered log convergence measurements.

Rebuilding the three committed contracts requires Rust 1.97.1 and
`wasm32-unknown-unknown`:

```sh
rustup toolchain install 1.97.1 --profile minimal --target wasm32-unknown-unknown
npm run build:freenet-contract
git diff --exit-code -- \
  packages/bridge-freenet/contract/locator/locator-contract.wasm \
  packages/bridge-freenet/contract/packet-log/packet-log-contract.wasm \
  packages/bridge-freenet/contract/propagation-set/propagation-set-contract.wasm
```

Expected result: all three builds name their destination and `git diff` is
empty, proving the committed WASM corresponds to the pinned Rust source.

These checks start isolated local nodes. Set `FREENET_BINARY` if `freenet` is
not on `PATH`:

```sh
FREENET_BINARY=/absolute/path/to/freenet npm run test:freenet-interface
FREENET_BINARY=/absolute/path/to/freenet npm run test:freenet-propagation
FREENET_BINARY=/absolute/path/to/freenet npm run test:freenet-local-network
FREENET_BINARY=/absolute/path/to/freenet npm run test:freenet-distinct-nodes -- --smoke
```

Expected result: the first records an HDLC exchange in
`.tmp/f2-interface-proof-local-isolated.json`; the second records the
offline-A/retrieve-B proof in
`.tmp/f3-propagation-proof-local-isolated.json`; the third records 100 samples
per payload size in `.tmp/freenet-roundtrip-local-3-node.json`; the fourth runs
cross-node notify plus distinct-endpoint F2/F3 (and a Freenet-node restart) on
an isolated mesh. The 100-sample S2 check is slow enough that CI runs it
nightly. Reviewed evidence is copied into
`conformance/freenet-spike/` deliberately; a test run never overwrites the
committed evidence ledger.

None of these isolated checks proves a live public-network write, macOS
notarization, physical-device BareKit confirmation, or a promoted cross-node
100-sample notify series. Those remain explicit evidence gates rather than
skipped-as-green tests.

## 6. Mini-app contract access

A desktop mini-app may request `freenet:contract` and use the SDK's
`freenet.get`, `freenet.put`, and `freenet.update` calls. Read the worked
[Contract notebook recipe](../cookbook/10-apps-that-use-freenet.md) before
granting it: `put` and `update` cross a stronger boundary than ordinary local
storage.

## Troubleshooting

| Symptom | Check |
|---|---|
| `FREENET_UNCONFIGURED` | Enable Freenet contracts and enter the WebSocket endpoint. |
| Node status says configured but HDLC is offline | Enable the interface and use the same rendezvous on both peers. |
| Authentication failure | Re-enter the token; the desktop host intentionally does not show the saved value. |
| Package fetch falls back to Resource | Confirm the Freenet node is reachable and the locator contains a Freenet contract key. |
| `put` or `update` did nothing | The host confirmation may have been refused; the app cannot bypass it. |

Back to [Troubleshooting](10-troubleshooting.md), or review the engineering
[Freenet integration plan](../docs/freenet-integration-plan.md).
