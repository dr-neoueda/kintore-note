import Dexie, { type Table } from 'dexie'
import type {
  AppSettings,
  Exercise,
  Workout,
  WorkoutSet,
  WorkoutTemplate,
} from '@/domain/types'

export const DATABASE_NAME = 'kintore-note'

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
  }
}

export const db = new KintoreDatabase()
