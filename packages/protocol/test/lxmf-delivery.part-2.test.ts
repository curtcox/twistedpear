import { describe, expect, it } from "vitest";
import {
  LxmfDeliveryMethod,
  planLxMessageInstancePack,
  planLxmfDirectSend,
  planLxmfPropagatedPackPrep,
  planLxmfSignatureOutcome,
  initialLxmfSignatureOutcomePlanState,
  initialLxmfDirectSendPlanState,
  initialLxmfPropagatedPackPrepPlanState,
  initialLxmfSendMethodPlanState,
  initialLxMessageInstancePackPlanState,
  lxMessageInstancePackPlanFromActions,
  lxmfDirectSendPlanFromActions,
  lxmfPropagatedPackPrepPlanFromActions,
  lxmfSendMethodPlanFromActions,
  shouldPlanLxMessageInstancePackOk,
  shouldPlanLxmfDirectSendOk,
  shouldPlanLxmfPropagatedPackPrepOk,
  shouldPlanLxmfPropagatedPackPrepSkip,
  shouldPlanLxmfSendMethodDirect,
  shouldPlanLxmfSendMethodOpportunistic,
  shouldPlanLxmfSendMethodPropagated,
  shouldRejectLxMessageInstancePackPlanAlreadyPacked,
  shouldRejectLxMessageInstancePackPlanMissingEndpoints,
  shouldRejectLxMessageInstancePackPlanMissingTimestamp,
  shouldRejectLxmfDirectSendPlanMissingDestination,
  shouldRejectLxmfDirectSendPlanMissingPacked,
  shouldRejectLxmfPropagatedPackPrepPlanMissingIdentity,
  shouldRejectLxmfPropagatedPackPrepPlanMissingTimestamp,
  shouldRejectLxmfSendMethodPlanUnpacked,
  shouldRejectLxmfSendMethodPlanUnsupported,
  shouldProceedLxmfDirectSend,
  shouldRejectLxmfDirectMissingDestination,
  shouldRejectLxmfDirectMissingPacked,
  shouldRejectLxmfPackEndpoints,
  shouldRejectLxmfPackTimestamp,
  shouldRejectLxmfSendUnpacked,
  shouldRejectLxmfSendUnsupported,
  shouldSendLxmfDirect,
  shouldSendLxmfOpportunistic,
  shouldSendLxmfPropagated,
  initialLxmfDirectSendState,
  initialLxmfSendMethodState,
  initialLxmfSignatureState,
  initialLxMessageInstancePackState,
  lxmfSendUnsupportedMethod,
  lxmfSignatureOutcomeFromActions,
  lxmfSignatureOutcomePlanFromActions,
  shouldApplyLxmfSignature,
  shouldProceedLxMessageInstancePack,
  shouldRejectLxMessageInstanceAlreadyPacked,
  shouldRejectLxMessageInstanceMissingEndpoints,
  shouldRejectLxMessageInstanceMissingTimestamp,
  stepLxmfDirectSendPlanWithActions,
  stepLxmfDirectSendWithActions,
  stepLxmfPropagatedPackPrepPlanWithActions,
  stepLxmfSendMethodPlanWithActions,
  stepLxmfSendMethodWithActions,
  stepLxmfSignatureOutcomePlanWithActions,
  stepLxmfSignatureWithActions,
  stepLxMessageInstancePackPlanWithActions,
  stepLxMessageInstancePackWithActions,
} from "../src/lxmf-delivery.js";
import { LxmfUnverifiedReason } from "../src/lxmf-fields.js";

