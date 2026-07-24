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
      options?: { enableHighAccuracy?: boolean; timeout?: number; maximumAge?: number }
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

export async function browserDeviceAvailability(classId: string): Promise<BrowserDeviceAvailability> {
  const nav = browserNavigator();
  if (classId === "location") {
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
  if (classId === "camera" || classId === "microphone") {
    if (typeof nav?.mediaDevices?.getUserMedia !== "function") return "unsupported";
    return "permission-required";
  }
  return "unsupported";
}

export async function browserDeviceSense(
  classId: string,
  options: Readonly<Record<string, unknown>> = {}
): Promise<unknown> {
  if (classId === "location") {
    return senseBrowserLocation(options.enableHighAccuracy === true);
  }
  if (classId === "camera") {
    return senseBrowserCamera();
  }
  if (classId === "microphone") {
    return senseBrowserMicrophone();
  }
  throw new Error(`No browser effect for device class "${classId}".`);
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
    return Promise.reject(new Error("Geolocation is unavailable in this browser."));
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
          ...(coords.heading !== null ? { headingDeg: coords.heading } : {})
        });
      },
      (error) => reject(new Error(error.message || `Geolocation failed (${error.code})`)),
      { enableHighAccuracy, timeout: 15_000, maximumAge: 5_000 }
    );
  });
}

async function senseBrowserCamera(): Promise<{
  barcodes: ReadonlyArray<{ format: string; value: string }>;
  motionDetected: boolean;
  faceCount: number;
  objectCount: number;
  thumbnail?: { width: number; height: number; format: "rgba8"; bytes: Uint8Array };
}> {
  const nav = browserNavigator();
  if (typeof nav?.mediaDevices?.getUserMedia !== "function") {
    throw new Error("Camera capture is unavailable in this browser.");
  }
  const stream = await nav.mediaDevices.getUserMedia({
    video: { facingMode: { ideal: "environment" }, width: { ideal: 640 }, height: { ideal: 480 } },
    audio: false
  });
  try {
    const barcodes = await detectBarcodesFromStream(stream);
    return {
      barcodes,
      motionDetected: false,
      faceCount: 0,
      objectCount: barcodes.length > 0 ? 1 : 0
    };
  } finally {
    for (const track of stream.getTracks()) track.stop();
  }
}

async function detectBarcodesFromStream(
  stream: MediaStream
): Promise<ReadonlyArray<{ format: string; value: string }>> {
  const doc = (globalThis as { document?: Document }).document;
  const BarcodeDetectorCtor = (
    globalThis as {
      BarcodeDetector?: new (options?: { formats?: string[] }) => {
        detect(source: CanvasImageSource): Promise<ReadonlyArray<{ rawValue: string; format: string }>>;
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
    const detector = new BarcodeDetectorCtor({ formats: ["qr_code", "aztec", "pdf417", "data_matrix"] });
    const results = await detector.detect(video);
    return results.map((entry) => ({
      format: entry.format === "qr_code" ? "qr" : entry.format,
      value: entry.rawValue
    }));
  } catch {
    return [];
  } finally {
    video.pause();
    video.srcObject = null;
  }
}

async function senseBrowserMicrophone(): Promise<{
  level: number;
  voiceActive: boolean;
  tones: ReadonlyArray<string>;
}> {
  const nav = browserNavigator();
  const AudioContextCtor =
    (globalThis as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext })
      .AudioContext ??
    (globalThis as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (typeof nav?.mediaDevices?.getUserMedia !== "function" || AudioContextCtor === undefined) {
    throw new Error("Microphone capture is unavailable in this browser.");
  }
  const stream = await nav.mediaDevices.getUserMedia({
    audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
    video: false
  });
  const context = new AudioContextCtor();
  try {
    const source = context.createMediaStreamSource(stream);
    const analyser = context.createAnalyser();
    analyser.fftSize = 2048;
    source.connect(analyser);
    await new Promise((resolve) => setTimeout(resolve, 120));
    const data = new Uint8Array(analyser.fftSize);
    analyser.getByteTimeDomainData(data);
    let sumSquares = 0;
    for (const sample of data) {
      const centered = (sample - 128) / 128;
      sumSquares += centered * centered;
    }
    const rms = Math.sqrt(sumSquares / data.length);
    const level = Math.min(1, Math.max(0, rms * 4));
    return {
      level,
      voiceActive: level > 0.08,
      tones: []
    };
  } finally {
    for (const track of stream.getTracks()) track.stop();
    await context.close();
  }
}
