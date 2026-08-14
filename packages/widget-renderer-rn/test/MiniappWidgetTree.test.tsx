import type { WidgetNode, WidgetTree } from "@twistedpear/miniapp-runtime/ui";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MiniappWidgetTree } from "../src/MiniappWidgetTree.js";

// The renderer targets react-native; vitest aliases "react-native" to
// react-native-web (see vitest.config.ts) so the tree renders to markup here
// the same way it does in the Playwright renderer conformance run.

type Session = {
  readonly handle: string;
  readonly classId: string;
  readonly tierId: string;
  readonly appId: string;
};

function render(
  root: WidgetNode | null,
  options: {
    readonly assets?: Readonly<Record<string, string>>;
    readonly deviceSessions?: ReadonlyArray<Session>;
  } = {},
): string {
  const tree: WidgetTree | null = root === null ? null : { root };
  return renderToStaticMarkup(
    <MiniappWidgetTree
      tree={tree}
      {...(options.assets === undefined ? {} : { assets: options.assets })}
      {...(options.deviceSessions === undefined
        ? {}
        : { deviceSessions: options.deviceSessions })}
    />,
  );
}

describe("MiniappWidgetTree", () => {
  it("renders a placeholder for a missing tree", () => {
    expect(render(null)).toContain("No widget tree");
  });

  it("renders nested views with their children", () => {
    const html = render({
      id: "root",
      type: "view",
      children: [
        { id: "a", type: "text", props: { value: "first" } },
        {
          id: "b",
          type: "view",
          children: [{ id: "c", type: "text", props: { value: "nested" } }],
        },
      ],
    });
    expect(html).toContain("first");
    expect(html).toContain("nested");
    for (const id of ["root", "a", "b", "c"]) {
      expect(html).toContain(`data-testid="${id}"`);
    }
  });

  it("renders a view with no children", () => {
    expect(render({ id: "empty", type: "view" })).toContain(
      'data-testid="empty"',
    );
  });

  it("falls back to an empty string for text without a value", () => {
    const html = render({ id: "t", type: "text" });
    expect(html).toContain('data-testid="t"');
    expect(html).not.toContain("undefined");
  });

  it("maps display and font-weight style branches", () => {
    const hidden = render({
      id: "t",
      type: "text",
      props: { value: "x" },
      style: { display: "none", fontWeight: "bold", color: "#fff" },
    });
    expect(hidden).toContain("x");
    expect(
      render({
        id: "t",
        type: "text",
        props: { value: "y" },
        style: { fontWeight: "medium" },
      }),
    ).toContain("y");
  });
});

describe("interactive widgets", () => {
  it("labels a button and falls back to 'Button'", () => {
    expect(
      render({
        id: "b",
        type: "button",
        props: { label: "Send", event: "go" },
      }),
    ).toContain("Send");
    expect(render({ id: "b", type: "button" })).toContain("Button");
  });

  it("seeds a text input with its value and placeholder", () => {
    const html = render({
      id: "i",
      type: "text-input",
      props: { value: "seed", placeholder: "type here", event: "change" },
    });
    expect(html).toContain('value="seed"');
    expect(html).toContain('placeholder="type here"');
  });

  it("renders a text input with neither value nor placeholder", () => {
    expect(render({ id: "i", type: "text-input" })).toContain(
      'data-testid="i"',
    );
  });

  it("reflects switch state", () => {
    expect(
      render({ id: "s", type: "switch", props: { value: true } }),
    ).toContain('data-testid="s"');
    expect(render({ id: "s", type: "switch" })).toContain('data-testid="s"');
  });

  it("renders a code editor placeholder from its document id", () => {
    const html = render({
      id: "e",
      type: "code-editor",
      props: { documentId: "notes.md", event: "edit", readOnly: true },
    });
    expect(html).toContain('placeholder="notes.md"');
    expect(html).toContain('readOnly=""');
  });

  it("renders an editable code editor without a document id", () => {
    const html = render({ id: "e", type: "code-editor" });
    expect(html).toContain('data-testid="e"');
    expect(html).not.toContain('readOnly=""');
  });
});

describe("layout widgets", () => {
  it("renders scroll children", () => {
    const html = render({
      id: "sc",
      type: "scroll",
      props: { scrollOffset: 40, event: "scrolled" },
      children: [{ id: "row", type: "text", props: { value: "row" } }],
    });
    expect(html).toContain('data-testid="sc"');
    expect(html).toContain("row");
  });

  it("renders an empty scroll with no offset", () => {
    expect(render({ id: "sc", type: "scroll" })).toContain('data-testid="sc"');
  });

  it("renders dividers, spacers and progress", () => {
    expect(render({ id: "d", type: "divider" })).toContain('data-testid="d"');
    expect(render({ id: "sp", type: "spacer" })).toContain('data-testid="sp"');
    expect(
      render({ id: "p", type: "progress", props: { value: 42 } }),
    ).toContain("Progress 42%");
    expect(render({ id: "p", type: "progress" })).toContain("Progress 0%");
  });

  it("renders list children and both string and object items", () => {
    const html = render({
      id: "l",
      type: "list",
      props: { items: ["plain", { label: "structured" }] },
      children: [{ id: "hdr", type: "text", props: { value: "header" } }],
    });
    expect(html).toContain("header");
    expect(html).toContain("plain");
    expect(html).toContain("structured");
  });

  it("renders a list with no items prop", () => {
    expect(render({ id: "l", type: "list" })).toContain('data-testid="l"');
  });
});

