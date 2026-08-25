import { describe, expect, it } from "vitest";
import {
  ACCESSIBILITY_HINT_TYPES,
  ACCESSIBILITY_LABEL_TYPES,
  MAX_ACCESSIBILITY_TEXT_LENGTH,
  validateWidgetTree,
} from "../src/index.js";

function root(node: object): { root: object } {
  return { root: { id: "n", ...node } };
}

describe("bounded accessibility prop set", () => {
  it("accepts the closed prop set on the types that own it", () => {
    expect(() =>
      validateWidgetTree({
        root: {
          id: "root",
          type: "view",
          props: { accessibilityLabel: "Form", live: "polite" },
          children: [
            {
              id: "title",
              type: "text",
              props: { value: "Sign in", heading: 1, live: "assertive" },
            },
            {
              id: "hero",
              type: "image",
              props: { asset: "mark.png", decorative: true },
            },
            {
              id: "go",
              type: "button",
              props: { label: "Continue", accessibilityHint: "Saves the form" },
            },
            {
              id: "alerts",
              type: "switch",
              props: {
                value: false,
                accessibilityLabel: "Alerts",
                accessibilityHint: "Toggles alert delivery",
              },
            },
            {
              id: "cam",
              type: "camera-preview",
              props: { session: "sess-1", accessibilityLabel: "Rear camera" },
            },
          ],
        },
      }),
    ).not.toThrow();
  });

  it("accepts an accessibilityLabel of exactly 128 characters", () => {
    expect(() =>
      validateWidgetTree(
        root({
          type: "view",
          props: {
            accessibilityLabel: "x".repeat(MAX_ACCESSIBILITY_TEXT_LENGTH),
          },
        }),
      ),
    ).not.toThrow();
  });

  it("rejects an empty or oversized accessibilityLabel", () => {
    expect(() =>
      validateWidgetTree(
        root({ type: "view", props: { accessibilityLabel: "" } }),
      ),
    ).toThrow(/accessibilityLabel/);
    expect(() =>
      validateWidgetTree(
        root({
          type: "view",
          props: {
            accessibilityLabel: "x".repeat(MAX_ACCESSIBILITY_TEXT_LENGTH + 1),
          },
        }),
      ),
    ).toThrow(/accessibilityLabel/);
  });

  it("rejects accessibilityHint on a non-interactive type", () => {
    expect(() =>
      validateWidgetTree(
        root({ type: "view", props: { accessibilityHint: "Does nothing" } }),
      ),
    ).toThrow(/Unsupported/);
  });

  it("rejects accessibilityLabel on button (name is label)", () => {
    expect(() =>
      validateWidgetTree(
        root({
          type: "button",
          props: { label: "Go", accessibilityLabel: "Also Go" },
        }),
      ),
    ).toThrow(/Unsupported/);
    expect(ACCESSIBILITY_LABEL_TYPES.has("button")).toBe(false);
    expect(ACCESSIBILITY_HINT_TYPES.has("button")).toBe(true);
  });

  it("rejects heading outside 1-6 and live outside polite|assertive", () => {
    expect(() =>
      validateWidgetTree(
        root({ type: "text", props: { value: "Title", heading: 7 } }),
      ),
    ).toThrow(/heading/);
    expect(() =>
      validateWidgetTree(
        root({ type: "text", props: { value: "Title", heading: 1.5 } }),
      ),
    ).toThrow(/heading/);
    expect(() =>
      validateWidgetTree(root({ type: "view", props: { live: "rude" } })),
    ).toThrow(/live/);
  });

  it("rejects decorative values other than true", () => {
    expect(() =>
      validateWidgetTree(
        root({ type: "image", props: { asset: "x.png", decorative: false } }),
      ),
    ).toThrow(/decorative/);
  });
});
