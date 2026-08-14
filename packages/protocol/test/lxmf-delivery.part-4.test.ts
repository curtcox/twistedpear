import { describe, expect, it } from "vitest";
import {
  initialLxmfPropagationSyncPrepPlanState,
  lxmfPropagationSyncPrepPlanFromActions,
  shouldPlanLxmfPropagationSyncPrepOk,
  shouldRejectLxmfPropagationSyncPrepPlanMissingDeliveryIdentity,
  shouldRejectLxmfPropagationSyncPrepPlanMissingNode,
  shouldExtractLxmfOpportunisticPayloadNow,
  shouldProceedLxmfPropagationSyncPrep,
  shouldRejectLxmfPropagationSyncMissingDeliveryIdentity,
  shouldRejectLxmfPropagationSyncMissingNode,
  shouldRegisterLxmfDeliveryIdentityNow,
  shouldSelectLxmfDeliveryParametersNow,
  shouldSkipExtractLxmfOpportunisticPayload,
  shouldSkipRegisterLxmfDeliveryIdentity,
  shouldSkipSelectLxmfDeliveryParameters,
  shouldSkipTeardownLxmfPropagationLink,
  canRegisterLxmfDeliveryIdentity,
  canExtractLxmfOpportunisticPayload,
  shouldSelectLxmfDeliveryParameters,
  planLxmfPropagationSyncPrep,
  shouldTeardownLxmfPropagationLink,
  shouldTeardownLxmfPropagationLinkNow,
  initialExtractLxmfOpportunisticPayloadState,
  initialLxmfPropagationSyncPrepState,
  initialRegisterLxmfDeliveryIdentityState,
  initialSelectLxmfDeliveryParametersState,
  initialTeardownLxmfPropagationLinkState,
  stepExtractLxmfOpportunisticPayloadWithActions,
  stepLxmfPropagationSyncPrepPlanWithActions,
  stepLxmfPropagationSyncPrepWithActions,
  stepRegisterLxmfDeliveryIdentityWithActions,
  stepSelectLxmfDeliveryParametersWithActions,
  stepTeardownLxmfPropagationLinkWithActions,
} from "../src/lxmf-delivery.js";

describe("protocol lxmf delivery", () => {
  it("gates delivery-identity registration and propagation-link teardown", () => {
    expect(canRegisterLxmfDeliveryIdentity(false)).toBe(true);
    expect(canRegisterLxmfDeliveryIdentity(true)).toBe(false);
    expect(shouldTeardownLxmfPropagationLink(true)).toBe(true);
    expect(shouldTeardownLxmfPropagationLink(false)).toBe(false);
    expect(canExtractLxmfOpportunisticPayload(true)).toBe(true);
    expect(canExtractLxmfOpportunisticPayload(false)).toBe(false);
    expect(shouldSelectLxmfDeliveryParameters(true)).toBe(true);
    expect(shouldSelectLxmfDeliveryParameters(false)).toBe(false);
    expect(
      shouldRegisterLxmfDeliveryIdentityNow(
        stepRegisterLxmfDeliveryIdentityWithActions(
          initialRegisterLxmfDeliveryIdentityState(),
          {
            kind: "lxmf/register-delivery-identity-gate",
            deliveryDestinationPresent: false,
          },
        ).actions,
      ),
    ).toBe(true);
    expect(
      shouldSkipRegisterLxmfDeliveryIdentity(
        stepRegisterLxmfDeliveryIdentityWithActions(
          initialRegisterLxmfDeliveryIdentityState(),
          {
            kind: "lxmf/register-delivery-identity-gate",
            deliveryDestinationPresent: true,
          },
        ).actions,
      ),
    ).toBe(true);
    expect(
      shouldTeardownLxmfPropagationLinkNow(
        stepTeardownLxmfPropagationLinkWithActions(
          initialTeardownLxmfPropagationLinkState(),
          {
            kind: "lxmf/teardown-propagation-link-gate",
            linkPresent: true,
          },
        ).actions,
      ),
    ).toBe(true);
    expect(
      shouldSkipTeardownLxmfPropagationLink(
        stepTeardownLxmfPropagationLinkWithActions(
          initialTeardownLxmfPropagationLinkState(),
          {
            kind: "lxmf/teardown-propagation-link-gate",
            linkPresent: false,
          },
        ).actions,
      ),
    ).toBe(true);
    expect(
      shouldExtractLxmfOpportunisticPayloadNow(
        stepExtractLxmfOpportunisticPayloadWithActions(
          initialExtractLxmfOpportunisticPayloadState(),
          {
            kind: "lxmf/extract-opportunistic-payload-gate",
            packedPresent: true,
          },
        ).actions,
      ),
    ).toBe(true);
    expect(
      shouldSkipExtractLxmfOpportunisticPayload(
        stepExtractLxmfOpportunisticPayloadWithActions(
          initialExtractLxmfOpportunisticPayloadState(),
          {
            kind: "lxmf/extract-opportunistic-payload-gate",
            packedPresent: false,
          },
        ).actions,
      ),
    ).toBe(true);
    expect(
      shouldSelectLxmfDeliveryParametersNow(
        stepSelectLxmfDeliveryParametersWithActions(
          initialSelectLxmfDeliveryParametersState(),
          {
            kind: "lxmf/select-delivery-parameters-gate",
            packedPresent: true,
          },
        ).actions,
      ),
    ).toBe(true);
    expect(
      shouldSkipSelectLxmfDeliveryParameters(
        stepSelectLxmfDeliveryParametersWithActions(
          initialSelectLxmfDeliveryParametersState(),
          {
            kind: "lxmf/select-delivery-parameters-gate",
            packedPresent: false,
          },
        ).actions,
      ),
    ).toBe(true);
    expect(
      planLxmfPropagationSyncPrep({
        nodeConfigured: false,
        deliveryIdentityPresent: false,
      }),
    ).toBe("missing-node");
    expect(
      planLxmfPropagationSyncPrep({
        nodeConfigured: true,
        deliveryIdentityPresent: false,
      }),
    ).toBe("missing-delivery-identity");
    expect(
      planLxmfPropagationSyncPrep({
        nodeConfigured: true,
        deliveryIdentityPresent: true,
      }),
    ).toBe("ok");
  });
});

