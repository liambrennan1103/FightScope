/**
 * Temperature scaling for joint softmax — fitted on validation Brier/logloss.
 */

export type CalibrationParams = {
  temperature: number;
  shrinkStrength: number;
};

export const DEFAULT_CALIBRATION: CalibrationParams = {
  temperature: 1.15,
  shrinkStrength: 0.55,
};

let LIVE_CALIBRATION: CalibrationParams = { ...DEFAULT_CALIBRATION };

export function getCalibration(): CalibrationParams {
  return LIVE_CALIBRATION;
}

export function setCalibration(params: CalibrationParams): void {
  LIVE_CALIBRATION = params;
}

export function logLossBinary(p: number, y: 0 | 1): number {
  const eps = 1e-7;
  const pp = Math.min(1 - eps, Math.max(eps, p));
  return -(y * Math.log(pp) + (1 - y) * Math.log(1 - pp));
}

export function brierBinary(p: number, y: 0 | 1): number {
  return (p - y) ** 2;
}

/** Expected Calibration Error over fixed buckets on P(favorite). */
export function expectedCalibrationError(
  rows: Array<{ p: number; y: 0 | 1 }>,
  edges = [0.5, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8, 0.9, 1.01],
): { ece: number; buckets: Array<{ lo: number; hi: number; n: number; avgP: number; avgY: number }> } {
  const buckets = [];
  let ece = 0;
  let total = rows.length || 1;
  for (let i = 0; i < edges.length - 1; i += 1) {
    const lo = edges[i]!;
    const hi = edges[i + 1]!;
    const inBucket = rows.filter((r) => r.p >= lo && r.p < hi);
    if (!inBucket.length) {
      buckets.push({ lo, hi, n: 0, avgP: 0, avgY: 0 });
      continue;
    }
    const avgP = inBucket.reduce((s, r) => s + r.p, 0) / inBucket.length;
    const avgY = inBucket.reduce((s, r) => s + r.y, 0) / inBucket.length;
    ece += (inBucket.length / total) * Math.abs(avgP - avgY);
    buckets.push({ lo, hi, n: inBucket.length, avgP, avgY });
  }
  return { ece, buckets };
}
