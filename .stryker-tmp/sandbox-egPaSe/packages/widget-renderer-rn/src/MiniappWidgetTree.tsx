// @ts-nocheck
import { createContext, useContext, useEffect, useRef, useState, type ReactElement } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { visitWidget, type WidgetNode, type WidgetStyle, type WidgetTree } from "@twistedpear/miniapp-runtime/ui";

// Keep component/prop mapping aligned with describeWidgetTree() in miniapp-runtime (ui-golden tests).

// An app references bitmap/vector art by name (the image widget's `asset` prop); the host
// supplies the actual bytes. Passing the map through context keeps it out of every recursive
// WidgetNodeView call, which only ever threads onEvent/readDocument.
const AssetContext = createContext<Readonly<Record<string, string>>>({});

export function MiniappWidgetTree({
  tree,
  onEvent,
  readDocument,
  assets,
  deviceSessions
}: {
  readonly tree: WidgetTree | null;
  readonly onEvent?: (nodeId: string, event: string, value?: unknown) => void;
  readonly readDocument?: (documentId: string) => Promise<string>;
  readonly assets?: Readonly<Record<string, string>>;
  readonly deviceSessions?: ReadonlyArray<{
    readonly handle: string;
    readonly classId: string;
    readonly tierId: string;
    readonly appId: string;
  }>;
}) {
  if (tree === null) {
    return <Text style={styles.muted}>No widget tree</Text>;
  }

  return (
    <AssetContext.Provider value={assets ?? {}}>
      <DeviceSessionContext.Provider value={deviceSessions ?? []}>
        <WidgetNodeView node={tree.root} {...(onEvent === undefined ? {} : { onEvent })} {...(readDocument === undefined ? {} : { readDocument })} />
      </DeviceSessionContext.Provider>
    </AssetContext.Provider>
  );
}

const DeviceSessionContext = createContext<
  ReadonlyArray<{
    readonly handle: string;
    readonly classId: string;
    readonly tierId: string;
    readonly appId: string;
  }>
