/**
 * The Handbook reader runtime's pure helpers.
 *
 * `apps/handbook` sat at a coverage floor of 0 on all three metrics — in the
 * ratchet, measured, and constraining nothing. That was structural rather than
 * neglect: the runtime is four files concatenated into a mini-app bundle, and
 * nothing in them was exported, so the unit suite could not reach a single
 * line however much anyone wanted to. Exporting the pure half is what makes the
 * floor able to mean something; the rest still needs a host and stays with the
 * conformance runners.
 *
 * These are reader-facing behaviours, not incidental helpers. `chapterNeighbors`
 * is the previous/next links, `chapterMatchesSearch` is the search box,
 * `resultCard` is what an applet result reads like, and `diffReports` is the
 * comparison two people run when a chapter behaves differently on their two
 * devices.
 */
import { afterEach, describe, expect, it } from "vitest";

import {
  appletSupportsMode,
  chapterMatchesSearch,
  chapterNeighbors,
  diffDropCensus,
  diffReports,
  explainStatus,
  headingStyle,
  resultCard,
  textNode,
  widgetButton,
} from "../src/runtime-render.js";
import {
  SEED_BROKER_BATCH_SIZE,
  SEED_BROKER_PAUSE_MS,
  writeSeedsWithinBrokerBudget,
  writeWorkspaceSeedsWithinBrokerBudget,
} from "../src/runtime-seeds.js";

/**
 * `CATALOG` is injected above the runtime in the generated bundle, so on its
 * own the module reads it as a free global. Setting it here is what the bundle
 * does, not a shim around something the code does not do.
 */
function withCatalog(catalog) {
  globalThis.CATALOG = catalog;
}

afterEach(() => {
  delete globalThis.CATALOG;
});

const CATALOG = {
  parts: [
    { id: "p1", chapters: [{ id: "intro" }, { id: "install" }] },
    { id: "p2", chapters: [{ id: "troubleshooting" }] },
  ],
  chapters: [
    { id: "intro", searchText: "welcome to the handbook" },
    { id: "install", searchText: "installing a host" },
    { id: "troubleshooting", searchText: "when a link will not come up" },
  ],
  applets: [
    { id: "ping", expectations: { ios: "pass", android: "unavailable" } },
  ],
};

describe("chapterNeighbors", () => {
  it("walks parts in order, so next crosses a part boundary", () => {
    withCatalog(CATALOG);
    expect(chapterNeighbors("install")).toEqual({
      prev: "intro",
      next: "troubleshooting",
    });
  });

  it("has no previous at the start and no next at the end", () => {
    withCatalog(CATALOG);
    expect(chapterNeighbors("intro").prev).toBeNull();
    expect(chapterNeighbors("troubleshooting").next).toBeNull();
  });

  it("returns neither for a chapter that is not in the table of contents", () => {
    withCatalog(CATALOG);
    expect(chapterNeighbors("missing")).toEqual({ prev: null, next: null });
  });
});

describe("chapterMatchesSearch", () => {
  it("shows every chapter for an empty query", () => {
    withCatalog(CATALOG);
    expect(chapterMatchesSearch({ id: "intro", title: "Intro" }, "")).toBe(
      true,
    );
  });

  it("matches body text, not only the title", () => {
    // The whole point of indexing `searchText`: a reader searching for a phrase
    // they remember from the page should find the page.
    withCatalog(CATALOG);
    expect(
      chapterMatchesSearch({ id: "troubleshooting", title: "Fixing" }, "link"),
    ).toBe(true);
  });

  it("matches the title when the body does not", () => {
    withCatalog(CATALOG);
    expect(
      chapterMatchesSearch(
        { id: "install", title: "Getting started" },
        "start",
      ),
    ).toBe(true);
  });

  it("does not match an unrelated query", () => {
    withCatalog(CATALOG);
    expect(
      chapterMatchesSearch({ id: "intro", title: "Intro" }, "freenet"),
    ).toBe(false);
  });

  it("survives a chapter with no indexed text", () => {
    withCatalog({ ...CATALOG, chapters: [] });
    expect(chapterMatchesSearch({ id: "intro", title: "Intro" }, "intro")).toBe(
      true,
    );
  });
});

