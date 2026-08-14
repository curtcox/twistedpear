/**
 * Page/renderer-side browser device effects. Used by host chrome to answer
 * `device-sense` / `device-availability` bridge requests from a worklet DeviceManager.
 * Never import this into Sans-IO protocol code.
 */

export type BrowserDeviceAvailability =
  | "available"
  | "permission-required"
  | "unsupported"
  | "busy"
  | "policy-disabled"
  | "offline";

type BrowserNavigator = {
  readonly geolocation?: {
    getCurrentPosition(
      success: (position: {
        coords: {
          latitude: number;
          longitude: number;
          accuracy: number;
          altitude: number | null;
          speed: number | null;
          heading: number | null;
        };
      }) => void,
      error?: (error: { code: number; message: string }) => void,
      options?: {
        enableHighAccuracy?: boolean;
        timeout?: number;
        maximumAge?: number;
      },
    ): void;
  };
  readonly permissions?: {
    query(descriptor: { name: string }): Promise<{ state: string }>;
  };
  readonly mediaDevices?: {
    getUserMedia(constraints: MediaStreamConstraints): Promise<MediaStream>;
  };
};

function browserNavigator(): BrowserNavigator | undefined {
  return (globalThis as { navigator?: BrowserNavigator }).navigator;
}

async function locationAvailability(
  nav: ReturnType<typeof browserNavigator>,
): Promise<BrowserDeviceAvailability> {
  if (nav?.geolocation === undefined) return "unsupported";
  try {
    const status = await nav.permissions?.query({ name: "geolocation" });
    if (status?.state === "denied") return "offline";
    if (status?.state === "prompt") return "permission-required";
  } catch {
    // Permissions API may reject unknown names; geolocation can still work.
  }
  return "available";
}

function mediaAvailability(
  nav: ReturnType<typeof browserNavigator>,
): BrowserDeviceAvailability {
  if (typeof nav?.mediaDevices?.getUserMedia !== "function")
    return "unsupported";
  return "permission-required";
}

function namedApiAvailability(present: boolean): BrowserDeviceAvailability {
  return present ? "available" : "unsupported";
}

export async function browserDeviceAvailability(
  classId: string,
): Promise<BrowserDeviceAvailability> {
  const nav = browserNavigator();
  switch (classId) {
    case "location":
      return locationAvailability(nav);
    case "camera":
    case "microphone":
      return mediaAvailability(nav);
    case "battery": {
      const getBattery = (
        nav as {
          getBattery?: () => Promise<{ level: number; charging: boolean }>;
        }
      ).getBattery;
      return namedApiAvailability(typeof getBattery === "function");
    }
    case "tts":
      return namedApiAvailability(
        (globalThis as { speechSynthesis?: SpeechSynthesis })
          .speechSynthesis !== undefined,
      );
    case "haptics":
      return namedApiAvailability(
        typeof (nav as { vibrate?: (pattern: number | number[]) => boolean })
          .vibrate === "function",
      );
    default:
      return "unsupported";
  }
}

export async function browserDeviceSense(
  classId: string,
  options: Readonly<Record<string, unknown>> = {},
): Promise<unknown> {
  if (classId === "location") {
    return senseBrowserLocation(options.enableHighAccuracy === true);
  }
  if (classId === "camera") {
    return senseBrowserCamera(options);
  }
  if (classId === "microphone") {
    return senseBrowserMicrophone(options);
  }
  if (classId === "battery") {
    return senseBrowserBattery();
  }
  throw new Error(`No browser sense effect for device class "${classId}".`);
}

export async function browserDeviceActuate(
  classId: string,
  command: Readonly<Record<string, unknown>>,
): Promise<void> {
  if (classId === "tts" && command.kind === "tts") {
    await actuateBrowserTts(
      String(command.text ?? ""),
      typeof command.rate === "number" ? command.rate : 1,
    );
    return;
  }
  if (classId === "haptics" && command.kind === "haptics") {
    actuateBrowserHaptics(
      Array.isArray(command.patternMs) ? (command.patternMs as number[]) : [40],
    );
    return;
  }
  throw new Error(`No browser actuate effect for device class "${classId}".`);
}

