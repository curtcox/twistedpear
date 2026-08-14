import {
  initialAcceptLxmfWireFrameState,
  initialIncludeLxmfStampState,
  initialLxmfHashableMaterialState,
  initialLxmfSignedMaterialState,
  initialPackLxmPayloadState,
  initialPackLxmfDestinationPrefixedState,
  initialPackLxmfWireState,
  initialPackPropagationEnvelopeState,
  initialSplitLxmfWireState,
  initialUnpackLxmPayloadState,
  initialUtf8DecodeState,
  initialUtf8OrBytesState,
  lxmPayloadFieldsFromActions,
  lxmfHashableMaterialRawFromActions,
  lxmfSignedMaterialRawFromActions,
  lxmfWireFieldsFromActions,
  packLxmPayloadRawFromActions,
  packLxmfDestinationPrefixedRawFromActions,
  packLxmfWireRawFromActions,
  packPropagationEnvelopeRawFromActions,
  shouldAcceptLxmfWireFrameNow,
  shouldIncludeLxmfStampNow,
  shouldRejectPackLxmfDestinationPrefixed,
  shouldRejectPackLxmfWire,
  shouldRejectSplitLxmfWire,
  shouldRejectUnpackLxmPayload,
  shouldUseLxmfHashableMaterial,
  shouldUseLxmfSignedMaterial,
  shouldUsePackLxmPayload,
  shouldUsePackLxmfDestinationPrefixed,
  shouldUsePackLxmfWire,
  shouldUsePackPropagationEnvelope,
  shouldUseSplitLxmfWire,
  shouldUseUnpackLxmPayload,
  shouldUseUtf8Decode,
  shouldUseUtf8OrBytes,
  stepAcceptLxmfWireFrameWithActions,
  stepIncludeLxmfStampWithActions,
  stepLxmfHashableMaterialWithActions,
  stepLxmfSignedMaterialWithActions,
  stepPackLxmPayloadWithActions,
  stepPackLxmfDestinationPrefixedWithActions,
  stepPackLxmfWireWithActions,
  stepPackPropagationEnvelopeWithActions,
  stepSplitLxmfWireWithActions,
  stepUnpackLxmPayloadWithActions,
  stepUtf8DecodeWithActions,
  stepUtf8OrBytesWithActions,
  utf8DecodeTextFromActions,
  utf8OrBytesRawFromActions,
} from "@twistedpear/protocol";
import { DESTINATION_LENGTH, type LXMessageFields } from "./constants.js";

/**
 * Wire and payload codec steps for `LXMessage`.
 *
 * Every function here drives one protocol gate and turns its "missing action"
 * outcome into the error the caller would otherwise raise by hand, so the
 * message class reads as a sequence of codec calls rather than gate plumbing.
 */

/** The stamp-independent core of an LXMF payload. */
export interface LxmPayloadParts {
  readonly timestamp: number;
  readonly title: Uint8Array;
  readonly content: Uint8Array;
  readonly fields: LXMessageFields;
}

export type LxmfWireFields = NonNullable<
  ReturnType<typeof lxmfWireFieldsFromActions>
>;

export type LxmPayloadFields = NonNullable<
  ReturnType<typeof lxmPayloadFieldsFromActions>
>;

export function splitLxmfWire(bytes: Uint8Array): LxmfWireFields {
  const stepped = stepSplitLxmfWireWithActions(initialSplitLxmfWireState(), {
    kind: "lxmf-wire/split-gate",
    bytes,
  });
  const wire = lxmfWireFieldsFromActions(stepped.actions);
  if (
    shouldRejectSplitLxmfWire(stepped.actions) ||
    !shouldUseSplitLxmfWire(stepped.actions) ||
    !shouldAcceptLxmfWireFrameNow(
      stepAcceptLxmfWireFrameWithActions(initialAcceptLxmfWireFrameState(), {
        kind: "lxmf/accept-wire-frame-gate",
        wirePresent: wire !== null,
      }).actions,
    ) ||
    wire === null
  ) {
    throw new Error("LXMF bytes too short");
  }
  return wire;
}

export function unpackLxmPayload(payload: Uint8Array): LxmPayloadFields {
  const stepped = stepUnpackLxmPayloadWithActions(
    initialUnpackLxmPayloadState(),
    { kind: "lxmf-codec/unpack-payload-gate", data: payload },
  );
  const fields = lxmPayloadFieldsFromActions(stepped.actions);
  if (
    shouldRejectUnpackLxmPayload(stepped.actions) ||
    !shouldUseUnpackLxmPayload(stepped.actions) ||
    fields === null
  ) {
    throw new Error("Invalid LXMF payload");
  }
  return fields;
}

/** Packs a payload; `stamp` undefined packs the stamp-free hashable form. */
export function packLxmPayload(
  parts: LxmPayloadParts,
  stamp: Uint8Array | null | undefined,
  failure: string,
): Uint8Array {
  const stepped = stepPackLxmPayloadWithActions(initialPackLxmPayloadState(), {
    kind: "lxmf-codec/pack-payload-gate",
    timestamp: parts.timestamp,
    title: parts.title,
    content: parts.content,
    fields: parts.fields,
    ...(stamp === undefined ? {} : { stamp }),
  });
  const raw = packLxmPayloadRawFromActions(stepped.actions);
  if (!shouldUsePackLxmPayload(stepped.actions) || raw === null) {
    throw new Error(failure);
  }
  return raw;
}

