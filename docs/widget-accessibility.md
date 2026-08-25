# Accessibility in the mini-app widget model — current

<!-- tp-doc
lifecycle: live
audited: 2026-08-25
register: software
counterpart: docs/widget-accessibility-plan.md
-->

**This describes the implementation as it exists now.** Remaining phases live in the
[widget accessibility plan](widget-accessibility-plan.md). Where the two disagree, this
file wins.

The widget vocabulary is still the closed set in
[SPEC-WIDGET](../specs/spec-widget/spec.md). Two accessibility props already exist in
`WIDGET_PROP_KEYS`: `view.accessibilityLabel` and `image.alt`. Every renderer now
honours both. The rest of the surface — labels on controls, heading levels, live
regions, decorative, and a checkable accessibility tree — is still planned.

## What ships

| Prop                      | Canonical model (`describe.ts`) | Headless oracle | React Native / web | Desktop DOM                          |
| ------------------------- | ------------------------------- | --------------- | ------------------ | ------------------------------------ |
| `view.accessibilityLabel` | carried                         | carried         | `accessibilityLabel` | `aria-label`                         |
| `image.alt`               | carried                         | carried         | `accessibilityLabel` | `<img alt>` (placeholder uses `aria-label`) |

`button.label` was already the accessible name for buttons and is unchanged.

`npm run test:widget-parity` fails if either oracle drops one of those props, and it
fails if the RN or desktop DOM source stops wiring them. The `a11y-existing` golden
stream pins the rendered model.

The web host still renders through `packages/widget-renderer-rn` under react-native-web,
so RN and web stay one implementation.

## Not in this drop

The bounded prop set (`accessibilityHint`, `heading`, `live`, `decorative`), the
accessibility-tree projection, version-gated unnamed-control rejection, the Cookbook
ratchet, and derived focus order remain in the [plan](widget-accessibility-plan.md).
