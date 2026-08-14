/**
 * Pure LINKIDENTIFY payload layout and acceptance gates.
 * Signature verification stays at the crypto adapter edge.
 * Pack / split / signed-material / acceptance conclusions leave via machine
 * actions (no ad-hoc `packLinkIdentifyPayload` / `splitLinkIdentifyPayload` /
 * `linkIdentifySignedMaterial` / `plan.kind` reads beside the step).
 * Accept-before-decrypt / identify-outcome-plan / commit-remote-identity
 * gates conclude via machine actions (no ad-hoc `canAcceptLinkIdentify` /
 * `planLinkIdentifyOutcome` / `outcome ===` /
 * `shouldCommitLinkRemoteIdentity` reads beside the step).
 */
import type { Event, Intent, StepFn } from "@twistedpear/effects";
import { firstAction, firstActionOfKind, hasActionOfKind } from "./action-kind.js";

export const LINK_IDENTIFY_PUBLIC_KEY_SIZE = 64;
export const LINK_IDENTIFY_SIGNATURE_SIZE = 64;
export const LINK_IDENTIFY_PAYLOAD_SIZE =
  LINK_IDENTIFY_PUBLIC_KEY_SIZE + LINK_IDENTIFY_SIGNATURE_SIZE;

export function canAcceptLinkIdentify(initiator: boolean): boolean {
  return !initiator;
}

/**
 * Link-identify accept gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `canAcceptLinkIdentify`
 * reads beside the step).
 */
export type AcceptLinkIdentifyState = Record<string, never>;

export type AcceptLinkIdentifyEvent =
  | Event
  | {
      readonly kind: "link-identify/accept-gate";
      readonly initiator: boolean;
    };

export type AcceptLinkIdentifyAction =
  { readonly kind: "accept" } | { readonly kind: "skip" };

export interface AcceptLinkIdentifyStepResult {
  readonly state: AcceptLinkIdentifyState;
  readonly intents: readonly Intent[];
  readonly actions: readonly AcceptLinkIdentifyAction[];
}

export function initialAcceptLinkIdentifyState(): AcceptLinkIdentifyState {
  return {};
}

