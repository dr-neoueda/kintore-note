import { roundTo, WEIGHT_DECIMALS } from './number'

/** Epley 式の分母。 */
const EPLEY_DIVISOR = 30

/** これを超える高回数では推定精度が実用に耐えないため、推定しない。 */
const MAX_REPS_FOR_ESTIMATE = 30

/**
 * Epley 式による推定1RM（1回だけ挙上できる最大重量）。
 * 推定できない入力では null を返す。
 */
export function estimateOneRepMax(weightKg: number, reps: number): number | null {
  if (weightKg <= 0) return null
  if (reps <= 0 || reps > MAX_REPS_FOR_ESTIMATE) return null
  if (reps === 1) return roundTo(weightKg, WEIGHT_DECIMALS)

  return roundTo(weightKg * (1 + reps / EPLEY_DIVISOR), WEIGHT_DECIMALS)
}
