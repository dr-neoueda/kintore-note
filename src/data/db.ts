import Dexie, { type Table } from 'dexie'
import {
  defaultRestSecForMuscleGroup,
  defaultTargetForArchitecture,
  resolveArchitecture,
} from '@/domain/muscle'
import { DEFAULT_PROGRESSION_TARGET } from '@/domain/progression'
import type {
  AppSettings,
  Exercise,
  MuscleArchitecture,
  MuscleGroup,
  ProgressionTarget,
  Workout,
  WorkoutSet,
  WorkoutTemplate,
} from '@/domain/types'

export const DATABASE_NAME = 'kintore-note'

/** 移行前の種目レコード。新しい項目を持っていない可能性がある。 */
interface UpgradingExercise {
  name: string
  muscleGroup: MuscleGroup
  muscleArchitecture?: MuscleArchitecture
  target?: ProgressionTarget
  restSec?: number
}

/** v2 で一律に入れていた目標。利用者が変えていなければ v3 で筋構造別の値に置き換える。 */
function isUntouchedV2Target(target: ProgressionTarget | undefined): boolean {
  if (target === undefined) return true
  return (
    target.repsMin === DEFAULT_PROGRESSION_TARGET.repsMin &&
    target.repsMax === DEFAULT_PROGRESSION_TARGET.repsMax &&
    target.sets === DEFAULT_PROGRESSION_TARGET.sets
  )
}

/**
 * IndexedDB のスキーマ定義。
 *
 * 設計上の決定:
 * - ワークアウトは日付でユニーク（1日1セッションに束ねる）。
 * - boolean は IndexedDB のキーとして使えないため isArchived / isWarmup は索引に含めない。
 * - テンプレートの種目構成は件数が少ないためドキュメント内に埋め込む。
 */
export class KintoreDatabase extends Dexie {
  declare exercises: Table<Exercise, number>
  declare workouts: Table<Workout, number>
  declare sets: Table<WorkoutSet, number>
  declare templates: Table<WorkoutTemplate, number>
  declare settings: Table<AppSettings, number>

  constructor() {
    super(DATABASE_NAME)

    this.version(1).stores({
      exercises: '++id, &name, muscleGroup',
      workouts: '++id, &date',
      sets: '++id, workoutId, exerciseId, [workoutId+order], [exerciseId+recordedAt]',
      templates: '++id, order',
      settings: 'id',
    })

    // v2: 種目ごとの目標（ダブルプログレッションの基準）を追加。索引は変えていない。
    this.version(2).upgrade(async (transaction) => {
      await transaction
        .table('exercises')
        .toCollection()
        .modify((exercise: UpgradingExercise) => {
          // Dexie の modify は対象をその場で書き換える API のため、ここだけは代入で更新する
          if (exercise.target === undefined) {
            exercise.target = { ...DEFAULT_PROGRESSION_TARGET }
          }
        })
    })

    // v3: 筋構造（平行筋／羽状筋）と種目ごとの休憩時間を追加。索引は変えていない。
    this.version(3).upgrade(async (transaction) => {
      await transaction
        .table('exercises')
        .toCollection()
        .modify((exercise: UpgradingExercise) => {
          const architecture =
            exercise.muscleArchitecture ??
            resolveArchitecture(exercise.name, exercise.muscleGroup)
          exercise.muscleArchitecture = architecture

          // 利用者が目標を変えていた場合はその値を尊重する
          if (isUntouchedV2Target(exercise.target)) {
            exercise.target = defaultTargetForArchitecture(architecture)
          }

          exercise.restSec ??= defaultRestSecForMuscleGroup(exercise.muscleGroup)
        })
    })
  }
}

export const db = new KintoreDatabase()