describe("Handbook workspace seeding", () => {
  it("writes short seed sets through the workspace adapter", async () => {
    const writes = [];
    await writeWorkspaceSeedsWithinBrokerBudget(
      [
        { path: "one", content: "first" },
        { path: "two", content: "second" },
      ],
      {
        write: async (path, content) => writes.push([path, content]),
      },
    );

    expect(writes).toEqual([
      ["one", "first"],
      ["two", "second"],
    ]);
  });

  it("paces generated writes below the broker's per-second message budget", async () => {
    const seeds = Array.from(
      { length: SEED_BROKER_BATCH_SIZE * 2 + 13 },
      (_, index) => ({ path: `seed-${index}`, content: String(index) }),
    );
    const batches = [];
    const writes = [];
    let writesSincePause = 0;

    await writeSeedsWithinBrokerBudget(
      seeds,
      async (path, content) => {
        writes.push([path, content]);
        writesSincePause += 1;
      },
      async (delayMs) => {
        batches.push({ delayMs, writes: writesSincePause });
        writesSincePause = 0;
      },
    );

    expect(batches).toEqual([
      { delayMs: SEED_BROKER_PAUSE_MS, writes: SEED_BROKER_BATCH_SIZE },
      { delayMs: SEED_BROKER_PAUSE_MS, writes: SEED_BROKER_BATCH_SIZE },
    ]);
    expect(writesSincePause).toBe(13);
    expect(writes).toHaveLength(seeds.length);
    expect(writes.at(-1)).toEqual([
      `seed-${seeds.length - 1}`,
      String(seeds.length - 1),
    ]);
  });
});

describe("appletSupportsMode", () => {
  it("defaults to inline when an applet declares no modes", () => {
    expect(appletSupportsMode({}, "inline")).toBe(true);
    expect(appletSupportsMode({}, "devstudio")).toBe(false);
  });

  it("honours a declared mode list", () => {
    expect(
      appletSupportsMode({ executionModes: ["devstudio"] }, "devstudio"),
    ).toBe(true);
    expect(
      appletSupportsMode({ executionModes: ["devstudio"] }, "inline"),
    ).toBe(false);
  });
});

describe("widget builders", () => {
  it("builds a button carrying its event", () => {
    expect(widgetButton("open", "Open", "hb.open")).toEqual({
      id: "open",
      type: "button",
      props: { label: "Open", event: "hb.open" },
    });
  });

  it("omits style entirely rather than emitting undefined", () => {
    expect(textNode("t", "hello")).toEqual({
      id: "t",
      type: "text",
      props: { value: "hello" },
    });
  });

  it("keeps a style when one is given", () => {
    expect(textNode("t", "hello", { fontSize: 12 }).style).toEqual({
      fontSize: 12,
    });
  });

  it("scales headings by level and floors at the deepest size", () => {
    expect(headingStyle(1).fontSize).toBe(24);
    expect(headingStyle(2).fontSize).toBe(20);
    expect(headingStyle(3).fontSize).toBe(16);
    expect(headingStyle(6)).toEqual(headingStyle(3));
  });
});

