import { Buffer } from "buffer";
import { Platform } from "react-native";

// b4a (and some host IPC helpers) expect Node's Buffer on Hermes.
globalThis.Buffer = globalThis.Buffer ?? Buffer;

// Native WebRTC globals for peer media tracks (openWebRtcMediaPlane). Web uses
// browser RTCPeerConnection; metro stubs this package on web.
if (Platform.OS !== "web") {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require("react-native-webrtc").registerGlobals();
}

import { registerRootComponent } from "expo";
import App from "./App";

registerRootComponent(App);