>([]);

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
  const assets = useContext(AssetContext);
  const childProps = {
    ...(onEvent === undefined ? {} : { onEvent }),
    ...(readDocument === undefined ? {} : { readDocument })
  };

  return visitWidget(node, {
    view: (n) => (
      <View style={style} testID={n.id}>
        {n.children?.map((child) => (
          <WidgetNodeView key={child.id} node={child} {...childProps} />
        ))}
      </View>
    ),
    text: (n) => (
      <Text style={[styles.text, style]} testID={n.id}>
        {String(n.props?.value ?? "")}
      </Text>
    ),
    button: (n) => (
      <Pressable
        testID={n.id}
        style={[styles.button, style]}
        onPress={() => {
          const event = n.props?.event;
          if (typeof event === "string") {
            onEvent?.(n.id, event);
          }
        }}
      >
        <Text style={styles.buttonLabel}>{String(n.props?.label ?? "Button")}</Text>
      </Pressable>
    ),
    "text-input": (n) => (
      <TextInput
        testID={n.id}
        style={[styles.input, style]}
        defaultValue={String(n.props?.value ?? "")}
        placeholder={String(n.props?.placeholder ?? "")}
        onChangeText={(value) => {
          const event = n.props?.event;
          if (typeof event === "string") {
            onEvent?.(n.id, event, value);
          }
        }}
      />
    ),
    switch: (n) => (
      <Switch
        testID={n.id}
        value={Boolean(n.props?.value)}
        onValueChange={(value) => {
          const event = n.props?.event;
          if (typeof event === "string") {
            onEvent?.(n.id, event, value);
          }
        }}
      />
    ),
    scroll: (n) => <ScrollWidget node={n} style={style} {...childProps} />,
    divider: (n) => <View testID={n.id} style={[styles.divider, style]} />,
    spacer: (n) => <View testID={n.id} style={[{ height: 8 }, style]} />,
    progress: (n) => (
      <Text testID={n.id} style={[styles.text, style]}>
        Progress {String(n.props?.value ?? 0)}%
      </Text>
    ),
    list: (n) => (
      <View testID={n.id} style={style}>
        {n.children?.map((child) => (
          <WidgetNodeView key={child.id} node={child} {...childProps} />
        ))}
        {(Array.isArray(n.props?.items) ? n.props.items : []).map((item, index) => (
          <Text key={`${n.id}-${index}`} style={styles.muted}>
            {typeof item === "string" ? item : JSON.stringify(item)}
          </Text>
        ))}
      </View>
    ),
    image: (n) => {
      const assetName = String(n.props?.asset ?? "");
      const svg = assets[assetName];
      const alt = typeof n.props?.alt === "string" ? n.props.alt : assetName;
      if (svg !== undefined) {
        const width = typeof n.style?.width === "number" ? n.style.width : 40;
        const height = typeof n.style?.height === "number" ? n.style.height : 40;
        return (
          <Image
            testID={n.id}
            accessibilityLabel={alt}
            resizeMode="contain"
            // Pre-encode into a bare `data:image/svg+xml,` URI. react-native-web only
            // re-encodes URIs carrying its `;utf8,` marker, and that path truncates
            // multi-line SVGs (its regex stops at the first newline), so we avoid it.
            source={{ uri: `data:image/svg+xml,${encodeURIComponent(svg)}` }}
            style={[{ width, height }, style]}
          />
        );
      }
      // No asset supplied for this name: keep the readable placeholder the golden tests expect.
      return (
        <Text testID={n.id} style={[styles.text, style]}>
          image:{assetName}
        </Text>
      );
    },
    "code-editor": (n) => <CodeEditorWidget node={n} style={style} {...childProps} />,
    "qr-code": (n) => (
      <View testID={n.id} style={style}>
        <Text selectable style={styles.muted}>
          {String(n.props?.value ?? "")}
        </Text>
        {typeof n.props?.caption === "string" ? (
          <Text style={styles.muted}>{n.props.caption}</Text>
        ) : null}
      </View>
    ),
    "camera-preview": (n) => <PreviewSurface node={n} style={style} />,
    "audio-meter": (n) => <PreviewSurface node={n} style={style} />,
    waveform: (n) => <PreviewSurface node={n} style={style} />,
    "map-preview": (n) => <PreviewSurface node={n} style={style} />,
    "remote-video": (n) => <PreviewSurface node={n} style={style} />
  }) as ReactElement;
}
function PreviewSurface({
  node,
  style
}: {
  readonly node: WidgetNode;
  readonly style: ReturnType<typeof widgetStyle>;
}) {
  const sessions = useContext(DeviceSessionContext);
  const session = String(node.props?.session ?? "");
  const live = sessions.find((entry) => entry.handle === session);
  const label = live
    ? `${node.type} · ${live.classId}:${live.tierId} · ${live.appId}`
    : `${node.type} · waiting for session`;

  return (
    <View testID={node.id} style={[styles.previewSurface, style]}>
      <Text style={styles.muted}>{label}</Text>
      {node.type === "camera-preview" && live?.classId === "camera" ? (
        <Text style={styles.muted}>Host camera preview (pixels stay in chrome)</Text>
      ) : null}
      {node.type === "map-preview" && live?.classId === "location" ? (
        <Text style={styles.muted}>
          Host map preview · zoom {String(node.props?.zoom ?? 12)}
        </Text>
      ) : null}
      {node.type === "audio-meter" || node.type === "waveform" ? (
        <View style={styles.previewMeter} />
      ) : null}
      {node.type === "remote-video" ? (
        <Text style={styles.muted}>Remote video shell · peer={String(node.props?.peer ?? "—")}</Text>
      ) : null}
    </View>
  );
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
    ...(style.color !== undefined ? { color: style.color } : {}),
    fontSize: style.fontSize,
    fontWeight: style.fontWeight === "bold" ? "700" : style.fontWeight === "medium" ? "500" : "400"
  } as const;
}

const styles = StyleSheet.create({
  // Default for unset text colors on dark host chrome (RNW otherwise paints black).
  text: {
    color: "#e7ecf3"
  },
  muted: {
    color: "#9aa7b8",
    fontSize: 13
  },
  previewSurface: {
    backgroundColor: "#0f141b",
    borderRadius: 8,
    minHeight: 48,
    paddingHorizontal: 10,
    paddingVertical: 8,
    justifyContent: "center",
    gap: 6
  },
  previewMeter: {
    height: 8,
    borderRadius: 999,
    backgroundColor: "#2a5a3a"
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