async function senseBrowserBattery(): Promise<{
  bucket: "nominal" | "low" | "critical" | "unknown";
}> {
  const nav = browserNavigator() as {
    getBattery?: () => Promise<{ level: number; charging: boolean }>;
  };
  if (typeof nav.getBattery !== "function") {
    throw new Error("Battery Status API is unavailable in this browser.");
  }
  const battery = await nav.getBattery();
  const level = battery.level;
  if (!Number.isFinite(level)) return { bucket: "unknown" };
  if (level <= 0.1) return { bucket: "critical" };
  if (level <= 0.25) return { bucket: "low" };
  return { bucket: "nominal" };
}

function actuateBrowserTts(text: string, rate: number): Promise<void> {
  const speech = (
    globalThis as {
      speechSynthesis?: SpeechSynthesis;
      SpeechSynthesisUtterance?: typeof SpeechSynthesisUtterance;
    }
  ).speechSynthesis;
  const Utterance = (
    globalThis as { SpeechSynthesisUtterance?: typeof SpeechSynthesisUtterance }
  ).SpeechSynthesisUtterance;
  if (speech === undefined || Utterance === undefined) {
    return Promise.reject(
      new Error("Speech synthesis is unavailable in this browser."),
    );
  }
  return new Promise((resolve, reject) => {
    const utterance = new Utterance(text);
    utterance.rate = Math.max(0.5, Math.min(2, rate));
    utterance.onend = () => resolve();
    utterance.onerror = () => reject(new Error("Speech synthesis failed."));
    speech.speak(utterance);
  });
}

function actuateBrowserHaptics(patternMs: ReadonlyArray<number>): void {
  const vibrate = (
    browserNavigator() as { vibrate?: (pattern: number | number[]) => boolean }
  ).vibrate;
  if (typeof vibrate !== "function") {
    throw new Error("Vibration is unavailable in this browser.");
  }
  vibrate([...patternMs]);
}

function senseBrowserLocation(enableHighAccuracy: boolean): Promise<{
  latitude: number;
  longitude: number;
  accuracyM: number;
  altitudeM?: number;
  speedMps?: number;
  headingDeg?: number;
}> {
  const geo = browserNavigator()?.geolocation;
  if (geo === undefined) {
    return Promise.reject(
      new Error("Geolocation is unavailable in this browser."),
    );
  }
  return new Promise((resolve, reject) => {
    geo.getCurrentPosition(
      (position) => {
        const coords = position.coords;
        resolve({
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracyM: coords.accuracy,
          ...(coords.altitude !== null ? { altitudeM: coords.altitude } : {}),
          ...(coords.speed !== null ? { speedMps: coords.speed } : {}),
          ...(coords.heading !== null ? { headingDeg: coords.heading } : {}),
        });
      },
      (error) =>
        reject(
          new Error(error.message || `Geolocation failed (${error.code})`),
        ),
      { enableHighAccuracy, timeout: 15_000, maximumAge: 5_000 },
    );
  });
}

async function senseBrowserCamera(
  options: Readonly<Record<string, unknown>>,
): Promise<
  | {
      barcodes: ReadonlyArray<{ format: string; value: string }>;
      motionDetected: boolean;
      faceCount: number;
      objectCount: number;
      thumbnail?: {
        width: number;
        height: number;
        format: "rgba8";
        bytes: Uint8Array;
      };
    }
  | { width: number; height: number; format: "rgba8"; bytes: Uint8Array }
> {
  const nav = browserNavigator();
  if (typeof nav?.mediaDevices?.getUserMedia !== "function") {
    throw new Error("Camera capture is unavailable in this browser.");
  }
  const rawFrames = options.tier === "frames";
  const stream = await nav.mediaDevices.getUserMedia({
    video: {
      facingMode: { ideal: "environment" },
      width: { ideal: 640 },
      height: { ideal: 480 },
    },
    audio: false,
  });
  try {
    if (rawFrames) return captureBrowserCameraFrame(stream);
    const barcodes = await detectBarcodesFromStream(stream);
    return {
      barcodes,
      motionDetected: false,
      faceCount: 0,
      objectCount: barcodes.length > 0 ? 1 : 0,
    };
  } finally {
    for (const track of stream.getTracks()) track.stop();
  }
}

