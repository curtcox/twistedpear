// @ts-nocheck

import { useWebHarnessController } from "./app-web-controller.js";
import { HarnessView } from "./app-web-view.js";
export default function App() {
  const scope = useWebHarnessController();
  return <HarnessView scope={scope} />;
}
