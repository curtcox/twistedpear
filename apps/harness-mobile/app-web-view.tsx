import { View } from "react-native";
import { styles } from "./app-web-shared.js";
import type { useWebHarnessController } from "./app-web-controller.js";
import { WebHarnessViewPart1 } from "./app-web-view-part-1.js";
import { WebHarnessViewPart2 } from "./app-web-view-part-2.js";
type Scope = ReturnType<typeof useWebHarnessController>;
export function HarnessView({ scope }: { scope: Scope }) {
  return (
    <View style={styles.container}>
      <WebHarnessViewPart1 scope={scope} />
      <WebHarnessViewPart2 scope={scope} />
    </View>
  );
}
