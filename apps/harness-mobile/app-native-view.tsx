import { View } from "react-native";
import { styles } from "./app-native-shared.js";
import type { useNativeHarnessController } from "./app-native-controller.js";
import { NativeHarnessViewPart1 } from "./app-native-view-part-1.js";
import { NativeHarnessViewPart2 } from "./app-native-view-part-2.js";
import { NativeHarnessViewPart3 } from "./app-native-view-part-3.js";
import { NativeHarnessViewPart4 } from "./app-native-view-part-4.js";
type Scope = ReturnType<typeof useNativeHarnessController>;
export function HarnessView({ scope }: { scope: Scope }) {
  return (
    <View style={styles.container}>
      <NativeHarnessViewPart1 scope={scope} />
      <NativeHarnessViewPart2 scope={scope} />
      <NativeHarnessViewPart4 scope={scope} />
      <NativeHarnessViewPart3 scope={scope} />
    </View>
  );
}
