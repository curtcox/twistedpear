import { Buffer } from "buffer";

// b4a (and some host IPC helpers) expect Node's Buffer on Hermes.
globalThis.Buffer = globalThis.Buffer ?? Buffer;

import { registerRootComponent } from "expo";
import App from "./App";

registerRootComponent(App);
