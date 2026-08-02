/** 浮動小数の誤差を丸めるための共通ヘルパー。 */
export function roundTo(value: number, digits: number): number {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

/** 重量・ボリュームの表示に使う小数桁数。 */
export const WEIGHT_DECIMALS = 1
