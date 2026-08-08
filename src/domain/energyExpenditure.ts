import { calcSpeedKmh, metsForSpeed, type CardioActivity } from './cardio'

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
 * 筋力トレーニング1セッション全体の METs。
 *
 * Compendium は「連続して行う場合」に 6.0 前後を当てているが、
 * ここで数える時間はセット間の休憩を含む。
 * 休憩込みの平均としては 3.5（light or moderate effort, general）が実態に近い。
 */
export const STRENGTH_METS = 3.5

/** セットが1つだけのときに、そのセットへ当てる時間（秒）。 */
const SINGLE_SET_SEC = 180

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
  if (times.length === 1) return SINGLE_SET_SEC

  const first = times[0] ?? 0
  const last = times[times.length - 1] ?? 0
  const spanSec = Math.max(0, Math.round((last - first) / 1000))

  if (spanSec === 0) return SINGLE_SET_SEC * times.length

  const averageIntervalSec = spanSec / (times.length - 1)
  return Math.round(spanSec + averageIntervalSec)
}

/** 有酸素運動1回の消費エネルギー（kcal）。 */
export function calcCardioEnergyKcal(
  activity: CardioActivity,
  distanceKm: number,
  durationSec: number,
  weightKg: number,
): number {
  const speedKmh = calcSpeedKmh(distanceKm, durationSec)
  if (speedKmh <= 0) return 0

  return calcActiveEnergyKcal(metsForSpeed(activity, speedKmh), weightKg, durationSec)
}

/** 筋力トレーニング1セッションの消費エネルギー（kcal）。 */
export function calcStrengthEnergyKcal(durationSec: number, weightKg: number): number {
  return calcActiveEnergyKcal(STRENGTH_METS, weightKg, durationSec)
}
