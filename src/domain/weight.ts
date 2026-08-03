import { roundTo, WEIGHT_DECIMALS } from './number'

/**
 * 所有している可変式ダンベルで設定できる重量の段階（kg）。
 * 設定画面から変更できるため、あくまで初期値。
 */
export const DEFAULT_DUMBBELL_STEPS_KG: readonly number[] = [
  2.5, 3.5, 4.5, 5.5, 6.5, 8.0, 9.0, 10.0, 11.5, 13.5, 16.0, 18.0, 20.5, 22.5, 24.0,
]

export type StepDirection = 'up' | 'down'

/** 浮動小数の比較誤差を吸収するための許容値。 */
const EPSILON = 1e-9

/** 重複を除いた昇順の段階リストを新しい配列として返す。 */
function toLadder(steps: readonly number[]): number[] {
  return [...new Set(steps)].sort((a, b) => a - b)
}

/**
 * 現在の重量から1段階上げ下げした重量を返す。
 * 段階の間の値からは、直近の上（または下）の段階へ移動する。
 * 端を超える場合は最大値・最小値で止まる。
 */
export function stepWeight(
  currentKg: number,
  direction: StepDirection,
  steps: readonly number[],
): number {
  const ladder = toLadder(steps)
  const lightest = ladder[0]
  const heaviest = ladder[ladder.length - 1]
  if (lightest === undefined || heaviest === undefined) return currentKg

  if (direction === 'up') {
    return ladder.find((step) => step > currentKg + EPSILON) ?? heaviest
  }

  return [...ladder].reverse().find((step) => step < currentKg - EPSILON) ?? lightest
}

/** 重量を表示用の文字列にする。整数なら小数点を付けない。 */
export function formatWeightKg(weightKg: number): string {
  const rounded = roundTo(weightKg, WEIGHT_DECIMALS)
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(WEIGHT_DECIMALS)
}
