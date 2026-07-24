# Widget protocol


<!-- tp-doc
lifecycle: live
audited: 2026-07-21
register: none
-->

Generated from `WIDGET_TYPES` / `WIDGET_PROP_KEYS` in `packages/miniapp-runtime`.

Hosts render a declarative tree (`ui.render`). Unknown types, props, styles,
duplicate ids, or oversized trees are rejected.

## Components

- **`audio-meter`** — props: `session`
- **`button`** — props: `event`, `label`
- **`camera-preview`** — props: `aspectRatio`, `session`
- **`code-editor`** — props: `documentId`, `event`, `language`, `readOnly`
- **`divider`** — props: none
- **`image`** — props: `alt`, `asset`
- **`list`** — props: `event`, `items`
- **`map-preview`** — props: `session`, `zoom`
- **`progress`** — props: `max`, `value`
- **`qr-code`** — props: `caption`, `size`, `value`
- **`remote-video`** — props: `peer`, `session`
- **`scroll`** — props: `event`, `scrollOffset`
- **`spacer`** — props: `size`
- **`switch`** — props: `event`, `value`
- **`text`** — props: `value`
- **`text-input`** — props: `event`, `placeholder`, `value`
- **`view`** — props: `accessibilityLabel`
- **`waveform`** — props: `session`

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
