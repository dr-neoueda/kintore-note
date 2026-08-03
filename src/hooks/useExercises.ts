import { useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { listAllExercises } from '@/data/repositories/exerciseRepository'
import type { Exercise, ExerciseId, ExerciseMap } from '@/domain/types'

const EMPTY_EXERCISES: readonly Exercise[] = []

export interface UseExercisesResult {
  /** アーカイブ済みも含む全種目。 */
  readonly allExercises: readonly Exercise[]
  /** 選択肢として出す、アーカイブされていない種目。 */
  readonly activeExercises: readonly Exercise[]
  /** 過去の記録から種目名を引くための索引。 */
  readonly exerciseById: ExerciseMap
  readonly isLoading: boolean
}

/**
 * 種目マスタをまとめて購読する。
 * 過去の記録がアーカイブ済み種目を参照することがあるため、索引には全件を入れる。
 */
export function useExercises(): UseExercisesResult {
  const allExercises = useLiveQuery(() => listAllExercises(), [])

  return useMemo(() => {
    const exercises = allExercises ?? EMPTY_EXERCISES
    const exerciseById = new Map<ExerciseId, Exercise>()
    for (const exercise of exercises) {
      if (exercise.id !== undefined) exerciseById.set(exercise.id, exercise)
    }

    return {
      allExercises: exercises,
      activeExercises: exercises.filter((exercise) => !exercise.isArchived),
      exerciseById,
      isLoading: allExercises === undefined,
    }
  }, [allExercises])
}
