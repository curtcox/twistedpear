/**
 * Structured record of a consent moment. Host chrome appends one for every
 * confirmation, install review, and grant; fixtures assert INFORMED against
 * the transcript rather than pixels.
 */

import { describeCapability, isMiniappCapability } from "./capabilities.js";

export type ConsentKind =
  | "package"
  | "publish"
  | "install"
  | "preview"
  | "trust-import"
  | "device-session"
  | "device-stream"
  | "device-remote-grant"
  | "freenet-update"
  | "app-channel"
  | "install-review"
  | "grant";

export interface ConsentSubject {
  readonly appName: string;
  readonly publisherFingerprint: string;
  readonly packageId: string | null;
  readonly confusableWith: ReadonlyArray<string>;
}

export interface ConsentAuthority {
  readonly capability: string;
  readonly canonicalDescription: string;
  readonly scope: string | null;
  readonly isNewSinceLastApproval: boolean;
}

export interface ConsentRecord {
  readonly at: number;
  readonly kind: ConsentKind;
  readonly subject: ConsentSubject;
  readonly authorities: ReadonlyArray<ConsentAuthority>;
  readonly token: string;
}

const KIND_CAPABILITY: Partial<Record<ConsentKind, string>> = {
  package: "apps:package",
  publish: "apps:publish",
  install: "apps:install",
  preview: "apps:preview",
  "app-channel": "apps:channel",
  "freenet-update": "freenet:contract",
  "device-stream": "device:stream",
};

export class ConsentTranscript {
  private readonly records: ConsentRecord[] = [];

  append(record: ConsentRecord): void {
    this.records.push(record);
  }

  list(): ReadonlyArray<ConsentRecord> {
    return this.records;
  }
}

export function consentAuthorities(
  capabilities: ReadonlyArray<string>,
  options?: {
    readonly added?: ReadonlySet<string>;
    readonly scopes?: Readonly<Record<string, string | null>>;
  },
): ConsentAuthority[] {
  const added = options?.added;
  const scopes = options?.scopes;
  const seen = new Set<string>();
  const out: ConsentAuthority[] = [];
  for (const id of capabilities) {
    if (seen.has(id)) continue;
    seen.add(id);
    out.push({
      capability: id,
      canonicalDescription: isMiniappCapability(id)
        ? describeCapability(id)
        : id,
      scope: scopes?.[id] ?? null,
      isNewSinceLastApproval: added?.has(id) === true,
    });
  }
  return out;
}

export function consentDiscloses(
  record: ConsentRecord,
  capability: string,
): boolean {
  const expected = isMiniappCapability(capability)
    ? describeCapability(capability)
    : capability;
  return record.authorities.some(
    (authority) =>
      authority.capability === capability &&
      authority.canonicalDescription === expected,
  );
}

export function consentRecordFromConfirmation(
  request: {
    readonly token: string;
    readonly kind: ConsentKind;
    readonly appId: string;
    readonly publisherPublicKey: string;
    readonly summary: Readonly<Record<string, string>>;
  },
  at: number,
  confusableWith: ReadonlyArray<string> = [],
): ConsentRecord {
  const ids: string[] = [];
  const kindCapability = KIND_CAPABILITY[request.kind];
  if (kindCapability !== undefined) ids.push(kindCapability);
  const listed = request.summary.capabilities;
  if (listed !== undefined) {
    for (const part of listed.split(",")) {
      const id = part.trim();
      if (id.length > 0 && id !== "(none)") ids.push(id);
    }
  }
  return {
    at,
    kind: request.kind,
    subject: {
      appName: request.appId,
      publisherFingerprint: request.publisherPublicKey,
      packageId: request.summary.t256 ?? null,
      confusableWith,
    },
    authorities: consentAuthorities(ids),
    token: request.token,
  };
}

export function installReviewConsentRecord(input: {
  readonly at: number;
  readonly token: string;
  readonly appId: string;
  readonly publisherPublicKey: string;
  readonly packageId?: string | null;
  readonly capabilities: ReadonlyArray<string>;
  readonly added?: ReadonlySet<string>;
  readonly confusableWith?: ReadonlyArray<string>;
}): ConsentRecord {
  return {
    at: input.at,
    kind: "install-review",
    subject: {
      appName: input.appId,
      publisherFingerprint: input.publisherPublicKey,
      packageId: input.packageId ?? null,
      confusableWith: input.confusableWith ?? [],
    },
    authorities: consentAuthorities(input.capabilities, {
      ...(input.added === undefined ? {} : { added: input.added }),
    }),
    token: input.token,
  };
}
