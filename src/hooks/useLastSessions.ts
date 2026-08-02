import { useMemo } from 'react'
import { buildExerciseSessions, type ExerciseSessionSummary } from '@/domain/exerciseSessions'
import type { ExerciseId, WorkoutSet } from '@/domain/types'
import { useWorkoutHistory } from './useWorkoutHistory'

/**
 * 種目ごとの「直近に実施したセッション」を引く。
 * 種目を選ぶ前に前回の重量を思い出せるようにするために使う。
 */
export function useLastSessions(): ReadonlyMap<ExerciseId, ExerciseSessionSummary> {
  const { allSets, dateByWorkoutId } = useWorkoutHistory()

  return useMemo(() => {
    const setsByExercise = new Map<ExerciseId, WorkoutSet[]>()
    for (const set of allSets) {
      const current = setsByExercise.get(set.exerciseId)
      if (current === undefined) setsByExercise.set(set.exerciseId, [set])
      else current.push(set)
    }

    const lastByExercise = new Map<ExerciseId, ExerciseSessionSummary>()
    for (const [exerciseId, sets] of setsByExercise) {
      const latest = buildExerciseSessions(sets, dateByWorkoutId)[0]
      if (latest !== undefined) lastByExercise.set(exerciseId, latest)
    }

    return lastByExercise
  }, [allSets, dateByWorkoutId])
}
