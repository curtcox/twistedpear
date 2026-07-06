# Phase 5 Hardware Runbook

Phase exit requires clearing H12-H16. Simulator green is necessary, not sufficient.

## H12 Paid Apple Developer Account

1. Enroll or borrow access to a paid Apple Developer team.
2. Create development signing profiles for `network.twistedpear.harness`.
3. File the multicast entitlement request using `docs/ios-multicast-entitlement.md`.
4. Record filing date, team id, and outcome in `LIMITATIONS.md` §4.

## H13 iPhone Dev Build

1. Build/install the dev client on a physical iPhone.
2. Boot the bare-kit worklet and run the TCP announce/link/LXMF slice against a desktop peer.
3. Run catalog install, grant, launch, widget render, update, and rollback.
4. Background the app and record grace-window duration, reconnect time, BG-task fire rate,
   and Low Power Mode behavior.
5. Fold measured numbers into `docs/ios-host.md` and `LIMITATIONS.md` §4.

## H14 iPhone + Android BLE

1. Foreground both phones and enable BLE.
2. Exchange announces and LXMF for one hour.
3. Background the iPhone for a measured interval and record whether Android can discover,
   maintain, and reconnect.
4. Update the BLE visibility matrix in `docs/ble-interface.md`.

## H15 Real LAN Discovery

1. Put iPhone, Android, and desktop on the same WiFi network.
2. Verify Bonjour discovery and LXMF exchange iPhone ⇄ desktop and iPhone ⇄ Android.
3. If multicast entitlement is granted, verify true AutoInterface iPhone ⇄ Python RNS
   zero-config discovery.
4. Record whether fallback relaying is needed for Python peers.

## H16 iPhone + RNode Pair

1. Connect iPhone to RNode over BLE.
2. Verify RNode KISS detection and Reticulum announces.
3. Run LoRa end-to-end iPhone → RNode ⇄ RNode → desktop.
4. Record throughput and failure modes in `LIMITATIONS.md` §3.
