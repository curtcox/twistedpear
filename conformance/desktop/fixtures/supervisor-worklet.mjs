/**
 * Minimal Node worklet for supervisor crash-restart tests.
 */

let identityHash = null;

function send(message) {
  process.stdout.write(`${JSON.stringify(message)}\n`);
}

function pushStatus() {
  send({
    type: "status",
    status: {
      running: true,
      linkOnline: false,
      announcesSeen: 0,
      identityHash,
      identityPersisted: identityHash !== null,
      tcpEnabled: false,
      autoEnabled: false,
      bleEnabled: false,
      bleConnected: false,
      rnodeEnabled: false,
      rnodeConnected: false,
      rnodeDeviceName: null,
      cryptoProvider: "test",
      autoPeers: 0,
      preferredInterface: null,
      onlineInterfaces: 0,
      catalogEntries: 0,
      installedPackages: 0,
      storageUsedBytes: 0
    }
  });
}

let buffer = "";
process.stdin.on("data", (chunk) => {
  buffer += chunk.toString("utf8");
  while (true) {
    const newline = buffer.indexOf("\n");
    if (newline < 0) {
      break;
    }

    const line = buffer.slice(0, newline).trim();
    buffer = buffer.slice(newline + 1);
    if (line.length === 0) {
      continue;
    }

    let message;
    try {
      message = JSON.parse(line);
    } catch {
      continue;
    }

    if (message.type === "create-identity") {
      identityHash = "supervisor-test-identity";
      pushStatus();
    }

    if (message.type === "stop") {
      process.exit(0);
    }
  }
});

pushStatus();
send({ type: "log", line: "supervisor test worklet ready" });
