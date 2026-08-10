import { useLiveQuery } from 'dexie-react-hooks'
import { listCardioSessionsByDate } from '@/data/repositories/cardioRepository'
import {
  findLatestWeightKg,
  getMeasurementByDate,
} from '@/data/repositories/measurementRepository'
import type { DateKey } from '@/domain/date'
import {
  calcCardioEnergyKcal,
  calcStrengthEnergyKcal,
  estimateWorkoutDurationSec,
} from '@/domain/energyExpenditure'
import type { BodyMeasurement, CardioSession, WorkoutSet } from '@/domain/types'

export interface DailyEnergy {
  /** 消費エネルギーの計算に使った体重。無ければ null。 */
  readonly weightKg: number | null
  readonly measurement: BodyMeasurement | undefined
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
 * 体重が無いと計算できないため、その日に測っていなければ直近の記録を使う。
 * 体重の記録が一度も無ければ 0 のままにし、当て推量の数字は出さない。
 */
export function useDailyEnergy(date: DateKey, sets: readonly WorkoutSet[]): DailyEnergy {
  const measurement = useLiveQuery(() => getMeasurementByDate(date), [date])
  const weightKg = useLiveQuery(() => findLatestWeightKg(date), [date])
  const cardioSessions = useLiveQuery(() => listCardioSessionsByDate(date), [date])

  const resolvedWeight = weightKg ?? null
  const sessions = cardioSessions ?? EMPTY_SESSIONS

  const strengthDurationSec = estimateWorkoutDurationSec(sets.map((set) => set.recordedAt))
  const strengthKcal =
    resolvedWeight === null ? 0 : calcStrengthEnergyKcal(strengthDurationSec, resolvedWeight)

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
    cardioSessions: sessions,
    strengthDurationSec,
    strengthKcal,
    cardioKcal,
    activeKcal: strengthKcal + cardioKcal,
  }
}
