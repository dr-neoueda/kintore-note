import type { DateRange } from './date'
import { isWithinRange } from './date'
import type { WorkoutDateMap } from './progress'
import type { ExerciseMap, MuscleGroup, WorkoutSet } from './types'


/**
 * 1部位あたりの週間セット数の目安。
 *
 * 筋肥大を目的とした場合、週10〜20セット程度で用量反応が見られるとする
 * レビューが多く、実務上の目安として広く使われている。
 * 総挙上量(kg)と違い「次に何をすべきか」に直結するため、この指標を出す。
 */
export const WEEKLY_SET_TARGET_MIN = 10
export const WEEKLY_SET_TARGET_MAX = 20

const EMPTY_COUNTS: Readonly<Record<MuscleGroup, number>> = {
  chest: 0,
  back: 0,
  shoulders: 0,
  arms: 0,
  legs: 0,
  core: 0,
  other: 0,
}

/**
 * 指定期間の本セット数を部位ごとに数える。
 * ウォームアップは、刺激量としては数えないため除外する。
 */
export function countWorkingSetsByMuscleGroup(
  sets: readonly WorkoutSet[],
  exerciseById: ExerciseMap,
  dateByWorkoutId: WorkoutDateMap,
  range: DateRange,
): Record<MuscleGroup, number> {
  const counts = { ...EMPTY_COUNTS }

  for (const set of sets) {
    if (set.isWarmup) continue

    const date = dateByWorkoutId.get(set.workoutId)
    if (date === undefined || !isWithinRange(date, range)) continue

    const exercise = exerciseById.get(set.exerciseId)
    if (exercise === undefined) continue

    counts[exercise.muscleGroup] += 1
  }

  return counts
}
