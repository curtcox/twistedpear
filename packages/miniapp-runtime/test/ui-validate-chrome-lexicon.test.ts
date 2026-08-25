import { describe, expect, it } from "vitest";
import { describeCapability, validateWidgetTree } from "../src/index.js";
import type { WidgetNode, WidgetTree } from "../src/ui/schema.js";

function tree(children: ReadonlyArray<WidgetNode>): WidgetTree {
  return {
    root: { id: "root", type: "view", children },
  };
}

function rejects(subject: WidgetTree, pattern: RegExp): void {
  expect(() => validateWidgetTree(subject)).toThrow(pattern);
}

describe("CHROME-R8 reserved lexicon", () => {
  it("accepts ordinary app copy", () => {
    expect(
      validateWidgetTree(
        tree([
          { id: "title", type: "text", props: { value: "Notes" } },
          {
            id: "save",
            type: "button",
            props: { label: "Save", event: "notes.save" },
          },
        ]),
      ),
    ).toMatchObject({ root: { id: "root" } });
  });

  it("rejects a grant-screen Approve/Deny pair", () => {
    rejects(
      tree([
        {
          id: "copy",
          type: "text",
          props: { value: "Allow this app to send messages?" },
        },
        { id: "deny", type: "button", props: { label: "Deny", event: "x" } },
        { id: "ok", type: "button", props: { label: "Approve", event: "y" } },
      ]),
      /CHROME-R8.*grant-screen layout/,
    );
  });

  it("rejects Allow/Not now siblings", () => {
    rejects(
      tree([
        { id: "n", type: "button", props: { label: "Not now", event: "n" } },
        { id: "a", type: "button", props: { label: "Allow", event: "a" } },
      ]),
      /CHROME-R8.*grant-screen layout/,
    );
  });

  it("rejects a TwistedPear authority claim", () => {
    rejects(
      tree([
        {
          id: "claim",
          type: "text",
          props: { value: "TwistedPear has verified this publisher" },
        },
      ]),
      /CHROME-R8.*twistedpear has verified/,
    );
  });

  it("rejects a fake host-update banner", () => {
    rejects(
      tree([
        {
          id: "banner",
          type: "text",
          props: { value: "Host update required — approve to continue" },
        },
      ]),
      /CHROME-R8.*host update required/,
    );
  });

  it("rejects a softened permissions pre-prompt", () => {
    rejects(
      tree([
        {
          id: "soft",
          type: "text",
          props: { value: "This app needs a few permissions to sync." },
        },
      ]),
      /CHROME-R8.*this app needs/,
    );
  });

  it("rejects a copied canonical capability description", () => {
    rejects(
      tree([
        {
          id: "grant",
          type: "text",
          props: { value: describeCapability("lxmf:send") },
        },
      ]),
      /CHROME-R8.*canonical capability description/,
    );
  });

  it("rejects reserved copy hidden with zero-width characters", () => {
    rejects(
      tree([
        {
          id: "zw",
          type: "text",
          props: { value: "Twisted\u200BPear has verified this publisher" },
        },
      ]),
      /CHROME-R8/,
    );
  });

  it("allows a single Approve button without a deny sibling", () => {
    expect(
      validateWidgetTree(
        tree([
          {
            id: "ok",
            type: "button",
            props: { label: "Approve", event: "task.ok" },
          },
        ]),
      ),
    ).toMatchObject({ root: { id: "root" } });
  });
});

describe("CHROME-R9 no secret solicitation", () => {
  it("rejects a recovery-phrase prompt", () => {
    rejects(
      tree([
        {
          id: "ask",
          type: "text",
          props: { value: "Type your recovery phrase to unlock backup sync." },
        },
        {
          id: "input",
          type: "text-input",
          props: { placeholder: "24 words", event: "secret" },
        },
      ]),
      /CHROME-R9.*recovery phrase/,
    );
  });

  it("rejects seed-word solicitation in a placeholder", () => {
    rejects(
      {
        root: {
          id: "box",
          type: "text-input",
          props: { placeholder: "Enter seed words", event: "w" },
        },
      },
      /CHROME-R9.*seed words/,
    );
  });

  it("rejects an identity-string paste lure", () => {
    rejects(
      tree([
        {
          id: "lure",
          type: "text",
          props: {
            value: "Paste your identity string to unlock community apps.",
          },
        },
      ]),
      /CHROME-R9.*identity string/,
    );
  });

  it("rejects secret solicitation hidden in accessibilityHint", () => {
    rejects(
      {
        root: {
          id: "go",
          type: "button",
          props: {
            label: "Continue",
            event: "x",
            accessibilityHint: "Enter your recovery phrase to continue",
          },
        },
      },
      /CHROME-R9.*recovery phrase/,
    );
  });
});
