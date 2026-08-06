import "bare-encoding/global";
import {
  ContractKey,
  FreenetWsApi,
  GetRequest,
  PutRequest,
  UpdateRequest,
} from "@freenetorg/freenet-stdlib";
import { installBareWebSocketGlobal } from "./bare-websocket-shim.mjs";

installBareWebSocketGlobal();

const result = {
  sdkImports:
    typeof FreenetWsApi === "function" &&
    typeof GetRequest === "function" &&
    typeof PutRequest === "function" &&
    typeof UpdateRequest === "function",
  webSocketGlobal: typeof globalThis.WebSocket === "function",
  shims: ["bare-ws@2.0.4", "bare-encoding@1.0.3"],
};

const nodeUrl = Bare.argv[2];
const contractKey = Bare.argv[3];

if (nodeUrl !== undefined && contractKey !== undefined) {
  let api;
  let openedResolve;
  let openedReject;
  const opened = new Promise((resolve, reject) => {
    openedResolve = resolve;
    openedReject = reject;
  });
  const handler = {
    onContractPut() {},
    onContractGet() {},
    onContractUpdate() {},
    onContractUpdateNotification() {},
    onContractNotFound() {},
    onDelegateResponse() {},
    onErr(error) {
      openedReject(new Error(error.cause));
    },
    onOpen() {
      openedResolve();
    },
    onClose(_code, reason) {
      openedReject(new Error(`Freenet connection closed: ${reason}`));
    },
  };

  api = new FreenetWsApi(new URL(nodeUrl), handler);
  await opened;
  const response = await api.get(
    new GetRequest(ContractKey.fromInstanceId(contractKey)),
  );
  result.liveGet = {
    key: response.key.encode(),
    stateBytes: response.state.length,
  };
}

console.log(`FREENET_S1 ${JSON.stringify(result)}`);
