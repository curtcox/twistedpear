/**
 * Driver-boundary actuator safety caps (Sans-IO). Hosts enforce these before
 * any hardware write so apps cannot reach unsafe strobe/duty/volume settings.
 */
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
import { assertAidAllowed, NfcPaymentAidError } from "./device-nfc-apdu.js";

/** Photosensitive-epilepsy guidance: forbid controllable flashing in 3–60 Hz. */
export const TORCH_MIN_STROBE_INTERVAL_MS = 334; // < 3 Hz
export const TORCH_MAX_DUTY_CYCLE = 0.5;
export const HAPTICS_MAX_DUTY_CYCLE = 0.25;
export const HAPTICS_MAX_PATTERN_MS = 2_000;
export const TTS_MAX_TEXT_LENGTH = 500;
export const TTS_MAX_RATE = 1.5;
export const TTS_MIN_RATE = 0.5;
export const SPEAKER_MAX_VOLUME = 1;
/** Play tier must stay in the audible band — ultrasonic carriers need speaker:pcm. */
export const SPEAKER_PLAY_MAX_HZ = 18_000;
export const NFC_MAX_NDEF_BYTES = 4_096;
export type ActuatorSafetyCode = "TORCH_STROBE_RATE" | "TORCH_DUTY_CYCLE" | "HAPTICS_DUTY_CYCLE" | "HAPTICS_PATTERN" | "TTS_TEXT" | "TTS_RATE" | "SPEAKER_VOLUME" | "SPEAKER_ULTRASONIC" | "NFC_PAYLOAD" | "COMMAND_INVALID";
export class ActuatorSafetyError extends Error {
  constructor(readonly code: ActuatorSafetyCode, message: string) {
    super(message);
    this.name = stryMutAct_9fa48("6824") ? "" : (stryCov_9fa48("6824"), "ActuatorSafetyError");
  }
}
export type DeviceCommand = {
  readonly kind: "torch";
  readonly on: boolean;
  readonly strobeIntervalMs?: number;
} | {
  readonly kind: "speaker";
  readonly assetId?: string;
  readonly volume?: number;
  readonly frequencyHz?: number;
} | {
  readonly kind: "tts";
  readonly text: string;
  readonly rate?: number;
} | {
  readonly kind: "haptics";
  readonly patternMs: ReadonlyArray<number>;
  readonly intensity?: number;
} | {
  readonly kind: "nfc";
  readonly action: "write";
  readonly ndef: string;
} | {
  readonly kind: "nfc";
  readonly action: "apdu";
  readonly aid: string;
  readonly apdu: string;
};
export interface ActuatorCommandResult {
  readonly kind: DeviceCommand["kind"];
  readonly accepted: true;
  readonly normalized: DeviceCommand;
}
export function validateActuatorCommand(command: DeviceCommand): ActuatorCommandResult {
  if (stryMutAct_9fa48("6825")) {
    {}
  } else {
    stryCov_9fa48("6825");
    switch (command.kind) {
      case stryMutAct_9fa48("6827") ? "" : (stryCov_9fa48("6827"), "torch"):
        if (stryMutAct_9fa48("6826")) {} else {
          stryCov_9fa48("6826");
          return stryMutAct_9fa48("6828") ? {} : (stryCov_9fa48("6828"), {
            kind: stryMutAct_9fa48("6829") ? "" : (stryCov_9fa48("6829"), "torch"),
            accepted: stryMutAct_9fa48("6830") ? false : (stryCov_9fa48("6830"), true),
            normalized: validateTorch(command)
          });
        }
      case stryMutAct_9fa48("6832") ? "" : (stryCov_9fa48("6832"), "speaker"):
        if (stryMutAct_9fa48("6831")) {} else {
          stryCov_9fa48("6831");
          return stryMutAct_9fa48("6833") ? {} : (stryCov_9fa48("6833"), {
            kind: stryMutAct_9fa48("6834") ? "" : (stryCov_9fa48("6834"), "speaker"),
            accepted: stryMutAct_9fa48("6835") ? false : (stryCov_9fa48("6835"), true),
            normalized: validateSpeaker(command)
          });
        }
      case stryMutAct_9fa48("6837") ? "" : (stryCov_9fa48("6837"), "tts"):
        if (stryMutAct_9fa48("6836")) {} else {
          stryCov_9fa48("6836");
          return stryMutAct_9fa48("6838") ? {} : (stryCov_9fa48("6838"), {
            kind: stryMutAct_9fa48("6839") ? "" : (stryCov_9fa48("6839"), "tts"),
            accepted: stryMutAct_9fa48("6840") ? false : (stryCov_9fa48("6840"), true),
            normalized: validateTts(command)
          });
        }
      case stryMutAct_9fa48("6842") ? "" : (stryCov_9fa48("6842"), "haptics"):
        if (stryMutAct_9fa48("6841")) {} else {
          stryCov_9fa48("6841");
          return stryMutAct_9fa48("6843") ? {} : (stryCov_9fa48("6843"), {
            kind: stryMutAct_9fa48("6844") ? "" : (stryCov_9fa48("6844"), "haptics"),
            accepted: stryMutAct_9fa48("6845") ? false : (stryCov_9fa48("6845"), true),
            normalized: validateHaptics(command)
          });
        }
      case stryMutAct_9fa48("6847") ? "" : (stryCov_9fa48("6847"), "nfc"):
        if (stryMutAct_9fa48("6846")) {} else {
          stryCov_9fa48("6846");
          return stryMutAct_9fa48("6848") ? {} : (stryCov_9fa48("6848"), {
            kind: stryMutAct_9fa48("6849") ? "" : (stryCov_9fa48("6849"), "nfc"),
            accepted: stryMutAct_9fa48("6850") ? false : (stryCov_9fa48("6850"), true),
            normalized: validateNfc(command)
          });
        }
      default:
        if (stryMutAct_9fa48("6851")) {} else {
          stryCov_9fa48("6851");
          {
            if (stryMutAct_9fa48("6852")) {
              {}
            } else {
              stryCov_9fa48("6852");
              const _exhaustive: never = command;
              throw new ActuatorSafetyError(stryMutAct_9fa48("6853") ? "" : (stryCov_9fa48("6853"), "COMMAND_INVALID"), stryMutAct_9fa48("6854") ? `` : (stryCov_9fa48("6854"), `Unknown actuator command: ${JSON.stringify(_exhaustive)}`));
            }
          }
        }
    }
  }
}
function validateTorch(command: Extract<DeviceCommand, {
  kind: "torch";
}>): Extract<DeviceCommand, {
  kind: "torch";
}> {
  if (stryMutAct_9fa48("6855")) {
    {}
  } else {
    stryCov_9fa48("6855");
    if (stryMutAct_9fa48("6858") ? typeof command.on === "boolean" : stryMutAct_9fa48("6857") ? false : stryMutAct_9fa48("6856") ? true : (stryCov_9fa48("6856", "6857", "6858"), typeof command.on !== (stryMutAct_9fa48("6859") ? "" : (stryCov_9fa48("6859"), "boolean")))) {
      if (stryMutAct_9fa48("6860")) {
        {}
      } else {
        stryCov_9fa48("6860");
        throw new ActuatorSafetyError(stryMutAct_9fa48("6861") ? "" : (stryCov_9fa48("6861"), "COMMAND_INVALID"), stryMutAct_9fa48("6862") ? "" : (stryCov_9fa48("6862"), "torch.on must be a boolean."));
      }
    }
    if (stryMutAct_9fa48("6865") ? command.strobeIntervalMs !== undefined : stryMutAct_9fa48("6864") ? false : stryMutAct_9fa48("6863") ? true : (stryCov_9fa48("6863", "6864", "6865"), command.strobeIntervalMs === undefined)) {
      if (stryMutAct_9fa48("6866")) {
        {}
      } else {
        stryCov_9fa48("6866");
        return stryMutAct_9fa48("6867") ? {} : (stryCov_9fa48("6867"), {
          kind: stryMutAct_9fa48("6868") ? "" : (stryCov_9fa48("6868"), "torch"),
          on: command.on
        });
      }
    }
    if (stryMutAct_9fa48("6871") ? !Number.isFinite(command.strobeIntervalMs) && command.strobeIntervalMs < TORCH_MIN_STROBE_INTERVAL_MS : stryMutAct_9fa48("6870") ? false : stryMutAct_9fa48("6869") ? true : (stryCov_9fa48("6869", "6870", "6871"), (stryMutAct_9fa48("6872") ? Number.isFinite(command.strobeIntervalMs) : (stryCov_9fa48("6872"), !Number.isFinite(command.strobeIntervalMs))) || (stryMutAct_9fa48("6875") ? command.strobeIntervalMs >= TORCH_MIN_STROBE_INTERVAL_MS : stryMutAct_9fa48("6874") ? command.strobeIntervalMs <= TORCH_MIN_STROBE_INTERVAL_MS : stryMutAct_9fa48("6873") ? false : (stryCov_9fa48("6873", "6874", "6875"), command.strobeIntervalMs < TORCH_MIN_STROBE_INTERVAL_MS)))) {
      if (stryMutAct_9fa48("6876")) {
        {}
      } else {
        stryCov_9fa48("6876");
        throw new ActuatorSafetyError(stryMutAct_9fa48("6877") ? "" : (stryCov_9fa48("6877"), "TORCH_STROBE_RATE"), stryMutAct_9fa48("6878") ? `` : (stryCov_9fa48("6878"), `Torch strobe interval must be ≥ ${TORCH_MIN_STROBE_INTERVAL_MS} ms (< 3 Hz).`));
      }
    }
    // Fixed host pulse width; apps cannot request a longer on-time than the duty cap.
    const pulseMs = stryMutAct_9fa48("6879") ? Math.max(50, Math.floor(command.strobeIntervalMs * TORCH_MAX_DUTY_CYCLE)) : (stryCov_9fa48("6879"), Math.min(50, Math.floor(stryMutAct_9fa48("6880") ? command.strobeIntervalMs / TORCH_MAX_DUTY_CYCLE : (stryCov_9fa48("6880"), command.strobeIntervalMs * TORCH_MAX_DUTY_CYCLE))));
    if (stryMutAct_9fa48("6884") ? pulseMs / command.strobeIntervalMs <= TORCH_MAX_DUTY_CYCLE : stryMutAct_9fa48("6883") ? pulseMs / command.strobeIntervalMs >= TORCH_MAX_DUTY_CYCLE : stryMutAct_9fa48("6882") ? false : stryMutAct_9fa48("6881") ? true : (stryCov_9fa48("6881", "6882", "6883", "6884"), (stryMutAct_9fa48("6885") ? pulseMs * command.strobeIntervalMs : (stryCov_9fa48("6885"), pulseMs / command.strobeIntervalMs)) > TORCH_MAX_DUTY_CYCLE)) {
      if (stryMutAct_9fa48("6886")) {
        {}
      } else {
        stryCov_9fa48("6886");
        throw new ActuatorSafetyError(stryMutAct_9fa48("6887") ? "" : (stryCov_9fa48("6887"), "TORCH_DUTY_CYCLE"), stryMutAct_9fa48("6888") ? `` : (stryCov_9fa48("6888"), `Torch duty cycle exceeds ${TORCH_MAX_DUTY_CYCLE}.`));
      }
    }
    return stryMutAct_9fa48("6889") ? {} : (stryCov_9fa48("6889"), {
      kind: stryMutAct_9fa48("6890") ? "" : (stryCov_9fa48("6890"), "torch"),
      on: command.on,
      strobeIntervalMs: Math.floor(command.strobeIntervalMs)
    });
  }
}
function validateSpeaker(command: Extract<DeviceCommand, {
  kind: "speaker";
}>): Extract<DeviceCommand, {
  kind: "speaker";
}> {
  if (stryMutAct_9fa48("6891")) {
    {}
  } else {
    stryCov_9fa48("6891");
    const assetId = command.assetId;
    if (stryMutAct_9fa48("6894") ? assetId !== undefined || typeof assetId !== "string" || assetId.length < 1 || assetId.length > 128 : stryMutAct_9fa48("6893") ? false : stryMutAct_9fa48("6892") ? true : (stryCov_9fa48("6892", "6893", "6894"), (stryMutAct_9fa48("6896") ? assetId === undefined : stryMutAct_9fa48("6895") ? true : (stryCov_9fa48("6895", "6896"), assetId !== undefined)) && (stryMutAct_9fa48("6898") ? (typeof assetId !== "string" || assetId.length < 1) && assetId.length > 128 : stryMutAct_9fa48("6897") ? true : (stryCov_9fa48("6897", "6898"), (stryMutAct_9fa48("6900") ? typeof assetId !== "string" && assetId.length < 1 : stryMutAct_9fa48("6899") ? false : (stryCov_9fa48("6899", "6900"), (stryMutAct_9fa48("6902") ? typeof assetId === "string" : stryMutAct_9fa48("6901") ? false : (stryCov_9fa48("6901", "6902"), typeof assetId !== (stryMutAct_9fa48("6903") ? "" : (stryCov_9fa48("6903"), "string")))) || (stryMutAct_9fa48("6906") ? assetId.length >= 1 : stryMutAct_9fa48("6905") ? assetId.length <= 1 : stryMutAct_9fa48("6904") ? false : (stryCov_9fa48("6904", "6905", "6906"), assetId.length < 1)))) || (stryMutAct_9fa48("6909") ? assetId.length <= 128 : stryMutAct_9fa48("6908") ? assetId.length >= 128 : stryMutAct_9fa48("6907") ? false : (stryCov_9fa48("6907", "6908", "6909"), assetId.length > 128)))))) {
      if (stryMutAct_9fa48("6910")) {
        {}
      } else {
        stryCov_9fa48("6910");
        throw new ActuatorSafetyError(stryMutAct_9fa48("6911") ? "" : (stryCov_9fa48("6911"), "COMMAND_INVALID"), stryMutAct_9fa48("6912") ? "" : (stryCov_9fa48("6912"), "speaker.assetId must be 1-128 characters."));
      }
    }
    const volume = stryMutAct_9fa48("6913") ? command.volume && 1 : (stryCov_9fa48("6913"), command.volume ?? 1);
    if (stryMutAct_9fa48("6916") ? (!Number.isFinite(volume) || volume < 0) && volume > SPEAKER_MAX_VOLUME : stryMutAct_9fa48("6915") ? false : stryMutAct_9fa48("6914") ? true : (stryCov_9fa48("6914", "6915", "6916"), (stryMutAct_9fa48("6918") ? !Number.isFinite(volume) && volume < 0 : stryMutAct_9fa48("6917") ? false : (stryCov_9fa48("6917", "6918"), (stryMutAct_9fa48("6919") ? Number.isFinite(volume) : (stryCov_9fa48("6919"), !Number.isFinite(volume))) || (stryMutAct_9fa48("6922") ? volume >= 0 : stryMutAct_9fa48("6921") ? volume <= 0 : stryMutAct_9fa48("6920") ? false : (stryCov_9fa48("6920", "6921", "6922"), volume < 0)))) || (stryMutAct_9fa48("6925") ? volume <= SPEAKER_MAX_VOLUME : stryMutAct_9fa48("6924") ? volume >= SPEAKER_MAX_VOLUME : stryMutAct_9fa48("6923") ? false : (stryCov_9fa48("6923", "6924", "6925"), volume > SPEAKER_MAX_VOLUME)))) {
      if (stryMutAct_9fa48("6926")) {
        {}
      } else {
        stryCov_9fa48("6926");
        throw new ActuatorSafetyError(stryMutAct_9fa48("6927") ? "" : (stryCov_9fa48("6927"), "SPEAKER_VOLUME"), stryMutAct_9fa48("6928") ? `` : (stryCov_9fa48("6928"), `speaker.volume must be in [0, ${SPEAKER_MAX_VOLUME}].`));
      }
    }
    if (stryMutAct_9fa48("6931") ? command.frequencyHz === undefined : stryMutAct_9fa48("6930") ? false : stryMutAct_9fa48("6929") ? true : (stryCov_9fa48("6929", "6930", "6931"), command.frequencyHz !== undefined)) {
      if (stryMutAct_9fa48("6932")) {
        {}
      } else {
        stryCov_9fa48("6932");
        if (stryMutAct_9fa48("6935") ? !Number.isFinite(command.frequencyHz) && command.frequencyHz <= 0 : stryMutAct_9fa48("6934") ? false : stryMutAct_9fa48("6933") ? true : (stryCov_9fa48("6933", "6934", "6935"), (stryMutAct_9fa48("6936") ? Number.isFinite(command.frequencyHz) : (stryCov_9fa48("6936"), !Number.isFinite(command.frequencyHz))) || (stryMutAct_9fa48("6939") ? command.frequencyHz > 0 : stryMutAct_9fa48("6938") ? command.frequencyHz < 0 : stryMutAct_9fa48("6937") ? false : (stryCov_9fa48("6937", "6938", "6939"), command.frequencyHz <= 0)))) {
          if (stryMutAct_9fa48("6940")) {
            {}
          } else {
            stryCov_9fa48("6940");
            throw new ActuatorSafetyError(stryMutAct_9fa48("6941") ? "" : (stryCov_9fa48("6941"), "COMMAND_INVALID"), stryMutAct_9fa48("6942") ? "" : (stryCov_9fa48("6942"), "speaker.frequencyHz must be positive."));
          }
        }
        if (stryMutAct_9fa48("6946") ? command.frequencyHz <= SPEAKER_PLAY_MAX_HZ : stryMutAct_9fa48("6945") ? command.frequencyHz >= SPEAKER_PLAY_MAX_HZ : stryMutAct_9fa48("6944") ? false : stryMutAct_9fa48("6943") ? true : (stryCov_9fa48("6943", "6944", "6945", "6946"), command.frequencyHz > SPEAKER_PLAY_MAX_HZ)) {
          if (stryMutAct_9fa48("6947")) {
            {}
          } else {
            stryCov_9fa48("6947");
            throw new ActuatorSafetyError(stryMutAct_9fa48("6948") ? "" : (stryCov_9fa48("6948"), "SPEAKER_ULTRASONIC"), stryMutAct_9fa48("6949") ? `` : (stryCov_9fa48("6949"), `Play-tier speaker rejects frequencies above ${SPEAKER_PLAY_MAX_HZ} Hz; use speaker:pcm.`));
          }
        }
      }
    }
    if (stryMutAct_9fa48("6952") ? assetId === undefined || command.frequencyHz === undefined : stryMutAct_9fa48("6951") ? false : stryMutAct_9fa48("6950") ? true : (stryCov_9fa48("6950", "6951", "6952"), (stryMutAct_9fa48("6954") ? assetId !== undefined : stryMutAct_9fa48("6953") ? true : (stryCov_9fa48("6953", "6954"), assetId === undefined)) && (stryMutAct_9fa48("6956") ? command.frequencyHz !== undefined : stryMutAct_9fa48("6955") ? true : (stryCov_9fa48("6955", "6956"), command.frequencyHz === undefined)))) {
      if (stryMutAct_9fa48("6957")) {
        {}
      } else {
        stryCov_9fa48("6957");
        throw new ActuatorSafetyError(stryMutAct_9fa48("6958") ? "" : (stryCov_9fa48("6958"), "COMMAND_INVALID"), stryMutAct_9fa48("6959") ? "" : (stryCov_9fa48("6959"), "speaker requires assetId or frequencyHz."));
      }
    }
    return stryMutAct_9fa48("6960") ? {} : (stryCov_9fa48("6960"), {
      kind: stryMutAct_9fa48("6961") ? "" : (stryCov_9fa48("6961"), "speaker"),
      ...((stryMutAct_9fa48("6964") ? assetId === undefined : stryMutAct_9fa48("6963") ? false : stryMutAct_9fa48("6962") ? true : (stryCov_9fa48("6962", "6963", "6964"), assetId !== undefined)) ? stryMutAct_9fa48("6965") ? {} : (stryCov_9fa48("6965"), {
        assetId
      }) : {}),
      volume,
      ...((stryMutAct_9fa48("6968") ? command.frequencyHz === undefined : stryMutAct_9fa48("6967") ? false : stryMutAct_9fa48("6966") ? true : (stryCov_9fa48("6966", "6967", "6968"), command.frequencyHz !== undefined)) ? stryMutAct_9fa48("6969") ? {} : (stryCov_9fa48("6969"), {
        frequencyHz: command.frequencyHz
      }) : {})
    });
  }
}
function validateTts(command: Extract<DeviceCommand, {
  kind: "tts";
}>): Extract<DeviceCommand, {
  kind: "tts";
}> {
  if (stryMutAct_9fa48("6970")) {
    {}
  } else {
    stryCov_9fa48("6970");
    if (stryMutAct_9fa48("6973") ? (typeof command.text !== "string" || command.text.length < 1) && command.text.length > TTS_MAX_TEXT_LENGTH : stryMutAct_9fa48("6972") ? false : stryMutAct_9fa48("6971") ? true : (stryCov_9fa48("6971", "6972", "6973"), (stryMutAct_9fa48("6975") ? typeof command.text !== "string" && command.text.length < 1 : stryMutAct_9fa48("6974") ? false : (stryCov_9fa48("6974", "6975"), (stryMutAct_9fa48("6977") ? typeof command.text === "string" : stryMutAct_9fa48("6976") ? false : (stryCov_9fa48("6976", "6977"), typeof command.text !== (stryMutAct_9fa48("6978") ? "" : (stryCov_9fa48("6978"), "string")))) || (stryMutAct_9fa48("6981") ? command.text.length >= 1 : stryMutAct_9fa48("6980") ? command.text.length <= 1 : stryMutAct_9fa48("6979") ? false : (stryCov_9fa48("6979", "6980", "6981"), command.text.length < 1)))) || (stryMutAct_9fa48("6984") ? command.text.length <= TTS_MAX_TEXT_LENGTH : stryMutAct_9fa48("6983") ? command.text.length >= TTS_MAX_TEXT_LENGTH : stryMutAct_9fa48("6982") ? false : (stryCov_9fa48("6982", "6983", "6984"), command.text.length > TTS_MAX_TEXT_LENGTH)))) {
      if (stryMutAct_9fa48("6985")) {
        {}
      } else {
        stryCov_9fa48("6985");
        throw new ActuatorSafetyError(stryMutAct_9fa48("6986") ? "" : (stryCov_9fa48("6986"), "TTS_TEXT"), stryMutAct_9fa48("6987") ? `` : (stryCov_9fa48("6987"), `tts.text must be 1-${TTS_MAX_TEXT_LENGTH} characters.`));
      }
    }
    if (stryMutAct_9fa48("6990") ? [...command.text].every(ch => {
      const code = ch.codePointAt(0) ?? 0;
      return code < 9 || code > 13 && code < 32 || code === 127;
    }) : stryMutAct_9fa48("6989") ? false : stryMutAct_9fa48("6988") ? true : (stryCov_9fa48("6988", "6989", "6990"), (stryMutAct_9fa48("6991") ? [] : (stryCov_9fa48("6991"), [...command.text])).some(ch => {
      if (stryMutAct_9fa48("6992")) {
        {}
      } else {
        stryCov_9fa48("6992");
        const code = stryMutAct_9fa48("6993") ? ch.codePointAt(0) && 0 : (stryCov_9fa48("6993"), ch.codePointAt(0) ?? 0);
        return stryMutAct_9fa48("6996") ? (code < 9 || code > 13 && code < 32) && code === 127 : stryMutAct_9fa48("6995") ? false : stryMutAct_9fa48("6994") ? true : (stryCov_9fa48("6994", "6995", "6996"), (stryMutAct_9fa48("6998") ? code < 9 && code > 13 && code < 32 : stryMutAct_9fa48("6997") ? false : (stryCov_9fa48("6997", "6998"), (stryMutAct_9fa48("7001") ? code >= 9 : stryMutAct_9fa48("7000") ? code <= 9 : stryMutAct_9fa48("6999") ? false : (stryCov_9fa48("6999", "7000", "7001"), code < 9)) || (stryMutAct_9fa48("7003") ? code > 13 || code < 32 : stryMutAct_9fa48("7002") ? false : (stryCov_9fa48("7002", "7003"), (stryMutAct_9fa48("7006") ? code <= 13 : stryMutAct_9fa48("7005") ? code >= 13 : stryMutAct_9fa48("7004") ? true : (stryCov_9fa48("7004", "7005", "7006"), code > 13)) && (stryMutAct_9fa48("7009") ? code >= 32 : stryMutAct_9fa48("7008") ? code <= 32 : stryMutAct_9fa48("7007") ? true : (stryCov_9fa48("7007", "7008", "7009"), code < 32)))))) || (stryMutAct_9fa48("7011") ? code !== 127 : stryMutAct_9fa48("7010") ? false : (stryCov_9fa48("7010", "7011"), code === 127)));
      }
    }))) {
      if (stryMutAct_9fa48("7012")) {
        {}
      } else {
        stryCov_9fa48("7012");
        throw new ActuatorSafetyError(stryMutAct_9fa48("7013") ? "" : (stryCov_9fa48("7013"), "TTS_TEXT"), stryMutAct_9fa48("7014") ? "" : (stryCov_9fa48("7014"), "tts.text contains disallowed control characters."));
      }
    }
    const rate = stryMutAct_9fa48("7015") ? command.rate && 1 : (stryCov_9fa48("7015"), command.rate ?? 1);
    if (stryMutAct_9fa48("7018") ? (!Number.isFinite(rate) || rate < TTS_MIN_RATE) && rate > TTS_MAX_RATE : stryMutAct_9fa48("7017") ? false : stryMutAct_9fa48("7016") ? true : (stryCov_9fa48("7016", "7017", "7018"), (stryMutAct_9fa48("7020") ? !Number.isFinite(rate) && rate < TTS_MIN_RATE : stryMutAct_9fa48("7019") ? false : (stryCov_9fa48("7019", "7020"), (stryMutAct_9fa48("7021") ? Number.isFinite(rate) : (stryCov_9fa48("7021"), !Number.isFinite(rate))) || (stryMutAct_9fa48("7024") ? rate >= TTS_MIN_RATE : stryMutAct_9fa48("7023") ? rate <= TTS_MIN_RATE : stryMutAct_9fa48("7022") ? false : (stryCov_9fa48("7022", "7023", "7024"), rate < TTS_MIN_RATE)))) || (stryMutAct_9fa48("7027") ? rate <= TTS_MAX_RATE : stryMutAct_9fa48("7026") ? rate >= TTS_MAX_RATE : stryMutAct_9fa48("7025") ? false : (stryCov_9fa48("7025", "7026", "7027"), rate > TTS_MAX_RATE)))) {
      if (stryMutAct_9fa48("7028")) {
        {}
      } else {
        stryCov_9fa48("7028");
        throw new ActuatorSafetyError(stryMutAct_9fa48("7029") ? "" : (stryCov_9fa48("7029"), "TTS_RATE"), stryMutAct_9fa48("7030") ? `` : (stryCov_9fa48("7030"), `tts.rate must be in [${TTS_MIN_RATE}, ${TTS_MAX_RATE}].`));
      }
    }
    return stryMutAct_9fa48("7031") ? {} : (stryCov_9fa48("7031"), {
      kind: stryMutAct_9fa48("7032") ? "" : (stryCov_9fa48("7032"), "tts"),
      text: command.text,
      rate
    });
  }
}
function validateHaptics(command: Extract<DeviceCommand, {
  kind: "haptics";
}>): Extract<DeviceCommand, {
  kind: "haptics";
}> {
  if (stryMutAct_9fa48("7033")) {
    {}
  } else {
    stryCov_9fa48("7033");
    if (stryMutAct_9fa48("7036") ? (!Array.isArray(command.patternMs) || command.patternMs.length < 1) && command.patternMs.length > 32 : stryMutAct_9fa48("7035") ? false : stryMutAct_9fa48("7034") ? true : (stryCov_9fa48("7034", "7035", "7036"), (stryMutAct_9fa48("7038") ? !Array.isArray(command.patternMs) && command.patternMs.length < 1 : stryMutAct_9fa48("7037") ? false : (stryCov_9fa48("7037", "7038"), (stryMutAct_9fa48("7039") ? Array.isArray(command.patternMs) : (stryCov_9fa48("7039"), !Array.isArray(command.patternMs))) || (stryMutAct_9fa48("7042") ? command.patternMs.length >= 1 : stryMutAct_9fa48("7041") ? command.patternMs.length <= 1 : stryMutAct_9fa48("7040") ? false : (stryCov_9fa48("7040", "7041", "7042"), command.patternMs.length < 1)))) || (stryMutAct_9fa48("7045") ? command.patternMs.length <= 32 : stryMutAct_9fa48("7044") ? command.patternMs.length >= 32 : stryMutAct_9fa48("7043") ? false : (stryCov_9fa48("7043", "7044", "7045"), command.patternMs.length > 32)))) {
      if (stryMutAct_9fa48("7046")) {
        {}
      } else {
        stryCov_9fa48("7046");
        throw new ActuatorSafetyError(stryMutAct_9fa48("7047") ? "" : (stryCov_9fa48("7047"), "HAPTICS_PATTERN"), stryMutAct_9fa48("7048") ? "" : (stryCov_9fa48("7048"), "haptics.patternMs must have 1-32 entries."));
      }
    }
    let totalOn = 0;
    let total = 0;
    const pattern: number[] = stryMutAct_9fa48("7049") ? ["Stryker was here"] : (stryCov_9fa48("7049"), []);
    for (let i = 0; stryMutAct_9fa48("7052") ? i >= command.patternMs.length : stryMutAct_9fa48("7051") ? i <= command.patternMs.length : stryMutAct_9fa48("7050") ? false : (stryCov_9fa48("7050", "7051", "7052"), i < command.patternMs.length); stryMutAct_9fa48("7053") ? i -= 1 : (stryCov_9fa48("7053"), i += 1)) {
      if (stryMutAct_9fa48("7054")) {
        {}
      } else {
        stryCov_9fa48("7054");
        const ms = command.patternMs[i];
        if (stryMutAct_9fa48("7057") ? (!Number.isFinite(ms) || ms < 0) && ms > HAPTICS_MAX_PATTERN_MS : stryMutAct_9fa48("7056") ? false : stryMutAct_9fa48("7055") ? true : (stryCov_9fa48("7055", "7056", "7057"), (stryMutAct_9fa48("7059") ? !Number.isFinite(ms) && ms < 0 : stryMutAct_9fa48("7058") ? false : (stryCov_9fa48("7058", "7059"), (stryMutAct_9fa48("7060") ? Number.isFinite(ms) : (stryCov_9fa48("7060"), !Number.isFinite(ms))) || (stryMutAct_9fa48("7063") ? ms >= 0 : stryMutAct_9fa48("7062") ? ms <= 0 : stryMutAct_9fa48("7061") ? false : (stryCov_9fa48("7061", "7062", "7063"), ms < 0)))) || (stryMutAct_9fa48("7066") ? ms <= HAPTICS_MAX_PATTERN_MS : stryMutAct_9fa48("7065") ? ms >= HAPTICS_MAX_PATTERN_MS : stryMutAct_9fa48("7064") ? false : (stryCov_9fa48("7064", "7065", "7066"), ms > HAPTICS_MAX_PATTERN_MS)))) {
          if (stryMutAct_9fa48("7067")) {
            {}
          } else {
            stryCov_9fa48("7067");
            throw new ActuatorSafetyError(stryMutAct_9fa48("7068") ? "" : (stryCov_9fa48("7068"), "HAPTICS_PATTERN"), stryMutAct_9fa48("7069") ? `` : (stryCov_9fa48("7069"), `haptics pattern entry must be in [0, ${HAPTICS_MAX_PATTERN_MS}] ms.`));
          }
        }
        const floored = Math.floor(ms);
        pattern.push(floored);
        stryMutAct_9fa48("7070") ? total -= floored : (stryCov_9fa48("7070"), total += floored);
        if (stryMutAct_9fa48("7073") ? i % 2 !== 0 : stryMutAct_9fa48("7072") ? false : stryMutAct_9fa48("7071") ? true : (stryCov_9fa48("7071", "7072", "7073"), (stryMutAct_9fa48("7074") ? i * 2 : (stryCov_9fa48("7074"), i % 2)) === 0)) stryMutAct_9fa48("7075") ? totalOn -= floored : (stryCov_9fa48("7075"), totalOn += floored);
      }
    }
    if (stryMutAct_9fa48("7078") ? total !== 0 : stryMutAct_9fa48("7077") ? false : stryMutAct_9fa48("7076") ? true : (stryCov_9fa48("7076", "7077", "7078"), total === 0)) {
      if (stryMutAct_9fa48("7079")) {
        {}
      } else {
        stryCov_9fa48("7079");
        throw new ActuatorSafetyError(stryMutAct_9fa48("7080") ? "" : (stryCov_9fa48("7080"), "HAPTICS_PATTERN"), stryMutAct_9fa48("7081") ? "" : (stryCov_9fa48("7081"), "haptics pattern must have non-zero duration."));
      }
    }
    if (stryMutAct_9fa48("7085") ? totalOn / total <= HAPTICS_MAX_DUTY_CYCLE : stryMutAct_9fa48("7084") ? totalOn / total >= HAPTICS_MAX_DUTY_CYCLE : stryMutAct_9fa48("7083") ? false : stryMutAct_9fa48("7082") ? true : (stryCov_9fa48("7082", "7083", "7084", "7085"), (stryMutAct_9fa48("7086") ? totalOn * total : (stryCov_9fa48("7086"), totalOn / total)) > HAPTICS_MAX_DUTY_CYCLE)) {
      if (stryMutAct_9fa48("7087")) {
        {}
      } else {
        stryCov_9fa48("7087");
        throw new ActuatorSafetyError(stryMutAct_9fa48("7088") ? "" : (stryCov_9fa48("7088"), "HAPTICS_DUTY_CYCLE"), stryMutAct_9fa48("7089") ? `` : (stryCov_9fa48("7089"), `haptics duty cycle exceeds ${HAPTICS_MAX_DUTY_CYCLE}.`));
      }
    }
    const intensity = stryMutAct_9fa48("7090") ? command.intensity && 1 : (stryCov_9fa48("7090"), command.intensity ?? 1);
    if (stryMutAct_9fa48("7093") ? (!Number.isFinite(intensity) || intensity < 0) && intensity > 1 : stryMutAct_9fa48("7092") ? false : stryMutAct_9fa48("7091") ? true : (stryCov_9fa48("7091", "7092", "7093"), (stryMutAct_9fa48("7095") ? !Number.isFinite(intensity) && intensity < 0 : stryMutAct_9fa48("7094") ? false : (stryCov_9fa48("7094", "7095"), (stryMutAct_9fa48("7096") ? Number.isFinite(intensity) : (stryCov_9fa48("7096"), !Number.isFinite(intensity))) || (stryMutAct_9fa48("7099") ? intensity >= 0 : stryMutAct_9fa48("7098") ? intensity <= 0 : stryMutAct_9fa48("7097") ? false : (stryCov_9fa48("7097", "7098", "7099"), intensity < 0)))) || (stryMutAct_9fa48("7102") ? intensity <= 1 : stryMutAct_9fa48("7101") ? intensity >= 1 : stryMutAct_9fa48("7100") ? false : (stryCov_9fa48("7100", "7101", "7102"), intensity > 1)))) {
      if (stryMutAct_9fa48("7103")) {
        {}
      } else {
        stryCov_9fa48("7103");
        throw new ActuatorSafetyError(stryMutAct_9fa48("7104") ? "" : (stryCov_9fa48("7104"), "COMMAND_INVALID"), stryMutAct_9fa48("7105") ? "" : (stryCov_9fa48("7105"), "haptics.intensity must be in [0, 1]."));
      }
    }
    return stryMutAct_9fa48("7106") ? {} : (stryCov_9fa48("7106"), {
      kind: stryMutAct_9fa48("7107") ? "" : (stryCov_9fa48("7107"), "haptics"),
      patternMs: pattern,
      intensity
    });
  }
}
function validateNfc(command: Extract<DeviceCommand, {
  kind: "nfc";
}>): Extract<DeviceCommand, {
  kind: "nfc";
}> {
  if (stryMutAct_9fa48("7108")) {
    {}
  } else {
    stryCov_9fa48("7108");
    if (stryMutAct_9fa48("7111") ? command.action !== "apdu" : stryMutAct_9fa48("7110") ? false : stryMutAct_9fa48("7109") ? true : (stryCov_9fa48("7109", "7110", "7111"), command.action === (stryMutAct_9fa48("7112") ? "" : (stryCov_9fa48("7112"), "apdu")))) {
      if (stryMutAct_9fa48("7113")) {
        {}
      } else {
        stryCov_9fa48("7113");
        try {
          if (stryMutAct_9fa48("7114")) {
            {}
          } else {
            stryCov_9fa48("7114");
            const aid = assertAidAllowed(command.aid);
            if (stryMutAct_9fa48("7117") ? (typeof command.apdu !== "string" || command.apdu.length < 2) && command.apdu.length > 1024 : stryMutAct_9fa48("7116") ? false : stryMutAct_9fa48("7115") ? true : (stryCov_9fa48("7115", "7116", "7117"), (stryMutAct_9fa48("7119") ? typeof command.apdu !== "string" && command.apdu.length < 2 : stryMutAct_9fa48("7118") ? false : (stryCov_9fa48("7118", "7119"), (stryMutAct_9fa48("7121") ? typeof command.apdu === "string" : stryMutAct_9fa48("7120") ? false : (stryCov_9fa48("7120", "7121"), typeof command.apdu !== (stryMutAct_9fa48("7122") ? "" : (stryCov_9fa48("7122"), "string")))) || (stryMutAct_9fa48("7125") ? command.apdu.length >= 2 : stryMutAct_9fa48("7124") ? command.apdu.length <= 2 : stryMutAct_9fa48("7123") ? false : (stryCov_9fa48("7123", "7124", "7125"), command.apdu.length < 2)))) || (stryMutAct_9fa48("7128") ? command.apdu.length <= 1024 : stryMutAct_9fa48("7127") ? command.apdu.length >= 1024 : stryMutAct_9fa48("7126") ? false : (stryCov_9fa48("7126", "7127", "7128"), command.apdu.length > 1024)))) {
              if (stryMutAct_9fa48("7129")) {
                {}
              } else {
                stryCov_9fa48("7129");
                throw new ActuatorSafetyError(stryMutAct_9fa48("7130") ? "" : (stryCov_9fa48("7130"), "NFC_PAYLOAD"), stryMutAct_9fa48("7131") ? "" : (stryCov_9fa48("7131"), "nfc.apdu payload length is invalid."));
              }
            }
            return stryMutAct_9fa48("7132") ? {} : (stryCov_9fa48("7132"), {
              kind: stryMutAct_9fa48("7133") ? "" : (stryCov_9fa48("7133"), "nfc"),
              action: stryMutAct_9fa48("7134") ? "" : (stryCov_9fa48("7134"), "apdu"),
              aid,
              apdu: command.apdu
            });
          }
        } catch (error) {
          if (stryMutAct_9fa48("7135")) {
            {}
          } else {
            stryCov_9fa48("7135");
            if (stryMutAct_9fa48("7137") ? false : stryMutAct_9fa48("7136") ? true : (stryCov_9fa48("7136", "7137"), error instanceof NfcPaymentAidError)) {
              if (stryMutAct_9fa48("7138")) {
                {}
              } else {
                stryCov_9fa48("7138");
                throw new ActuatorSafetyError(stryMutAct_9fa48("7139") ? "" : (stryCov_9fa48("7139"), "NFC_PAYLOAD"), error.message);
              }
            }
            throw error;
          }
        }
      }
    }
    if (stryMutAct_9fa48("7142") ? command.action === "write" : stryMutAct_9fa48("7141") ? false : stryMutAct_9fa48("7140") ? true : (stryCov_9fa48("7140", "7141", "7142"), command.action !== (stryMutAct_9fa48("7143") ? "" : (stryCov_9fa48("7143"), "write")))) {
      if (stryMutAct_9fa48("7144")) {
        {}
      } else {
        stryCov_9fa48("7144");
        throw new ActuatorSafetyError(stryMutAct_9fa48("7145") ? "" : (stryCov_9fa48("7145"), "COMMAND_INVALID"), stryMutAct_9fa48("7146") ? "" : (stryCov_9fa48("7146"), "nfc action must be write or apdu."));
      }
    }
    if (stryMutAct_9fa48("7149") ? typeof command.ndef !== "string" && command.ndef.length < 1 : stryMutAct_9fa48("7148") ? false : stryMutAct_9fa48("7147") ? true : (stryCov_9fa48("7147", "7148", "7149"), (stryMutAct_9fa48("7151") ? typeof command.ndef === "string" : stryMutAct_9fa48("7150") ? false : (stryCov_9fa48("7150", "7151"), typeof command.ndef !== (stryMutAct_9fa48("7152") ? "" : (stryCov_9fa48("7152"), "string")))) || (stryMutAct_9fa48("7155") ? command.ndef.length >= 1 : stryMutAct_9fa48("7154") ? command.ndef.length <= 1 : stryMutAct_9fa48("7153") ? false : (stryCov_9fa48("7153", "7154", "7155"), command.ndef.length < 1)))) {
      if (stryMutAct_9fa48("7156")) {
        {}
      } else {
        stryCov_9fa48("7156");
        throw new ActuatorSafetyError(stryMutAct_9fa48("7157") ? "" : (stryCov_9fa48("7157"), "NFC_PAYLOAD"), stryMutAct_9fa48("7158") ? "" : (stryCov_9fa48("7158"), "nfc.ndef payload is required."));
      }
    }
    const bytes = utf8ByteLength(command.ndef);
    if (stryMutAct_9fa48("7162") ? bytes <= NFC_MAX_NDEF_BYTES : stryMutAct_9fa48("7161") ? bytes >= NFC_MAX_NDEF_BYTES : stryMutAct_9fa48("7160") ? false : stryMutAct_9fa48("7159") ? true : (stryCov_9fa48("7159", "7160", "7161", "7162"), bytes > NFC_MAX_NDEF_BYTES)) {
      if (stryMutAct_9fa48("7163")) {
        {}
      } else {
        stryCov_9fa48("7163");
        throw new ActuatorSafetyError(stryMutAct_9fa48("7164") ? "" : (stryCov_9fa48("7164"), "NFC_PAYLOAD"), stryMutAct_9fa48("7165") ? `` : (stryCov_9fa48("7165"), `nfc.ndef exceeds ${NFC_MAX_NDEF_BYTES} bytes.`));
      }
    }
    return stryMutAct_9fa48("7166") ? {} : (stryCov_9fa48("7166"), {
      kind: stryMutAct_9fa48("7167") ? "" : (stryCov_9fa48("7167"), "nfc"),
      action: stryMutAct_9fa48("7168") ? "" : (stryCov_9fa48("7168"), "write"),
      ndef: command.ndef
    });
  }
}
function utf8ByteLength(value: string): number {
  if (stryMutAct_9fa48("7169")) {
    {}
  } else {
    stryCov_9fa48("7169");
    let bytes = 0;
    for (const character of value) {
      if (stryMutAct_9fa48("7170")) {
        {}
      } else {
        stryCov_9fa48("7170");
        const code = stryMutAct_9fa48("7171") ? character.codePointAt(0) && 0 : (stryCov_9fa48("7171"), character.codePointAt(0) ?? 0);
        if (stryMutAct_9fa48("7175") ? code > 0x7f : stryMutAct_9fa48("7174") ? code < 0x7f : stryMutAct_9fa48("7173") ? false : stryMutAct_9fa48("7172") ? true : (stryCov_9fa48("7172", "7173", "7174", "7175"), code <= 0x7f)) stryMutAct_9fa48("7176") ? bytes -= 1 : (stryCov_9fa48("7176"), bytes += 1);else if (stryMutAct_9fa48("7180") ? code > 0x7ff : stryMutAct_9fa48("7179") ? code < 0x7ff : stryMutAct_9fa48("7178") ? false : stryMutAct_9fa48("7177") ? true : (stryCov_9fa48("7177", "7178", "7179", "7180"), code <= 0x7ff)) stryMutAct_9fa48("7181") ? bytes -= 2 : (stryCov_9fa48("7181"), bytes += 2);else if (stryMutAct_9fa48("7185") ? code > 0xffff : stryMutAct_9fa48("7184") ? code < 0xffff : stryMutAct_9fa48("7183") ? false : stryMutAct_9fa48("7182") ? true : (stryCov_9fa48("7182", "7183", "7184", "7185"), code <= 0xffff)) stryMutAct_9fa48("7186") ? bytes -= 3 : (stryCov_9fa48("7186"), bytes += 3);else stryMutAct_9fa48("7187") ? bytes -= 4 : (stryCov_9fa48("7187"), bytes += 4);
      }
    }
    return bytes;
  }
}