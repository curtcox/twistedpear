import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import type { WidgetNode, WidgetStyle, WidgetTree } from "@twistedpear/miniapp-runtime";

// Keep component/prop mapping aligned with describeWidgetTree() in miniapp-runtime (ui-golden tests).

export function MiniappWidgetTree({
  tree,
  onEvent
}: {
  readonly tree: WidgetTree | null;
  readonly onEvent?: (nodeId: string, event: string, value?: unknown) => void;
}) {
  if (tree === null) {
    return <Text style={styles.muted}>No widget tree</Text>;
  }

  return <WidgetNodeView node={tree.root} onEvent={onEvent} />;
}

function WidgetNodeView({
  node,
  onEvent
}: {
  readonly node: WidgetNode;
  readonly onEvent?: (nodeId: string, event: string, value?: unknown) => void;
}) {
  const style = widgetStyle(node.style);

  switch (node.type) {
    case "view":
      return (
        <View style={style}>
          {node.children?.map((child) => (
            <WidgetNodeView key={child.id} node={child} onEvent={onEvent} />
          ))}
        </View>
      );
    case "text":
      return <Text style={style}>{String(node.props?.value ?? "")}</Text>;
    case "button":
      return (
        <Pressable
          style={[styles.button, style]}
          onPress={() => {
            const event = node.props?.event;
            if (typeof event === "string") {
              onEvent?.(node.id, event);
            }
          }}
        >
          <Text style={styles.buttonLabel}>{String(node.props?.label ?? "Button")}</Text>
        </Pressable>
      );
    case "text-input":
      return (
        <TextInput
          style={[styles.input, style]}
          defaultValue={String(node.props?.value ?? "")}
          placeholder={String(node.props?.placeholder ?? "")}
          onChangeText={(value) => {
            const event = node.props?.event;
            if (typeof event === "string") {
              onEvent?.(node.id, event, value);
            }
          }}
        />
      );
    case "switch":
      return (
        <Switch
          value={Boolean(node.props?.value)}
          onValueChange={(value) => {
            const event = node.props?.event;
            if (typeof event === "string") {
              onEvent?.(node.id, event, value);
            }
          }}
        />
      );
    case "scroll":
      return (
        <ScrollView style={style}>
          {node.children?.map((child) => (
            <WidgetNodeView key={child.id} node={child} onEvent={onEvent} />
          ))}
        </ScrollView>
      );
    case "divider":
      return <View style={[styles.divider, style]} />;
    case "spacer":
      return <View style={[{ height: 8 }, style]} />;
    case "progress":
      return <Text style={style}>Progress {String(node.props?.value ?? 0)}%</Text>;
    case "list":
      return (
        <View style={style}>
          {(Array.isArray(node.props?.items) ? node.props.items : []).map((item, index) => (
            <Text key={`${node.id}-${index}`} style={styles.muted}>
              {typeof item === "string" ? item : JSON.stringify(item)}
            </Text>
          ))}
        </View>
      );
    case "image":
      return <Text style={style}>image:{String(node.props?.asset ?? "")}</Text>;
    case "code-editor":
      // v1 fallback: plain multiline editor keyed by documentId; the app owns
      // persistence via workspace.write on the emitted event.
      return (
        <TextInput
          style={[styles.input, styles.codeEditor, style]}
          multiline
          autoCapitalize="none"
          autoCorrect={false}
          editable={!node.props?.readOnly}
          placeholder={String(node.props?.documentId ?? "")}
          onChangeText={(text) => {
            const event = node.props?.event;
            if (typeof event === "string") {
              onEvent?.(node.id, event, { documentId: String(node.props?.documentId ?? ""), text });
            }
          }}
        />
      );
    case "qr-code":
      // v1 fallback: copyable string (parity flag: desktop renders a scannable QR).
      return (
        <View style={style}>
          <Text selectable style={styles.muted}>
            {String(node.props?.value ?? "")}
          </Text>
          {typeof node.props?.caption === "string" ? (
            <Text style={styles.muted}>{node.props.caption}</Text>
          ) : null}
        </View>
      );
    default:
      return null;
  }
}

function widgetStyle(style?: WidgetStyle) {
  if (style === undefined) {
    return undefined;
  }

  return {
    display: style.display === "none" ? "none" : "flex",
    flexDirection: style.flexDirection,
    alignItems: style.alignItems,
    justifyContent: style.justifyContent,
    gap: style.gap,
    padding: style.padding,
    margin: style.margin,
    width: typeof style.width === "number" ? style.width : style.width,
    height: typeof style.height === "number" ? style.height : style.height,
    backgroundColor: style.backgroundColor,
    color: style.color,
    fontSize: style.fontSize,
    fontWeight: style.fontWeight === "bold" ? "700" : style.fontWeight === "medium" ? "500" : "400"
  } as const;
}

const styles = StyleSheet.create({
  muted: {
    color: "#9aa7b8",
    fontSize: 13
  },
  button: {
    backgroundColor: "#2b3645",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignSelf: "flex-start"
  },
  buttonLabel: {
    color: "#f4f7fb",
    fontSize: 13
  },
  input: {
    backgroundColor: "#0f141b",
    color: "#f4f7fb",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8
  },
  codeEditor: {
    fontFamily: "monospace",
    minHeight: 220,
    textAlignVertical: "top"
  },
  divider: {
    height: 1,
    backgroundColor: "#2b3645",
    marginVertical: 8
  }
});
