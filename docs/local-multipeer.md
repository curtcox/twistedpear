# Single-machine multi-peer environment

<!-- tp-doc
lifecycle: reference
audited: 2026-08-05
register: none
-->

Start and stop any combination of peer implementations on one Mac, then run an
automated matrix that proves they discover each other and can exchange
messages. No extra hardware, no second machine.

## Quick start

```bash
npm run build
npm run peers -- up hub node2
npm run test:local-multipeer -- --attach
npm run peers -- down
```

That headless pair needs nothing but Node. Add GUI peers as they become
available on the machine:

```bash
npm run peers -- up hub desktop ios android
npm run peers -- status
npm run test:local-multipeer -- --attach
```

## Topology

Reticulum's AutoInterface cannot discover peers over loopback — the multicast
implementation skips `lo0` and binds only link-local IPv6 addresses
(`packages/reticulum-interfaces/src/multicast-node.ts`). So the local network is
hub-and-spoke over TCP:

```
                    tp node "hub"  (TCP server 0.0.0.0:4242, transport enabled)
                           |
   +-----------+-----------+-----------+-------------+
   |           |                       |             |
 desktop    iOS sim              Android emu     tp node "node2"
(Electron) 127.0.0.1:4242        10.0.2.2:4242   127.0.0.1:4242
```

The mobile harness already targets exactly this hub: `apps/harness-mobile/App.tsx`
picks `10.0.2.2` on Android and `127.0.0.1` elsewhere, on port 4242.

Each peer also opens an **outbound** control connection to the harness on port
34990. Outbound is what makes one mechanism work everywhere — a Node process, a
Bare worklet, the iOS simulator, and the Android emulator can all dial out, and
none of them needs a listening socket or an entitlement.

## Peers

| Id | Implementation | Requirements |
|---|---|---|
| `hub` | `tp node` with the TCP server interface | Node, `npm run build` |
| `node2`…`node9` | additional headless `tp node` peers | Node, `npm run build` |
| `desktop` | Electron desktop host | Electron; peer-agent launches use the supported Node-worklet fallback when linked Bare addon frameworks are unavailable |
| `ios` | iOS simulator harness | Xcode, Maestro |
| `android` | Android emulator harness | a running emulator with the harness installed, adb, Maestro |

`up` implies `hub` unless you pass `--no-hub`. GUI peers that cannot start are
reported and skipped rather than failing the run.

## The peers CLI

```bash
npm run peers -- up [peers...]     # start (default: hub)
npm run peers -- down [peers...]   # stop (default: everything running)
npm run peers -- status            # process state + live agent state
npm run peers -- status --capture  # also write observe-snapshot tapes under tapes/
npm run peers -- logs ios -f       # tail one peer's log
npm run peers -- list              # known peer ids
```

State lives in `.tmp/local-peers/`: `state.json` for the running set, `logs/`
per peer, `data/` for per-peer identities and host config, `tapes/` for
optional observe-snapshot captures. Removing that directory resets everything.

`status` briefly binds the control port so attached peers re-check in and can
report what they have discovered. If a test run already holds the port, it
prints the process view and says so.

## What the test asserts

`conformance/local-multipeer/run.mjs` builds the full N×N matrix over whichever
peers are attached:

1. **Discovery** — for every ordered pair, that A has recorded B's LXMF announce.
   After that, floods a spoke's announces at the hub and requires a nonzero rung-4
   (`announce-rate-limit:rate_limited`) drop on the hub (transport-node rate-limit
   gate; distinguishes rate-limited from absent).
2. **Communication** — for every ordered pair, that A's probe message arrives at
   B *and* that B's echo arrives back at A. Both legs are real LXMF messages over
   real Reticulum links, routed through the hub.
3. **Peer media readiness** — that B decodes A's `TPL1` readiness request and
   answers with a body that re-validates through the shared codec.
4. **Active link probe** — that A's bounded probe reply closes a measurement
   with a positive RTT.
5. **Inbound session invite** — that A's signed `TPL1` type-4 invite is verified
   by B and raised as an invitation whose peer label B named itself. This runs
   the shipping carrier (`createSessionInviteReceiver`), so what it proves is
   the host path, not a harness-only echo.
6. **Realtime media carrier** — that derived and PCM `TPD2` frames survive a
   round trip byte for byte.

Results are written to `.tmp/local-peers/multipeer-proof.json`.

```bash
npm run test:local-multipeer                    # brings up hub + node2, tests, tears down
npm run test:local-multipeer:smoke              # same, explicit smoke pair
npm run test:local-multipeer:desktop            # hub + Electron desktop; GUI skips become failures
npm run test:local-multipeer -- --attach        # use whatever is already running
npm run test:local-multipeer -- --peers=hub,desktop,ios
```

Timeouts are generous because announce ingress is rate limited to roughly one
per five seconds per destination, so a peer that joins late waits for the next
periodic announce. Override with `LOCAL_MULTIPEER_DISCOVERY_MS`,
`LOCAL_MULTIPEER_MESSAGE_MS`, or `LOCAL_MULTIPEER_ATTACH_MS`. Set
`LOCAL_MULTIPEER_REQUIRED=1` to turn GUI-peer skips into failures and to require
every requested GUI peer to appear in readiness, probe, invite, call, and
realtime proof rows (`test:local-multipeer:desktop` sets this for hub+desktop).

## How peers become observable

Hosts have no message UI and no query API, so each one mounts a peer
control agent — `packages/host-core/src/test-agent.ts`, mounted through
`packages/worklet-core/src/test-agent-mount.mjs` in the worklet hosts. The agent
registers its own LXMF delivery destination, records the announces it sees,
auto-echoes probe messages, and answers `info` / `peers` / `inbox` / `status` /
`send` / `announce` / `link-state` / `request-readiness` / `link-probe` /
`invite-state` / `send-invite` over the control channel.

It is never on a default code path. It activates only when a host is handed an
explicit control endpoint:

| Peer | Trigger |
|---|---|
| `tp node` | `--test-agent host:port[:label]` |
| desktop | `TP_TEST_AGENT=host:port:label` read by the Electron main process |
| iOS / Android | the **Connect peer agent** button, tapped by `.maestro/local-peer-up.yaml` |

## Adding another peer implementation

Add an adapter under `scripts/peers/adapters/` exposing
`{ id, kind, describe(), up(ctx), down(entry, ctx), running(entry) }` and
register it in `scripts/peers/registry.mjs`. If the implementation runs a
Reticulum stack, mount the peer control agent in it and it joins the matrix with no
changes to the CLI or the suite.
