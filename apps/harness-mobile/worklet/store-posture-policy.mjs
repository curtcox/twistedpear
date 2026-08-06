import { STORE_POSTURE, STORE_VARIANT } from "./store-posture.generated.mjs";

export { STORE_POSTURE, STORE_VARIANT };

export function refuseStorePosture(action, send) {
  if (!STORE_VARIANT) {
    return false;
  }

  send({
    type: "log",
    line: `${action} refused in store posture variant`,
  });
  send({
    type: "dev-channel",
    state: "error",
    detail: `${action} is disabled in ${STORE_POSTURE} posture`,
  });
  return true;
}

export function shouldRefuseDeveloperMode(enabled) {
  return STORE_VARIANT && enabled;
}
