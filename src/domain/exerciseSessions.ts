import type { DateKey } from './date'
import type { WorkoutDateMap } from './progress'
import type { WorkoutId, WorkoutSet } from './types'

export interface ExerciseSessionSummary {
  readonly date: DateKey
  readonly workoutId: WorkoutId
  /** 本セットのみ、並び順の昇順。 */
  readonly sets: readonly WorkoutSet[]
  readonly topWeightKg: number
  /** 直前のセッションより重い重量を扱えたか。 */
  readonly isWeightIncreased: boolean
}

/**
 * 1種目の実施履歴をセッション単位にまとめる。
 * 種目カルテ画面で「いつ、何kgで、何回できたか」を並べるために使う。
 * 新しいセッションから順に返す。
 */
export function buildExerciseSessions(
  sets: readonly WorkoutSet[],
  dateByWorkoutId: WorkoutDateMap,
): ExerciseSessionSummary[] {
  const grouped = new Map<WorkoutId, WorkoutSet[]>()

  for (const set of sets) {
    if (set.isWarmup) continue
    if (!dateByWorkoutId.has(set.workoutId)) continue

    const current = grouped.get(set.workoutId)
    if (current === undefined) grouped.set(set.workoutId, [set])
    else current.push(set)
  }

  // 増量したかを判定するため、いったん古い順に並べる
  const ascending = [...grouped.entries()]
    .map(([workoutId, workoutSets]) => ({
      workoutId,
      date: dateByWorkoutId.get(workoutId) as DateKey,
      sets: [...workoutSets].sort((a, b) => a.order - b.order),
      topWeightKg: Math.max(...workoutSets.map((set) => set.weightKg)),
    }))
    .sort((a, b) => a.date.localeCompare(b.date))

  return ascending
    .map((session, index) => {
      const previous = ascending[index - 1]
      return {
        ...session,
        isWeightIncreased: previous !== undefined && session.topWeightKg > previous.topWeightKg,
      }
    })
    .reverse()
}
