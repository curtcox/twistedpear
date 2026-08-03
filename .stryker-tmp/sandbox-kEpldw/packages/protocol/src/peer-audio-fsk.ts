// @ts-nocheck
function stryNS_9fa48() {
  var g = typeof globalThis === 'object' && globalThis && globalThis.Math === Math && globalThis || new Function("return this")();
  var ns = g.__stryker__ || (g.__stryker__ = {});
  if (ns.activeMutant === undefined && g.process && g.process.env && g.process.env.__STRYKER_ACTIVE_MUTANT__) {
    ns.activeMutant = g.process.env.__STRYKER_ACTIVE_MUTANT__;
  }
  function retrieveNS() {
    return ns;
  }
  stryNS_9fa48 = retrieveNS;
  return retrieveNS();
}
stryNS_9fa48();
function stryCov_9fa48() {
  var ns = stryNS_9fa48();
  var cov = ns.mutantCoverage || (ns.mutantCoverage = {
    static: {},
    perTest: {}
  });
  function cover() {
    var c = cov.static;
    if (ns.currentTestId) {
      c = cov.perTest[ns.currentTestId] = cov.perTest[ns.currentTestId] || {};
    }
    var a = arguments;
    for (var i = 0; i < a.length; i++) {
      c[a[i]] = (c[a[i]] || 0) + 1;
    }
  }
  stryCov_9fa48 = cover;
  cover.apply(null, arguments);
}
function stryMutAct_9fa48(id) {
  var ns = stryNS_9fa48();
  function isActive(id) {
    if (ns.activeMutant === id) {
      if (ns.hitCount !== void 0 && ++ns.hitCount > ns.hitLimit) {
        throw new Error('Stryker: Hit count limit reached (' + ns.hitCount + ')');
      }
      return true;
    }
    return false;
  }
  stryMutAct_9fa48 = isActive;
  return isActive(id);
}
const PREAMBLE_BYTES = 16;
const PREAMBLE = 0xa5;
const HEADER_BYTES = stryMutAct_9fa48("26252") ? PREAMBLE_BYTES - 2 : (stryCov_9fa48("26252"), PREAMBLE_BYTES + 2);
export const MAX_PEER_AUDIO_MODEM_BYTES = 4_096;
export interface PeerAudioFskOptions {
  readonly sampleRate?: number;
  readonly baud?: number;
  readonly markHz?: number;
  readonly spaceHz?: number;
  readonly amplitude?: number;
}
export class PeerAudioFskError extends Error {
  constructor(readonly code: "MALFORMED" | "OVERSIZED" | "CRC" | "SIGNAL", message: string) {
    super(message);
    this.name = stryMutAct_9fa48("26253") ? "" : (stryCov_9fa48("26253"), "PeerAudioFskError");
  }
}
function crc32(bytes: Uint8Array): number {
  if (stryMutAct_9fa48("26254")) {
    {}
  } else {
    stryCov_9fa48("26254");
    let crc = 0xffff_ffff;
    for (const byte of bytes) {
      if (stryMutAct_9fa48("26255")) {
        {}
      } else {
        stryCov_9fa48("26255");
        crc ^= byte;
        for (let bit = 0; stryMutAct_9fa48("26258") ? bit >= 8 : stryMutAct_9fa48("26257") ? bit <= 8 : stryMutAct_9fa48("26256") ? false : (stryCov_9fa48("26256", "26257", "26258"), bit < 8); stryMutAct_9fa48("26259") ? bit -= 1 : (stryCov_9fa48("26259"), bit += 1)) crc = crc >>> 1 ^ (crc & 1 ? 0xedb8_8320 : 0);
      }
    }
    return (crc ^ 0xffff_ffff) >>> 0;
  }
}
function settings(options: PeerAudioFskOptions) {
  if (stryMutAct_9fa48("26260")) {
    {}
  } else {
    stryCov_9fa48("26260");
    const sampleRate = stryMutAct_9fa48("26261") ? options.sampleRate && 48_000 : (stryCov_9fa48("26261"), options.sampleRate ?? 48_000);
    const baud = stryMutAct_9fa48("26262") ? options.baud && 1_200 : (stryCov_9fa48("26262"), options.baud ?? 1_200);
    const markHz = stryMutAct_9fa48("26263") ? options.markHz && 2_400 : (stryCov_9fa48("26263"), options.markHz ?? 2_400);
    const spaceHz = stryMutAct_9fa48("26264") ? options.spaceHz && 1_200 : (stryCov_9fa48("26264"), options.spaceHz ?? 1_200);
    const amplitude = stryMutAct_9fa48("26265") ? options.amplitude && 0.7 : (stryCov_9fa48("26265"), options.amplitude ?? 0.7);
    if (stryMutAct_9fa48("26268") ? (sampleRate < 8_000 || sampleRate > 192_000 || baud < 100 || baud > 4_800 || markHz <= baud / 2 || spaceHz <= baud / 2 || Math.max(markHz, spaceHz) >= sampleRate / 2 || amplitude <= 0) && amplitude > 1 : stryMutAct_9fa48("26267") ? false : stryMutAct_9fa48("26266") ? true : (stryCov_9fa48("26266", "26267", "26268"), (stryMutAct_9fa48("26270") ? (sampleRate < 8_000 || sampleRate > 192_000 || baud < 100 || baud > 4_800 || markHz <= baud / 2 || spaceHz <= baud / 2 || Math.max(markHz, spaceHz) >= sampleRate / 2) && amplitude <= 0 : stryMutAct_9fa48("26269") ? false : (stryCov_9fa48("26269", "26270"), (stryMutAct_9fa48("26272") ? (sampleRate < 8_000 || sampleRate > 192_000 || baud < 100 || baud > 4_800 || markHz <= baud / 2 || spaceHz <= baud / 2) && Math.max(markHz, spaceHz) >= sampleRate / 2 : stryMutAct_9fa48("26271") ? false : (stryCov_9fa48("26271", "26272"), (stryMutAct_9fa48("26274") ? (sampleRate < 8_000 || sampleRate > 192_000 || baud < 100 || baud > 4_800 || markHz <= baud / 2) && spaceHz <= baud / 2 : stryMutAct_9fa48("26273") ? false : (stryCov_9fa48("26273", "26274"), (stryMutAct_9fa48("26276") ? (sampleRate < 8_000 || sampleRate > 192_000 || baud < 100 || baud > 4_800) && markHz <= baud / 2 : stryMutAct_9fa48("26275") ? false : (stryCov_9fa48("26275", "26276"), (stryMutAct_9fa48("26278") ? (sampleRate < 8_000 || sampleRate > 192_000 || baud < 100) && baud > 4_800 : stryMutAct_9fa48("26277") ? false : (stryCov_9fa48("26277", "26278"), (stryMutAct_9fa48("26280") ? (sampleRate < 8_000 || sampleRate > 192_000) && baud < 100 : stryMutAct_9fa48("26279") ? false : (stryCov_9fa48("26279", "26280"), (stryMutAct_9fa48("26282") ? sampleRate < 8_000 && sampleRate > 192_000 : stryMutAct_9fa48("26281") ? false : (stryCov_9fa48("26281", "26282"), (stryMutAct_9fa48("26285") ? sampleRate >= 8_000 : stryMutAct_9fa48("26284") ? sampleRate <= 8_000 : stryMutAct_9fa48("26283") ? false : (stryCov_9fa48("26283", "26284", "26285"), sampleRate < 8_000)) || (stryMutAct_9fa48("26288") ? sampleRate <= 192_000 : stryMutAct_9fa48("26287") ? sampleRate >= 192_000 : stryMutAct_9fa48("26286") ? false : (stryCov_9fa48("26286", "26287", "26288"), sampleRate > 192_000)))) || (stryMutAct_9fa48("26291") ? baud >= 100 : stryMutAct_9fa48("26290") ? baud <= 100 : stryMutAct_9fa48("26289") ? false : (stryCov_9fa48("26289", "26290", "26291"), baud < 100)))) || (stryMutAct_9fa48("26294") ? baud <= 4_800 : stryMutAct_9fa48("26293") ? baud >= 4_800 : stryMutAct_9fa48("26292") ? false : (stryCov_9fa48("26292", "26293", "26294"), baud > 4_800)))) || (stryMutAct_9fa48("26297") ? markHz > baud / 2 : stryMutAct_9fa48("26296") ? markHz < baud / 2 : stryMutAct_9fa48("26295") ? false : (stryCov_9fa48("26295", "26296", "26297"), markHz <= (stryMutAct_9fa48("26298") ? baud * 2 : (stryCov_9fa48("26298"), baud / 2)))))) || (stryMutAct_9fa48("26301") ? spaceHz > baud / 2 : stryMutAct_9fa48("26300") ? spaceHz < baud / 2 : stryMutAct_9fa48("26299") ? false : (stryCov_9fa48("26299", "26300", "26301"), spaceHz <= (stryMutAct_9fa48("26302") ? baud * 2 : (stryCov_9fa48("26302"), baud / 2)))))) || (stryMutAct_9fa48("26305") ? Math.max(markHz, spaceHz) < sampleRate / 2 : stryMutAct_9fa48("26304") ? Math.max(markHz, spaceHz) > sampleRate / 2 : stryMutAct_9fa48("26303") ? false : (stryCov_9fa48("26303", "26304", "26305"), (stryMutAct_9fa48("26306") ? Math.min(markHz, spaceHz) : (stryCov_9fa48("26306"), Math.max(markHz, spaceHz))) >= (stryMutAct_9fa48("26307") ? sampleRate * 2 : (stryCov_9fa48("26307"), sampleRate / 2)))))) || (stryMutAct_9fa48("26310") ? amplitude > 0 : stryMutAct_9fa48("26309") ? amplitude < 0 : stryMutAct_9fa48("26308") ? false : (stryCov_9fa48("26308", "26309", "26310"), amplitude <= 0)))) || (stryMutAct_9fa48("26313") ? amplitude <= 1 : stryMutAct_9fa48("26312") ? amplitude >= 1 : stryMutAct_9fa48("26311") ? false : (stryCov_9fa48("26311", "26312", "26313"), amplitude > 1)))) throw new PeerAudioFskError(stryMutAct_9fa48("26314") ? "" : (stryCov_9fa48("26314"), "MALFORMED"), stryMutAct_9fa48("26315") ? "" : (stryCov_9fa48("26315"), "Invalid audible FSK profile"));
    return stryMutAct_9fa48("26316") ? {} : (stryCov_9fa48("26316"), {
      sampleRate,
      baud,
      markHz,
      spaceHz,
      amplitude
    });
  }
}
function packet(payload: Uint8Array): Uint8Array {
  if (stryMutAct_9fa48("26317")) {
    {}
  } else {
    stryCov_9fa48("26317");
    if (stryMutAct_9fa48("26320") ? payload.length < 1 && payload.length > MAX_PEER_AUDIO_MODEM_BYTES : stryMutAct_9fa48("26319") ? false : stryMutAct_9fa48("26318") ? true : (stryCov_9fa48("26318", "26319", "26320"), (stryMutAct_9fa48("26323") ? payload.length >= 1 : stryMutAct_9fa48("26322") ? payload.length <= 1 : stryMutAct_9fa48("26321") ? false : (stryCov_9fa48("26321", "26322", "26323"), payload.length < 1)) || (stryMutAct_9fa48("26326") ? payload.length <= MAX_PEER_AUDIO_MODEM_BYTES : stryMutAct_9fa48("26325") ? payload.length >= MAX_PEER_AUDIO_MODEM_BYTES : stryMutAct_9fa48("26324") ? false : (stryCov_9fa48("26324", "26325", "26326"), payload.length > MAX_PEER_AUDIO_MODEM_BYTES)))) throw new PeerAudioFskError(stryMutAct_9fa48("26327") ? "" : (stryCov_9fa48("26327"), "OVERSIZED"), stryMutAct_9fa48("26328") ? "" : (stryCov_9fa48("26328"), "Audible FSK payload exceeds size budget"));
    const out = new Uint8Array(stryMutAct_9fa48("26329") ? HEADER_BYTES + payload.length - 4 : (stryCov_9fa48("26329"), (stryMutAct_9fa48("26330") ? HEADER_BYTES - payload.length : (stryCov_9fa48("26330"), HEADER_BYTES + payload.length)) + 4));
    out.fill(PREAMBLE, 0, PREAMBLE_BYTES);
    new DataView(out.buffer).setUint16(PREAMBLE_BYTES, payload.length, stryMutAct_9fa48("26331") ? true : (stryCov_9fa48("26331"), false));
    out.set(payload, HEADER_BYTES);
    new DataView(out.buffer).setUint32(stryMutAct_9fa48("26332") ? HEADER_BYTES - payload.length : (stryCov_9fa48("26332"), HEADER_BYTES + payload.length), crc32(payload), stryMutAct_9fa48("26333") ? true : (stryCov_9fa48("26333"), false));
    return out;
  }
}

