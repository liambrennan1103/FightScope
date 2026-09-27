/**
 * Platt scaling (logistic calibration) fitted on validation predictions.
 * Fit ONLY on validation — never on final test labels.
 */

export type PlattParams = {
  a: number;
  b: number;
};

export const IDENTITY_PLATT: PlattParams = { a: 1, b: 0 };

/** Apply Platt: P' = sigmoid(a * logit(P) + b) */
export function applyPlatt(p: number, params: PlattParams): number {
  const eps = 1e-6;
  const pp = Math.min(1 - eps, Math.max(eps, p));
  const logit = Math.log(pp / (1 - pp));
  const z = params.a * logit + params.b;
  if (z > 20) return 1 - eps;
  if (z < -20) return eps;
  return 1 / (1 + Math.exp(-z));
}

/**
 * Fit Platt params by grid search minimizing log loss on validation rows.
 * Simple, deterministic, no external deps.
 */
export function fitPlatt(
  rows: Array<{ p: number; y: 0 | 1 }>,
): PlattParams {
  if (rows.length < 20) return { ...IDENTITY_PLATT };

  let best: PlattParams = { ...IDENTITY_PLATT };
  let bestLoss = Infinity;

  const aGrid = [0.4, 0.6, 0.8, 1.0, 1.2, 1.5, 1.8, 2.2];
  const bGrid = [-0.8, -0.4, -0.2, 0, 0.2, 0.4, 0.8];

  for (const a of aGrid) {
    for (const b of bGrid) {
      let loss = 0;
      for (const row of rows) {
        const p = applyPlatt(row.p, { a, b });
        const eps = 1e-7;
        const pp = Math.min(1 - eps, Math.max(eps, p));
        loss += -(row.y * Math.log(pp) + (1 - row.y) * Math.log(1 - pp));
      }
      loss /= rows.length;
      if (loss < bestLoss) {
        bestLoss = loss;
        best = { a, b };
      }
    }
  }
  return best;
}
