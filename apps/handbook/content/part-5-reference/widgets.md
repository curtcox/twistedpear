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

- **`audio-meter`** — props: `accessibilityLabel`, `session`
- **`button`** — props: `accessibilityHint`, `event`, `label`
- **`camera-preview`** — props: `accessibilityLabel`, `aspectRatio`, `session`
- **`code-editor`** — props: `accessibilityHint`, `accessibilityLabel`, `documentId`, `event`, `language`, `readOnly`
- **`date`** — props: `accessibilityHint`, `accessibilityLabel`, `event`, `value`
- **`divider`** — props: none
- **`image`** — props: `alt`, `asset`, `decorative`
- **`list`** — props: `accessibilityLabel`, `event`, `items`
- **`map-preview`** — props: `accessibilityLabel`, `session`, `zoom`
- **`progress`** — props: `accessibilityLabel`, `max`, `value`
- **`qr-code`** — props: `accessibilityLabel`, `caption`, `size`, `value`
- **`remote-video`** — props: `accessibilityLabel`, `peer`, `session`
- **`scroll`** — props: `accessibilityLabel`, `event`, `scrollOffset`
- **`select`** — props: `accessibilityHint`, `accessibilityLabel`, `event`, `options`, `value`
- **`slider`** — props: `accessibilityHint`, `accessibilityLabel`, `event`, `max`, `min`, `step`, `value`
- **`spacer`** — props: `size`
- **`switch`** — props: `accessibilityHint`, `accessibilityLabel`, `event`, `value`
- **`text`** — props: `heading`, `live`, `value`
- **`text-input`** — props: `accessibilityHint`, `accessibilityLabel`, `event`, `keyboard`, `multiline`, `placeholder`, `secure`, `value`
- **`view`** — props: `accessibilityLabel`, `decorative`, `live`
- **`waveform`** — props: `accessibilityLabel`, `session`

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
- `code-editor` languages: elm, javascript, json, text
- `qr-code` value: up to 512 characters (94-char 256t ids fit)

Live gallery: [Widget gallery](chapter:sdk-widget-gallery).