describe("protocol lxmf delivery", () => {
  it("emits send-method-plan actions only from send/plan-gate", () => {
    const unpacked = stepLxmfSendMethodPlanWithActions(
      initialLxmfSendMethodPlanState(),
      {
        kind: "send/plan-gate",
        packed: false,
        method: LxmfDeliveryMethod.DIRECT,
      },
    );
    expect(shouldRejectLxmfSendMethodPlanUnpacked(unpacked.actions)).toBe(true);
    expect(shouldPlanLxmfSendMethodDirect(unpacked.actions)).toBe(false);
    expect(lxmfSendMethodPlanFromActions(unpacked.actions)).toBe(
      "reject-unpacked",
    );

    const opportunistic = stepLxmfSendMethodPlanWithActions(
      initialLxmfSendMethodPlanState(),
      {
        kind: "send/plan-gate",
        packed: true,
        method: LxmfDeliveryMethod.OPPORTUNISTIC,
      },
    );
    expect(shouldPlanLxmfSendMethodOpportunistic(opportunistic.actions)).toBe(
      true,
    );
    expect(lxmfSendMethodPlanFromActions(opportunistic.actions)).toBe(
      "opportunistic",
    );

    const direct = stepLxmfSendMethodPlanWithActions(
      initialLxmfSendMethodPlanState(),
      {
        kind: "send/plan-gate",
        packed: true,
        method: LxmfDeliveryMethod.DIRECT,
      },
    );
    expect(shouldPlanLxmfSendMethodDirect(direct.actions)).toBe(true);
    expect(lxmfSendMethodPlanFromActions(direct.actions)).toBe("direct");

    const propagated = stepLxmfSendMethodPlanWithActions(
      initialLxmfSendMethodPlanState(),
      {
        kind: "send/plan-gate",
        packed: true,
        method: LxmfDeliveryMethod.PROPAGATED,
      },
    );
    expect(shouldPlanLxmfSendMethodPropagated(propagated.actions)).toBe(true);
    expect(lxmfSendMethodPlanFromActions(propagated.actions)).toBe(
      "propagated",
    );

    const unsupported = stepLxmfSendMethodPlanWithActions(
      initialLxmfSendMethodPlanState(),
      {
        kind: "send/plan-gate",
        packed: true,
        method: LxmfDeliveryMethod.PAPER,
      },
    );
    expect(shouldRejectLxmfSendMethodPlanUnsupported(unsupported.actions)).toBe(
      true,
    );
    expect(lxmfSendMethodPlanFromActions(unsupported.actions)).toBe(
      "reject-unsupported",
    );

    expect(
      stepLxmfSendMethodPlanWithActions(initialLxmfSendMethodPlanState(), {
        kind: "timer/fired",
        id: "x",
        at: 0,
      }).actions,
    ).toEqual([]);
  });

  it("emits send / reject actions from send/dispatch", () => {
    const unpacked = stepLxmfSendMethodWithActions(
      initialLxmfSendMethodState(),
      {
        kind: "send/dispatch",
        packed: false,
        method: LxmfDeliveryMethod.DIRECT,
      },
    );
    expect(shouldRejectLxmfSendUnpacked(unpacked.actions)).toBe(true);
    expect(shouldSendLxmfDirect(unpacked.actions)).toBe(false);

    const opportunistic = stepLxmfSendMethodWithActions(
      initialLxmfSendMethodState(),
      {
        kind: "send/dispatch",
        packed: true,
        method: LxmfDeliveryMethod.OPPORTUNISTIC,
      },
    );
    expect(shouldSendLxmfOpportunistic(opportunistic.actions)).toBe(true);

    const direct = stepLxmfSendMethodWithActions(initialLxmfSendMethodState(), {
      kind: "send/dispatch",
      packed: true,
      method: LxmfDeliveryMethod.DIRECT,
    });
    expect(shouldSendLxmfDirect(direct.actions)).toBe(true);

    const propagated = stepLxmfSendMethodWithActions(
      initialLxmfSendMethodState(),
      {
        kind: "send/dispatch",
        packed: true,
        method: LxmfDeliveryMethod.PROPAGATED,
      },
    );
    expect(shouldSendLxmfPropagated(propagated.actions)).toBe(true);

    const unsupported = stepLxmfSendMethodWithActions(
      initialLxmfSendMethodState(),
      {
        kind: "send/dispatch",
        packed: true,
        method: LxmfDeliveryMethod.PAPER,
      },
    );
    expect(shouldRejectLxmfSendUnsupported(unsupported.actions)).toBe(true);
    expect(lxmfSendUnsupportedMethod(unsupported.actions)).toBe(
      LxmfDeliveryMethod.PAPER,
    );

    expect(
      stepLxmfSendMethodWithActions(initialLxmfSendMethodState(), {
        kind: "timer/fired",
        id: "x",
        at: 0,
      }).actions,
    ).toEqual([]);
  });

  it("is deterministic for send/dispatch events", () => {
    const state = initialLxmfSendMethodState();
    const event = {
      kind: "send/dispatch" as const,
      packed: true,
      method: LxmfDeliveryMethod.DIRECT,
    };
    const a = stepLxmfSendMethodWithActions(state, event);
    const b = stepLxmfSendMethodWithActions(state, event);
    expect(a).toEqual(b);
    expect(JSON.stringify(a.actions)).toBe(JSON.stringify(b.actions));
  });
});

