// @ts-nocheck
export function createQuiesceInterfaces(deps) {
  return async function quiesceInterfaces() {
    deps.log("Quiescing interfaces for iOS background transition");
    await deps.stopTcpInterface();
    await deps.stopAutoInterface();
    await deps.stopBleInterface();
    await deps.stopRnodeInterface();
    await deps.stopFreenetInterface();
    deps.pushStatus();
  };
}
