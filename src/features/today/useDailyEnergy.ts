import { useLiveQuery } from 'dexie-react-hooks'
import { listCardioSessionsByDate } from '@/data/repositories/cardioRepository'
import {
  findLatestMeasurement,
  getMeasurementByDate,
} from '@/data/repositories/measurementRepository'
import type { DateKey } from '@/domain/date'
import {
  calcAverageRestSec,
  calcCardioEnergyKcal,
  calcStrengthEnergyKcal,
  estimateWorkoutDurationSec,
} from '@/domain/energyExpenditure'
import type { BodyMeasurement, CardioSession, WorkoutSet } from '@/domain/types'

export interface DailyEnergy {
  /** 消費エネルギーの計算に使った体重。無ければ null。 */
  readonly weightKg: number | null
  /** その日に測った記録。測っていなければ undefined。 */
  readonly measurement: BodyMeasurement | undefined
  /** その日以前で最も新しい記録。測っていない日の計算に使う。 */
  readonly latestMeasurement: BodyMeasurement | undefined
  /** その日に当てはめる基礎代謝。測っていなければ直近の値。 */
  readonly basalMetabolicRateKcal: number | null
  readonly cardioSessions: readonly CardioSession[]
  readonly strengthDurationSec: number
  readonly strengthKcal: number
  readonly cardioKcal: number
  /** 筋トレと有酸素の合計。基礎代謝は含まない。 */
  readonly activeKcal: number
}

const EMPTY_SESSIONS: readonly CardioSession[] = []

/**
 * その日の運動による消費エネルギーをまとめる。
 *
 * 体組成は毎日測るとは限らない。その日に測っていなければ直近の記録を使い、
 * 体重も基礎代謝もそこから引く。一度も測っていなければ 0 のままにし、
 * 当て推量の数字は出さない。
 */
export function useDailyEnergy(date: DateKey, sets: readonly WorkoutSet[]): DailyEnergy {
  const measurement = useLiveQuery(() => getMeasurementByDate(date), [date])
  const latestMeasurement = useLiveQuery(() => findLatestMeasurement(date), [date])
  const cardioSessions = useLiveQuery(() => listCardioSessionsByDate(date), [date])

  const resolvedWeight = latestMeasurement?.weightKg ?? null
  const sessions = cardioSessions ?? EMPTY_SESSIONS

  const strengthDurationSec = estimateWorkoutDurationSec(sets.map((set) => set.recordedAt))
  // 休憩が短いセッションほど、分あたりの消費が大きい
  const averageRestSec = calcAverageRestSec(sets.map((set) => set.restSec))
  const strengthKcal =
    resolvedWeight === null
      ? 0
      : calcStrengthEnergyKcal(strengthDurationSec, resolvedWeight, averageRestSec)

  const cardioKcal =
    resolvedWeight === null
      ? 0
      : sessions.reduce(
          (sum, session) =>
            sum +
            calcCardioEnergyKcal(session, resolvedWeight),
          0,
        )

  return {
    weightKg: resolvedWeight,
    measurement,
    latestMeasurement,
    basalMetabolicRateKcal: latestMeasurement?.basalMetabolicRateKcal ?? null,
    cardioSessions: sessions,
    strengthDurationSec,
    strengthKcal,
    cardioKcal,
    activeKcal: strengthKcal + cardioKcal,
  }
}
