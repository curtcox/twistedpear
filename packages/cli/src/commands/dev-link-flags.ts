import type { LinkProfile, LinkProfileName } from "@twistedpear/miniapp-test";
import { LINK_PROFILES } from "@twistedpear/miniapp-test";
import { parseFlag } from "./helpers.js";

export interface DevLinkFlags {
  readonly link?: LinkProfileName;
  readonly loss?: number;
  readonly peerOffline: boolean;
}

export function parseDevLinkFlags(args: ReadonlyArray<string>): DevLinkFlags {
  const link = parseFlag(args, "--link");
  if (link !== null && link !== "lan" && link !== "ble" && link !== "lora") {
    throw new Error(`Unknown --link profile: ${link}`);
  }
  const lossRaw = parseFlag(args, "--loss");
  const loss = lossRaw === null ? undefined : Number(lossRaw) / 100;
  if (loss !== undefined && (!Number.isFinite(loss) || loss < 0 || loss > 1)) {
    throw new Error("--loss must be a percentage between 0 and 100");
  }
  return {
    ...(link === null ? {} : { link }),
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
