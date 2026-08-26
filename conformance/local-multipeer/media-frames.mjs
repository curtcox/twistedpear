export function encodeMediaFrame(idText, frame) {
  const id = new TextEncoder().encode(idText);
  const chunk = new Uint8Array(8 + frame.length);
  new DataView(chunk.buffer).setUint32(0, 0, false);
  new DataView(chunk.buffer).setUint16(4, 0, false);
  new DataView(chunk.buffer).setUint16(6, 1, false);
  chunk.set(frame, 8);
  const out = new Uint8Array(8 + id.length + chunk.length);
  out.set([0x54, 0x50, 0x4d, 0x31]);
  out[4] = 2;
  out[5] = id.length;
  new DataView(out.buffer).setUint16(6, chunk.length, false);
  out.set(id, 8);
  out.set(chunk, 8 + id.length);
  return out;
}

export function bytesHex(bytes) {
  return Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join(
    "",
  );
}
