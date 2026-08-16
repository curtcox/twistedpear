"use strict";
var TwistedPearPeerAudio = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // scripts/peer-audio-entry.mjs
  var peer_audio_entry_exports = {};
  __export(peer_audio_entry_exports, {
    decodePeerAudioFskStream: () => decodePeerAudioFskStream,
    encodePeerAudioFsk: () => encodePeerAudioFsk
  });

  // ../../packages/protocol/src/peer-audio-fsk.ts
  var PREAMBLE_BYTES = 16;
  var PREAMBLE = 165;
  var HEADER_BYTES = PREAMBLE_BYTES + 2;
  var MAX_PEER_AUDIO_MODEM_BYTES = 4096;
  var PeerAudioFskError = class extends Error {
    constructor(code, message) {
      super(message);
      this.code = code;
      this.name = "PeerAudioFskError";
    }
  };
  function crc32(bytes) {
    let crc = 4294967295;
    for (const byte of bytes) {
      crc ^= byte;
      for (let bit = 0; bit < 8; bit += 1)
        crc = crc >>> 1 ^ (crc & 1 ? 3988292384 : 0);
    }
    return (crc ^ 4294967295) >>> 0;
  }
  function profileInRange(config) {
    if (config.sampleRate < 8e3 || config.sampleRate > 192e3) return false;
    if (config.baud < 100 || config.baud > 4800) return false;
    if (config.markHz <= config.baud / 2 || config.spaceHz <= config.baud / 2)
      return false;
    if (Math.max(config.markHz, config.spaceHz) >= config.sampleRate / 2)
      return false;
    return config.amplitude > 0 && config.amplitude <= 1;
  }
  function settings(options) {
    const config = {
      sampleRate: options.sampleRate ?? 48e3,
      baud: options.baud ?? 1200,
      markHz: options.markHz ?? 2400,
      spaceHz: options.spaceHz ?? 1200,
      amplitude: options.amplitude ?? 0.7
    };
    if (!profileInRange(config))
      throw new PeerAudioFskError("MALFORMED", "Invalid audible FSK profile");
    return config;
  }
  function packet(payload) {
    if (payload.length < 1 || payload.length > MAX_PEER_AUDIO_MODEM_BYTES)
      throw new PeerAudioFskError(
        "OVERSIZED",
        "Audible FSK payload exceeds size budget"
      );
    const out = new Uint8Array(HEADER_BYTES + payload.length + 4);
    out.fill(PREAMBLE, 0, PREAMBLE_BYTES);
    new DataView(out.buffer).setUint16(PREAMBLE_BYTES, payload.length, false);
    out.set(payload, HEADER_BYTES);
    new DataView(out.buffer).setUint32(
      HEADER_BYTES + payload.length,
      crc32(payload),
      false
    );
    return out;
  }
  function encodePeerAudioFsk(payload, options = {}) {
    const config = settings(options);
    const bytes = packet(payload);
    const symbols = bytes.length * 8;
    const totalSamples = Math.round(symbols * config.sampleRate / config.baud);
    const pcm = new Float32Array(totalSamples);
    let phase = 0;
    for (let symbol = 0; symbol < symbols; symbol += 1) {
      const byte = bytes[Math.floor(symbol / 8)] ?? 0;
      const bit = byte >>> 7 - symbol % 8 & 1;
      const frequency = bit === 1 ? config.markHz : config.spaceHz;
      const start = Math.round(symbol * config.sampleRate / config.baud);
      const end = Math.round((symbol + 1) * config.sampleRate / config.baud);
      const step = 2 * Math.PI * frequency / config.sampleRate;
      for (let index = start; index < end; index += 1) {
        pcm[index] = Math.sin(phase) * config.amplitude;
        phase = (phase + step) % (2 * Math.PI);
      }
    }
    return pcm;
  }
  function energy(pcm, start, end, frequency, sampleRate) {
    let sin = 0;
    let cos = 0;
    const step = 2 * Math.PI * frequency / sampleRate;
    for (let index = start; index < end; index += 1) {
      const value = pcm[index] ?? 0;
      const phase = step * (index - start);
      sin += value * Math.sin(phase);
      cos += value * Math.cos(phase);
    }
    return sin * sin + cos * cos;
  }
  function decodeFskBits(pcm, config) {
    const symbols = Math.floor(pcm.length * config.baud / config.sampleRate);
    if (symbols < (HEADER_BYTES + 4) * 8)
      throw new PeerAudioFskError("SIGNAL", "Audible FSK signal is too short");
    const decoded = new Uint8Array(Math.floor(symbols / 8));
    for (let symbol = 0; symbol < decoded.length * 8; symbol += 1) {
      const start = Math.round(symbol * config.sampleRate / config.baud);
      const end = Math.round((symbol + 1) * config.sampleRate / config.baud);
      const mark = energy(pcm, start, end, config.markHz, config.sampleRate);
      const space = energy(pcm, start, end, config.spaceHz, config.sampleRate);
      if (Math.max(mark, space) < 1e-6)
        throw new PeerAudioFskError(
          "SIGNAL",
          "Audible FSK carrier was not detected"
        );
      if (mark > space)
        decoded[Math.floor(symbol / 8)] = (decoded[Math.floor(symbol / 8)] ?? 0) | 1 << 7 - symbol % 8;
    }
    return decoded;
  }
  function payloadFromFskFrame(decoded) {
    if (!decoded.subarray(0, PREAMBLE_BYTES).every((byte) => byte === PREAMBLE))
      throw new PeerAudioFskError(
        "SIGNAL",
        "Audible FSK preamble was not detected"
      );
    const length = new DataView(
      decoded.buffer,
      decoded.byteOffset,
      decoded.byteLength
    ).getUint16(PREAMBLE_BYTES, false);
    if (length < 1 || length > MAX_PEER_AUDIO_MODEM_BYTES || HEADER_BYTES + length + 4 > decoded.length)
      throw new PeerAudioFskError(
        "MALFORMED",
        "Audible FSK packet length is invalid"
      );
    const payload = decoded.slice(HEADER_BYTES, HEADER_BYTES + length);
    const expected = new DataView(
      decoded.buffer,
      decoded.byteOffset,
      decoded.byteLength
    ).getUint32(HEADER_BYTES + length, false);
    if (crc32(payload) !== expected)
      throw new PeerAudioFskError("CRC", "Audible FSK payload CRC mismatch");
    return payload;
  }
  function decodePeerAudioFsk(pcm, options = {}) {
    return payloadFromFskFrame(decodeFskBits(pcm, settings(options)));
  }
  function activityWindows(pcm, windowSamples) {
    const active = [];
    for (let start = 0; start < pcm.length; start += windowSamples) {
      let energySum = 0;
      const end = Math.min(pcm.length, start + windowSamples);
      for (let index = start; index < end; index += 1)
        energySum += (pcm[index] ?? 0) ** 2;
      active.push(Math.sqrt(energySum / Math.max(1, end - start)) > 0.02);
    }
    return active;
  }
  function burstBounds(pcm, windowSamples, first, last) {
    let firstSignal = first * windowSamples;
    const firstWindowEnd = Math.min(pcm.length, (first + 1) * windowSamples);
    while (firstSignal < firstWindowEnd && Math.abs(pcm[firstSignal] ?? 0) <= 0.02)
      firstSignal += 1;
    const start = Math.max(0, firstSignal - 1);
    let lastSignal = Math.min(pcm.length, last * windowSamples) - 1;
    const lastWindowStart = Math.max(start, (last - 1) * windowSamples);
    while (lastSignal > lastWindowStart && Math.abs(pcm[lastSignal] ?? 0) <= 0.02)
      lastSignal -= 1;
    return { start, end: Math.min(pcm.length, lastSignal + 2) };
  }
  function decodeBurst(pcm, options, symbolSamples, bounds) {
    for (let adjustment = 0; adjustment <= Math.ceil(symbolSamples / 2); adjustment += 1) {
      try {
        return decodePeerAudioFsk(
          pcm.slice(bounds.start + adjustment, bounds.end),
          options
        );
      } catch {
      }
    }
    return null;
  }
  function decodePeerAudioFskStream(pcm, options = {}) {
    const config = settings(options);
    const windowSamples = Math.max(8, Math.round(config.sampleRate * 0.01));
    const active = activityWindows(pcm, windowSamples);
    const decoded = [];
    let window = 0;
    while (window < active.length) {
      while (window < active.length && !active[window]) window += 1;
      if (window >= active.length) break;
      const first = window;
      while (window < active.length && active[window]) window += 1;
      const payload = decodeBurst(
        pcm,
        options,
        config.sampleRate / config.baud,
        burstBounds(pcm, windowSamples, first, window)
      );
      if (payload !== null) decoded.push(payload);
    }
    return decoded;
  }
  return __toCommonJS(peer_audio_entry_exports);
})();
