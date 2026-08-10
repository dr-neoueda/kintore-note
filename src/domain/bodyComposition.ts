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

const BMI_DECIMALS = 1

/** 身長として受け付ける範囲（cm）。打ち間違いから桁違いの BMI が出るのを防ぐ。 */
export const MIN_HEIGHT_CM = 50
export const MAX_HEIGHT_CM = 250

/**
 * BMI。体重(kg) ÷ 身長(m)^2。
 * 身長を入れていなければ出さない。当て推量の数字は置かない。
 */
export function calcBmi(weightKg: number, heightCm: number | null): number | null {
  if (heightCm === null) return null
  if (heightCm < MIN_HEIGHT_CM || heightCm > MAX_HEIGHT_CM) return null
  if (!Number.isFinite(weightKg) || weightKg <= 0) return null

  const heightM = heightCm / 100
  return roundTo(weightKg / (heightM * heightM), BMI_DECIMALS)
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
