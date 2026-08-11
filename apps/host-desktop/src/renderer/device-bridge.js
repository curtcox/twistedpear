/**
 * Desktop renderer bridge for DeviceManager host-bridged drivers.
 * Uses Chromium geolocation / getUserMedia / Battery / speechSynthesis / vibrate.
 */

export async function handleDeviceBridgeRequest(message, send) {
  try {
    const result =
      message.op === "availability"
        ? await deviceAvailability(message.classId)
        : message.op === "actuate"
          ? await deviceActuate(message.classId, message.command ?? {})
          : await deviceSense(message.classId, message.options ?? {});
    send({
      type: "device-bridge-response",
      token: message.token,
      result: jsonSafeDeviceResult(result),
    });
  } catch (error) {
    send({
      type: "device-bridge-response",
      token: message.token,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

function jsonSafeDeviceResult(value) {
  if (ArrayBuffer.isView(value)) return Array.from(value);
  if (Array.isArray(value)) return value.map(jsonSafeDeviceResult);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [
        key,
        jsonSafeDeviceResult(entry),
      ]),
    );
  }
  return value;
}

async function deviceAvailability(classId) {
  if (classId === "location") {
    if (typeof navigator?.geolocation?.getCurrentPosition !== "function")
      return "unsupported";
    try {
      const status = await navigator.permissions?.query({
        name: "geolocation",
      });
      if (status?.state === "denied") return "offline";
      if (status?.state === "prompt") return "permission-required";
    } catch {
      // ignore
    }
    return "available";
  }
  if (classId === "camera" || classId === "microphone") {
    if (typeof navigator?.mediaDevices?.getUserMedia !== "function")
      return "unsupported";
    return "permission-required";
  }
  if (classId === "battery") {
    return typeof navigator?.getBattery === "function"
      ? "available"
      : "unsupported";
  }
  if (classId === "tts") {
    return typeof speechSynthesis !== "undefined" ? "available" : "unsupported";
  }
  if (classId === "haptics") {
    return typeof navigator?.vibrate === "function"
      ? "available"
      : "unsupported";
  }
  return "unsupported";
}

async function deviceSense(classId, options) {
  if (classId === "location") {
    return senseLocation(options.enableHighAccuracy === true);
  }
  if (classId === "camera") {
    return senseCamera(options);
  }
  if (classId === "microphone") {
    return senseMicrophone(options);
  }
  if (classId === "battery") {
    return senseBattery();
  }
  throw new Error(`No desktop bridge for device class "${classId}".`);
}

async function deviceActuate(classId, command) {
  if (classId === "tts" && command.kind === "tts") {
    await speak(
      String(command.text ?? ""),
      typeof command.rate === "number" ? command.rate : 1,
    );
    return null;
  }
  if (classId === "haptics" && command.kind === "haptics") {
    if (typeof navigator?.vibrate !== "function")
      throw new Error("Vibration is unavailable.");
    navigator.vibrate(
      Array.isArray(command.patternMs) ? command.patternMs : [40],
    );
    return null;
  }
  throw new Error(`No desktop actuate bridge for "${classId}".`);
}

function senseLocation(enableHighAccuracy) {
  return new Promise((resolve, reject) => {
    if (typeof navigator?.geolocation?.getCurrentPosition !== "function") {
      reject(new Error("Geolocation is unavailable."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
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

async function senseCamera(options) {
  if (typeof navigator?.mediaDevices?.getUserMedia !== "function") {
    throw new Error("Camera capture is unavailable.");
  }
  const stream = await navigator.mediaDevices.getUserMedia({
    video: {
      facingMode: { ideal: "environment" },
      width: { ideal: 640 },
      height: { ideal: 480 },
    },
    audio: false,
  });
  try {
    if (options.tier === "frames") {
      const video = document.createElement("video");
      video.muted = true;
      video.playsInline = true;
      video.srcObject = stream;
      await video.play();
      await new Promise((resolve) => setTimeout(resolve, 120));
      try {
        const width = Math.max(1, Math.min(512, video.videoWidth || 512));
        const height = Math.max(1, Math.min(384, video.videoHeight || 384));
        const canvas = document.createElement("canvas");
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
    const barcodes = await detectBarcodes(stream);
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

async function detectBarcodes(stream) {
  if (typeof BarcodeDetector !== "function") return [];
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.srcObject = stream;
  await video.play();
  await new Promise((resolve) => setTimeout(resolve, 250));
  try {
    const detector = new BarcodeDetector({
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

async function senseMicrophone(options) {
  const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
  if (
    typeof navigator?.mediaDevices?.getUserMedia !== "function" ||
    AudioContextCtor === undefined
  ) {
    throw new Error("Microphone capture is unavailable.");
  }
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: options.voiceDuplex === true,
      noiseSuppression: options.voiceDuplex === true,
      autoGainControl: options.voiceDuplex === true,
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
    const data = new Float32Array(analyser.fftSize);
    analyser.getFloatTimeDomainData(data);
    if (options.tier === "pcm")
      return { sampleRate: context.sampleRate, channels: 1, samples: data };
    let sumSquares = 0;
    for (const sample of data) sumSquares += sample * sample;
    const rms = Math.sqrt(sumSquares / data.length);
    const level = Math.min(1, Math.max(0, rms * 4));
    return { level, voiceActive: level > 0.08, tones: [] };
  } finally {
    for (const track of stream.getTracks()) track.stop();
    await context.close();
  }
}

async function senseBattery() {
  if (typeof navigator?.getBattery !== "function") {
    throw new Error("Battery Status API is unavailable.");
  }
  const battery = await navigator.getBattery();
  const level = battery.level;
  if (!Number.isFinite(level)) return { bucket: "unknown" };
  if (level <= 0.1) return { bucket: "critical" };
  if (level <= 0.25) return { bucket: "low" };
  return { bucket: "nominal" };
}

function speak(text, rate) {
  return new Promise((resolve, reject) => {
    if (
      typeof speechSynthesis === "undefined" ||
      typeof SpeechSynthesisUtterance === "undefined"
    ) {
      reject(new Error("Speech synthesis is unavailable."));
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = Math.max(0.5, Math.min(2, rate));
    utterance.onend = () => resolve();
    utterance.onerror = () => reject(new Error("Speech synthesis failed."));
    speechSynthesis.speak(utterance);
  });
}