describe("protocol lxmf delivery (continued)", () => {
  it("plans DIRECT send preconditions", () => {
    expect(
      planLxmfDirectSend({
        destinationPresent: true,
        destinationIdentityPresent: true,
        packed: true,
      }),
    ).toBe("ok");
    expect(
      planLxmfDirectSend({
        destinationPresent: false,
        destinationIdentityPresent: true,
        packed: true,
      }),
    ).toBe("missing-destination");
    expect(
      planLxmfDirectSend({
        destinationPresent: true,
        destinationIdentityPresent: false,
        packed: true,
      }),
    ).toBe("missing-destination");
    expect(
      planLxmfDirectSend({
        destinationPresent: true,
        destinationIdentityPresent: true,
        packed: false,
      }),
    ).toBe("missing-packed");
  });

  it("emits DIRECT send-plan actions only from direct-send/plan-gate", () => {
    const ok = stepLxmfDirectSendPlanWithActions(
      initialLxmfDirectSendPlanState(),
      {
        kind: "direct-send/plan-gate",
        destinationPresent: true,
        destinationIdentityPresent: true,
        packed: true,
      },
    );
    expect(shouldPlanLxmfDirectSendOk(ok.actions)).toBe(true);
    expect(lxmfDirectSendPlanFromActions(ok.actions)).toBe("ok");

    const missingDestination = stepLxmfDirectSendPlanWithActions(
      initialLxmfDirectSendPlanState(),
      {
        kind: "direct-send/plan-gate",
        destinationPresent: false,
        destinationIdentityPresent: true,
        packed: true,
      },
    );
    expect(
      shouldRejectLxmfDirectSendPlanMissingDestination(
        missingDestination.actions,
      ),
    ).toBe(true);
    expect(lxmfDirectSendPlanFromActions(missingDestination.actions)).toBe(
      "missing-destination",
    );

    const missingPacked = stepLxmfDirectSendPlanWithActions(
      initialLxmfDirectSendPlanState(),
      {
        kind: "direct-send/plan-gate",
        destinationPresent: true,
        destinationIdentityPresent: true,
        packed: false,
      },
    );
    expect(
      shouldRejectLxmfDirectSendPlanMissingPacked(missingPacked.actions),
    ).toBe(true);
    expect(lxmfDirectSendPlanFromActions(missingPacked.actions)).toBe(
      "missing-packed",
    );

    expect(
      stepLxmfDirectSendPlanWithActions(initialLxmfDirectSendPlanState(), {
        kind: "timer/fired",
        id: "x",
        at: 0,
      }).actions,
    ).toEqual([]);
  });

  it("emits DIRECT send gate actions from stepLxmfDirectSendWithActions", () => {
    const ok = stepLxmfDirectSendWithActions(initialLxmfDirectSendState(), {
      kind: "direct-send/gate",
      destinationPresent: true,
      destinationIdentityPresent: true,
      packed: true,
    });
    expect(shouldProceedLxmfDirectSend(ok.actions)).toBe(true);

    const missingDestination = stepLxmfDirectSendWithActions(
      initialLxmfDirectSendState(),
      {
        kind: "direct-send/gate",
        destinationPresent: false,
        destinationIdentityPresent: true,
        packed: true,
      },
    );
    expect(
      shouldRejectLxmfDirectMissingDestination(missingDestination.actions),
    ).toBe(true);
    expect(shouldProceedLxmfDirectSend(missingDestination.actions)).toBe(false);

    const missingPacked = stepLxmfDirectSendWithActions(
      initialLxmfDirectSendState(),
      {
        kind: "direct-send/gate",
        destinationPresent: true,
        destinationIdentityPresent: true,
        packed: false,
      },
    );
    expect(shouldRejectLxmfDirectMissingPacked(missingPacked.actions)).toBe(
      true,
    );

    expect(
      stepLxmfDirectSendWithActions(initialLxmfDirectSendState(), {
        kind: "timer/fired",
        id: "x",
        at: 0,
      }).actions,
    ).toEqual([]);
  });

  it("is deterministic for direct-send/gate events", () => {
    const state = initialLxmfDirectSendState();
    const event = {
      kind: "direct-send/gate" as const,
      destinationPresent: true,
      destinationIdentityPresent: true,
      packed: true,
    };
    const a = stepLxmfDirectSendWithActions(state, event);
    const b = stepLxmfDirectSendWithActions(state, event);
    expect(a).toEqual(b);
    expect(JSON.stringify(a.actions)).toBe(JSON.stringify(b.actions));
  });
});

