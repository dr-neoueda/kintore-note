import { addDaysToDateKey, type DateKey } from '@/domain/date'
import {
  calcAverageRestSec,
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
  /**
   * この日まで1日も飛ばさずに作る。
   * 運動も測定もしていない日でも、食事の記録と突き合わせられるようにするため。
   */
  readonly todayKey: DateKey
}

/**
 * 壊れた日付で無限に回らないための上限。
 * 10年ぶんあれば、実際の記録には足りる。
 */
const MAX_DAYS = 365 * 10

/** はじめの日から終わりの日まで、1日も飛ばさずに並べる。 */
function listDatesInRange(from: DateKey, to: DateKey): DateKey[] {
  const dates: DateKey[] = []
  let current = from

  while (current <= to && dates.length < MAX_DAYS) {
    dates.push(current)
    current = addDaysToDateKey(current, 1)
  }

  return dates
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
  todayKey,
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

  /*
   * 記録のある日だけを作ると、食べただけの日が抜け落ちる。
   * 9日と11日に体組成を測って10日に測らなかった場合、10日は9日の値で計算したい。
   * そのため、最初の記録から今日までを1日も飛ばさずに作る。
   */
  const recordDates = [
    ...setsByDate.keys(),
    ...cardioByDate.keys(),
    ...measurements.map((measurement) => measurement.date),
  ].sort()

  const earliest = recordDates[0]
  if (earliest === undefined) return new Map()

  const latest = recordDates[recordDates.length - 1] as DateKey
  const dates = listDatesInRange(earliest, latest > todayKey ? latest : todayKey)

  const result = new Map<DateKey, DailyExpenditure>()

  for (const date of dates) {
    const measurement = findLatestMeasurement(measurements, date)
    const weightKg = measurement?.weightKg ?? 0
    const basalKcal = measurement?.basalMetabolicRateKcal ?? 0

    const sets = setsByDate.get(date) ?? []
    const strengthKcal = calcStrengthEnergyKcal(
      estimateWorkoutDurationSec(sets.map((set) => set.recordedAt)),
      weightKg,
      calcAverageRestSec(sets.map((set) => set.restSec)),
    )

    const cardioKcal = (cardioByDate.get(date) ?? []).reduce(
      (sum, session) =>
        sum +
        calcCardioEnergyKcal(session, weightKg),
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
