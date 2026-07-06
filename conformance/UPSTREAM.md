# Upstream Pins

The Reticulum reference implementation is the Phase 1 wire-format specification.

| Component | Version | Purpose |
|---|---:|---|
| Python RNS | 0.9.4 | Reticulum reference peer and vector generation |
| LXMF | 0.7.0 | LXMF interop from M7 onward |
| Hyperdrive | 13.3.2 | Versioned app package bulk distribution |
| Corestore | 7.9.2 | Hyperdrive storage factory |
| Hyperswarm | 4.13.0 | DHT peer discovery for Hyperdrive replication |

Changing either pin is a reviewed protocol event. A bump must include:

- release-note review for wire-touching changes,
- source diff notes for affected classes/modules,
- regenerated golden vectors,
- live interop scenario results for every milestone already implemented.