describe("protocol lxmf delivery (continued)", () => {
  it("plans LXMessage instance pack gates", () => {
    expect(
      planLxMessageInstancePack({
        alreadyPacked: false,
        destinationPresent: true,
        sourcePresent: true,
        sourceIdentityPresent: true,
        timestampPresent: true,
      }),
    ).toBe("ok");
    expect(
      planLxMessageInstancePack({
        alreadyPacked: true,
        destinationPresent: true,
        sourcePresent: true,
        sourceIdentityPresent: true,
        timestampPresent: true,
      }),
    ).toBe("already-packed");
    expect(
      planLxMessageInstancePack({
        alreadyPacked: false,
        destinationPresent: false,
        sourcePresent: true,
        sourceIdentityPresent: true,
        timestampPresent: true,
      }),
    ).toBe("missing-endpoints");
    expect(
      planLxMessageInstancePack({
        alreadyPacked: false,
        destinationPresent: true,
        sourcePresent: true,
        sourceIdentityPresent: true,
        timestampPresent: false,
      }),
    ).toBe("missing-timestamp");
    expect(
      shouldRejectLxmfPackEndpoints({
        gateMissingEndpoints: true,
        destinationPresent: true,
        sourcePresent: true,
        sourceIdentityPresent: true,
      }),
    ).toBe(true);
    expect(
      shouldRejectLxmfPackEndpoints({
        gateMissingEndpoints: false,
        destinationPresent: true,
        sourcePresent: true,
        sourceIdentityPresent: true,
      }),
    ).toBe(false);
    expect(
      shouldRejectLxmfPackTimestamp({
        gateMissingTimestamp: true,
        timestampPresent: true,
      }),
    ).toBe(true);
    expect(
      shouldRejectLxmfPackTimestamp({
        gateMissingTimestamp: false,
        timestampPresent: true,
      }),
    ).toBe(false);
  });

  it("emits LXMessage instance-pack-plan actions only from instance-pack/plan-gate", () => {
    const ok = stepLxMessageInstancePackPlanWithActions(
      initialLxMessageInstancePackPlanState(),
      {
        kind: "instance-pack/plan-gate",
        alreadyPacked: false,
        destinationPresent: true,
        sourcePresent: true,
        sourceIdentityPresent: true,
        timestampPresent: true,
      },
    );
    expect(shouldPlanLxMessageInstancePackOk(ok.actions)).toBe(true);
    expect(lxMessageInstancePackPlanFromActions(ok.actions)).toBe("ok");

    const packed = stepLxMessageInstancePackPlanWithActions(
      initialLxMessageInstancePackPlanState(),
      {
        kind: "instance-pack/plan-gate",
        alreadyPacked: true,
        destinationPresent: true,
        sourcePresent: true,
        sourceIdentityPresent: true,
        timestampPresent: true,
      },
    );
    expect(
      shouldRejectLxMessageInstancePackPlanAlreadyPacked(packed.actions),
    ).toBe(true);
    expect(lxMessageInstancePackPlanFromActions(packed.actions)).toBe(
      "already-packed",
    );

    const endpoints = stepLxMessageInstancePackPlanWithActions(
      initialLxMessageInstancePackPlanState(),
      {
        kind: "instance-pack/plan-gate",
        alreadyPacked: false,
        destinationPresent: false,
        sourcePresent: true,
        sourceIdentityPresent: true,
        timestampPresent: true,
      },
    );
    expect(
      shouldRejectLxMessageInstancePackPlanMissingEndpoints(endpoints.actions),
    ).toBe(true);
    expect(lxMessageInstancePackPlanFromActions(endpoints.actions)).toBe(
      "missing-endpoints",
    );

    const timestamp = stepLxMessageInstancePackPlanWithActions(
      initialLxMessageInstancePackPlanState(),
      {
        kind: "instance-pack/plan-gate",
        alreadyPacked: false,
        destinationPresent: true,
        sourcePresent: true,
        sourceIdentityPresent: true,
        timestampPresent: false,
      },
    );
    expect(
      shouldRejectLxMessageInstancePackPlanMissingTimestamp(timestamp.actions),
    ).toBe(true);
    expect(lxMessageInstancePackPlanFromActions(timestamp.actions)).toBe(
      "missing-timestamp",
    );

    expect(
      stepLxMessageInstancePackPlanWithActions(
        initialLxMessageInstancePackPlanState(),
        {
          kind: "timer/fired",
          id: "x",
          at: 0,
        },
      ).actions,
    ).toEqual([]);
  });
});

