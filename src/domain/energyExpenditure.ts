import {
  calcSpeedKmh,
  metsForCalisthenics,
  metsForSpeed,
  usesDistance,
  type CardioActivity,
  type CardioIntensity,
} from './cardio'

/**
 * 運動による消費エネルギーの推定。
 *
 * あくまで目安。同じ運動でも個人差が大きく、
 * 運動後の代謝亢進（EPOC）も含んでいない。
 * 画面では「推定」と明示して出す。
 */

/** 厚生労働省の式: エネルギー消費量(kcal) = 1.05 × METs × 時間(h) × 体重(kg) */
const KCAL_COEFFICIENT = 1.05

const SECONDS_PER_HOUR = 3600

/**
 * 筋力トレーニングの METs。
 *
 * Compendium には強度別に2つの値がある。
 * - resistance training, light or moderate effort: 3.5
 * - resistance training（8〜15回）, vigorous effort: 6.0
 *
 * どちらに当たるかは、扱った重量ではなく**休憩の長さ**で大きく変わる。
 * 休憩が短いセッションほど分あたりの消費が大きい、という点は
 * 研究でも一致している。重量から仕事量を出す方法は、種目ごとの可動域を
 * 仮定しなければならず、しかも下の値には標準的な挙上仕事が既に含まれるため
 * 二重計上になる。ここでは記録済みの休憩秒数から補間する。
 */
export const STRENGTH_METS_LIGHT = 3.5
export const STRENGTH_METS_VIGOROUS = 6.0

/** この長さ以上休むなら light、これ以下なら vigorous とみなす。 */
const REST_SEC_FOR_LIGHT = 150
const REST_SEC_FOR_VIGOROUS = 45

/**
 * セット間の平均休憩（秒）。
 * 記録されていない休憩（1セット目や、間が空きすぎた場合）は数えない。
 */
export function calcAverageRestSec(restSecList: readonly (number | null)[]): number | null {
  const measured = restSecList.filter((rest): rest is number => rest !== null && rest > 0)
  if (measured.length === 0) return null

  const total = measured.reduce((sum, rest) => sum + rest, 0)
  return Math.round(total / measured.length)
}

/**
 * 休憩の長さから METs を決める。
 * 休憩が記録されていなければ、控えめな light を使う。
 */
export function calcStrengthMets(averageRestSec: number | null): number {
  if (averageRestSec === null) return STRENGTH_METS_LIGHT
  if (averageRestSec >= REST_SEC_FOR_LIGHT) return STRENGTH_METS_LIGHT
  if (averageRestSec <= REST_SEC_FOR_VIGOROUS) return STRENGTH_METS_VIGOROUS

  const ratio =
    (REST_SEC_FOR_LIGHT - averageRestSec) / (REST_SEC_FOR_LIGHT - REST_SEC_FOR_VIGOROUS)
  const mets =
    STRENGTH_METS_LIGHT + (STRENGTH_METS_VIGOROUS - STRENGTH_METS_LIGHT) * ratio
  return Math.round(mets * 10) / 10
}

/**
 * 1セットに最低限かかる時間（秒）。
 *
 * 記録の時刻だけで見積もると、まとめて入力した日や続けて押した日に
 * 数十秒しか動いていないことになってしまう。
 * セット本体と切り替えを考えれば、これより短くはならない。
 */
const MIN_SEC_PER_SET = 60

/** 消費エネルギー（kcal）。体重か時間が無ければ 0。 */
export function calcActiveEnergyKcal(
  mets: number,
  weightKg: number,
  durationSec: number,
): number {
  if (mets <= 0 || weightKg <= 0 || durationSec <= 0) return 0

  const hours = durationSec / SECONDS_PER_HOUR
  return Math.round(KCAL_COEFFICIENT * mets * hours * weightKg)
}

/**
 * セットの記録時刻からトレーニング時間を見積もる。
 *
 * 最初と最後のセットの間隔だけだと、最後の1セットぶんが抜ける。
 * セット間の平均間隔を1つぶん足して補う。
 */
export function estimateWorkoutDurationSec(recordedAtList: readonly string[]): number {
  const times = recordedAtList
    .map((iso) => Date.parse(iso))
    .filter((value) => !Number.isNaN(value))
    .sort((a, b) => a - b)

  if (times.length === 0) return 0

  const floorSec = MIN_SEC_PER_SET * times.length
  if (times.length === 1) return floorSec

  const first = times[0] ?? 0
  const last = times[times.length - 1] ?? 0
  const spanSec = Math.max(0, Math.round((last - first) / 1000))

  // 最後の1セットぶんが抜けるので、セット間の平均間隔を1つ足す
  const averageIntervalSec = spanSec / (times.length - 1)
  return Math.max(floorSec, Math.round(spanSec + averageIntervalSec))
}

export interface CardioEnergyInput {
  readonly activity: CardioActivity
  readonly distanceKm: number
  readonly durationSec: number
  /** 自重トレーニングの強度。距離のある運動では使わない。 */
  readonly intensity: CardioIntensity | null
}

/**
 * 運動1回の消費エネルギー（kcal）。
 *
 * 距離のある運動は速度から強度を決める。
 * 自重トレーニングは距離を持たないため、選んだ強度を使う。
 */
export function calcCardioEnergyKcal(
  input: CardioEnergyInput,
  weightKg: number,
): number {
  if (!usesDistance(input.activity)) {
    return calcActiveEnergyKcal(
      metsForCalisthenics(input.intensity),
      weightKg,
      input.durationSec,
    )
  }

  const speedKmh = calcSpeedKmh(input.distanceKm, input.durationSec)
  if (speedKmh <= 0) return 0

  return calcActiveEnergyKcal(
    metsForSpeed(input.activity, speedKmh),
    weightKg,
    input.durationSec,
  )
}

/**
 * 筋力トレーニング1セッションの消費エネルギー（kcal）。
 * 平均休憩が分かれば強度に反映する。
 */
export function calcStrengthEnergyKcal(
  durationSec: number,
  weightKg: number,
  averageRestSec: number | null = null,
): number {
  return calcActiveEnergyKcal(calcStrengthMets(averageRestSec), weightKg, durationSec)
}
