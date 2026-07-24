/**
 * Desktop renderer bridge for DeviceManager host-bridged drivers.
 * Uses Chromium geolocation / getUserMedia — same APIs as the web host.
 */

export async function handleDeviceBridgeRequest(message, send) {
  try {
    const result =
      message.op === "availability"
        ? await deviceAvailability(message.classId)
        : await deviceSense(message.classId, message.options ?? {});
    send({ type: "device-bridge-response", token: message.token, result });
  } catch (error) {
    send({
      type: "device-bridge-response",
      token: message.token,
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

async function deviceAvailability(classId) {
  if (classId === "location") {
    if (typeof navigator?.geolocation?.getCurrentPosition !== "function") return "unsupported";
    try {
      const status = await navigator.permissions?.query({ name: "geolocation" });
      if (status?.state === "denied") return "offline";
      if (status?.state === "prompt") return "permission-required";
    } catch {
      // ignore
    }
    return "available";
  }
  if (classId === "camera" || classId === "microphone") {
    if (typeof navigator?.mediaDevices?.getUserMedia !== "function") return "unsupported";
    return "permission-required";
  }
  return "unsupported";
}

async function deviceSense(classId, options) {
  if (classId === "location") {
    return senseLocation(options.enableHighAccuracy === true);
  }
  if (classId === "camera") {
    return senseCamera();
  }
  if (classId === "microphone") {
    return senseMicrophone();
  }
  throw new Error(`No desktop bridge for device class "${classId}".`);
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
          ...(coords.heading !== null ? { headingDeg: coords.heading } : {})
        });
      },
      (error) => reject(new Error(error.message || `Geolocation failed (${error.code})`)),
      { enableHighAccuracy, timeout: 15_000, maximumAge: 5_000 }
    );
  });
}

async function senseCamera() {
  if (typeof navigator?.mediaDevices?.getUserMedia !== "function") {
    throw new Error("Camera capture is unavailable.");
  }
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: { ideal: "environment" }, width: { ideal: 640 }, height: { ideal: 480 } },
    audio: false
  });
  try {
    const barcodes = await detectBarcodes(stream);
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

async function detectBarcodes(stream) {
  if (typeof BarcodeDetector !== "function") return [];
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.srcObject = stream;
  await video.play();
  await new Promise((resolve) => setTimeout(resolve, 250));
  try {
    const detector = new BarcodeDetector({ formats: ["qr_code", "aztec", "pdf417", "data_matrix"] });
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

async function senseMicrophone() {
  const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
  if (typeof navigator?.mediaDevices?.getUserMedia !== "function" || AudioContextCtor === undefined) {
    throw new Error("Microphone capture is unavailable.");
  }
  const stream = await navigator.mediaDevices.getUserMedia({
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
    return { level, voiceActive: level > 0.08, tones: [] };
  } finally {
    for (const track of stream.getTracks()) track.stop();
    await context.close();
  }
}