describe("image widget", () => {
  it("inlines a supplied svg asset as a data URI", () => {
    const html = render(
      {
        id: "img",
        type: "image",
        props: { asset: "logo", alt: "Logo" },
        style: { width: 24, height: 24 },
      },
      { assets: { logo: "<svg>\n<rect/>\n</svg>" } },
    );
    // The whole multi-line svg must survive encoding (%0A is the newline).
    expect(html).toContain(
      'src="data:image/svg+xml,%3Csvg%3E%0A%3Crect%2F%3E%0A%3C%2Fsvg%3E"',
    );
    expect(html).toContain('aria-label="Logo"');
  });

  it("defaults the asset size and alt text to the asset name", () => {
    const html = render(
      { id: "img", type: "image", props: { asset: "logo" } },
      { assets: { logo: "<svg/>" } },
    );
    expect(html).toContain('aria-label="logo"');
  });

  it("falls back to a readable placeholder without an asset", () => {
    expect(
      render({ id: "img", type: "image", props: { asset: "missing" } }),
    ).toContain("image:missing");
    expect(render({ id: "img", type: "image" })).toContain("image:");
  });
});

describe("qr-code widget", () => {
  it("renders the value and optional caption", () => {
    const html = render({
      id: "q",
      type: "qr-code",
      props: { value: "tp://pair", caption: "Scan to pair" },
    });
    expect(html).toContain("tp://pair");
    expect(html).toContain("Scan to pair");
  });

  it("omits the caption when absent", () => {
    const html = render({
      id: "q",
      type: "qr-code",
      props: { value: "tp://pair" },
    });
    expect(html).toContain("tp://pair");
    expect(html).not.toContain("Scan");
  });
});

describe("device preview surfaces", () => {
  const sessions: ReadonlyArray<Session> = [
    { handle: "cam-1", classId: "camera", tierId: "hi", appId: "demo" },
    { handle: "loc-1", classId: "location", tierId: "coarse", appId: "demo" },
  ];

  it("labels a live camera preview from its session", () => {
    const html = render(
      { id: "cam", type: "camera-preview", props: { session: "cam-1" } },
      { deviceSessions: sessions },
    );
    expect(html).toContain("camera-preview · camera:hi · demo");
    expect(html).toContain("Host camera preview");
  });

  it("waits when no session matches", () => {
    const html = render(
      { id: "cam", type: "camera-preview", props: { session: "gone" } },
      { deviceSessions: sessions },
    );
    expect(html).toContain("camera-preview · waiting for session");
    expect(html).not.toContain("Host camera preview");
  });

  it("waits when the tree carries no sessions at all", () => {
    expect(render({ id: "cam", type: "camera-preview" })).toContain(
      "waiting for session",
    );
  });

  it("shows the map zoom for a live location session", () => {
    const live = render(
      {
        id: "map",
        type: "map-preview",
        props: { session: "loc-1", zoom: 15 },
      },
      { deviceSessions: sessions },
    );
    expect(live).toContain("Host map preview · zoom 15");

    const defaulted = render(
      { id: "map", type: "map-preview", props: { session: "loc-1" } },
      { deviceSessions: sessions },
    );
    expect(defaulted).toContain("Host map preview · zoom 12");
  });

  it("renders meters for audio surfaces", () => {
    expect(render({ id: "a", type: "audio-meter" })).toContain(
      'data-testid="a"',
    );
    expect(render({ id: "w", type: "waveform" })).toContain('data-testid="w"');
  });

  it("names the remote video peer", () => {
    expect(
      render({ id: "v", type: "remote-video", props: { peer: "bob" } }),
    ).toContain("peer=bob");
    expect(render({ id: "v", type: "remote-video" })).toContain("peer=—");
  });
});

describe("widget styles", () => {
  it("maps display none and every font weight", () => {
    expect(
      render({
        id: "t",
        type: "text",
        props: { value: "hidden" },
        style: { display: "none" },
      }),
    ).toContain("hidden");

    for (const fontWeight of ["bold", "medium", "regular"] as const) {
      expect(
        render({
          id: "t",
          type: "text",
          props: { value: fontWeight },
          style: { fontWeight, fontSize: 20, color: "#fff" },
        }),
      ).toContain(fontWeight);
    }
  });

  it("passes percentage and numeric sizes through", () => {
    const html = render({
      id: "v",
      type: "view",
      style: {
        width: "50%",
        height: 30,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 4,
        padding: 8,
        margin: 2,
        backgroundColor: "#000",
      },
    });
    expect(html).toContain('data-testid="v"');
  });
});
