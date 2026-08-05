export async function joinCommunityNetwork(deps) {
  deps.status.tcpEnabled = true;
  deps.pushStatus();
  deps.log(deps.communityNetwork.privacyNotice);
  for (const endpoint of deps.communityNetwork.endpoints) {
    await deps.stopTcpInterface();
    deps.setPendingTarget({ targetHost: endpoint.host, targetPort: endpoint.port });
    deps.log(`Trying ${endpoint.label}`);
    if (await deps.startTcpInterface(endpoint.host, endpoint.port)) {
      deps.log(`Joined ${deps.communityNetwork.label} through ${endpoint.label}`);
      return;
    }
  }
  deps.log("Community bootstrap unavailable; try again later or configure your own TCP peer");
}
