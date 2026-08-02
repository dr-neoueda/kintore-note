import { db } from '../db'
import { DEFAULT_PROGRESSION_TARGET, normalizeProgressionTarget } from '@/domain/progression'
import type {
  DumbbellCount,
  EquipmentType,
  Exercise,
  ExerciseId,
  MuscleGroup,
  ProgressionTarget,
} from '@/domain/types'
import { requireNonEmpty } from '@/domain/validation'

export interface NewExercise {
  readonly name: string
  readonly muscleGroup: MuscleGroup
  readonly equipment: EquipmentType
  readonly dumbbellCount: DumbbellCount
  /** 省略した場合は既定の目標（8〜12回 × 3セット）を使う。 */
  readonly target?: ProgressionTarget
}

export type ExercisePatch = Partial<NewExercise>

/** 種目を作成する。名前は重複できない。 */
export async function createExercise(
  input: NewExercise,
  nowIso: string = new Date().toISOString(),
): Promise<ExerciseId> {
  const name = requireNonEmpty(input.name, '種目名')

  return db.exercises.add({
    name,
    muscleGroup: input.muscleGroup,
    equipment: input.equipment,
    dumbbellCount: input.dumbbellCount,
    target: normalizeProgressionTarget(input.target ?? DEFAULT_PROGRESSION_TARGET),
    isArchived: false,
    createdAt: nowIso,
  })
}

export async function getExercise(id: ExerciseId): Promise<Exercise | undefined> {
  return db.exercises.get(id)
}

/** アーカイブ済みを除いた種目を名前の昇順で返す。 */
export async function listActiveExercises(): Promise<Exercise[]> {
  const all = await db.exercises.orderBy('name').toArray()
  return all.filter((exercise) => !exercise.isArchived)
}

/** アーカイブ済みも含めた全種目を名前の昇順で返す。 */
export async function listAllExercises(): Promise<Exercise[]> {
  return db.exercises.orderBy('name').toArray()
}

export async function updateExercise(id: ExerciseId, patch: ExercisePatch): Promise<void> {
  const changes: ExercisePatch = patch.name === undefined
    ? patch
    : { ...patch, name: requireNonEmpty(patch.name, '種目名') }

  await db.exercises.update(id, changes)
}

/** 種目ごとの目標（重量を上げる基準）を更新する。 */
export async function updateExerciseTarget(
  id: ExerciseId,
  target: ProgressionTarget,
): Promise<void> {
  await db.exercises.update(id, { target: normalizeProgressionTarget(target) })
}

/**
 * 種目をアーカイブ／復帰させる。
 * 過去の記録が参照しているため、削除ではなくアーカイブで隠す。
 */
export async function setExerciseArchived(
  id: ExerciseId,
  isArchived: boolean,
): Promise<void> {
  await db.exercises.update(id, { isArchived })
}
