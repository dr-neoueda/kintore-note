import { describe, test, expect } from 'vitest'
import { COMMON_FOODS } from '@/domain/commonFoods'
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

describe('カタカナで打っても引ける', () => {
  const cases: readonly { keyword: string; expected: string }[] = [
    { keyword: 'ポン酢', expected: 'ぽん酢' },
    { keyword: 'マグロ', expected: 'まぐろ' },
    { keyword: 'サバ', expected: 'さば' },
    { keyword: 'タマネギ', expected: 'たまねぎ' },
    { keyword: 'オートミール', expected: 'オートミール' },
    { keyword: 'お茶漬け', expected: 'お茶漬け' },
  ]

  for (const { keyword, expected } of cases) {
    test(`「${keyword}」で ${expected} が出る`, async () => {
      // Arrange
      const foods = await loadCompositionFoods()

      // Act
      const results = searchFoods(foods, keyword)

      // Assert
      expect(results.some((food) => food.name.includes(expected))).toBe(true)
    })
  }
})

describe('よく使う食品のショートカット', () => {
  test('登録した食品番号がすべて成分表に存在する', async () => {
    // Arrange
    const foods = await loadCompositionFoods()
    const byId = new Map(foods.map((food) => [food.id, food]))

    // Act
    const missing = COMMON_FOODS.filter((common) => !byId.has(common.id))

    // Assert: 番号を打ち間違えると、押しても何も出ない
    expect(missing.map((common) => `${common.label}(${common.id})`)).toEqual([])
  })

  test('「まずこれ」が炊いたごはんを指している', async () => {
    // Arrange
    const foods = await loadCompositionFoods()
    const rice = foods.find((food) => food.id === '01088')

    // Assert: 生の米（342kcal）ではなく、炊いた状態（156kcal）
    expect(rice?.name).toContain('水稲めし')
    expect(rice?.nutrition.kcal).toBeLessThan(200)
  })
})

describe('成分表に無い調理法の見積もり', () => {
  test('茹でた鶏むね肉を選べる', async () => {
    // Arrange
    const foods = await loadCompositionFoods()

    // Act
    const boiled = foods.find((food) => food.id === '11220y')

    // Assert
    expect(boiled?.name).toContain('むね 皮なし ゆで')
    expect(boiled?.group).toBe('肉類')
  })

  test('生より濃く、焼きより薄い値になる', async () => {
    // Arrange: 茹でると水分が抜けるぶん濃くなるが、焼きほどは抜けない
    const foods = await loadCompositionFoods()
    const raw = foods.find((food) => food.id === '11220')
    const boiled = foods.find((food) => food.id === '11220y')
    const grilled = foods.find((food) => food.id === '11288')

    // Act & Assert
    expect(boiled?.nutrition.kcal).toBeGreaterThan(raw?.nutrition.kcal ?? 0)
    expect(boiled?.nutrition.kcal).toBeLessThan(grilled?.nutrition.kcal ?? 0)
    expect(boiled?.nutrition.protein).toBeGreaterThan(raw?.nutrition.protein ?? 0)
    expect(boiled?.nutrition.protein).toBeLessThan(grilled?.nutrition.protein ?? 0)
  })

  test('見積もりであることを断っている', async () => {
    // Arrange & Act: 成分表そのままの値と混ぜない
    const foods = await loadCompositionFoods()
    const boiled = foods.find((food) => food.id === '11220y')

    // Assert
    expect(boiled?.estimateNote).toContain('ささみ')
  })

  test('成分表の食品には断りを付けない', async () => {
    const foods = await loadCompositionFoods()

    expect(foods.find((food) => food.id === '11220')?.estimateNote).toBeUndefined()
  })

  test('「鶏むね」で引ける', async () => {
    // Arrange
    const foods = await loadCompositionFoods()

    // Act
    const results = searchFoods(foods, '鶏むね')

    // Assert
    expect(results.some((food) => food.id === '11220y')).toBe(true)
  })

  test('よく使う食品の分量が付く', async () => {
    const foods = await loadCompositionFoods()
    const boiled = foods.find((food) => food.id === '11220y')

    expect(boiled?.portions?.length).toBeGreaterThan(0)
  })
})