describe("resultCard", () => {
  it("says so when an applet has not been run", () => {
    expect(resultCard("ping", undefined).props.value).toBe("Not run yet.");
  });

  it("shows the status, the timing and the details", () => {
    const card = resultCard("ping", {
      status: "pass",
      timings: { ms: 12 },
      details: "all good",
    });
    expect(card.id).toBe("result-ping");
    expect(card.props.value).toBe("PASS (12 ms)\nall good");
  });

  it("omits the timing when the applet did not report one", () => {
    expect(
      resultCard("ping", { status: "pass", details: "all good" }).props.value,
    ).toBe("PASS\nall good");
  });

  it("promotes a guided procedure for a result a person has to act on", () => {
    // An unavailable or skipped applet often carries manual steps. Burying them
    // under the raw details is what this branch exists to avoid.
    const card = resultCard("ping", {
      status: "unavailable",
      details: "No radio.\nGuided procedure for ping:\n  1. Attach an RNode\n",
    });
    expect(card.props.value).toBe(
      "UNAVAILABLE\n\nGuided procedure:\n1. Attach an RNode",
    );
  });

  it("leaves a passing result's details alone even if it mentions a procedure", () => {
    const card = resultCard("ping", {
      status: "pass",
      details: "Guided procedure for ping:\n  1. Nothing to do\n",
    });
    expect(card.props.value.startsWith("PASS\nGuided procedure")).toBe(true);
  });
});

describe("explainStatus", () => {
  it("explains each status a reader can hit, and nothing else", () => {
    expect(explainStatus("not-granted")).toContain("withheld");
    expect(explainStatus("unavailable")).toContain("platform difference");
    expect(explainStatus("skipped")).toBe("Skipped.");
    expect(explainStatus("pass")).toBeNull();
  });
});

describe("diffDropCensus", () => {
  it("reports a reason present on one side only as a difference", () => {
    const rows = diffDropCensus(
      { dropCensus: { byReason: { budget: 2 } } },
      { dropCensus: { byReason: {} } },
    );
    expect(rows).toEqual([
      expect.objectContaining({
        appletId: "drop:budget",
        local: "2",
        remote: "0",
        same: false,
        unexpected: true,
      }),
    ]);
  });

  it("is quiet when both sides dropped the same", () => {
    const rows = diffDropCensus(
      { dropCensus: { byReason: { budget: 2 } } },
      { dropCensus: { byReason: { budget: 2 } } },
    );
    expect(rows[0]).toMatchObject({ same: true, unexpected: false });
  });

  it("handles a report with no drop census at all", () => {
    expect(diffDropCensus({}, {})).toEqual([]);
  });
});

describe("diffReports", () => {
  const local = {
    host: { platform: "ios" },
    results: [{ appletId: "ping", status: "pass" }],
  };

  it("calls a matching status the same", () => {
    withCatalog(CATALOG);
    const rows = diffReports(local, {
      host: { platform: "ios" },
      results: [{ appletId: "ping", status: "pass" }],
    });
    expect(rows).toEqual([
      expect.objectContaining({ same: true, note: "same status" }),
    ]);
  });

  it("calls a difference the catalog predicted an expected one", () => {
    // The distinction that makes this comparison worth running: iOS passing
    // where Android is documented unavailable is not a bug report.
    withCatalog(CATALOG);
    const rows = diffReports(local, {
      host: { platform: "android" },
      results: [{ appletId: "ping", status: "unavailable" }],
    });
    expect(rows[0]).toMatchObject({
      same: false,
      expectedDiff: true,
      unexpected: false,
      note: "expected pass vs unavailable",
    });
  });

  it("flags a difference nobody predicted", () => {
    withCatalog(CATALOG);
    const rows = diffReports(local, {
      host: { platform: "ios" },
      results: [{ appletId: "ping", status: "fail" }],
    });
    expect(rows[0]).toMatchObject({
      unexpected: true,
      note: "unexpected difference",
    });
  });

  it("reports an applet the other host did not run at all", () => {
    withCatalog(CATALOG);
    const rows = diffReports(local, { host: { platform: "ios" }, results: [] });
    expect(rows[0]).toMatchObject({ remote: "missing", unexpected: true });
  });

  it("prefers the result's own expectations over the catalog's", () => {
    withCatalog(CATALOG);
    const rows = diffReports(
      {
        host: { platform: "ios" },
        results: [
          { appletId: "ping", status: "pass", expectations: { ios: "custom" } },
        ],
      },
      {
        host: { platform: "android" },
        results: [{ appletId: "ping", status: "unavailable" }],
      },
    );
    expect(rows[0].localExpected).toBe("custom");
  });
});
