# Phase 6 — Hardware / environment runbook

Register rows H17–H20 from [PHASE6.md](../PHASE6.md) §7.

## H17 — Windows 10/11

1. Download `host-desktop` NSIS artifact from CI.
2. Install and launch; confirm tray icon and status dashboard.
3. Run TCP slice against docker `leaf-echo` on `127.0.0.1:4242`.
4. Full app loop: catalog → install → grant → launch → widget render.
5. Record multicast/Bonjour behavior and status in LIMITATIONS §6.

## H18 — Real WiFi LAN (2 desktops + phone)

1. Run desktop hosts with default auto interfaces on the same SSID.
2. Verify Bonjour and multicast discovery across machines.
3. Publish a package from desktop A; install on phone via desktop B seed path only.
4. Measure LAN throughput; compare to LIMITATIONS §6 budget table.
5. Confirm desktop ⇄ desktop transport routing.

## H19 — RNode USB gateway

1. Attach RNode to desktop via USB serial.
2. Configure port and baud in host settings.
3. End-to-end: phone → RNode ⇄ RNode → desktop gateway.
4. Optional: propagation sync over LoRa within quota limits.

## H20 — Always-on server (2 weeks)

1. Linux spare machine: `tp node --propagation --status-endpoint`.
2. Monitor RSS, path-table size, store growth via `/status` cron.
3. Review logs weekly; fold findings into LIMITATIONS §8 quota defaults.
