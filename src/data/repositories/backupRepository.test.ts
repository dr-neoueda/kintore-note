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
