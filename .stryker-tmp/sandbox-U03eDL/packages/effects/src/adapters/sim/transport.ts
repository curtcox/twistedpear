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
import type { InstantMs, Intent, NodeId, TransportAdversaryAction } from "../../types.js";
import { sampleLatency, transportClass, type LinkConfig, type TransportClass } from "./transport-classes.js";
export interface DeliveryModel {
  /** Extra delay in ms applied to each send. */
  readonly latencyMs?: number;
  /** Drop probability in [0, 1]. Uses injected rng. */
  readonly lossRate?: number;
}
export interface SimTransportConfig {
  readonly delivery?: DeliveryModel;
  readonly links?: readonly LinkConfig[];
}
export interface TransportStats {
  readonly sent: number;
  readonly dropped: number;
  readonly partitioned: number;
  readonly dutyCycleDropped: number;
  readonly dutyCycleDelayed: number;
  /** Messages actually changed by mediated adversary actions (not merely requested actions). */
  readonly adversaryDropped: number;
  readonly adversaryDelayed: number;
  readonly adversaryReordered: number;
  readonly adversaryDuplicated: number;
  readonly adversaryInjected: number;
  readonly serializedBytes: number;
  readonly airtimeMs: number;
}
export class UnauthorizedAdversaryPowerError extends Error {
  constructor(actor: NodeId, action: TransportAdversaryAction) {
    if (stryMutAct_9fa48("1243")) {
      {}
    } else {
      stryCov_9fa48("1243");
      super(stryMutAct_9fa48("1244") ? `` : (stryCov_9fa48("1244"), `${actor} cannot ${action.power} link ${action.source}->${action.destination}`));
      this.name = stryMutAct_9fa48("1245") ? "" : (stryCov_9fa48("1245"), "UnauthorizedAdversaryPowerError");
    }
  }
}
export interface InFlightMessage {
  readonly deliverAt: InstantMs;
  readonly channel: string;
  readonly source: NodeId;
  readonly destination: NodeId;
  readonly payload: Uint8Array;
}

/**
 * In-memory multi-node transport with pluggable latency/loss.
 * Sends are intents; receives become events when the kernel advances time.
 */