export function lxmfHashableMaterial(
  destinationHash: Uint8Array,
  sourceHash: Uint8Array,
  payloadWithoutStamp: Uint8Array,
): Uint8Array {
  const stepped = stepLxmfHashableMaterialWithActions(
    initialLxmfHashableMaterialState(),
    {
      kind: "lxmf-wire/hashable-material-gate",
      destinationHash,
      sourceHash,
      payloadWithoutStamp,
    },
  );
  const raw = shouldUseLxmfHashableMaterial(stepped.actions)
    ? lxmfHashableMaterialRawFromActions(stepped.actions)
    : null;
  if (raw === null) {
    throw new Error("LXMF hashable material: missing use-raw action");
  }
  return raw;
}

export function lxmfSignedMaterial(
  hashableMaterial: Uint8Array,
  messageHash: Uint8Array,
): Uint8Array {
  const stepped = stepLxmfSignedMaterialWithActions(
    initialLxmfSignedMaterialState(),
    {
      kind: "lxmf-wire/signed-material-gate",
      hashableMaterial,
      messageHash,
    },
  );
  const raw = shouldUseLxmfSignedMaterial(stepped.actions)
    ? lxmfSignedMaterialRawFromActions(stepped.actions)
    : null;
  if (raw === null) {
    throw new Error("LXMF signed material: missing use-raw action");
  }
  return raw;
}

export function packLxmfWire(parts: {
  readonly destinationHash: Uint8Array;
  readonly sourceHash: Uint8Array;
  readonly signature: Uint8Array;
  readonly payload: Uint8Array;
}): Uint8Array {
  const stepped = stepPackLxmfWireWithActions(initialPackLxmfWireState(), {
    kind: "lxmf-wire/pack-gate",
    ...parts,
  });
  const raw = packLxmfWireRawFromActions(stepped.actions);
  if (
    shouldRejectPackLxmfWire(stepped.actions) ||
    !shouldUsePackLxmfWire(stepped.actions) ||
    raw === null
  ) {
    throw new Error(`destination hash must be ${DESTINATION_LENGTH} bytes`);
  }
  return raw;
}

export function packLxmfDestinationPrefixed(
  destinationHash: Uint8Array,
  remainder: Uint8Array,
): Uint8Array {
  const stepped = stepPackLxmfDestinationPrefixedWithActions(
    initialPackLxmfDestinationPrefixedState(),
    {
      kind: "lxmf-destination-prefixed/pack-gate",
      destinationHash,
      remainder,
    },
  );
  const raw = packLxmfDestinationPrefixedRawFromActions(stepped.actions);
  if (
    shouldRejectPackLxmfDestinationPrefixed(stepped.actions) ||
    !shouldUsePackLxmfDestinationPrefixed(stepped.actions) ||
    raw === null
  ) {
    throw new Error(`destination hash must be ${DESTINATION_LENGTH} bytes`);
  }
  return raw;
}

export function packPropagationEnvelope(
  timestamp: number,
  messages: ReadonlyArray<Uint8Array>,
): Uint8Array {
  const stepped = stepPackPropagationEnvelopeWithActions(
    initialPackPropagationEnvelopeState(),
    {
      kind: "lxmf-codec/pack-propagation-envelope-gate",
      timestamp,
      messages,
    },
  );
  const raw = packPropagationEnvelopeRawFromActions(stepped.actions);
  if (!shouldUsePackPropagationEnvelope(stepped.actions) || raw === null) {
    throw new Error("LXMessage failed to pack propagation envelope");
  }
  return raw;
}

export function selectPackStamp(options: {
  stamp?: Uint8Array | null;
  deferStamp?: boolean;
}): Uint8Array | null {
  const include = shouldIncludeLxmfStampNow(
    stepIncludeLxmfStampWithActions(initialIncludeLxmfStampState(), {
      kind: "lxmf/include-stamp-gate",
      deferStamp: options.deferStamp,
    }).actions,
  );
  return include ? (options.stamp ?? null) : null;
}

export function encodeTextOrBytes(value: string | Uint8Array): Uint8Array {
  const stepped = stepUtf8OrBytesWithActions(initialUtf8OrBytesState(), {
    kind: "utf8/or-bytes-gate",
    value,
  });
  const raw = utf8OrBytesRawFromActions(stepped.actions);
  if (!shouldUseUtf8OrBytes(stepped.actions) || raw === null) {
    throw new Error("encodeTextOrBytes: missing use-raw action");
  }
  return raw;
}

export function decodeUtf8(bytes: Uint8Array, context: string): string {
  const stepped = stepUtf8DecodeWithActions(initialUtf8DecodeState(), {
    kind: "utf8/decode-gate",
    bytes,
  });
  const text = utf8DecodeTextFromActions(stepped.actions);
  if (!shouldUseUtf8Decode(stepped.actions) || text === null) {
    throw new Error(`${context}: missing use-fields action`);
  }
  return text;
}