describe("protocol lxmf delivery (continued)", () => {
  it("emits LXMessage instance pack gate actions from stepLxMessageInstancePackWithActions", () => {
    const ok = stepLxMessageInstancePackWithActions(
      initialLxMessageInstancePackState(),
      {
        kind: "instance-pack/gate",
        alreadyPacked: false,
        destinationPresent: true,
        sourcePresent: true,
        sourceIdentityPresent: true,
        timestampPresent: true,
      },
    );
    expect(ok.actions).toEqual([{ kind: "proceed" }]);
    expect(shouldProceedLxMessageInstancePack(ok.actions)).toBe(true);

    const packed = stepLxMessageInstancePackWithActions(
      initialLxMessageInstancePackState(),
      {
        kind: "instance-pack/gate",
        alreadyPacked: true,
        destinationPresent: true,
        sourcePresent: true,
        sourceIdentityPresent: true,
        timestampPresent: true,
      },
    );
    expect(packed.actions).toEqual([{ kind: "reject-already-packed" }]);
    expect(shouldRejectLxMessageInstanceAlreadyPacked(packed.actions)).toBe(
      true,
    );

    const endpoints = stepLxMessageInstancePackWithActions(
      initialLxMessageInstancePackState(),
      {
        kind: "instance-pack/gate",
        alreadyPacked: false,
        destinationPresent: false,
        sourcePresent: true,
        sourceIdentityPresent: true,
        timestampPresent: true,
      },
    );
    expect(endpoints.actions).toEqual([{ kind: "reject-missing-endpoints" }]);
    expect(
      shouldRejectLxMessageInstanceMissingEndpoints(endpoints.actions),
    ).toBe(true);

    const timestamp = stepLxMessageInstancePackWithActions(
      initialLxMessageInstancePackState(),
      {
        kind: "instance-pack/gate",
        alreadyPacked: false,
        destinationPresent: true,
        sourcePresent: true,
        sourceIdentityPresent: true,
        timestampPresent: false,
      },
    );
    expect(timestamp.actions).toEqual([{ kind: "reject-missing-timestamp" }]);
    expect(
      shouldRejectLxMessageInstanceMissingTimestamp(timestamp.actions),
    ).toBe(true);
  });

  it("is deterministic for LXMessage instance pack gate events", () => {
    const state = initialLxMessageInstancePackState();
    const event = {
      kind: "instance-pack/gate" as const,
      alreadyPacked: false,
      destinationPresent: true,
      sourcePresent: true,
      sourceIdentityPresent: true,
      timestampPresent: true,
    };
    const a = stepLxMessageInstancePackWithActions(state, event);
    const b = stepLxMessageInstancePackWithActions(state, event);
    expect(a).toEqual(b);
    expect(JSON.stringify(a.actions)).toBe(JSON.stringify(b.actions));
  });

  it("plans LXMF signature outcomes", () => {
    expect(
      planLxmfSignatureOutcome({
        sourceIdentityPresent: true,
        signatureValid: true,
      }),
    ).toEqual({ signatureValidated: true, unverifiedReason: null });
    expect(
      planLxmfSignatureOutcome({
        sourceIdentityPresent: true,
        signatureValid: false,
      }),
    ).toEqual({
      signatureValidated: false,
      unverifiedReason: LxmfUnverifiedReason.SIGNATURE_INVALID,
    });
    expect(
      planLxmfSignatureOutcome({
        sourceIdentityPresent: false,
        signatureValid: false,
      }),
    ).toEqual({
      signatureValidated: false,
      unverifiedReason: LxmfUnverifiedReason.SOURCE_UNKNOWN,
    });
  });

  it("emits LXMF signature outcome-plan actions from stepLxmfSignatureOutcomePlanWithActions", () => {
    const validated = stepLxmfSignatureOutcomePlanWithActions(
      initialLxmfSignatureOutcomePlanState(),
      {
        kind: "signature/outcome-plan-gate",
        sourceIdentityPresent: true,
        signatureValid: true,
      },
    );
    expect(lxmfSignatureOutcomePlanFromActions(validated.actions)).toEqual({
      signatureValidated: true,
      unverifiedReason: null,
    });

    const invalid = stepLxmfSignatureOutcomePlanWithActions(
      initialLxmfSignatureOutcomePlanState(),
      {
        kind: "signature/outcome-plan-gate",
        sourceIdentityPresent: true,
        signatureValid: false,
      },
    );
    expect(lxmfSignatureOutcomePlanFromActions(invalid.actions)).toEqual({
      signatureValidated: false,
      unverifiedReason: LxmfUnverifiedReason.SIGNATURE_INVALID,
    });

    const unknown = stepLxmfSignatureOutcomePlanWithActions(
      initialLxmfSignatureOutcomePlanState(),
      {
        kind: "signature/outcome-plan-gate",
        sourceIdentityPresent: false,
        signatureValid: false,
      },
    );
    expect(lxmfSignatureOutcomePlanFromActions(unknown.actions)).toEqual({
      signatureValidated: false,
      unverifiedReason: LxmfUnverifiedReason.SOURCE_UNKNOWN,
    });

    expect(
      stepLxmfSignatureOutcomePlanWithActions(
        initialLxmfSignatureOutcomePlanState(),
        {
          kind: "timer/fired",
          id: "x",
          at: 0,
        },
      ).actions,
    ).toEqual([]);
  });
});

