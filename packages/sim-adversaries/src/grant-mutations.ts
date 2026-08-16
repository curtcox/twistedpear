/** Deterministic near-miss corpus for the byte-strict grant boundary. */
export function grantRecordMutationCorpus(
  canonical: Uint8Array,
): readonly Uint8Array[] {
  const text = decodeAscii(canonical);
  const objectBody = text.startsWith("{") ? text.slice(1) : text;
  const mutations = [
    ` ${text}`,
    `${text}\n`,
    `{"appId":"shadow",${objectBody}`,
    text.startsWith('{"appId"')
      ? `{"publisherPublicKey":"reordered","appId"${text.slice(8)}`
      : text,
    text.replace(/}$/, ',"extra":true}'),
    text.replace(/"updatedAt":([0-9]+)/, '"updatedAt":$1.0'),
    `${text}x`,
  ];
  return mutations
    .filter(
      (value, index) => value !== text && mutations.indexOf(value) === index,
    )
    .map(encodeAscii);
}

function encodeAscii(value: string): Uint8Array {
  return Uint8Array.from(
    [...value].map((character) => character.charCodeAt(0)),
  );
}

function decodeAscii(value: Uint8Array): string {
  return [...value].map((byte) => String.fromCharCode(byte)).join("");
}
