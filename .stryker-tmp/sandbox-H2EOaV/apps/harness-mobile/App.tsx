// @ts-nocheck

import { useNativeHarnessController } from "./app-native-controller.js";
import { HarnessView } from "./app-native-view.js";
export default function App() {
  const scope = useNativeHarnessController();
  return <HarnessView scope={scope} />;
}