/** Conservative audible binary FSK. PCM remains a trusted-host effect and never crosses the broker. */
export function encodePeerAudioFsk(payload: Uint8Array, options: PeerAudioFskOptions = {}): Float32Array {
  if (stryMutAct_9fa48("26334")) {
    {}
  } else {
    stryCov_9fa48("26334");
    const config = settings(options);
    const bytes = packet(payload);
    const symbols = stryMutAct_9fa48("26335") ? bytes.length / 8 : (stryCov_9fa48("26335"), bytes.length * 8);
    const totalSamples = Math.round(stryMutAct_9fa48("26336") ? symbols * config.sampleRate * config.baud : (stryCov_9fa48("26336"), (stryMutAct_9fa48("26337") ? symbols / config.sampleRate : (stryCov_9fa48("26337"), symbols * config.sampleRate)) / config.baud));
    const pcm = new Float32Array(totalSamples);
    let phase = 0;
    for (let symbol = 0; stryMutAct_9fa48("26340") ? symbol >= symbols : stryMutAct_9fa48("26339") ? symbol <= symbols : stryMutAct_9fa48("26338") ? false : (stryCov_9fa48("26338", "26339", "26340"), symbol < symbols); stryMutAct_9fa48("26341") ? symbol -= 1 : (stryCov_9fa48("26341"), symbol += 1)) {
      if (stryMutAct_9fa48("26342")) {
        {}
      } else {
        stryCov_9fa48("26342");
        const byte = stryMutAct_9fa48("26343") ? bytes[Math.floor(symbol / 8)] && 0 : (stryCov_9fa48("26343"), bytes[Math.floor(stryMutAct_9fa48("26344") ? symbol * 8 : (stryCov_9fa48("26344"), symbol / 8))] ?? 0);
        const bit = byte >>> (stryMutAct_9fa48("26345") ? 7 + symbol % 8 : (stryCov_9fa48("26345"), 7 - (stryMutAct_9fa48("26346") ? symbol * 8 : (stryCov_9fa48("26346"), symbol % 8)))) & 1;
        const frequency = (stryMutAct_9fa48("26349") ? bit !== 1 : stryMutAct_9fa48("26348") ? false : stryMutAct_9fa48("26347") ? true : (stryCov_9fa48("26347", "26348", "26349"), bit === 1)) ? config.markHz : config.spaceHz;
        const start = Math.round(stryMutAct_9fa48("26350") ? symbol * config.sampleRate * config.baud : (stryCov_9fa48("26350"), (stryMutAct_9fa48("26351") ? symbol / config.sampleRate : (stryCov_9fa48("26351"), symbol * config.sampleRate)) / config.baud));
        const end = Math.round(stryMutAct_9fa48("26352") ? (symbol + 1) * config.sampleRate * config.baud : (stryCov_9fa48("26352"), (stryMutAct_9fa48("26353") ? (symbol + 1) / config.sampleRate : (stryCov_9fa48("26353"), (stryMutAct_9fa48("26354") ? symbol - 1 : (stryCov_9fa48("26354"), symbol + 1)) * config.sampleRate)) / config.baud));
        const step = stryMutAct_9fa48("26355") ? 2 * Math.PI * frequency * config.sampleRate : (stryCov_9fa48("26355"), (stryMutAct_9fa48("26356") ? 2 * Math.PI / frequency : (stryCov_9fa48("26356"), (stryMutAct_9fa48("26357") ? 2 / Math.PI : (stryCov_9fa48("26357"), 2 * Math.PI)) * frequency)) / config.sampleRate);
        for (let index = start; stryMutAct_9fa48("26360") ? index >= end : stryMutAct_9fa48("26359") ? index <= end : stryMutAct_9fa48("26358") ? false : (stryCov_9fa48("26358", "26359", "26360"), index < end); stryMutAct_9fa48("26361") ? index -= 1 : (stryCov_9fa48("26361"), index += 1)) {
          if (stryMutAct_9fa48("26362")) {
            {}
          } else {
            stryCov_9fa48("26362");
            pcm[index] = stryMutAct_9fa48("26363") ? Math.sin(phase) / config.amplitude : (stryCov_9fa48("26363"), Math.sin(phase) * config.amplitude);
            phase = stryMutAct_9fa48("26364") ? (phase + step) * (2 * Math.PI) : (stryCov_9fa48("26364"), (stryMutAct_9fa48("26365") ? phase - step : (stryCov_9fa48("26365"), phase + step)) % (stryMutAct_9fa48("26366") ? 2 / Math.PI : (stryCov_9fa48("26366"), 2 * Math.PI)));
          }
        }
      }
    }
    return pcm;
  }
}
function energy(pcm: Float32Array, start: number, end: number, frequency: number, sampleRate: number): number {
  if (stryMutAct_9fa48("26367")) {
    {}
  } else {
    stryCov_9fa48("26367");
    let sin = 0;
    let cos = 0;
    const step = stryMutAct_9fa48("26368") ? 2 * Math.PI * frequency * sampleRate : (stryCov_9fa48("26368"), (stryMutAct_9fa48("26369") ? 2 * Math.PI / frequency : (stryCov_9fa48("26369"), (stryMutAct_9fa48("26370") ? 2 / Math.PI : (stryCov_9fa48("26370"), 2 * Math.PI)) * frequency)) / sampleRate);
    for (let index = start; stryMutAct_9fa48("26373") ? index >= end : stryMutAct_9fa48("26372") ? index <= end : stryMutAct_9fa48("26371") ? false : (stryCov_9fa48("26371", "26372", "26373"), index < end); stryMutAct_9fa48("26374") ? index -= 1 : (stryCov_9fa48("26374"), index += 1)) {
      if (stryMutAct_9fa48("26375")) {
        {}
      } else {
        stryCov_9fa48("26375");
        const value = stryMutAct_9fa48("26376") ? pcm[index] && 0 : (stryCov_9fa48("26376"), pcm[index] ?? 0);
        const phase = stryMutAct_9fa48("26377") ? step / (index - start) : (stryCov_9fa48("26377"), step * (stryMutAct_9fa48("26378") ? index + start : (stryCov_9fa48("26378"), index - start)));
        stryMutAct_9fa48("26379") ? sin -= value * Math.sin(phase) : (stryCov_9fa48("26379"), sin += stryMutAct_9fa48("26380") ? value / Math.sin(phase) : (stryCov_9fa48("26380"), value * Math.sin(phase)));
        stryMutAct_9fa48("26381") ? cos -= value * Math.cos(phase) : (stryCov_9fa48("26381"), cos += stryMutAct_9fa48("26382") ? value / Math.cos(phase) : (stryCov_9fa48("26382"), value * Math.cos(phase)));
      }
    }
    return stryMutAct_9fa48("26383") ? sin * sin - cos * cos : (stryCov_9fa48("26383"), (stryMutAct_9fa48("26384") ? sin / sin : (stryCov_9fa48("26384"), sin * sin)) + (stryMutAct_9fa48("26385") ? cos / cos : (stryCov_9fa48("26385"), cos * cos)));
  }
}
export function decodePeerAudioFsk(pcm: Float32Array, options: PeerAudioFskOptions = {}): Uint8Array {
  if (stryMutAct_9fa48("26386")) {
    {}
  } else {
    stryCov_9fa48("26386");
    const config = settings(options);
    const symbols = Math.floor(stryMutAct_9fa48("26387") ? pcm.length * config.baud * config.sampleRate : (stryCov_9fa48("26387"), (stryMutAct_9fa48("26388") ? pcm.length / config.baud : (stryCov_9fa48("26388"), pcm.length * config.baud)) / config.sampleRate));
    if (stryMutAct_9fa48("26392") ? symbols >= (HEADER_BYTES + 4) * 8 : stryMutAct_9fa48("26391") ? symbols <= (HEADER_BYTES + 4) * 8 : stryMutAct_9fa48("26390") ? false : stryMutAct_9fa48("26389") ? true : (stryCov_9fa48("26389", "26390", "26391", "26392"), symbols < (stryMutAct_9fa48("26393") ? (HEADER_BYTES + 4) / 8 : (stryCov_9fa48("26393"), (stryMutAct_9fa48("26394") ? HEADER_BYTES - 4 : (stryCov_9fa48("26394"), HEADER_BYTES + 4)) * 8)))) throw new PeerAudioFskError(stryMutAct_9fa48("26395") ? "" : (stryCov_9fa48("26395"), "SIGNAL"), stryMutAct_9fa48("26396") ? "" : (stryCov_9fa48("26396"), "Audible FSK signal is too short"));
    const decoded = new Uint8Array(Math.floor(stryMutAct_9fa48("26397") ? symbols * 8 : (stryCov_9fa48("26397"), symbols / 8)));
    for (let symbol = 0; stryMutAct_9fa48("26400") ? symbol >= decoded.length * 8 : stryMutAct_9fa48("26399") ? symbol <= decoded.length * 8 : stryMutAct_9fa48("26398") ? false : (stryCov_9fa48("26398", "26399", "26400"), symbol < (stryMutAct_9fa48("26401") ? decoded.length / 8 : (stryCov_9fa48("26401"), decoded.length * 8))); stryMutAct_9fa48("26402") ? symbol -= 1 : (stryCov_9fa48("26402"), symbol += 1)) {
      if (stryMutAct_9fa48("26403")) {
        {}
      } else {
        stryCov_9fa48("26403");
        const start = Math.round(stryMutAct_9fa48("26404") ? symbol * config.sampleRate * config.baud : (stryCov_9fa48("26404"), (stryMutAct_9fa48("26405") ? symbol / config.sampleRate : (stryCov_9fa48("26405"), symbol * config.sampleRate)) / config.baud));
        const end = Math.round(stryMutAct_9fa48("26406") ? (symbol + 1) * config.sampleRate * config.baud : (stryCov_9fa48("26406"), (stryMutAct_9fa48("26407") ? (symbol + 1) / config.sampleRate : (stryCov_9fa48("26407"), (stryMutAct_9fa48("26408") ? symbol - 1 : (stryCov_9fa48("26408"), symbol + 1)) * config.sampleRate)) / config.baud));
        const mark = energy(pcm, start, end, config.markHz, config.sampleRate);
        const space = energy(pcm, start, end, config.spaceHz, config.sampleRate);
        if (stryMutAct_9fa48("26412") ? Math.max(mark, space) >= 1e-6 : stryMutAct_9fa48("26411") ? Math.max(mark, space) <= 1e-6 : stryMutAct_9fa48("26410") ? false : stryMutAct_9fa48("26409") ? true : (stryCov_9fa48("26409", "26410", "26411", "26412"), (stryMutAct_9fa48("26413") ? Math.min(mark, space) : (stryCov_9fa48("26413"), Math.max(mark, space))) < 1e-6)) throw new PeerAudioFskError(stryMutAct_9fa48("26414") ? "" : (stryCov_9fa48("26414"), "SIGNAL"), stryMutAct_9fa48("26415") ? "" : (stryCov_9fa48("26415"), "Audible FSK carrier was not detected"));
        if (stryMutAct_9fa48("26419") ? mark <= space : stryMutAct_9fa48("26418") ? mark >= space : stryMutAct_9fa48("26417") ? false : stryMutAct_9fa48("26416") ? true : (stryCov_9fa48("26416", "26417", "26418", "26419"), mark > space)) decoded[Math.floor(stryMutAct_9fa48("26420") ? symbol * 8 : (stryCov_9fa48("26420"), symbol / 8))] = (stryMutAct_9fa48("26421") ? decoded[Math.floor(symbol / 8)] && 0 : (stryCov_9fa48("26421"), decoded[Math.floor(stryMutAct_9fa48("26422") ? symbol * 8 : (stryCov_9fa48("26422"), symbol / 8))] ?? 0)) | 1 << (stryMutAct_9fa48("26423") ? 7 + symbol % 8 : (stryCov_9fa48("26423"), 7 - (stryMutAct_9fa48("26424") ? symbol * 8 : (stryCov_9fa48("26424"), symbol % 8))));
      }
    }
    if (stryMutAct_9fa48("26427") ? false : stryMutAct_9fa48("26426") ? true : stryMutAct_9fa48("26425") ? decoded.subarray(0, PREAMBLE_BYTES).every(byte => byte === PREAMBLE) : (stryCov_9fa48("26425", "26426", "26427"), !(stryMutAct_9fa48("26428") ? decoded.subarray(0, PREAMBLE_BYTES).some(byte => byte === PREAMBLE) : (stryCov_9fa48("26428"), decoded.subarray(0, PREAMBLE_BYTES).every(stryMutAct_9fa48("26429") ? () => undefined : (stryCov_9fa48("26429"), byte => stryMutAct_9fa48("26432") ? byte !== PREAMBLE : stryMutAct_9fa48("26431") ? false : stryMutAct_9fa48("26430") ? true : (stryCov_9fa48("26430", "26431", "26432"), byte === PREAMBLE))))))) throw new PeerAudioFskError(stryMutAct_9fa48("26433") ? "" : (stryCov_9fa48("26433"), "SIGNAL"), stryMutAct_9fa48("26434") ? "" : (stryCov_9fa48("26434"), "Audible FSK preamble was not detected"));
    const length = new DataView(decoded.buffer, decoded.byteOffset, decoded.byteLength).getUint16(PREAMBLE_BYTES, stryMutAct_9fa48("26435") ? true : (stryCov_9fa48("26435"), false));
    if (stryMutAct_9fa48("26438") ? (length < 1 || length > MAX_PEER_AUDIO_MODEM_BYTES) && HEADER_BYTES + length + 4 > decoded.length : stryMutAct_9fa48("26437") ? false : stryMutAct_9fa48("26436") ? true : (stryCov_9fa48("26436", "26437", "26438"), (stryMutAct_9fa48("26440") ? length < 1 && length > MAX_PEER_AUDIO_MODEM_BYTES : stryMutAct_9fa48("26439") ? false : (stryCov_9fa48("26439", "26440"), (stryMutAct_9fa48("26443") ? length >= 1 : stryMutAct_9fa48("26442") ? length <= 1 : stryMutAct_9fa48("26441") ? false : (stryCov_9fa48("26441", "26442", "26443"), length < 1)) || (stryMutAct_9fa48("26446") ? length <= MAX_PEER_AUDIO_MODEM_BYTES : stryMutAct_9fa48("26445") ? length >= MAX_PEER_AUDIO_MODEM_BYTES : stryMutAct_9fa48("26444") ? false : (stryCov_9fa48("26444", "26445", "26446"), length > MAX_PEER_AUDIO_MODEM_BYTES)))) || (stryMutAct_9fa48("26449") ? HEADER_BYTES + length + 4 <= decoded.length : stryMutAct_9fa48("26448") ? HEADER_BYTES + length + 4 >= decoded.length : stryMutAct_9fa48("26447") ? false : (stryCov_9fa48("26447", "26448", "26449"), (stryMutAct_9fa48("26450") ? HEADER_BYTES + length - 4 : (stryCov_9fa48("26450"), (stryMutAct_9fa48("26451") ? HEADER_BYTES - length : (stryCov_9fa48("26451"), HEADER_BYTES + length)) + 4)) > decoded.length)))) throw new PeerAudioFskError(stryMutAct_9fa48("26452") ? "" : (stryCov_9fa48("26452"), "MALFORMED"), stryMutAct_9fa48("26453") ? "" : (stryCov_9fa48("26453"), "Audible FSK packet length is invalid"));
    const payload = stryMutAct_9fa48("26454") ? decoded : (stryCov_9fa48("26454"), decoded.slice(HEADER_BYTES, stryMutAct_9fa48("26455") ? HEADER_BYTES - length : (stryCov_9fa48("26455"), HEADER_BYTES + length)));
    const expected = new DataView(decoded.buffer, decoded.byteOffset, decoded.byteLength).getUint32(stryMutAct_9fa48("26456") ? HEADER_BYTES - length : (stryCov_9fa48("26456"), HEADER_BYTES + length), stryMutAct_9fa48("26457") ? true : (stryCov_9fa48("26457"), false));
    if (stryMutAct_9fa48("26460") ? crc32(payload) === expected : stryMutAct_9fa48("26459") ? false : stryMutAct_9fa48("26458") ? true : (stryCov_9fa48("26458", "26459", "26460"), crc32(payload) !== expected)) throw new PeerAudioFskError(stryMutAct_9fa48("26461") ? "" : (stryCov_9fa48("26461"), "CRC"), stryMutAct_9fa48("26462") ? "" : (stryCov_9fa48("26462"), "Audible FSK payload CRC mismatch"));
    return payload;
  }
}

