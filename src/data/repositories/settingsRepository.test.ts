import { describe, test, expect, beforeEach } from 'vitest'
import { resetDatabase } from '@/test/dbTestUtils'
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
    expect(settings.defaultRestSec).toBeGreaterThan(0)
  })

  test('2回目以降は同じ設定を返す', async () => {
    // Arrange
    await updateSettings({ defaultRestSec: 120 })

    // Act
    const settings = await getSettings()

    // Assert
    expect(settings.defaultRestSec).toBe(120)
  })
})

describe('updateSettings', () => {
  test('指定した項目だけを更新する', async () => {
    // Arrange
    const before = await getSettings()

    // Act
    const after = await updateSettings({ defaultRestSec: 90 })

    // Assert
    expect(after.defaultRestSec).toBe(90)
    expect(after.dumbbellStepsKg).toEqual(before.dumbbellStepsKg)
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
