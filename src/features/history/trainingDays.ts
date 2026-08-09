import { CARDIO_ACTIVITY_LABELS } from '@/domain/cardio'
import type { DateKey } from '@/domain/date'
import type { CardioSession, Workout, WorkoutId, WorkoutSet } from '@/domain/types'

/**
 * 「運動した日」の一覧。
 *
 * ワークアウト（筋トレ）だけを見ていると、有酸素運動しか記録していない日が
 * 履歴にもカレンダーにも出てこない。走った日も運動した日なので、
 * どちらかがあれば記録のある日として扱う。
 */
export interface TrainingDay {
  readonly date: DateKey
  readonly sets: readonly WorkoutSet[]
  readonly cardioSessions: readonly CardioSession[]
}

interface BuildTrainingDaysParams {
  readonly workouts: readonly Workout[]
  readonly setsByWorkoutId: ReadonlyMap<WorkoutId, WorkoutSet[]>
  readonly cardioSessions: readonly CardioSession[]
}

const EMPTY_SETS: readonly WorkoutSet[] = []

/** 新しい日から順に返す。 */
export function buildTrainingDays({
  workouts,
  setsByWorkoutId,
  cardioSessions,
}: BuildTrainingDaysParams): TrainingDay[] {
  const setsByDate = new Map<DateKey, readonly WorkoutSet[]>()
  for (const workout of workouts) {
    const sets = workout.id === undefined ? EMPTY_SETS : setsByWorkoutId.get(workout.id)
    setsByDate.set(workout.date, sets ?? EMPTY_SETS)
  }

  const cardioByDate = new Map<DateKey, CardioSession[]>()
  for (const session of cardioSessions) {
    const current = cardioByDate.get(session.date)
    if (current === undefined) cardioByDate.set(session.date, [session])
    else current.push(session)
  }

  const dates = new Set([...setsByDate.keys(), ...cardioByDate.keys()])

  return [...dates]
    .map((date) => ({
      date,
      sets: setsByDate.get(date) ?? EMPTY_SETS,
      cardioSessions: cardioByDate.get(date) ?? [],
    }))
    .sort((a, b) => b.date.localeCompare(a.date))
}

/** その日の有酸素運動を「ランニング 5km」のようにまとめる。 */
export function formatCardioSummary(sessions: readonly CardioSession[]): string {
  return sessions
    .map((session) => `${CARDIO_ACTIVITY_LABELS[session.activity]} ${session.distanceKm}km`)
    .join('、')
}

/** その日の有酸素運動の合計距離（km）。 */
export function sumCardioDistanceKm(sessions: readonly CardioSession[]): number {
  const total = sessions.reduce((sum, session) => sum + session.distanceKm, 0)
  return Math.round(total * 10) / 10
}
