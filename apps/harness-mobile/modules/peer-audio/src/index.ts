import { requireNativeModule } from "expo-modules-core";
import { Platform } from "react-native";

interface NativePeerAudio {
  requestPermission?(): Promise<boolean>;
  playPcm16(pcm: Uint8Array, sampleRate: number): Promise<boolean>;
  recordPcm16(durationMs: number, sampleRate: number): Promise<Uint8Array>;
  recordVoicePcm16?(durationMs: number, sampleRate: number): Promise<Uint8Array>;
}

function loadNativePeerAudio(): NativePeerAudio | null {
  if (Platform.OS !== "android" && Platform.OS !== "ios") {
    return null;
  }
  try {
    return requireNativeModule<NativePeerAudio>("TwistedPearPeerAudio");
  } catch {
    // Dev client may predate the peer-audio native module; host UI must still boot.
    return null;
  }
}

const Native = loadNativePeerAudio();

export function nativePeerAudioSupported(): boolean {
  return Native !== null;
}

export async function requestNativePeerAudioPermission(): Promise<boolean> {
  if (Native === null) {
    return false;
  }
  return Native.requestPermission === undefined ? true : Native.requestPermission();
}

export async function playNativePeerPcm(pcm: Uint8Array, sampleRate: number): Promise<void> {
  if (Native === null) {
    throw new Error("Native peer audio is unavailable");
  }
  await Native.playPcm16(pcm, sampleRate);
}

export async function recordNativePeerPcm(
  durationMs: number,
  sampleRate: number,
  voiceDuplex = false
): Promise<Uint8Array> {
  if (Native === null) {
    throw new Error("Native peer audio is unavailable");
  }
  const bytes =
    voiceDuplex && Native.recordVoicePcm16 !== undefined
      ? await Native.recordVoicePcm16(durationMs, sampleRate)
      : await Native.recordPcm16(durationMs, sampleRate);
  return bytes instanceof Uint8Array ? bytes : Uint8Array.from(bytes as ArrayLike<number>);
}
