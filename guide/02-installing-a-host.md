# 2. Installing a host

<!-- tp-doc
lifecycle: live
audited: 2026-07-21
register: none
-->

Pick the host that matches the device in front of you. You can install more than one —
they are separate peers with separate identities unless you deliberately share one.

| Device | Host | Best for |
|---|---|---|
| Mac, Windows, or Linux computer | [Desktop host](#desktop-macos-windows-linux) | The best experience. Also relays traffic for everyone else. |
| Android phone or tablet | [Android host](#android) | Carrying the network with you; Bluetooth and LoRa radios. |
| iPhone or iPad | [iOS host](#iphone-and-ipad) | Messaging and using apps. The most restricted host. |
| Any browser | [Web host](#web-browser) | Trying TwistedPear in two minutes, with no install. |
| A spare computer or server | [Headless node](09-managing-your-device.md#running-an-always-on-peer) | Keeping a community's network up 24/7. |

![The five host types side by side](/guide/images/02-host-lineup.png)

**Screenshot 2.1 — The same host on five devices.** A composite image: desktop window,
Android phone, iPhone, browser tab, and a terminal running `tp node`. All five show the
same *Node status* information, so the reader sees that it is one product, not five.
Label each panel with the device name.

## Before you start

> **⏳ Not yet available — no signed downloads.** There is no download page and there are
> no signed installers yet. Every host below is currently installed by building it from
> the source repository. Signed macOS and Windows installers are produced by
> [electron-builder](../docs/macos-notarization.md) but are not published, notarized, or
> verified on Windows. Tracked as **H17** in
> [STATUS-HARDWARE.md](../STATUS-HARDWARE.md) and in the
> [release plan](../RELEASE-PLAN.md).

Until then, every install starts the same way:

```sh
git clone https://github.com/curtcox/twistedpear
cd twistedpear
npm ci
npm run build
```

## Desktop (macOS, Windows, Linux)

The desktop host is the one to install first if you have the choice. It is the only host
that is on all the time, and it can carry traffic and app downloads for phones nearby.

```sh
npm run run:desktop
```

![The desktop host main window](/guide/images/02-desktop-main-window.png)

**Screenshot 2.2 — Desktop host, main window.** Full window, 1280×800, light theme.
Header reads "TwistedPear Host" with the subtitle "Desktop always-on peer". Left sidebar:
*Node status*, *Catalog*, *Installed*, *Grants*, *Trusted publishers*, *Settings*. The
*Node status* panel is selected and shows worklet state, link count, crypto provider,
announces seen, and enabled roles.

By default the desktop host turns on two roles that help everyone else:

- **Transport node** — it forwards other people's traffic. On by default.
- **Seeder** — it stores and serves mini-app packages so nearby phones can install them
  quickly. On by default, capped at 2 GiB.

A third role, **propagation server** (holding messages for people who are offline), is
off by default. [Chapter 9](09-managing-your-device.md) explains when to turn it on.

> **⚠️ Works, with limits — Windows.** Windows installers are built in CI but have never
> been installed and exercised on a real Windows machine. Treat the Windows desktop host
> as untested. Tracked as **H17**.

## Android

The Android host is a full peer: it can use Wi-Fi discovery, Bluetooth, and USB or
Bluetooth LoRa radios, and it keeps running in the background.

```sh
npm run build:worklet
cd apps/harness-mobile && npx expo run:android
```

![The Android host home screen](/guide/images/02-android-home.png)

**Screenshot 2.3 — Android host, home screen.** Portrait phone screenshot. Title
"TwistedPear", status card showing "Worklet: ready", "Link: up", "Identity: persisted",
"Foreground service: running". Below it the *App catalog* section with two installed
apps, and the *Announce browser* section listing three discovered peers.

> **⚠️ Works, with limits — this is a developer build.** What you install today is the
> `harness-mobile` development harness, titled "TwistedPear Harness", not a polished
> consumer app. The screens are functional rather than designed, and several panels
> (USB serial devices, dev side-load channel) exist for developers and will not appear
> in a consumer build.

> **⏳ Not yet available — Google Play.** TwistedPear is not on Google Play and no
> listing has been submitted. Because Play policy restricts apps that download executable
> code, direct APK distribution and F-Droid are the planned channels. See
> [LIMITATIONS.md §5](../LIMITATIONS.md).

Android needs a **foreground service** to stay on the network when your screen is off.
The host asks for permission on first run and shows a permanent notification while it is
active. That notification is not optional — it is how Android permits background
networking. You can stop the node from the notification.

## iPhone and iPad

> **⏳ Not yet available — the App Store.** No iOS submission has been attempted. Apple's
> rules on downloaded code (App Review 3.3.2) make an app-store-inside-an-app a genuinely
> uncertain proposition, and the iOS build may ship with a reduced feature set or through
> TestFlight only. See [LIMITATIONS.md §4](../LIMITATIONS.md) and
> [docs/ios-submission.md](../docs/ios-submission.md).

Today the iOS host runs on the simulator, or on your own device with your own Apple
developer account:

```sh
npm run build:worklet
cd apps/harness-mobile && npx expo run:ios
```

![The iOS host with the node suspended](/guide/images/02-ios-suspended.png)

**Screenshot 2.4 — iOS host, returning from background.** Portrait iPhone screenshot
showing the status card with the explicit message "node suspended by iOS" in amber, and
a "Resume" state transition beneath it. This is the single most important iOS-specific
behaviour and needs its own shot.

Two iOS restrictions shape everything in this guide:

- **iOS suspends the app.** There is no Android-style background service. When you leave
  TwistedPear, your peer goes quiet. Messages sent to you while suspended are held by a
  propagation server, if one is reachable, and arrive when you reopen the app.
- **Local network discovery is limited.** Finding peers automatically on your Wi-Fi needs
  a special Apple entitlement.
  > **⏳ Not yet available — multicast entitlement.** The
  > `com.apple.developer.networking.multicast` entitlement has not been filed with Apple.
  > Until it is granted, an iPhone finds peers via Bonjour or a manually configured
  > gateway, and cannot automatically discover standard Reticulum peers on the LAN.
  > Tracked as **H12**; see
  > [docs/ios-multicast-entitlement.md](../docs/ios-multicast-entitlement.md).

## Web browser

The browser host is a real peer — the whole protocol stack runs in the tab — but it is
always a **leaf**: browsers cannot accept incoming connections, so it reaches the network
through a **gateway** node that someone runs.

The intended way to use it is to have your own desktop or headless node serve it:

```sh
tp node --ws-listen 0.0.0.0:9474 --serve-web
```

Then open the address that command prints. You can install the page as an app from your
browser's menu; it works offline for everything that does not need the network.

![The web host in a browser tab](/guide/images/02-web-host-tab.png)

**Screenshot 2.5 — Web host in Chrome.** Full browser window showing the TwistedPear web
host, with the browser's "Install app" prompt visible in the toolbar. The page shows the
node status card with "Interface: WebSocket → gateway" and a storage quota bar reading
something like "48 MiB of 2 GiB used".

The browser host trades away real capability for convenience. It cannot relay traffic for
others, cannot seed apps, cannot use Bluetooth or Wi-Fi discovery, and stores your
identity key less securely than a phone does. It is also only as trustworthy as whoever
serves you the page — which is why serving it from your own node is the default.
See [LIMITATIONS.md §8](../LIMITATIONS.md).

## Next

Start it up and create your identity: [Chapter 3 — First run and your identity](03-first-run-and-identity.md).