async function captureBrowserCameraFrame(stream: MediaStream): Promise<{
  width: number;
  height: number;
  format: "rgba8";
  bytes: Uint8Array;
}> {
  const doc = (globalThis as { document?: Document }).document;
  if (doc === undefined)
    throw new Error("Camera frame capture requires a host document.");
  const video = doc.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.srcObject = stream;
  await video.play();
  await new Promise((resolve) => setTimeout(resolve, 120));
  try {
    const width = Math.max(1, Math.min(512, video.videoWidth || 512));
    const height = Math.max(1, Math.min(384, video.videoHeight || 384));
    const canvas = doc.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (context === null) throw new Error("Camera canvas is unavailable.");
    context.drawImage(video, 0, 0, width, height);
    return {
      width,
      height,
      format: "rgba8",
      bytes: new Uint8Array(context.getImageData(0, 0, width, height).data),
    };
  } finally {
    video.pause();
    video.srcObject = null;
  }
}

async function detectBarcodesFromStream(
  stream: MediaStream,
): Promise<ReadonlyArray<{ format: string; value: string }>> {
  const doc = (globalThis as { document?: Document }).document;
  const BarcodeDetectorCtor = (
    globalThis as {
      BarcodeDetector?: new (options?: { formats?: string[] }) => {
        detect(
          source: CanvasImageSource,
        ): Promise<ReadonlyArray<{ rawValue: string; format: string }>>;
      };
    }
  ).BarcodeDetector;
  if (doc === undefined || BarcodeDetectorCtor === undefined) {
    return [];
  }
  const video = doc.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.srcObject = stream;
  await video.play();
  await new Promise((resolve) => setTimeout(resolve, 250));
  try {
    const detector = new BarcodeDetectorCtor({
      formats: ["qr_code", "aztec", "pdf417", "data_matrix"],
    });
    const results = await detector.detect(video);
    return results.map((entry) => ({
      format: entry.format === "qr_code" ? "qr" : entry.format,
      value: entry.rawValue,
    }));
  } catch {
    return [];
  } finally {
    video.pause();
    video.srcObject = null;
  }
}

async function senseBrowserMicrophone(
  options: Readonly<Record<string, unknown>>,
): Promise<
  | {
      level: number;
      voiceActive: boolean;
      tones: ReadonlyArray<string>;
    }
  | { sampleRate: number; channels: number; samples: Float32Array }
> {
  const nav = browserNavigator();
  const AudioContextCtor =
    (
      globalThis as {
        AudioContext?: typeof AudioContext;
        webkitAudioContext?: typeof AudioContext;
      }
    ).AudioContext ??
    (globalThis as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (
    typeof nav?.mediaDevices?.getUserMedia !== "function" ||
    AudioContextCtor === undefined
  ) {
    throw new Error("Microphone capture is unavailable in this browser.");
  }
  const voiceDuplex = options.voiceDuplex === true;
  const stream = await nav.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: voiceDuplex,
      noiseSuppression: voiceDuplex,
      autoGainControl: voiceDuplex,
      channelCount: 1,
    },
    video: false,
  });
  const context = new AudioContextCtor();
  try {
    const source = context.createMediaStreamSource(stream);
    const analyser = context.createAnalyser();
    analyser.fftSize = 2048;
    source.connect(analyser);
    await new Promise((resolve) => setTimeout(resolve, 120));
    const floatData = new Float32Array(analyser.fftSize);
    analyser.getFloatTimeDomainData(floatData);
    if (options.tier === "pcm")
      return {
        sampleRate: context.sampleRate,
        channels: 1,
        samples: floatData,
      };
    let sumSquares = 0;
    for (const sample of floatData) sumSquares += sample * sample;
    const rms = Math.sqrt(sumSquares / floatData.length);
    const level = Math.min(1, Math.max(0, rms * 4));
    return {
      level,
      voiceActive: level > 0.08,
      tones: [],
    };
  } finally {
    for (const track of stream.getTracks()) track.stop();
    await context.close();
  }
}
