import { describe, test, expect } from 'vitest'
import { searchFoods } from '@/domain/food'
import { loadCompositionFoods } from './foods'

/**
 * 成分表そのものに対する検索の確認。
 * 読み替え表（KEYWORD_ALIASES）が実データに効いているかは、
 * 作り物のデータでは確かめられない。
 */

describe('成分表', () => {
  test('2,000件以上を読み込める', async () => {
    const foods = await loadCompositionFoods()

    expect(foods.length).toBeGreaterThan(2000)
  })

  test('エネルギーと三大栄養素が入っている', async () => {
    // Arrange
    const foods = await loadCompositionFoods()

    // Act: 鶏卵 全卵 生
    const egg = foods.find((food) => food.id === '12004')

    // Assert
    expect(egg?.name).toContain('鶏卵')
    expect(egg?.nutrition.kcal).toBeGreaterThan(100)
    expect(egg?.nutrition.protein).toBeGreaterThan(10)
    expect(egg?.basisGrams).toBe(100)
  })
})

describe('よく使う言葉で引けるか', () => {
  const cases: readonly { keyword: string; expected: string }[] = [
    { keyword: '鶏むね', expected: 'むね' },
    { keyword: '豚ロース', expected: 'ロース' },
    { keyword: 'ささみ', expected: 'ささみ' },
    { keyword: '納豆', expected: '納豆' },
    { keyword: '卵', expected: '鶏卵' },
    { keyword: '白米', expected: '精白米' },
    { keyword: '牛乳', expected: '牛乳' },
    { keyword: 'ブロッコリー', expected: 'ブロッコリー' },
    { keyword: '鮭', expected: 'さけ' },
    { keyword: 'バナナ', expected: 'バナナ' },
    { keyword: '豆腐', expected: '木綿豆腐' },
    { keyword: 'オートミール', expected: 'オートミール' },
  ]

  for (const { keyword, expected } of cases) {
    test(`「${keyword}」で ${expected} が出る`, async () => {
      // Arrange
      const foods = await loadCompositionFoods()

      // Act
      const results = searchFoods(foods, keyword)

      // Assert
      expect(results.length).toBeGreaterThan(0)
      expect(results.some((food) => food.name.includes(expected))).toBe(true)
    })
  }

  test('鶏むねで検索して、ささみは出ない', async () => {
    // Arrange
    const foods = await loadCompositionFoods()

    // Act
    const results = searchFoods(foods, '鶏むね')

    // Assert
    expect(results.every((food) => !food.name.includes('ささみ'))).toBe(true)
  })
})
