import { describe, test, expect, beforeEach } from 'vitest'
import { db } from '@/data/db'
import { resetDatabase } from '@/test/dbTestUtils'
import { DEFAULT_REST_SEC_BY_MUSCLE_GROUP } from '@/domain/muscle'
import { DEFAULT_DUMBBELL_STEPS_KG } from '@/domain/weight'
import { getSettings, markBackedUp, updateSettings } from './settingsRepository'

beforeEach(async () => {
  await resetDatabase()
})

describe('getSettings', () => {
  test('未保存なら既定の設定を作成して返す', async () => {
    // Act
    const settings = await getSettings()

    // Assert
    expect(settings.dumbbellStepsKg).toEqual(DEFAULT_DUMBBELL_STEPS_KG)
    expect(settings.lastBackupAt).toBeNull()
    expect(settings.restSecByMuscleGroup).toEqual(DEFAULT_REST_SEC_BY_MUSCLE_GROUP)
  })

  test('2回目以降は同じ設定を返す', async () => {
    // Arrange
    await updateSettings({
      restSecByMuscleGroup: { ...DEFAULT_REST_SEC_BY_MUSCLE_GROUP, chest: 200 },
    })

    // Act
    const settings = await getSettings()

    // Assert
    expect(settings.restSecByMuscleGroup.chest).toBe(200)
  })
})

describe('updateSettings', () => {
  test('指定した項目だけを更新する', async () => {
    // Arrange
    const before = await getSettings()

    // Act
    const after = await updateSettings({
      restSecByMuscleGroup: { ...DEFAULT_REST_SEC_BY_MUSCLE_GROUP, arms: 60 },
    })

    // Assert
    expect(after.restSecByMuscleGroup.arms).toBe(60)
    expect(after.dumbbellStepsKg).toEqual(before.dumbbellStepsKg)
  })

  test('休憩秒数の負の値は0に、小数は整数に丸める', async () => {
    // Act
    const after = await updateSettings({
      restSecByMuscleGroup: { ...DEFAULT_REST_SEC_BY_MUSCLE_GROUP, core: -10, arms: 95.6 },
    })

    // Assert
    expect(after.restSecByMuscleGroup.core).toBe(0)
    expect(after.restSecByMuscleGroup.arms).toBe(96)
  })

  test('ダンベルの段階を昇順に整列して保存する', async () => {
    // Act
    const after = await updateSettings({ dumbbellStepsKg: [10, 2.5, 6.5] })

    // Assert
    expect(after.dumbbellStepsKg).toEqual([2.5, 6.5, 10])
  })

  test('ダンベルの段階から重複を取り除く', async () => {
    const after = await updateSettings({ dumbbellStepsKg: [5, 5, 10] })

    expect(after.dumbbellStepsKg).toEqual([5, 10])
  })

  test('0以下の重量は段階として受け付けない', async () => {
    const after = await updateSettings({ dumbbellStepsKg: [-1, 0, 5] })

    expect(after.dumbbellStepsKg).toEqual([5])
  })
})

describe('markBackedUp', () => {
  test('最終バックアップ日時を記録する', async () => {
    // Arrange
    const at = '2026-08-02T10:00:00.000Z'

    // Act
    const after = await markBackedUp(at)

    // Assert
    expect(after.lastBackupAt).toBe(at)
  })
})

describe('liveQuery からの読み出し', () => {
  test('設定が未保存でも、読み取り専用トランザクションの中で取得できる', async () => {
    // Arrange: liveQuery は読み取り専用トランザクションで querier を実行するため、
    // 読み出し中に書き込むと ReadOnlyError で画面全体がクラッシュする

    // Act
    const settings = await db.transaction('r', db.settings, () => getSettings())

    // Assert
    expect(settings.dumbbellStepsKg).toEqual(DEFAULT_DUMBBELL_STEPS_KG)
  })
})