describe("protocol lxmf delivery (continued)", () => {
  it("emits LXMF signature apply actions from stepLxmfSignatureWithActions", () => {
    const validated = stepLxmfSignatureWithActions(
      initialLxmfSignatureState(),
      {
        kind: "signature/outcome-gate",
        sourceIdentityPresent: true,
        signatureValid: true,
      },
    );
    expect(validated.actions).toEqual([
      { kind: "apply", signatureValidated: true, unverifiedReason: null },
    ]);
    expect(shouldApplyLxmfSignature(validated.actions)).toBe(true);
    expect(lxmfSignatureOutcomeFromActions(validated.actions)).toEqual({
      signatureValidated: true,
      unverifiedReason: null,
    });

    const invalid = stepLxmfSignatureWithActions(initialLxmfSignatureState(), {
      kind: "signature/outcome-gate",
      sourceIdentityPresent: true,
      signatureValid: false,
    });
    expect(invalid.actions).toEqual([
      {
        kind: "apply",
        signatureValidated: false,
        unverifiedReason: LxmfUnverifiedReason.SIGNATURE_INVALID,
      },
    ]);
    expect(lxmfSignatureOutcomeFromActions(invalid.actions)).toEqual({
      signatureValidated: false,
      unverifiedReason: LxmfUnverifiedReason.SIGNATURE_INVALID,
    });

    const unknown = stepLxmfSignatureWithActions(initialLxmfSignatureState(), {
      kind: "signature/outcome-gate",
      sourceIdentityPresent: false,
      signatureValid: false,
    });
    expect(unknown.actions).toEqual([
      {
        kind: "apply",
        signatureValidated: false,
        unverifiedReason: LxmfUnverifiedReason.SOURCE_UNKNOWN,
      },
    ]);
    expect(lxmfSignatureOutcomeFromActions(unknown.actions)).toEqual({
      signatureValidated: false,
      unverifiedReason: LxmfUnverifiedReason.SOURCE_UNKNOWN,
    });
  });

  it("is deterministic for LXMF signature gate events", () => {
    const state = initialLxmfSignatureState();
    const event = {
      kind: "signature/outcome-gate" as const,
      sourceIdentityPresent: true,
      signatureValid: true,
    };
    const a = stepLxmfSignatureWithActions(state, event);
    const b = stepLxmfSignatureWithActions(state, event);
    expect(a).toEqual(b);
    expect(JSON.stringify(a.actions)).toBe(JSON.stringify(b.actions));
  });

  it("is deterministic for LXMF signature outcome-plan events", () => {
    const state = initialLxmfSignatureOutcomePlanState();
    const event = {
      kind: "signature/outcome-plan-gate" as const,
      sourceIdentityPresent: true,
      signatureValid: true,
    };
    const a = stepLxmfSignatureOutcomePlanWithActions(state, event);
    const b = stepLxmfSignatureOutcomePlanWithActions(state, event);
    expect(a).toEqual(b);
    expect(JSON.stringify(a.actions)).toBe(JSON.stringify(b.actions));
  });

  it("plans PROPAGATED pack prep gates", () => {
    expect(
      planLxmfPropagatedPackPrep({
        packedPresent: true,
        desiredMethod: LxmfDeliveryMethod.DIRECT,
        destinationIdentityPresent: true,
        timestampPresent: true,
      }),
    ).toBe("skip");
    expect(
      planLxmfPropagatedPackPrep({
        packedPresent: false,
        desiredMethod: LxmfDeliveryMethod.PROPAGATED,
        destinationIdentityPresent: true,
        timestampPresent: true,
      }),
    ).toBe("skip");
    expect(
      planLxmfPropagatedPackPrep({
        packedPresent: true,
        desiredMethod: LxmfDeliveryMethod.PROPAGATED,
        destinationIdentityPresent: false,
        timestampPresent: true,
      }),
    ).toBe("missing-identity");
    expect(
      planLxmfPropagatedPackPrep({
        packedPresent: true,
        desiredMethod: LxmfDeliveryMethod.PROPAGATED,
        destinationIdentityPresent: true,
        timestampPresent: false,
      }),
    ).toBe("missing-timestamp");
    expect(
      planLxmfPropagatedPackPrep({
        packedPresent: true,
        desiredMethod: LxmfDeliveryMethod.PROPAGATED,
        destinationIdentityPresent: true,
        timestampPresent: true,
      }),
    ).toBe("ok");
  });
});

