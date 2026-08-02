import Dexie, { type Table } from 'dexie'
import { DEFAULT_PROGRESSION_TARGET } from '@/domain/progression'
import type {
  AppSettings,
  Exercise,
  ProgressionTarget,
  Workout,
  WorkoutSet,
  WorkoutTemplate,
} from '@/domain/types'

export const DATABASE_NAME = 'kintore-note'

/** 移行前の種目レコード。目標を持っていない可能性がある。 */
interface UpgradingExercise {
  target?: ProgressionTarget
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
  }
}

export const db = new KintoreDatabase()
