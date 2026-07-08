# Widget gallery

The widget protocol is the cross-platform UI seam. Allowed components:
`view`, `text`, `image`, `button`, `text-input`, `switch`, `scroll`, `list`,
`progress`, `divider`, `spacer`, `code-editor`, `qr-code`.

`code-editor` is content-by-reference (workspace `documentId`); `qr-code` is
sized for 94-character 256t ids. The host rejects unknown props, styles,
duplicate ids, and oversized trees.

## Live probe

The applet submits a tree that includes every component type. After it reports,
the Handbook re-renders this chapter with the result card.

{{applet:widget-gallery}}
