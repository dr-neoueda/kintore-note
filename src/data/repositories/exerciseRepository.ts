import { db } from '../db'
import {
  defaultRestSecForMuscleGroup,
  defaultTargetForArchitecture,
  resolveArchitecture,
} from '@/domain/muscle'
import { normalizeProgressionTarget } from '@/domain/progression'
import { normalizeReferenceUrl } from '@/domain/reference'
import type {
  DumbbellCount,
  EquipmentType,
  Exercise,
  ExerciseId,
  MuscleArchitecture,
  MuscleGroup,
  ProgressionTarget,
} from '@/domain/types'
import { requireNonEmpty } from '@/domain/validation'

export interface NewExercise {
  readonly name: string
  readonly muscleGroup: MuscleGroup
  readonly equipment: EquipmentType
  readonly dumbbellCount: DumbbellCount
  /** 省略した場合は種目名と部位から推定する。 */
  readonly muscleArchitecture?: MuscleArchitecture
  /** 省略した場合は筋構造から決まる既定のレンジを使う。 */
  readonly target?: ProgressionTarget
  /** 省略した場合は部位ごとの既定値を使う。 */
  readonly restSec?: number
  /** フォーム確認用の参照先。省略時は未設定（種目名での検索）。 */
  readonly referenceUrl?: string | null
}

/** 種目ごとに変更できる設定。 */
export interface ExerciseSettingsPatch {
  readonly muscleArchitecture?: MuscleArchitecture
  readonly target?: ProgressionTarget
  readonly restSec?: number
  /** 入力されたままの文字列。保存時に検証して正規化する。 */
  readonly referenceUrl?: string | null
}

/** 種目を作成する。名前は重複できない。 */
export async function createExercise(
  input: NewExercise,
  nowIso: string = new Date().toISOString(),
): Promise<ExerciseId> {
  const name = requireNonEmpty(input.name, '種目名')
  const muscleArchitecture =
    input.muscleArchitecture ?? resolveArchitecture(name, input.muscleGroup)

  return db.exercises.add({
    name,
    muscleGroup: input.muscleGroup,
    equipment: input.equipment,
    dumbbellCount: input.dumbbellCount,
    muscleArchitecture,
    target: normalizeProgressionTarget(
      input.target ?? defaultTargetForArchitecture(muscleArchitecture),
    ),
    restSec: input.restSec ?? defaultRestSecForMuscleGroup(input.muscleGroup),
    referenceUrl:
      input.referenceUrl == null ? null : normalizeReferenceUrl(input.referenceUrl),
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

/** 種目ごとの設定（筋構造・目標・休憩時間）を更新する。 */
export async function updateExerciseSettings(
  id: ExerciseId,
  patch: ExerciseSettingsPatch,
): Promise<void> {
  const changes: ExerciseSettingsPatch = {
    ...patch,
    ...(patch.target === undefined
      ? {}
      : { target: normalizeProgressionTarget(patch.target) }),
    ...(patch.restSec === undefined
      ? {}
      : { restSec: Math.max(0, Math.round(patch.restSec)) }),
    ...(patch.referenceUrl === undefined
      ? {}
      : {
          referenceUrl:
            patch.referenceUrl === null ? null : normalizeReferenceUrl(patch.referenceUrl),
        }),
  }

  await db.exercises.update(id, changes)
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
