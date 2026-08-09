import { describe, test, expect } from 'vitest'
import { searchFoods } from '@/domain/food'
import { STORE_FOOD_GROUP, loadStoreFoods } from './storeFoods'

/**
 * 同梱している店の商品。
 * 有志が登録するデータのため、使える形になっているかを確かめる。
 */

describe('店の商品', () => {
  test('100件以上が読み込める', async () => {
    const foods = await loadStoreFoods()

    expect(foods.length).toBeGreaterThan(100)
  })

  test('すべてに名前とエネルギーがある', async () => {
    // Arrange
    const foods = await loadStoreFoods()

    // Act & Assert: どちらかが欠けていると、選んでも計算できない
    for (const food of foods) {
      expect(food.name).not.toBe('')
      expect(food.nutrition.kcal).toBeGreaterThan(0)
      expect(food.basisGrams).toBe(100)
    }
  })

  test('店の名前で一覧にできる', async () => {
    // Arrange
    const foods = await loadStoreFoods()

    // Act
    const results = searchFoods(foods, STORE_FOOD_GROUP)

    // Assert
    expect(results.length).toBeGreaterThan(0)
  })

  test('成分表の食品番号とぶつからない', async () => {
    // Arrange & Act
    const foods = await loadStoreFoods()

    // Assert: 番号が重なると、記録がどちらの食品か分からなくなる
    for (const food of foods) {
      expect(food.id.startsWith('store:')).toBe(true)
    }
  })

  test('同じ名前の商品が重複していない', async () => {
    const names = (await loadStoreFoods()).map((food) => food.name)

    expect(new Set(names).size).toBe(names.length)
  })

  test('商品名で引ける', async () => {
    // Arrange
    const foods = await loadStoreFoods()

    // Act & Assert
    expect(searchFoods(foods, '冷凍ブロッコリー').length).toBeGreaterThan(0)
  })
})
