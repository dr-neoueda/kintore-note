import { db } from '../db'
import type { ExerciseId, SetId, WorkoutId, WorkoutSet } from '@/domain/types'
import {
  requireNonNegativeNumber,
  requirePositiveInteger,
  requireValidRestSec,
  requireValidRpe,
} from '@/domain/validation'

export interface NewWorkoutSet {
  readonly workoutId: WorkoutId
  readonly exerciseId: ExerciseId
  readonly weightKg: number
  readonly reps: number
  readonly rpe: number | null
  readonly restSec: number | null
  readonly isWarmup: boolean
  readonly recordedAt: string
}

export type WorkoutSetPatch = Partial<Omit<WorkoutSet, 'id' | 'workoutId' | 'exerciseId'>>

function validateSetValues(values: {
  weightKg?: number
  reps?: number
  rpe?: number | null
  restSec?: number | null
}): void {
  if (values.weightKg !== undefined) requireNonNegativeNumber(values.weightKg, '重量')
  if (values.reps !== undefined) requirePositiveInteger(values.reps, '回数')
  if (values.rpe !== undefined) requireValidRpe(values.rpe)
  if (values.restSec !== undefined) requireValidRestSec(values.restSec)
}

/** セットを追加する。並び順はワークアウト内で自動採番する。 */
export async function addSet(input: NewWorkoutSet): Promise<SetId> {
  validateSetValues(input)

  return db.transaction('rw', db.sets, async () => {
    const existing = await db.sets.where('workoutId').equals(input.workoutId).toArray()
    const nextOrder = existing.reduce((max, set) => Math.max(max, set.order), 0) + 1

    return db.sets.add({ ...input, order: nextOrder })
  })
}

/** ワークアウト内のセットを並び順の昇順で返す。 */
export async function listSetsByWorkout(workoutId: WorkoutId): Promise<WorkoutSet[]> {
  return db.sets.where('workoutId').equals(workoutId).sortBy('order')
}

export async function updateSet(id: SetId, patch: WorkoutSetPatch): Promise<void> {
  validateSetValues(patch)
  await db.sets.update(id, patch)
}

export async function deleteSet(id: SetId): Promise<void> {
  await db.sets.delete(id)
}

/** 指定した種目のセットを記録日時の降順で返す。 */
export async function listSetsByExercise(
  exerciseId: ExerciseId,
  limit: number,
): Promise<WorkoutSet[]> {
  const sets = await db.sets.where('exerciseId').equals(exerciseId).toArray()

  return sets
    .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))
    .slice(0, limit)
}

/**
 * 前回その種目を行ったセッションのセットを返す。
 * 入力画面で「前回の記録」を提示するために使う。
 */
export async function findPreviousSessionSets(
  exerciseId: ExerciseId,
  currentWorkoutId: WorkoutId,
): Promise<WorkoutSet[]> {
  const allSets = await db.sets.where('exerciseId').equals(exerciseId).toArray()
  const pastSets = allSets.filter((set) => set.workoutId !== currentWorkoutId)

  const mostRecent = pastSets.reduce<WorkoutSet | null>(
    (latest, set) => (latest === null || set.recordedAt > latest.recordedAt ? set : latest),
    null,
  )
  if (mostRecent === null) return []

  return pastSets
    .filter((set) => set.workoutId === mostRecent.workoutId)
    .sort((a, b) => a.order - b.order)
}
