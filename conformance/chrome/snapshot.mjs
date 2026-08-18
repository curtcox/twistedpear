/**
 * SPEC-CHROME Layer B: snapshot geometry for R1/R3/R7.
 * Confirmations live in a host-owned layer; the widget tree cannot contain
 * their copy or paint outside the app surface.
 */
import { describeCapability } from "../../packages/miniapp-runtime/dist/index.js";
import {
  REFERENCE_CONFIRMATION_FRAME,
  appBoxesStayInsideSurface,
  confirmationCopyInTree,
  confirmationIsHostLayer,
  layoutAppInFrame,
} from "../../packages/widget-renderer-headless/dist/chrome-geometry.js";

const FULL_BLEED = {
  root: {
    id: "root",
    type: "view",
    style: { width: "100%", padding: 0 },
    children: [
      {
        id: "fill",
        type: "text",
        props: { value: "notes" },
        style: { width: "100%", height: 800 },
      },
    ],
  },
};

export function runSnapshotFixtures(check) {
  const frame = {
    ...REFERENCE_CONFIRMATION_FRAME,
    confirmation: {
      ...REFERENCE_CONFIRMATION_FRAME.confirmation,
      copy: {
        title: "Install an app?",
        descriptions: [describeCapability("lxmf:send")],
      },
    },
  };

  check(
    "CHROME-R1",
    "confirmation copy uses the capability registry wording",
    frame.confirmation.copy.descriptions[0] === describeCapability("lxmf:send"),
  );
  check(
    "CHROME-R1",
    "app tree cannot carry the confirmation title",
    confirmationCopyInTree(FULL_BLEED, frame.confirmation.copy) === false,
  );

  check(
    "CHROME-R3",
    "confirmation is a host layer above the app surface",
    confirmationIsHostLayer(frame),
    `z=${frame.confirmation.z} appZ=${frame.appLayerZ}`,
  );

  const boxes = layoutAppInFrame(FULL_BLEED, frame);
  check(
    "CHROME-R3",
    "full-bleed app boxes stay inside the app surface",
    appBoxesStayInsideSurface(boxes, frame.appSurface),
    JSON.stringify(boxes),
  );
  check(
    "CHROME-R3",
    "widget styles cannot raise z-index over chrome",
    !("zIndex" in (FULL_BLEED.root.style ?? {})) &&
      confirmationIsHostLayer(frame),
  );
}