describe("protocol lxmf delivery (continued)", () => {
  it("emits propagation sync-prep-plan actions only from propagation-sync-prep/plan-gate", () => {
    const ok = stepLxmfPropagationSyncPrepPlanWithActions(
      initialLxmfPropagationSyncPrepPlanState(),
      {
        kind: "propagation-sync-prep/plan-gate",
        nodeConfigured: true,
        deliveryIdentityPresent: true,
      },
    );
    expect(shouldPlanLxmfPropagationSyncPrepOk(ok.actions)).toBe(true);
    expect(lxmfPropagationSyncPrepPlanFromActions(ok.actions)).toBe("ok");

    const missingNode = stepLxmfPropagationSyncPrepPlanWithActions(
      initialLxmfPropagationSyncPrepPlanState(),
      {
        kind: "propagation-sync-prep/plan-gate",
        nodeConfigured: false,
        deliveryIdentityPresent: false,
      },
    );
    expect(
      shouldRejectLxmfPropagationSyncPrepPlanMissingNode(missingNode.actions),
    ).toBe(true);
    expect(lxmfPropagationSyncPrepPlanFromActions(missingNode.actions)).toBe(
      "missing-node",
    );

    const missingIdentity = stepLxmfPropagationSyncPrepPlanWithActions(
      initialLxmfPropagationSyncPrepPlanState(),
      {
        kind: "propagation-sync-prep/plan-gate",
        nodeConfigured: true,
        deliveryIdentityPresent: false,
      },
    );
    expect(
      shouldRejectLxmfPropagationSyncPrepPlanMissingDeliveryIdentity(
        missingIdentity.actions,
      ),
    ).toBe(true);
    expect(
      lxmfPropagationSyncPrepPlanFromActions(missingIdentity.actions),
    ).toBe("missing-delivery-identity");

    expect(
      stepLxmfPropagationSyncPrepPlanWithActions(
        initialLxmfPropagationSyncPrepPlanState(),
        {
          kind: "timer/fired",
          id: "x",
          at: 0,
        },
      ).actions,
    ).toEqual([]);
  });

  it("emits propagation sync-prep gate actions from stepLxmfPropagationSyncPrepWithActions", () => {
    const ok = stepLxmfPropagationSyncPrepWithActions(
      initialLxmfPropagationSyncPrepState(),
      {
        kind: "propagation-sync-prep/gate",
        nodeConfigured: true,
        deliveryIdentityPresent: true,
      },
    );
    expect(shouldProceedLxmfPropagationSyncPrep(ok.actions)).toBe(true);

    const missingNode = stepLxmfPropagationSyncPrepWithActions(
      initialLxmfPropagationSyncPrepState(),
      {
        kind: "propagation-sync-prep/gate",
        nodeConfigured: false,
        deliveryIdentityPresent: false,
      },
    );
    expect(
      shouldRejectLxmfPropagationSyncMissingNode(missingNode.actions),
    ).toBe(true);
    expect(shouldProceedLxmfPropagationSyncPrep(missingNode.actions)).toBe(
      false,
    );

    const missingIdentity = stepLxmfPropagationSyncPrepWithActions(
      initialLxmfPropagationSyncPrepState(),
      {
        kind: "propagation-sync-prep/gate",
        nodeConfigured: true,
        deliveryIdentityPresent: false,
      },
    );
    expect(
      shouldRejectLxmfPropagationSyncMissingDeliveryIdentity(
        missingIdentity.actions,
      ),
    ).toBe(true);

    expect(
      stepLxmfPropagationSyncPrepWithActions(
        initialLxmfPropagationSyncPrepState(),
        {
          kind: "timer/fired",
          id: "x",
          at: 0,
        },
      ).actions,
    ).toEqual([]);
  });

  it("is deterministic for propagation-sync-prep/gate events", () => {
    const state = initialLxmfPropagationSyncPrepState();
    const event = {
      kind: "propagation-sync-prep/gate" as const,
      nodeConfigured: true,
      deliveryIdentityPresent: true,
    };
    const a = stepLxmfPropagationSyncPrepWithActions(state, event);
    const b = stepLxmfPropagationSyncPrepWithActions(state, event);
    expect(a).toEqual(b);
    expect(JSON.stringify(a.actions)).toBe(JSON.stringify(b.actions));
  });
});
