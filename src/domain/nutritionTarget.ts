import type { NutritionTarget } from './types'

/**
 * 1日の栄養の目標の初期値。
 *
 * 体格も活動量も人によって違うため、ここは「まず記録を始められる値」に留める。
 * 設定画面から変更できる。
 * PFC は 2,000kcal を たんぱく質24% / 脂質25% / 炭水化物51% で割った目安。
 */
export const DEFAULT_NUTRITION_TARGET: NutritionTarget = {
  kcal: 2000,
  protein: 120,
  fat: 55,
  carb: 255,
}

export const MAX_TARGET_KCAL = 10000
export const MAX_TARGET_GRAMS = 1000

/** 目標に対する達成度（%）。0除算と極端な値を画面に出さない。 */
export function calcAchievementPercent(actual: number, target: number): number {
  if (target <= 0) return 0
  return Math.round((actual / target) * 100)
}

/** 入力された目標を、扱える範囲の整数に整える。 */
export function normalizeNutritionTarget(target: NutritionTarget): NutritionTarget {
  const clamp = (value: number, max: number) =>
    Number.isFinite(value) ? Math.min(max, Math.max(0, Math.round(value))) : 0

  return {
    kcal: clamp(target.kcal, MAX_TARGET_KCAL),
    protein: clamp(target.protein, MAX_TARGET_GRAMS),
    fat: clamp(target.fat, MAX_TARGET_GRAMS),
    carb: clamp(target.carb, MAX_TARGET_GRAMS),
  }
}