describe("protocol lxmf delivery (continued)", () => {
  it("emits PROPAGATED pack-prep-plan actions only from propagated-pack-prep/plan-gate", () => {
    const skip = stepLxmfPropagatedPackPrepPlanWithActions(
      initialLxmfPropagatedPackPrepPlanState(),
      {
        kind: "propagated-pack-prep/plan-gate",
        packedPresent: true,
        desiredMethod: LxmfDeliveryMethod.DIRECT,
        destinationIdentityPresent: true,
        timestampPresent: true,
      },
    );
    expect(shouldPlanLxmfPropagatedPackPrepSkip(skip.actions)).toBe(true);
    expect(lxmfPropagatedPackPrepPlanFromActions(skip.actions)).toBe("skip");

    const ok = stepLxmfPropagatedPackPrepPlanWithActions(
      initialLxmfPropagatedPackPrepPlanState(),
      {
        kind: "propagated-pack-prep/plan-gate",
        packedPresent: true,
        desiredMethod: LxmfDeliveryMethod.PROPAGATED,
        destinationIdentityPresent: true,
        timestampPresent: true,
      },
    );
    expect(shouldPlanLxmfPropagatedPackPrepOk(ok.actions)).toBe(true);
    expect(lxmfPropagatedPackPrepPlanFromActions(ok.actions)).toBe("ok");

    const missingIdentity = stepLxmfPropagatedPackPrepPlanWithActions(
      initialLxmfPropagatedPackPrepPlanState(),
      {
        kind: "propagated-pack-prep/plan-gate",
        packedPresent: true,
        desiredMethod: LxmfDeliveryMethod.PROPAGATED,
        destinationIdentityPresent: false,
        timestampPresent: true,
      },
    );
    expect(
      shouldRejectLxmfPropagatedPackPrepPlanMissingIdentity(
        missingIdentity.actions,
      ),
    ).toBe(true);
    expect(lxmfPropagatedPackPrepPlanFromActions(missingIdentity.actions)).toBe(
      "missing-identity",
    );

    const missingTimestamp = stepLxmfPropagatedPackPrepPlanWithActions(
      initialLxmfPropagatedPackPrepPlanState(),
      {
        kind: "propagated-pack-prep/plan-gate",
        packedPresent: true,
        desiredMethod: LxmfDeliveryMethod.PROPAGATED,
        destinationIdentityPresent: true,
        timestampPresent: false,
      },
    );
    expect(
      shouldRejectLxmfPropagatedPackPrepPlanMissingTimestamp(
        missingTimestamp.actions,
      ),
    ).toBe(true);
    expect(
      lxmfPropagatedPackPrepPlanFromActions(missingTimestamp.actions),
    ).toBe("missing-timestamp");

    expect(
      stepLxmfPropagatedPackPrepPlanWithActions(
        initialLxmfPropagatedPackPrepPlanState(),
        {
          kind: "timer/fired",
          id: "x",
          at: 0,
        },
      ).actions,
    ).toEqual([]);
  });
});
