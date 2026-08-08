import { describe, test, expect, beforeEach } from 'vitest'
import { resetDatabase } from '@/test/dbTestUtils'
import { createBackupFile, parseBackup, serializeBackup } from '@/domain/backup'
import { DEFAULT_REST_SEC_BY_MUSCLE_GROUP } from '@/domain/muscle'
import { collectBackupData, replaceAllData } from './backupRepository'
import { createExercise, listAllExercises } from './exerciseRepository'
import { addSet, listSetsByWorkout } from './setRepository'
import { getSettings, updateSettings } from './settingsRepository'
import { createTemplate, listTemplates } from './templateRepository'
import { getOrCreateWorkoutByDate, listRecentWorkouts } from './workoutRepository'

const NOW = '2026-08-02T10:00:00.000Z'

beforeEach(async () => {
  await resetDatabase()
})

/** 全テーブルに1件ずつデータを入れる。 */
async function seedSampleData(): Promise<void> {
  const exerciseId = await createExercise({
    name: 'インクラインダンベルプレス',
    muscleGroup: 'chest',
    equipment: 'dumbbell',
    dumbbellCount: 2,
  })
  const workout = await getOrCreateWorkoutByDate('2026-08-02', NOW)
  await addSet({
    workoutId: workout.id!,
    exerciseId,
    weightKg: 11.5,
    reps: 10,
    rpe: 8,
    restSec: 90,
    restTargetSec: 150,
    isWarmup: false,
    recordedAt: NOW,
  })
  await createTemplate({
    name: '胸の日',
    note: '',
    items: [{ exerciseId, targetSets: 3, targetReps: 10, targetWeightKg: null }],
  })
  await updateSettings({
    restSecByMuscleGroup: { ...DEFAULT_REST_SEC_BY_MUSCLE_GROUP, chest: 200 },
  })
}

describe('collectBackupData', () => {
  test('全テーブルの内容を集める', async () => {
    // Arrange
    await seedSampleData()

    // Act
    const data = await collectBackupData()

    // Assert
    expect(data.exercises).toHaveLength(1)
    expect(data.workouts).toHaveLength(1)
    expect(data.sets).toHaveLength(1)
    expect(data.templates).toHaveLength(1)
    expect(data.settings?.restSecByMuscleGroup.chest).toBe(200)
  })

  test('データが無くても空の構造を返す', async () => {
    // Act
    const data = await collectBackupData()

    // Assert
    expect(data.exercises).toEqual([])
    expect(data.settings).toBeNull()
  })
})

describe('replaceAllData', () => {
  test('書き出したバックアップから完全に復元できる', async () => {
    // Arrange
    await seedSampleData()
    const json = serializeBackup(createBackupFile(await collectBackupData(), NOW))

    // Act: 全消去してから復元する
    await resetDatabase()
    await replaceAllData(parseBackup(json).data)

    // Assert
    const workouts = await listRecentWorkouts(10)
    expect(await listAllExercises()).toHaveLength(1)
    expect(workouts).toHaveLength(1)
    expect(await listSetsByWorkout(workouts[0]!.id!)).toHaveLength(1)
    expect(await listTemplates()).toHaveLength(1)
    expect((await getSettings()).restSecByMuscleGroup.chest).toBe(200)
  })

  test('復元前のデータは残さず置き換える', async () => {
    // Arrange: 復元先に別のデータを入れておく
    await createExercise({
      name: '消えるべき種目',
      muscleGroup: 'legs',
      equipment: 'dumbbell',
      dumbbellCount: 2,
    })

    // Act
    await replaceAllData({
      exercises: [],
      workouts: [],
      sets: [],
      templates: [],
      meals: [],
      customFoods: [],
      settings: null,
    })

    // Assert
    expect(await listAllExercises()).toEqual([])
  })

  test('セットの ID とワークアウトの対応が保たれる', async () => {
    // Arrange
    await seedSampleData()
    const data = await collectBackupData()

    // Act
    await resetDatabase()
    await replaceAllData(data)

    // Assert: 復元後もセットが正しいワークアウトに紐づく
    const workouts = await listRecentWorkouts(10)
    const restoredSets = await listSetsByWorkout(workouts[0]!.id!)
    expect(restoredSets[0]?.weightKg).toBe(11.5)
    expect(restoredSets[0]?.rpe).toBe(8)
  })
})

describe('古い形式のバックアップの取り込み', () => {
  /** 種目に muscleArchitecture / target / restSec / referenceUrl が無かった頃の形。 */
  const legacyExercise = {
    id: 1,
    name: 'インクラインダンベルプレス',
    muscleGroup: 'chest',
    equipment: 'dumbbell',
    dumbbellCount: 2,
    isArchived: false,
    createdAt: NOW,
  }

  test('項目が欠けていても、読み出したときに既定値で補われる', async () => {
    // Arrange & Act
    await replaceAllData({
      exercises: [legacyExercise as never],
      workouts: [],
      sets: [],
      templates: [],
      meals: [],
      customFoods: [],
      settings: null,
    })

    // Assert: 画面側は target.repsMin などを直接参照するため、欠けていると落ちる
    const exercises = await listAllExercises()
    expect(exercises[0]?.muscleArchitecture).toBeDefined()
    expect(exercises[0]?.target?.repsMin).toBeGreaterThan(0)
    expect(exercises[0]?.restSec).toBeGreaterThan(0)
    expect(exercises[0]?.referenceUrl).toBeNull()
  })

  test('セットに isWarmup が無くても本セットとして扱える', async () => {
    // Arrange
    const legacySet = {
      id: 1,
      workoutId: 1,
      exerciseId: 1,
      order: 1,
      weightKg: 10,
      reps: 10,
      rpe: null,
      restSec: null,
      restTargetSec: null,
      recordedAt: NOW,
    }

    // Act
    await replaceAllData({
      exercises: [legacyExercise as never],
      workouts: [
        {
          id: 1,
          date: '2026-08-02',
          note: '',
          bodyWeightKg: null,
          startedAt: NOW,
          finishedAt: null,
        },
      ],
      sets: [legacySet as never],
      templates: [],
      meals: [],
      customFoods: [],
      settings: null,
    })

    // Assert
    const sets = await listSetsByWorkout(1)
    expect(sets[0]?.isWarmup).toBe(false)
  })
})

describe('取り込みが失敗した場合', () => {
  test('種目名が重複していれば、元のデータを壊さずに失敗する', async () => {
    // Arrange
    await seedSampleData()
    const before = await listAllExercises()

    // Act: 同じ名前の種目を2件含む不正なバックアップ
    const duplicated = {
      id: 1,
      name: '重複する種目',
      muscleGroup: 'chest',
      equipment: 'dumbbell',
      dumbbellCount: 2,
      muscleArchitecture: 'pennate',
      target: { repsMin: 8, repsMax: 12, sets: 3 },
      restSec: 150,
      referenceUrl: null,
      isArchived: false,
      createdAt: NOW,
    }
    await expect(
      replaceAllData({
        exercises: [duplicated as never, { ...duplicated, id: 2 } as never],
        workouts: [],
        sets: [],
        templates: [],
        meals: [],
        customFoods: [],
        settings: null,
      }),
    ).rejects.toThrow()

    // Assert: 取り込み前の内容が残っている
    expect(await listAllExercises()).toEqual(before)
  })
})
