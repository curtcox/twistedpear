import { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import type { WidgetNode, WidgetStyle, WidgetTree } from "@twistedpear/miniapp-runtime/ui";

// Keep component/prop mapping aligned with describeWidgetTree() in miniapp-runtime (ui-golden tests).

export function MiniappWidgetTree({
  tree,
  onEvent,
  readDocument
}: {
  readonly tree: WidgetTree | null;
  readonly onEvent?: (nodeId: string, event: string, value?: unknown) => void;
  readonly readDocument?: (documentId: string) => Promise<string>;
}) {
  if (tree === null) {
    return <Text style={styles.muted}>No widget tree</Text>;
  }

  return <WidgetNodeView node={tree.root} {...(onEvent === undefined ? {} : { onEvent })} {...(readDocument === undefined ? {} : { readDocument })} />;
}

function ScrollWidget({
  node,
  style,
  onEvent,
  readDocument
}: {
  readonly node: WidgetNode;
  readonly style: ReturnType<typeof widgetStyle>;
  readonly onEvent?: (nodeId: string, event: string, value?: unknown) => void;
  readonly readDocument?: (documentId: string) => Promise<string>;
}) {
  const scrollRef = useRef<ScrollView>(null);
  const offset = typeof node.props?.scrollOffset === "number" ? node.props.scrollOffset : 0;

  useEffect(() => {
    if (offset > 0) {
      scrollRef.current?.scrollTo({ y: offset, animated: false });
    }
  }, [node.id, offset]);

  return (
    <ScrollView
      ref={scrollRef}
      style={style}
      testID={node.id}
      onScroll={(event) => {
        const name = node.props?.event;
        if (typeof name === "string") {
          onEvent?.(node.id, name, { y: event.nativeEvent.contentOffset.y });
        }
      }}
      scrollEventThrottle={100}
    >
      {node.children?.map((child) => (
        <WidgetNodeView key={child.id} node={child} {...(onEvent === undefined ? {} : { onEvent })} {...(readDocument === undefined ? {} : { readDocument })} />
      ))}
    </ScrollView>
  );
}

function CodeEditorWidget({
  node,
  style,
  onEvent,
  readDocument
}: {
  readonly node: WidgetNode;
  readonly style: ReturnType<typeof widgetStyle>;
  readonly onEvent?: (nodeId: string, event: string, value?: unknown) => void;
  readonly readDocument?: (documentId: string) => Promise<string>;
}) {
  const baseline = useRef("");
  const [content, setContent] = useState("");
  const documentId = String(node.props?.documentId ?? "");
  useEffect(() => {
    let active = true;
    if (readDocument !== undefined && documentId.length > 0) {
      void readDocument(documentId).then((next) => {
        if (active) {
          baseline.current = next;
          setContent(next);
        }
      });
    }
    return () => { active = false; };
  }, [documentId, readDocument]);
  return (
    <TextInput
      testID={node.id}
      style={[styles.input, styles.codeEditor, style]}
      multiline
      autoCapitalize="none"
      autoCorrect={false}
      editable={!node.props?.readOnly}
      placeholder={documentId}
      value={content}
      onChangeText={(text) => {
        setContent(text);
        const event = node.props?.event;
        if (typeof event === "string") {
          const before = baseline.current;
          const edit = minimalTextEdit(before, text);
          if (edit !== null) {
            onEvent?.(node.id, event, {
              documentId,
              baseLength: before.length,
              edits: [edit]
            });
            baseline.current = text;
          }
        }
      }}
    />
  );
}

function WidgetNodeView({
  node,
  onEvent,
  readDocument
}: {
  readonly node: WidgetNode;
  readonly onEvent?: (nodeId: string, event: string, value?: unknown) => void;
  readonly readDocument?: (documentId: string) => Promise<string>;
}) {
  const style = widgetStyle(node.style);

  switch (node.type) {
    case "view":
      return (
        <View style={style} testID={node.id}>
          {node.children?.map((child) => (
            <WidgetNodeView key={child.id} node={child} {...(onEvent === undefined ? {} : { onEvent })} {...(readDocument === undefined ? {} : { readDocument })} />
          ))}
        </View>
      );
    case "text":
      return (
        <Text style={style} testID={node.id}>
          {String(node.props?.value ?? "")}
        </Text>
      );
    case "button":
      return (
        <Pressable
          testID={node.id}
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
          testID={node.id}
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
          testID={node.id}
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
      return <ScrollWidget node={node} style={style} {...(onEvent === undefined ? {} : { onEvent })} {...(readDocument === undefined ? {} : { readDocument })} />;
    case "divider":
      return <View testID={node.id} style={[styles.divider, style]} />;
    case "spacer":
      return <View testID={node.id} style={[{ height: 8 }, style]} />;
    case "progress":
      return (
        <Text testID={node.id} style={style}>
          Progress {String(node.props?.value ?? 0)}%
        </Text>
      );
    case "list":
      return (
        <View testID={node.id} style={style}>
          {(Array.isArray(node.props?.items) ? node.props.items : []).map((item, index) => (
            <Text key={`${node.id}-${index}`} style={styles.muted}>
              {typeof item === "string" ? item : JSON.stringify(item)}
            </Text>
          ))}
        </View>
      );
    case "image":
      return (
        <Text testID={node.id} style={style}>
          image:{String(node.props?.asset ?? "")}
        </Text>
      );
    case "code-editor":
      return <CodeEditorWidget node={node} style={style} {...(onEvent === undefined ? {} : { onEvent })} {...(readDocument === undefined ? {} : { readDocument })} />;
    case "qr-code":
      return (
        <View testID={node.id} style={style}>
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

function minimalTextEdit(before: string, after: string) {
  if (before === after) return null;
  let start = 0;
  while (start < before.length && start < after.length && before[start] === after[start]) start += 1;
  let beforeEnd = before.length;
  let afterEnd = after.length;
  while (beforeEnd > start && afterEnd > start && before[beforeEnd - 1] === after[afterEnd - 1]) {
    beforeEnd -= 1;
    afterEnd -= 1;
  }
  return { start, end: beforeEnd, text: after.slice(start, afterEnd) };
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
