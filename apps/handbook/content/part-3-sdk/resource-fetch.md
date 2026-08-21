# Resource fetch

<!-- tp-doc
lifecycle: live
audited: 2026-08-20
register: none
-->

`resource:fetch` asks the host to pull a Resource through its budget rules.
The mini-app never sees sockets or peer handles — only bytes (or a typed error).

Resources are the Reticulum bulk path when Hyperswarm is unavailable. Budgets
vary by link type — see [Budgets & quotas](chapter:sdk-budgets).

## API

```javascript
import { resource } from "@twistedpear/miniapp-sdk";

const bytes = await resource.fetch({
  resourceId: "offer:demo",
  budgetBytes: 4096,
});
```

```elm
Resource.fetch
    (E.object
        [ ( "resourceId", E.string "offer:demo" )
        , ( "budgetBytes", E.int 4096 )
        ]
    )
    GotBytes
```

Exceeding `budgetBytes` fails before transfer starts. The host enforces per-link
caps documented in [Known limitations](chapter:ref-limitations) §6.

## Outcomes

- `pass` — fetch completed within budget.
- `unavailable` — no resource server or peer path on this host.
- `not-granted` — `resource:fetch` withheld.

## Live probe

{{applet:resource-fetch}}
