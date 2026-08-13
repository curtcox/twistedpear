import { Buffer } from "buffer";
import { Platform } from "react-native";
import { ensureUtf16LeTextDecoder } from "@twistedpear/effects";

// b4a (and some host IPC helpers) expect Node's Buffer on Hermes.
globalThis.Buffer = globalThis.Buffer ?? Buffer;

// opusscript's asm.js/WASM glue constructs `new TextDecoder("utf-16le")` at
// module load. Hermes rejects that label; patch before App imports OpusScript.
ensureUtf16LeTextDecoder();

// Native WebRTC globals for peer media tracks (openWebRtcMediaPlane). Web uses
// browser RTCPeerConnection; metro stubs this package on web.
if (Platform.OS !== "web") {
  require("react-native-webrtc").registerGlobals();
}

import { registerRootComponent } from "expo";
import App from "./App";

registerRootComponent(App);
