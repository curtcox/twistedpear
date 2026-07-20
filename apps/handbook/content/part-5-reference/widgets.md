# Widget protocol


<!-- tp-doc
lifecycle: live
audited: 2026-07-10
register: none
-->

Generated from `WIDGET_TYPES` / `WIDGET_PROP_KEYS` in `packages/miniapp-runtime`.

Hosts render a declarative tree (`ui.render`). Unknown types, props, styles,
duplicate ids, or oversized trees are rejected.

## Components

- **`button`** — props: `event`, `label`
- **`code-editor`** — props: `documentId`, `event`, `language`, `readOnly`
- **`divider`** — props: none
- **`image`** — props: `alt`, `asset`
- **`list`** — props: `event`, `items`
- **`progress`** — props: `max`, `value`
- **`qr-code`** — props: `caption`, `size`, `value`
- **`scroll`** — props: `event`, `scrollOffset`
- **`spacer`** — props: `size`
- **`switch`** — props: `event`, `value`
- **`text`** — props: `value`
- **`text-input`** — props: `event`, `placeholder`, `value`
- **`view`** — props: `accessibilityLabel`

## Styles

- `alignItems`
- `backgroundColor`
- `color`
- `display`
- `flexDirection`
- `fontSize`
- `fontWeight`
- `gap`
- `height`
- `justifyContent`
- `margin`
- `padding`
- `width`

## Limits

- Widget tree JSON budget: 256 KiB (default validator)
- `code-editor` languages: javascript, json, text
- `qr-code` value: up to 512 characters (94-char 256t ids fit)

Live gallery: [Widget gallery](chapter:sdk-widget-gallery).