/** Extracts bounded FSK bursts from microphone PCM containing silence between frames. */
export function decodePeerAudioFskStream(pcm: Float32Array, options: PeerAudioFskOptions = {}): ReadonlyArray<Uint8Array> {
  if (stryMutAct_9fa48("26463")) {
    {}
  } else {
    stryCov_9fa48("26463");
    const config = settings(options);
    const windowSamples = stryMutAct_9fa48("26464") ? Math.min(8, Math.round(config.sampleRate * 0.01)) : (stryCov_9fa48("26464"), Math.max(8, Math.round(stryMutAct_9fa48("26465") ? config.sampleRate / 0.01 : (stryCov_9fa48("26465"), config.sampleRate * 0.01))));
    const active: boolean[] = stryMutAct_9fa48("26466") ? ["Stryker was here"] : (stryCov_9fa48("26466"), []);
    for (let start = 0; stryMutAct_9fa48("26469") ? start >= pcm.length : stryMutAct_9fa48("26468") ? start <= pcm.length : stryMutAct_9fa48("26467") ? false : (stryCov_9fa48("26467", "26468", "26469"), start < pcm.length); stryMutAct_9fa48("26470") ? start -= windowSamples : (stryCov_9fa48("26470"), start += windowSamples)) {
      if (stryMutAct_9fa48("26471")) {
        {}
      } else {
        stryCov_9fa48("26471");
        let energySum = 0;
        const end = stryMutAct_9fa48("26472") ? Math.max(pcm.length, start + windowSamples) : (stryCov_9fa48("26472"), Math.min(pcm.length, stryMutAct_9fa48("26473") ? start - windowSamples : (stryCov_9fa48("26473"), start + windowSamples)));
        for (let index = start; stryMutAct_9fa48("26476") ? index >= end : stryMutAct_9fa48("26475") ? index <= end : stryMutAct_9fa48("26474") ? false : (stryCov_9fa48("26474", "26475", "26476"), index < end); stryMutAct_9fa48("26477") ? index -= 1 : (stryCov_9fa48("26477"), index += 1)) stryMutAct_9fa48("26478") ? energySum -= (pcm[index] ?? 0) ** 2 : (stryCov_9fa48("26478"), energySum += (stryMutAct_9fa48("26479") ? pcm[index] && 0 : (stryCov_9fa48("26479"), pcm[index] ?? 0)) ** 2);
        active.push(stryMutAct_9fa48("26483") ? Math.sqrt(energySum / Math.max(1, end - start)) <= 0.02 : stryMutAct_9fa48("26482") ? Math.sqrt(energySum / Math.max(1, end - start)) >= 0.02 : stryMutAct_9fa48("26481") ? false : stryMutAct_9fa48("26480") ? true : (stryCov_9fa48("26480", "26481", "26482", "26483"), Math.sqrt(stryMutAct_9fa48("26484") ? energySum * Math.max(1, end - start) : (stryCov_9fa48("26484"), energySum / (stryMutAct_9fa48("26485") ? Math.min(1, end - start) : (stryCov_9fa48("26485"), Math.max(1, stryMutAct_9fa48("26486") ? end + start : (stryCov_9fa48("26486"), end - start)))))) > 0.02));
      }
    }
    const decoded: Uint8Array[] = stryMutAct_9fa48("26487") ? ["Stryker was here"] : (stryCov_9fa48("26487"), []);
    let window = 0;
    while (stryMutAct_9fa48("26490") ? window >= active.length : stryMutAct_9fa48("26489") ? window <= active.length : stryMutAct_9fa48("26488") ? false : (stryCov_9fa48("26488", "26489", "26490"), window < active.length)) {
      if (stryMutAct_9fa48("26491")) {
        {}
      } else {
        stryCov_9fa48("26491");
        while (stryMutAct_9fa48("26493") ? window < active.length || !active[window] : stryMutAct_9fa48("26492") ? false : (stryCov_9fa48("26492", "26493"), (stryMutAct_9fa48("26496") ? window >= active.length : stryMutAct_9fa48("26495") ? window <= active.length : stryMutAct_9fa48("26494") ? true : (stryCov_9fa48("26494", "26495", "26496"), window < active.length)) && (stryMutAct_9fa48("26497") ? active[window] : (stryCov_9fa48("26497"), !active[window])))) stryMutAct_9fa48("26498") ? window -= 1 : (stryCov_9fa48("26498"), window += 1);
        if (stryMutAct_9fa48("26502") ? window < active.length : stryMutAct_9fa48("26501") ? window > active.length : stryMutAct_9fa48("26500") ? false : stryMutAct_9fa48("26499") ? true : (stryCov_9fa48("26499", "26500", "26501", "26502"), window >= active.length)) break;
        const first = window;
        while (stryMutAct_9fa48("26504") ? window < active.length || active[window] : stryMutAct_9fa48("26503") ? false : (stryCov_9fa48("26503", "26504"), (stryMutAct_9fa48("26507") ? window >= active.length : stryMutAct_9fa48("26506") ? window <= active.length : stryMutAct_9fa48("26505") ? true : (stryCov_9fa48("26505", "26506", "26507"), window < active.length)) && active[window])) stryMutAct_9fa48("26508") ? window -= 1 : (stryCov_9fa48("26508"), window += 1);
        const last = window;
        let firstSignal = stryMutAct_9fa48("26509") ? first / windowSamples : (stryCov_9fa48("26509"), first * windowSamples);
        const firstWindowEnd = stryMutAct_9fa48("26510") ? Math.max(pcm.length, (first + 1) * windowSamples) : (stryCov_9fa48("26510"), Math.min(pcm.length, stryMutAct_9fa48("26511") ? (first + 1) / windowSamples : (stryCov_9fa48("26511"), (stryMutAct_9fa48("26512") ? first - 1 : (stryCov_9fa48("26512"), first + 1)) * windowSamples)));
        while (stryMutAct_9fa48("26514") ? firstSignal < firstWindowEnd || Math.abs(pcm[firstSignal] ?? 0) <= 0.02 : stryMutAct_9fa48("26513") ? false : (stryCov_9fa48("26513", "26514"), (stryMutAct_9fa48("26517") ? firstSignal >= firstWindowEnd : stryMutAct_9fa48("26516") ? firstSignal <= firstWindowEnd : stryMutAct_9fa48("26515") ? true : (stryCov_9fa48("26515", "26516", "26517"), firstSignal < firstWindowEnd)) && (stryMutAct_9fa48("26520") ? Math.abs(pcm[firstSignal] ?? 0) > 0.02 : stryMutAct_9fa48("26519") ? Math.abs(pcm[firstSignal] ?? 0) < 0.02 : stryMutAct_9fa48("26518") ? true : (stryCov_9fa48("26518", "26519", "26520"), Math.abs(stryMutAct_9fa48("26521") ? pcm[firstSignal] && 0 : (stryCov_9fa48("26521"), pcm[firstSignal] ?? 0)) <= 0.02)))) stryMutAct_9fa48("26522") ? firstSignal -= 1 : (stryCov_9fa48("26522"), firstSignal += 1);
        const start = stryMutAct_9fa48("26523") ? Math.min(0, firstSignal - 1) : (stryCov_9fa48("26523"), Math.max(0, stryMutAct_9fa48("26524") ? firstSignal + 1 : (stryCov_9fa48("26524"), firstSignal - 1)));
        let lastSignal = stryMutAct_9fa48("26525") ? Math.min(pcm.length, last * windowSamples) + 1 : (stryCov_9fa48("26525"), (stryMutAct_9fa48("26526") ? Math.max(pcm.length, last * windowSamples) : (stryCov_9fa48("26526"), Math.min(pcm.length, stryMutAct_9fa48("26527") ? last / windowSamples : (stryCov_9fa48("26527"), last * windowSamples)))) - 1);
        const lastWindowStart = stryMutAct_9fa48("26528") ? Math.min(start, (last - 1) * windowSamples) : (stryCov_9fa48("26528"), Math.max(start, stryMutAct_9fa48("26529") ? (last - 1) / windowSamples : (stryCov_9fa48("26529"), (stryMutAct_9fa48("26530") ? last + 1 : (stryCov_9fa48("26530"), last - 1)) * windowSamples)));
        while (stryMutAct_9fa48("26532") ? lastSignal > lastWindowStart || Math.abs(pcm[lastSignal] ?? 0) <= 0.02 : stryMutAct_9fa48("26531") ? false : (stryCov_9fa48("26531", "26532"), (stryMutAct_9fa48("26535") ? lastSignal <= lastWindowStart : stryMutAct_9fa48("26534") ? lastSignal >= lastWindowStart : stryMutAct_9fa48("26533") ? true : (stryCov_9fa48("26533", "26534", "26535"), lastSignal > lastWindowStart)) && (stryMutAct_9fa48("26538") ? Math.abs(pcm[lastSignal] ?? 0) > 0.02 : stryMutAct_9fa48("26537") ? Math.abs(pcm[lastSignal] ?? 0) < 0.02 : stryMutAct_9fa48("26536") ? true : (stryCov_9fa48("26536", "26537", "26538"), Math.abs(stryMutAct_9fa48("26539") ? pcm[lastSignal] && 0 : (stryCov_9fa48("26539"), pcm[lastSignal] ?? 0)) <= 0.02)))) stryMutAct_9fa48("26540") ? lastSignal += 1 : (stryCov_9fa48("26540"), lastSignal -= 1);
        const end = stryMutAct_9fa48("26541") ? Math.max(pcm.length, lastSignal + 2) : (stryCov_9fa48("26541"), Math.min(pcm.length, stryMutAct_9fa48("26542") ? lastSignal - 2 : (stryCov_9fa48("26542"), lastSignal + 2)));
        let payload: Uint8Array | null = null;
        const symbolSamples = stryMutAct_9fa48("26543") ? config.sampleRate * config.baud : (stryCov_9fa48("26543"), config.sampleRate / config.baud);
        for (let adjustment = 0; stryMutAct_9fa48("26545") ? adjustment <= Math.ceil(symbolSamples / 2) || payload === null : stryMutAct_9fa48("26544") ? false : (stryCov_9fa48("26544", "26545"), (stryMutAct_9fa48("26548") ? adjustment > Math.ceil(symbolSamples / 2) : stryMutAct_9fa48("26547") ? adjustment < Math.ceil(symbolSamples / 2) : stryMutAct_9fa48("26546") ? true : (stryCov_9fa48("26546", "26547", "26548"), adjustment <= Math.ceil(stryMutAct_9fa48("26549") ? symbolSamples * 2 : (stryCov_9fa48("26549"), symbolSamples / 2)))) && (stryMutAct_9fa48("26551") ? payload !== null : stryMutAct_9fa48("26550") ? true : (stryCov_9fa48("26550", "26551"), payload === null))); stryMutAct_9fa48("26552") ? adjustment -= 1 : (stryCov_9fa48("26552"), adjustment += 1)) {
          if (stryMutAct_9fa48("26553")) {
            {}
          } else {
            stryCov_9fa48("26553");
            try {
              if (stryMutAct_9fa48("26554")) {
                {}
              } else {
                stryCov_9fa48("26554");
                payload = decodePeerAudioFsk(stryMutAct_9fa48("26555") ? pcm : (stryCov_9fa48("26555"), pcm.slice(stryMutAct_9fa48("26556") ? start - adjustment : (stryCov_9fa48("26556"), start + adjustment), end)), options);
              }
            } catch {/* Try the next bounded alignment. */}
          }
        }
        if (stryMutAct_9fa48("26559") ? payload === null : stryMutAct_9fa48("26558") ? false : stryMutAct_9fa48("26557") ? true : (stryCov_9fa48("26557", "26558", "26559"), payload !== null)) decoded.push(payload);
      }
    }
    return decoded;
  }
}