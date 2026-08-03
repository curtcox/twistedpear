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
import { transportClass, type BurstLossModel, type TransportClass } from "./transport-classes.js";
export type CalibratedTransportName = "ble" | "lora";
export type TraceEvidenceKind = "guarded-hardware" | "independent-deployment";
export interface CalibrationTraceProvenance {
  readonly kind: TraceEvidenceKind;
  readonly recordedAt: string;
  readonly source: string;
  readonly hardware: readonly string[];
  readonly software: readonly string[];
  readonly environment: string;
}
export interface CalibrationObservation {
  readonly sequence: number;
  readonly payloadBytes: number;
  readonly sentAtMs: number;
  readonly receivedAtMs: number | null;
}
export interface CalibrationTrace {
  readonly schemaVersion: 1;
  readonly transport: CalibratedTransportName;
  readonly provenance: CalibrationTraceProvenance;
  readonly radio: Readonly<Record<string, string | number | boolean>>;
  readonly observations: readonly CalibrationObservation[];
}
export interface CalibrationTolerance {
  readonly minimumObservations: number;
  readonly minimumDistinctPayloadSizes: number;
  readonly bandwidthRelative: number;
  readonly latencyMinRelative: number;
  readonly latencyMaxRelative: number;
  readonly lossRateAbsolute: number;
}
export interface CalibrationPolicy {
  readonly schemaVersion: 1;
  readonly transports: Readonly<Record<CalibratedTransportName, CalibrationTolerance>>;
}
export interface CalibratedParameters {
  readonly bandwidthBps: number;
  readonly latency: {
    readonly kind: "uniform";
    readonly minMs: number;
    readonly maxMs: number;
  };
  readonly lossRate: number;
  readonly burstLoss: BurstLossModel;
}
export interface CalibrationComparison {
  readonly withinTolerance: boolean;
  readonly errors: {
    readonly bandwidthRelative: number;
    readonly latencyMinRelative: number;
    readonly latencyMaxRelative: number;
    readonly lossRateAbsolute: number;
  };
}
export interface CalibrationResult {
  readonly transport: CalibratedTransportName;
  readonly observationCount: number;
  readonly deliveredCount: number;
  readonly distinctPayloadSizes: number;
  readonly parameters: CalibratedParameters;
  readonly preset: TransportClass;
  readonly comparison: CalibrationComparison;
}
function record(value: unknown, label: string): Record<string, unknown> {
  if (stryMutAct_9fa48("0")) {
    {}
  } else {
    stryCov_9fa48("0");
    if (stryMutAct_9fa48("3") ? (typeof value !== "object" || value === null) && Array.isArray(value) : stryMutAct_9fa48("2") ? false : stryMutAct_9fa48("1") ? true : (stryCov_9fa48("1", "2", "3"), (stryMutAct_9fa48("5") ? typeof value !== "object" && value === null : stryMutAct_9fa48("4") ? false : (stryCov_9fa48("4", "5"), (stryMutAct_9fa48("7") ? typeof value === "object" : stryMutAct_9fa48("6") ? false : (stryCov_9fa48("6", "7"), typeof value !== (stryMutAct_9fa48("8") ? "" : (stryCov_9fa48("8"), "object")))) || (stryMutAct_9fa48("10") ? value !== null : stryMutAct_9fa48("9") ? false : (stryCov_9fa48("9", "10"), value === null)))) || Array.isArray(value))) {
      if (stryMutAct_9fa48("11")) {
        {}
      } else {
        stryCov_9fa48("11");
        throw new Error(stryMutAct_9fa48("12") ? `` : (stryCov_9fa48("12"), `${label} must be an object`));
      }
    }
    return value as Record<string, unknown>;
  }
}
function string(value: unknown, label: string): string {
  if (stryMutAct_9fa48("13")) {
    {}
  } else {
    stryCov_9fa48("13");
    if (stryMutAct_9fa48("16") ? typeof value !== "string" && value.trim().length === 0 : stryMutAct_9fa48("15") ? false : stryMutAct_9fa48("14") ? true : (stryCov_9fa48("14", "15", "16"), (stryMutAct_9fa48("18") ? typeof value === "string" : stryMutAct_9fa48("17") ? false : (stryCov_9fa48("17", "18"), typeof value !== (stryMutAct_9fa48("19") ? "" : (stryCov_9fa48("19"), "string")))) || (stryMutAct_9fa48("21") ? value.trim().length !== 0 : stryMutAct_9fa48("20") ? false : (stryCov_9fa48("20", "21"), (stryMutAct_9fa48("22") ? value.length : (stryCov_9fa48("22"), value.trim().length)) === 0)))) {
      if (stryMutAct_9fa48("23")) {
        {}
      } else {
        stryCov_9fa48("23");
        throw new Error(stryMutAct_9fa48("24") ? `` : (stryCov_9fa48("24"), `${label} must be a non-empty string`));
      }
    }
    return value;
  }
}
function finite(value: unknown, label: string, minimum = 0): number {
  if (stryMutAct_9fa48("25")) {
    {}
  } else {
    stryCov_9fa48("25");
    if (stryMutAct_9fa48("28") ? (typeof value !== "number" || !Number.isFinite(value)) && value < minimum : stryMutAct_9fa48("27") ? false : stryMutAct_9fa48("26") ? true : (stryCov_9fa48("26", "27", "28"), (stryMutAct_9fa48("30") ? typeof value !== "number" && !Number.isFinite(value) : stryMutAct_9fa48("29") ? false : (stryCov_9fa48("29", "30"), (stryMutAct_9fa48("32") ? typeof value === "number" : stryMutAct_9fa48("31") ? false : (stryCov_9fa48("31", "32"), typeof value !== (stryMutAct_9fa48("33") ? "" : (stryCov_9fa48("33"), "number")))) || (stryMutAct_9fa48("34") ? Number.isFinite(value) : (stryCov_9fa48("34"), !Number.isFinite(value))))) || (stryMutAct_9fa48("37") ? value >= minimum : stryMutAct_9fa48("36") ? value <= minimum : stryMutAct_9fa48("35") ? false : (stryCov_9fa48("35", "36", "37"), value < minimum)))) {
      if (stryMutAct_9fa48("38")) {
        {}
      } else {
        stryCov_9fa48("38");
        throw new Error(stryMutAct_9fa48("39") ? `` : (stryCov_9fa48("39"), `${label} must be a finite number >= ${minimum}`));
      }
    }
    return value;
  }
}
function strings(value: unknown, label: string): readonly string[] {
  if (stryMutAct_9fa48("40")) {
    {}
  } else {
    stryCov_9fa48("40");
    if (stryMutAct_9fa48("43") ? !Array.isArray(value) && value.length === 0 : stryMutAct_9fa48("42") ? false : stryMutAct_9fa48("41") ? true : (stryCov_9fa48("41", "42", "43"), (stryMutAct_9fa48("44") ? Array.isArray(value) : (stryCov_9fa48("44"), !Array.isArray(value))) || (stryMutAct_9fa48("46") ? value.length !== 0 : stryMutAct_9fa48("45") ? false : (stryCov_9fa48("45", "46"), value.length === 0)))) {
      if (stryMutAct_9fa48("47")) {
        {}
      } else {
        stryCov_9fa48("47");
        throw new Error(stryMutAct_9fa48("48") ? `` : (stryCov_9fa48("48"), `${label} must be a non-empty string array`));
      }
    }
    return value.map(stryMutAct_9fa48("49") ? () => undefined : (stryCov_9fa48("49"), (entry, index) => string(entry, stryMutAct_9fa48("50") ? `` : (stryCov_9fa48("50"), `${label}[${index}]`))));
  }
}
function parseRadio(value: unknown): Readonly<Record<string, string | number | boolean>> {
  if (stryMutAct_9fa48("51")) {
    {}
  } else {
    stryCov_9fa48("51");
    const input = record(value, stryMutAct_9fa48("52") ? "" : (stryCov_9fa48("52"), "radio"));
    const result: Record<string, string | number | boolean> = {};
    for (const [key, entry] of Object.entries(input)) {
      if (stryMutAct_9fa48("53")) {
        {}
      } else {
        stryCov_9fa48("53");
        if (stryMutAct_9fa48("56") ? typeof entry !== "string" && typeof entry !== "number" || typeof entry !== "boolean" : stryMutAct_9fa48("55") ? false : stryMutAct_9fa48("54") ? true : (stryCov_9fa48("54", "55", "56"), (stryMutAct_9fa48("58") ? typeof entry !== "string" || typeof entry !== "number" : stryMutAct_9fa48("57") ? true : (stryCov_9fa48("57", "58"), (stryMutAct_9fa48("60") ? typeof entry === "string" : stryMutAct_9fa48("59") ? true : (stryCov_9fa48("59", "60"), typeof entry !== (stryMutAct_9fa48("61") ? "" : (stryCov_9fa48("61"), "string")))) && (stryMutAct_9fa48("63") ? typeof entry === "number" : stryMutAct_9fa48("62") ? true : (stryCov_9fa48("62", "63"), typeof entry !== (stryMutAct_9fa48("64") ? "" : (stryCov_9fa48("64"), "number")))))) && (stryMutAct_9fa48("66") ? typeof entry === "boolean" : stryMutAct_9fa48("65") ? true : (stryCov_9fa48("65", "66"), typeof entry !== (stryMutAct_9fa48("67") ? "" : (stryCov_9fa48("67"), "boolean")))))) {
          if (stryMutAct_9fa48("68")) {
            {}
          } else {
            stryCov_9fa48("68");
            throw new Error(stryMutAct_9fa48("69") ? `` : (stryCov_9fa48("69"), `radio.${key} must be a string, number, or boolean`));
          }
        }
        if (stryMutAct_9fa48("72") ? typeof entry === "number" || !Number.isFinite(entry) : stryMutAct_9fa48("71") ? false : stryMutAct_9fa48("70") ? true : (stryCov_9fa48("70", "71", "72"), (stryMutAct_9fa48("74") ? typeof entry !== "number" : stryMutAct_9fa48("73") ? true : (stryCov_9fa48("73", "74"), typeof entry === (stryMutAct_9fa48("75") ? "" : (stryCov_9fa48("75"), "number")))) && (stryMutAct_9fa48("76") ? Number.isFinite(entry) : (stryCov_9fa48("76"), !Number.isFinite(entry))))) {
          if (stryMutAct_9fa48("77")) {
            {}
          } else {
            stryCov_9fa48("77");
            throw new Error(stryMutAct_9fa48("78") ? `` : (stryCov_9fa48("78"), `radio.${key} must be finite`));
          }
        }
        result[key] = entry;
      }
    }
    if (stryMutAct_9fa48("81") ? Object.keys(result).length !== 0 : stryMutAct_9fa48("80") ? false : stryMutAct_9fa48("79") ? true : (stryCov_9fa48("79", "80", "81"), Object.keys(result).length === 0)) throw new Error(stryMutAct_9fa48("82") ? "" : (stryCov_9fa48("82"), "radio must identify the measured configuration"));
    return result;
  }
}
export function parseCalibrationTrace(value: unknown): CalibrationTrace {
  if (stryMutAct_9fa48("83")) {
    {}
  } else {
    stryCov_9fa48("83");
    const input = record(value, stryMutAct_9fa48("84") ? "" : (stryCov_9fa48("84"), "trace"));
    if (stryMutAct_9fa48("87") ? input.schemaVersion === 1 : stryMutAct_9fa48("86") ? false : stryMutAct_9fa48("85") ? true : (stryCov_9fa48("85", "86", "87"), input.schemaVersion !== 1)) throw new Error(stryMutAct_9fa48("88") ? "" : (stryCov_9fa48("88"), "trace.schemaVersion must be 1"));
    if (stryMutAct_9fa48("91") ? input.transport !== "ble" || input.transport !== "lora" : stryMutAct_9fa48("90") ? false : stryMutAct_9fa48("89") ? true : (stryCov_9fa48("89", "90", "91"), (stryMutAct_9fa48("93") ? input.transport === "ble" : stryMutAct_9fa48("92") ? true : (stryCov_9fa48("92", "93"), input.transport !== (stryMutAct_9fa48("94") ? "" : (stryCov_9fa48("94"), "ble")))) && (stryMutAct_9fa48("96") ? input.transport === "lora" : stryMutAct_9fa48("95") ? true : (stryCov_9fa48("95", "96"), input.transport !== (stryMutAct_9fa48("97") ? "" : (stryCov_9fa48("97"), "lora")))))) {
      if (stryMutAct_9fa48("98")) {
        {}
      } else {
        stryCov_9fa48("98");
        throw new Error(stryMutAct_9fa48("99") ? "" : (stryCov_9fa48("99"), "trace.transport must be ble or lora"));
      }
    }
    const provenance = record(input.provenance, stryMutAct_9fa48("100") ? "" : (stryCov_9fa48("100"), "provenance"));
    if (stryMutAct_9fa48("103") ? provenance.kind !== "guarded-hardware" || provenance.kind !== "independent-deployment" : stryMutAct_9fa48("102") ? false : stryMutAct_9fa48("101") ? true : (stryCov_9fa48("101", "102", "103"), (stryMutAct_9fa48("105") ? provenance.kind === "guarded-hardware" : stryMutAct_9fa48("104") ? true : (stryCov_9fa48("104", "105"), provenance.kind !== (stryMutAct_9fa48("106") ? "" : (stryCov_9fa48("106"), "guarded-hardware")))) && (stryMutAct_9fa48("108") ? provenance.kind === "independent-deployment" : stryMutAct_9fa48("107") ? true : (stryCov_9fa48("107", "108"), provenance.kind !== (stryMutAct_9fa48("109") ? "" : (stryCov_9fa48("109"), "independent-deployment")))))) {
      if (stryMutAct_9fa48("110")) {
        {}
      } else {
        stryCov_9fa48("110");
        throw new Error(stryMutAct_9fa48("111") ? "" : (stryCov_9fa48("111"), "provenance.kind must be guarded-hardware or independent-deployment"));
      }
    }
    const recordedAt = string(provenance.recordedAt, stryMutAct_9fa48("112") ? "" : (stryCov_9fa48("112"), "provenance.recordedAt"));
    if (stryMutAct_9fa48("115") ? false : stryMutAct_9fa48("114") ? true : stryMutAct_9fa48("113") ? Number.isFinite(Date.parse(recordedAt)) : (stryCov_9fa48("113", "114", "115"), !Number.isFinite(Date.parse(recordedAt)))) {
      if (stryMutAct_9fa48("116")) {
        {}
      } else {
        stryCov_9fa48("116");
        throw new Error(stryMutAct_9fa48("117") ? "" : (stryCov_9fa48("117"), "provenance.recordedAt must be an ISO-8601 timestamp"));
      }
    }
    if (stryMutAct_9fa48("120") ? !Array.isArray(input.observations) && input.observations.length === 0 : stryMutAct_9fa48("119") ? false : stryMutAct_9fa48("118") ? true : (stryCov_9fa48("118", "119", "120"), (stryMutAct_9fa48("121") ? Array.isArray(input.observations) : (stryCov_9fa48("121"), !Array.isArray(input.observations))) || (stryMutAct_9fa48("123") ? input.observations.length !== 0 : stryMutAct_9fa48("122") ? false : (stryCov_9fa48("122", "123"), input.observations.length === 0)))) {
      if (stryMutAct_9fa48("124")) {
        {}
      } else {
        stryCov_9fa48("124");
        throw new Error(stryMutAct_9fa48("125") ? "" : (stryCov_9fa48("125"), "trace.observations must be a non-empty array"));
      }
    }
    const observations = input.observations.map((value, index): CalibrationObservation => {
      if (stryMutAct_9fa48("126")) {
        {}
      } else {
        stryCov_9fa48("126");
        const observation = record(value, stryMutAct_9fa48("127") ? `` : (stryCov_9fa48("127"), `observations[${index}]`));
        const sequence = finite(observation.sequence, stryMutAct_9fa48("128") ? `` : (stryCov_9fa48("128"), `observations[${index}].sequence`));
        if (stryMutAct_9fa48("131") ? false : stryMutAct_9fa48("130") ? true : stryMutAct_9fa48("129") ? Number.isInteger(sequence) : (stryCov_9fa48("129", "130", "131"), !Number.isInteger(sequence))) throw new Error(stryMutAct_9fa48("132") ? `` : (stryCov_9fa48("132"), `observations[${index}].sequence must be an integer`));
        const payloadBytes = finite(observation.payloadBytes, stryMutAct_9fa48("133") ? `` : (stryCov_9fa48("133"), `observations[${index}].payloadBytes`), 1);
        if (stryMutAct_9fa48("136") ? false : stryMutAct_9fa48("135") ? true : stryMutAct_9fa48("134") ? Number.isInteger(payloadBytes) : (stryCov_9fa48("134", "135", "136"), !Number.isInteger(payloadBytes))) throw new Error(stryMutAct_9fa48("137") ? `` : (stryCov_9fa48("137"), `observations[${index}].payloadBytes must be an integer`));
        const sentAtMs = finite(observation.sentAtMs, stryMutAct_9fa48("138") ? `` : (stryCov_9fa48("138"), `observations[${index}].sentAtMs`));
        const receivedAtMs = (stryMutAct_9fa48("141") ? observation.receivedAtMs !== null : stryMutAct_9fa48("140") ? false : stryMutAct_9fa48("139") ? true : (stryCov_9fa48("139", "140", "141"), observation.receivedAtMs === null)) ? null : finite(observation.receivedAtMs, stryMutAct_9fa48("142") ? `` : (stryCov_9fa48("142"), `observations[${index}].receivedAtMs`), sentAtMs);
        return stryMutAct_9fa48("143") ? {} : (stryCov_9fa48("143"), {
          sequence,
          payloadBytes,
          sentAtMs,
          receivedAtMs
        });
      }
    });
    const sequences = new Set(observations.map(stryMutAct_9fa48("144") ? () => undefined : (stryCov_9fa48("144"), observation => observation.sequence)));
    if (stryMutAct_9fa48("147") ? sequences.size === observations.length : stryMutAct_9fa48("146") ? false : stryMutAct_9fa48("145") ? true : (stryCov_9fa48("145", "146", "147"), sequences.size !== observations.length)) throw new Error(stryMutAct_9fa48("148") ? "" : (stryCov_9fa48("148"), "observation sequence numbers must be unique"));
    return stryMutAct_9fa48("149") ? {} : (stryCov_9fa48("149"), {
      schemaVersion: 1,
      transport: input.transport,
      provenance: stryMutAct_9fa48("150") ? {} : (stryCov_9fa48("150"), {
        kind: provenance.kind,
        recordedAt,
        source: string(provenance.source, stryMutAct_9fa48("151") ? "" : (stryCov_9fa48("151"), "provenance.source")),
        hardware: strings(provenance.hardware, stryMutAct_9fa48("152") ? "" : (stryCov_9fa48("152"), "provenance.hardware")),
        software: strings(provenance.software, stryMutAct_9fa48("153") ? "" : (stryCov_9fa48("153"), "provenance.software")),
        environment: string(provenance.environment, stryMutAct_9fa48("154") ? "" : (stryCov_9fa48("154"), "provenance.environment"))
      }),
      radio: parseRadio(input.radio),
      observations: stryMutAct_9fa48("155") ? [...observations] : (stryCov_9fa48("155"), (stryMutAct_9fa48("156") ? [] : (stryCov_9fa48("156"), [...observations])).sort(stryMutAct_9fa48("157") ? () => undefined : (stryCov_9fa48("157"), (a, b) => stryMutAct_9fa48("158") ? a.sequence + b.sequence : (stryCov_9fa48("158"), a.sequence - b.sequence))))
    });
  }
}
export function parseCalibrationPolicy(value: unknown): CalibrationPolicy {
  if (stryMutAct_9fa48("159")) {
    {}
  } else {
    stryCov_9fa48("159");
    const input = record(value, stryMutAct_9fa48("160") ? "" : (stryCov_9fa48("160"), "policy"));
    if (stryMutAct_9fa48("163") ? input.schemaVersion === 1 : stryMutAct_9fa48("162") ? false : stryMutAct_9fa48("161") ? true : (stryCov_9fa48("161", "162", "163"), input.schemaVersion !== 1)) throw new Error(stryMutAct_9fa48("164") ? "" : (stryCov_9fa48("164"), "policy.schemaVersion must be 1"));
    const transports = record(input.transports, stryMutAct_9fa48("165") ? "" : (stryCov_9fa48("165"), "policy.transports"));
    const parseTolerance = (name: CalibratedTransportName): CalibrationTolerance => {
      if (stryMutAct_9fa48("166")) {
        {}
      } else {
        stryCov_9fa48("166");
        const tolerance = record(transports[name], stryMutAct_9fa48("167") ? `` : (stryCov_9fa48("167"), `policy.transports.${name}`));
        const minimumObservations = finite(tolerance.minimumObservations, stryMutAct_9fa48("168") ? `` : (stryCov_9fa48("168"), `${name}.minimumObservations`), 2);
        const minimumDistinctPayloadSizes = finite(tolerance.minimumDistinctPayloadSizes, stryMutAct_9fa48("169") ? `` : (stryCov_9fa48("169"), `${name}.minimumDistinctPayloadSizes`), 2);
        if (stryMutAct_9fa48("172") ? !Number.isInteger(minimumObservations) && !Number.isInteger(minimumDistinctPayloadSizes) : stryMutAct_9fa48("171") ? false : stryMutAct_9fa48("170") ? true : (stryCov_9fa48("170", "171", "172"), (stryMutAct_9fa48("173") ? Number.isInteger(minimumObservations) : (stryCov_9fa48("173"), !Number.isInteger(minimumObservations))) || (stryMutAct_9fa48("174") ? Number.isInteger(minimumDistinctPayloadSizes) : (stryCov_9fa48("174"), !Number.isInteger(minimumDistinctPayloadSizes))))) {
          if (stryMutAct_9fa48("175")) {
            {}
          } else {
            stryCov_9fa48("175");
            throw new Error(stryMutAct_9fa48("176") ? `` : (stryCov_9fa48("176"), `${name} minimum counts must be integers`));
          }
        }
        return stryMutAct_9fa48("177") ? {} : (stryCov_9fa48("177"), {
          minimumObservations,
          minimumDistinctPayloadSizes,
          bandwidthRelative: finite(tolerance.bandwidthRelative, stryMutAct_9fa48("178") ? `` : (stryCov_9fa48("178"), `${name}.bandwidthRelative`)),
          latencyMinRelative: finite(tolerance.latencyMinRelative, stryMutAct_9fa48("179") ? `` : (stryCov_9fa48("179"), `${name}.latencyMinRelative`)),
          latencyMaxRelative: finite(tolerance.latencyMaxRelative, stryMutAct_9fa48("180") ? `` : (stryCov_9fa48("180"), `${name}.latencyMaxRelative`)),
          lossRateAbsolute: finite(tolerance.lossRateAbsolute, stryMutAct_9fa48("181") ? `` : (stryCov_9fa48("181"), `${name}.lossRateAbsolute`))
        });
      }
    };
    return stryMutAct_9fa48("182") ? {} : (stryCov_9fa48("182"), {
      schemaVersion: 1,
      transports: stryMutAct_9fa48("183") ? {} : (stryCov_9fa48("183"), {
        ble: parseTolerance(stryMutAct_9fa48("184") ? "" : (stryCov_9fa48("184"), "ble")),
        lora: parseTolerance(stryMutAct_9fa48("185") ? "" : (stryCov_9fa48("185"), "lora"))
      })
    });
  }
}
function quantile(sorted: readonly number[], probability: number): number {
  if (stryMutAct_9fa48("186")) {
    {}
  } else {
    stryCov_9fa48("186");
    const index = stryMutAct_9fa48("187") ? Math.max(sorted.length - 1, Math.max(0, Math.ceil(probability * sorted.length) - 1)) : (stryCov_9fa48("187"), Math.min(stryMutAct_9fa48("188") ? sorted.length + 1 : (stryCov_9fa48("188"), sorted.length - 1), stryMutAct_9fa48("189") ? Math.min(0, Math.ceil(probability * sorted.length) - 1) : (stryCov_9fa48("189"), Math.max(0, stryMutAct_9fa48("190") ? Math.ceil(probability * sorted.length) + 1 : (stryCov_9fa48("190"), Math.ceil(stryMutAct_9fa48("191") ? probability / sorted.length : (stryCov_9fa48("191"), probability * sorted.length)) - 1)))));
    return sorted[index]!;
  }
}
function median(values: readonly number[]): number {
  if (stryMutAct_9fa48("192")) {
    {}
  } else {
    stryCov_9fa48("192");
    const sorted = stryMutAct_9fa48("193") ? [...values] : (stryCov_9fa48("193"), (stryMutAct_9fa48("194") ? [] : (stryCov_9fa48("194"), [...values])).sort(stryMutAct_9fa48("195") ? () => undefined : (stryCov_9fa48("195"), (a, b) => stryMutAct_9fa48("196") ? a + b : (stryCov_9fa48("196"), a - b))));
    const middle = Math.floor(stryMutAct_9fa48("197") ? sorted.length * 2 : (stryCov_9fa48("197"), sorted.length / 2));
    if (stryMutAct_9fa48("200") ? sorted.length % 2 !== 1 : stryMutAct_9fa48("199") ? false : stryMutAct_9fa48("198") ? true : (stryCov_9fa48("198", "199", "200"), (stryMutAct_9fa48("201") ? sorted.length * 2 : (stryCov_9fa48("201"), sorted.length % 2)) === 1)) return sorted[middle]!;
    return stryMutAct_9fa48("202") ? (sorted[middle - 1]! + sorted[middle]!) * 2 : (stryCov_9fa48("202"), (stryMutAct_9fa48("203") ? sorted[middle - 1]! - sorted[middle]! : (stryCov_9fa48("203"), sorted[stryMutAct_9fa48("204") ? middle + 1 : (stryCov_9fa48("204"), middle - 1)]! + sorted[middle]!)) / 2);
  }
}
function ratioError(actual: number, expected: number): number {
  if (stryMutAct_9fa48("205")) {
    {}
  } else {
    stryCov_9fa48("205");
    return stryMutAct_9fa48("206") ? Math.abs(actual - expected) * Math.max(Math.abs(expected), Number.EPSILON) : (stryCov_9fa48("206"), Math.abs(stryMutAct_9fa48("207") ? actual + expected : (stryCov_9fa48("207"), actual - expected)) / (stryMutAct_9fa48("208") ? Math.min(Math.abs(expected), Number.EPSILON) : (stryCov_9fa48("208"), Math.max(Math.abs(expected), Number.EPSILON))));
  }
}
function probability(numerator: number, denominator: number): number {
  if (stryMutAct_9fa48("209")) {
    {}
  } else {
    stryCov_9fa48("209");
    return (stryMutAct_9fa48("212") ? denominator !== 0 : stryMutAct_9fa48("211") ? false : stryMutAct_9fa48("210") ? true : (stryCov_9fa48("210", "211", "212"), denominator === 0)) ? 0 : stryMutAct_9fa48("213") ? numerator * denominator : (stryCov_9fa48("213"), numerator / denominator);
  }
}
export function calibrateTransportTrace(trace: CalibrationTrace, policy: CalibrationPolicy): CalibrationResult {
  if (stryMutAct_9fa48("214")) {
    {}
  } else {
    stryCov_9fa48("214");
    const tolerance = policy.transports[trace.transport];
    if (stryMutAct_9fa48("218") ? trace.observations.length >= tolerance.minimumObservations : stryMutAct_9fa48("217") ? trace.observations.length <= tolerance.minimumObservations : stryMutAct_9fa48("216") ? false : stryMutAct_9fa48("215") ? true : (stryCov_9fa48("215", "216", "217", "218"), trace.observations.length < tolerance.minimumObservations)) {
      if (stryMutAct_9fa48("219")) {
        {}
      } else {
        stryCov_9fa48("219");
        throw new Error(stryMutAct_9fa48("220") ? `` : (stryCov_9fa48("220"), `${trace.transport} trace requires at least ${tolerance.minimumObservations} observations`));
      }
    }
    const distinctPayloadSizes = new Set(trace.observations.map(stryMutAct_9fa48("221") ? () => undefined : (stryCov_9fa48("221"), item => item.payloadBytes))).size;
    if (stryMutAct_9fa48("225") ? distinctPayloadSizes >= tolerance.minimumDistinctPayloadSizes : stryMutAct_9fa48("224") ? distinctPayloadSizes <= tolerance.minimumDistinctPayloadSizes : stryMutAct_9fa48("223") ? false : stryMutAct_9fa48("222") ? true : (stryCov_9fa48("222", "223", "224", "225"), distinctPayloadSizes < tolerance.minimumDistinctPayloadSizes)) {
      if (stryMutAct_9fa48("226")) {
        {}
      } else {
        stryCov_9fa48("226");
        throw new Error(stryMutAct_9fa48("227") ? `` : (stryCov_9fa48("227"), `${trace.transport} trace requires at least ${tolerance.minimumDistinctPayloadSizes} payload sizes`));
      }
    }
    const delivered = stryMutAct_9fa48("228") ? trace.observations : (stryCov_9fa48("228"), trace.observations.filter(stryMutAct_9fa48("229") ? () => undefined : (stryCov_9fa48("229"), (item): item is CalibrationObservation & {
      readonly receivedAtMs: number;
    } => stryMutAct_9fa48("232") ? item.receivedAtMs === null : stryMutAct_9fa48("231") ? false : stryMutAct_9fa48("230") ? true : (stryCov_9fa48("230", "231", "232"), item.receivedAtMs !== null))));
    if (stryMutAct_9fa48("236") ? delivered.length >= 2 : stryMutAct_9fa48("235") ? delivered.length <= 2 : stryMutAct_9fa48("234") ? false : stryMutAct_9fa48("233") ? true : (stryCov_9fa48("233", "234", "235", "236"), delivered.length < 2)) throw new Error(stryMutAct_9fa48("237") ? `` : (stryCov_9fa48("237"), `${trace.transport} trace requires at least two delivered observations`));
    const points = delivered.map(stryMutAct_9fa48("238") ? () => undefined : (stryCov_9fa48("238"), item => stryMutAct_9fa48("239") ? {} : (stryCov_9fa48("239"), {
      x: stryMutAct_9fa48("240") ? item.payloadBytes / 8 : (stryCov_9fa48("240"), item.payloadBytes * 8),
      y: stryMutAct_9fa48("241") ? item.receivedAtMs + item.sentAtMs : (stryCov_9fa48("241"), item.receivedAtMs - item.sentAtMs)
    })));
    const durationBySize = new Map<number, number[]>();
    for (const point of points) {
      if (stryMutAct_9fa48("242")) {
        {}
      } else {
        stryCov_9fa48("242");
        const durations = stryMutAct_9fa48("243") ? durationBySize.get(point.x) && [] : (stryCov_9fa48("243"), durationBySize.get(point.x) ?? (stryMutAct_9fa48("244") ? ["Stryker was here"] : (stryCov_9fa48("244"), [])));
        durations.push(point.y);
        durationBySize.set(point.x, durations);
      }
    }
    const medians = stryMutAct_9fa48("245") ? [...durationBySize.entries()].map(([x, durations]) => ({
      x,
      y: median(durations)
    })) : (stryCov_9fa48("245"), (stryMutAct_9fa48("246") ? [] : (stryCov_9fa48("246"), [...durationBySize.entries()])).map(stryMutAct_9fa48("247") ? () => undefined : (stryCov_9fa48("247"), ([x, durations]) => stryMutAct_9fa48("248") ? {} : (stryCov_9fa48("248"), {
      x,
      y: median(durations)
    }))).sort(stryMutAct_9fa48("249") ? () => undefined : (stryCov_9fa48("249"), (a, b) => stryMutAct_9fa48("250") ? a.x + b.x : (stryCov_9fa48("250"), a.x - b.x))));
    const slopes: number[] = stryMutAct_9fa48("251") ? ["Stryker was here"] : (stryCov_9fa48("251"), []);
    for (let left = 0; stryMutAct_9fa48("254") ? left >= medians.length : stryMutAct_9fa48("253") ? left <= medians.length : stryMutAct_9fa48("252") ? false : (stryCov_9fa48("252", "253", "254"), left < medians.length); stryMutAct_9fa48("255") ? left -= 1 : (stryCov_9fa48("255"), left += 1)) {
      if (stryMutAct_9fa48("256")) {
        {}
      } else {
        stryCov_9fa48("256");
        for (let right = stryMutAct_9fa48("257") ? left - 1 : (stryCov_9fa48("257"), left + 1); stryMutAct_9fa48("260") ? right >= medians.length : stryMutAct_9fa48("259") ? right <= medians.length : stryMutAct_9fa48("258") ? false : (stryCov_9fa48("258", "259", "260"), right < medians.length); stryMutAct_9fa48("261") ? right -= 1 : (stryCov_9fa48("261"), right += 1)) {
          if (stryMutAct_9fa48("262")) {
            {}
          } else {
            stryCov_9fa48("262");
            const a = medians[left]!;
            const b = medians[right]!;
            slopes.push(stryMutAct_9fa48("263") ? (b.y - a.y) * (b.x - a.x) : (stryCov_9fa48("263"), (stryMutAct_9fa48("264") ? b.y + a.y : (stryCov_9fa48("264"), b.y - a.y)) / (stryMutAct_9fa48("265") ? b.x + a.x : (stryCov_9fa48("265"), b.x - a.x))));
          }
        }
      }
    }
    const slopeMsPerBit = median(slopes);
    if (stryMutAct_9fa48("269") ? slopeMsPerBit > 0 : stryMutAct_9fa48("268") ? slopeMsPerBit < 0 : stryMutAct_9fa48("267") ? false : stryMutAct_9fa48("266") ? true : (stryCov_9fa48("266", "267", "268", "269"), slopeMsPerBit <= 0)) throw new Error(stryMutAct_9fa48("270") ? `` : (stryCov_9fa48("270"), `${trace.transport} trace cannot identify a positive serialization rate`));
    const bandwidthBps = stryMutAct_9fa48("271") ? 1_000 * slopeMsPerBit : (stryCov_9fa48("271"), 1_000 / slopeMsPerBit);
    const residuals = stryMutAct_9fa48("272") ? points.map(point => Math.max(0, point.y - point.x * slopeMsPerBit)) : (stryCov_9fa48("272"), points.map(stryMutAct_9fa48("273") ? () => undefined : (stryCov_9fa48("273"), point => stryMutAct_9fa48("274") ? Math.min(0, point.y - point.x * slopeMsPerBit) : (stryCov_9fa48("274"), Math.max(0, stryMutAct_9fa48("275") ? point.y + point.x * slopeMsPerBit : (stryCov_9fa48("275"), point.y - (stryMutAct_9fa48("276") ? point.x / slopeMsPerBit : (stryCov_9fa48("276"), point.x * slopeMsPerBit))))))).sort(stryMutAct_9fa48("277") ? () => undefined : (stryCov_9fa48("277"), (a, b) => stryMutAct_9fa48("278") ? a + b : (stryCov_9fa48("278"), a - b))));
    let deliveredPrevious = 0;
    let lostPrevious = 0;
    let deliveredToLost = 0;
    let lostToDelivered = 0;
    for (let index = 1; stryMutAct_9fa48("281") ? index >= trace.observations.length : stryMutAct_9fa48("280") ? index <= trace.observations.length : stryMutAct_9fa48("279") ? false : (stryCov_9fa48("279", "280", "281"), index < trace.observations.length); stryMutAct_9fa48("282") ? index -= 1 : (stryCov_9fa48("282"), index += 1)) {
      if (stryMutAct_9fa48("283")) {
        {}
      } else {
        stryCov_9fa48("283");
        const previousDelivered = stryMutAct_9fa48("286") ? trace.observations[index - 1]!.receivedAtMs === null : stryMutAct_9fa48("285") ? false : stryMutAct_9fa48("284") ? true : (stryCov_9fa48("284", "285", "286"), trace.observations[stryMutAct_9fa48("287") ? index + 1 : (stryCov_9fa48("287"), index - 1)]!.receivedAtMs !== null);
        const currentDelivered = stryMutAct_9fa48("290") ? trace.observations[index]!.receivedAtMs === null : stryMutAct_9fa48("289") ? false : stryMutAct_9fa48("288") ? true : (stryCov_9fa48("288", "289", "290"), trace.observations[index]!.receivedAtMs !== null);
        if (stryMutAct_9fa48("292") ? false : stryMutAct_9fa48("291") ? true : (stryCov_9fa48("291", "292"), previousDelivered)) {
          if (stryMutAct_9fa48("293")) {
            {}
          } else {
            stryCov_9fa48("293");
            stryMutAct_9fa48("294") ? deliveredPrevious -= 1 : (stryCov_9fa48("294"), deliveredPrevious += 1);
            if (stryMutAct_9fa48("297") ? false : stryMutAct_9fa48("296") ? true : stryMutAct_9fa48("295") ? currentDelivered : (stryCov_9fa48("295", "296", "297"), !currentDelivered)) stryMutAct_9fa48("298") ? deliveredToLost -= 1 : (stryCov_9fa48("298"), deliveredToLost += 1);
          }
        } else {
          if (stryMutAct_9fa48("299")) {
            {}
          } else {
            stryCov_9fa48("299");
            stryMutAct_9fa48("300") ? lostPrevious -= 1 : (stryCov_9fa48("300"), lostPrevious += 1);
            if (stryMutAct_9fa48("302") ? false : stryMutAct_9fa48("301") ? true : (stryCov_9fa48("301", "302"), currentDelivered)) stryMutAct_9fa48("303") ? lostToDelivered -= 1 : (stryCov_9fa48("303"), lostToDelivered += 1);
          }
        }
      }
    }
    const lossRate = stryMutAct_9fa48("304") ? (trace.observations.length - delivered.length) * trace.observations.length : (stryCov_9fa48("304"), (stryMutAct_9fa48("305") ? trace.observations.length + delivered.length : (stryCov_9fa48("305"), trace.observations.length - delivered.length)) / trace.observations.length);
    const parameters: CalibratedParameters = stryMutAct_9fa48("306") ? {} : (stryCov_9fa48("306"), {
      bandwidthBps,
      latency: stryMutAct_9fa48("307") ? {} : (stryCov_9fa48("307"), {
        kind: stryMutAct_9fa48("308") ? "" : (stryCov_9fa48("308"), "uniform"),
        minMs: quantile(residuals, 0.05),
        maxMs: quantile(residuals, 0.95)
      }),
      lossRate,
      burstLoss: stryMutAct_9fa48("309") ? {} : (stryCov_9fa48("309"), {
        goodToBad: probability(deliveredToLost, deliveredPrevious),
        badToGood: probability(lostToDelivered, lostPrevious),
        goodLossRate: 0,
        badLossRate: 1
      })
    });
    const preset = transportClass(trace.transport);
    if (stryMutAct_9fa48("312") ? preset.latency.kind === "uniform" : stryMutAct_9fa48("311") ? false : stryMutAct_9fa48("310") ? true : (stryCov_9fa48("310", "311", "312"), preset.latency.kind !== (stryMutAct_9fa48("313") ? "" : (stryCov_9fa48("313"), "uniform")))) throw new Error(stryMutAct_9fa48("314") ? `` : (stryCov_9fa48("314"), `${trace.transport} preset latency must be uniform`));
    const errors = stryMutAct_9fa48("315") ? {} : (stryCov_9fa48("315"), {
      bandwidthRelative: ratioError(parameters.bandwidthBps, preset.bandwidthBps),
      latencyMinRelative: ratioError(parameters.latency.minMs, preset.latency.minMs),
      latencyMaxRelative: ratioError(parameters.latency.maxMs, preset.latency.maxMs),
      lossRateAbsolute: Math.abs(stryMutAct_9fa48("316") ? parameters.lossRate + preset.lossRate : (stryCov_9fa48("316"), parameters.lossRate - preset.lossRate))
    });
    return stryMutAct_9fa48("317") ? {} : (stryCov_9fa48("317"), {
      transport: trace.transport,
      observationCount: trace.observations.length,
      deliveredCount: delivered.length,
      distinctPayloadSizes,
      parameters,
      preset,
      comparison: stryMutAct_9fa48("318") ? {} : (stryCov_9fa48("318"), {
        withinTolerance: stryMutAct_9fa48("321") ? errors.bandwidthRelative <= tolerance.bandwidthRelative && errors.latencyMinRelative <= tolerance.latencyMinRelative && errors.latencyMaxRelative <= tolerance.latencyMaxRelative || errors.lossRateAbsolute <= tolerance.lossRateAbsolute : stryMutAct_9fa48("320") ? false : stryMutAct_9fa48("319") ? true : (stryCov_9fa48("319", "320", "321"), (stryMutAct_9fa48("323") ? errors.bandwidthRelative <= tolerance.bandwidthRelative && errors.latencyMinRelative <= tolerance.latencyMinRelative || errors.latencyMaxRelative <= tolerance.latencyMaxRelative : stryMutAct_9fa48("322") ? true : (stryCov_9fa48("322", "323"), (stryMutAct_9fa48("325") ? errors.bandwidthRelative <= tolerance.bandwidthRelative || errors.latencyMinRelative <= tolerance.latencyMinRelative : stryMutAct_9fa48("324") ? true : (stryCov_9fa48("324", "325"), (stryMutAct_9fa48("328") ? errors.bandwidthRelative > tolerance.bandwidthRelative : stryMutAct_9fa48("327") ? errors.bandwidthRelative < tolerance.bandwidthRelative : stryMutAct_9fa48("326") ? true : (stryCov_9fa48("326", "327", "328"), errors.bandwidthRelative <= tolerance.bandwidthRelative)) && (stryMutAct_9fa48("331") ? errors.latencyMinRelative > tolerance.latencyMinRelative : stryMutAct_9fa48("330") ? errors.latencyMinRelative < tolerance.latencyMinRelative : stryMutAct_9fa48("329") ? true : (stryCov_9fa48("329", "330", "331"), errors.latencyMinRelative <= tolerance.latencyMinRelative)))) && (stryMutAct_9fa48("334") ? errors.latencyMaxRelative > tolerance.latencyMaxRelative : stryMutAct_9fa48("333") ? errors.latencyMaxRelative < tolerance.latencyMaxRelative : stryMutAct_9fa48("332") ? true : (stryCov_9fa48("332", "333", "334"), errors.latencyMaxRelative <= tolerance.latencyMaxRelative)))) && (stryMutAct_9fa48("337") ? errors.lossRateAbsolute > tolerance.lossRateAbsolute : stryMutAct_9fa48("336") ? errors.lossRateAbsolute < tolerance.lossRateAbsolute : stryMutAct_9fa48("335") ? true : (stryCov_9fa48("335", "336", "337"), errors.lossRateAbsolute <= tolerance.lossRateAbsolute))),
        errors
      })
    });
  }
}