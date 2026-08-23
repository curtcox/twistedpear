import type { LinkProfile, LinkProfileName } from "@twistedpear/miniapp-test";
import { LINK_PROFILES } from "@twistedpear/miniapp-test";
import { parseFlag } from "./helpers.js";

export interface DevLinkFlags {
  readonly link?: LinkProfileName;
  readonly loss?: number;
  readonly peerOffline: boolean;
}

function parseDevLinkName(
  args: ReadonlyArray<string>,
): LinkProfileName | undefined {
  const link = parseFlag(args, "--link");
  if (link === null) return undefined;
  if (link !== "lan" && link !== "ble" && link !== "lora") {
    throw new Error(`Unknown --link profile: ${link}`);
  }
  return link;
}

function parseDevLinkLoss(args: ReadonlyArray<string>): number | undefined {
  const lossRaw = parseFlag(args, "--loss");
  if (lossRaw === null) return undefined;
  const loss = Number(lossRaw) / 100;
  if (!Number.isFinite(loss) || loss < 0 || loss > 1) {
    throw new Error("--loss must be a percentage between 0 and 100");
  }
  return loss;
}

export function parseDevLinkFlags(args: ReadonlyArray<string>): DevLinkFlags {
  const link = parseDevLinkName(args);
  const loss = parseDevLinkLoss(args);
  return {
    ...(link === undefined ? {} : { link }),
    ...(loss === undefined ? {} : { loss }),
    peerOffline: args.includes("--peer-offline"),
  };
}

export function resolveDevLinkProfile(
  flags: DevLinkFlags,
): LinkProfile | undefined {
  if (
    flags.link === undefined &&
    !flags.peerOffline &&
    flags.loss === undefined
  ) {
    return undefined;
  }
  const base = LINK_PROFILES[flags.link ?? "lan"];
  return {
    ...base,
    ...(flags.loss === undefined ? {} : { loss: flags.loss }),
    peerOffline: flags.peerOffline,
  };
}
