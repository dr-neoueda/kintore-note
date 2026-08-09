import type { DateKey } from '@/domain/date'
import {
  calcCardioEnergyKcal,
  calcStrengthEnergyKcal,
  estimateWorkoutDurationSec,
} from '@/domain/energyExpenditure'
import type {
  BodyMeasurement,
  CardioSession,
  Workout,
  WorkoutId,
  WorkoutSet,
} from '@/domain/types'

/**
 * 日ごとの消費エネルギー。
 *
 * 体重も基礎代謝も毎日測るとは限らないため、その日以前で最も新しい値を使う。
 * 一度も測っていなければ計算できないので 0 のままにし、当て推量は出さない。
 */
export interface DailyExpenditure {
  readonly date: DateKey
  readonly strengthKcal: number
  readonly cardioKcal: number
  readonly basalKcal: number
  /** 基礎代謝 + 運動。基礎代謝が分からない日は運動ぶんだけ。 */
  readonly totalKcal: number
  /** 基礎代謝を含められたか。摂取との収支を出してよいかの判断に使う。 */
  readonly hasBasal: boolean
}

interface BuildDailyExpenditureParams {
  readonly workouts: readonly Workout[]
  readonly setsByWorkoutId: ReadonlyMap<WorkoutId, WorkoutSet[]>
  readonly cardioSessions: readonly CardioSession[]
  readonly measurements: readonly BodyMeasurement[]
}

/** その日以前で最も新しい測定。無ければ undefined。 */
function findLatestMeasurement(
  measurements: readonly BodyMeasurement[],
  date: DateKey,
): BodyMeasurement | undefined {
  return measurements
    .filter((measurement) => measurement.date <= date)
    .sort((a, b) => b.date.localeCompare(a.date))[0]
}

export function buildDailyExpenditure({
  workouts,
  setsByWorkoutId,
  cardioSessions,
  measurements,
}: BuildDailyExpenditureParams): Map<DateKey, DailyExpenditure> {
  const setsByDate = new Map<DateKey, readonly WorkoutSet[]>()
  for (const workout of workouts) {
    if (workout.id === undefined) continue
    setsByDate.set(workout.date, setsByWorkoutId.get(workout.id) ?? [])
  }

  const cardioByDate = new Map<DateKey, CardioSession[]>()
  for (const session of cardioSessions) {
    const current = cardioByDate.get(session.date)
    if (current === undefined) cardioByDate.set(session.date, [session])
    else current.push(session)
  }

  // 基礎代謝しか無い日（運動していない日）も収支の対象になる
  const dates = new Set([
    ...setsByDate.keys(),
    ...cardioByDate.keys(),
    ...measurements.map((measurement) => measurement.date),
  ])

  const result = new Map<DateKey, DailyExpenditure>()

  for (const date of dates) {
    const measurement = findLatestMeasurement(measurements, date)
    const weightKg = measurement?.weightKg ?? 0
    const basalKcal = measurement?.basalMetabolicRateKcal ?? 0

    const sets = setsByDate.get(date) ?? []
    const strengthKcal = calcStrengthEnergyKcal(
      estimateWorkoutDurationSec(sets.map((set) => set.recordedAt)),
      weightKg,
    )

    const cardioKcal = (cardioByDate.get(date) ?? []).reduce(
      (sum, session) =>
        sum +
        calcCardioEnergyKcal(
          session.activity,
          session.distanceKm,
          session.durationSec,
          weightKg,
        ),
      0,
    )

    result.set(date, {
      date,
      strengthKcal,
      cardioKcal,
      basalKcal,
      totalKcal: basalKcal + strengthKcal + cardioKcal,
      hasBasal: basalKcal > 0,
    })
  }

  return result
}