export function stepAcceptLinkIdentifyWithActions(
  state: AcceptLinkIdentifyState,
  event: AcceptLinkIdentifyEvent,
): AcceptLinkIdentifyStepResult {
  if (event.kind === "link-identify/accept-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: canAcceptLinkIdentify(event.initiator) ? "accept" : "skip",
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldAcceptLinkIdentifyNow(
  actions: ReadonlyArray<AcceptLinkIdentifyAction>,
): boolean {
  return hasActionOfKind(actions, "accept");
}

export function shouldSkipLinkIdentifyAccept(
  actions: ReadonlyArray<AcceptLinkIdentifyAction>,
): boolean {
  return hasActionOfKind(actions, "skip");
}

export type LinkIdentifyOutcome = "accept" | "reject";

/**
 * Whether LINKIDENTIFY payload crypto gates allow setting remoteIdentity.
 * Decrypt / split / key load / signature verification stay at the adapter edge.
 */
export function planLinkIdentifyOutcome(input: {
  readonly canAccept: boolean;
  readonly plaintextPresent: boolean;
  readonly partsPresent: boolean;
  readonly identityPresent: boolean;
  readonly signatureValid: boolean;
}): LinkIdentifyOutcome {
  if (
    !input.canAccept ||
    !input.plaintextPresent ||
    !input.partsPresent ||
    !input.identityPresent ||
    !input.signatureValid
  ) {
    return "reject";
  }
  return "accept";
}

/**
 * Identify-outcome plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planLinkIdentifyOutcome` /
 * `outcome ===` reads beside the step). Nested under
 * {@link stepLinkIdentifyWithActions}.
 */
export type LinkIdentifyOutcomePlanState = Record<string, never>;

export type LinkIdentifyOutcomePlanEvent =
  | Event
  | {
      readonly kind: "identify/outcome-plan-gate";
      readonly canAccept: boolean;
      readonly plaintextPresent: boolean;
      readonly partsPresent: boolean;
      readonly identityPresent: boolean;
      readonly signatureValid: boolean;
    };

export type LinkIdentifyOutcomePlanAction =
  { readonly kind: "accept" } | { readonly kind: "reject" };

export interface LinkIdentifyOutcomePlanStepResult {
  readonly state: LinkIdentifyOutcomePlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LinkIdentifyOutcomePlanAction[];
}

export function initialLinkIdentifyOutcomePlanState(): LinkIdentifyOutcomePlanState {
  return {};
}

export function stepLinkIdentifyOutcomePlanWithActions(
  state: LinkIdentifyOutcomePlanState,
  event: LinkIdentifyOutcomePlanEvent,
): LinkIdentifyOutcomePlanStepResult {
  if (event.kind === "identify/outcome-plan-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: planLinkIdentifyOutcome({
            canAccept: event.canAccept,
            plaintextPresent: event.plaintextPresent,
            partsPresent: event.partsPresent,
            identityPresent: event.identityPresent,
            signatureValid: event.signatureValid,
          }),
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldAcceptLinkIdentifyOutcomePlan(
  actions: ReadonlyArray<LinkIdentifyOutcomePlanAction>,
): boolean {
  return hasActionOfKind(actions, "accept");
}

export function shouldRejectLinkIdentifyOutcomePlan(
  actions: ReadonlyArray<LinkIdentifyOutcomePlanAction>,
): boolean {
  return hasActionOfKind(actions, "reject");
}

/** Extract the identify-outcome plan from actions; null when empty. */
export function linkIdentifyOutcomePlanFromActions(
  actions: ReadonlyArray<LinkIdentifyOutcomePlanAction>,
): LinkIdentifyOutcome | null {
  const action = firstAction(actions);
  return action?.kind ?? null;
}

/**
 * Whether LINKIDENTIFY may commit remoteIdentity after {@link planLinkIdentifyOutcome}
 * and the identity reference remains present for narrowing.
 */
export function shouldCommitLinkRemoteIdentity(input: {
  readonly planAccept: boolean;
  readonly identityPresent: boolean;
}): boolean {
  return input.planAccept && input.identityPresent;
}

/**
 * LINKIDENTIFY commit-remote-identity apply gate is event-driven; no durable
 * session fields. Conclusions leave via machine actions (no ad-hoc
 * `shouldCommitLinkRemoteIdentity` reads beside the step).
 */
export type CommitLinkRemoteIdentityState = Record<string, never>;

export type CommitLinkRemoteIdentityEvent =
  | Event
  | {
      readonly kind: "link-identify/commit-remote-identity-gate";
      readonly planAccept: boolean;
      readonly identityPresent: boolean;
    };

export type CommitLinkRemoteIdentityAction =
  { readonly kind: "commit" } | { readonly kind: "skip" };

export interface CommitLinkRemoteIdentityStepResult {
  readonly state: CommitLinkRemoteIdentityState;
  readonly intents: readonly Intent[];
  readonly actions: readonly CommitLinkRemoteIdentityAction[];
}

export function initialCommitLinkRemoteIdentityState(): CommitLinkRemoteIdentityState {
  return {};
}

export function stepCommitLinkRemoteIdentityWithActions(
  state: CommitLinkRemoteIdentityState,
  event: CommitLinkRemoteIdentityEvent,
): CommitLinkRemoteIdentityStepResult {
  if (event.kind === "link-identify/commit-remote-identity-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldCommitLinkRemoteIdentity({
            planAccept: event.planAccept,
            identityPresent: event.identityPresent,
          })
            ? "commit"
            : "skip",
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldCommitLinkRemoteIdentityNow(
  actions: ReadonlyArray<CommitLinkRemoteIdentityAction>,
): boolean {
  return hasActionOfKind(actions, "commit");
}

export function shouldSkipCommitLinkRemoteIdentity(
  actions: ReadonlyArray<CommitLinkRemoteIdentityAction>,
): boolean {
  return hasActionOfKind(actions, "skip");
}

export interface LinkIdentifyState {
  readonly initiator: boolean;
}

export type LinkIdentifyEvent =
  | Event
  | {
      readonly kind: "identify/received";
      readonly plaintextPresent: boolean;
      readonly partsPresent: boolean;
      readonly identityPresent: boolean;
      readonly signatureValid: boolean;
    };

/**
 * Adapter applies reject / commit only from these actions.
 * Plan nested via {@link stepLinkIdentifyOutcomePlanWithActions}
 * (`accept`|`reject`).
 */
export type LinkIdentifyAction =
  { readonly kind: "reject" } | { readonly kind: "commit" };

export interface LinkIdentifyStepResult {
  readonly state: LinkIdentifyState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LinkIdentifyAction[];
}

export function initialLinkIdentifyState(input: {
  readonly initiator: boolean;
}): LinkIdentifyState {
  return { initiator: input.initiator };
}

export const stepLinkIdentify: StepFn<LinkIdentifyState> = (state, event) => {
  const result = stepLinkIdentifyInner(state, event as LinkIdentifyEvent);
  return { state: result.state, intents: result.intents };
};

export function stepLinkIdentifyWithActions(
  state: LinkIdentifyState,
  event: LinkIdentifyEvent,
): LinkIdentifyStepResult {
  return stepLinkIdentifyInner(state, event);
}

/** Whether step actions include reject. */
export function shouldRejectLinkIdentify(
  actions: ReadonlyArray<LinkIdentifyAction>,
): boolean {
  return hasActionOfKind(actions, "reject");
}

/** Whether step actions include commit (set remoteIdentity + callback). */
export function shouldCommitLinkIdentify(
  actions: ReadonlyArray<LinkIdentifyAction>,
): boolean {
  return hasActionOfKind(actions, "commit");
}

function stepLinkIdentifyInner(
  state: LinkIdentifyState,
  event: LinkIdentifyEvent,
): LinkIdentifyStepResult {
  if (event.kind === "identify/received") {
    const planActions = stepLinkIdentifyOutcomePlanWithActions(
      initialLinkIdentifyOutcomePlanState(),
      {
        kind: "identify/outcome-plan-gate",
        canAccept: canAcceptLinkIdentify(state.initiator),
        plaintextPresent: event.plaintextPresent,
        partsPresent: event.partsPresent,
        identityPresent: event.identityPresent,
        signatureValid: event.signatureValid,
      },
    ).actions;
    const commitStepped = stepCommitLinkRemoteIdentityWithActions(
      initialCommitLinkRemoteIdentityState(),
      {
        kind: "link-identify/commit-remote-identity-gate",
        planAccept: shouldAcceptLinkIdentifyOutcomePlan(planActions),
        identityPresent: event.identityPresent,
      },
    );
    if (!shouldCommitLinkRemoteIdentityNow(commitStepped.actions)) {
      return { state, intents: [], actions: [{ kind: "reject" }] };
    }
    return { state, intents: [], actions: [{ kind: "commit" }] };
  }

  return { state, intents: [], actions: [] };
}

export interface LinkIdentifyPayloadFields {
  readonly publicKey: Uint8Array;
  readonly signature: Uint8Array;
}

export function splitLinkIdentifyPayload(
  plaintext: Uint8Array,
): LinkIdentifyPayloadFields | null {
  if (plaintext.length !== LINK_IDENTIFY_PAYLOAD_SIZE) {
    return null;
  }
  return {
    publicKey: plaintext.subarray(0, LINK_IDENTIFY_PUBLIC_KEY_SIZE),
    signature: plaintext.subarray(
      LINK_IDENTIFY_PUBLIC_KEY_SIZE,
      LINK_IDENTIFY_PAYLOAD_SIZE,
    ),
  };
}

/** Bytes signed by the identifying identity: linkId || publicKey. */
export function linkIdentifySignedMaterial(
  linkId: Uint8Array,
  publicKey: Uint8Array,
): Uint8Array {
  const out = new Uint8Array(linkId.length + publicKey.length);
  out.set(linkId, 0);
  out.set(publicKey, linkId.length);
  return out;
}

/**
 * Link-identify signed-material assembly is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `linkIdentifySignedMaterial`
 * reads beside the step).
 */
export type LinkIdentifySignedMaterialState = Record<string, never>;

export type LinkIdentifySignedMaterialEvent =
  | Event
  | {
      readonly kind: "link-identify/signed-material-gate";
      readonly linkId: Uint8Array;
      readonly publicKey: Uint8Array;
    };

export type LinkIdentifySignedMaterialAction = {
  readonly kind: "use-raw";
  readonly raw: Uint8Array;
};

export interface LinkIdentifySignedMaterialStepResult {
  readonly state: LinkIdentifySignedMaterialState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LinkIdentifySignedMaterialAction[];
}

export function initialLinkIdentifySignedMaterialState(): LinkIdentifySignedMaterialState {
  return {};
}

export function stepLinkIdentifySignedMaterialWithActions(
  state: LinkIdentifySignedMaterialState,
  event: LinkIdentifySignedMaterialEvent,
): LinkIdentifySignedMaterialStepResult {
  if (event.kind === "link-identify/signed-material-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: "use-raw",
          raw: linkIdentifySignedMaterial(event.linkId, event.publicKey),
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldUseLinkIdentifySignedMaterial(
  actions: ReadonlyArray<LinkIdentifySignedMaterialAction>,
): boolean {
  return hasActionOfKind(actions, "use-raw");
}

/** Extract link-identify signed material from step actions; null when no `use-raw`. */
export function linkIdentifySignedMaterialRawFromActions(
  actions: ReadonlyArray<LinkIdentifySignedMaterialAction>,
): Uint8Array | null {
  return firstActionOfKind(actions, "use-raw")?.raw ?? null;
}

/** Pack identify plaintext for outbound LINKIDENTIFY (publicKey || signature). */
export function packLinkIdentifyPayload(
  publicKey: Uint8Array,
  signature: Uint8Array,
): Uint8Array {
  if (
    publicKey.length !== LINK_IDENTIFY_PUBLIC_KEY_SIZE ||
    signature.length !== LINK_IDENTIFY_SIGNATURE_SIZE
  ) {
    throw new Error("Invalid link identify key or signature size");
  }
  const out = new Uint8Array(LINK_IDENTIFY_PAYLOAD_SIZE);
  out.set(publicKey, 0);
  out.set(signature, LINK_IDENTIFY_PUBLIC_KEY_SIZE);
  return out;
}

/**
 * Link-identify pack framing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `packLinkIdentifyPayload`
 * reads beside the step). Invalid sizes become `reject` (helper may throw).
 */
export type PackLinkIdentifyPayloadState = Record<string, never>;

export type PackLinkIdentifyPayloadEvent =
  | Event
  | {
      readonly kind: "link-identify/pack-gate";
      readonly publicKey: Uint8Array;
      readonly signature: Uint8Array;
    };

export type PackLinkIdentifyPayloadAction =
  | { readonly kind: "use-raw"; readonly raw: Uint8Array }
  | { readonly kind: "reject" };

export interface PackLinkIdentifyPayloadStepResult {
  readonly state: PackLinkIdentifyPayloadState;
  readonly intents: readonly Intent[];
  readonly actions: readonly PackLinkIdentifyPayloadAction[];
}

export function initialPackLinkIdentifyPayloadState(): PackLinkIdentifyPayloadState {
  return {};
}

export function stepPackLinkIdentifyPayloadWithActions(
  state: PackLinkIdentifyPayloadState,
  event: PackLinkIdentifyPayloadEvent,
): PackLinkIdentifyPayloadStepResult {
  if (event.kind === "link-identify/pack-gate") {
    try {
      return {
        state,
        intents: [],
        actions: [
          {
            kind: "use-raw",
            raw: packLinkIdentifyPayload(event.publicKey, event.signature),
          },
        ],
      };
    } catch {
      return { state, intents: [], actions: [{ kind: "reject" }] };
    }
  }

  return { state, intents: [], actions: [] };
}

export function shouldUsePackLinkIdentifyPayload(
  actions: ReadonlyArray<PackLinkIdentifyPayloadAction>,
): boolean {
  return hasActionOfKind(actions, "use-raw");
}

export function shouldRejectPackLinkIdentifyPayload(
  actions: ReadonlyArray<PackLinkIdentifyPayloadAction>,
): boolean {
  return hasActionOfKind(actions, "reject");
}

/** Extract packed identify payload from step actions; null when no `use-raw`. */
export function packLinkIdentifyPayloadRawFromActions(
  actions: ReadonlyArray<PackLinkIdentifyPayloadAction>,
): Uint8Array | null {
  return firstActionOfKind(actions, "use-raw")?.raw ?? null;
}

/**
 * Link-identify split framing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `splitLinkIdentifyPayload`
 * reads beside the step).
 */
export type SplitLinkIdentifyPayloadState = Record<string, never>;

export type SplitLinkIdentifyPayloadEvent =
  | Event
  | {
      readonly kind: "link-identify/split-gate";
      readonly plaintext: Uint8Array;
    };

export type SplitLinkIdentifyPayloadAction =
  | { readonly kind: "use-fields"; readonly fields: LinkIdentifyPayloadFields }
  | { readonly kind: "reject" };

export interface SplitLinkIdentifyPayloadStepResult {
  readonly state: SplitLinkIdentifyPayloadState;
  readonly intents: readonly Intent[];
  readonly actions: readonly SplitLinkIdentifyPayloadAction[];
}

export function initialSplitLinkIdentifyPayloadState(): SplitLinkIdentifyPayloadState {
  return {};
}

export function stepSplitLinkIdentifyPayloadWithActions(
  state: SplitLinkIdentifyPayloadState,
  event: SplitLinkIdentifyPayloadEvent,
): SplitLinkIdentifyPayloadStepResult {
  if (event.kind === "link-identify/split-gate") {
    const fields = splitLinkIdentifyPayload(event.plaintext);
    if (fields === null) {
      return { state, intents: [], actions: [{ kind: "reject" }] };
    }
    return {
      state,
      intents: [],
      actions: [{ kind: "use-fields", fields }],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldUseSplitLinkIdentifyPayload(
  actions: ReadonlyArray<SplitLinkIdentifyPayloadAction>,
): boolean {
  return hasActionOfKind(actions, "use-fields");
}

export function shouldRejectSplitLinkIdentifyPayload(
  actions: ReadonlyArray<SplitLinkIdentifyPayloadAction>,
): boolean {
  return hasActionOfKind(actions, "reject");
}

/** Extract split identify payload fields from step actions; null when no `use-fields`. */
export function linkIdentifyPayloadFieldsFromActions(
  actions: ReadonlyArray<SplitLinkIdentifyPayloadAction>,
): LinkIdentifyPayloadFields | null {
  return firstActionOfKind(actions, "use-fields")?.fields ?? null;
}
