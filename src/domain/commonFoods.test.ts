import { describe, test, expect } from 'vitest'
import { COMMON_FOODS, findCommonFood, searchCommonFoods } from './commonFoods'

describe('searchCommonFoods', () => {
  test('日常語で「まずこれ」が引ける', () => {
    // Arrange & Act: 成分表の正式名ではなく、普段使う言葉で探す
    const [first] = searchCommonFoods('白米')

    // Assert: 炊いたごはん（生の米ではない）
    expect(first?.label).toBe('ごはん（白米・炊いた）')
    expect(first?.id).toBe('01088')
  })

  test('言い方が違っても同じものに当たる', () => {
    // Arrange & Act & Assert
    for (const keyword of ['ごはん', 'ご飯', '白ごはん', 'ライス']) {
      expect(searchCommonFoods(keyword)[0]?.id).toBe('01088')
    }
  })

  test('カタカナとひらがなを区別しない', () => {
    expect(searchCommonFoods('タマゴ')[0]?.id).toBe(searchCommonFoods('たまご')[0]?.id)
  })

  test('関係ない語では出さない', () => {
    expect(searchCommonFoods('存在しない食品')).toEqual([])
  })

  test('空の語では出さない', () => {
    expect(searchCommonFoods('  ')).toEqual([])
  })
})

describe('COMMON_FOODS', () => {
  test('食品番号が重複していない', () => {
    const ids = COMMON_FOODS.map((food) => food.id)

    expect(new Set(ids).size).toBe(ids.length)
  })

  test('すべてに分量の目安がある', () => {
    // Arrange & Act & Assert: 「1杯」「1個」が分かると量を入れやすい
    for (const food of COMMON_FOODS) {
      expect(food.portions.length).toBeGreaterThan(0)
      for (const portion of food.portions) {
        expect(portion.grams).toBeGreaterThan(0)
      }
    }
  })

  test('生と調理済みが紛らわしいものは、名前で区別している', () => {
    // Arrange: 生342kcal / 炊いた156kcal と倍近く違う
    const rice = findCommonFood('01088')

    // Assert
    expect(rice?.label).toContain('炊いた')
  })
})
