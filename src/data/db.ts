import Dexie, { type Table } from 'dexie'
import {
  defaultRestSecForMuscleGroup,
  defaultTargetForArchitecture,
  resolveArchitecture,
} from '@/domain/muscle'
import { DEFAULT_PROGRESSION_TARGET } from '@/domain/progression'
import type {
  BodyMeasurement,
  CardioSession,
  CustomFood,
  MealEntry,
  MealTemplate,
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
  referenceUrl?: string | null
}

/** 移行前のワークアウト。v8 より前は体重をここに持っていた。 */
interface UpgradingWorkout {
  date: string
  bodyWeightKg?: number | null
  startedAt?: string
}

/** 移行前のセットレコード。新しい項目を持っていない可能性がある。 */
interface UpgradingSet {
  restTargetSec?: number | null
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
  declare meals: Table<MealEntry, number>
  declare customFoods: Table<CustomFood, number>
  declare mealTemplates: Table<MealTemplate, number>
  declare measurements: Table<BodyMeasurement, number>
  declare cardioSessions: Table<CardioSession, number>

  /** データベース名を差し替えられるようにしているのは、移行のテストのため。 */
  constructor(databaseName: string = DATABASE_NAME) {
    super(databaseName)

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

    // v4: フォーム確認用の参照 URL を追加。未設定なら種目名での検索にフォールバックする。
    this.version(4).upgrade(async (transaction) => {
      await transaction
        .table('exercises')
        .toCollection()
        .modify((exercise: UpgradingExercise) => {
          exercise.referenceUrl ??= null
        })
    })

    // v5: セットごとの休憩の目安を追加。
    // 既存のセットは null のままにし、表示時に種目の設定で補う。
    this.version(5).upgrade(async (transaction) => {
      await transaction
        .table('sets')
        .toCollection()
        .modify((set: UpgradingSet) => {
          set.restTargetSec ??= null
        })
    })

    // v6: 食事の記録とマイ食品を追加。既存のテーブルは変えていない。
    this.version(6).stores({
      meals: '++id, date, [date+mealType]',
      customFoods: '++id, &name',
    })

    // v7: 献立テンプレートを追加。
    this.version(7).stores({
      mealTemplates: '++id, order',
    })

    // v8: 体組成と有酸素運動を追加。
    this.version(8)
      .stores({
        measurements: '++id, &date',
        cardioSessions: '++id, date',
      })
      .upgrade(async (transaction) => {
        // 体重はワークアウトに載せていたが、トレーニングの有無と体組成は別の話。
        // 記録済みの体重を体組成へ移し、以後はこちらを唯一の置き場にする。
        const workouts = await transaction.table('workouts').toArray()
        const moved = workouts
          .filter((workout: UpgradingWorkout) => typeof workout.bodyWeightKg === 'number')
          .map((workout: UpgradingWorkout) => ({
            date: workout.date,
            weightKg: workout.bodyWeightKg as number,
            bodyFatPercent: null,
            muscleMassKg: null,
            visceralFatLevel: null,
            basalMetabolicRateKcal: null,
            recordedAt: workout.startedAt ?? `${workout.date}T12:00:00.000Z`,
          }))

        if (moved.length > 0) {
          await transaction.table('measurements').bulkAdd(moved)
        }
      })
  }
}

export const db = new KintoreDatabase()
