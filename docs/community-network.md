# Community network bootstrap

<!-- tp-doc
lifecycle: live
audited: 2026-07-21
register: none
-->

TwistedPear ships an opt-in profile for connecting desktop and Android hosts to the
community-operated Reticulum backbone. It does not create a separate TwistedPear network,
central registry, or trust root. Package signatures, publisher trust, and capability review
work exactly as they do on LAN and radio links.

## Profile

The source of truth is `RETICULUM_COMMUNITY_NETWORK` in
`packages/host-core/src/community-network.ts`. The profile currently tries:

1. `node.reticulumnet.nl:4242` ([ReticulumNet](https://www.reticulumnet.nl/en/community/), Netherlands)
2. `rns.faultline.dev:4242` ([Chicagoland community list](https://reticulum.city/), US)

These are independently operated public TCP transports listed by their operators and
validated with a `reticulum-ts` TCP connection on 2026-07-21. They have no availability
guarantee. The host tries the next profile entry when the initial connection cannot be
established.

## Consent and privacy

Joining is never automatic. The user must choose **Join community network**. A public TCP
operator can observe the connecting IP address, connection timing, and traffic volume;
Reticulum still encrypts packet contents end to end. Local AutoInterface remains available
without public bootstrap.

## Platform behavior

- Desktop and Android use the bundled TCP profile.
- Headless nodes can configure the same endpoints in `config.json`.
- Browsers cannot open raw TCP connections. The web host continues to require a WebSocket
  gateway chosen by its operator; the bundled community profile is not presented there.
- Endpoint changes are code-reviewed because silently changing a public bootstrap target is
  a privacy-sensitive supply-chain change.

The wider Reticulum project deliberately describes connectivity as a distributed backbone,
not one global service. Community directories remain useful for replacing or extending this
small starter profile.
