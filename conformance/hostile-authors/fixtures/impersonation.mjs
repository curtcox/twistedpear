/**
 * Surface 3 — the app pretending to be the host (HA-20…HA-24).
 * Layer A (CHROME-R8/R9) rejects these trees at ui.render.
 */
import { validateWidgetTree } from "../../../packages/miniapp-runtime/dist/index.js";
import { dispatch, denyCode, makeHost } from "./harness.mjs";

const APP = {
  name: "notes",
  publisherPublicKey: "pub",
  capabilities: [],
};

function blocked(response, pattern) {
  const code = denyCode(response, "INVALID_WIDGET");
  const message = response.error?.message ?? "";
  return code === "INVALID_WIDGET" && pattern.test(message);
}

async function render(tree) {
  const host = makeHost();
  return dispatch(host, "ui", "render", undefined, { tree }, APP);
}

export async function runImpersonationScenarios() {
  const ha20 = await render({
    root: {
      id: "root",
      type: "view",
      children: [
        { id: "copy", type: "text", props: { value: "Grant this app?" } },
        { id: "deny", type: "button", props: { label: "Deny", event: "d" } },
        { id: "ok", type: "button", props: { label: "Approve", event: "a" } },
      ],
    },
  });
  const ha21 = await render({
    root: {
      id: "ask",
      type: "text",
      props: { value: "Type your recovery phrase to continue." },
    },
  });
  const ha22 = await render({
    root: {
      id: "soft",
      type: "text",
      props: {
        value: "This app needs a few permissions to look like a notes app.",
      },
    },
  });
  const ha23 = await render({
    root: {
      id: "banner",
      type: "text",
      props: { value: "Host update required — approve to continue" },
    },
  });
  const ha24 = await render({
    root: {
      id: "claim",
      type: "text",
      props: { value: "TwistedPear has verified this publisher" },
    },
  });

  // Direct validator keeps the oracle independent of dispatch wrapping.
  let validatorOk = false;
  try {
    validateWidgetTree({
      root: { id: "ask", type: "text", props: { value: "Enter seed words" } },
    });
  } catch (error) {
    validatorOk = error instanceof Error && /CHROME-R9/.test(error.message);
  }

  return [
    {
      id: "HA-20",
      measured: blocked(ha20, /CHROME-R8/) ? "BLOCKED" : "UNCONTROLLED",
      note: "Grant-screen Approve/Deny pair is CHROME-R8 layout imitation.",
    },
    {
      id: "HA-21",
      measured:
        blocked(ha21, /CHROME-R9/) && validatorOk ? "BLOCKED" : "UNCONTROLLED",
      note: "Recovery-phrase solicitation is CHROME-R9. Highest-severity catalog row.",
    },
    {
      id: "HA-22",
      measured: blocked(ha22, /CHROME-R8/) ? "BLOCKED" : "UNCONTROLLED",
      note: "Softened permissions pre-prompt matches reserved lexicon.",
    },
    {
      id: "HA-23",
      measured: blocked(ha23, /CHROME-R8/) ? "BLOCKED" : "UNCONTROLLED",
      note: "Fake host-update banner is CHROME-R8 reserved lexicon.",
    },
    {
      id: "HA-24",
      measured: blocked(ha24, /CHROME-R8/) ? "BLOCKED" : "UNCONTROLLED",
      note: "TwistedPear authority claim is CHROME-R8 reserved lexicon.",
    },
  ];
}
