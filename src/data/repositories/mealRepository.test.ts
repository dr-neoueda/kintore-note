import { describe, test, expect, beforeEach } from 'vitest'
import { resetDatabase } from '@/test/dbTestUtils'
import { EMPTY_NUTRITION } from '@/domain/nutrition'
import { addMealEntry, findLastGramsByFoodId } from './mealRepository'

beforeEach(async () => {
  await resetDatabase()
})

const record = (foodId: string, grams: number, recordedAt: string) =>
  addMealEntry({
    date: recordedAt.slice(0, 10),
    mealType: 'breakfast',
    foodId,
    foodName: 'ソイプロテイン',
    grams,
    nutrition: EMPTY_NUTRITION,
    recordedAt,
  })

describe('findLastGramsByFoodId', () => {
  test('前回入れた量を返す', async () => {
    // Arrange
    await record('custom:1', 20, '2026-08-09T07:00:00.000Z')

    // Act
    const grams = await findLastGramsByFoodId('custom:1')

    // Assert
    expect(grams).toBe(20)
  })

  test('いちばん新しい記録を採る', async () => {
    // Arrange: 古い順に入れていない
    await record('custom:1', 30, '2026-08-08T07:00:00.000Z')
    await record('custom:1', 20, '2026-08-10T07:00:00.000Z')
    await record('custom:1', 25, '2026-08-09T07:00:00.000Z')

    // Act & Assert
    expect(await findLastGramsByFoodId('custom:1')).toBe(20)
  })

  test('別の食品の量は混ぜない', async () => {
    // Arrange
    await record('custom:1', 20, '2026-08-10T07:00:00.000Z')
    await record('custom:2', 180, '2026-08-10T08:00:00.000Z')

    // Act & Assert
    expect(await findLastGramsByFoodId('custom:1')).toBe(20)
  })

  test('記録が無ければ null', async () => {
    // Arrange & Act & Assert: 呼ぶ側が既定値を決められるようにする
    expect(await findLastGramsByFoodId('custom:1')).toBeNull()
  })
})