export class SimTransport {
  private readonly queue: InFlightMessage[] = stryMutAct_9fa48("1246") ? ["Stryker was here"] : (stryCov_9fa48("1246"), []);
  private readonly occupiedUntil = new Map<string, InstantMs>();
  private readonly burstBad = new Map<string, boolean>();
  private sent = 0;
  private dropped = 0;
  private partitioned = 0;
  private dutyCycleDropped = 0;
  private dutyCycleDelayed = 0;
  private adversaryDropped = 0;
  private adversaryDelayed = 0;
  private adversaryReordered = 0;
  private adversaryDuplicated = 0;
  private adversaryInjected = 0;
  private serializedBytes = 0;
  private airtimeMs = 0;
  private seq = 0;
  private readonly config: SimTransportConfig;
  constructor(config: DeliveryModel | SimTransportConfig = {}, private readonly rng: () => number = stryMutAct_9fa48("1247") ? () => undefined : (stryCov_9fa48("1247"), () => 0)) {
    if (stryMutAct_9fa48("1248")) {
      {}
    } else {
      stryCov_9fa48("1248");
      this.config = (stryMutAct_9fa48("1251") ? "latencyMs" in config && "lossRate" in config : stryMutAct_9fa48("1250") ? false : stryMutAct_9fa48("1249") ? true : (stryCov_9fa48("1249", "1250", "1251"), (stryMutAct_9fa48("1252") ? "" : (stryCov_9fa48("1252"), "latencyMs")) in config || (stryMutAct_9fa48("1253") ? "" : (stryCov_9fa48("1253"), "lossRate")) in config)) ? stryMutAct_9fa48("1254") ? {} : (stryCov_9fa48("1254"), {
        delivery: config
      }) : config as SimTransportConfig;
    }
  }
  applySend(intent: Intent, source: NodeId, now: InstantMs): void {
    if (stryMutAct_9fa48("1255")) {
      {}
    } else {
      stryCov_9fa48("1255");
      if (stryMutAct_9fa48("1258") ? intent.kind === "transport/send" : stryMutAct_9fa48("1257") ? false : stryMutAct_9fa48("1256") ? true : (stryCov_9fa48("1256", "1257", "1258"), intent.kind !== (stryMutAct_9fa48("1259") ? "" : (stryCov_9fa48("1259"), "transport/send")))) {
        if (stryMutAct_9fa48("1260")) {
          {}
        } else {
          stryCov_9fa48("1260");
          return;
        }
      }
      stryMutAct_9fa48("1261") ? this.sent -= 1 : (stryCov_9fa48("1261"), this.sent += 1);
      stryMutAct_9fa48("1262") ? this.serializedBytes -= intent.send.payload.byteLength : (stryCov_9fa48("1262"), this.serializedBytes += intent.send.payload.byteLength);
      const destination = intent.send.destination as NodeId;
      const key = stryMutAct_9fa48("1263") ? `` : (stryCov_9fa48("1263"), `${source}\u0000${destination}`);
      const model = this.modelFor(source, destination);
      if (stryMutAct_9fa48("1266") ? model === undefined : stryMutAct_9fa48("1265") ? false : stryMutAct_9fa48("1264") ? true : (stryCov_9fa48("1264", "1265", "1266"), model !== undefined)) {
        if (stryMutAct_9fa48("1267")) {
          {}
        } else {
          stryCov_9fa48("1267");
          if (stryMutAct_9fa48("1271") ? model.partitions.some(window => now >= window.fromMs && now < window.toMs) : stryMutAct_9fa48("1270") ? model.partitions?.every(window => now >= window.fromMs && now < window.toMs) : stryMutAct_9fa48("1269") ? false : stryMutAct_9fa48("1268") ? true : (stryCov_9fa48("1268", "1269", "1270", "1271"), model.partitions?.some(stryMutAct_9fa48("1272") ? () => undefined : (stryCov_9fa48("1272"), window => stryMutAct_9fa48("1275") ? now >= window.fromMs || now < window.toMs : stryMutAct_9fa48("1274") ? false : stryMutAct_9fa48("1273") ? true : (stryCov_9fa48("1273", "1274", "1275"), (stryMutAct_9fa48("1278") ? now < window.fromMs : stryMutAct_9fa48("1277") ? now > window.fromMs : stryMutAct_9fa48("1276") ? true : (stryCov_9fa48("1276", "1277", "1278"), now >= window.fromMs)) && (stryMutAct_9fa48("1281") ? now >= window.toMs : stryMutAct_9fa48("1280") ? now <= window.toMs : stryMutAct_9fa48("1279") ? true : (stryCov_9fa48("1279", "1280", "1281"), now < window.toMs))))))) {
            if (stryMutAct_9fa48("1282")) {
              {}
            } else {
              stryCov_9fa48("1282");
              stryMutAct_9fa48("1283") ? this.partitioned -= 1 : (stryCov_9fa48("1283"), this.partitioned += 1);
              stryMutAct_9fa48("1284") ? this.dropped -= 1 : (stryCov_9fa48("1284"), this.dropped += 1);
              return;
            }
          }
          if (stryMutAct_9fa48("1286") ? false : stryMutAct_9fa48("1285") ? true : (stryCov_9fa48("1285", "1286"), this.shouldDropForLoss(key, model))) {
            if (stryMutAct_9fa48("1287")) {
              {}
            } else {
              stryCov_9fa48("1287");
              stryMutAct_9fa48("1288") ? this.dropped -= 1 : (stryCov_9fa48("1288"), this.dropped += 1);
              return;
            }
          }
        }
      } else {
        if (stryMutAct_9fa48("1289")) {
          {}
        } else {
          stryCov_9fa48("1289");
          const loss = stryMutAct_9fa48("1290") ? this.config.delivery?.lossRate && 0 : (stryCov_9fa48("1290"), (stryMutAct_9fa48("1291") ? this.config.delivery.lossRate : (stryCov_9fa48("1291"), this.config.delivery?.lossRate)) ?? 0);
          if (stryMutAct_9fa48("1294") ? loss > 0 || this.rng() < loss : stryMutAct_9fa48("1293") ? false : stryMutAct_9fa48("1292") ? true : (stryCov_9fa48("1292", "1293", "1294"), (stryMutAct_9fa48("1297") ? loss <= 0 : stryMutAct_9fa48("1296") ? loss >= 0 : stryMutAct_9fa48("1295") ? true : (stryCov_9fa48("1295", "1296", "1297"), loss > 0)) && (stryMutAct_9fa48("1300") ? this.rng() >= loss : stryMutAct_9fa48("1299") ? this.rng() <= loss : stryMutAct_9fa48("1298") ? true : (stryCov_9fa48("1298", "1299", "1300"), this.rng() < loss)))) {
            if (stryMutAct_9fa48("1301")) {
              {}
            } else {
              stryCov_9fa48("1301");
              stryMutAct_9fa48("1302") ? this.dropped -= 1 : (stryCov_9fa48("1302"), this.dropped += 1);
              return;
            }
          }
        }
      }
      const latency = (stryMutAct_9fa48("1305") ? model !== undefined : stryMutAct_9fa48("1304") ? false : stryMutAct_9fa48("1303") ? true : (stryCov_9fa48("1303", "1304", "1305"), model === undefined)) ? stryMutAct_9fa48("1306") ? this.config.delivery?.latencyMs && 0 : (stryCov_9fa48("1306"), (stryMutAct_9fa48("1307") ? this.config.delivery.latencyMs : (stryCov_9fa48("1307"), this.config.delivery?.latencyMs)) ?? 0) : sampleLatency(model.latency, this.rng);
      const airtime = (stryMutAct_9fa48("1310") ? model !== undefined : stryMutAct_9fa48("1309") ? false : stryMutAct_9fa48("1308") ? true : (stryCov_9fa48("1308", "1309", "1310"), model === undefined)) ? 0 : stryMutAct_9fa48("1311") ? intent.send.payload.byteLength * 8 * 1_000 * Math.max(1, model.bandwidthBps) : (stryCov_9fa48("1311"), (stryMutAct_9fa48("1312") ? intent.send.payload.byteLength * 8 / 1_000 : (stryCov_9fa48("1312"), (stryMutAct_9fa48("1313") ? intent.send.payload.byteLength / 8 : (stryCov_9fa48("1313"), intent.send.payload.byteLength * 8)) * 1_000)) / (stryMutAct_9fa48("1314") ? Math.min(1, model.bandwidthBps) : (stryCov_9fa48("1314"), Math.max(1, model.bandwidthBps))));
      let sendAt = stryMutAct_9fa48("1315") ? Math.min(now, this.occupiedUntil.get(key) ?? now) : (stryCov_9fa48("1315"), Math.max(now, stryMutAct_9fa48("1316") ? this.occupiedUntil.get(key) && now : (stryCov_9fa48("1316"), this.occupiedUntil.get(key) ?? now)));
      if (stryMutAct_9fa48("1319") ? model?.dutyCycle !== undefined && model.dutyCycle > 0 || model.dutyCycle < 1 : stryMutAct_9fa48("1318") ? false : stryMutAct_9fa48("1317") ? true : (stryCov_9fa48("1317", "1318", "1319"), (stryMutAct_9fa48("1321") ? model?.dutyCycle !== undefined || model.dutyCycle > 0 : stryMutAct_9fa48("1320") ? true : (stryCov_9fa48("1320", "1321"), (stryMutAct_9fa48("1323") ? model?.dutyCycle === undefined : stryMutAct_9fa48("1322") ? true : (stryCov_9fa48("1322", "1323"), (stryMutAct_9fa48("1324") ? model.dutyCycle : (stryCov_9fa48("1324"), model?.dutyCycle)) !== undefined)) && (stryMutAct_9fa48("1327") ? model.dutyCycle <= 0 : stryMutAct_9fa48("1326") ? model.dutyCycle >= 0 : stryMutAct_9fa48("1325") ? true : (stryCov_9fa48("1325", "1326", "1327"), model.dutyCycle > 0)))) && (stryMutAct_9fa48("1330") ? model.dutyCycle >= 1 : stryMutAct_9fa48("1329") ? model.dutyCycle <= 1 : stryMutAct_9fa48("1328") ? true : (stryCov_9fa48("1328", "1329", "1330"), model.dutyCycle < 1)))) {
        if (stryMutAct_9fa48("1331")) {
          {}
        } else {
          stryCov_9fa48("1331");
          const dutyReadyAt = stryMutAct_9fa48("1332") ? this.occupiedUntil.get(`${key}\u0000duty`) && now : (stryCov_9fa48("1332"), this.occupiedUntil.get(stryMutAct_9fa48("1333") ? `` : (stryCov_9fa48("1333"), `${key}\u0000duty`)) ?? now);
          if (stryMutAct_9fa48("1337") ? dutyReadyAt <= sendAt : stryMutAct_9fa48("1336") ? dutyReadyAt >= sendAt : stryMutAct_9fa48("1335") ? false : stryMutAct_9fa48("1334") ? true : (stryCov_9fa48("1334", "1335", "1336", "1337"), dutyReadyAt > sendAt)) {
            if (stryMutAct_9fa48("1338")) {
              {}
            } else {
              stryCov_9fa48("1338");
              if (stryMutAct_9fa48("1341") ? model.dutyCyclePolicy !== "drop" : stryMutAct_9fa48("1340") ? false : stryMutAct_9fa48("1339") ? true : (stryCov_9fa48("1339", "1340", "1341"), model.dutyCyclePolicy === (stryMutAct_9fa48("1342") ? "" : (stryCov_9fa48("1342"), "drop")))) {
                if (stryMutAct_9fa48("1343")) {
                  {}
                } else {
                  stryCov_9fa48("1343");
                  stryMutAct_9fa48("1344") ? this.dutyCycleDropped -= 1 : (stryCov_9fa48("1344"), this.dutyCycleDropped += 1);
                  stryMutAct_9fa48("1345") ? this.dropped -= 1 : (stryCov_9fa48("1345"), this.dropped += 1);
                  return;
                }
              }
              stryMutAct_9fa48("1346") ? this.dutyCycleDelayed -= 1 : (stryCov_9fa48("1346"), this.dutyCycleDelayed += 1);
              sendAt = dutyReadyAt;
            }
          }
          this.occupiedUntil.set(stryMutAct_9fa48("1347") ? `` : (stryCov_9fa48("1347"), `${key}\u0000duty`), stryMutAct_9fa48("1348") ? sendAt - airtime / model.dutyCycle : (stryCov_9fa48("1348"), sendAt + (stryMutAct_9fa48("1349") ? airtime * model.dutyCycle : (stryCov_9fa48("1349"), airtime / model.dutyCycle))));
        }
      }
      stryMutAct_9fa48("1350") ? this.airtimeMs -= airtime : (stryCov_9fa48("1350"), this.airtimeMs += airtime);
      this.occupiedUntil.set(key, stryMutAct_9fa48("1351") ? sendAt - airtime : (stryCov_9fa48("1351"), sendAt + airtime));
      this.queue.push(stryMutAct_9fa48("1352") ? {} : (stryCov_9fa48("1352"), {
        deliverAt: stryMutAct_9fa48("1353") ? sendAt + airtime - latency : (stryCov_9fa48("1353"), (stryMutAct_9fa48("1354") ? sendAt - airtime : (stryCov_9fa48("1354"), sendAt + airtime)) + latency),
        channel: intent.send.channel,
        source,
        destination,
        payload: stryMutAct_9fa48("1355") ? intent.send.payload : (stryCov_9fa48("1355"), intent.send.payload.slice())
      }));
      stryMutAct_9fa48("1356") ? this.seq -= 1 : (stryCov_9fa48("1356"), this.seq += 1);
    }
  }
  applyAdversary(action: TransportAdversaryAction, actor: NodeId, now: InstantMs): void {
    if (stryMutAct_9fa48("1357")) {
      {}
    } else {
      stryCov_9fa48("1357");
      const link = stryMutAct_9fa48("1358") ? this.config.links.find(candidate => candidate.source === action.source && candidate.destination === action.destination) : (stryCov_9fa48("1358"), this.config.links?.find(stryMutAct_9fa48("1359") ? () => undefined : (stryCov_9fa48("1359"), candidate => stryMutAct_9fa48("1362") ? candidate.source === action.source || candidate.destination === action.destination : stryMutAct_9fa48("1361") ? false : stryMutAct_9fa48("1360") ? true : (stryCov_9fa48("1360", "1361", "1362"), (stryMutAct_9fa48("1364") ? candidate.source !== action.source : stryMutAct_9fa48("1363") ? true : (stryCov_9fa48("1363", "1364"), candidate.source === action.source)) && (stryMutAct_9fa48("1366") ? candidate.destination !== action.destination : stryMutAct_9fa48("1365") ? true : (stryCov_9fa48("1365", "1366"), candidate.destination === action.destination))))));
      if (stryMutAct_9fa48("1369") ? link?.adversary !== actor && !link.powers?.includes(action.power) : stryMutAct_9fa48("1368") ? false : stryMutAct_9fa48("1367") ? true : (stryCov_9fa48("1367", "1368", "1369"), (stryMutAct_9fa48("1371") ? link?.adversary === actor : stryMutAct_9fa48("1370") ? false : (stryCov_9fa48("1370", "1371"), (stryMutAct_9fa48("1372") ? link.adversary : (stryCov_9fa48("1372"), link?.adversary)) !== actor)) || (stryMutAct_9fa48("1373") ? link.powers?.includes(action.power) : (stryCov_9fa48("1373"), !(stryMutAct_9fa48("1374") ? link.powers.includes(action.power) : (stryCov_9fa48("1374"), link.powers?.includes(action.power))))))) {
        if (stryMutAct_9fa48("1375")) {
          {}
        } else {
          stryCov_9fa48("1375");
          throw new UnauthorizedAdversaryPowerError(actor, action);
        }
      }
      const matches = stryMutAct_9fa48("1376") ? () => undefined : (stryCov_9fa48("1376"), (() => {
        const matches = (message: InFlightMessage) => stryMutAct_9fa48("1379") ? message.source === action.source || message.destination === action.destination : stryMutAct_9fa48("1378") ? false : stryMutAct_9fa48("1377") ? true : (stryCov_9fa48("1377", "1378", "1379"), (stryMutAct_9fa48("1381") ? message.source !== action.source : stryMutAct_9fa48("1380") ? true : (stryCov_9fa48("1380", "1381"), message.source === action.source)) && (stryMutAct_9fa48("1383") ? message.destination !== action.destination : stryMutAct_9fa48("1382") ? true : (stryCov_9fa48("1382", "1383"), message.destination === action.destination)));
        return matches;
      })());
      if (stryMutAct_9fa48("1386") ? action.power !== "drop" : stryMutAct_9fa48("1385") ? false : stryMutAct_9fa48("1384") ? true : (stryCov_9fa48("1384", "1385", "1386"), action.power === (stryMutAct_9fa48("1387") ? "" : (stryCov_9fa48("1387"), "drop")))) {
        if (stryMutAct_9fa48("1388")) {
          {}
        } else {
          stryCov_9fa48("1388");
          const kept = stryMutAct_9fa48("1389") ? this.queue : (stryCov_9fa48("1389"), this.queue.filter(stryMutAct_9fa48("1390") ? () => undefined : (stryCov_9fa48("1390"), message => stryMutAct_9fa48("1391") ? matches(message) : (stryCov_9fa48("1391"), !matches(message)))));
          const affected = stryMutAct_9fa48("1392") ? this.queue.length + kept.length : (stryCov_9fa48("1392"), this.queue.length - kept.length);
          stryMutAct_9fa48("1393") ? this.dropped -= affected : (stryCov_9fa48("1393"), this.dropped += affected);
          stryMutAct_9fa48("1394") ? this.adversaryDropped -= affected : (stryCov_9fa48("1394"), this.adversaryDropped += affected);
          this.queue.length = 0;
          this.queue.push(...kept);
          return;
        }
      }
      if (stryMutAct_9fa48("1397") ? action.power !== "delay" : stryMutAct_9fa48("1396") ? false : stryMutAct_9fa48("1395") ? true : (stryCov_9fa48("1395", "1396", "1397"), action.power === (stryMutAct_9fa48("1398") ? "" : (stryCov_9fa48("1398"), "delay")))) {
        if (stryMutAct_9fa48("1399")) {
          {}
        } else {
          stryCov_9fa48("1399");
          stryMutAct_9fa48("1400") ? this.adversaryDelayed -= this.queue.filter(matches).length : (stryCov_9fa48("1400"), this.adversaryDelayed += stryMutAct_9fa48("1401") ? this.queue.length : (stryCov_9fa48("1401"), this.queue.filter(matches).length));
          const delay = stryMutAct_9fa48("1402") ? Math.min(0, action.delayMs) : (stryCov_9fa48("1402"), Math.max(0, action.delayMs));
          const delayed = this.queue.map(stryMutAct_9fa48("1403") ? () => undefined : (stryCov_9fa48("1403"), message => matches(message) ? stryMutAct_9fa48("1404") ? {} : (stryCov_9fa48("1404"), {
            ...message,
            deliverAt: stryMutAct_9fa48("1405") ? message.deliverAt - delay : (stryCov_9fa48("1405"), message.deliverAt + delay)
          }) : message));
          this.queue.length = 0;
          this.queue.push(...delayed);
          return;
        }
      }
      if (stryMutAct_9fa48("1408") ? action.power !== "reorder" : stryMutAct_9fa48("1407") ? false : stryMutAct_9fa48("1406") ? true : (stryCov_9fa48("1406", "1407", "1408"), action.power === (stryMutAct_9fa48("1409") ? "" : (stryCov_9fa48("1409"), "reorder")))) {
        if (stryMutAct_9fa48("1410")) {
          {}
        } else {
          stryCov_9fa48("1410");
          const indexes = stryMutAct_9fa48("1411") ? this.queue.map((message, index) => matches(message) ? index : -1) : (stryCov_9fa48("1411"), this.queue.map(stryMutAct_9fa48("1412") ? () => undefined : (stryCov_9fa48("1412"), (message, index) => matches(message) ? index : stryMutAct_9fa48("1413") ? +1 : (stryCov_9fa48("1413"), -1))).filter(stryMutAct_9fa48("1414") ? () => undefined : (stryCov_9fa48("1414"), index => stryMutAct_9fa48("1418") ? index < 0 : stryMutAct_9fa48("1417") ? index > 0 : stryMutAct_9fa48("1416") ? false : stryMutAct_9fa48("1415") ? true : (stryCov_9fa48("1415", "1416", "1417", "1418"), index >= 0))));
          stryMutAct_9fa48("1419") ? this.adversaryReordered -= indexes.length : (stryCov_9fa48("1419"), this.adversaryReordered += indexes.length);
          const deliverySlots = stryMutAct_9fa48("1420") ? indexes.map(index => this.queue[index]!.deliverAt) : (stryCov_9fa48("1420"), indexes.map(stryMutAct_9fa48("1421") ? () => undefined : (stryCov_9fa48("1421"), index => this.queue[index]!.deliverAt)).reverse());
          indexes.forEach((index, offset) => {
            if (stryMutAct_9fa48("1422")) {
              {}
            } else {
              stryCov_9fa48("1422");
              this.queue[index] = stryMutAct_9fa48("1423") ? {} : (stryCov_9fa48("1423"), {
                ...this.queue[index]!,
                deliverAt: deliverySlots[offset]!
              });
            }
          });
          return;
        }
      }
      if (stryMutAct_9fa48("1426") ? action.power !== "duplicate" : stryMutAct_9fa48("1425") ? false : stryMutAct_9fa48("1424") ? true : (stryCov_9fa48("1424", "1425", "1426"), action.power === (stryMutAct_9fa48("1427") ? "" : (stryCov_9fa48("1427"), "duplicate")))) {
        if (stryMutAct_9fa48("1428")) {
          {}
        } else {
          stryCov_9fa48("1428");
          const copies = stryMutAct_9fa48("1429") ? this.queue.map(message => ({
            ...message,
            payload: message.payload.slice()
          })) : (stryCov_9fa48("1429"), this.queue.filter(matches).map(stryMutAct_9fa48("1430") ? () => undefined : (stryCov_9fa48("1430"), message => stryMutAct_9fa48("1431") ? {} : (stryCov_9fa48("1431"), {
            ...message,
            payload: stryMutAct_9fa48("1432") ? message.payload : (stryCov_9fa48("1432"), message.payload.slice())
          }))));
          stryMutAct_9fa48("1433") ? this.adversaryDuplicated -= copies.length : (stryCov_9fa48("1433"), this.adversaryDuplicated += copies.length);
          this.queue.push(...copies);
          return;
        }
      }
      stryMutAct_9fa48("1434") ? this.adversaryInjected -= 1 : (stryCov_9fa48("1434"), this.adversaryInjected += 1);
      this.queue.push(stryMutAct_9fa48("1435") ? {} : (stryCov_9fa48("1435"), {
        deliverAt: stryMutAct_9fa48("1436") ? now - Math.max(0, action.delayMs ?? 0) : (stryCov_9fa48("1436"), now + (stryMutAct_9fa48("1437") ? Math.min(0, action.delayMs ?? 0) : (stryCov_9fa48("1437"), Math.max(0, stryMutAct_9fa48("1438") ? action.delayMs && 0 : (stryCov_9fa48("1438"), action.delayMs ?? 0))))),
        channel: action.channel,
        source: action.source,
        destination: action.destination,
        payload: stryMutAct_9fa48("1439") ? action.payload : (stryCov_9fa48("1439"), action.payload.slice())
      }));
    }
  }
  nextDeliverAt(): InstantMs | undefined {
    if (stryMutAct_9fa48("1440")) {
      {}
    } else {
      stryCov_9fa48("1440");
      let soonest: InstantMs | undefined;
      for (const msg of this.queue) {
        if (stryMutAct_9fa48("1441")) {
          {}
        } else {
          stryCov_9fa48("1441");
          if (stryMutAct_9fa48("1444") ? soonest === undefined && msg.deliverAt < soonest : stryMutAct_9fa48("1443") ? false : stryMutAct_9fa48("1442") ? true : (stryCov_9fa48("1442", "1443", "1444"), (stryMutAct_9fa48("1446") ? soonest !== undefined : stryMutAct_9fa48("1445") ? false : (stryCov_9fa48("1445", "1446"), soonest === undefined)) || (stryMutAct_9fa48("1449") ? msg.deliverAt >= soonest : stryMutAct_9fa48("1448") ? msg.deliverAt <= soonest : stryMutAct_9fa48("1447") ? false : (stryCov_9fa48("1447", "1448", "1449"), msg.deliverAt < soonest)))) {
            if (stryMutAct_9fa48("1450")) {
              {}
            } else {
              stryCov_9fa48("1450");
              soonest = msg.deliverAt;
            }
          }
        }
      }
      return soonest;
    }
  }
  deliverDue(at: InstantMs): InFlightMessage[] {
    if (stryMutAct_9fa48("1451")) {
      {}
    } else {
      stryCov_9fa48("1451");
      const due: InFlightMessage[] = stryMutAct_9fa48("1452") ? ["Stryker was here"] : (stryCov_9fa48("1452"), []);
      const rest: InFlightMessage[] = stryMutAct_9fa48("1453") ? ["Stryker was here"] : (stryCov_9fa48("1453"), []);
      for (const msg of this.queue) {
        if (stryMutAct_9fa48("1454")) {
          {}
        } else {
          stryCov_9fa48("1454");
          if (stryMutAct_9fa48("1458") ? msg.deliverAt > at : stryMutAct_9fa48("1457") ? msg.deliverAt < at : stryMutAct_9fa48("1456") ? false : stryMutAct_9fa48("1455") ? true : (stryCov_9fa48("1455", "1456", "1457", "1458"), msg.deliverAt <= at)) {
            if (stryMutAct_9fa48("1459")) {
              {}
            } else {
              stryCov_9fa48("1459");
              const model = this.modelFor(msg.source, msg.destination);
              if (stryMutAct_9fa48("1464") ? model.partitions?.some(window => at >= window.fromMs && at < window.toMs) : stryMutAct_9fa48("1463") ? model?.partitions.some(window => at >= window.fromMs && at < window.toMs) : stryMutAct_9fa48("1462") ? model?.partitions?.every(window => at >= window.fromMs && at < window.toMs) : stryMutAct_9fa48("1461") ? false : stryMutAct_9fa48("1460") ? true : (stryCov_9fa48("1460", "1461", "1462", "1463", "1464"), model?.partitions?.some(stryMutAct_9fa48("1465") ? () => undefined : (stryCov_9fa48("1465"), window => stryMutAct_9fa48("1468") ? at >= window.fromMs || at < window.toMs : stryMutAct_9fa48("1467") ? false : stryMutAct_9fa48("1466") ? true : (stryCov_9fa48("1466", "1467", "1468"), (stryMutAct_9fa48("1471") ? at < window.fromMs : stryMutAct_9fa48("1470") ? at > window.fromMs : stryMutAct_9fa48("1469") ? true : (stryCov_9fa48("1469", "1470", "1471"), at >= window.fromMs)) && (stryMutAct_9fa48("1474") ? at >= window.toMs : stryMutAct_9fa48("1473") ? at <= window.toMs : stryMutAct_9fa48("1472") ? true : (stryCov_9fa48("1472", "1473", "1474"), at < window.toMs))))))) {
                if (stryMutAct_9fa48("1475")) {
                  {}
                } else {
                  stryCov_9fa48("1475");
                  stryMutAct_9fa48("1476") ? this.partitioned -= 1 : (stryCov_9fa48("1476"), this.partitioned += 1);
                  stryMutAct_9fa48("1477") ? this.dropped -= 1 : (stryCov_9fa48("1477"), this.dropped += 1);
                }
              } else {
                if (stryMutAct_9fa48("1478")) {
                  {}
                } else {
                  stryCov_9fa48("1478");
                  due.push(msg);
                }
              }
            }
          } else {
            if (stryMutAct_9fa48("1479")) {
              {}
            } else {
              stryCov_9fa48("1479");
              rest.push(msg);
            }
          }
        }
      }
      this.queue.length = 0;
      this.queue.push(...rest);
      stryMutAct_9fa48("1480") ? due : (stryCov_9fa48("1480"), due.sort((a, b) => {
        if (stryMutAct_9fa48("1481")) {
          {}
        } else {
          stryCov_9fa48("1481");
          if (stryMutAct_9fa48("1484") ? a.deliverAt === b.deliverAt : stryMutAct_9fa48("1483") ? false : stryMutAct_9fa48("1482") ? true : (stryCov_9fa48("1482", "1483", "1484"), a.deliverAt !== b.deliverAt)) return stryMutAct_9fa48("1485") ? a.deliverAt + b.deliverAt : (stryCov_9fa48("1485"), a.deliverAt - b.deliverAt);
          if (stryMutAct_9fa48("1488") ? a.source === b.source : stryMutAct_9fa48("1487") ? false : stryMutAct_9fa48("1486") ? true : (stryCov_9fa48("1486", "1487", "1488"), a.source !== b.source)) return (stryMutAct_9fa48("1492") ? a.source >= b.source : stryMutAct_9fa48("1491") ? a.source <= b.source : stryMutAct_9fa48("1490") ? false : stryMutAct_9fa48("1489") ? true : (stryCov_9fa48("1489", "1490", "1491", "1492"), a.source < b.source)) ? stryMutAct_9fa48("1493") ? +1 : (stryCov_9fa48("1493"), -1) : 1;
          if (stryMutAct_9fa48("1496") ? a.destination === b.destination : stryMutAct_9fa48("1495") ? false : stryMutAct_9fa48("1494") ? true : (stryCov_9fa48("1494", "1495", "1496"), a.destination !== b.destination)) {
            if (stryMutAct_9fa48("1497")) {
              {}
            } else {
              stryCov_9fa48("1497");
              return (stryMutAct_9fa48("1501") ? a.destination >= b.destination : stryMutAct_9fa48("1500") ? a.destination <= b.destination : stryMutAct_9fa48("1499") ? false : stryMutAct_9fa48("1498") ? true : (stryCov_9fa48("1498", "1499", "1500", "1501"), a.destination < b.destination)) ? stryMutAct_9fa48("1502") ? +1 : (stryCov_9fa48("1502"), -1) : 1;
            }
          }
          return 0;
        }
      }));
      return due;
    }
  }
  get inFlight(): number {
    if (stryMutAct_9fa48("1503")) {
      {}
    } else {
      stryCov_9fa48("1503");
      return this.queue.length;
    }
  }
  get sequence(): number {
    if (stryMutAct_9fa48("1504")) {
      {}
    } else {
      stryCov_9fa48("1504");
      return this.seq;
    }
  }
  getStats(): TransportStats {
    if (stryMutAct_9fa48("1505")) {
      {}
    } else {
      stryCov_9fa48("1505");
      return stryMutAct_9fa48("1506") ? {} : (stryCov_9fa48("1506"), {
        sent: this.sent,
        dropped: this.dropped,
        partitioned: this.partitioned,
        dutyCycleDropped: this.dutyCycleDropped,
        dutyCycleDelayed: this.dutyCycleDelayed,
        adversaryDropped: this.adversaryDropped,
        adversaryDelayed: this.adversaryDelayed,
        adversaryReordered: this.adversaryReordered,
        adversaryDuplicated: this.adversaryDuplicated,
        adversaryInjected: this.adversaryInjected,
        serializedBytes: this.serializedBytes,
        airtimeMs: this.airtimeMs
      });
    }
  }
  private modelFor(source: NodeId, destination: NodeId): TransportClass | undefined {
    if (stryMutAct_9fa48("1507")) {
      {}
    } else {
      stryCov_9fa48("1507");
      const link = stryMutAct_9fa48("1508") ? this.config.links.find(candidate => candidate.source === source && candidate.destination === destination) : (stryCov_9fa48("1508"), this.config.links?.find(stryMutAct_9fa48("1509") ? () => undefined : (stryCov_9fa48("1509"), candidate => stryMutAct_9fa48("1512") ? candidate.source === source || candidate.destination === destination : stryMutAct_9fa48("1511") ? false : stryMutAct_9fa48("1510") ? true : (stryCov_9fa48("1510", "1511", "1512"), (stryMutAct_9fa48("1514") ? candidate.source !== source : stryMutAct_9fa48("1513") ? true : (stryCov_9fa48("1513", "1514"), candidate.source === source)) && (stryMutAct_9fa48("1516") ? candidate.destination !== destination : stryMutAct_9fa48("1515") ? true : (stryCov_9fa48("1515", "1516"), candidate.destination === destination))))));
      return (stryMutAct_9fa48("1519") ? link !== undefined : stryMutAct_9fa48("1518") ? false : stryMutAct_9fa48("1517") ? true : (stryCov_9fa48("1517", "1518", "1519"), link === undefined)) ? undefined : transportClass(link.class, link.params);
    }
  }
  private shouldDropForLoss(key: string, model: TransportClass): boolean {
    if (stryMutAct_9fa48("1520")) {
      {}
    } else {
      stryCov_9fa48("1520");
      let lossRate = model.lossRate;
      const burst = model.burstLoss;
      if (stryMutAct_9fa48("1523") ? burst === undefined : stryMutAct_9fa48("1522") ? false : stryMutAct_9fa48("1521") ? true : (stryCov_9fa48("1521", "1522", "1523"), burst !== undefined)) {
        if (stryMutAct_9fa48("1524")) {
          {}
        } else {
          stryCov_9fa48("1524");
          const bad = stryMutAct_9fa48("1525") ? this.burstBad.get(key) && false : (stryCov_9fa48("1525"), this.burstBad.get(key) ?? (stryMutAct_9fa48("1526") ? true : (stryCov_9fa48("1526"), false)));
          lossRate = bad ? burst.badLossRate : burst.goodLossRate;
          const changes = this.rng();
          this.burstBad.set(key, bad ? stryMutAct_9fa48("1530") ? changes < burst.badToGood : stryMutAct_9fa48("1529") ? changes > burst.badToGood : stryMutAct_9fa48("1528") ? false : stryMutAct_9fa48("1527") ? true : (stryCov_9fa48("1527", "1528", "1529", "1530"), changes >= burst.badToGood) : stryMutAct_9fa48("1534") ? changes >= burst.goodToBad : stryMutAct_9fa48("1533") ? changes <= burst.goodToBad : stryMutAct_9fa48("1532") ? false : stryMutAct_9fa48("1531") ? true : (stryCov_9fa48("1531", "1532", "1533", "1534"), changes < burst.goodToBad));
        }
      }
      return stryMutAct_9fa48("1537") ? lossRate > 0 || this.rng() < lossRate : stryMutAct_9fa48("1536") ? false : stryMutAct_9fa48("1535") ? true : (stryCov_9fa48("1535", "1536", "1537"), (stryMutAct_9fa48("1540") ? lossRate <= 0 : stryMutAct_9fa48("1539") ? lossRate >= 0 : stryMutAct_9fa48("1538") ? true : (stryCov_9fa48("1538", "1539", "1540"), lossRate > 0)) && (stryMutAct_9fa48("1543") ? this.rng() >= lossRate : stryMutAct_9fa48("1542") ? this.rng() <= lossRate : stryMutAct_9fa48("1541") ? true : (stryCov_9fa48("1541", "1542", "1543"), this.rng() < lossRate)));
    }
  }
}