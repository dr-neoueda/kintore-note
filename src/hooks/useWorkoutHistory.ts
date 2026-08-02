import { useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { listAllSets } from '@/data/repositories/setRepository'
import { listRecentWorkouts } from '@/data/repositories/workoutRepository'
import type { DateKey } from '@/domain/date'
import type { WorkoutDateMap } from '@/domain/progress'
import type { Workout, WorkoutId, WorkoutSet } from '@/domain/types'

/** 履歴・グラフ画面で扱う上限。個人利用の想定ではこれで数年分に相当する。 */
const MAX_WORKOUTS = 500

const EMPTY_WORKOUTS: readonly Workout[] = []
const EMPTY_SETS: readonly WorkoutSet[] = []

export interface UseWorkoutHistoryResult {
  /** 日付の降順。 */
  readonly workouts: readonly Workout[]
  readonly allSets: readonly WorkoutSet[]
  readonly setsByWorkoutId: ReadonlyMap<WorkoutId, WorkoutSet[]>
  readonly dateByWorkoutId: WorkoutDateMap
  readonly isLoading: boolean
}

/** 履歴とグラフで共通して使うワークアウト・セットの読み出し。 */
export function useWorkoutHistory(): UseWorkoutHistoryResult {
  const workouts = useLiveQuery(() => listRecentWorkouts(MAX_WORKOUTS), [])
  const allSets = useLiveQuery(() => listAllSets(), [])

  return useMemo(() => {
    const loadedWorkouts = workouts ?? EMPTY_WORKOUTS
    const loadedSets = allSets ?? EMPTY_SETS

    const dateByWorkoutId = new Map<WorkoutId, DateKey>()
    for (const workout of loadedWorkouts) {
      if (workout.id !== undefined) dateByWorkoutId.set(workout.id, workout.date)
    }

    const setsByWorkoutId = new Map<WorkoutId, WorkoutSet[]>()
    for (const set of loadedSets) {
      const current = setsByWorkoutId.get(set.workoutId)
      if (current === undefined) setsByWorkoutId.set(set.workoutId, [set])
      else current.push(set)
    }
    for (const list of setsByWorkoutId.values()) {
      list.sort((a, b) => a.order - b.order)
    }

    return {
      workouts: loadedWorkouts,
      allSets: loadedSets,
      setsByWorkoutId,
      dateByWorkoutId,
      isLoading: workouts === undefined || allSets === undefined,
    }
  }, [workouts, allSets])
}
