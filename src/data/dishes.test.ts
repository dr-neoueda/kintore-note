import { describe, test, expect } from 'vitest'
import { searchFoods } from '@/domain/food'
import { DISH_GROUP, loadDishes } from './dishes'
import { loadCompositionFoods } from './foods'

describe('料理', () => {
  test('外食の定番を読み込める', async () => {
    const dishes = await loadDishes()

    expect(dishes.length).toBeGreaterThan(40)
  })

  test('料理として分かる食品群にする', async () => {
    // Arrange & Act & Assert: 成分表の食材と混ざらないようにする
    const dishes = await loadDishes()

    expect(dishes.every((dish) => dish.group === DISH_GROUP)).toBe(true)
  })

  test('すべての料理に1食分の分量が付いている', async () => {
    // Arrange & Act: 外食では重さが分からないので、分量が無いと使えない
    const dishes = await loadDishes()

    // Assert
    for (const dish of dishes) {
      expect(dish.portions?.length ?? 0).toBeGreaterThan(0)
      expect(dish.portions?.[0]?.grams ?? 0).toBeGreaterThan(0)
    }
  })

  test('見積もりであることと根拠を添える', async () => {
    // Arrange & Act
    const dishes = await loadDishes()
    const gyudon = dishes.find((dish) => dish.name === '牛丼')

    // Assert: 成分表そのままの値と混ぜない
    expect(gyudon?.estimateNote).toContain('目安')
    expect(gyudon?.estimateNote).toContain('こめ')
  })

  test('エネルギーと三大栄養素が入っている', async () => {
    const dishes = await loadDishes()

    for (const dish of dishes) {
      expect(dish.nutrition.kcal).toBeGreaterThan(0)
      expect(dish.nutrition.protein).toBeGreaterThanOrEqual(0)
      expect(dish.basisGrams).toBe(100)
    }
  })

  test('1食分のエネルギーが現実的な範囲に収まる', async () => {
    // Arrange & Act: 桁を間違えると気づけないので、上下の幅で見張る
    const dishes = await loadDishes()

    // Assert: 味噌汁40kcal 〜 カツカレー1100kcal の幅に入る
    for (const dish of dishes) {
      const serving = dish.portions?.[0]?.grams ?? 0
      const kcal = (dish.nutrition.kcal * serving) / 100
      expect(kcal).toBeGreaterThan(30)
      expect(kcal).toBeLessThan(1500)
    }
  })

  test('牛丼が実際の店の値に近い', async () => {
    // Arrange & Act: 並盛はおおむね600〜750kcal
    const dishes = await loadDishes()
    const gyudon = dishes.find((dish) => dish.name === '牛丼')
    const serving = gyudon?.portions?.[0]?.grams ?? 0
    const kcal = ((gyudon?.nutrition.kcal ?? 0) * serving) / 100

    // Assert
    expect(kcal).toBeGreaterThan(550)
    expect(kcal).toBeLessThan(800)
  })

  test('id が成分表の食品番号とぶつからない', async () => {
    // Arrange
    const [dishes, composition] = await Promise.all([loadDishes(), loadCompositionFoods()])
    const compositionIds = new Set(composition.map((food) => food.id))

    // Act & Assert
    expect(dishes.every((dish) => !compositionIds.has(dish.id))).toBe(true)
  })
})

describe('料理名で引く', () => {
  test('「ラーメン」で料理が出る', async () => {
    const dishes = await loadDishes()

    expect(searchFoods(dishes, 'ラーメン').length).toBeGreaterThan(0)
  })

  test('「牛丼」「カツ丼」「寿司」で引ける', async () => {
    const dishes = await loadDishes()

    for (const keyword of ['牛丼', 'カツ丼', '寿司', 'ハンバーガー', 'カレー']) {
      expect(searchFoods(dishes, keyword).length).toBeGreaterThan(0)
    }
  })

  test('言い換えでも引ける', async () => {
    // Arrange & Act & Assert: 名前に出てこない語でも当たるようにする
    const dishes = await loadDishes()

    expect(searchFoods(dishes, 'ぎゅうどん').length).toBeGreaterThan(0)
    expect(searchFoods(dishes, 'バーガー').length).toBeGreaterThan(0)
  })
})

describe('成分表の調理済み食品', () => {
  test('「炒飯」の漢字でチャーハンが引ける', async () => {
    // Arrange: 成分表の表記は「チャーハン」
    const foods = await loadCompositionFoods()

    // Act
    const results = searchFoods(foods, '炒飯')

    // Assert
    expect(results.some((food) => food.id === '18057')).toBe(true)
  })

  test('チャーハンに1皿の分量が付く', async () => {
    const foods = await loadCompositionFoods()
    const fried = foods.find((food) => food.id === '18057')

    expect(fried?.portions?.[0]?.label).toBe('1皿')
  })

  test('「唐揚げ」でとりから揚げが引ける', async () => {
    const foods = await loadCompositionFoods()

    expect(searchFoods(foods, '唐揚げ').some((food) => food.id === '18054')).toBe(true)
  })
})
