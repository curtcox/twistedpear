/** ~1 km cell size at the equator in degrees (111 km ≈ 1° latitude). */
const COARSE_CELL_DEG = 1 / 111;

export interface PreciseLocationFix {
  readonly latitude: number;
  readonly longitude: number;
  readonly accuracyM?: number;
  readonly altitudeM?: number;
  readonly speedMps?: number;
  readonly headingDeg?: number;
}

export interface CoarseLocationFix {
  readonly latitude: number;
  readonly longitude: number;
  readonly accuracyM: number;
}

/**
 * Quantize a precise fix to a host-side coarse cell so apps holding only
 * `device:location` never observe the precise coordinates.
 */
export function quantizeLocationCoarse(fix: PreciseLocationFix): CoarseLocationFix {
  const latitude = clamp(Math.round(fix.latitude / COARSE_CELL_DEG) * COARSE_CELL_DEG, -90, 90);
  const cosLat = Math.cos((latitude * Math.PI) / 180);
  const lonCell = cosLat === 0 ? COARSE_CELL_DEG : COARSE_CELL_DEG / Math.max(Math.abs(cosLat), 0.01);
  const longitude = wrapLongitude(Math.round(fix.longitude / lonCell) * lonCell);
  return {
    latitude,
    longitude,
    accuracyM: 1000
  };
}

export type AmbientLuxBucket = "dark" | "dim" | "indoor" | "bright" | "sunlit";

/** Quantize raw lux into coarse buckets — fingerprinting mitigation. */
export function quantizeAmbientLux(lux: number): AmbientLuxBucket {
  if (!Number.isFinite(lux) || lux < 0) return "dark";
  if (lux < 10) return "dark";
  if (lux < 50) return "dim";
  if (lux < 500) return "indoor";
  if (lux < 10000) return "bright";
  return "sunlit";
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function wrapLongitude(longitude: number): number {
  const wrapped = ((((longitude + 180) % 360) + 360) % 360) - 180;
  return wrapped === -180 ? 180 : wrapped;
}
