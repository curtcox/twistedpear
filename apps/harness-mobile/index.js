import "expo-dev-client";
import { Buffer } from "./stubs/buffer.js";
import { ensureUtf16LeTextDecoder } from "@twistedpear/effects";
import { registerRootComponent } from "expo";
import { Platform } from "react-native";
import App from "./App";

// b4a (and some host IPC helpers) expect Node's Buffer on Hermes.
globalThis.Buffer = globalThis.Buffer ?? Buffer;

// opusscript's asm.js/WASM glue constructs `new TextDecoder("utf-16le")` at
// module load. Hermes rejects that label; patch before App uses OpusScript.
ensureUtf16LeTextDecoder();

// Native WebRTC globals for peer media tracks (openWebRtcMediaPlane). Web uses
// browser RTCPeerConnection; metro stubs this package on web.
if (Platform.OS !== "web") {
  require("react-native-webrtc").registerGlobals();
}

registerRootComponent(App);
