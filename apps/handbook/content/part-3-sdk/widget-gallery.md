# Widget gallery


<!-- tp-doc
lifecycle: live
audited: 2026-07-10
register: none
-->

The widget protocol is the cross-platform UI seam. Allowed components:
`view`, `text`, `image`, `button`, `text-input`, `switch`, `scroll`, `list`,
`progress`, `divider`, `spacer`, `code-editor`, `qr-code`.

Hosts on Android, iOS, desktop, and web render the same declarative tree —
mini-apps do not ship native UI code.

## Content-by-reference

`code-editor` loads workspace files by `documentId`; `qr-code` accepts up to
512 characters (94-char 256t ids fit). The host rejects unknown props, styles,
duplicate ids, and oversized trees.

## Component roles

- **Layout** — `view`, `scroll`, `spacer`, `divider`
- **Input** — `button`, `text-input`, `switch`
- **Display** — `text`, `image`, `progress`, `list`, `qr-code`
- **Docs** — `code-editor` for samples and applet sources

Schema reference: [Widget protocol](chapter:ref-widgets).

## Live probe

The applet submits a tree that includes every component type. After it reports,
the Handbook re-renders this chapter with the result card.

{{applet:widget-gallery}}
