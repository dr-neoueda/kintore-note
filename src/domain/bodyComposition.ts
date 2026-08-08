import { roundTo } from './number'

/**
 * 体組成計の測定値から読み取れる値。
 *
 * Bluetooth 連携は行わない（iOS Safari は Web Bluetooth 非対応）。
 * 表示された数字を手で入れてもらう前提で、そこから導ける値を出す。
 */

const MASS_DECIMALS = 1

/** 除脂肪体重（kg）。筋量の増減を見るときは体重よりこちらを見る。 */
export function calcLeanBodyMassKg(
  weightKg: number,
  bodyFatPercent: number | null,
): number | null {
  if (bodyFatPercent === null) return null
  if (weightKg <= 0 || bodyFatPercent < 0 || bodyFatPercent >= 100) return null

  return roundTo(weightKg * (1 - bodyFatPercent / 100), MASS_DECIMALS)
}

/** 体脂肪量（kg）。 */
export function calcFatMassKg(
  weightKg: number,
  bodyFatPercent: number | null,
): number | null {
  const lean = calcLeanBodyMassKg(weightKg, bodyFatPercent)
  if (lean === null) return null

  return roundTo(weightKg - lean, MASS_DECIMALS)
}
